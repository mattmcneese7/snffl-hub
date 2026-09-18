// Postseason Breakdown, Brief Section 2.
//
// From Week 15 the Playoff Tracker becomes this: the winners bracket with round
// tabs, seeds, byes, live and final flags and a champion card, and below it the
// Shart Bowl built from Sleeper's losers bracket, whose loser takes the
// season's final chug.
//
// Sleeper publishes both brackets before the playoffs start, already seeded, so
// this reads real structure rather than waiting for January. t1 and t2 are
// roster ids; a match that feeds from an earlier one carries t1_from or t2_from
// instead, which is how a bye shows up: a team that appears in round 2 with no
// round 1 match did not play one.

import { league, scoredWeek, getStandings, teamByRoster } from './league.ts';
import { getLosersBracket, getWinnersBracket, type BracketMatch } from './sleeper.ts';

export type BracketSide = {
  rosterId: number | null;
  team: string;
  manager: string;
  /** Regular season seed, 1 through 14, or null for a slot not yet filled. */
  seed: number | null;
  /** The earlier match this slot feeds from, for an unplayed round. */
  from: string | null;
  won: boolean;
};

export type BracketGame = {
  matchId: number;
  round: number;
  home: BracketSide;
  away: BracketSide;
  status: 'pending' | 'live' | 'final';
  /**
   * The finishing position this match decides, so p is 1 on the championship
   * and 3 on the third place game. Not a marker for consolation games: reading
   * it that way hid the last round and named the semifinal "Final".
   */
  placement: number | null;
  loserRosterId: number | null;
};

export type BracketRound = {
  round: number;
  name: string;
  games: BracketGame[];
};

export type Postseason = {
  rounds: BracketRound[];
  shartBowl: BracketRound[];
  championRosterId: number | null;
  /** The roster that loses the losers bracket final and owes the last chug. */
  shartRosterId: number | null;
  byeRosterIds: number[];
};

/**
 * Round names counted back from the final, so a 7 team bracket reads
 * Quarterfinal, Semifinal, Final rather than Round 1, 2, 3.
 */
function roundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semifinal';
  if (fromEnd === 2) return 'Quarterfinal';
  return `Round ${round}`;
}

const sideFrom = (
  rosterId: number | null,
  winner: number | null,
  seeds: Map<number, number>,
  from: BracketMatch['t1_from']
): BracketSide => {
  const team = rosterId != null ? teamByRoster(rosterId) : undefined;
  return {
    rosterId,
    team: team?.teamName ?? (rosterId != null ? `Roster ${rosterId}` : 'To be decided'),
    manager: team?.manager ?? '',
    seed: rosterId != null ? (seeds.get(rosterId) ?? null) : null,
    from: from?.w ? `Winner of ${from.w}` : from?.l ? `Loser of ${from.l}` : null,
    won: winner != null && winner === rosterId,
  };
};

/** Round 1 is played in the first playoff week, round 2 the next, and so on. */
const weekOfRound = (round: number) => league.playoffWeekStart + round - 1;

function toRounds(
  matches: BracketMatch[],
  seeds: Map<number, number>,
  currentWeek: number
): BracketRound[] {
  if (!matches.length) return [];

  // Every round counts. Filtering on p left the championship round out and
  // named the semifinal "Final".
  const totalRounds = Math.max(...matches.map((match) => match.r));

  const byRound = new Map<number, BracketGame[]>();
  for (const match of matches) {
    const game: BracketGame = {
      matchId: match.m,
      round: match.r,
      home: sideFrom(match.t1, match.w, seeds, match.t1_from),
      away: sideFrom(match.t2, match.w, seeds, match.t2_from),
      // Both teams being known is not enough to call a match live. Sleeper
      // seeds the bracket before the season, so round 1 has real roster ids in
      // September and would otherwise read as in progress all autumn.
      status:
        match.w != null
          ? 'final'
          : match.t1 != null && match.t2 != null && currentWeek >= weekOfRound(match.r)
            ? 'live'
            : 'pending',
      placement: match.p ?? null,
      loserRosterId: match.l ?? null,
    };
    const list = byRound.get(match.r) ?? [];
    list.push(game);
    byRound.set(match.r, list);
  }

  return [...byRound.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, games]) => ({
      round,
      name: roundName(round, totalRounds),
      // Championship first within its round, then third place, then the rest.
      games: games.sort(
        (a, b) => (a.placement ?? 99) - (b.placement ?? 99) || a.matchId - b.matchId
      ),
    }));
}

export async function getPostseason(): Promise<Postseason> {
  const [standings, winners, losers, currentWeek] = await Promise.all([
    getStandings(),
    getWinnersBracket().catch(() => [] as BracketMatch[]),
    getLosersBracket().catch(() => [] as BracketMatch[]),
    scoredWeek(),
  ]);

  const seeds = new Map<number, number>();
  for (const team of standings) seeds.set(team.rosterId, team.seed);

  const rounds = toRounds(winners, seeds, currentWeek);
  const shartBowl = toRounds(losers, seeds, currentWeek);

  // A bye is a team in the first played round that never appears in round 1.
  const firstRound = winners.filter((match) => match.r === 1);
  const secondRound = winners.filter((match) => match.r === 2);
  const playedFirst = new Set(
    firstRound.flatMap((match) => [match.t1, match.t2].filter((id): id is number => id != null))
  );
  const byeRosterIds = secondRound
    .flatMap((match) => [match.t1, match.t2])
    .filter((id): id is number => id != null && !playedFirst.has(id));

  // The championship is the match that decides first place, wherever it sits,
  // rather than whichever round happens to be last.
  const titleGame = winners.find((match) => match.p === 1);
  const championRosterId = titleGame?.w ?? null;

  // The Shart Bowl: whoever loses the losers bracket's own title game finishes
  // last and owes the season's final chug. Sleeper reports the loser directly.
  const shartGame = losers.find((match) => match.p === 1);
  const shartRosterId = shartGame?.l ?? null;

  return { rounds, shartBowl, championRosterId, shartRosterId, byeRosterIds };
}
