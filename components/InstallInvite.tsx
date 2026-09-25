'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * The invite, and the one path to the home screen that works where it is open.
 *
 * This is the link Matt sends the league, so it is read once by thirteen
 * people who will never look at it again. That rules out a page of
 * instructions for every platform: a manager on an iPhone should see the
 * three taps he needs and nothing about Android, because the wrong half of a
 * set of instructions is what makes people close the tab.
 *
 * Four states, and only one ever renders:
 *   installed  he is already in the app, so there is nothing to do
 *   ios        Safari cannot be asked, so it is Share, then Add to Home Screen
 *   prompt     Chrome fires beforeinstallprompt, so it is one button
 *   desktop    nothing to install here, send it to the phone
 *
 * Everything is decided after mount. Which platform is reading this is not
 * knowable on the server, and a page that renders the iPhone steps and then
 * swaps them for a button has shown the wrong thing to somebody.
 */

type Stage = 'checking' | 'installed' | 'ios' | 'prompt' | 'android' | 'desktop';

/**
 * Safari's Share glyph, drawn rather than described.
 *
 * The instruction is "tap the one that looks like this", so the icon has to
 * be the icon. A character from a font would be whatever that font decided,
 * and on an iPhone the obvious candidates render as colour emoji.
 */
function ShareGlyph() {
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

/** The slice of the install prompt event this uses. Not in lib.dom. */
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS never adopted display-mode for this and reports it its own way.
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

const isAndroid = () => /android/i.test(navigator.userAgent);

const isIos = () =>
  // Android first, and not as a formality. The iPad test below is a platform
  // and touch count rather than a name, because iPadOS reports itself as a
  // Mac, and plenty of Android devices report that same platform string with
  // a touch screen: without this line they come through as iPads and get sent
  // to the wrong corner of the screen for a button they do not have.
  !isAndroid() &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/**
 * Where this browser keeps the control the next step is behind, and what to
 * call it.
 *
 * Every browser puts it somewhere else, so an arrow drawn at a guessed
 * position points at nothing on most phones. The user agent is a poor thing
 * to trust in general, but it is reliable for exactly this: which app is
 * drawing the toolbar. Anything unrecognised gets no arrow rather than a
 * wrong one.
 *
 *   bottom-center  a five item toolbar with Share in the middle
 *   bottom-right   a menu at the end of a bottom bar
 *   top-right      a menu in the top bar
 */
type Aim = 'bottom-center' | 'bottom-right' | 'top-right';
type Target = {
  aim: Aim;
  /** What they are tapping, in their own browser's words. */
  control: string;
  /** Whether Add to Home Screen is behind it, or only a share sheet. */
  canInstall: boolean;
};

function shareTarget(): Target | null {
  const ua = navigator.userAgent;
  const ipad = /ipad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIos()) {
    // On iOS every browser is the same engine in a different shell, and only
    // the built in one can add to the home screen at all.
    if (/CriOS/.test(ua)) return { aim: 'bottom-right', control: 'the three dots', canInstall: false };
    if (/FxiOS/.test(ua)) return { aim: 'bottom-right', control: 'the menu', canInstall: false };
    if (/EdgiOS/.test(ua)) return { aim: 'bottom-center', control: 'the menu', canInstall: false };
    // Safari. On a phone the toolbar is at the bottom with Share in the
    // middle of five; on an iPad it is along the top, at the right.
    return ipad
      ? { aim: 'top-right', control: 'the Share button', canInstall: true }
      : { aim: 'bottom-center', control: 'the Share button', canInstall: true };
  }

  if (isAndroid()) {
    if (/SamsungBrowser/.test(ua)) return { aim: 'bottom-right', control: 'the menu', canInstall: true };
    if (/Firefox|FxiOS/.test(ua)) return { aim: 'bottom-right', control: 'the menu', canInstall: true };
    if (/EdgA/.test(ua)) return { aim: 'bottom-center', control: 'the menu', canInstall: true };
    if (/Chrome/.test(ua)) return { aim: 'top-right', control: 'the three dots', canInstall: true };
    return null;
  }

  return null;
}

/**
 * The arrow, drawn by hand rather than set as a glyph.
 *
 * A straight CSS triangle reads as part of the interface, which is the one
 * thing this is not: it is a note scrawled over the app pointing at something
 * the app does not own. The wobble in the path and the two overlapping
 * strokes are what sell that, and the curve is mirrored per direction so it
 * always arrives at the target from the open side of the screen.
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

export default function InstallInvite() {
  const [stage, setStage] = useState<Stage>('checking');
  const [deferred, setDeferred] = useState<InstallPrompt | null>(null);
  const [shared, setShared] = useState(false);
  /** Set when neither the share sheet nor the clipboard would take it. */
  const [showLink, setShowLink] = useState(false);
  /** The scrawled arrow the Install button raises, and what it points at. */
  const [guiding, setGuiding] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);

  useEffect(() => {
    if (standalone()) {
      setStage('installed');
      return;
    }
    setStage(isIos() ? 'ios' : isAndroid() ? 'android' : 'desktop');
    setTarget(shareTarget());

    // Chrome offers the real prompt, but only when it decides the app
    // qualifies, and it fires whenever it likes. Until it does, Android gets
    // the written steps, so there is never a moment with nothing to follow.
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPrompt);
      setStage((current) => (current === 'android' ? 'prompt' : current));
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // He can install from the browser's own menu while this is on screen.
    const onInstalled = () => setStage('installed');
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The event is single use either way: Chrome will fire a fresh one if it
    // still wants to offer, and reusing this one throws.
    setDeferred(null);
    if (outcome === 'accepted') setStage('installed');
    else setStage('android');
  }, [deferred]);

  // How Matt passes it on. The native sheet where there is one, the clipboard
  // everywhere else, because a link somebody has to select by hand is a link
  // that gets sent wrong.
  //
  // The text matters as much as the link. A share sheet drops title and text
  // into the message for him, and a bare URL in a group chat is a blue line
  // thirteen people scroll past: this arrives already saying what it is and
  // what to do with it. The same sentence the preview card carries, so the
  // message and the thumbnail under it do not say two different things.
  const passItOn = useCallback(async () => {
    const url = window.location.origin + '/join';
    const text = 'Live scores, the Rag, every chug and the week in ninety seconds. Tap to add it to your home screen.';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Add SQUIRT to your home screen', text, url });
        return;
      }
      // Clipboard, with the same pitch attached. A link on its own pasted
      // into a chat is the thing this is trying to avoid.
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShared(true);
      setTimeout(() => setShared(false), 2400);
    } catch (error) {
      // Cancelling the share sheet lands here and means nothing. A refused
      // clipboard also lands here and means the button did nothing at all,
      // which is the worst outcome on the page: he taps it, no sheet opens,
      // no text changes, and he has no way to get the link out. So the link
      // itself comes up instead, selectable, and he can copy it by hand.
      if ((error as Error)?.name !== 'AbortError') setShowLink(true);
    }
  }, []);

  return (
    <div className="snffl-invite">
      <div className="snffl-invite-mark">
        <span className="snffl-invite-glow" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark-v4.png" alt="" />
      </div>

      <h1 className="snffl-invite-title">SQUIRT</h1>
      <p className="snffl-invite-deck">
        Live scores, the Rag, every chug and the week in ninety seconds. Put it on
        your home screen and it opens like an app.
      </p>

      {stage === 'checking' ? (
        <p className="snffl-invite-quiet">One moment.</p>
      ) : null}

      {stage === 'installed' ? (
        <div className="snffl-invite-body">
          <p className="snffl-invite-done">You are already in. Nothing to do.</p>
          <a className="snffl-invite-go" href="/">
            Open the app
          </a>
        </div>
      ) : null}

      {stage === 'ios' ? (
        <div className="snffl-invite-body">
          {/* The same button Android gets, in the same place, because the
              person reading this does not care which of the two phones makes
              it harder. iOS exposes no way to add to the home screen from a
              page and its share sheet does not carry the action, so the
              button raises the two taps instead and points at the control
              they are on. */}
          <button
            type="button"
            className="snffl-invite-go"
            onClick={() => setGuiding(true)}
            aria-expanded={guiding}
          >
            Install
          </button>
          {target && !target.canInstall ? (
            <p className="snffl-invite-quiet">
              This browser cannot add to the home screen on an iPhone. Open this
              page in the one the phone came with, then tap Install again.
            </p>
          ) : null}
        </div>
      ) : null}

      {guiding ? (
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
            onClick={() => setGuiding(false)}
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
            <button
              type="button"
              className="snffl-invite-coach-done"
              onClick={() => setGuiding(false)}
            >
              Got it
            </button>
          </div>

          {/* Aimed at the browser's own toolbar, which is the one thing on
              screen this page is not allowed to draw on. Nothing is drawn at
              all when the browser was not recognised: an arrow pointing at
              the wrong corner is worse than the written step alone. */}
          {target ? (
            <span className="snffl-invite-aim" aria-hidden>
              <HandArrow aim={target.aim} />
              <span className="snffl-invite-scrawl">
                {target.aim === 'top-right' ? 'up here' : 'down here'}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}

      {stage === 'prompt' ? (
        <div className="snffl-invite-body">
          <button type="button" className="snffl-invite-go" onClick={install}>
            Add to home screen
          </button>
        </div>
      ) : null}

      {stage === 'android' ? (
        <div className="snffl-invite-body">
          {/* The prompt has not fired, or this browser does not have one. The
              button still works: it points at the menu the action lives in. */}
          <button
            type="button"
            className="snffl-invite-go"
            onClick={() => setGuiding(true)}
            aria-expanded={guiding}
          >
            Install
          </button>
        </div>
      ) : null}

      {stage === 'desktop' ? (
        <div className="snffl-invite-body">
          <p className="snffl-invite-quiet">
            The home screen part is a phone thing. Open this page on yours, or carry
            on here.
          </p>
          <a className="snffl-invite-go" href="/">
            Open the app
          </a>
        </div>
      ) : null}

      {stage !== 'checking' ? (
        <button type="button" className="snffl-invite-pass" onClick={passItOn}>
          {shared ? 'Copied, ready to paste' : 'Send this to the league'}
        </button>
      ) : null}

      {showLink ? (
        <p className="snffl-invite-link">
          Copy this and send it over:
          <span>squirtnite.live/join</span>
        </p>
      ) : null}
    </div>
  );
}
