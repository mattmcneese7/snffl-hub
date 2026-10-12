'use client';

import { useEffect, useRef, useState } from 'react';
import { MarkDropRefined } from '../marks';
import s from './intro.module.css';

const SEEN = 'splash.v3.intro.seen';

/**
 * The intro, Splash's opening, built from the very lockup the top bar wears:
 * the same laced drop, the same word, the same spacing, three times the
 * size. The drop falls onto the paper, lands with a squash and sends out two
 * rings, the name rises beside it, then the whole lockup flies up and shrinks
 * into the top bar, where the real one takes over. About two and a half
 * seconds.
 *
 * Once per visit (session), like v2's. A tap or any key skips it. Never
 * under reduced motion. `force` replays it on the bench.
 */
export default function Intro({ force = false }: { force?: boolean }) {
  const [on, setOn] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const lockup = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SEEN) === '1';
      window.sessionStorage.setItem(SEEN, '1');
    } catch {
      // Without storage it plays each visit; that is fine.
    }
    if (seen && !force) return;
    // Marked on the page while it plays, so the chug pop-up waits for it.
    document.documentElement.dataset.intro = 'running';
    setOn(true);
  }, [force]);

  // The flight: the whole lockup, from the middle of the screen to the top
  // bar's, scaled down to its size exactly.
  useEffect(() => {
    if (!on) return;
    const fly = setTimeout(() => {
      const el = lockup.current;
      const from = el?.getBoundingClientRect();
      const to = document.querySelector('[data-brand-lockup]')?.getBoundingClientRect();
      if (el && from && to && to.width) {
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        const k = to.width / from.width;
        el.animate([{ transform: 'translate(0, 0) scale(1)' }, { transform: `translate(${dx}px, ${dy}px) scale(${k})` }], {
          duration: 600,
          easing: 'cubic-bezier(0.6, 0, 0.2, 1)',
          fill: 'forwards',
        });
      }
      setLeaving(true);
    }, 1750);
    const done = setTimeout(() => {
      setOn(false);
      delete document.documentElement.dataset.intro;
    }, 2450);
    return () => {
      clearTimeout(fly);
      clearTimeout(done);
    };
  }, [on]);

  // A tap or any key skips straight to the page.
  useEffect(() => {
    if (!on) return;
    const skip = () => setOn(false);
    window.addEventListener('keydown', skip);
    return () => window.removeEventListener('keydown', skip);
  }, [on]);

  if (!on) return null;
  return (
    <div className={`${s.intro} ${leaving ? s.leaving : ''}`} onClick={() => setOn(false)} aria-hidden>
      <span ref={lockup} className={s.lockup}>
        <span className={s.markWrap}>
          <span className={s.rings}>
            <span className={s.ring} />
            <span className={`${s.ring} ${s.ring2}`} />
          </span>
          <span className={s.mark}>
            <MarkDropRefined />
          </span>
        </span>
        <span className={s.word}>
          {'Splash'.split('').map((ch, i) => (
            <span key={i} style={{ animationDelay: `${760 + i * 45}ms` }}>
              {ch}
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}
