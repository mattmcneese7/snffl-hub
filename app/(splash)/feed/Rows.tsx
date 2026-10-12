import Link from 'next/link';
import { Fragment } from 'react';
import type { FeedItem, FeedItemKind } from '@/lib/feed-view';
import w from '../home/widgets.module.css';
import f from './feed.module.css';

/**
 * The Feed's rows, shared by the server rendered widgets (Your week, What
 * mattered) and the client's full record, so a moment looks the same
 * wherever it turns up. No hooks and no 'use client', so either side can
 * import it.
 */

export type NameEntry = { name: string; rosterId: number };

/** The same short marks the Home's feed digest uses. */
export const MARK: Record<FeedItemKind, string> = { touchdown: 'TD', lead: 'LEAD', cmon: 'CMON', shart: 'SHART', clip: 'CLIP' };

/** Callouts and the Shart are the bad news, so they wear lime. */
export const markClass = (kind: FeedItemKind) => `${w.mark} ${kind === 'shart' || kind === 'cmon' ? w.markHot : ''}`;

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Prose with every manager and team name turned into a link to his v3
 * manager page. The same rules as v2's LinkedText: longest names first, whole
 * words and exact capitalisation only, so "Jack" never lights up inside
 * "Jackson".
 */
export function LinkedText({ text, names }: { text: string; names: NameEntry[] }) {
  const usable = names.filter((entry) => entry.name && entry.name.length > 2);
  if (!usable.length) return <>{text}</>;
  const sorted = [...usable].sort((a, b) => b.name.length - a.name.length);
  const byName = new Map(sorted.map((entry) => [entry.name, entry.rosterId]));
  const pattern = new RegExp(`(?<![\\w'])(${sorted.map((e) => escape(e.name)).join('|')})(?![\\w])`, 'g');
  return (
    <>
      {text.split(pattern).map((part, index) =>
        byName.has(part) ? (
          <Link key={index} href={`/managers/${byName.get(part)}`} className={f.name}>
            {part}
          </Link>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        )
      )}
    </>
  );
}

/** How long ago, against one "now" the server hands down so every row agrees. */
export function timeAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** The labels a clip carries: what it was, whether it was started, its points. */
export function ClipTags({ clip }: { clip: NonNullable<FeedItem['clip']> }) {
  const tags: string[] = [];
  if (clip.playType) tags.push(clip.playType);
  if (clip.started != null) tags.push(clip.started ? 'Started' : 'Benched');
  if (clip.points != null) tags.push(`${clip.points.toFixed(2)} pts`);
  if (!tags.length) return null;
  return (
    <span className={f.tags}>
      {tags.map((tag) => (
        <span key={tag} className={`${w.chip} ${tag === 'Benched' ? w.chipHot : ''}`}>
          {tag}
        </span>
      ))}
    </span>
  );
}

/**
 * One moment: its mark, the line with names linked, when, and for a clip
 * its tags and the way out to YouTube. The NFL blocks its clips on other
 * sites, so the link says where it goes rather than pretending to play.
 */
export function MomentRow({ item, names, now, mine = false }: { item: FeedItem; names: NameEntry[]; now: number; mine?: boolean }) {
  return (
    <li className={`${w.post} ${mine ? w.mineRow : ''}`}>
      <span className={markClass(item.kind)}>{MARK[item.kind]}</span>
      <span className={f.rowMain}>
        <span className={f.rowHead}>
          <span className={w.postTitle}>
            <LinkedText text={item.title} names={names} />
          </span>
          <time className={f.when} dateTime={item.at}>
            {timeAgo(item.at, now)}
          </time>
        </span>
        {item.body ? (
          <span className={w.postBody}>
            <LinkedText text={item.body} names={names} />
          </span>
        ) : null}
        {item.clip ? <ClipTags clip={item.clip} /> : null}
        {item.clip ? (
          <a className={f.out} href={`https://www.youtube.com/watch?v=${item.id}`} target="_blank" rel="noopener noreferrer">
            Watch on YouTube
          </a>
        ) : null}
      </span>
    </li>
  );
}
