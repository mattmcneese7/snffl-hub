import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LiveStart } from '../live/Live';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { bookFrom, mainBook, slateLines } from '../../../lib/odds-books';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import { Slate } from '../scores/parts';
import { weekView } from '../scores/weekData';
import WeekStrip from '../scores/WeekStrip';
import { lastFantasyWeek } from '@/lib/league';
import s from '../v4.module.css';
import x from '../scores/scores.module.css';

export const metadata: Metadata = { title: { absolute: 'NFL, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * The NFL week from this league's side: every game, live first, then each
 * day's kickoffs, then the finals, with the line, the win chance and who here
 * is starting in it. Each opens its own game page.
 */
export default async function V4Nfl({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const q = await searchParams;
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const data = await getV4Data(mine);
  const asked = Number(q.week);
  const week = Number.isInteger(asked) && asked >= 1 && asked <= 18 ? asked : data.week;
  const wv = await weekView(week, mine, data);
  const lines = await slateLines(wv.ctx.nfl, wv.ctx.lines, bookFrom(jar)).catch(() => wv.ctx.lines);
  const lineBook = mainBook(Object.values(lines));
  return (
    <Shell data={data} active="scores">
      <LiveStart live={wv.ctx.nfl.some((g) => g.state === 'in')} week={week} />
      <SectionHead icon="football" word="nfl" week={data.week} mine={data.myRoster} back={{ href: `/lab/app/scores/${week}`, label: `Week ${week} Scores` }} />
      <WeekStrip week={week} last={lastFantasyWeek()} base="/lab/app/nfl" query />
      <div className={s.title}>
        <h2>NFL Week {week}</h2>
      </div>
      <Slate games={wv.ctx.nfl} lines={lines} leagueGames={wv.games} mine={mine} lineBook={lineBook} week={week} />
      <span className={x.via}>Sources: ESPN{lineBook ? `, ${lineBook}` : ''}, Sleeper</span>
    </Shell>
  );
}
