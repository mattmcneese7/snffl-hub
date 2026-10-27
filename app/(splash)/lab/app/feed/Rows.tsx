import Link from 'next/link';
import { Fragment } from 'react';
import type { FeedItem } from '@/lib/feed-view';
import { FEED_MARK, feedMarkClass, timeAgo } from '../modules/shared';
import m from '../modules/modules.module.css';
import f from './feed.module.css';

/**
 * The Feed's rows, shared by the server sections and the client's history,
 * so a moment looks the same wherever it turns up. No hooks, no 'use client'.
 */
export type NameEntry = { name: string; rosterId: number };

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Prose with every manager and team name linked to the manager. Longest
 * names first, whole words and exact capitalization only, so "Jack" never
 * lights up inside "Jackson".
 */
export function LinkedText({ text, names }: { text: string; names: NameEntry[] }) {
  const usable = names.filter((e) => e.name && e.name.length > 2);
  if (!usable.length) return <>{text}</>;
  const sorted = [...usable].sort((a, b) => b.name.length - a.name.length);
  const byName = new Map(sorted.map((e) => [e.name, e.rosterId]));
  const pattern = new RegExp(`(?<![\\w'])(${sorted.map((e) => escape(e.name)).join('|')})(?![\\w])`, 'g');
  return (
    <>
      {text.split(pattern).map((part, i) =>
        byName.has(part) ? (
          <Link key={i} href={`/lab/app/managers/${byName.get(part)}`} className={f.name}>
            {part}
          </Link>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** A clip's labels: the play, started or benched, his points. */
export function ClipTags({ clip }: { clip: NonNullable<FeedItem['clip']> }) {
  const tags: { t: string; bad?: boolean }[] = [];
  if (clip.playType) tags.push({ t: clip.playType });
  if (clip.started != null) tags.push({ t: clip.started ? 'Started' : 'Benched', bad: !clip.started });
  if (clip.points != null) tags.push({ t: `${clip.points.toFixed(2)} PTS` });
  if (!tags.length) return null;
  return (
    <span className={f.tags}>
      {tags.map(({ t, bad }) => (
        <i key={t} className={`${m.mk} ${bad ? m.mkBad : m.mkQuiet}`}>
          {t}
        </i>
      ))}
    </span>
  );
}

/** One moment: its mark, the line with names linked, when, and a clip's tags and link out. */
export function MomentRow({ item, names, now, mine = false }: { item: FeedItem; names: NameEntry[]; now: number; mine?: boolean }) {
  return (
    <li className={`${m.post} ${mine ? m.mine : ''}`}>
      <i className={feedMarkClass(item.kind)}>{FEED_MARK[item.kind]}</i>
      <span className={m.postText}>
        <b>
          <LinkedText text={item.title} names={names} />
        </b>
        {item.body ? (
          <span>
            <LinkedText text={item.body} names={names} />
          </span>
        ) : null}
        {item.clip ? <ClipTags clip={item.clip} /> : null}
        <small>
          <time dateTime={item.at}>{timeAgo(item.at, now)}</time>
        </small>
        {item.clip ? (
          <a className={f.out} href={`https://www.youtube.com/watch?v=${item.id}`} target="_blank" rel="noopener noreferrer">
            Watch on YouTube
          </a>
        ) : null}
      </span>
    </li>
  );
}
