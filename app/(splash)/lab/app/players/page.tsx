import type { Metadata } from 'next';
import { weekProjections } from '../cached';
import { cookies } from 'next/headers';
import { league, teamByRoster, teams } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getPlayerDirectory } from '@/lib/players';
import { positionRank, snapSharePct, totalTouchdowns, totalYards } from '@/lib/stats';
import { nflTeamName } from '../../../kit/nflTeams';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import Browser, { type Row } from './Browser';

export const metadata: Metadata = { title: { absolute: 'Players, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Players: everyone the league carries, searchable, sortable six ways and
 * filterable by position, NFL team and team in this league. The sort keys
 * are worked out here on the server, so the phone only arranges them.
 */
export default async function V4Players() {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const upcoming = Math.max(1, league.state.week);
  const [data, { players, ownershipComplete }, projections] = await Promise.all([
    getV4Data(mine),
    getPlayerDirectory(),
    weekProjections(league.season, upcoming).catch(() => ({}) as Record<string, number>),
  ]);
  const rows: Row[] = players.map((e) => {
    const owner = e.ownerRosterId ? teamByRoster(e.ownerRosterId) : null;
    return {
      id: e.player.id,
      name: e.player.name,
      short: e.player.position === 'DEF' ? e.player.name : e.player.short || e.player.name,
      position: e.player.position,
      team: e.player.team ?? '',
      headshot: e.player.headshot,
      injury: e.player.injuryStatus ?? null,
      owner: e.ownerRosterId,
      ownerTeam: owner ? owner.teamName.trim() : null,
      points: e.totalPoints,
      projected: projections[e.player.id] ?? null,
      posRank: positionRank(e.player.id),
      yards: totalYards(e.player.id),
      touchdowns: totalTouchdowns(e.player.id),
      snapPct: Math.round(snapSharePct(e.player.id)),
    };
  });
  const owners = teams.map((t) => ({ rosterId: t.rosterId, team: t.teamName.trim() })).sort((a, b) => a.team.localeCompare(b.team));
  const nflTeams = [...new Set(rows.map((r) => r.team).filter(Boolean))]
    .sort((a, b) => nflTeamName(a).localeCompare(nflTeamName(b)))
    .map((abbr) => ({ abbr, name: nflTeamName(abbr) }));
  return (
    <Shell data={data} active="league">
      <SectionHead icon="groups" word="players" week={data.week} mine={data.myRoster} back={{ href: '/lab/app/league', label: 'League' }} />
      <Browser rows={rows} owners={owners} nflTeams={nflTeams} week={upcoming} complete={ownershipComplete} mine={mine} />
    </Shell>
  );
}
