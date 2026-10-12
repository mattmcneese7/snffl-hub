import { Fragment } from 'react';
import Link from 'next/link';
import { teams } from '@/lib/league';
import { photosForWeek } from '@/lib/game-photos';
import { getHighlights } from '@/lib/highlights';
import { managerNames } from '@/lib/manager-names';
import type { Article } from '@/lib/rag';
import { artForArticles, featuredPlayers, type StoryArt } from '@/lib/story-images';
import r from './rag.module.css';

/**
 * The pieces the issue front and the article share: the art, the dates, the
 * art lookup and the name linker, so a story wears the same picture on the
 * front, in its own page and in another story's More From This Week.
 */

/** A week from the URL, held to 1 to 17 the way v2 holds it. */
export const weekFrom = (raw: string) => Math.min(17, Math.max(1, Math.floor(Number(raw)) || 1));

const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Chicago' });
/** A real timestamp, read on the league's clock. */
export const dayOf = (iso: string) => DAY.format(new Date(iso));

/**
 * The publish day from lib/rag's schedule. publishDateFor hands back the
 * Tuesday at midnight UTC, which is Monday evening in Chicago, so it is read
 * in UTC to land on the Tuesday it means.
 */
const SCHEDULE = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
export const scheduleDay = (date: Date) => SCHEDULE.format(date);

/**
 * Art for every story in an issue, worked out over the whole issue in its
 * order, so each story gets the same picture wherever it shows.
 */
export async function issueArt(week: number, articles: Article[]): Promise<Record<string, StoryArt>> {
  if (!articles.length) return {};
  const [clips, featured] = await Promise.all([
    getHighlights(week, 200).catch(() => []),
    featuredPlayers(week).catch(() => []),
  ]);
  return artForArticles(
    articles,
    clips,
    Object.fromEntries(teams.map((t) => [String(t.rosterId), t.manager])),
    featured,
    photosForWeek(week),
  );
}

/** A story's picture: the photo, or the player cut out on powder over his team's faint logo. */
export function Art({ art }: { art?: StoryArt }) {
  if (!art) return <span className={r.artEmpty} aria-hidden />;
  if (art.kind === 'photo') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={art.src} alt={art.caption ?? ''} className={r.artPhoto} loading="lazy" />;
  }
  return (
    <span className={r.artPlayer}>
      {art.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art.logo} alt="" className={r.artLogo} loading="lazy" />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art.cutout} alt={art.name} className={r.artCutout} loading="lazy" />
    </span>
  );
}

/** The marker a retracted story carries on the front and in lists. */
export function RetractedTag() {
  return <span className={r.retracted}>Retracted</span>;
}

/** Story rows with their thumbnails: Top Stories, and More From This Week. */
export function StoryRows({ week, articles, art }: { week: number; articles: Article[]; art: Record<string, StoryArt> }) {
  return (
    <ul className={r.rows}>
      {articles.map((a) => (
        <li key={a.slug}>
          <Link href={`/rag/${week}/${a.slug}`} className={r.row}>
            <span className={r.thumb} aria-hidden>
              <Art art={art[a.slug]} />
            </span>
            <span className={r.rowText}>
              <span className={r.rowCat}>
                {a.category}
                {a.retracted ? <RetractedTag /> : null}
              </span>
              <span className={r.rowHead}>{a.headline.trim()}</span>
              <span className={r.meta}>
                <span>{a.readTime} min read</span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Prose with every manager and team name made a link to that manager's v3
 * page. The same matching as v2's LinkedText (longest names first, whole
 * words, exact capitals, so "Jack" never matches inside "Jackson"), but v2's
 * links go to v2's manager pages, so this one is Splash's own.
 */
export function LinkedNames({ text }: { text: string }) {
  const usable = managerNames().filter((entry) => entry.name && entry.name.length > 2);
  if (!usable.length) return <>{text}</>;
  const sorted = [...usable].sort((a, b) => b.name.length - a.name.length);
  const byName = new Map(sorted.map((entry) => [entry.name, entry.rosterId]));
  const pattern = new RegExp(`(?<![\\w'])(${sorted.map((e) => escape(e.name)).join('|')})(?![\\w])`, 'g');
  return (
    <>
      {text.split(pattern).map((part, i) =>
        byName.has(part) ? (
          <Link key={i} href={`/managers/${byName.get(part)}`} className={r.name}>
            {part}
          </Link>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
