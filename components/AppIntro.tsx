'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The app open animation.
 *
 * The mark, large and centred, with a thin blue neon edge that breathes for
 * about four seconds, before flying down into the tab bar, where the same
 * mark is the app's Home button. The file carries a version in its name: it lives in
 * public, which is served without a content hash, so a changed mark at an
 * unchanged path would reach returning visitors as whatever their browser
 * still had. Then it moves up into the header, where it is the app's
 * permanent mark, and the app is already there behind it.
 *
 * This replaced a ten second film. The film was 8MB, which is a lot of
 * somebody's data to spend before they have seen a score, and it had to be
 * cropped to fit a phone because it was shot 9:16 and a phone is narrower than
 * that. The mark is a 200KB cutout with its background removed, so the glow is
 * CSS and follows the silhouette exactly at any size.
 *
 * Rules, because an intro that cannot be escaped is a tax:
 *   once per session, not per page, so moving around does not replay it
 *   a tap or a key ends it immediately. There is no Skip button: four seconds
 *     does not need a control, and a button in the corner is the one thing on
 *     screen that says this is a thing to get past
 *   reduced motion gets the mark without the pulse or the flight
 *   the app is already rendered behind it, never waiting on it
 */

const SEEN = 'snffl.intro.seen';
/** How long the mark holds before it goes to the header. */
const HOLD_MS = 4000;

/*
 * Whether the mark is still on screen, published where anything that has to
 * wait for it can ask.
 *
 * sessionStorage cannot answer this. The intro marks itself seen the moment
 * it starts, so anything mounting a beat later reads "seen" while the mark is
 * still mid flight, and treats a running animation as one that already
 * finished. This is the state itself rather than a record of having played.
 */
type IntroState = 'running' | 'done';
const store = () => window as unknown as { __snfflIntro?: IntroState };
const setIntroState = (state: IntroState) => {
  store().__snfflIntro = state;
};

/**
 * True until the mark has landed on the Home button.
 *
 * Unknown counts as running: the intro mounts above every caller in the
 * layout, so an absent answer means it has not reported yet, and waiting on
 * an event with a failsafe is the safe way to be wrong.
 */
export function introRunning(): boolean {
  return store().__snfflIntro !== 'done';
}

type Phase = 'hold' | 'flight' | 'done';

export default function AppIntro() {
  const [phase, setPhase] = useState<Phase | null>(null);
  const logo = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let seen = true;
    try {
      seen = sessionStorage.getItem(SEEN) === '1';
    } catch {
      // Private browsing refuses storage, so the intro simply plays.
      seen = false;
    }
    if (seen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIntroState('done');
      setPhase('done');
      return;
    }
    setIntroState('running');
    try {
      sessionStorage.setItem(SEEN, '1');
    } catch {
      // Not being able to remember is not a reason to refuse to play.
    }
    setPhase('hold');
  }, []);

  const land = useCallback(() => {
    setPhase((current) => (current === 'hold' ? 'flight' : current));
  }, []);

  useEffect(() => {
    if (phase !== 'hold') return;
    const timer = window.setTimeout(land, HOLD_MS);
    const onKey = () => land();
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [phase, land]);

  useEffect(() => {
    if (phase !== 'flight') return;
    // The image inside the dock disc, not the button around it. The button is
    // 64px and the mark inside it is 50 and lifted a few percent for optical
    // centring, so flying to the button's box landed the mark too big and a
    // little low: close enough to look like a mistake rather than a landing.
    const mark =
      document.querySelector<HTMLElement>('#snffl-app-mark img') ??
      document.getElementById('snffl-app-mark');
    const element = logo.current;
    if (!mark || !element) {
      setIntroState('done');
      setPhase('done');
      window.dispatchEvent(new Event('snffl:intro-done'));
      return;
    }

    // A FLIP against the real header mark, so it lands on it rather than near
    // it: measure both, animate the difference on the compositor, touch no
    // layout, and nothing on the page below moves.
    const from = element.getBoundingClientRect();
    const to = mark.getBoundingClientRect();
    const scale = to.width / from.width;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);

    const flight = element.animate(
      [
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      ],
      { duration: 760, easing: 'cubic-bezier(0.6, 0, 0.15, 1)', fill: 'forwards' }
    );
    // The ground clears first, so the mark finishes its trip over the app
    // rather than over a curtain.
    const curtain = document
      .getElementById('snffl-intro-curtain')
      ?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 520,
        delay: 120,
        easing: 'ease-out',
        fill: 'forwards',
      });

    const finish = () => {
      setIntroState('done');
      setPhase('done');
      // The chug waits on this rather than on a number. The flight is 760ms
      // after a four second hold, and anything timed to that by hand is a
      // guess that drifts the moment either changes.
      window.dispatchEvent(new Event('snffl:intro-done'));
    };
    flight.addEventListener('finish', finish);
    return () => {
      flight.removeEventListener('finish', finish);
      curtain?.cancel();
    };
  }, [phase]);

  if (phase === null || phase === 'done') return null;

  return (
    <div className="snffl-intro" role="presentation" onClick={land} aria-hidden>
      <div className="snffl-intro-curtain" id="snffl-intro-curtain" />
      {/* The mark and the light behind its eyes fly as one thing. The glow is
          a layer under the artwork, showing through the holes knocked in it,
          exactly as it works on the Home button this lands on: the logo is
          lit the whole way in, and what you are looking at during the open is
          the same object you end up pressing. */}
      <span ref={logo} className="snffl-intro-mark-eyes">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={`snffl-intro-mark${phase === 'hold' ? ' snffl-intro-pulse' : ''}`}
          src="/logo-mark-v4-1024.png"
          alt=""
        />
      </span>
    </div>
  );
}
