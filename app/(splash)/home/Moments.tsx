'use client';

import { useEffect, useRef, useState } from 'react';
import { BeerStein, Toilet } from '@phosphor-icons/react';
import m from './moments.module.css';

/**
 * Moments: small celebrations the week earns, each played once per device.
 *
 *   win    your team's win went final: confetti in Pool's colors
 *   flush  you are the week's Shart: the drain swirl and a flush
 *   pour   a new chug video is up: a stein fills, and a way to watch
 *
 * At most one plays per visit, the flush first. None play under reduced
 * motion. `force` lets the bench show one on demand.
 */
export type MomentKind = 'win' | 'flush' | 'pour';

const COLORS = ['#c9dcfa', '#ecf88a', '#2d4c9c', '#ffffff', '#141518'];

function seen(key: string) {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
function mark(key: string) {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // Private windows: the moment just plays again next time.
  }
}

export default function Moments({
  week,
  won,
  sharted,
  chugWeek,
  name,
  force,
}: {
  week: number;
  won: boolean;
  sharted: boolean;
  chugWeek: number | null;
  /** Your first name, for the line that goes with it. */
  name: string | null;
  force?: MomentKind | null;
}) {
  const [kind, setKind] = useState<MomentKind | null>(null);
  const confetti = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (force) return setKind(force);
    const order: [MomentKind, boolean, string][] = [
      ['flush', sharted, `snffl.v3.moment.flush.w${week}`],
      ['win', won, `snffl.v3.moment.win.w${week}`],
      ['pour', chugWeek != null, `snffl.v3.moment.pour.w${chugWeek}`],
    ];
    const due = order.find(([, earned, key]) => earned && !seen(key));
    if (!due) return;
    mark(due[2]);
    // A beat after the page settles, so it reads as something arriving.
    const t = setTimeout(() => setKind(due[0]), 900);
    return () => clearTimeout(t);
  }, [week, won, sharted, chugWeek, force]);

  // Confetti: a rain of pieces from above the screen, each falling at its own
  // pace, drifting and turning, staggered so it reads as a celebration.
  useEffect(() => {
    if (kind !== 'win' || !confetti.current) return;
    const box = confetti.current;
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < 90; i++) {
      const piece = document.createElement('span');
      piece.className = m.piece;
      piece.style.background = COLORS[i % COLORS.length];
      piece.style.left = `${Math.random() * w}px`;
      box.appendChild(piece);
      const drift = (Math.random() - 0.5) * 120;
      const spin = (Math.random() - 0.5) * 1080;
      piece.animate(
        [
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
          { transform: `translate(${drift * 0.6}px, ${h * 0.55}px) rotate(${spin * 0.55}deg)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${drift}px, ${h + 40}px) rotate(${spin}deg)`, opacity: 0.2 },
        ],
        { duration: 2200 + Math.random() * 1400, delay: Math.random() * 600, easing: 'cubic-bezier(0.3, 0.4, 0.6, 1)', fill: 'both' },
      );
    }
    const t = setTimeout(() => box.replaceChildren(), 4400);
    return () => clearTimeout(t);
  }, [kind]);

  // Every toast leaves on its own; the pour stays long enough to tap Watch.
  useEffect(() => {
    if (!kind) return;
    const t = setTimeout(() => setKind(null), kind === 'pour' ? 7000 : 4200);
    return () => clearTimeout(t);
  }, [kind]);

  if (!kind) return null;
  return (
    <>
      {kind === 'win' ? <div ref={confetti} className={m.confetti} aria-hidden /> : null}
      <div className={m.toast} role="status">
        {kind === 'flush' ? (
          <span className={m.drain} aria-hidden>
            <span className={m.swirl} />
            <Toilet weight="duotone" className={m.toastIcon} />
          </span>
        ) : null}
        {kind === 'pour' ? (
          <span className={m.pour} aria-hidden>
            <BeerStein weight="duotone" className={m.toastIcon} />
            <span className={m.fill} />
          </span>
        ) : null}
        <span className={m.text}>
          {kind === 'win' ? <b>{name ? `${name}, you took it.` : 'You took it.'}</b> : null}
          {kind === 'win' ? <span>Week {week} goes in the win column.</span> : null}
          {kind === 'flush' ? <b>Flushed.</b> : null}
          {kind === 'flush' ? <span>{name ? `${name}, you're the Shart of week ${week}.` : `You're the Shart of week ${week}.`}</span> : null}
          {kind === 'pour' ? <b>Fresh chug.</b> : null}
          {kind === 'pour' ? <span>The week {chugWeek} chug is up.</span> : null}
        </span>
        {kind === 'pour' ? (
          <button
            type="button"
            className={m.watch}
            onClick={() => {
              window.dispatchEvent(new Event('snffl:v3-chug'));
              setKind(null);
            }}
          >
            Watch
          </button>
        ) : null}
      </div>
    </>
  );
}
