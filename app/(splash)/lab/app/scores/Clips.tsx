'use client';

import { useState } from 'react';
import { Xs } from './icons';
import x from './scores.module.css';

export type RailClip = { videoId: string; title: string; still: string; vertical: boolean; channel: string; owners: string[] };

/**
 * Clips that play where they sit: the still until it is chosen, then the
 * broadcaster's own YouTube player in its place, with sound.
 */
export default function Clips({ clips }: { clips: RailClip[] }) {
  const [on, setOn] = useState<string | null>(null);
  return (
    <div className={x.clips}>
      {clips.map((c) => (
        <div key={c.videoId} className={`${x.clip} ${c.vertical ? x.clipTall : ''}`}>
          {on === c.videoId ? (
            <span className={x.clipFrame}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${c.videoId}?autoplay=1&playsinline=1&rel=0`}
                title={c.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </span>
          ) : (
            <button type="button" className={x.clipFrame} onClick={() => setOn(c.videoId)} aria-label={`Play ${c.title}`}>
              <img src={c.still} alt="" loading="lazy" />
              <Xs name="play" className={x.clipPlay} />
            </button>
          )}
          <span className={x.clipText}>
            <b>{c.title}</b>
            <small>{[c.channel, c.owners.length ? c.owners.join(', ') : null].filter(Boolean).join(' · ')}</small>
          </span>
        </div>
      ))}
    </div>
  );
}
