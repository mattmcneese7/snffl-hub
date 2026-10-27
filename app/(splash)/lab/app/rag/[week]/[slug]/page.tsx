import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { BYLINE } from '@/config/style-guide';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { readIssue } from '@/lib/rag';
import { issueArt } from '../../art';
import { weekParam } from '../../../../../kit/weekParam';
import { getV4Data } from '../../../data';
import Shell, { SectionHead } from '../../../Shell';
import { artSrc, StoryList } from '../../Issue';
import { Label, Media, Section, Tag, ui } from '../../../ui';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ week: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { week, slug } = await params;
  const a = readIssue(Number(week))?.articles.find((x) => x.slug === slug);
  return { title: { absolute: `${a ? a.headline.trim() : 'The Rag'}, Splash 4.0` }, robots: { index: false, follow: false } };
}

const DAY = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' });

/** A Rag story, set for reading flat on the page: category, headline, deck, byline, the photo, the body. */
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
      <SectionHead icon="rag" word="the rag" title="The Rag" week={data.week} mine={data.myRoster} back={{ href: `/lab/app/rag/${week}`, label: `Week ${week}` }} />
      <article className={ui.card}>
          <Label tone="brand">{a.category}</Label>
          <h2 className={ui.display}>{a.headline.trim()}</h2>
          {a.deck ? <p className={ui.bodyText}>{a.deck.trim()}</p> : null}
          <Label>
            {BYLINE} &middot; {DAY.format(new Date(issue.publishedAt))} &middot; {a.readTime} min read
          </Label>
          {a.retracted ? <Tag tone="bad">Retracted</Tag> : null}
          {src ? <Media src={src} /> : null}
          {a.body.map((para, i) => (
            <p key={i} className={ui.bodyText}>
              {para}
            </p>
          ))}
      </article>
      {more.length ? (
        <Section title={`More From Week ${week}`}>
          <StoryList week={week} stories={more} art={art} />
        </Section>
      ) : null}
    </Shell>
  );
}
