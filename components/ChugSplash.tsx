'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { introRunning } from './AppIntro';

/**
 * The week's chug, as a splash on the way in.
 *
 * Somebody finishing last owes a beer and films himself paying it. That is
 * the best thing the league produces and it was living in a group chat, so it
 * plays once on the way into the app, then gets out of the way.
 *
 * Rules, the same ones the intro follows, because an interstitial that cannot
 * be escaped is a tax:
 *   once per week per device, not per visit, so opening the app twice on a
 *     Sunday does not replay it
 *   a tap anywhere ends it, and it ends itself when the clip does
 *   it waits for the opening animation rather than fighting it for the screen
 *   reduced motion skips it entirely
 *
 * Muted to start, because browsers refuse to autoplay sound and a clip that
 * silently fails to start is worse than a silent one that plays. The sound is
 * the point of a chug, so the control to turn it on is the loudest thing on
 * the screen.
 */
const seenKey = (week: number) => `snffl.chug.seen.w${week}`;
/** Only a failsafe now: the intro says when it is done. */
const AFTER_INTRO_MS = 6000;

export default function ChugSplash({ week, src }: { week: number; src: string }) {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const video = useRef<HTMLVideoElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(seenKey(week), '1');
    } catch {
      // Not being able to remember is not a reason to refuse to play.
    }
    // The replay ribbon waits on this. Offering a way to watch it again while
    // it is still playing for the first time is a button with nothing to do.
    window.dispatchEvent(new Event('snffl:chug-closed'));
  }, [week]);

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(seenKey(week)) === '1';
    } catch {
      seen = false;
    }
    if (seen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Straight off the back of the opening animation: the mark flies home to
    // the Home button, the app is there, and this arrives on top of it. A
    // returning visitor in the same session gets no animation, so there is
    // nothing to follow and it comes up almost at once.
    if (!introRunning()) {
      const id = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(id);
    }

    const show = () => setOpen(true);
    window.addEventListener('snffl:intro-done', show, { once: true });
    // And a floor, in case the animation never reports finishing: a browser
    // throttles animations in a hidden tab, so the event can be late or
    // never, and the film should not be lost with it.
    const failsafe = setTimeout(show, AFTER_INTRO_MS);
    return () => {
      window.removeEventListener('snffl:intro-done', show);
      clearTimeout(failsafe);
    };
  }, [week]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Anything on the page can ask for it back. An event rather than lifted
  // state, because the modal lives in the layout and the button that reopens
  // it lives on Home: the two never share a parent worth threading a prop
  // through.
  useEffect(() => {
    const replay = () => {
      setMuted(true);
      setOpen(true);
    };
    window.addEventListener('snffl:chug', replay);
    return () => window.removeEventListener('snffl:chug', replay);
  }, []);

  // React sets `muted` as a property on the element it creates, and on a
  // <video> that is famously unreliable: the attribute can be missing at the
  // moment the browser decides whether autoplay is allowed, and an unmuted
  // autoplay is simply refused on a phone. Setting it on the node itself
  // before play is the only way to be sure.
  useEffect(() => {
    if (!open) return;
    const node = video.current;
    if (!node) return;
    node.muted = muted;
    if (muted) void node.play().catch(() => {});
  }, [open, muted]);

  if (!open) return null;

  return createPortal(
    <div className="snffl-chugsplash" role="dialog" aria-modal="true" aria-label={`Week ${week} chug`}>
      {/* The app is loaded and working behind this, not replaced by it: the
          scrim is see through and the panel is the same glass everything else
          on the site is made of. */}
      <button
        type="button"
        className="snffl-chugsplash-scrim"
        onClick={close}
        aria-label="Close"
        tabIndex={-1}
      />

      <div className="snffl-chugsplash-card">
        <span className="snffl-frost" aria-hidden />

        <div className="snffl-chugsplash-top">
          <span className="snffl-chugsplash-tag">Week {week} chug</span>
          <button
            type="button"
            className="snffl-chugsplash-close"
            onClick={close}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <video
          ref={video}
          className="snffl-chugsplash-video"
          src={src}
          autoPlay
          // Also set imperatively above, which is the one that counts.
          muted
          playsInline
          onEnded={close}
        />

        {/* Nothing here once the sound is on. A line of commentary under
            somebody's video is the app talking over it. */}
        {muted ? (
          <button
            type="button"
            className="snffl-chugsplash-sound"
            onClick={() => {
              setMuted(false);
              // Unmuting an element that is already playing needs no new
              // play(), but a paused one does: some browsers stall autoplay
              // until the first gesture, and this is that gesture.
              void video.current?.play().catch(() => {});
            }}
          >
            Sound on
          </button>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
