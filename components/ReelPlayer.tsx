'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Full screen highlight reels.
 *
 * The first player lived inside a 116px thumbnail, below the 200 by 200 pixel
 * minimum YouTube's embed will draw at, so it rendered a bare fallback link
 * and never played. Clips now open over the whole screen: one clip per page,
 * swipe or scroll up for the next, like every reels feed people already know.
 *
 * Only the clip on screen mounts a player. Its neighbours show their
 * still, so a reel of forty clips costs one player, not forty. playsinline
 * keeps iPhone from throwing the video into its own full screen player, which
 * would break the swipe. Back closes the reel, because on a phone that is what
 * a thumb reaches for.
 */

import type { ReelClip } from '@/lib/reel-clips';
export type { ReelClip };


export default function ReelPlayer({
  clips,
  start,
  onClose,
  title,
  variant = 'reel',
  avatar,
}: {
  clips: ReelClip[];
  start: number;
  onClose: () => void;
  /** What the reel is: "Trip's clips", "Week 2 Highlights". */
  title?: string;
  /**
   * story: the manager stories on Home. Vertical, the clip centred over a
   * blurred copy of its own frame that fills the screen, with progress
   * segments across the top and taps on either side to step through.
   */
  variant?: 'reel' | 'story';
  /** The manager's avatar, shown beside the title in a story. */
  avatar?: string | null;
}) {
  const [active, setActive] = useState(start);
  const scroller = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLElement | null)[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Open on the clip that was tapped, without animating through the others.
  useEffect(() => {
    if (!mounted) return;
    slides.current[start]?.scrollIntoView({ block: 'start' });
  }, [mounted, start]);

  // The page behind stays put while the reel is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Back closes the reel rather than leaving the page.
  useEffect(() => {
    history.pushState({ snfflReel: true }, '');
    const onPop = () => onClose();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [onClose]);

  const close = useCallback(() => {
    if (history.state?.snfflReel) history.back();
    else onClose();
  }, [onClose]);

  // Whichever slide is mostly on screen is the one that plays.
  useEffect(() => {
    if (!mounted) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const index = Number((entry.target as HTMLElement).dataset.index);
            if (Number.isFinite(index)) setActive(index);
          }
        }
      },
      { root: scroller.current, threshold: [0.6] }
    );
    for (const slide of slides.current) if (slide) observer.observe(slide);
    return () => observer.disconnect();
  }, [mounted, clips.length]);

  const go = useCallback(
    (to: number) => {
      const index = Math.max(0, Math.min(clips.length - 1, to));
      slides.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [clips.length]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') go(active + 1);
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') go(active - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, close, go]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`snffl-reel${variant === 'story' ? ' snffl-reel-story' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Highlights'}
    >
      {variant === 'story' ? (
        <div className="snffl-story-progress" aria-hidden>
          {clips.map((clip, index) => (
            <i key={clip.id} className={index < active ? 'done' : index === active ? 'now' : ''} />
          ))}
        </div>
      ) : null}
      <header className="snffl-reel-top">
        <span className="snffl-reel-title">
          {variant === 'story' && avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="snffl-story-avatar" src={avatar} alt="" />
          ) : null}
          {title ? <strong>{title}</strong> : null}
          <span className="snffl-reel-count">
            {active + 1} / {clips.length}
          </span>
        </span>
        <button type="button" className="snffl-reel-close" onClick={close} aria-label="Close highlights">
          &times;
        </button>
      </header>

      <div className="snffl-reel-scroller" ref={scroller}>
        {clips.map((clip, index) => (
          <section
            className="snffl-reel-slide"
            key={clip.id}
            data-index={index}
            ref={(node) => {
              slides.current[index] = node;
            }}
          >
            {variant === 'story' && clip.still ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="snffl-story-backdrop" src={clip.still} alt="" aria-hidden />
            ) : null}
            {variant === 'story' ? (
              <>
                <button
                  type="button"
                  className="snffl-story-tap snffl-story-tap-back"
                  aria-label="Previous clip"
                  onClick={() => go(index - 1)}
                />
                <button
                  type="button"
                  className="snffl-story-tap snffl-story-tap-next"
                  aria-label="Next clip"
                  onClick={() => (index === clips.length - 1 ? close() : go(index + 1))}
                />
              </>
            ) : null}
            <div className={`snffl-reel-frame${clip.card ? ' snffl-reel-frame-card' : ''}`}>
              {clip.card ? (
                <div className="snffl-story-card">
                  <p className="snffl-story-card-head">{clip.card.headline}</p>
                  <p className="snffl-story-card-score">{clip.card.score}</p>
                  {clip.card.player ? (
                    <div className="snffl-story-card-player">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={clip.card.player.headshot} alt="" loading="lazy" />
                      <span>
                        <strong>{clip.card.player.name}</strong>
                        <em>
                          {clip.card.player.slot}, {clip.card.player.points}
                        </em>
                      </span>
                    </div>
                  ) : null}
                  <dl className="snffl-story-card-lines">
                    {clip.card.lines.map((line) => (
                      <div key={line.label}>
                        <dt>{line.label}</dt>
                        <dd>{line.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : index === active && clip.embed ? (
                <iframe
                  src={clip.embed}
                  title={clip.title}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                />
              ) : clip.still ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={clip.still} alt="" loading="lazy" />
              ) : null}
              {/* The NFL blocks its YouTube clips on outside sites, so those
                  open in YouTube, which on a phone is the YouTube app. */}
              {!clip.embed && !clip.card ? (
                <a
                  className="snffl-reel-external"
                  href={clip.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="snffl-reel-external-play" aria-hidden>
                    ▶
                  </span>
                  Watch on YouTube
                </a>
              ) : null}
            </div>

            <div className="snffl-reel-info">
              <h3 className="snffl-reel-clip-title">{clip.title}</h3>
              {clip.tags.length ? (
                <div className="snffl-reel-tags">
                  {clip.tags.map((tag) => (
                    <span className="snffl-reel-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {/* A recap card has no video, so it credits the scoring rather
                  than claiming a source it does not have. */}
              {clip.card ? (
                <a className="snffl-reel-source" href={clip.sourceUrl}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/sources/sleeper.png" alt="" />
                  Scoring via Sleeper
                </a>
              ) : (
                <a className="snffl-reel-source" href={clip.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={clip.source === 'espn' ? '/sources/espn.png' : '/sources/youtube.svg'} alt="" />
                  {clip.source === 'espn' ? 'Video via ESPN' : 'Video via NFL on YouTube'}
                </a>
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="snffl-reel-nav" aria-hidden={clips.length < 2}>
        <button type="button" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous clip">
          &#8593;
        </button>
        <button
          type="button"
          onClick={() => go(active + 1)}
          disabled={active === clips.length - 1}
          aria-label="Next clip"
        >
          &#8595;
        </button>
      </div>
    </div>,
    document.body
  );
}
