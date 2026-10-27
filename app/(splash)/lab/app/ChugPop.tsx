'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ms } from './icons';
import { useOverlayHistory } from './nav/overlay';
import p from './pop.module.css';

const seenKey = (week: number) => `splash4.chug.seen.w${week}`;

/**
 * The film's size on this screen: as large as fits inside the viewport less
 * the 16 px edges, the card's 14 px padding, its 44 px head and the gap,
 * keeping the clip's own shape, so the card wraps the film with no dead space.
 */
function fit(vw: number, vh: number): { w: number; h: number } {
  const view = window.visualViewport;
  const W = (view?.width ?? window.innerWidth) - 32 - 28;
  const H = (view?.height ?? window.innerHeight) - 32 - 28 - 44 - 12 - 40;
  const k = Math.min(W / vw, H / vh, vw > vh ? 612 / vw : 372 / vw);
  return { w: Math.round(vw * k), h: Math.round(vh * k) };
}
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
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
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
  const dismiss = useOverlayHistory('chug', open, close);

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
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismiss();
    window.addEventListener('keydown', onKey);
    if (card.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      card.current.animate([{ transform: 'translateY(24px) scale(0.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: EASE });
    }
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismiss]);

  // Refit when the phone rotates.
  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      const v = video.current;
      if (v?.videoWidth) setSize(fit(v.videoWidth, v.videoHeight));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

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
      <button type="button" className={p.scrim} onClick={dismiss} aria-label="Close" tabIndex={-1} />
      <div ref={card} className={p.card}>
        <div className={p.head}>
          <span className={p.badge}>
            <Ms name="stein" size={20} />
          </span>
          <span className={p.title}>
            <b>Week {week} Chug</b>
            {who ? <span>{who} pays up</span> : null}
          </span>
          <button type="button" className={p.close} onClick={dismiss} aria-label="Close">
            <Ms name="close" size={20} />
          </button>
        </div>
        <div className={p.film}>
          <video
            ref={video}
            src={src}
            playsInline
            autoPlay
            muted
            preload="auto"
            onEnded={dismiss}
            onLoadedMetadata={(e) => setSize(fit(e.currentTarget.videoWidth, e.currentTarget.videoHeight))}
            style={size ? { width: size.w, height: size.h } : undefined}
          />
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
