import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { photosForWeek } from '@/lib/game-photos';
import { getHighlights } from '@/lib/highlights';
import { teams } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { publishedWeeks, readIssue } from '@/lib/rag';
import { artForArticles, featuredPlayers } from '@/lib/story-images';
import { Fragment, type ReactNode } from 'react';
import { firstNameOf } from '@/config/managers';
import { latestChug } from '@/lib/chug-video';
import { teamByRoster } from '@/lib/league';
import { trophyBoard } from './cached';
import { getV4Data } from './data';
import { momentOf, orderOf, type ModuleKey } from './schedule';
import ChugPop from './ChugPop';
import Moments, { type MomentKind } from './Moments';
import Hardware from './modules/Hardware';
import ChugRow from './modules/ChugRow';
import StoryPill from './modules/StoryPill';
import { latestWeekStory } from '@/lib/week-story';
import Shell, { HomeHead } from './Shell';
import { Empty, RagCard, Section } from './ui';
import MatchupRows from './modules/MatchupRows';

export const metadata: Metadata = { title: { absolute: 'Home, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const CT_DATE = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' });


/**
 * Home, the front page: only what Matt approved, each module in its moment
 * (see schedule.ts). The awards and the chug after a final, the Rag
 * midweek, every matchup on game days. Your own game lives in the score bar,
 * so it is not repeated here.
 */
export default async function V4Home({ searchParams }: { searchParams: Promise<{ at?: string; moment?: string }> }) {
  const sp = await searchParams;
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const [data, board] = await Promise.all([getV4Data(mine), trophyBoard().catch(() => null)]);
  const moment = momentOf(data.state, data.games.some((g) => g.inPlay), sp.at);
  const shart = board?.latest.find((a) => a.kind === 'shart');
  const chug = latestChug(data.week);
  const won = data.state === 'final' && data.mine?.a.mark === 'W';
  const sharted = mine != null && shart?.rosterId === mine;
  const forced = sp.moment === 'win' || sp.moment === 'flush' ? (sp.moment as MomentKind) : null;

  const weeks = publishedWeeks();
  const ragWeek = weeks.length ? weeks[weeks.length - 1] : null;
  const issue = ragWeek ? readIssue(ragWeek) : null;
  const articles = (issue?.articles ?? []).filter((a) => !a.retracted);
  const [clips, featured] = ragWeek ? await Promise.all([getHighlights(ragWeek, 200).catch(() => []), featuredPlayers(ragWeek).catch(() => [])]) : [[], []];
  const art = artForArticles(
    articles.slice(0, 8),
    clips,
    Object.fromEntries(teams.map((t) => [String(t.rosterId), t.manager])),
    featured,
    ragWeek ? photosForWeek(ragWeek) : [],
  );
  const lead = articles[0];
  const leadArt = lead ? art[lead.slug] : undefined;
  const leadSrc = leadArt ? (leadArt.kind === 'photo' ? leadArt.src : leadArt.cutout) : null;

  const live = moment === 'live';
  const order = orderOf(moment);
  const slides = order.includes('story') ? await latestWeekStory(data.week).catch(() => []) : [];
  const storyIntro = slides.find((x) => x.kind === 'intro');
  const storyWeek = storyIntro && storyIntro.kind === 'intro' ? storyIntro.week : data.week;
  const ragProps =
    issue && lead
      ? {
          issueHref: `/lab/app/rag/${issue.week}`,
          meta: `Week ${issue.week} · ${CT_DATE.format(new Date(issue.publishedAt))}`,
          lead: { href: `/lab/app/rag/${issue.week}/${lead.slug}`, category: lead.category, headline: lead.headline },
          art: leadSrc,
          deck: lead.deck,
          readTime: lead.readTime,
          more: articles.slice(1, 3).map((x) => ({ href: `/lab/app/rag/${issue.week}/${x.slug}`, category: x.category, headline: x.headline })),
        }
      : null;
  const modules: Record<ModuleKey, ReactNode> = {
    awards: board ? <Hardware board={board} mine={mine} /> : null,
    chug: <ChugRow board={board} week={data.week} moment={moment} />,
    rag: ragProps ? <RagCard {...ragProps} /> : null,
    ragCompact: ragProps ? <RagCard {...ragProps} compact /> : null,
    matchups: (
      <Section title={live ? 'Live Matchups' : 'All Matchups'} action={{ href: '/lab/app/feed', label: 'The Feed' }}>
        {data.others.length ? <MatchupRows games={data.others} week={data.week} live={data.state === 'live'} /> : <Empty>No matchups for week {data.week} yet.</Empty>}
      </Section>
    ),
    story: slides.length ? <StoryPill slides={slides} week={storyWeek} /> : null,
  };

  return (
    <Shell data={data} active="home">
      <HomeHead week={data.week} mine={data.myRoster} />
      {order.map((k) => (
        <Fragment key={k}>{modules[k]}</Fragment>
      ))}
      <Moments week={data.week} won={won} sharted={sharted} name={mine != null ? (firstNameOf(mine) ?? null) : null} force={forced} />
      {chug ? <ChugPop week={chug.week} src={chug.src} who={(() => {
        const a = board?.all.find((x) => x.kind === 'shart' && x.week === chug.week);
        return a ? (teamByRoster(a.rosterId)?.teamName ?? null) : null;
      })()} /> : null}
    </Shell>
  );
}
