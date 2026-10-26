'use client';

import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useRef, useState, type ReactNode } from 'react';
import { haptic } from './haptics';
import { SPRING } from './motion';
import s from './ptr.module.css';

const PULL = 72;

/**
 * Pull to refresh, the way a native list does it: at the top of the page,
 * pulling down stretches with resistance, the drop fills as you go, and past
 * the line it ticks; let go and the page re-fetches its server data
 * (router.refresh, no reload) while the drop spins. The page scroller is the
 * shell's stage, so this listens to it rather than the window.
 */
export default function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const y = useMotionValue(0);
  const [busy, setBusy] = useState(false);
  const fill = useTransform(y, [0, PULL], [0, 1]);
  const rot = useTransform(y, [0, PULL * 1.6], [0, 200]);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = host.current?.closest('[data-stage]') as HTMLElement | null;
    if (!stage) return;
    let start = -1;
    let armed = false;
    const down = (e: TouchEvent) => {
      start = stage.scrollTop <= 0 && !busy ? e.touches[0].clientY : -1;
      armed = false;
    };
    const move = (e: TouchEvent) => {
      if (start < 0) return;
      const dy = e.touches[0].clientY - start;
      if (dy <= 0) return y.set(0);
      // Resistance: the further you pull, the less it gives.
      const v = PULL * 1.8 * (1 - Math.exp(-dy / (PULL * 2.2)));
      y.set(v);
      if (!armed && v >= PULL) { armed = true; haptic('tick'); }
      if (armed && v < PULL) armed = false;
    };
    const up = () => {
      if (start < 0) return;
      start = -1;
      if (armed) {
        setBusy(true);
        animate(y, PULL * 0.8, SPRING.glide);
        startTransition(() => router.refresh());
        window.setTimeout(() => { setBusy(false); animate(y, 0, SPRING.glide); }, 900);
      } else animate(y, 0, SPRING.glide);
    };
    stage.addEventListener('touchstart', down, { passive: true });
    stage.addEventListener('touchmove', move, { passive: true });
    stage.addEventListener('touchend', up);
    return () => {
      stage.removeEventListener('touchstart', down);
      stage.removeEventListener('touchmove', move);
      stage.removeEventListener('touchend', up);
    };
  }, [busy, router, y]);

  return (
    <div ref={host} className={s.host}>
      <motion.div className={s.indicator} style={{ height: y }} aria-hidden={!busy} aria-live="polite">
        <motion.svg viewBox="0 0 64 64" className={`${s.drop} ${busy ? s.spin : ''}`} style={{ rotate: busy ? undefined : rot }}>
          <path className={s.dropBack} d="M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z" />
          <motion.path className={s.dropFill} d="M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z" style={{ pathLength: fill }} />
        </motion.svg>
        {busy ? <span className={s.sr}>Refreshing</span> : null}
      </motion.div>
      {children}
    </div>
  );
}
