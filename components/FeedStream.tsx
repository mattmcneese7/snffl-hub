'use client';

import { useEffect, useMemo, useState } from 'react';
import { LinkedText, type NameEntry } from './ManagerLink';
import ReelPlayer from './ReelPlayer';
import {
  applyFilter,
  biggest,
  buildFeed,
  byDay,
  facetsOf,
  forManager,
  playable,
  EMPTY_FILTER,
  KIND_LABELS,
  type FeedFilter,
  type FeedItem,
  type FeedItemKind,
} from '@/lib/feed-view';
import FeedReel from './FeedReel';
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
 * Now: replays that actually play across the top, then the stream itself,
 * grouped into days along a spine, with filters built from what is in it. Each
 * filter counts what it would leave, and a filter that cannot change the
 * screen is never drawn. A flat list of two hundred rows is a data dump; a
 * weekend with Sunday at the top of it is a record of what happened.
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
  const [archive, setArchive] = useState(false);
  const [team, setTeam] = useState<string | null>(null);

  useEffect(() => {
    try {
      setTeam(localStorage.getItem('snffl.myTeam'));
    } catch {
      // Private browsing refuses storage; the league sections still work.
    }
  }, []);

  // Rendered once on the client, so every row agrees on what "now" is and the
  // server's HTML is never contradicted halfway down the list.
  const [now] = useState(() => Date.now());

  const items = useMemo(() => buildFeed(posts, highlights), [posts, highlights]);
  const nameOf = (id: string) => managers[id] ?? `Roster ${id}`;
  const facets = useMemo(() => facetsOf(items, nameOf), [items, managers]);
  const shown = useMemo(() => applyFilter(items, filter), [items, filter]);
  // Grouped by day, so the stream reads as a record of a weekend rather than
  // as a table that happens to be sorted.
  const days = useMemo(() => byDay(shown), [shown]);

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

  const mine = useMemo(() => forManager(items, team), [items, team]);
  const reel = useMemo(() => playable(items).slice(0, 12), [items]);
  const top = useMemo(() => biggest(items, 6), [items]);

  return (
    <div className="snffl-feed">
      {/* Yours, if the app knows whose team to watch. Everything here is about
          you: your players, the game you are in, the calls made on you. */}
      {mine.length ? (
        <section className="snffl-feed-piece">
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Your week</h2>
            <span className="snffl-block-heading-link">{mine.length} moments</span>
          </div>
          <div className="snffl-card">
            <ol className="snffl-feed-list snffl-feed-list-plain">
              {mine.slice(0, 5).map((item) => (
                <FeedRow key={`mine-${item.id}`} item={item} names={names} now={now} onPlay={() => {}} />
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* The reel. Full width, playing as it passes, rather than a strip of
          thumbnails parked above a wall of text. */}
      {reel.length ? (
        <section className="snffl-feed-piece">
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Replays</h2>
            <span className="snffl-block-heading-link">{reel.length} playable</span>
          </div>
          <FeedReel items={reel} />
        </section>
      ) : null}

      {/* The week by consequence rather than by clock. */}
      {top.length ? (
        <section className="snffl-feed-piece">
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">What mattered</h2>
            <span className="snffl-block-heading-link">Ranked</span>
          </div>
          <ol className="snffl-feed-ranked">
            {top.map((item, index) => (
              <li className="snffl-feed-ranked-row" key={`big-${item.id}`}>
                <span className="snffl-feed-rank">{index + 1}</span>
                <span className="snffl-feed-ranked-body">
                  <span className="snffl-feed-row-title">
                    <LinkedText text={item.title} names={names} />
                  </span>
                  {item.body ? (
                    <span className="snffl-body">
                      <LinkedText text={item.body} names={names} />
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* And the whole record, folded away. It is a reference, not a feed. */}
      <section className="snffl-feed-piece">
        <button
          type="button"
          className="snffl-btn snffl-btn-secondary snffl-feed-archive-toggle"
          aria-expanded={archive}
          onClick={() => setArchive((open) => !open)}
        >
          {archive ? 'Hide the full record' : `The full record, ${items.length} moments`}
        </button>

        {archive ? (
          <div className="snffl-feed-archive">
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
              <div className="snffl-feed-days">
                {days.map((day) => (
                  <section className="snffl-feed-day" key={day.key}>
                    <h3 className="snffl-feed-day-label">
                      {day.label}
                      <span>{day.items.length}</span>
                    </h3>
                    <ol className="snffl-feed-list">
                      {day.items.map((item) => (
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
                  </section>
                ))}
              </div>
            ) : (
              <div className="snffl-placeholder">
                <span className="snffl-placeholder-label">Nothing matches</span>
                <span className="snffl-placeholder-note">Clear a filter to see the rest.</span>
              </div>
            )}
          </div>
        ) : null}
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
