'use client';

import { useEffect, useRef, useState } from 'react';
import ClipVideo from './ClipVideo';
import type { FeedItem } from '@/lib/feed-view';

/**
 * The reel: clips at full width, playing as they come on screen.
 *
 * The replays used to be a strip of thumbnails above the stream, which meant
 * the one genuinely good thing the app owns sat quarantined at the top while
 * the part people actually scroll was text by construction. They are the
 * scroll now.
 *
 * Only the card nearest the middle of the screen mounts a player. Everything
 * else shows its still, so a reel of fifty clips costs one video, not fifty.
 */
export default function FeedReel({ items }: { items: FeedItem[] }) {
  const [active, setActive] = useState(0);
  const cards = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // The most visible card wins, rather than the first to cross a line,
        // so a slow scroll does not flick playback between neighbours.
        const best = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const index = Number((best?.target as HTMLElement | undefined)?.dataset.index);
        if (Number.isFinite(index)) setActive(index);
      },
      { threshold: [0.25, 0.5, 0.75] }
    );
    for (const card of cards.current) if (card) observer.observe(card);
    return () => observer.disconnect();
  }, [items.length]);

  if (!items.length) return null;

  return (
    <div className="snffl-reel-feed">
      {items.map((item, index) => (
        <article
          className="snffl-reel-card"
          key={item.id}
          data-index={index}
          ref={(node) => {
            cards.current[index] = node;
          }}
        >
          <div className="snffl-reel-card-stage">
            {index === active && item.id.startsWith('espn:') ? (
              <ClipVideo espnId={item.id.slice(5)} poster={item.clip?.still ?? null} title={item.title} />
            ) : item.clip?.still ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.clip.still} alt="" loading="lazy" />
            ) : null}
          </div>
          <div className="snffl-reel-card-body">
            <h3 className="snffl-reel-card-title">{item.title}</h3>
            <div className="snffl-reel-card-tags">
              {item.clip?.playType ? <span className="snffl-feed-tag">{item.clip.playType}</span> : null}
              {item.clip?.points != null ? (
                <span className="snffl-feed-tag">{item.clip.points.toFixed(2)} pts</span>
              ) : null}
              {item.clip?.started != null ? (
                <span className="snffl-feed-tag">{item.clip.started ? 'Started' : 'Benched'}</span>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
