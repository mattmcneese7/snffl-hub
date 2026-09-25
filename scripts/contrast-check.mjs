// Contrast test suite, Brief Section 4 rule 5.
// 4.5:1 for small text, 3:1 for large text and UI shapes. One theme since
// September 2026: Day Game was removed, so there is one set of tokens to check.
// Reads tokens.css so the tokens stay the single source of truth.
import fs from 'node:fs';

const CSS = fs.readFileSync('app/globals.css', 'utf8');

function block(selector) {
  const i = CSS.indexOf(selector);
  const start = CSS.indexOf('{', i);
  const body = CSS.slice(start + 1, CSS.indexOf('}', start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
  );
}

const theme = block(':root {');

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
  ['ink', 'panel', 4.5, 'body text on panel'],
  ['ink', 'surface', 4.5, 'body text on surface'],
  ['ink-secondary', 'bg', 4.5, 'secondary text on background'],
  ['ink-secondary', 'panel', 4.5, 'secondary text on panel'],
  ['ink-secondary', 'surface', 4.5, 'secondary text on surface'],
  ['link', 'bg', 4.5, 'link on background'],
  ['link', 'panel', 4.5, 'link on panel'],
  ['good', 'panel', 3, 'good score on panel'],
  ['bad', 'panel', 3, 'bad score on panel'],
  ['live', 'panel', 3, 'live score on panel'],
  ['pending', 'panel', 3, 'pending state on panel'],
  ['muted', 'panel', 3, 'muted bar on panel'],
  ['good', 'bg', 3, 'good score on background'],
  ['bad', 'bg', 3, 'bad score on background'],
  // --marker-red carries the caret at 22px bold and marker shapes, so 3:1.
  ['marker-red', 'bg', 3, 'marker caret on background'],
  ['marker-red', 'panel', 3, 'marker caret on panel'],
  // The scribble is 18px at normal weight, which is small text, not large.
  ['marker-ink', 'bg', 4.5, 'marker scribble on background'],
  ['marker-ink', 'panel', 4.5, 'marker scribble on panel'],
  // The LIVE label is 9px, so it is small text and needs the higher floor.
  ['marker-red', 'panel', 4.5, 'LIVE badge on panel'],
  ['rag-category', 'panel', 4.5, 'Rag category label on panel'],
  ['rag-category', 'bg', 4.5, 'Rag category label on background'],
  ['on-chip', 'logo-red', 4.5, 'THE tag on the masthead'],
  ['bg', 'ink', 4.5, 'knocked out masthead type on ink'],
  ['beer-dark', 'panel', 3, 'beer glass outline on panel'],
  ['beer-dark', 'surface', 3, 'beer glass outline on surface'],
  ['on-chip', 'good-chip', 4.5, 'white on good chip'],
  ['on-chip', 'bad-chip', 4.5, 'white on bad chip'],
  ['on-chip', 'live-chip', 4.5, 'white on live chip'],
  ['on-chip', 'pending-chip', 4.5, 'white on pending chip'],
  ['gold-on', 'gold', 4.5, 'dark text on gold badge'],
  ['shart-on', 'shart', 4.5, 'text on shart stamp'],
  // The ticker tags are tinted glass now, so their fill is translucent and
  // cannot be read straight from the token. Composited below as literals.
  ['ticker-ink', 'ticker-band-a', 4.5, 'ticker text on league band'],
  ['ticker-ink', 'ticker-band-b', 4.5, 'ticker text on NFL band'],
  ['ticker-ink-secondary', 'ticker-band-a', 4.5, 'ticker status label on league band'],
  ['ticker-ink-secondary', 'ticker-band-b', 4.5, 'ticker status label on NFL band'],
  ['ticker-good', 'ticker-band-a', 4.5, 'ticker winner on league band'],
  ['ticker-bad', 'ticker-band-a', 4.5, 'ticker loser on league band'],
  ['bg', 'ink', 4.5, 'primary button label on ink fill'],
  // The TOUCHDOWN wipe is 30px at weight 900, so large text. In dark theme this
  // measures 3.04:1, which clears 3:1 by a hair: if the size ever drops below
  // the large text threshold the floor becomes 4.5 and it fails.
  ['on-chip', 'marker-red', 3, 'TOUCHDOWN wipe label'],
  ['live', 'surface', 3, 'lead change banner rule'],
  ['ink', 'surface', 4.5, 'lead change banner text'],
  // The NFL score column's live label is 11px, and a live row sits on
  // --surface while the rest sit on --card, so both backgrounds are checked.
  ['marker-ink', 'surface', 4.5, 'NFL live label on a live row'],
  ['marker-ink', 'panel', 4.5, 'NFL live label on a card row'],
  // Night Glass, Checkpoint 12a.
  ['ink', 'panel', 4.5, 'text on the strong glass of the chrome'],
  ['ink-secondary', 'panel', 4.5, 'secondary text on the chrome'],
  ['win', 'panel', 4.5, 'winning score and win probability on glass'],
  ['win', 'surface', 4.5, 'winning score on an inner fill'],
  ['link', 'surface', 4.5, 'link on an inner fill'],
  ['muted', 'bg', 3, 'muted rule on the ground'],
  ['bad-chip', 'panel', 3, 'loss chip edge on glass'],
  ['good-chip', 'panel', 3, 'win chip edge on glass'],
  ['marker-ink', 'panel', 4.5, 'LIVE pill label'],
  ['ink-secondary', 'surface', 4.5, 'projection under a player score'],
];

let failures = 0;

// Night Glass: the ground is not one colour. Three stadium glows sit under the
// panels, so every pair is measured over the plain ground and over each glow at
// its peak, and the worst of the four is the one that has to pass. Cards are
// composited onto that ground, and inner fills (--surface) onto the card, which
// is the order they actually stack in on the page.
const LAYERED_ON_PANEL = new Set(['surface']);
function groundsFor(tokens) {
  const base = parse(tokens.bg);
  const out = [{ name: 'ground', rgb: base.slice(0, 3) }];
  for (const glow of ['glow-a', 'glow-b', 'glow-c']) {
    if (tokens[glow]) out.push({ name: glow, rgb: over(parse(tokens[glow]), base) });
  }
  return out;
}
function flatten(tokens, key, ground) {
  const raw = parse(tokens[key]);
  if (key === 'bg') return ground;
  if (LAYERED_ON_PANEL.has(key)) {
    const card = flatten(tokens, 'panel', ground);
    return raw[3] < 1 ? over(raw, card) : raw.slice(0, 3);
  }
  return raw[3] < 1 ? over(raw, ground) : raw.slice(0, 3);
}

for (const [name, tokens] of [['Night Glass', theme]]) {
  console.log(`\n${name}`);
  const grounds = groundsFor(tokens);
  for (const [fgKey, bgKey, min, label] of PAIRS) {
    let worst = Infinity;
    let where = '';
    for (const ground of grounds) {
      const flatBg = flatten(tokens, bgKey, ground.rgb);
      const rawFg = parse(tokens[fgKey]);
      const flatFg = rawFg[3] < 1 ? over(rawFg, flatBg) : rawFg;
      const r = ratio(flatFg, flatBg);
      if (r < worst) {
        worst = r;
        where = ground.name;
      }
    }
    const ok = worst >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? 'pass' : 'FAIL'}  ${worst.toFixed(2)}:1  (min ${min})  ${label}${where !== 'ground' ? `, worst over ${where}` : ''}`);
  }
}

// Manager palettes carry white text, so they need the small-text threshold.
// data/teams.json is what the nightly job regenerates and what the app renders,
// so it is checked first. The Checkpoint 2 copy is the fallback until that file
// exists, and neither being present is not a failure.
function managerPalettes() {
  if (fs.existsSync('data/teams.json')) {
    const teams = JSON.parse(fs.readFileSync('data/teams.json', 'utf8'));
    return {
      source: 'data/teams.json',
      list: teams.map((t) => ({ manager: t.manager, primary: t.colors?.primary })),
    };
  }
  if (fs.existsSync('design/style-frame/colors.json')) {
    const colors = JSON.parse(fs.readFileSync('design/style-frame/colors.json', 'utf8'));
    return { source: 'design/style-frame/colors.json', list: Object.values(colors) };
  }
  return null;
}

const palettes = managerPalettes();
if (palettes) {
  console.log(`\nmanager palettes, white text on primary (${palettes.source})`);
  for (const c of palettes.list) {
    if (!c.primary) {
      failures++;
      console.log(`  FAIL  no primary color  ${c.manager}`);
      continue;
    }
    const r = ratio([255, 255, 255], parse(c.primary));
    const ok = r >= 4.5;
    if (!ok) failures++;
    console.log(`  ${ok ? 'pass' : 'FAIL'}  ${r.toFixed(2)}:1  ${c.manager}`);
  }
}

// Pairs written as literal hex rather than tokens, checked once because they do
// not change with the theme. The player hero keeps its NFL team color in both
// themes, so the chip sitting on it cannot use var(--ink): that token inverts to
// near white in dark and the line would disappear against its own fill.
const LITERAL_PAIRS = [
  ['#ffffff', '#141210', 4.5, 'position and team chip on the player hero'],
  // The win probability bar carries no text on colour: the percentages sit
  // above it on the panel, so they are covered by the ink pairs already.
  // Source badges keep each brand's own tile, in both themes.
  ['#ffffff', '#0b1a2e', 4.5, 'DraftSharks badge label'],
  ['#ffffff', '#1f74c9', 4.5, 'SNFFL model badge letter'],
  ['#ffffff', '#c8323f', 4.5, 'injury tag on a lineup row'],
  // Tinted glass, composited by hand: a translucent fill cannot be read from a
  // token, so each tint is worked out over the surface it actually sits on.
  // These four are the tint over a panel over the ground.
  ['#cdf6e6', '#163b3c', 4.5, 'green tinted chip on a panel'],
  ['#ffdde0', '#3e1e2e', 4.5, 'red tinted chip on a panel'],
  ['#d6ecff', '#183250', 4.5, 'blue tinted chip on a panel'],
  ['#ffeecb', '#3e382c', 4.5, 'amber tinted chip on a panel'],
  // The week story button: the same tint over the page ground rather than the dock.
  ['#f2f5fa', '#161f2a', 4.5, 'week story button label'],
  // The replay ribbon: amber tinted glass over the page ground.
  ['#ffeecb', '#2b2a24', 4.5, 'chug replay ribbon label'],
  // The chug splash sits on black, and its sound button is a solid fill.
  ['#8ae6dd', '#000000', 4.5, 'chug splash tag on black'],
  ['#06121a', '#8ae6dd', 4.5, 'chug sound button label'],
  // The active tab's turquoise, at its lightest corner, over the dock glass.
  ['#f2f5fa', '#243946', 4.5, 'active tab label on the logo turquoise'],
  ['#a9b3c4', '#243946', 4.5, 'inactive tab label beside it'],
  // And these two are the crawl's tags over the crawl's own scrim.
  ['#d6ecff', '#15314f', 4.5, 'LEAGUE tag on its own tinted glass'],
  ['#ffdde0', '#421a27', 4.5, 'NFL tag on its own tinted glass'],
  // The Shartzone is brown in both themes.
  ['#fff3d6', '#3b2412', 4.5, 'Shartzone name and wall text'],
  ['#e8d3a8', '#3b2412', 4.5, 'Shartzone labels'],
  ['#ffb4a2', '#3b2412', 4.5, 'Shartzone score'],
  ['#f7c04a', '#3b2412', 3, 'Shartzone title, large'],
  ['#f7c04a', '#5a3519', 4.5, 'Shartzone link at the light end'],
  ['#1c1108', '#f7c04a', 4.5, 'Chugging this week pill'],
  ['#e8d3a8', '#5a3519', 4.5, 'Shartzone labels at the light end'],
  // Highlight reels are always dark.
  ['#ffffff', '#000000', 4.5, 'reel title on the black stage'],
  ['#c9d1de', '#000000', 4.5, 'reel count and source line'],
  ['#ffffff', '#242424', 4.5, 'reel tag text on its 14% white pill'],
];

console.log('\ntheme independent literals');
for (const [fg, bg, min, label] of LITERAL_PAIRS) {
  const r = ratio(parse(fg), parse(bg));
  const ok = r >= min;
  if (!ok) failures++;
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${r.toFixed(2)}:1  (min ${min})  ${label}`);
}

console.log(failures ? `\n${failures} failing pair(s)` : '\nall pairs pass');
process.exit(failures ? 1 : 0);
