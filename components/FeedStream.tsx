'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FeedPost } from '@/lib/feed';

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

export default function FeedStream({ posts }: { posts: FeedPost[] }) {
  const [active, setActive] = useState<TabKind>('live');
  const headings = useRef<Record<string, HTMLElement | null>>({});

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
            {grouped[tab.kind].length ? (
              <span className="snffl-feed-jump-count">{grouped[tab.kind].length}</span>
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

          {grouped[tab.kind].length ? (
            <div className="snffl-card">
              {grouped[tab.kind].map((post) => (
                <article className="snffl-feed-post" key={post.id}>
                  <div className="snffl-feed-post-head">
                    <span className="snffl-feed-post-title">{post.title}</span>
                    <time className="snffl-feed-post-time" dateTime={post.createdAt}>
                      {timeAgo(post.createdAt)}
                    </time>
                  </div>
                  {post.body ? <p className="snffl-feed-post-body">{post.body}</p> : null}
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
