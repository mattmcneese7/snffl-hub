'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { Glyph, ICON_NAMES, type IconName } from './Icons';
import styles from './pattern.module.css';

/**
 * The paper's pattern: the icon set scattered across the background, near
 * transparent, in one of three treatments being judged.
 *
 *   relief     pressed into the paper: no color, a shadow on the upper
 *              edge and a highlight on the lower, so each icon reads as a
 *              shallow dent. Still; the page slides over it.
 *   depth      three planes at three sizes and strengths, the far one soft,
 *              each drifting at its own speed as the page scrolls.
 *   wallpaper  one flat, denser doodle tile in faint deep blue that scrolls
 *              a little slower than the page, like a group chat's wallpaper
 *              seen through glass.
 */
export type PatternMode = 'relief' | 'depth' | 'wallpaper';

/** A small seeded random, so the server and the phone scatter alike. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// The paper is printed with every icon in the set, the game, the league and
// the tools alike, each at least once a tile. Shuffled once, by a fixed seed,
// so neighbors differ and the server and the phone agree.
const PRINT: IconName[] = (() => {
  const rand = seeded(23);
  const all = [...ICON_NAMES];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
})();

type Spot = { name: IconName; x: number; y: number; r: number; s: number };

/** A tile of cols by rows cells, one icon in each, jittered and turned. */
function scatter(seed: number, cols: number, rows: number, cell: number, offset: number): Spot[] {
  const rand = seeded(seed);
  const out: Spot[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      // Every other row shifts half a cell, so no straight columns form.
      const shift = j % 2 ? cell / 2 : 0;
      out.push({
        name: PRINT[(offset + j * cols + i) % PRINT.length],
        x: i * cell + shift + (rand() - 0.5) * cell * 0.36,
        y: j * cell + (rand() - 0.5) * cell * 0.36,
        r: (rand() - 0.5) * 44,
        s: 0.9 + rand() * 0.5,
      });
    }
  }
  return out;
}

type Layer = {
  /** Scroll speed against the page: 0 still, 1 moves with the content. */
  speed: number;
  /** Size of the drawing. */
  scale: number;
  seed: number;
  /** How the icons are painted: one or more passes, each offset and tinted. */
  passes: { dx: number; dy: number; face: string; line: string; w?: number }[];
  blur?: number;
};

// Seven by seven: 49 spots, room for every icon in the set once a tile.
const COLS = 7;
const ROWS = 7;
const CELL = 64;
const TILE = COLS * CELL;

const MODES: Record<PatternMode, Layer[]> = {
  relief: [
    {
      speed: 0,
      scale: 1.15,
      seed: 7,
      passes: [
        // The dent: dark on the top left edge, light on the bottom right,
        // and the face itself a breath darker than the paper.
        { dx: -0.7, dy: -0.7, face: 'rgba(60, 50, 30, 0.07)', line: 'rgba(60, 50, 30, 0.09)' },
        { dx: 0.7, dy: 0.7, face: 'rgba(255, 255, 255, 0.95)', line: 'rgba(255, 255, 255, 0.95)' },
        { dx: 0, dy: 0, face: 'rgb(243, 241, 235)', line: 'rgba(60, 50, 30, 0.035)' },
      ],
    },
  ],
  depth: [
    { speed: 0.12, scale: 0.7, seed: 3, blur: 1.4, passes: [{ dx: 0, dy: 0, face: 'rgba(201, 220, 250, 0.14)', line: 'rgba(45, 76, 156, 0.06)' }] },
    { speed: 0.3, scale: 1, seed: 11, blur: 0.5, passes: [{ dx: 0, dy: 0, face: 'rgba(201, 220, 250, 0.16)', line: 'rgba(45, 76, 156, 0.07)' }] },
    { speed: 0.55, scale: 1.6, seed: 19, passes: [{ dx: 0, dy: 0, face: 'rgba(201, 220, 250, 0.2)', line: 'rgba(45, 76, 156, 0.08)', w: 1.2 }] },
  ],
  wallpaper: [
    // A touch slower than the page, so the widgets glide over it.
    { speed: 0.7, scale: 0.85, seed: 5, passes: [{ dx: 0, dy: 0, face: 'rgba(0, 0, 0, 0)', line: 'rgba(45, 76, 156, 0.11)', w: 1.4 }] },
  ],
};

export default function Pattern({ mode }: { mode: PatternMode }) {
  const layers = MODES[mode];
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  // Each plane follows the stage's scroll at its own speed. Only transforms
  // change, so the browser moves the planes without repainting them.
  useEffect(() => {
    const stage = document.querySelector<HTMLElement>('[data-stage]');
    if (!stage) return;
    // Reduced motion: no parallax. Every plane moves with the page, as if
    // printed on it.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const y = stage.scrollTop;
      layers.forEach((layer, i) => {
        const el = refs.current[i];
        const speed = still ? 1 : layer.speed;
        if (!el || !speed) return;
        const tile = TILE * layer.scale;
        el.style.transform = `translate3d(0, ${-((y * speed) % tile)}px, 0)`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    paint();
    stage.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      stage.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [layers, mode]);

  return (
    <div className={styles.pattern} aria-hidden>
      {layers.map((layer, i) => {
        const tile = TILE * layer.scale;
        const spots = scatter(layer.seed, COLS, ROWS, CELL, i * 7);
        const id = `snffl-pattern-${mode}-${i}`;
        return (
          <div
            key={id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={styles.layer}
            style={{ height: `calc(100% + ${tile}px)`, filter: layer.blur ? `blur(${layer.blur}px)` : undefined }}
          >
            <svg width="100%" height="100%">
              <defs>
                <pattern id={id} width={tile} height={tile} patternUnits="userSpaceOnUse">
                  <g transform={`scale(${layer.scale})`}>
                    {layer.passes.map((pass, p) => (
                      <g
                        key={p}
                        transform={`translate(${pass.dx} ${pass.dy})`}
                        style={{ '--ic-face': pass.face, '--ic-line': pass.line, '--ic-w': pass.w ?? 1.5 } as CSSProperties}
                      >
                        {/* Each icon is drawn at its spot, and again a tile
                            over where it would cross an edge, so the seams
                            never show a cut icon. */}
                        {spots.flatMap((spot, k) =>
                          [
                            [0, 0],
                            [-TILE, 0],
                            [0, -TILE],
                            [-TILE, -TILE],
                          ]
                            .filter(([ox, oy]) => (ox === 0 || spot.x > TILE - CELL / 2 - 22) && (oy === 0 || spot.y > TILE - CELL / 2 - 22))
                            .map(([ox, oy]) => (
                              <g
                                key={`${k}-${ox}-${oy}`}
                                transform={`translate(${spot.x + ox + CELL / 2} ${spot.y + oy + CELL / 2}) rotate(${spot.r.toFixed(1)}) scale(${spot.s.toFixed(2)}) translate(-12 -12)`}
                              >
                                <Glyph name={spot.name} />
                              </g>
                            )),
                        )}
                      </g>
                    ))}
                  </g>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#${id})`} />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
