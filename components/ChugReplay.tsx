'use client';

import { useEffect, useState } from 'react';

/**
 * A way back to the week's chug.
 *
 * The film plays once on the way in and then never again, which is right for
 * an interstitial and wrong for the best thing the league makes. This sits in
 * the gap under the reels and asks the modal to come back.
 *
 * Amber rather than the app's turquoise: this is the beer, and the Chug Meter
 * and the Shartzone already own that colour.
 */
export default function ChugReplay({ week }: { week: number }) {
  // Not until the film has been watched or dismissed. A way to watch it again
  // that appears while it is still playing for the first time is a button
  // with nothing to do.
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = localStorage.getItem(`snffl.chug.seen.w${week}`) === '1';
    } catch {
      // Storage refused, so treat it as unseen and wait for the close.
      alreadySeen = false;
    }

    if (alreadySeen) {
      // Nothing is going to play, so it lands with the week story ribbon, a
      // beat behind it, and the two arrive as a pair.
      const id = setTimeout(() => setLanded(true), 2600);
      return () => clearTimeout(id);
    }

    const onClosed = () => setLanded(true);
    window.addEventListener('snffl:chug-closed', onClosed);
    return () => window.removeEventListener('snffl:chug-closed', onClosed);
  }, [week]);

  // Nothing at all until it lands: see WeekStoryButton for why a collapsed
  // box is not good enough.
  if (!landed) return null;

  return (
    <div className="snffl-wstory-ribbon">
      <span className="snffl-ribbon-clip">
        <button
        type="button"
        className="snffl-chugreplay-button"
        onClick={() => window.dispatchEvent(new Event('snffl:chug'))}
      >
        <span className="snffl-frost" aria-hidden />
        <svg className="snffl-chugreplay-mark" viewBox="0 0 10 12" aria-hidden focusable="false">
          <path d="M0 0 L10 6 L0 12 Z" fill="currentColor" />
        </svg>
          Week {week} chug
        </button>
      </span>
    </div>
  );
}
