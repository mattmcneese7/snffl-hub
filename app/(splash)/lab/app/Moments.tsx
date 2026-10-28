'use client';

import { useEffect, useRef, useState } from 'react';
import Squirt from './squirt/Squirt';
import { tellSquirt } from './squirt/bus';
import { ui } from './ui';
import p from './ui/blocks/Pop.module.css';

/**
 * Moments: what the week earns you, each played once per device.
 *
 *   win    your win went final: confetti in the palette
 *   flush  you are the week's Shart: the swirl
 *
 * At most one per visit, the flush first. None under reduced motion. The
 * chug has its own pop, so it is not a moment here. `?moment=` forces one.
 */
export type MomentKind = 'win' | 'flush';

const COLORS = ['#2d4c9c', '#c9dcfa', '#9fd8b4', '#f6d27a', '#f4a98a', '#ffffff'];

const seen = (k: string) => {
  try {
    return localStorage.getItem(k) === '1';
  } catch {
    return false;
  }
};
const mark = (k: string) => {
  try {
    localStorage.setItem(k, '1');
  } catch {
    // Private window: it plays again next time.
  }
};

export default function Moments({ week, won, sharted, name, force }: { week: number; won: boolean; sharted: boolean; name: string | null; force?: MomentKind | null }) {
  const [kind, setKind] = useState<MomentKind | null>(null);
  const confetti = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (force) return setKind(force);
    const order: [MomentKind, boolean, string][] = [
      ['flush', sharted, `splash4.moment.flush.w${week}`],
      ['win', won, `splash4.moment.win.w${week}`],
    ];
    const due = order.find(([, earned, k]) => earned && !seen(k));
    if (!due) return;
    mark(due[2]);
    const t = setTimeout(() => setKind(due[0]), 900);
    return () => clearTimeout(t);
  }, [week, won, sharted, force]);

  useEffect(() => {
    if (kind !== 'win' || !confetti.current) return;
    const box = confetti.current;
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < 90; i++) {
      const piece = document.createElement('span');
      piece.className = p.piece;
      piece.style.background = COLORS[i % COLORS.length];
      piece.style.left = `${Math.random() * w}px`;
      box.appendChild(piece);
      const drift = (Math.random() - 0.5) * 120;
      const spin = (Math.random() - 0.5) * 1080;
      piece.animate(
        [
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
          { transform: `translate(${drift}px, ${h + 40}px) rotate(${spin}deg)`, opacity: 0.2 },
        ],
        { duration: 2200 + Math.random() * 1400, delay: Math.random() * 600, easing: 'cubic-bezier(0.3, 0.4, 0.6, 1)', fill: 'both' },
      );
    }
    const t = setTimeout(() => box.replaceChildren(), 4400);
    return () => clearTimeout(t);
  }, [kind]);

  useEffect(() => {
    if (!kind) return;
    const t = setTimeout(() => setKind(null), 4200);
    return () => clearTimeout(t);
  }, [kind]);

  // Every Squirt on the page reacts too; the toast's own Squirt plays it large.
  useEffect(() => {
    if (!kind) return;
    const t = setTimeout(() => tellSquirt({ kind: 'moment', moment: kind === 'win' ? 'win' : 'shart' }), 120);
    return () => clearTimeout(t);
  }, [kind]);

  if (!kind) return null;
  return (
    <>
      {kind === 'win' ? <div ref={confetti} className={p.confetti} aria-hidden /> : null}
      <div className={p.toast} role="status">
        <Squirt mood={kind === 'win' ? 'smug' : 'gloom'} size={112} listen label={kind === 'win' ? 'Squirt celebrates your win' : 'Squirt, the Shart of the week'} />
        <span className={p.text}>
          <b className={`${ui.title} ${ui.strong}`}>{kind === 'win' ? (name ? `${name}, you took it` : 'You took it') : 'Flushed'}</b>
          <span className={ui.sub}>{kind === 'win' ? `Week ${week} goes in the win column.` : `${name ? `${name}, you're` : "You're"} the Shart of week ${week}.`}</span>
        </span>
      </div>
    </>
  );
}
