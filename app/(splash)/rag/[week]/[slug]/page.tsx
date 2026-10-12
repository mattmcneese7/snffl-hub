import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CaretLeft } from '@phosphor-icons/react/dist/ssr';
import { BYLINE } from '@/config/style-guide';
import { readIssue } from '@/lib/rag';
import Shell from '../../../kit/Shell';
import Widget from '../../../home/Widget';
import Icon from '../../../home/Icons';
import w from '../../../home/widgets.module.css';
import r from '../../rag.module.css';
import { Art, LinkedNames, StoryRows, dayOf, issueArt, weekFrom } from '../../parts';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ week: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { week, slug } = await params;
  const article = readIssue(weekFrom(week))?.articles.find((a) => a.slug === slug);
  return {
    title: { absolute: `${article ? article.headline.trim() : 'The Rag'}, Splash` },
    robots: { index: false, follow: false },
  };
}

/**
 * A Rag story, built for reading. This is the one page where a long column
 * is right, so the whole story sits in one big white card at a comfortable
 * measure: the way back, the category, the headline as the desk wrote it,
 * the deck, the byline and dates, the picture, the stamp if it was
 * retracted, then the body with every manager's name a way to his page.
 * Four more stories from the issue follow, each with its picture.
 */
export default async function RagArticle({ params }: Params) {
  const { week: raw, slug } = await params;
  const week = weekFrom(raw);
  const issue = readIssue(week);
  const article = issue?.articles.find((a) => a.slug === slug);
  if (!issue || !article) notFound();

  const more = issue.articles.filter((a) => a.slug !== slug).slice(0, 4);
  // Art over the whole issue in its order, so this story wears the picture
  // it wore on the front.
  const art = await issueArt(week, issue.articles);
  const picture = art[article.slug];
  const caption =
    picture?.kind === 'photo' ? picture.caption : picture ? `${picture.name}, ${picture.points.toFixed(2)} pts` : undefined;

  return (
    <Shell active="rag">
      <div className={w.grid}>
        <Widget size="l" className={r.article}>
          <article className={r.column}>
            <Link href={`/rag/${week}`} className={r.back}>
              <CaretLeft weight="bold" className={r.backCaret} aria-hidden />
              Week {week} issue
            </Link>
            <span className={w.tag}>{article.category}</span>
            <h1 className={r.headline}>{article.headline.trim()}</h1>
            {article.deck ? <p className={r.standfirst}>{article.deck.trim()}</p> : null}

            <p className={r.byline}>
              <b>{BYLINE}</b>
              <span>
                Published {dayOf(issue.publishedAt)}
                {article.updatedAt ? `, updated ${dayOf(article.updatedAt)}` : ''}
              </span>
            </p>

            {picture ? (
              <figure className={r.figure}>
                <span className={r.figureArt}>
                  <Art art={picture} />
                </span>
                {caption ? <figcaption className={r.caption}>{caption}</figcaption> : null}
              </figure>
            ) : null}

            {article.retracted ? (
              <div className={r.stampRow}>
                <span className={r.stamp} role="note" aria-label="This story was retracted">
                  Retracted
                </span>
              </div>
            ) : null}

            <div className={r.body}>
              {article.body.map((paragraph, i) => (
                <p key={i}>
                  <LinkedNames text={paragraph} />
                </p>
              ))}
            </div>

            {article.fromTemplate ? (
              <p className={r.note}>
                <Icon name="newspaper" className={r.noteIcon} />
                <span>This one came straight from the box score rather than the desk.</span>
              </p>
            ) : null}
          </article>
        </Widget>

        {more.length ? (
          <Widget size="m" icon="newspaper" title="More from this week" href={`/rag/${week}`} more={`All ${issue.articles.length}`}>
            <StoryRows week={week} articles={more} art={art} />
          </Widget>
        ) : null}
      </div>
    </Shell>
  );
}
