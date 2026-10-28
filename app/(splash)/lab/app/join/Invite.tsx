'use client';

import { useCallback, useEffect, useState } from 'react';
import { isAndroid, isIos, shareTarget, ShareGlyph, type Target } from '@/components/InstallGuide';
import { ui } from '../ui';
import j from '../ui/blocks/Join.module.css';

type Stage = 'checking' | 'installed' | 'ios' | 'prompt' | 'android' | 'desktop';
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * The one step this phone needs, decided after mount (the server cannot know
 * the platform), the same four states v3's invite had:
 *
 *   installed  already in the app: open it
 *   ios        no install prompt exists: go to Home first, then Share, Add to
 *              Home Screen. Leaving this page first matters: iOS saves
 *              whatever URL is on screen, and an icon that opens the invite
 *              instead of the app is the classic mistake.
 *   prompt     Chrome offered its install prompt: one button
 *   desktop    nothing to install here: send it to a phone
 */
export default function Invite({ line }: { line: string }) {
  const [stage, setStage] = useState<Stage>('checking');
  const [deferred, setDeferred] = useState<InstallPrompt | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);

  useEffect(() => {
    if (standalone()) return setStage('installed');
    setStage(isIos() ? 'ios' : isAndroid() ? 'android' : 'desktop');
    setTarget(shareTarget());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPrompt);
      setStage((s) => (s === 'android' ? 'prompt' : s));
    };
    const onInstalled = () => setStage('installed');
    window.addEventListener('beforeinstallprompt', onPrompt);
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
    setDeferred(null);
    setStage(outcome === 'accepted' ? 'installed' : 'android');
  }, [deferred]);

  const passItOn = useCallback(async () => {
    const url = window.location.origin + window.location.pathname;
    const text = `${line} Tap to add it to your home screen.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Add Splash to your home screen', text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') setShowLink(true);
    }
  }, [line]);

  return (
    <div className={j.steps}>
      {stage === 'installed' ? (
        <a href="/" className={`${ui.pill} ${ui.pillPrimary}`}>
          Open Splash
        </a>
      ) : null}
      {stage === 'prompt' ? (
        <button type="button" className={`${ui.pill} ${ui.pillPrimary}`} onClick={install}>
          Install Splash
        </button>
      ) : null}
      {stage === 'ios' || stage === 'android' ? (
        <>
          <a href="/" className={`${ui.pill} ${ui.pillPrimary}`}>
            Go to Splash
          </a>
          <p className={ui.sub}>
            {stage === 'ios' ? (
              <>
                Then tap <ShareGlyph /> {target?.control ?? 'the Share button'} and pick Add to Home Screen.
              </>
            ) : (
              <>Then tap {target?.control ?? 'the menu'} and pick Add to Home screen.</>
            )}
          </p>
        </>
      ) : null}
      {stage === 'desktop' ? <p className={ui.sub}>Splash lives on your phone. Open this link there to add it to your home screen.</p> : null}

      <button type="button" className={`${ui.pill} ${ui.pillSecondary}`} onClick={passItOn}>
        {copied ? 'Copied, ready to paste' : 'Send to the League'}
      </button>
      {showLink ? <p className={`${ui.sub} ${j.link}`}>{typeof window !== 'undefined' ? window.location.href : ''}</p> : null}
    </div>
  );
}
