// Pulls a two-color palette out of each manager's Sleeper avatar.
//
// Checkpoint 2 scope: minimal but real. Decoding runs through macOS sips, which
// normalizes any avatar (JPEG or PNG) to a small PNG that node:zlib can inflate.
// Checkpoint 4 replaces sips with a portable decoder, since GitHub Actions is Linux.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';

const LEAGUE = process.env.SLEEPER_LEAGUE_ID || '1394336593518546944';
const DIR = '.cache/avatars';

// Colors we must not collide with: good green and bad red carry meaning.
const RESERVED_HUES = [152, 354];
const HUE_GAP = 18;

function decodePng(buf) {
  let pos = 8, idat = [], w = 0, h = 0, colorType = 6;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9]; }
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
      let v;
      if (filter === 0) v = b;
      else if (filter === 1) v = b + a;
      else if (filter === 2) v = b + up;
      else if (filter === 3) v = b + ((a + up) >> 1);
      else {
        const pp = a + up - ul, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - ul);
        v = b + (pa <= pb && pa <= pc ? a : pb <= pc ? up : ul);
      }
      out[y * stride + x] = v & 255;
    }
    p += stride;
  }
  return { w, h, ch, pixels: out };
}

const toHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let hue = 0;
  if (d) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
  }
  const l = (max + min) / 2;
  return { h: (hue * 60 + 360) % 360, s: d ? d / (1 - Math.abs(2 * l - 1)) : 0, l };
};

const toHex = ({ h, s, l }) => {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
};

const lum = (hex) => {
  const v = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const contrastWhite = (hex) => 1.05 / (lum(hex) + 0.05);

// Darken until white text clears 4.5:1, which is what the brief requires.
function readable(hsl) {
  let out = { ...hsl };
  for (let i = 0; i < 40 && contrastWhite(toHex(out)) < 4.5; i++) out.l = Math.max(0.05, out.l - 0.02);
  return out;
}

function nudgeHue(h) {
  for (const reserved of RESERVED_HUES) {
    let diff = ((h - reserved + 540) % 360) - 180;
    if (Math.abs(diff) < HUE_GAP) h = (reserved + (diff < 0 ? -HUE_GAP : HUE_GAP) + 360) % 360;
  }
  return h;
}

function palette(pixels, w, h, ch) {
  const buckets = new Map();
  for (let i = 0; i < w * h; i++) {
    const o = i * ch;
    if (ch === 4 && pixels[o + 3] < 200) continue;
    const { h: hue, s, l } = toHsl(pixels[o], pixels[o + 1], pixels[o + 2]);
    if (l > 0.93 || l < 0.07 || s < 0.15) continue; // skip background, shadow, grey
    const key = Math.round(hue / 15) * 15;
    const b = buckets.get(key) || { n: 0, h: 0, s: 0, l: 0 };
    b.n++; b.h += hue; b.s += s; b.l += l;
    buckets.set(key, b);
  }
  const ranked = [...buckets.values()].sort((a, b) => b.n - a.n)
    .map((b) => ({ h: b.h / b.n, s: b.s / b.n, l: b.l / b.n }));
  // Fallback for avatars with no usable color at all.
  if (!ranked.length) return [{ h: 210, s: 0.2, l: 0.35 }, { h: 210, s: 0.15, l: 0.5 }];
  const primary = ranked[0];
  const secondary = ranked.find((c) => Math.abs(((c.h - primary.h + 540) % 360) - 180) > 40) || {
    ...primary, l: Math.min(0.72, primary.l + 0.22),
  };
  return [primary, secondary];
}

const users = await (await fetch(`https://api.sleeper.app/v1/league/${LEAGUE}/users`)).json();
fs.mkdirSync(DIR, { recursive: true });

// Pass 1: read a raw palette out of every avatar.
const raw = [];
for (const u of users) {
  let pair;
  if (u.avatar) {
    const src = `${DIR}/${u.avatar}`;
    const png = `${DIR}/${u.avatar}-24.png`;
    if (!fs.existsSync(png)) {
      const r = await fetch(`https://sleepercdn.com/avatars/${u.avatar}`);
      fs.writeFileSync(src, Buffer.from(await r.arrayBuffer()));
      execFileSync('sips', ['-s', 'format', 'png', '-z', '24', '24', src, '--out', png], { stdio: 'ignore' });
    }
    const { w, h, ch, pixels } = decodePng(fs.readFileSync(png));
    pair = palette(pixels, w, h, ch);
  } else {
    pair = [{ h: 210, s: 0.2, l: 0.35 }, { h: 210, s: 0.15, l: 0.5 }];
  }
  raw.push({ user: u, primary: pair[0], secondary: pair[1] });
}

// Pass 2: managers have to be told apart at a glance. Default Sleeper avatars
// collapse onto the same few hues, so collided hues get spread around the wheel.
// 14 managers plus two reserved bands will not fit at a wide spacing: 14 x 22
// degrees needs 308 of the 288 usable degrees. 16 keeps it feasible with slack.
const MIN_APART = 16;
const taken = [];
const gap = (h) => (taken.length ? Math.min(...taken.map((t) => Math.abs(((h - t + 540) % 360) - 180))) : 360);
const clear = (h) => gap(h) >= MIN_APART && h === nudgeHue(h);

// Strongest, most distinctive avatars claim their hue first.
const order = [...raw].sort((a, b) => b.primary.s - a.primary.s);
for (const entry of order) {
  let h = nudgeHue(entry.primary.h);
  if (!clear(h)) {
    let found = false;
    for (let step = MIN_APART; step <= 360 && !found; step += 4) {
      for (const dir of [1, -1]) {
        const candidate = nudgeHue((h + dir * step + 360) % 360);
        if (clear(candidate)) { h = candidate; found = true; break; }
      }
    }
    // Best effort rather than a silent collision: take the emptiest slot left.
    if (!found) {
      let best = h, bestGap = -1;
      for (let c = 0; c < 360; c += 2) {
        const candidate = nudgeHue(c);
        if (gap(candidate) > bestGap) { bestGap = gap(candidate); best = candidate; }
      }
      h = best;
      console.warn(`  note: ${entry.user.display_name} placed at best-effort gap ${bestGap.toFixed(1)} deg`);
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

const colors = {};
for (const { user, primary, secondary } of raw) {
  const clampS = (c) => ({ ...c, s: Math.min(0.8, Math.max(0.3, c.s)) });
  const a = readable(clampS(primary));
  // Secondary sits beside the primary, so it only needs to hold a shape, not text.
  const b = clampS(secondary);
  colors[user.user_id] = {
    manager: user.display_name,
    primary: toHex(a),
    secondary: toHex(b),
    onPrimary: '#FFFFFF',
    contrast: Number(contrastWhite(toHex(a)).toFixed(2)),
  };
}

fs.writeFileSync('design/style-frame/colors.json', JSON.stringify(colors, null, 1));

// Markup consumes palettes as classes: <article class="mgr-123"> then
// var(--mgr-primary). Keeps hex values out of the HTML entirely.
const css = [
  '/* Generated by scripts/extract-manager-colors.mjs. Do not edit by hand. */',
  ...Object.entries(colors).map(
    ([id, c]) => `.mgr-${id} {\n  --mgr-primary: ${c.primary};\n  --mgr-secondary: ${c.secondary};\n  --mgr-on: ${c.onPrimary};\n}`
  ),
].join('\n');
fs.writeFileSync('design/style-frame/colors.css', css + '\n');

const fails = Object.values(colors).filter((c) => c.contrast < 4.5);
console.log(`wrote colors for ${Object.keys(colors).length} managers, ${fails.length} below 4.5:1`);
for (const c of Object.values(colors)) console.log(` ${c.manager.padEnd(20)} ${c.primary} ${c.secondary} ${c.contrast}:1`);
