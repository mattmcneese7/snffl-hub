'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SpeakerHigh, SpeakerSlash, X } from '@phosphor-icons/react';
import Icon from './Icons';
import c from './chugpop.module.css';

/**
 * The week's chug, popped up once on the way in. Somebody finished last and
 * filmed himself paying for it; that is the best thing the league makes, so
 * it gets the screen for a moment, then gets out of the way.
 *
 *   once a week per device, so a second visit on a Sunday doesn't replay it
 *   after the intro, never over it, and before the menu's first-visit hint
 *   muted to start (phones refuse sound on autoplay); the sound is the point,
 *   so "Tap for sound" is the biggest thing on it
 *   a tap outside, the X, Escape, or the clip ending all close it
 *   reduced motion: it doesn't pop up; the film is on the Home anyway
 */
const seenKey = (week: number) => `splash.chug.seen.w${week}`;
/** Set while a chug is waiting or showing, so the menu hint waits its turn. */
export const CHUG_CLOSED = 'splash:chug-closed';

export default function ChugPop({ week, src, who }: { week: number; src: string; who: string | null }) {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const video = useRef<HTMLVideoElement>(null);
  const root = typeof document === 'undefined' ? null : document.documentElement;

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(seenKey(week), '1');
    } catch {
      // Not being able to remember isn't a reason to keep it up.
    }
    delete document.documentElement.dataset.chugPending;
    window.dispatchEvent(new Event(CHUG_CLOSED));
  }, [week]);

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(seenKey(week)) === '1';
    } catch {
      seen = true;
    }
    if (seen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.dataset.chugPending = '1';
    // After the intro if it is playing (it marks the page while it runs).
    const wait = document.documentElement.dataset.intro === 'running' ? 2900 : 700;
    const t = window.setTimeout(() => setOpen(true), wait);
    return () => window.clearTimeout(t);
  }, [week]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Muted set on the node itself before play: React's muted prop can arrive
  // too late for a phone's autoplay check.
  useEffect(() => {
    const node = video.current;
    if (!open || !node) return;
    node.muted = muted;
    void node.play().catch(() => {});
  }, [open, muted]);

  if (!open || !root) return null;

  return createPortal(
    <div className={c.wrap} role="dialog" aria-modal="true" aria-label={`Week ${week} chug`}>
      <button type="button" className={c.scrim} onClick={close} aria-label="Close" tabIndex={-1} />
      <div className={c.card}>
        <div className={c.head}>
          <Icon name="stein" className={c.icon} />
          <span className={c.title}>
            <b>Week {week} chug</b>
            {who ? <span>{who} pays up</span> : null}
          </span>
          <button type="button" className={c.close} onClick={close} aria-label="Close">
            <X weight="bold" />
          </button>
        </div>
        <div className={c.film}>
          <video ref={video} src={src} playsInline autoPlay muted preload="auto" className={c.video} onEnded={close} />
          <button type="button" className={c.sound} onClick={() => setMuted((m) => !m)}>
            {muted ? <SpeakerSlash weight="bold" /> : <SpeakerHigh weight="bold" />}
            {muted ? 'Tap for sound' : 'Sound on'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
