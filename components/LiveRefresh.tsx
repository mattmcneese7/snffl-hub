'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { runLiveScores } from './LiveScores';

/**
 * Pulls fresh scores while games are running, Brief Section 2.
 *
 * router.refresh re-renders the server components in place, so the page keeps
 * its scroll position and the poll costs one request rather than a reload.
 *
 * Deliberately its own component rather than something in SiteChrome: the
 * chrome renders on every route, and a timer living there would poll all week
 * on pages that never change.
 */
export default function LiveRefresh({
  live,
  week,
  // 15 seconds while anything is live, Checkpoint 12b. Sleeper's matchups
  // call is cached for the same 15, so each refresh can bring a new score.
  intervalMs = 15000,
}: {
  /** Whether anything on this page is actually in progress. */
  live: boolean;
  /**
   * The fantasy week on screen. With it, scores also update every 10 seconds
   * straight from Sleeper in the browser, between the full refreshes.
   */
  week?: number;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!live || week == null) return;
    runLiveScores(week);
    return () => runLiveScores(null);
  }, [live, week]);

  useEffect(() => {
    if (!live) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => router.refresh(), intervalMs);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    // A backgrounded phone would otherwise poll for hours against a tab nobody
    // is looking at. Coming back refreshes immediately rather than waiting out
    // the rest of an interval that elapsed while hidden.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [live, intervalMs, router]);

  return null;
}
