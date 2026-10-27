'use client';

import { useState } from 'react';
import { Ms } from '../icons';
import { Rail, Tag, ui } from '../ui';
import x from './clips.module.css';

export type RailClip = { videoId: string; title: string; still: string; vertical: boolean; channel: string; owners: string[] };

/**
 * Clips that play where they sit: the still until it is chosen, then the
 * broadcaster's own YouTube player in its place, with sound. The still is the
 * tap; the title and source sit flat on the page under it. Every clip takes
 * the same 16:9 box, vertical ones cropped to it, so the rail stays one height.
 */
export default function Clips({ clips }: { clips: RailClip[] }) {
  const [on, setOn] = useState<string | null>(null);
  return (
    <Rail label="Highlights">
      {clips.map((c) => (
        <div key={c.videoId} className={x.clip}>
          {on === c.videoId ? (
            <span className={`${ui.media} ${x.frame}`}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${c.videoId}?autoplay=1&playsinline=1&rel=0`}
                title={c.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </span>
          ) : (
            <button type="button" className={`${ui.media} ${x.frame}`} onClick={() => setOn(c.videoId)} aria-label={`Play ${c.title}`}>
              <img src={c.still} alt="" loading="lazy" />
              <span className={ui.mediaTag}>
                <Tag>
                  <Ms name="playCircle" size={13} />
                  Play
                </Tag>
              </span>
            </button>
          )}
          <span className={ui.body}>
            <span className={`${ui.title} ${x.clamp}`}>{c.title}</span>
            <span className={ui.sub}>{[c.channel, c.owners.length ? c.owners.join(', ') : null].filter(Boolean).join(' · ')}</span>
          </span>
        </div>
      ))}
    </Rail>
  );
}
