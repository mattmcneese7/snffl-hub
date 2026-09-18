'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import HighlightList from './HighlightList';
import { LinkedText, type NameEntry } from './ManagerLink';
import type { FeedPost } from '@/lib/feed';
import type { Highlight } from '@/lib/highlights';

/**
 * The Feed, with jump buttons that follow scroll, per Brief Section 2.
 *
 * Posts arrive already read on the server. This owns the filtering and the
 * active button, which is the only part that needs to be interactive.
 */
const TABS = [
  { kind: 'live', label: 'Live Alerts' },
  { kind: 'cmon-man', label: "C'mon Man" },
  { kind: 'shart-watch', label: 'Shart Watch' },
  { kind: 'highlight', label: 'Highlights' },
] as const;

type TabKind = (typeof TABS)[number]['kind'];

const EMPTY: Record<TabKind, string> = {
  live: 'Touchdowns and lead changes land here while games are running.',
  'cmon-man': 'The worst decisions of the week, once the watcher starts calling them out.',
  'shart-watch': 'Whoever is tracking toward the lowest score gets named here during games.',
  highlight: 'Real clips arrive with Checkpoint 8.',
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type ClipGroup = 'owned' | 'waiver' | 'free';
const GROUP_LABELS: Record<ClipGroup, string> = {
  owned: 'Owned',
  waiver: 'Waiver Adds',
  free: 'Free Agents',
};
const GROUP_EMPTY: Record<ClipGroup, string> = {
  owned: 'Clips of players on a roster in this league land here.',
  waiver: 'Clips of players picked up in the last week land here.',
  free: 'Big plays by QBs, RBs, WRs, TEs and kickers nobody has claimed land here.',
};

export default function FeedStream({
  posts,
  highlights = [],
  managers = {},
  names = [],
  waiverIds = [],
}: {
  posts: FeedPost[];
  /** Clips live in their own table, so they arrive separately from posts. */
  highlights?: Highlight[];
  /** Manager and team names to link in post copy. */
  names?: NameEntry[];
  /** Players picked up in the last week, for the Waiver Adds tab. */
  waiverIds?: string[];
  /** Roster id as text to manager name, matching the highlights column type. */
  managers?: Record<string, string>;
}) {
  const [active, setActive] = useState<TabKind>('live');
  const [ownership, setOwnership] = useState<ClipGroup>('owned');
  const headings = useRef<Record<string, HTMLElement | null>>({});

  const clips = useMemo(() => {
    const added = new Set(waiverIds);
    return {
      owned: highlights.filter((clip) => clip.ownerTeamId),
      // Players picked up in the last week: the clip the league wants to see
      // is the one that explains why somebody burned a claim on him.
      waiver: highlights.filter((clip) => clip.playerIds.some((id) => added.has(id))),
      free: highlights.filter((clip) => !clip.ownerTeamId),
    };
  }, [highlights, waiverIds]);

  const grouped = useMemo(() => {
    const out = {} as Record<TabKind, FeedPost[]>;
    for (const tab of TABS) out[tab.kind] = [];
    for (const post of posts) {
      if (out[post.kind as TabKind]) out[post.kind as TabKind].push(post);
    }
    return out;
  }, [posts]);

  // The active button follows the page rather than only responding to clicks.
  useEffect(() => {
    const sections = TABS.map((tab) => headings.current[tab.kind]).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const kind = visible?.target.getAttribute('data-kind') as TabKind | null;
        if (kind) setActive(kind);
      },
      // Below the sticky chrome, so a section counts as current once its
      // heading clears the header rather than when it touches the viewport.
      { rootMargin: '-140px 0px -60% 0px', threshold: 0 }
    );

    for (const section of sections) observer.observe(section);

    // At the bottom of the page no heading can be inside that band: the last
    // one has already risen above the top inset. Measured at the scroll floor,
    // nothing intersects and the button keeps whatever it last showed, which is
    // right here only because Highlights happens to be last. Anchoring the
    // final stretch to the last heading above the band makes it right on
    // purpose rather than by luck.
    const onScroll = () => {
      const atFloor =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (!atFloor) return;
      const passed = sections.filter((section) => section.getBoundingClientRect().top < 140);
      const last = passed[passed.length - 1];
      const kind = last?.getAttribute('data-kind') as TabKind | null;
      if (kind) setActive(kind);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [grouped]);

  const jumpTo = (kind: TabKind) => {
    setActive(kind);
    headings.current[kind]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      <div className="snffl-feed-jump">
        {TABS.map((tab) => (
          <button
            key={tab.kind}
            type="button"
            className={`snffl-feed-jump-button${active === tab.kind ? ' snffl-feed-jump-active' : ''}`}
            aria-current={active === tab.kind ? 'true' : undefined}
            onClick={() => jumpTo(tab.kind)}
          >
            {tab.label}
            {(tab.kind === 'highlight' ? highlights.length : grouped[tab.kind].length) ? (
              <span className="snffl-feed-jump-count">
                {tab.kind === 'highlight' ? highlights.length : grouped[tab.kind].length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {TABS.map((tab) => (
        <section className="snffl-feed-section" key={tab.kind}>
          <h2
            className="snffl-headline snffl-feed-heading"
            data-kind={tab.kind}
            ref={(node) => {
              headings.current[tab.kind] = node;
            }}
          >
            {tab.label}
          </h2>

          {tab.kind === 'highlight' ? (
            <>
              {/* Owned and Free Agents, per Brief Section 2, plus the week's
                  waiver adds. */}
              <div className="snffl-clip-tabs">
                {(['owned', 'waiver', 'free'] as const).map((which) => (
                  <button
                    key={which}
                    type="button"
                    className={`snffl-clip-tab${ownership === which ? ' snffl-clip-tab-active' : ''}`}
                    aria-pressed={ownership === which}
                    onClick={() => setOwnership(which)}
                  >
                    {GROUP_LABELS[which]}
                    {clips[which].length ? ` ${clips[which].length}` : ''}
                  </button>
                ))}
              </div>

              {clips[ownership].length ? (
                <HighlightList
                  clips={clips[ownership]}
                  managers={managers}
                  title={`${GROUP_LABELS[ownership]} Highlights`}
                />
              ) : (
                <div className="snffl-placeholder">
                  <span className="snffl-placeholder-label">Nothing yet</span>
                  <span className="snffl-placeholder-note">
                    {GROUP_EMPTY[ownership]}
                  </span>
                </div>
              )}
            </>
          ) : grouped[tab.kind].length ? (
            <div className="snffl-card">
              {grouped[tab.kind].map((post) => (
                <article className="snffl-feed-post" key={post.id}>
                  <div className="snffl-feed-post-head">
                    <span className="snffl-feed-post-title">
                      <LinkedText text={post.title} names={names} />
                    </span>
                    <time className="snffl-feed-post-time" dateTime={post.createdAt}>
                      {timeAgo(post.createdAt)}
                    </time>
                  </div>
                  {post.body ? (
                    <p className="snffl-feed-post-body">
                      <LinkedText text={post.body} names={names} />
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="snffl-placeholder">
              <span className="snffl-placeholder-label">Nothing yet</span>
              <span className="snffl-placeholder-note">{EMPTY[tab.kind]}</span>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
