// Who a highlight belongs to, shared by the ESPN and YouTube pulls.
//
// In order of trust:
//   1. A defensive or special teams play belongs to the D/ST that made it,
//      not the cornerback, who nobody in this league rosters.
//   2. ESPN athlete ids on the clip, mapped to Sleeper ids through the ESPN
//      ids nflverse gives the nightly player file. No name guessing at all.
//   3. Names from the title: full name, then surname on the play's team, then
//      a surname only one fantasy player carries.
// The first rostered player found decides the owner, so a clip naming a scorer
// and a defender goes to whichever one is in this league.

import fs from 'node:fs';
import { nflTeamForName } from './espn-athletes.ts';
import type { Classified } from './highlight-tags.ts';
import { normaliseName } from './live.ts';
import { getMatchups, getRosters } from './sleeper.ts';
import { teams } from './league.ts';

type PlayerRow = { name?: string; position?: string; team?: string; espnId?: string };

/** ESPN and older codes mapped to the Sleeper code a team defense uses. */
const DEF_CODE: Record<string, string> = { WSH: 'WAS', JAC: 'JAX', LA: 'LAR', LVR: 'LV' };

export type Attribution = {
  owner_team_id: string | null;
  player_ids: string[] | null;
  started: boolean | null;
  fantasy_points: number | null;
  side: string | null;
};

/**
 * Fills in the team on a defensive or special teams play the tagger could not
 * place, by asking ESPN which club the named player is on.
 *
 * Without a team there is no defense to credit, so the clip reads as an
 * individual cornerback nobody rosters, which is exactly what it should not do.
 * Offensive plays are left alone: they are attributed by player, not by unit.
 */
export async function fillTeams(plays: Classified[], log: (line: string) => void = () => {}): Promise<number> {
  const needy = plays.filter(
    (play) => !play.team && (play.side === 'defense' || play.side === 'special_teams') && play.players.length
  );
  let filled = 0;
  for (const play of needy) {
    for (const name of play.players) {
      const code = await nflTeamForName(name);
      if (!code) continue;
      play.team = code;
      filled++;
      log(`  ${name} plays for ${code}, so that ${play.side.replace('_', ' ')} clip has a defense`);
      break;
    }
  }
  return filled;
}

export async function buildAttributor(weeks: number[], log: (line: string) => void = () => {}) {
  const players = JSON.parse(fs.readFileSync('data/players.json', 'utf8')) as Record<string, PlayerRow>;

  const byName = new Map<string, string>();
  const bySurnameTeam = new Map<string, string[]>();
  const bySurname = new Map<string, string[]>();
  const byEspn = new Map<string, string>();
  const surnameOf = (name: string) => normaliseName(name).split(' ').slice(-1)[0] ?? '';
  for (const [id, player] of Object.entries(players)) {
    if (player?.espnId) byEspn.set(String(player.espnId), id);
    if (!player?.name || !player.position || player.position === 'DEF') continue;
    byName.set(normaliseName(player.name), id);
    const last = surnameOf(player.name);
    const key = `${last}|${player.team ?? ''}`;
    bySurnameTeam.set(key, [...(bySurnameTeam.get(key) ?? []), id]);
    bySurname.set(last, [...(bySurname.get(last) ?? []), id]);
  }

  const matchName = (name: string, team: string): string | null => {
    const full = byName.get(normaliseName(name));
    if (full) return full;
    const last = surnameOf(name);
    if (!last) return null;
    const onTeam = team ? bySurnameTeam.get(`${last}|${DEF_CODE[team] ?? team}`) : undefined;
    if (onTeam?.length === 1) return onTeam[0];
    const anywhere = bySurname.get(last);
    return anywhere?.length === 1 ? anywhere[0] : null;
  };

  const defenseId = (team: string): string | null => {
    const code = DEF_CODE[team] ?? team;
    return code && players[code] ? code : null;
  };

  const ownerOf = new Map<string, number>();
  try {
    for (const roster of await getRosters()) {
      for (const playerId of roster.players ?? []) ownerOf.set(playerId, roster.roster_id);
    }
    log(`  ownership from live rosters, ${ownerOf.size} players`);
  } catch {
    for (const team of teams) for (const playerId of team.starters) ownerOf.set(playerId, team.rosterId);
    log(`  Sleeper rosters unavailable, using nightly starters, ${ownerOf.size} players`);
  }

  const key = (w: number, id: string) => `${w}:${id}`;
  const pointsOf = new Map<string, number>();
  const started = new Set<string>();
  for (const w of new Set(weeks)) {
    try {
      for (const matchup of await getMatchups(w)) {
        for (const [playerId, points] of Object.entries(matchup.players_points ?? {})) {
          pointsOf.set(key(w, playerId), Number(points));
        }
        for (const playerId of matchup.starters ?? []) started.add(key(w, playerId));
      }
    } catch {
      log(`  Week ${w} matchups unavailable, clips store without points`);
    }
  }

  return function attribute(play: Classified, week: number, espnAthleteIds: string[] = []): Attribution {
    const unit = play.side === 'defense' || play.side === 'special_teams' ? defenseId(play.team) : null;
    const fromEspn = espnAthleteIds.map((id) => byEspn.get(id)).filter((id): id is string => Boolean(id));
    const fromNames = play.players.map((name) => matchName(name, play.team)).filter((id): id is string => Boolean(id));
    const matched = [...new Set([...fromEspn, ...fromNames])];

    const ownedId = unit ?? matched.find((id) => ownerOf.has(id));
    const subject = ownedId ?? matched[0];
    const rosterId = ownedId ? ownerOf.get(ownedId) : undefined;

    return {
      owner_team_id: rosterId != null ? String(rosterId) : null,
      player_ids: unit ? [unit] : matched.length ? matched : null,
      started: subject ? started.has(key(week, subject)) : null,
      fantasy_points: subject && pointsOf.has(key(week, subject)) ? pointsOf.get(key(week, subject))! : null,
      side: play.side || null,
    };
  };
}
