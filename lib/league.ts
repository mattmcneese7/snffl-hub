// Assembles games, standings and rankings from the nightly data plus live
// Sleeper calls. Static data is imported rather than read with fs so Next
// bundles it: an fs read works locally and then 404s on Vercel.

import leagueData from '../data/league.json' with { type: 'json' };
import playersData from '../data/players.json' with { type: 'json' };
import teamsData from '../data/teams.json' with { type: 'json' };
import { getMatchups, getRosters, getState, TEAM_LOGO } from './sleeper.ts';
import type { Game, GameSide, LeagueInfo, LineupSlot, PlayerLite, Standing, Team } from './types.ts';

export const league = leagueData as unknown as LeagueInfo & {
  state: { week: number; display_week: number; season: string };
};
export const teams = teamsData as unknown as Team[];
const players = playersData as unknown as Record<string, PlayerLite>;

/** Slot labels in roster order, bench removed. */
export const STARTER_SLOTS = league.rosterPositions.filter((p) => p !== 'BN' && p !== 'IR');

export const teamByRoster = (rosterId: number) =>
  teams.find((t) => t.rosterId === rosterId);

/** Unknown ids still render: the brief requires a graceful fallback, not a gap. */
export function playerOf(id: string): PlayerLite {
  const known = players[id];
  if (known) return known;
  const looksLikeTeam = !/^\d+$/.test(id);
  return {
    id,
    name: looksLikeTeam ? id : 'Unknown Player',
    short: looksLikeTeam ? id : 'Unknown',
    position: looksLikeTeam ? 'DEF' : '',
    headshot: looksLikeTeam ? TEAM_LOGO(id) : `https://sleepercdn.com/content/nfl/players/${id}.jpg`,
  };
}

/**
 * Every player in the nightly database.
 *
 * Reads the real keys rather than routing through playerOf, which fabricates an
 * "Unknown Player" record for any id it does not recognize. That fallback is
 * right for a lineup slot, where a gap would be worse, and wrong for a
 * browsable list, where it would put an invented row in front of a reader.
 */
export const allPlayers = (): PlayerLite[] => Object.values(players);

/**
 * The last week fantasy points count, championship included.
 *
 * Sleeper's bracket has one round per week here (playoff_round_type 0), and a
 * field of seven needs three rounds with the top seed on a bye, so a week 15
 * start ends in week 17. Derived from the settings rather than written down,
 * so a change to the playoff field moves it.
 */
export const lastFantasyWeek = () =>
  league.playoffWeekStart + Math.ceil(Math.log2(Math.max(2, league.playoffTeams))) - 1;

export const currentWeek = () =>Math.max(1, league.state.display_week || league.state.week);

/** The most recent week that actually has scores behind it. */
export async function scoredWeek(): Promise<number> {
  try {
    const state = await getState();
    return Math.max(1, state.display_week || state.week);
  } catch {
    return currentWeek();
  }
}

function buildSide(
  rosterId: number,
  points: number,
  starters: string[],
  pointsByPlayer: Record<string, number>,
  allPlayers: string[]
): GameSide {
  const team = teamByRoster(rosterId);
  const lineup: LineupSlot[] = starters.map((id, i) => ({
    slot: STARTER_SLOTS[i] ?? 'FLEX',
    ...playerOf(id),
    points: Number((pointsByPlayer[id] ?? 0).toFixed(2)),
  }));
  const benchIds = allPlayers.filter((id) => !starters.includes(id));
  const bench: LineupSlot[] = benchIds.map((id) => ({
    slot: 'BN',
    ...playerOf(id),
    points: Number((pointsByPlayer[id] ?? 0).toFixed(2)),
  }));

  return {
    rosterId,
    team: team?.teamName ?? `Team ${rosterId}`,
    manager: team?.manager ?? 'Unknown',
    points: Number((points ?? 0).toFixed(2)),
    lineup,
    bench,
  };
}

export async function getWeekGames(week: number): Promise<Game[]> {
  let rows;
  try {
    rows = await getMatchups(week);
  } catch {
    return [];
  }
  if (!Array.isArray(rows) || !rows.length) return [];

  // state.week is the week actually in progress; display_week is the week
  // Sleeper is showing, which lags it. Comparing against display_week marked
  // every finished game as live.
  const now = league.state.week || currentWeek();
  const pairs = new Map<number, typeof rows>();
  for (const row of rows) {
    const list = pairs.get(row.matchup_id) ?? [];
    list.push(row);
    pairs.set(row.matchup_id, list);
  }

  const games: Game[] = [];
  for (const [matchupId, sides] of pairs) {
    if (sides.length !== 2) continue;
    const [a, b] = sides;
    const home = buildSide(a.roster_id, a.points, a.starters ?? [], a.players_points ?? {}, a.players ?? []);
    const away = buildSide(b.roster_id, b.points, b.starters ?? [], b.players_points ?? {}, b.players ?? []);
    const played = home.points > 0 || away.points > 0;

    games.push({
      matchupId,
      week,
      home,
      away,
      margin: Number(Math.abs(home.points - away.points).toFixed(2)),
      winner: !played ? null : home.points >= away.points ? home.rosterId : away.rosterId,
      status: week < now ? 'final' : played ? 'live' : 'pending',
    });
  }
  return games.sort((x, y) => x.matchupId - y.matchupId);
}

type WeeklyResult = { week: number; rosterId: number; points: number; won: boolean };

/** Every scored result this season, used for streaks and power rankings. */
export async function getSeasonResults(throughWeek: number): Promise<WeeklyResult[]> {
  const weeks = Array.from({ length: throughWeek }, (_, i) => i + 1);
  const perWeek = await Promise.all(weeks.map((w) => getWeekGames(w)));
  const out: WeeklyResult[] = [];

  for (const games of perWeek) {
    for (const game of games) {
      // Final only. A live game has a leader, not a result: counting it gave a
      // manager trailing on Thursday night an L1 streak in the standings.
      if (game.status !== 'final') continue;
      for (const side of [game.home, game.away]) {
        out.push({
          week: game.week,
          rosterId: side.rosterId,
          points: side.points,
          won: game.winner === side.rosterId,
        });
      }
    }
  }
  return out;
}

function streakOf(results: WeeklyResult[], rosterId: number): string {
  const mine = results
    .filter((r) => r.rosterId === rosterId)
    .sort((a, b) => b.week - a.week);
  if (!mine.length) return '';
  const kind = mine[0].won;
  let count = 0;
  for (const r of mine) {
    if (r.won !== kind) break;
    count++;
  }
  return `${kind ? 'W' : 'L'}${count}`;
}

export async function getStandings(): Promise<Standing[]> {
  // Records come from live rosters, not the nightly file, so a Sunday result
  // shows up without waiting for 3:00 AM.
  let live: Awaited<ReturnType<typeof getRosters>> = [];
  try {
    live = await getRosters();
  } catch {
    live = [];
  }

  const week = await scoredWeek();
  const results = await getSeasonResults(week);

  const merged = teams.map((team) => {
    const row = live.find((r) => r.roster_id === team.rosterId);
    if (!row) return team;
    return {
      ...team,
      wins: row.settings.wins ?? team.wins,
      losses: row.settings.losses ?? team.losses,
      ties: row.settings.ties ?? team.ties,
      pointsFor: Number(`${row.settings.fpts}.${row.settings.fpts_decimal ?? 0}`),
      pointsAgainst: Number(
        `${row.settings.fpts_against}.${row.settings.fpts_against_decimal ?? 0}`
      ),
      starters: row.starters ?? team.starters,
    };
  });

  return merged
    .sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)
    .map((team, i) => ({
      ...team,
      seed: i + 1,
      inPlayoffs: i < league.playoffTeams,
      streak: streakOf(results, team.rosterId),
    }));
}

export type PowerRank = {
  rank: number;
  previousRank: number | null;
  movement: number | null;
  team: Standing;
  score: number;
  blurb: string;
};

/**
 * Power score blends winning, scoring and recent form. Deliberately boring
 * arithmetic: the funny one line roast is written by Claude in Checkpoint 6.
 * Built from final results through a given week, not the live record, so last
 * week's order can be rebuilt the same way as this week's.
 */
function powerScore(results: WeeklyResult[], rosterId: number, throughWeek: number): number {
  const mine = results.filter((r) => r.rosterId === rosterId && r.week <= throughWeek);
  const games = mine.length;
  const wins = mine.filter((r) => r.won).length;
  const winPct = games ? wins / games : 0;
  const avgPoints = games ? mine.reduce((a, r) => a + r.points, 0) / games : 0;
  const recent = mine.filter((r) => r.week > throughWeek - 3).map((r) => r.points);
  const recentAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : avgPoints;
  return winPct * 100 * 0.4 + avgPoints * 0.4 + recentAvg * 0.2;
}

function blurbFor(team: Standing, rank: number, avgPoints: number): string {
  const record = `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}`;
  const streak = team.streak ? `, riding ${team.streak}` : '';
  if (rank === 1) return `${record}${streak}, and ${avgPoints.toFixed(1)} a week says it is not luck.`;
  if (team.inPlayoffs) return `${record}${streak}, averaging ${avgPoints.toFixed(1)}. In the field for now.`;
  return `${record}${streak}, averaging ${avgPoints.toFixed(1)}. Outside looking in.`;
}

export async function getPowerRankings(): Promise<PowerRank[]> {
  const standings = await getStandings();
  const week = await scoredWeek();
  const results = await getSeasonResults(week);

  // The scored week is still in progress mid-week and only finals count, so
  // rank through the last final week and compare with the week before it.
  // Ranking through scoredWeek() - 1 gave both orders the same finals, and
  // every team read even.
  const lastFinal = results.reduce((max, r) => Math.max(max, r.week), 0);
  const orderThrough = (week: number) =>
    standings
      .map((team) => ({ team, score: powerScore(results, team.rosterId, week) }))
      .sort((a, b) => b.score - a.score);

  const scored = orderThrough(lastFinal);

  // Last week's order, so the movement chip is real rather than decorative.
  // One final week has nothing before it to move from.
  const previous = lastFinal > 1 ? orderThrough(lastFinal - 1).map((r) => r.team.rosterId) : [];

  return scored
    .map(({ team, score }, i) => {
      const priorIndex = previous.indexOf(team.rosterId);
      const previousRank = priorIndex >= 0 ? priorIndex + 1 : null;
      const games = team.wins + team.losses + team.ties;
      return {
        rank: i + 1,
        previousRank,
        movement: previousRank == null ? null : previousRank - (i + 1),
        team,
        score: Number(score.toFixed(2)),
        blurb: blurbFor(team, i + 1, games ? team.pointsFor / games : 0),
      };
    });
}

export async function getTopPerformers(week: number, limit = 5): Promise<LineupSlot[]> {
  const games = await getWeekGames(week);
  return games
    .flatMap((g) => [...g.home.lineup, ...g.away.lineup])
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

/** Closest completed game, which the brief makes Matchup of the Week. */
export function matchupOfTheWeek(games: Game[]): Game | undefined {
  const played = games.filter((g) => g.status !== 'pending');
  if (!played.length) return games[0];
  return [...played].sort((a, b) => a.margin - b.margin)[0];
}
