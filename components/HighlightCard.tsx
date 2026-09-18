'use client';

import type { Highlight } from '@/lib/highlights';
import SleeperActionButton from './SleeperAction';

/**
 * One clip, Brief Section 2: real YouTube clips with tags for play type,
 * started or benched, and fantasy points. Free agent clips carry a waiver
 * button into Sleeper.
 *
 * The card is a still and a play button. Pressing it opens the full screen
 * reel on this clip (ReelPlayer, through HighlightList), where the video gets
 * the whole screen. Playing inside the card was tried first and failed: at
 * 116px the embed is under YouTube's 200px minimum and draws a bare link.
 *
 * The still is derived from the video id rather than stored, so the highlights
 * table needed no thumbnail column.
 */
const thumbnail = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export default function HighlightCard({
  highlight,
  managerName,
  onPlay,
}: {
  highlight: Highlight;
  managerName?: string | null;
  onPlay: () => void;
}) {
  const free = !highlight.ownerTeamId;
  // Team defenses are keyed by their code, KC or SF, never a numeric id.
  const unit = highlight.playerIds[0] ? !/^\d+$/.test(highlight.playerIds[0]) : false;

  return (
    <article className="snffl-clip">
      <button
        type="button"
        className="snffl-clip-art snffl-clip-art-button"
        onClick={onPlay}
        aria-label={`Play: ${highlight.title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumbnail(highlight.id)} alt="" loading="lazy" />
        <span className="snffl-clip-play" aria-hidden>
          ▶
        </span>
      </button>

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

        {free ? (
          <SleeperActionButton
            action="players"
            // A defensive clip is credited to the team defense, so what is on
            // the wire is the D/ST, not the player who made the play.
            label={unit ? 'Add this D/ST' : 'Grab Him on Waivers'}
            compact
          />
        ) : null}
      </div>
    </article>
  );
}
