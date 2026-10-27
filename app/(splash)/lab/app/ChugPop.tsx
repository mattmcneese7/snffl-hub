'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ms } from './icons';
import p from './pop.module.css';

const seenKey = (week: number) => `splash4.chug.seen.w${week}`;
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * The week's chug, once per device per week: whoever finished last filmed
 * the payment, and that is the best thing the league makes. Muted to
 * start because phones refuse sound on autoplay, so sound is the big button.
 * The scrim, the close button, Escape or the clip ending close it. It also
 * opens on demand from anything marked data-chug (the Home film tile).
 */
export default function ChugPop({ week, src, who }: { week: number; src: string; who: string | null }) {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const video = useRef<HTMLVideoElement>(null);
  const card = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(seenKey(week), '1');
    } catch {
      // Not being able to remember is no reason to keep it up.
    }
  }, [week]);

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(seenKey(week)) === '1';
    } catch {
      seen = true;
    }
    const onAsk = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-chug]')) return;
      e.preventDefault();
      setMuted(false);
      setOpen(true);
    };
    document.addEventListener('click', onAsk);
    if (seen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => document.removeEventListener('click', onAsk);
    const t = window.setTimeout(() => setOpen(true), 800);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('click', onAsk);
    };
  }, [week]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    if (card.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      card.current.animate([{ transform: 'translateY(24px) scale(0.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: EASE });
    }
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Muted is set on the node before play: React's prop can land too late for
  // a phone's autoplay check.
  useEffect(() => {
    const node = video.current;
    if (!open || !node) return;
    node.muted = muted;
    void node.play().catch(() => {});
  }, [open, muted]);

  if (!open) return null;
  return createPortal(
    <div className={p.wrap} role="dialog" aria-modal="true" aria-label={`Week ${week} chug`}>
      <button type="button" className={p.scrim} onClick={close} aria-label="Close" tabIndex={-1} />
      <div ref={card} className={p.card}>
        <div className={p.head}>
          <span className={p.badge}>
            <Ms name="stein" size={20} />
          </span>
          <span className={p.title}>
            <b>Week {week} Chug</b>
            {who ? <span>{who} pays up</span> : null}
          </span>
          <button type="button" className={p.close} onClick={close} aria-label="Close">
            <Ms name="close" size={20} />
          </button>
        </div>
        <div className={p.film}>
          <video ref={video} src={src} playsInline autoPlay muted preload="auto" onEnded={close} />
          <button type="button" className={p.sound} onClick={() => setMuted((m) => !m)}>
            <Ms name={muted ? 'volumeOff' : 'volumeUp'} size={18} />
            {muted ? 'Sound off' : 'Sound on'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
