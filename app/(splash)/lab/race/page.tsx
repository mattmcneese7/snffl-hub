import type { Metadata } from 'next';
import { firstNameOf } from '@/config/managers';
import { getStandings, getWeekGames, league, scoredWeek } from '@/lib/league';
import { getMatchupContext, markInPlay } from '@/lib/matchup-live';
import { getPlayoffOdds, type OddsRow } from '@/lib/playoff-odds';
import LabShell from '../kit/LabShell';
import PageHead from '../../kit/PageHead';
import w from '../../home/widgets.module.css';
import Race from './Race';
import type { RaceGame, RaceTeam } from './raceModel';

export const metadata: Metadata = { title: { absolute: 'Playoff Race, Splash 4.0 lab' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Playoff Race: the season as it stands (records from Sleeper, the app's
 * Monte Carlo odds as the baseline) and every regular season game still to
 * be decided, read from Sleeper's schedule, for the reader to call.
 */
export default async function RacePage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const sp = await searchParams;
  const week = await scoredWeek();
  const lastRegular = league.playoffWeekStart - 1;
  const weeks: number[] = [];
  for (let wk = week; wk <= lastRegular; wk++) weeks.push(wk);

  const [standings, odds, ctx, schedule] = await Promise.all([
    getStandings(),
    getPlayoffOdds().catch(() => [] as OddsRow[]),
    getMatchupContext(week).catch(() => null),
    Promise.all(weeks.map((wk) => getWeekGames(wk).catch(() => []))),
  ]);

  const teams: RaceTeam[] = standings.map((t) => {
    const played = t.wins + t.losses + t.ties;
    const o = odds.find((x) => x.rosterId === t.rosterId);
    return {
      rosterId: t.rosterId,
      first: firstNameOf(t.rosterId) ?? t.manager,
      teamName: t.teamName.trim(),
      avatar: t.avatarUrl,
      wins: t.wins,
      losses: t.losses,
      ties: t.ties,
      pointsFor: t.pointsFor,
      ppg: played ? Number((t.pointsFor / played).toFixed(2)) : 0,
      odds: o ? { makePlayoffs: o.makePlayoffs, bye: o.bye, tag: o.tag } : null,
    };
  });

  const games: RaceGame[] = [];
  schedule.forEach((list, i) => {
    const wk = weeks[i];
    const marked = wk === week && ctx ? markInPlay(list, ctx.nfl) : list;
    for (const g of marked) {
      // Final games are already in the records above.
      if (g.status === 'final') continue;
      games.push({
        key: `${wk}-${g.matchupId}`,
        week: wk,
        matchupId: g.matchupId,
        home: g.home.rosterId,
        away: g.away.rosterId,
        homePts: g.home.points,
        awayPts: g.away.points,
        status: g.status,
        inPlay: Boolean(g.inPlay),
      });
    }
  });

  return (
    <LabShell active="standings">
      <PageHead title="Playoff Race" sub={`Call every game left and watch the table move. ${league.playoffTeams} teams make it; ties at the line go to points for.`} />
      <div className={w.grid}>
        <Race
          teams={teams}
          games={games}
          line={league.playoffTeams}
          perWeek={Math.floor(standings.length / 2)}
          season={league.season}
          shared={sp.p ?? null}
        />
      </div>
    </LabShell>
  );
}
