import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { BYLINE } from '@/config/style-guide';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { readIssue } from '@/lib/rag';
import { issueArt } from '../../art';
import { weekParam } from '../../../../../kit/weekParam';
import { getV4Data } from '../../../data';
import Shell, { SectionHead } from '../../../Shell';
import { artSrc } from '../../Issue';
import s from '../../../v4.module.css';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ week: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { week, slug } = await params;
  const a = readIssue(Number(week))?.articles.find((x) => x.slug === slug);
  return { title: { absolute: `${a ? a.headline.trim() : 'The Rag'}, Splash 4.0` }, robots: { index: false, follow: false } };
}

const DAY = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' });

/** A Rag story, set for reading: one card, a comfortable measure, the photo, the body. */
export default async function V4RagArticle({ params }: Params) {
  const { week: raw, slug } = await params;
  const week = weekParam(raw);
  const issue = readIssue(week);
  const a = issue?.articles.find((x) => x.slug === slug);
  if (!issue || !a) notFound();
  const jar = await cookies();
  const data = await getV4Data(parseTeam(jar.get(TEAM_COOKIE)?.value));
  const art = await issueArt(week, issue.articles).catch(() => ({}) as Record<string, never>);
  const src = artSrc(art[a.slug]);
  const more = issue.articles.filter((x) => x.slug !== slug && !x.retracted).slice(0, 3);
  return (
    <Shell data={data} active="rag">
      <SectionHead icon="rag" word="the rag" week={data.week} mine={data.myRoster} />
      <article className={`${s.card} ${s.read}`}>
        <Link href={`/lab/app/rag/${week}`} className={s.back}>
          Week {week} issue
        </Link>
        <small className={s.readCat}>{a.category}</small>
        <h1 className={s.readHead}>{a.headline.trim()}</h1>
        {a.deck ? <p className={s.readDeck}>{a.deck.trim()}</p> : null}
        <p className={s.readBy}>
          <b>{BYLINE}</b> &middot; {DAY.format(new Date(issue.publishedAt))} &middot; {a.readTime} min read
        </p>
        {src ? <img className={s.readArt} src={src} alt="" /> : null}
        {a.retracted ? <p className={s.readCat}>Retracted</p> : null}
        <div className={s.readBody}>
          {a.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </article>
      {more.length ? (
        <>
          <div className={s.title}>
            <h2>More From Week {week}</h2>
          </div>
          <div className={s.list}>
            {more.map((x) => (
              <Link key={x.slug} href={`/lab/app/rag/${week}/${x.slug}`} className={s.story}>
                {artSrc(art[x.slug]) ? <img src={artSrc(art[x.slug])!} alt="" /> : <span />}
                <span className={s.storyText}>
                  <small>{x.category}</small>
                  <b>{x.headline}</b>
                  <span>{x.readTime} min read</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </Shell>
  );
}
