'use client';

import { useCallback, useEffect, useState } from 'react';
import { clearGuide, guideRequested, GUIDE_EVENT } from '@/lib/install-flow';

/**
 * The two taps, over the app, pointing at the browser's own bar.
 *
 * This lives in the layout rather than on the invite, and that is the whole
 * point of it: iOS saves the URL on screen when you tap Add to Home Screen,
 * ignoring the manifest's start_url, so instructions shown on the invite
 * produce an icon that opens the invite. The invite sends the browser to the
 * front door and asks for this instead, so what gets captured is the app.
 *
 * Every browser keeps the control somewhere else, so the arrow is aimed from
 * the user agent. Anything unrecognised gets the words and no arrow: a line
 * pointing at the wrong corner is worse than no line.
 */

type Aim = 'bottom-center' | 'bottom-right' | 'top-right';

export type Target = {
  aim: Aim;
  /** What they are tapping, in their own browser's words. */
  control: string;
  /** Whether Add to Home Screen is behind it at all. */
  canInstall: boolean;
};

export const isAndroid = () => /android/i.test(navigator.userAgent);

export const isIos = () =>
  // Android first, and not as a formality. The iPad test below is a platform
  // and a touch count rather than a name, because iPadOS reports itself as a
  // Mac, and plenty of Android devices report that same platform string with
  // a touch screen: without this line they come through as iPads and get sent
  // to the wrong corner for a button they do not have.
  !isAndroid() &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export function shareTarget(): Target | null {
  const ua = navigator.userAgent;
  const ipad =
    /ipad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIos()) {
    // Chrome on iOS can add to the home screen, and it is behind Share, not
    // behind the three dot menu: "on the right of the address bar, tap Share",
    // in Google's own words. An earlier pass had this pointing at the menu in
    // the opposite corner for a thing that is not in it.
    if (/CriOS/.test(ua)) {
      return { aim: 'top-right', control: 'Share, right of the address bar', canInstall: true };
    }
    // The rest keep it behind a menu rather than a labelled Share button, and
    // they all put that menu at the end of the bottom bar.
    if (/FxiOS|EdgiOS|OPiOS/.test(ua)) {
      return { aim: 'bottom-right', control: 'the menu', canInstall: true };
    }
    // Safari. Share is the middle of five along the bottom on a phone, and up
    // in the top bar on an iPad.
    return ipad
      ? { aim: 'top-right', control: 'the Share button', canInstall: true }
      : { aim: 'bottom-center', control: 'the Share button', canInstall: true };
  }

  if (isAndroid()) {
    if (/SamsungBrowser/.test(ua)) return { aim: 'bottom-right', control: 'the menu', canInstall: true };
    if (/Firefox/.test(ua)) return { aim: 'bottom-right', control: 'the menu', canInstall: true };
    if (/EdgA/.test(ua)) return { aim: 'bottom-center', control: 'the menu', canInstall: true };
    if (/Chrome/.test(ua)) return { aim: 'top-right', control: 'the three dots', canInstall: true };
    return null;
  }

  return null;
}

/**
 * Safari's Share glyph, drawn rather than described.
 *
 * The instruction is "tap the one that looks like this", so the icon has to be
 * the icon. A character from a font would be whatever that font decided, and
 * on an iPhone the obvious candidates render as colour emoji.
 */
export function ShareGlyph() {
  return (
    <svg className="snffl-invite-glyph" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M12 3v11M12 3l-3.2 3.2M12 3l3.2 3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 10H5.6A1.6 1.6 0 0 0 4 11.6v7.8A1.6 1.6 0 0 0 5.6 21h12.8a1.6 1.6 0 0 0 1.6-1.6v-7.8A1.6 1.6 0 0 0 18.4 10H17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The arrow, drawn by hand rather than set as a glyph.
 *
 * A straight CSS triangle reads as part of the interface, which is the one
 * thing this is not: it is a note scrawled over the app pointing at something
 * the app does not own. The wobble in the path and the two overlapping strokes
 * are what sell that, and the curve is mirrored per direction so it always
 * arrives at the target from the open side of the screen.
 */
function HandArrow({ aim }: { aim: Aim }) {
  const path =
    aim === 'top-right'
      ? 'M14 96 C 10 62, 26 32, 58 19 C 70 14, 82 12, 95 11'
      : aim === 'bottom-right'
        ? 'M13 14 C 9 48, 24 78, 57 92 C 69 97, 82 99, 95 100'
        : 'M16 12 C 12 44, 30 70, 54 86 C 62 91, 70 96, 74 104';
  const head =
    aim === 'top-right'
      ? 'M95 11 L 79 6 M95 11 L 84 22'
      : aim === 'bottom-right'
        ? 'M95 100 L 79 96 M95 100 L 85 89'
        : 'M74 104 L 62 96 M74 104 L 78 90';
  return (
    <svg className="snffl-invite-arrow" viewBox="0 0 110 112" aria-hidden focusable="false">
      {/* Two passes of the same line, offset a hair, so the stroke has the
          uneven weight of something drawn rather than plotted. */}
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} strokeWidth="5.5" opacity="0.45" transform="translate(1.2 1)" />
        <path d={path} strokeWidth="4" />
        <path d={head} strokeWidth="4" />
      </g>
    </svg>
  );
}

export default function InstallGuide() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    clearGuide();
  }, []);

  useEffect(() => {
    const raise = () => {
      setTarget(shareTarget());
      setOpen(true);
    };
    // Arriving from the invite, which asked for this before sending us here.
    if (guideRequested()) raise();
    window.addEventListener(GUIDE_EVENT, raise);
    return () => window.removeEventListener(GUIDE_EVENT, raise);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="snffl-invite-coach"
      data-aim={target?.aim ?? 'none'}
      role="dialog"
      aria-modal="true"
      aria-label="Add to Home Screen"
    >
      <button
        type="button"
        className="snffl-invite-coach-scrim"
        onClick={close}
        aria-label="Close"
        tabIndex={-1}
      />

      <div className="snffl-invite-coach-card">
        <span className="snffl-frost" aria-hidden />
        <p className="snffl-invite-coach-line">
          <span className="snffl-invite-step">1</span>
          <span>
            Tap {target ? target.control : 'the share button'}
            {target?.control.includes('Share') ? <ShareGlyph /> : null}
          </span>
        </p>
        <p className="snffl-invite-coach-line">
          <span className="snffl-invite-step">2</span>
          <span>
            Pick <strong>Add to Home Screen</strong>
          </span>
        </p>
        {/* Said here because this is the screen they are looking at when they
            do it, and it is the one thing that goes wrong silently. */}
        <p className="snffl-invite-coach-note">Do it from this page and the icon opens the app.</p>
        <button type="button" className="snffl-invite-coach-done" onClick={close}>
          Got it
        </button>
      </div>

      {/* Aimed at the browser's own toolbar, which is the one thing on screen
          this page is not allowed to draw on. Nothing is drawn at all when the
          browser was not recognised: an arrow pointing at the wrong corner is
          worse than the written step alone. */}
      {target ? (
        <span className="snffl-invite-aim" aria-hidden>
          <HandArrow aim={target.aim} />
          <span className="snffl-invite-scrawl">
            {target.aim === 'top-right' ? 'up here' : 'down here'}
          </span>
        </span>
      ) : null}
    </div>
  );
}
