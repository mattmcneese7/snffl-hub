import type { Metadata } from 'next';
import PageHead from '@/components/PageHead';
import Chrome from '@/components/Chrome';
import PlayersBrowser, { type PlayerRow } from '@/components/PlayersBrowser';
import { league, teamByRoster, teams } from '@/lib/league';
import { getPlayerDirectory } from '@/lib/players';
import { getWeekProjections } from '@/lib/projections';
import { positionRank, snapSharePct, totalTouchdowns, totalYards } from '@/lib/stats';

export const metadata: Metadata = { title: 'Players' };

export default async function PlayersPage() {
  // state.week is the week in progress. display_week lags it, so projecting
  // off display_week would label last week as the one coming up.
  const upcoming = league.state.week;

  const [{ players, ownershipComplete }, projections] = await Promise.all([
    getPlayerDirectory(),
    getWeekProjections(league.season, upcoming),
  ]);

  // Sort keys are read here rather than in the browser component: lib/stats.ts
  // static imports a 292KB file, and importing it client side would send all of
  // it to the phone.
  const rows: PlayerRow[] = players.map((entry) => {
    const owner = entry.ownerRosterId ? teamByRoster(entry.ownerRosterId) : null;
    return {
      id: entry.player.id,
      name: entry.player.name,
      position: entry.player.position,
      nflTeam: entry.player.team ?? '',
      headshot: entry.player.headshot,
      ownerRosterId: entry.ownerRosterId,
      ownerManager: owner?.manager ?? null,
      points: entry.totalPoints,
      projected: projections[entry.player.id] ?? null,
      posRank: positionRank(entry.player.id),
      yards: totalYards(entry.player.id),
      touchdowns: totalTouchdowns(entry.player.id),
      snapPct: Math.round(snapSharePct(entry.player.id)),
    };
  });

  const owners = teams
    .map((team) => ({ rosterId: team.rosterId, manager: team.manager }))
    .sort((a, b) => a.manager.localeCompare(b.manager));

  const nflTeams = [...new Set(rows.map((row) => row.nflTeam).filter(Boolean))].sort();

  return (
    <>
      <Chrome section="Players" />
      <main className="snffl-page">
        <PageHead title="Players" />
        <section>
          <PlayersBrowser
            rows={rows}
            owners={owners}
            nflTeams={nflTeams}
            upcomingWeek={upcoming}
            ownershipComplete={ownershipComplete}
          />
        </section>
      </main>
    </>
  );
}
