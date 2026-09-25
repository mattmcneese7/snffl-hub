'use client';

import { useCallback, useEffect, useState } from 'react';
import { isAndroid, isIos, shareTarget, type Target } from './InstallGuide';
import { requestGuide } from '@/lib/install-flow';

/**
 * The invite, and the one path to the home screen that works where it is open.
 *
 * This is the link Matt sends the league, so it is read once by thirteen
 * people who will never look at it again. That rules out a page of
 * instructions for every platform: a manager on an iPhone should see the taps
 * he needs and nothing about Android, because the wrong half of a set of
 * instructions is what makes people close the tab.
 *
 * What it does not do is teach the gesture in place. iOS saves the URL on
 * screen when you add to the home screen, ignoring the manifest's start_url,
 * so anybody following instructions here would end up with an icon that opens
 * this page rather than the app. Install hands off to the front door and the
 * instructions come up there, over the real thing.
 *
 * Four states, and only one ever renders:
 *   installed  he is already in the app, so there is nothing to do
 *   ios        no prompt exists, so it is a handoff and two taps
 *   prompt     Chrome fired beforeinstallprompt, so it is one button
 *   desktop    nothing to install here, send it to the phone
 *
 * Everything is decided after mount. Which platform is reading this is not
 * knowable on the server, and a page that renders the iPhone steps and then
 * swaps them for a button has shown the wrong thing to somebody.
 */

type Stage = 'checking' | 'installed' | 'ios' | 'prompt' | 'android' | 'desktop';

/** The slice of the install prompt event this uses. Not in lib.dom. */
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS never adopted display-mode for this and reports it its own way.
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

export default function InstallInvite() {
  const [stage, setStage] = useState<Stage>('checking');
  const [deferred, setDeferred] = useState<InstallPrompt | null>(null);
  const [shared, setShared] = useState(false);
  const [showLink, setShowLink] = useState(false);
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
    // the handoff, so there is never a moment with nothing to follow.
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

  /**
   * Leave, then teach.
   *
   * A full navigation rather than a client side push: what iOS captures is
   * whatever is in the address bar, so the one thing that matters here is
   * landing on a clean "/" with no query on it. The guide raises itself there.
   */
  const handOff = useCallback(() => {
    requestGuide();
    window.location.assign('/');
  }, []);

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
    const text =
      'Live scores, the Rag, every chug and the week in ninety seconds. Tap to add it to your home screen.';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Add SQUIRT to your home screen', text, url });
        return;
      }
      // Clipboard, with the same pitch attached. A link on its own pasted into
      // a chat is the thing this is trying to avoid.
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

      {stage === 'checking' ? <p className="snffl-invite-quiet">One moment.</p> : null}

      {stage === 'installed' ? (
        <div className="snffl-invite-body">
          <p className="snffl-invite-done">You are already in. Nothing to do.</p>
          <a className="snffl-invite-go" href="/">
            Open the app
          </a>
        </div>
      ) : null}

      {stage === 'ios' || stage === 'android' ? (
        <div className="snffl-invite-body">
          <button type="button" className="snffl-invite-go" onClick={handOff}>
            Install
          </button>
          {target && !target.canInstall ? (
            <p className="snffl-invite-quiet">
              This browser cannot add to the home screen on an iPhone. Open this page
              in the one the phone came with, then tap Install again.
            </p>
          ) : null}
        </div>
      ) : null}

      {stage === 'prompt' ? (
        <div className="snffl-invite-body">
          <button type="button" className="snffl-invite-go" onClick={install}>
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
