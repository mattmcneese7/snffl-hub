import type { Metadata } from 'next';
import { Suspense } from 'react';
import { firstNameOf } from '@/config/managers';
import { getPowerRankings, getStandings, getTopPerformers, getWeekGames, scoredWeek, teamByRoster } from '@/lib/league';
import LabShell from '../kit/LabShell';
import PullToRefresh from '../kit/PullToRefresh';
import { SkeletonCard } from '../kit/Skeleton';
import { WidgetHead } from '../../home/Widget';
import w from '../../home/widgets.module.css';
import Demos, { type DemoData } from './Demos';
import m from './modules.module.css';

export const metadata: Metadata = { title: { absolute: 'Modules, Splash 4.0 lab' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** Streams in after the page: power rankings take a few fetches to build. */
async function PowerStream() {
  const ranks = await getPowerRankings();
  return (
    <section className={`${w.widget} ${w.l}`}>
      <WidgetHead icon="ranking" title="Power rankings, streamed" />
      <ol className={m.power}>
        {ranks.slice(0, 6).map((r) => (
          <li key={r.team.rosterId}>
            <span className={m.rank}>{r.rank}</span>
            <span className={m.powerWho}>
              <b>{firstNameOf(r.team.rosterId) ?? r.team.manager}</b>
              <span>{r.team.teamName}</span>
            </span>
            <span className={m.move}>
              {r.team.wins}-{r.team.losses}
              {r.team.ties ? `-${r.team.ties}` : ''}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function Modules() {
  const week = await scoredWeek();
  const last = Math.max(1, week - 1);
  const [standings, gamesLast, gamesNow, top] = await Promise.all([getStandings(), getWeekGames(last), getWeekGames(week), getTopPerformers(last, 8)]);
  const leader = standings[0];
  const gameOf = (games: typeof gamesNow) => games.find((g) => g.home.rosterId === leader.rosterId || g.away.rosterId === leader.rosterId);
  const sideOf = (games: typeof gamesNow) => {
    const g = gameOf(games);
    if (!g) return null;
    const [me, them] = g.home.rosterId === leader.rosterId ? [g.home, g.away] : [g.away, g.home];
    return { me: me.points, them: them.points, opp: firstNameOf(them.rosterId) ?? them.manager };
  };
  const mow = [...gamesLast.flatMap((g) => [g.home, g.away])].sort((a, b) => b.points - a.points)[0];
  const ownerOf = (id: string) => {
    for (const g of gamesLast) for (const s of [g.home, g.away]) if (s.lineup.some((p) => p.id === id)) return firstNameOf(s.rosterId) ?? s.manager;
    return null;
  };

  const data: DemoData = {
    week,
    last,
    leader: { rosterId: leader.rosterId, name: firstNameOf(leader.rosterId) ?? leader.manager, team: leader.teamName, avatar: leader.avatarUrl ?? null },
    rolls: { last: sideOf(gamesLast), now: sideOf(gamesNow) },
    top: top.map((p) => ({ id: p.id, name: p.name, position: p.position, team: p.team ?? null, headshot: p.headshot || null, points: p.points, slot: p.slot, owner: ownerOf(p.id) })),
    standings: standings.map((s) => ({ rosterId: s.rosterId, seed: s.seed, name: firstNameOf(s.rosterId) ?? s.manager, team: s.teamName, avatar: s.avatarUrl ?? null, record: `${s.wins}-${s.losses}${s.ties ? `-${s.ties}` : ''}`, pf: s.pointsFor, streak: s.streak })),
    mow: mow ? { name: firstNameOf(mow.rosterId) ?? mow.manager, team: teamByRoster(mow.rosterId)?.teamName ?? mow.team, points: mow.points, avatar: teamByRoster(mow.rosterId)?.avatarUrl ?? null } : null,
  };

  return (
    <LabShell>
      <PullToRefresh>
        <header className={m.head}>
          <h1 className={m.title}>Modules</h1>
          <p className={m.lede}>Every v4 piece, live on league data. Pull down at the top of the page to refresh it.</p>
        </header>
        <Demos data={data}>
          <Suspense fallback={<SkeletonCard rows={6} />}>
            <PowerStream />
          </Suspense>
        </Demos>
      </PullToRefresh>
    </LabShell>
  );
}
