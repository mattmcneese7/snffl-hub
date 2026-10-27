import Link from 'next/link';
import type { Issue } from '@/lib/rag';
import type { StoryArt } from '@/lib/story-images';
import s from '../v4.module.css';

const CT_DATE = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' });
export const artSrc = (a?: StoryArt) => (a ? (a.kind === 'photo' ? a.src : a.cutout) : null);

/** A Rag issue: the masthead, the lead with its photo, then every other story with its own. */
export default function IssueView({ issue, art, weeks }: { issue: Issue; art: Record<string, StoryArt>; weeks: number[] }) {
  const stories = issue.articles.filter((a) => !a.retracted);
  const [lead, ...rest] = stories;
  const leadSrc = artSrc(art[lead?.slug ?? '']);
  return (
    <>
      <nav className={s.chips} aria-label="Issues">
        {weeks
          .slice()
          .reverse()
          .map((w) => (
            <Link key={w} href={`/lab/app/rag/${w}`} className={`${s.chipA} ${w === issue.week ? s.chipOn : ''}`} aria-current={w === issue.week ? 'page' : undefined}>
              Week {w}
            </Link>
          ))}
      </nav>
      <article className={s.rag}>
        <div className={s.ragTop}>
          <b>The Rag</b>
          <span>
            Week {issue.week} &middot; {CT_DATE.format(new Date(issue.publishedAt))}
          </span>
        </div>
        {lead ? (
          <Link href={`/lab/app/rag/${issue.week}/${lead.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            {leadSrc ? (
              <span className={s.ragArt} style={{ display: 'block' }}>
                <img src={leadSrc} alt="" />
                <span className={s.ragTag}>{lead.category}</span>
              </span>
            ) : null}
            <span className={s.ragBody}>
              <h3>{lead.headline}</h3>
              <p>{lead.deck}</p>
              <span className={s.ragBy}>{lead.readTime} min read</span>
            </span>
          </Link>
        ) : null}
      </article>
      <div className={s.title}>
        <h2>All Stories</h2>
      </div>
      <div className={s.list}>
        {rest.map((a) => {
          const src = artSrc(art[a.slug]);
          return (
            <Link key={a.slug} href={`/lab/app/rag/${issue.week}/${a.slug}`} className={s.story}>
              {src ? <img src={src} alt="" /> : <span />}
              <span className={s.storyText}>
                <small>{a.category}</small>
                <b>{a.headline}</b>
                <span>{a.readTime} min read</span>
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
