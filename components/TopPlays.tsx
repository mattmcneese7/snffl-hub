'use client';

import { PlayMark } from './Marks';
import { useState } from 'react';
import type { ReelClip } from '@/lib/reel-clips';
import ReelPlayer from './ReelPlayer';

/**
 * Top Plays on Home: the best clips as big cards in a rail, ranked with
 * rostered players' touchdowns first. Tapping one opens the full screen reel
 * there and carries on through the rest.
 */
export default function TopPlays({ clips, week }: { clips: ReelClip[]; week: number }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!clips.length) return null;

  return (
    <>
      <div className="snffl-top-plays">
        {clips.map((clip, index) => (
          <button
            type="button"
            className="snffl-top-play"
            key={clip.id}
            onClick={() => setOpen(index)}
            aria-label={`Play: ${clip.title}`}
          >
            <span className="snffl-top-play-art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {clip.still ? <img src={clip.still} alt="" loading="lazy" /> : null}
              <PlayMark className="snffl-top-play-button" />
            </span>
            <span className="snffl-top-play-title">{clip.title}</span>
            {clip.tags.length ? <span className="snffl-top-play-tags">{clip.tags.join(' · ')}</span> : null}
          </button>
        ))}
      </div>
      {open != null ? (
        <ReelPlayer clips={clips} start={open} title={`Week ${week} Top Plays`} onClose={() => setOpen(null)} />
      ) : null}
    </>
  );
}
