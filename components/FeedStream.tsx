'use client';

import { useMemo, useState } from 'react';
import { LinkedText, type NameEntry } from './ManagerLink';
import ReelPlayer from './ReelPlayer';
import {
  applyFilter,
  buildFeed,
  facetsOf,
  EMPTY_FILTER,
  KIND_LABELS,
  type FeedFilter,
  type FeedItem,
  type FeedItemKind,
} from '@/lib/feed-view';
import type { FeedPost } from '@/lib/feed';
import type { Highlight } from '@/lib/highlights';
import { toReelClip } from '@/lib/reel-clips';

/**
 * The Feed as a section of its own.
 *
 * It was four stacked lists behind a jump bar, with highlights split again
 * into Owned, Waiver Adds and Free Agents. In a fourteen team league that
 * second split is dead on arrival: 188 players are rostered, so Owned held
 * every clip and the other two tabs were empty, which reads as broken rather
 * than as empty.
 *
 * Now: replays that actually play across the top, then one stream of
 * everything newest first, with filters built from what is in the stream. Each
 * filter counts what it would leave, and a filter that cannot change the
 * screen is never drawn.
 */

const KIND_MARK: Record<FeedItemKind, string> = {
  touchdown: 'TD',
  lead: 'LEAD',
  cmon: 'CMON',
  shart: 'SHART',
  clip: 'CLIP',
};

function timeAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Chips({
  facets,
  active,
  onPick,
  label,
}: {
  facets: { value: string; label: string; count: number }[];
  active: string | null;
  onPick: (value: string | null) => void;
  label: string;
}) {
  // One option is not a choice, so the row is not drawn at all.
  if (facets.length < 2) return null;
  return (
    <div className="snffl-feed-filter-row">
      <span className="snffl-feed-filter-label">{label}</span>
      <div className="snffl-feed-chips">
        <button
          type="button"
          className={`snffl-feed-chip${active === null ? ' snffl-feed-chip-on' : ''}`}
          aria-pressed={active === null}
          onClick={() => onPick(null)}
        >
          All
        </button>
        {facets.map((facet) => (
          <button
            key={facet.value}
            type="button"
            className={`snffl-feed-chip${active === facet.value ? ' snffl-feed-chip-on' : ''}`}
            aria-pressed={active === facet.value}
            onClick={() => onPick(active === facet.value ? null : facet.value)}
          >
            {facet.label}
            <span className="snffl-feed-chip-count">{facet.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FeedStream({
  posts,
  highlights = [],
  managers = {},
  names = [],
}: {
  posts: FeedPost[];
  highlights?: Highlight[];
  names?: NameEntry[];
  /** Roster id as text to manager name, matching the highlights column type. */
  managers?: Record<string, string>;
}) {
  const [filter, setFilter] = useState<FeedFilter>(EMPTY_FILTER);
  const [playing, setPlaying] = useState<number | null>(null);

  // Rendered once on the client, so every row agrees on what "now" is and the
  // server's HTML is never contradicted halfway down the list.
  const [now] = useState(() => Date.now());

  const items = useMemo(() => buildFeed(posts, highlights), [posts, highlights]);
  const nameOf = (id: string) => managers[id] ?? `Roster ${id}`;
  const facets = useMemo(() => facetsOf(items, nameOf), [items, managers]);
  const shown = useMemo(() => applyFilter(items, filter), [items, filter]);

  // The replay rail: only clips that play in the site, best first. A link out
  // is still in the stream below, marked as one, but it is never offered here
  // as something that will play.
  const reels = useMemo(
    () =>
      highlights
        .filter((clip) => clip.id.startsWith('espn:') && clip.thumbnail)
        .sort((a, b) => (b.fantasyPoints ?? 0) - (a.fantasyPoints ?? 0))
        .map((clip) => toReelClip(clip, clip.ownerTeamId ? nameOf(clip.ownerTeamId) : 'Free agent')),
    [highlights, managers]
  );

  const filtering = Boolean(filter.kind || filter.manager || filter.week);

  return (
    <div className="snffl-feed">
      {reels.length ? (
        <section className="snffl-feed-replays">
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Replays</h2>
            <span className="snffl-block-heading-link">{reels.length} playable</span>
          </div>
          <div className="snffl-feed-reel-rail">
            {reels.map((clip, index) => (
              <button
                type="button"
                className="snffl-feed-reel"
                key={clip.id}
                onClick={() => setPlaying(index)}
                aria-label={`Play: ${clip.title}`}
              >
                <span className="snffl-feed-reel-art">
                  {clip.still ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={clip.still} alt="" loading="lazy" />
                  ) : null}
                  <span className="snffl-feed-reel-play" aria-hidden>
                    ▶
                  </span>
                </span>
                <span className="snffl-feed-reel-title">{clip.title}</span>
                {clip.tags.length ? (
                  <span className="snffl-feed-reel-tags">{clip.tags.slice(0, 2).join(' · ')}</span>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="snffl-feed-stream">
        <div className="snffl-block-heading">
          <h2 className="snffl-headline">Everything</h2>
          <span className="snffl-block-heading-link">
            {shown.length === items.length ? `${items.length} moments` : `${shown.length} of ${items.length}`}
          </span>
        </div>

        <div className="snffl-feed-filters">
          <Chips
            label="What"
            facets={facets.kinds}
            active={filter.kind}
            onPick={(kind) => setFilter((f) => ({ ...f, kind }))}
          />
          <Chips
            label="Who"
            facets={facets.managers}
            active={filter.manager}
            onPick={(manager) => setFilter((f) => ({ ...f, manager }))}
          />
          <Chips
            label="When"
            facets={facets.weeks}
            active={filter.week}
            onPick={(week) => setFilter((f) => ({ ...f, week }))}
          />
        </div>

        {shown.length ? (
          <ol className="snffl-feed-list">
            {shown.map((item) => (
              <FeedRow
                key={`${item.kind}-${item.id}`}
                item={item}
                names={names}
                now={now}
                onPlay={() => {
                  const index = reels.findIndex((clip) => clip.id === item.id);
                  if (index >= 0) setPlaying(index);
                }}
              />
            ))}
          </ol>
        ) : (
          <div className="snffl-placeholder">
            <span className="snffl-placeholder-label">Nothing matches</span>
            <span className="snffl-placeholder-note">
              {filtering
                ? 'Clear a filter to see the rest of the week.'
                : 'Touchdowns, lead changes and replays land here while games are running.'}
            </span>
          </div>
        )}
      </section>

      {playing != null ? (
        <ReelPlayer
          clips={reels}
          start={playing}
          title="Replays"
          onClose={() => setPlaying(null)}
        />
      ) : null}
    </div>
  );
}

function FeedRow({
  item,
  names,
  now,
  onPlay,
}: {
  item: FeedItem;
  names: NameEntry[];
  now: number;
  onPlay: () => void;
}) {
  const clip = item.clip;
  const linkOut = clip && !clip.playable;

  return (
    <li className={`snffl-feed-row snffl-feed-row-${item.kind}`}>
      <span className={`snffl-feed-mark snffl-feed-mark-${item.kind}`} aria-hidden>
        {KIND_MARK[item.kind]}
      </span>
      <span className="snffl-feed-row-main">
        <span className="snffl-feed-row-head">
          <span className="snffl-feed-row-title">
            <LinkedText text={item.title} names={names} />
          </span>
          <time className="snffl-feed-row-time" dateTime={item.at}>
            {timeAgo(item.at, now)}
          </time>
        </span>
        {item.body ? (
          <span className="snffl-feed-row-body">
            <LinkedText text={item.body} names={names} />
          </span>
        ) : null}
        {clip ? (
          <span className="snffl-feed-row-tags">
            {clip.playType ? <span className="snffl-feed-tag">{clip.playType}</span> : null}
            {clip.started != null ? (
              <span className="snffl-feed-tag">{clip.started ? 'Started' : 'Benched'}</span>
            ) : null}
            {clip.points != null ? (
              <span className="snffl-feed-tag">{clip.points.toFixed(2)} pts</span>
            ) : null}
            <span className="snffl-feed-tag">{KIND_LABELS.clip}</span>
          </span>
        ) : null}
        {clip ? (
          clip.playable ? (
            <button type="button" className="snffl-feed-row-play" onClick={onPlay}>
              Watch replay
            </button>
          ) : (
            // The NFL blocks these on outside sites, so it says where it goes
            // rather than pretending to be a player that then does nothing.
            <a
              className="snffl-feed-row-play snffl-feed-row-out"
              href={`https://www.youtube.com/watch?v=${item.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch on YouTube
            </a>
          )
        ) : null}
      </span>
    </li>
  );
}
