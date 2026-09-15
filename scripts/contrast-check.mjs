// Contrast test suite, Brief Section 4 rule 5.
// 4.5:1 for small text, 3:1 for large text and UI shapes, checked in both themes.
// Reads tokens.css so the tokens stay the single source of truth.
import fs from 'node:fs';

const CSS = fs.readFileSync('design/style-frame/tokens.css', 'utf8');

function block(selector) {
  const i = CSS.indexOf(selector);
  const start = CSS.indexOf('{', i);
  const body = CSS.slice(start + 1, CSS.indexOf('}', start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
  );
}

const light = block(':root {');
const dark = { ...light, ...block(":root[data-theme='dark']") };

const parse = (v) => {
  if (v.startsWith('#')) {
    const h = v.length === 4 ? v.slice(1).split('').map((c) => c + c).join('') : v.slice(1);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const n = v.match(/[\d.]+/g).map(Number);
  return [n[0], n[1], n[2], n[3] ?? 1];
};

// Flatten any translucent token onto the surface it sits on.
const over = (fg, bg) => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));

const lum = (rgb) => {
  const v = rgb.slice(0, 3).map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};

const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// [foreground token, background token, minimum, label]
const PAIRS = [
  ['ink', 'bg', 4.5, 'body text on background'],
  ['ink', 'card', 4.5, 'body text on card'],
  ['ink', 'surface', 4.5, 'body text on surface'],
  ['ink-secondary', 'bg', 4.5, 'secondary text on background'],
  ['ink-secondary', 'card', 4.5, 'secondary text on card'],
  ['ink-secondary', 'surface', 4.5, 'secondary text on surface'],
  ['link', 'bg', 4.5, 'link on background'],
  ['link', 'card', 4.5, 'link on card'],
  ['good', 'card', 3, 'good score on card'],
  ['bad', 'card', 3, 'bad score on card'],
  ['live', 'card', 3, 'live score on card'],
  ['pending', 'card', 3, 'pending state on card'],
  ['muted', 'card', 3, 'muted bar on card'],
  ['good', 'bg', 3, 'good score on background'],
  ['bad', 'bg', 3, 'bad score on background'],
  ['marker-red', 'bg', 3, 'marker scribble on background'],
  ['on-chip', 'good-chip', 4.5, 'white on good chip'],
  ['on-chip', 'bad-chip', 4.5, 'white on bad chip'],
  ['on-chip', 'live-chip', 4.5, 'white on live chip'],
  ['on-chip', 'pending-chip', 4.5, 'white on pending chip'],
  ['gold-on', 'gold', 4.5, 'dark text on gold badge'],
  ['shart-on', 'shart', 4.5, 'text on shart stamp'],
  ['ticker-league-ink', 'ticker-league-bg', 4.5, 'LEAGUE ticker tag'],
  ['ticker-nfl-ink', 'ticker-nfl-bg', 4.5, 'NFL ticker tag'],
  ['ticker-ink', 'ticker-band-a', 4.5, 'ticker text on league band'],
  ['ticker-ink', 'ticker-band-b', 4.5, 'ticker text on NFL band'],
  ['ticker-ink-secondary', 'ticker-band-a', 4.5, 'ticker status label on league band'],
  ['ticker-ink-secondary', 'ticker-band-b', 4.5, 'ticker status label on NFL band'],
  ['ticker-good', 'ticker-band-a', 4.5, 'ticker winner on league band'],
  ['ticker-bad', 'ticker-band-a', 4.5, 'ticker loser on league band'],
  ['bg', 'ink', 4.5, 'primary button label on ink fill'],
];

let failures = 0;
for (const [name, tokens] of [['light', light], ['dark', dark]]) {
  console.log(`\n${name} theme`);
  const bg = parse(tokens.bg);
  for (const [fgKey, bgKey, min, label] of PAIRS) {
    const rawBg = parse(tokens[bgKey]);
    const flatBg = rawBg[3] < 1 ? over(rawBg, bg) : rawBg;
    const rawFg = parse(tokens[fgKey]);
    const flatFg = rawFg[3] < 1 ? over(rawFg, flatBg) : rawFg;
    const r = ratio(flatFg, flatBg);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? 'pass' : 'FAIL'}  ${r.toFixed(2)}:1  (min ${min})  ${label}`);
  }
}

// Manager palettes carry white text, so they need the small-text threshold.
if (fs.existsSync('design/style-frame/colors.json')) {
  const colors = JSON.parse(fs.readFileSync('design/style-frame/colors.json', 'utf8'));
  console.log('\nmanager palettes, white text on primary');
  for (const c of Object.values(colors)) {
    const r = ratio([255, 255, 255], parse(c.primary));
    const ok = r >= 4.5;
    if (!ok) failures++;
    console.log(`  ${ok ? 'pass' : 'FAIL'}  ${r.toFixed(2)}:1  ${c.manager}`);
  }
}

console.log(failures ? `\n${failures} failing pair(s)` : '\nall pairs pass in both themes');
process.exit(failures ? 1 : 0);
