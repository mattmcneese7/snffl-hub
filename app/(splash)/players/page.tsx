import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { firstNameOf } from '@/config/managers';
import { league, teamByRoster, teams } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getPlayerDirectory } from '@/lib/players';
import { getWeekProjections } from '@/lib/projections';
import { positionRank, snapSharePct, totalTouchdowns, totalYards } from '@/lib/stats';
import Shell from '../kit/Shell';
import PageHead from '../kit/PageHead';
import { nflTeamName } from '../kit/nflTeams';
import PlayersBrowser, { type PlayerRow } from './PlayersBrowser';

export const metadata: Metadata = { title: { absolute: 'Players, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Players: every player the league carries, searchable, sortable six ways and
 * filterable by position, NFL team and manager, fifty at a time. The same
 * directory and the same sort keys v2 reads, worked out here on the server
 * (lib/stats.ts reads a 292KB file the phone should never download), then
 * handed to the browser to arrange.
 */
export default async function PlayersPage() {
  // state.week is the week in progress; display_week lags it, and projecting
  // off that would label last week as the one coming up.
  const upcoming = league.state.week;

  const [{ players, ownershipComplete }, projections, jar] = await Promise.all([
    getPlayerDirectory(),
    getWeekProjections(league.season, upcoming),
    cookies(),
  ]);
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);

  const rows: PlayerRow[] = players.map((entry) => {
    const owner = entry.ownerRosterId ? teamByRoster(entry.ownerRosterId) : null;
    return {
      id: entry.player.id,
      name: entry.player.name,
      position: entry.player.position,
      nflTeam: entry.player.team ?? '',
      headshot: entry.player.headshot,
      injury: entry.player.injuryStatus ?? null,
      ownerRosterId: entry.ownerRosterId,
      ownerName: owner ? (firstNameOf(owner.rosterId) ?? owner.manager) : null,
      points: entry.totalPoints,
      projected: projections[entry.player.id] ?? null,
      posRank: positionRank(entry.player.id),
      yards: totalYards(entry.player.id),
      touchdowns: totalTouchdowns(entry.player.id),
      snapPct: Math.round(snapSharePct(entry.player.id)),
    };
  });

  const owners = teams
    .map((t) => ({ rosterId: t.rosterId, name: firstNameOf(t.rosterId) ?? t.manager }))
    .sort((a, b) => a.name.localeCompare(b.name));
  // Sorted by the full name the select shows, not the abbreviation.
  const nflTeams = [...new Set(rows.map((r) => r.nflTeam).filter(Boolean))].sort((a, b) => nflTeamName(a).localeCompare(nflTeamName(b)));

  return (
    <Shell active="more">
      <PageHead title="Players" />
      <PlayersBrowser rows={rows} owners={owners} nflTeams={nflTeams} upcomingWeek={upcoming} ownershipComplete={ownershipComplete} mine={mine} />
    </Shell>
  );
}
