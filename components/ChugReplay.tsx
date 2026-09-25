'use client';

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
  return (
    <div className="snffl-chugreplay">
      <button
        type="button"
        className="snffl-chugreplay-button"
        onClick={() => window.dispatchEvent(new Event('snffl:chug'))}
      >
        <svg className="snffl-chugreplay-mark" viewBox="0 0 10 12" aria-hidden focusable="false">
          <path d="M0 0 L10 6 L0 12 Z" fill="currentColor" />
        </svg>
        Week {week} chug
      </button>
    </div>
  );
}
