// Manager identity and the two-color palette pulled from each Sleeper avatar.
//
// Decoding is portable: node:zlib handles PNG, jpeg-js handles JPEG. Checkpoint
// 2 shelled out to macOS sips, which does not exist on the Linux runners the
// nightly job uses.
//
// Brief Section 3: colors are darkened until white text stays readable, and
// nudged away from the good green and bad red so color never implies a result.

import zlib from 'node:zlib';
import jpeg from 'jpeg-js';
import type { ManagerColors } from './types.ts';

const RESERVED_HUES = [152, 354]; // good green, bad red
const HUE_GAP = 18;
// 14 managers plus two reserved bands will not fit at a wide spacing: 14 x 22
// degrees needs 308 of the 288 usable degrees. 16 keeps it feasible with slack.
const MIN_APART = 16;

type Hsl = { h: number; s: number; l: number };
type Pixels = { w: number; h: number; ch: number; data: Buffer | Uint8Array };

function decodePng(buf: Buffer): Pixels {
  let pos = 8;
  const idat: Buffer[] = [];
  let w = 0;
  let h = 0;
  let colorType = 6;

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      colorType = data[9];
    }
    if (type === 'IDAT') idat.push(data);
    if (type === 'IEND') break;
    pos += len + 12;
  }

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = colorType === 6 ? 4 : 3;
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  let p = 0;

  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    for (let x = 0; x < stride; x++) {
      const b = raw[p + x];
      const a = x >= ch ? out[y * stride + x - ch] : 0;
      const up = y > 0 ? out[(y - 1) * stride + x] : 0;
      const ul = x >= ch && y > 0 ? out[(y - 1) * stride + x - ch] : 0;
      let v: number;
      if (filter === 0) v = b;
      else if (filter === 1) v = b + a;
      else if (filter === 2) v = b + up;
      else if (filter === 3) v = b + ((a + up) >> 1);
      else {
        const pp = a + up - ul;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - up);
        const pc = Math.abs(pp - ul);
        v = b + (pa <= pb && pa <= pc ? a : pb <= pc ? up : ul);
      }
      out[y * stride + x] = v & 255;
    }
    p += stride;
  }
  return { w, h, ch, data: out };
}

/**
 * Sniffs magic bytes rather than trusting content-type, which Sleeper's CDN
 * gets wrong (one avatar serves JPEG bytes labelled image/png). Returns null
 * for anything we cannot decode, including WebP, so an unexpected format
 * degrades to the fallback palette instead of crashing the nightly job.
 */
export function decodeImage(buf: Buffer): Pixels | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50) return decodePng(buf);
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    const img = jpeg.decode(buf, { useTArray: true });
    return { w: img.width, h: img.height, ch: 4, data: img.data };
  }
  return null;
}

const toHsl = (r: number, g: number, b: number): Hsl => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  if (d) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
  }
  const l = (max + min) / 2;
  return { h: (hue * 60 + 360) % 360, s: d ? d / (1 - Math.abs(2 * l - 1)) : 0, l };
};

export const toHex = ({ h, s, l }: Hsl): string => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];
  return (
    '#' +
    [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')
  );
};

const luminance = (hex: string) => {
  const v = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};

export const contrastWithWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

/** Darken until white text clears 4.5:1, which is what the brief requires. */
function readable(hsl: Hsl): Hsl {
  const out = { ...hsl };
  for (let i = 0; i < 40 && contrastWithWhite(toHex(out)) < 4.5; i++) {
    out.l = Math.max(0.05, out.l - 0.02);
  }
  return out;
}

function nudgeHue(h: number): number {
  for (const reserved of RESERVED_HUES) {
    const diff = ((h - reserved + 540) % 360) - 180;
    if (Math.abs(diff) < HUE_GAP) {
      h = (reserved + (diff < 0 ? -HUE_GAP : HUE_GAP) + 360) % 360;
    }
  }
  return h;
}

function palette({ w, h, ch, data }: Pixels): [Hsl, Hsl] {
  const buckets = new Map<number, { n: number; h: number; s: number; l: number }>();

  for (let i = 0; i < w * h; i++) {
    const o = i * ch;
    if (ch === 4 && data[o + 3] < 200) continue;
    const { h: hue, s, l } = toHsl(data[o], data[o + 1], data[o + 2]);
    // Skip background, shadow and grey: none of it identifies a manager.
    if (l > 0.93 || l < 0.07 || s < 0.15) continue;
    const key = Math.round(hue / 15) * 15;
    const bucket = buckets.get(key) ?? { n: 0, h: 0, s: 0, l: 0 };
    bucket.n++;
    bucket.h += hue;
    bucket.s += s;
    bucket.l += l;
    buckets.set(key, bucket);
  }

  const ranked = [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .map((b) => ({ h: b.h / b.n, s: b.s / b.n, l: b.l / b.n }));

  if (!ranked.length) return [{ h: 210, s: 0.2, l: 0.35 }, { h: 210, s: 0.15, l: 0.5 }];

  const primary = ranked[0];
  const secondary =
    ranked.find((c) => Math.abs(((c.h - primary.h + 540) % 360) - 180) > 40) ?? {
      ...primary,
      l: Math.min(0.72, primary.l + 0.22),
    };
  return [primary, secondary];
}

export type AvatarInput = { userId: string; manager: string; image: Buffer | null };

/**
 * Builds the palette for every manager at once. Doing it together matters:
 * default Sleeper avatars collapse onto the same few hues, so collided hues get
 * spread around the wheel and managers stay tellable apart.
 */
export function buildManagerColors(inputs: AvatarInput[]): Record<string, ManagerColors> {
  const FALLBACK: [Hsl, Hsl] = [
    { h: 210, s: 0.2, l: 0.35 },
    { h: 210, s: 0.15, l: 0.5 },
  ];

  const raw = inputs.map((input) => {
    const pixels = input.image ? decodeImage(input.image) : null;
    const pair: [Hsl, Hsl] = pixels ? palette(pixels) : FALLBACK;
    return { ...input, primary: pair[0], secondary: pair[1] };
  });

  const taken: number[] = [];
  const gap = (h: number) =>
    taken.length
      ? Math.min(...taken.map((t) => Math.abs(((h - t + 540) % 360) - 180)))
      : 360;
  const clear = (h: number) => gap(h) >= MIN_APART && h === nudgeHue(h);

  // Strongest, most distinctive avatars claim their hue first.
  for (const entry of [...raw].sort((a, b) => b.primary.s - a.primary.s)) {
    let h = nudgeHue(entry.primary.h);
    if (!clear(h)) {
      let found = false;
      for (let step = MIN_APART; step <= 360 && !found; step += 4) {
        for (const dir of [1, -1]) {
          const candidate = nudgeHue((h + dir * step + 360) % 360);
          if (clear(candidate)) {
            h = candidate;
            found = true;
            break;
          }
        }
      }
      // Best effort rather than a silent collision: take the emptiest slot left.
      if (!found) {
        let best = h;
        let bestGap = -1;
        for (let c = 0; c < 360; c += 2) {
          const candidate = nudgeHue(c);
          if (gap(candidate) > bestGap) {
            bestGap = gap(candidate);
            best = candidate;
          }
        }
        h = best;
      }
    }
    entry.primary.h = h;
    taken.push(h);

    // The diagonal split needs two readably different colors, not one twice.
    const apart = Math.abs(((entry.secondary.h - h + 540) % 360) - 180);
    if (apart < 25) {
      entry.secondary.h = nudgeHue((h + 30) % 360);
      entry.secondary.l = Math.min(0.62, entry.primary.l + 0.16);
    } else {
      entry.secondary.h = nudgeHue(entry.secondary.h);
    }
  }

  const clampSaturation = (c: Hsl): Hsl => ({
    ...c,
    s: Math.min(0.8, Math.max(0.3, c.s)),
  });

  const out: Record<string, ManagerColors> = {};
  for (const { userId, primary, secondary } of raw) {
    const a = readable(clampSaturation(primary));
    // Secondary sits beside the primary, so it only holds a shape, not text.
    const b = clampSaturation(secondary);
    out[userId] = {
      primary: toHex(a),
      secondary: toHex(b),
      onPrimary: '#FFFFFF',
      contrast: Number(contrastWithWhite(toHex(a)).toFixed(2)),
    };
  }
  return out;
}
