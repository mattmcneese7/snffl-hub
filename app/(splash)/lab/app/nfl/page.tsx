import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import type { NflGame } from '@/lib/gameday';
import { lastFantasyWeek } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getV4Data } from '../data';
import { LiveStart } from '../live/Live';
import { kickoffText, startersIn } from '../scores/format';
import NflRow from './NflRow';
import { weekView } from '../scores/weekData';
import WeekStrip from '../scores/WeekStrip';
import Shell, { SectionHead } from '../Shell';
import { Empty, List, Section } from '../ui';

export const metadata: Metadata = { title: { absolute: 'NFL Scores, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'America/Chicago' });

/**
 * NFL Scores: every game of the week, live first, then each day's kickoffs,
 * then the finals. Each row opens its game; the odds live there.
 */
export default async function V4Nfl({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const q = await searchParams;
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const data = await getV4Data(mine);
  const asked = Number(q.week);
  const week = Number.isInteger(asked) && asked >= 1 && asked <= 18 ? asked : data.week;
  const wv = await weekView(week, mine, data);
  const games = [...wv.ctx.nfl].sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const live = games.filter((g) => g.state === 'in');
  const final = games.filter((g) => g.state === 'post');
  const days = new Map<string, NflGame[]>();
  for (const g of games.filter((x) => x.state === 'pre')) {
    const d = DAY.format(new Date(g.kickoff));
    days.set(d, [...(days.get(d) ?? []), g]);
  }
  const starters = (g: NflGame) => startersIn(wv.games, [g.away.abbr, g.home.abbr], mine).count;
  const group = (list: NflGame[]) => (
    <List tap>
      {list.map((g) => (
        <NflRow key={g.id} g={g} week={week} starters={g.state === 'post' ? 0 : starters(g)} />
      ))}
    </List>
  );

  return (
    <Shell data={data} active="scores">
      <LiveStart live={live.length > 0} week={week} />
      <SectionHead icon="football" word="nfl" week={data.week} mine={data.myRoster} back={{ href: `/lab/app/scores/${week}`, label: 'Scores' }} />
      <WeekStrip week={week} last={lastFantasyWeek()} base="/lab/app/nfl" query />
      {!games.length ? <Empty>ESPN has not posted the week {week} games yet.</Empty> : null}
      {live.length ? <Section title="Live">{group(live)}</Section> : null}
      {[...days.entries()].map(([d, list]) => (
        <Section key={d} title={d} label={`${d}, ${kickoffText(list[0].kickoff).split(' ')[0]}`}>
          {group(list)}
        </Section>
      ))}
      {final.length ? <Section title="Final">{group(final)}</Section> : null}
    </Shell>
  );
}
