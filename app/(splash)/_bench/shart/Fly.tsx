'use client';

import { useEffect, useRef } from 'react';
import styles from './shart.module.css';

/**
 * One house fly that visits the pane it sits in: flies in on a wobbling path,
 * lands, walks in short bursts with pauses the way flies do, then leaves. It
 * comes once, soon after the card loads, and again whenever someone taps the
 * card; it does not loop on its own. It keeps to the grimy rim of the card, outside the
 * padding, so it never sits on the words. Drawn, not an emoji. Skipped entirely under
 * reduced motion.
 */
export default function Fly() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fly = ref.current;
    const pane = fly?.parentElement;
    if (!fly || !pane) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let alive = true;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const at = (x: number, y: number, deg: number) => `translate(${x}px, ${y}px) rotate(${deg}deg)`;
    const heading = (x0: number, y0: number, x1: number, y1: number) =>
      (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI + 90;

    const move = (frames: Keyframe[], duration: number, easing = 'linear') =>
      fly.animate(frames, { duration, easing, fill: 'forwards' }).finished;

    // The rim: a band just inside each edge, clear of the padded type. Each
    // side gives a point along it (t, 0 to 1) at a depth into the band.
    type Side = 'top' | 'right' | 'bottom' | 'left';
    const SIDES: Side[] = ['top', 'right', 'bottom', 'left'];
    const onRim = (side: Side, t: number, w: number, h: number): [number, number] => {
      // The fly reaches about 8px either side of its point, and the type starts
      // 12px in at the top and 14px at the sides, so it stays this close.
      const deep = side === 'bottom' ? rand(4, 12) : side === 'top' ? rand(0, 3) : rand(0, 5);
      if (side === 'top') return [w * t, deep];
      if (side === 'bottom') return [w * t, h - deep];
      if (side === 'left') return [deep, h * t];
      return [w - deep, h * t];
    };

    let busy = false;
    const visit = async () => {
      if (busy || !alive) return;
      busy = true;
      {
        const w = pane.clientWidth;
        const h = pane.clientHeight;
        const side = SIDES[Math.floor(Math.random() * 4)];
        let t = rand(0.1, 0.9);
        let [x, y] = onRim(side, t, w, h);
        const fromX = Math.random() < 0.5 ? -40 : w + 40;
        const fromY = rand(-50, h * 0.4);

        fly.dataset.state = 'flying';
        fly.style.opacity = '1';
        const d = heading(fromX, fromY, x, y);
        await move(
          [
            { transform: at(fromX, fromY, d) },
            { transform: at((fromX + x) / 2 + rand(-30, 30), (fromY + y) / 2 + rand(-30, 30), d + rand(-25, 25)) },
            { transform: at(x + rand(-8, 8), y + rand(-8, 8), d + rand(-15, 15)) },
            { transform: at(x, y, d) },
          ],
          rand(700, 1000),
          'cubic-bezier(.2,.7,.3,1)',
        );
        if (!alive) return void (busy = false);

        fly.dataset.state = 'landed';
        let facing = d;
        const steps = Math.floor(rand(2, 5));
        for (let s = 0; s < steps && alive; s++) {
          await wait(rand(500, 1600));
          // Walks along its edge, never in toward the type.
          const along = side === 'top' || side === 'bottom' ? w : h;
          t = Math.min(Math.max(t + rand(-26, 26) / along, 0.04), 0.96);
          const [nx, ny] = onRim(side, t, w, h);
          const nd = heading(x, y, nx, ny);
          await move([{ transform: at(x, y, facing) }, { transform: at(x, y, nd) }], 120);
          await move([{ transform: at(x, y, nd) }, { transform: at(nx, ny, nd) }], rand(350, 700));
          x = nx;
          y = ny;
          facing = nd;
          if (Math.random() < 0.35) {
            // A quick rub, the twitch a fly does when it stops.
            await move(
              [
                { transform: at(x, y, facing) },
                { transform: at(x, y, facing - 6) },
                { transform: at(x, y, facing + 6) },
                { transform: at(x, y, facing) },
              ],
              300,
            );
          }
        }
        if (!alive) return void (busy = false);

        await wait(rand(400, 1200));
        fly.dataset.state = 'flying';
        const toX = Math.random() < 0.5 ? -60 : w + 60;
        const toY = rand(-80, -20);
        const out = heading(x, y, toX, toY);
        await move(
          [
            { transform: at(x, y, facing) },
            { transform: at(x + rand(-20, 20), y - 20, out) },
            { transform: at(toX, toY, out) },
          ],
          rand(600, 850),
          'cubic-bezier(.5,0,.8,.4)',
        );
        fly.style.opacity = '0';
      }
      busy = false;
    };

    const first = setTimeout(visit, rand(1500, 3500));
    const tap = () => void visit();
    pane.addEventListener('click', tap);

    return () => {
      alive = false;
      clearTimeout(first);
      pane.removeEventListener('click', tap);
      fly.getAnimations().forEach((a) => a.cancel());
    };
  }, []);

  return (
    <div ref={ref} className={styles.fly} data-state="landed" aria-hidden>
      <svg viewBox="0 0 20 22" width="15" height="17">
        <g className={styles.wings}>
          <ellipse cx="6.6" cy="11.5" rx="3.3" ry="6.6" transform="rotate(-20 6.6 11.5)" fill="rgba(214,226,236,0.55)" stroke="rgba(55,62,70,0.45)" strokeWidth="0.35" />
          <ellipse cx="13.4" cy="11.5" rx="3.3" ry="6.6" transform="rotate(20 13.4 11.5)" fill="rgba(214,226,236,0.55)" stroke="rgba(55,62,70,0.45)" strokeWidth="0.35" />
        </g>
        <g stroke="#17130f" strokeWidth="0.55" fill="none" strokeLinecap="round">
          <path d="M8.3 9.2 L5.2 7.4 L4.2 5.2" />
          <path d="M11.7 9.2 L14.8 7.4 L15.8 5.2" />
          <path d="M8.2 10.4 L4.6 10.8 L3.2 12.6" />
          <path d="M11.8 10.4 L15.4 10.8 L16.8 12.6" />
          <path d="M8.4 11.6 L5.6 14.2 L5 16.8" />
          <path d="M11.6 11.6 L14.4 14.2 L15 16.8" />
        </g>
        <ellipse cx="10" cy="14.6" rx="2.9" ry="4.2" fill="#2b2622" />
        <path d="M7.4 13.8 H12.6 M7.3 15.4 H12.7" stroke="#453d35" strokeWidth="0.5" />
        <ellipse cx="10" cy="10" rx="3" ry="2.7" fill="#1e1a17" />
        <circle cx="10" cy="6.4" r="2.3" fill="#1a1613" />
        <ellipse cx="8.5" cy="5.9" rx="1.45" ry="1.75" fill="#6d2318" />
        <ellipse cx="11.5" cy="5.9" rx="1.45" ry="1.75" fill="#6d2318" />
        <ellipse cx="9.2" cy="13.2" rx="0.8" ry="1.6" fill="rgba(255,255,255,0.14)" />
      </svg>
    </div>
  );
}
