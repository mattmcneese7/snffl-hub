'use client';

import { useState } from 'react';
import { LEAGUE_ID } from '@/lib/sleeper';
import type { Highlight } from '@/lib/highlights';

/**
 * One clip, Brief Section 2: real YouTube clips with tags for play type,
 * started or benched, and fantasy points. Free agent clips carry a waiver
 * button.
 *
 * Plays inline, but the player is only built on click. The Feed can carry
 * dozens of clips at once, and mounting that many iframes up front would load
 * a YouTube player for every one of them before anybody pressed play. The
 * still stands in until then, which is the same facade YouTube recommends.
 *
 * The still is derived from the video id rather than stored, so the highlights
 * table needed no thumbnail column. A frame that fails to load leaves the card
 * on its background, which is the fallback the brief asks of every image.
 */
const thumbnail = (id: string) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;

/** nocookie host, so a card nobody plays sets no tracking cookie. */
const embed = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;

export default function HighlightCard({
  highlight,
  managerName,
}: {
  highlight: Highlight;
  managerName?: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  const free = !highlight.ownerTeamId;

  return (
    <article className="snffl-clip">
      {playing ? (
        <span className="snffl-clip-art">
          <iframe
            className="snffl-clip-frame"
            src={embed(highlight.id)}
            title={highlight.title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </span>
      ) : (
        <button
          type="button"
          className="snffl-clip-art snffl-clip-art-button"
          onClick={() => setPlaying(true)}
          aria-label={`Play: ${highlight.title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnail(highlight.id)} alt="" loading="lazy" />
          <span className="snffl-clip-play" aria-hidden>
            ▶
          </span>
        </button>
      )}

      <div className="snffl-clip-body">
        <span className="snffl-clip-title">{highlight.title}</span>

        <div className="snffl-clip-tags">
          {highlight.playType ? (
            <span className="snffl-clip-tag">{highlight.playType}</span>
          ) : null}
          {highlight.started != null ? (
            <span className={`snffl-clip-tag${highlight.started ? ' snffl-clip-tag-started' : ''}`}>
              {highlight.started ? 'Started' : 'Benched'}
            </span>
          ) : null}
          {highlight.fantasyPoints != null ? (
            <span className="snffl-clip-tag snffl-numeric">
              {highlight.fantasyPoints.toFixed(2)}
            </span>
          ) : null}
          {managerName ? <span className="snffl-clip-tag">{managerName}</span> : null}
        </div>

        {/* A plain anchor, not next/link: Link is for routes inside this app,
            and handing it an external URL makes it prefetch and route against
            something it does not own. */}
        {free ? (
          <a
            className="snffl-clip-waiver"
            href={`https://sleeper.com/leagues/${LEAGUE_ID}`}
            target="_blank"
            rel="noreferrer"
          >
            Grab Him on Waivers
          </a>
        ) : null}
      </div>
    </article>
  );
}
