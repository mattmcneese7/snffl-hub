// Cuts the droplet off its black ground.
//
// The art is lit on black, so the honest extraction is the one compositing
// uses: treat the image as already screened over black, take alpha from how
// bright a pixel is, and divide the colour back out. That keeps the blue glow
// as a soft edge instead of a hard cut, which a threshold would destroy.
import fs from 'node:fs';
import { decode, encodeRGBA } from './lib-png.mjs';

const [src, out, size] = process.argv.slice(2);
const img = decode(fs.readFileSync(src));
const { width, height, channels, data } = img;

/** Below this the pixel is the black ground and the sensor noise on it. */
const FLOOR = 0.11;
/** At and above this the pixel is the object itself, fully opaque. */
const SOLID = 0.5;

const rgba = Buffer.alloc(width * height * 4);
for (let i = 0, j = 0; i < width * height; i++, j += 4) {
  const p = i * channels;
  const r = data[p], g = data[p + 1], b = data[p + 2];
  const lum = Math.max(r, g, b) / 255;

  let a = (lum - FLOOR) / (SOLID - FLOOR);
  a = a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a); // smoothstep
  if (a === 0) { rgba[j] = rgba[j + 1] = rgba[j + 2] = rgba[j + 3] = 0; continue; }

  // Un premultiply, so the colour is right on any ground and not only on black.
  const k = Math.min(1 / Math.max(a, lum), 255 / Math.max(r, g, b, 1));
  rgba[j] = Math.min(255, Math.round(r * k));
  rgba[j + 1] = Math.min(255, Math.round(g * k));
  rgba[j + 2] = Math.min(255, Math.round(b * k));
  rgba[j + 3] = Math.round(a * 255);
}

// The source art is a black rounded tile on a white page, so the four corners
// outside that tile are white and survive the cut as little hooks. Keep only
// the largest connected run of visible pixels, which is the droplet and its
// glow, and drop anything else.
{
  const seen = new Uint8Array(width * height);
  const visible = (i) => rgba[i * 4 + 3] > 8;
  let best = null;
  const stack = new Int32Array(width * height);
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
  console.log(`  kept the main shape, dropped ${dropped} stray pixels`);
}

fs.writeFileSync(out, encodeRGBA(width, height, rgba));
let opaque = 0, clear = 0, soft = 0;
for (let j = 3; j < rgba.length; j += 4) {
  if (rgba[j] === 255) opaque++; else if (rgba[j] === 0) clear++; else soft++;
}
console.log(`${out.split('/').pop()} ${width}x${height}  opaque ${(opaque/(width*height)*100).toFixed(1)}%  soft ${(soft/(width*height)*100).toFixed(1)}%  clear ${(clear/(width*height)*100).toFixed(1)}%`);
