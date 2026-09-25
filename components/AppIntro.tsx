'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The app open animation.
 *
 * Matt's intro plays full screen over black, muted, at two and a half times
 * speed, and ends on the logo. The logo then drifts and shrinks into the mark
 * in the header, so the film hands off to the app rather than cutting to it.
 *
 * Rules it follows, because an intro that cannot be escaped is a tax:
 *   once per session, not per page. Moving between pages does not replay it.
 *   a tap, a key or the skip button ends it immediately.
 *   reduced motion skips the film and the flight entirely.
 *   it never blocks the app: the page is behind it, already rendered.
 *
 * The flight is a FLIP. The logo is drawn where the video left it, the header
 * mark is measured, and the difference is animated on the compositor. No
 * layout is touched, so nothing below it moves.
 */

const SEEN = 'snffl.intro.seen';
const RATE = 2.5;
/** Where the logo sits in the last frame, as a share of the video box. */
const LOGO_CENTER_Y = 0.44;
const LOGO_SIZE = 0.46;

type Phase = 'film' | 'flight' | 'done';

export default function AppIntro() {
  const [phase, setPhase] = useState<Phase | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const logo = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Nothing runs on the server, and nothing runs twice in a session.
    let seen = true;
    try {
      seen = sessionStorage.getItem(SEEN) === '1';
    } catch {
      // Private browsing refuses storage, so the intro simply plays.
      seen = false;
    }
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (seen || still) {
      setPhase('done');
      return;
    }

    // An app opened into a background tab must not spend its intro on nobody.
    // Video autoplay is refused outright while the document is hidden, so the
    // film waits for somebody to be looking at it.
    const start = () => {
      try {
        sessionStorage.setItem(SEEN, '1');
      } catch {
        // Not being able to remember is not a reason to refuse to play.
      }
      setPhase('film');
    };

    if (!document.hidden) {
      start();
      return;
    }
    const onVisible = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', onVisible);
      start();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  /** Ends the film and flies the logo into the header mark. */
  const land = useCallback(() => {
    setPhase((current) => (current === 'film' ? 'flight' : current));
  }, []);

  useEffect(() => {
    if (phase !== 'film') return;
    const element = video.current;
    if (!element) return;
    element.playbackRate = RATE;
    // Autoplay can still be refused. If it is, the still frame is already on
    // screen and the flight runs on its own timer, so nobody waits on a video
    // that is never going to start.
    // A refusal is not worth fighting: the logo is already on screen, so the
    // flight simply runs without the film in front of it.
    const started = element.play();
    if (started) started.catch(() => land());
    const guard = window.setTimeout(land, ((element.duration || 10) / RATE) * 1000 + 900);
    return () => window.clearTimeout(guard);
  }, [phase, land]);

  useEffect(() => {
    if (phase !== 'flight') return;
    const mark = document.getElementById('snffl-header-mark');
    const element = logo.current;
    if (!mark || !element) {
      setPhase('done');
      return;
    }

    const from = element.getBoundingClientRect();
    const to = mark.getBoundingClientRect();
    const scale = to.width / from.width;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);

    const flight = element.animate(
      [
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 1 },
      ],
      { duration: 780, easing: 'cubic-bezier(0.55, 0, 0.1, 1)', fill: 'forwards' }
    );
    // The black ground clears a little sooner, so the logo finishes its flight
    // over the app rather than over a curtain.
    const curtain = document.getElementById('snffl-intro-curtain')?.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 520, delay: 180, easing: 'ease-out', fill: 'forwards' }
    );

    const finish = () => setPhase('done');
    flight.addEventListener('finish', finish);
    return () => {
      flight.removeEventListener('finish', finish);
      curtain?.cancel();
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'film') return;
    const onKey = () => land();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, land]);

  if (phase === null || phase === 'done') return null;

  return (
    <div
      className="snffl-intro"
      role="presentation"
      onClick={land}
      // The app is already behind this, so it is decoration, not a dialog.
      aria-hidden
    >
      <div className="snffl-intro-curtain" id="snffl-intro-curtain" />
      {phase === 'film' ? (
        <video
          ref={video}
          className="snffl-intro-film"
          src="/intro.mp4"
          poster="/icon-512.png"
          muted
          playsInline
          preload="auto"
          onEnded={land}
        />
      ) : null}
      {/* Drawn where the film leaves the logo, then flown to the header. */}
      <img
        ref={logo}
        className="snffl-intro-logo"
        src="/icon-512.png"
        alt=""
        style={{
          width: `min(${LOGO_SIZE * 100}vh, ${LOGO_SIZE * 100 * (404 / 720)}vw)`,
          top: `${LOGO_CENTER_Y * 100}%`,
          opacity: phase === 'flight' ? 1 : 0,
        }}
      />
      {phase === 'film' ? (
        <button type="button" className="snffl-intro-skip" onClick={land}>
          Skip
        </button>
      ) : null}
    </div>
  );
}
