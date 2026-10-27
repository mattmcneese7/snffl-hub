import { MS, type MsName } from '../../icons';
import w from './Wallpaper.module.css';

/**
 * The paper's wallpaper: the league's own Material icons (the same set the
 * tabs and pages use) scattered across a tile, faint in the deep blue, fixed
 * behind the page. Server drawn and seeded, so every phone prints the same
 * paper. Replaces v3's Phosphor pattern, the last v3 piece in the frame.
 */
const PRINT: MsName[] = ['football', 'rag', 'league', 'swami', 'trophy', 'stein', 'flush', 'party', 'groups', 'swap', 'money', 'notify', 'crown', 'shart', 'blowout', 'timer', 'heartBroken', 'pets', 'couch', 'plunger', 'beer', 'insights', 'trending', 'history', 'fire', 'bolt', 'gavel', 'ball', 'medal', 'forum', 'tv', 'calendar', 'weather', 'cash', 'stadium', 'flag', 'book'];

/** A small seeded random, so the server and the phone scatter alike. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// Seven by seven cells of 56: every icon at least once a tile, shuffled once.
const COLS = 7;
const CELL = 56;
const TILE = COLS * CELL;
const SIZE = 20;

const spots = (() => {
  const rand = seeded(5);
  const order = [...PRINT];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const out: { name: MsName; x: number; y: number; r: number }[] = [];
  for (let j = 0; j < COLS; j++) {
    for (let i = 0; i < COLS; i++) {
      // Every other row shifts half a cell, so no straight columns form.
      const shift = j % 2 ? CELL / 2 : 0;
      out.push({
        name: order[(j * COLS + i) % order.length],
        x: (i * CELL + shift + (rand() - 0.5) * CELL * 0.3) % TILE,
        y: j * CELL + (rand() - 0.5) * CELL * 0.3,
        r: (rand() - 0.5) * 40,
      });
    }
  }
  return out;
})();

export function Wallpaper() {
  return (
    <div className={w.paper} aria-hidden>
      <svg width="100%" height="100%">
        <defs>
          <pattern id="splash-wallpaper" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
            {spots.flatMap((s, k) =>
              // Drawn again a tile over where it would cross an edge, so no seam cuts an icon.
              [[0, 0], [-TILE, 0], [0, -TILE], [-TILE, -TILE]]
                .filter(([ox, oy]) => (ox === 0 || s.x > TILE - CELL) && (oy === 0 || s.y > TILE - CELL))
                .map(([ox, oy]) => (
                  <path
                    key={`${k}-${ox}-${oy}`}
                    d={MS[s.name]}
                    transform={`translate(${s.x + ox + CELL / 2} ${s.y + oy + CELL / 2}) rotate(${s.r.toFixed(1)}) translate(${-SIZE / 2} ${-SIZE / 2}) scale(${SIZE / 960}) translate(0 960)`}
                  />
                )),
            )}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#splash-wallpaper)" />
      </svg>
    </div>
  );
}
