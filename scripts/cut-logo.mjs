// Cuts the logo off its black ground and crops it square, at native size.
//
//   node scripts/cut-logo.mjs "~/Downloads/new logo.png" public/logo-mark.png
//
// The art is lit on black, so the honest extraction is the one compositing
// uses: take alpha from how bright a pixel is and divide the colour back out.
// A threshold would cut the blue glow off at a hard edge; this keeps it as the
// soft light it is, which is the whole look.
//
// Then it crops to what is actually visible and pads that to a square, so the
// mark can be dropped into any square box without a wrapper deciding its
// framing. Nothing is ever scaled up: the output is native pixels or fewer.
import fs from 'node:fs';
import { decode, encodeRGBA } from './lib-png.mjs';

const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error('usage: node scripts/cut-logo.mjs <source.png> <out.png>');
  process.exit(1);
}

const img = decode(fs.readFileSync(src));
const { width, height, channels, data } = img;

/** Below this a pixel is the black ground, and the sensor noise on it. */
const FLOOR = 0.14;
/** At and above this a pixel is the object, fully opaque. */
const SOLID = 0.5;
/**
 * How far the colour may be divided back out.
 *
 * Dividing a nearly black pixel by its own tiny alpha turns render noise into
 * a fully saturated dot, which is what put a field of blue speckles around the
 * first cut. Faint pixels keep the colour they were shot with instead.
 */
const MAX_LIFT = 2.2;
/** Breathing room kept around the art, as a share of its longest side. */
const MARGIN = 0.04;

const rgba = Buffer.alloc(width * height * 4);
for (let i = 0, j = 0; i < width * height; i++, j += 4) {
  const p = i * channels;
  const r = data[p], g = data[p + 1], b = data[p + 2];
  const lum = Math.max(r, g, b) / 255;

  let a = (lum - FLOOR) / (SOLID - FLOOR);
  a = a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a);
  if (a === 0) continue;

  const k = Math.min(1 / Math.max(a, lum), 255 / Math.max(r, g, b, 1), MAX_LIFT);
  rgba[j] = Math.min(255, Math.round(r * k));
  rgba[j + 1] = Math.min(255, Math.round(g * k));
  rgba[j + 2] = Math.min(255, Math.round(b * k));
  rgba[j + 3] = Math.round(a * 255);
}

// Smooth the alpha in the soft band only.
//
// The render carries noise in its glow, and turning brightness into alpha
// turns that noise into a dotted ring at the edge of the light. A small box
// blur over the partly transparent pixels settles it. The opaque body and the
// clear ground are left alone, so the mark's own edge stays sharp.
{
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) alpha[i] = rgba[i * 4 + 3];
  const soft = (v) => v > 2 && v < 250;
  const smoothed = Uint8Array.from(alpha);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (!soft(alpha[i])) continue;
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) sum += alpha[i + dy * width + dx];
      }
      smoothed[i] = Math.round(sum / 9);
    }
  }
  for (let i = 0; i < width * height; i++) rgba[i * 4 + 3] = smoothed[i];
}

// Keep only the largest connected run of visible pixels. Source art often
// carries a stray corner or a watermark, and one blob is what a mark is.
{
  const seen = new Uint8Array(width * height);
  const visible = (i) => rgba[i * 4 + 3] > 8;
  const stack = new Int32Array(width * height);
  let best = null;
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || !visible(start)) continue;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    const found = [];
    while (top > 0) {
      const i = stack[--top];
      found.push(i);
      const x = i % width, y = (i / width) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const n = ny * width + nx;
        if (seen[n] || !visible(n)) continue;
        seen[n] = 1;
        stack[top++] = n;
      }
    }
    if (!best || found.length > best.length) best = found;
  }
  const keep = new Uint8Array(width * height);
  for (const i of best ?? []) keep[i] = 1;
  let dropped = 0;
  for (let i = 0; i < width * height; i++) {
    if (keep[i] || rgba[i * 4 + 3] === 0) continue;
    rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = rgba[i * 4 + 3] = 0;
    dropped++;
  }
  if (dropped) console.log(`  dropped ${dropped} stray pixels outside the mark`);
}

// What is actually visible, then a square around it.
let minX = width, minY = height, maxX = -1, maxY = -1;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (rgba[(y * width + x) * 4 + 3] <= 4) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}
const artW = maxX - minX + 1;
const artH = maxY - minY + 1;
const side = Math.round(Math.max(artW, artH) * (1 + MARGIN * 2));
const cx = (minX + maxX) / 2;
const cy = (minY + maxY) / 2;
const left = Math.round(cx - side / 2);
const top = Math.round(cy - side / 2);

const square = Buffer.alloc(side * side * 4);
for (let y = 0; y < side; y++) {
  const sy = top + y;
  if (sy < 0 || sy >= height) continue;
  for (let x = 0; x < side; x++) {
    const sx = left + x;
    if (sx < 0 || sx >= width) continue;
    rgba.copy(square, (y * side + x) * 4, (sy * width + sx) * 4, (sy * width + sx) * 4 + 4);
  }
}

fs.writeFileSync(out, encodeRGBA(side, side, square));
console.log(`${out}  source ${width}x${height}  art ${artW}x${artH}  square ${side}x${side}  ${(fs.statSync(out).size / 1024).toFixed(0)}KB`);
