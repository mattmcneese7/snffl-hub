// Fact packets, Brief Section 3.
//
// Code computes every number first. The writer receives these as structured
// data and may not invent a stat. Validation later checks every figure in the
// generated prose against the packet that produced it.

import { getChugCounts, getManagerOfTheWeekCounts, getWeeklyExtremes } from './awards.ts';
import {
  getPowerRankings,
  getStandings,
  getTopPerformers,
  getWeekGames,
  league,
  matchupOfTheWeek,
  teamByRoster,
} from './league.ts';
import { getPlayoffOdds } from './playoff-odds.ts';
import { getTrades } from './trades.ts';
import type { Game } from './types.ts';

export type TeamFact = {
  rosterId: number;
  team: string;
  manager: string;
  points: number;
};

export type GameFact = {
  matchupId: number;
  away: TeamFact;
  home: TeamFact;
  margin: number;
  winner: string;
  loser: string;
};

export type WeekFacts = {
  week: number;
  season: string;
  leagueName: string;
  teamCount: number;
  playoffTeams: number;
  games: GameFact[];
  shart: TeamFact & { beatenBy: string | null };
  managerOfWeek: TeamFact;
  gameOfWeek: GameFact;
  topPerformers: { name: string; position: string; nflTeam: string | null; points: number; manager: string }[];
  standings: { seed: number; team: string; manager: string; record: string; pointsFor: number }[];
  powerRankings: { rank: number; team: string; manager: string; movement: number | null; record: string }[];
  odds: { team: string; manager: string; makePlayoffs: number; tag: string }[];
  trades: { week: number; sides: { team: string; manager: string; gets: string[] }[] }[];
  awards: { manager: string; managerOfWeekCount: number; shartCount: number }[];
  nextWeek: { away: string; home: string; awayManager: string; homeManager: string }[];
};

const fact = (game: Game, side: 'home' | 'away'): TeamFact => {
  const entry = game[side];
  const team = teamByRoster(entry.rosterId);
  return {
    rosterId: entry.rosterId,
    team: team?.teamName ?? entry.team,
    manager: team?.manager ?? entry.manager,
    points: entry.points,
  };
};

function toGameFact(game: Game): GameFact {
  const away = fact(game, 'away');
  const home = fact(game, 'home');
  const homeWon = game.winner === home.rosterId;
  return {
    matchupId: game.matchupId,
    away,
    home,
    margin: game.margin,
    winner: homeWon ? home.manager : away.manager,
    loser: homeWon ? away.manager : home.manager,
  };
}

export async function buildWeekFacts(week: number): Promise<WeekFacts> {
  const [games, standings, rankings, performers, extremes, odds, trades, motw, chugs, nextGames] =
    await Promise.all([
      getWeekGames(week),
      getStandings(),
      getPowerRankings(),
      getTopPerformers(week, 6),
      getWeeklyExtremes(week),
      getPlayoffOdds(),
      getTrades(),
      getManagerOfTheWeekCounts(week),
      getChugCounts(week),
      getWeekGames(week + 1),
    ]);

  const played = games.filter((g) => g.status !== 'pending');
  const gameFacts = played.map(toGameFact);

  const low = extremes.lows.find((l) => l.week === week);
  const high = extremes.highs.find((h) => h.week === week);

  const lowTeam = low ? teamByRoster(low.rosterId) : undefined;
  const highTeam = high ? teamByRoster(high.rosterId) : undefined;

  // Who beat the low scorer, if anyone did.
  const shartGame = gameFacts.find(
    (g) => g.away.rosterId === low?.rosterId || g.home.rosterId === low?.rosterId
  );

  const featured = matchupOfTheWeek(played);

  return {
    week,
    season: league.season,
    leagueName: league.name,
    teamCount: league.teamCount,
    playoffTeams: league.playoffTeams,
    games: gameFacts,

    shart: {
      rosterId: low?.rosterId ?? 0,
      team: lowTeam?.teamName ?? 'Unknown',
      manager: lowTeam?.manager ?? 'Unknown',
      points: low?.points ?? 0,
      beatenBy: shartGame ? shartGame.winner : null,
    },

    managerOfWeek: {
      rosterId: high?.rosterId ?? 0,
      team: highTeam?.teamName ?? 'Unknown',
      manager: highTeam?.manager ?? 'Unknown',
      points: high?.points ?? 0,
    },

    gameOfWeek: featured ? toGameFact(featured) : gameFacts[0],

    topPerformers: performers.map((p) => {
      const owner = played
        .flatMap((g) => [g.home, g.away])
        .find((side) => side.lineup.some((slot) => slot.id === p.id));
      const team = owner ? teamByRoster(owner.rosterId) : undefined;
      return {
        name: p.name,
        position: p.position,
        nflTeam: p.team ?? null,
        points: p.points,
        manager: team?.manager ?? 'a free agent',
      };
    }),

    standings: standings.map((s) => ({
      seed: s.seed,
      team: s.teamName,
      manager: s.manager,
      record: `${s.wins}-${s.losses}${s.ties ? `-${s.ties}` : ''}`,
      pointsFor: s.pointsFor,
    })),

    powerRankings: rankings.map((r) => ({
      rank: r.rank,
      team: r.team.teamName,
      manager: r.team.manager,
      movement: r.movement,
      record: `${r.team.wins}-${r.team.losses}`,
    })),

    odds: odds.map((o) => ({
      team: o.team.teamName,
      manager: o.team.manager,
      makePlayoffs: o.makePlayoffs,
      tag: o.tag,
    })),

    trades: trades
      .filter((t) => t.week <= week)
      .map((t) => ({
        week: t.week,
        sides: t.sides.map((side) => ({
          team: side.teamName,
          manager: side.manager,
          gets: side.gets.map((p) => p.name),
        })),
      })),

    awards: standings.map((s) => ({
      manager: s.manager,
      managerOfWeekCount: motw.find((m) => m.rosterId === s.rosterId)?.count ?? 0,
      shartCount: chugs.find((c) => c.rosterId === s.rosterId)?.count ?? 0,
    })),

    nextWeek: nextGames.map((g) => {
      const away = fact(g, 'away');
      const home = fact(g, 'home');
      return {
        away: away.team,
        home: home.team,
        awayManager: away.manager,
        homeManager: home.manager,
      };
    }),
  };
}

/**
 * Team, manager and player names, longest first.
 *
 * Validation redacts these before reading numbers out of prose, because a
 * number inside a proper noun is not a statistical claim: "Bibi's Ballers 69"
 * is a team, not a score. They are also exempt from Title Case, since
 * managers spell their own handles (nunnells, bearcat2789) and the style guide
 * requires reproducing them exactly.
 */
export function properNouns(facts: WeekFacts): string[] {
  const out = new Set<string>();
  const add = (value: string | null | undefined) => {
    if (value && value.trim()) out.add(value.trim());
  };

  for (const s of facts.standings) {
    add(s.team);
    add(s.manager);
  }
  for (const game of facts.games) {
    add(game.away.team);
    add(game.away.manager);
    add(game.home.team);
    add(game.home.manager);
  }
  for (const p of facts.topPerformers) add(p.name);
  for (const n of facts.nextWeek) {
    add(n.away);
    add(n.home);
    add(n.awayManager);
    add(n.homeManager);
  }
  add(facts.shart.team);
  add(facts.shart.manager);
  add(facts.managerOfWeek.team);
  add(facts.managerOfWeek.manager);
  add(facts.leagueName);

  // Longest first so a long name is redacted before a shorter name inside it.
  return [...out].sort((a, b) => b.length - a.length);
}

/**
 * Every number a writer is allowed to use, as strings, for validation. Any
 * figure in generated prose that is not in this set is a hallucination.
 */
export function allowedNumbers(facts: WeekFacts): Set<string> {
  const out = new Set<string>();
  /**
   * Exact forms only.
   *
   * This used to add String(Math.round(value)) and toFixed(1), which
   * whitelisted the rounded form of every score. That admitted "63" for a 63.04
   * Shart and "170" for a 169.86 high, the exact truncation the brief forbids,
   * and it made enforcement depend on whether a decimal happened to round up or
   * down: "Hangs 169" was rejected while "A 63" sailed through into a headline.
   *
   * String(value) and toFixed(2) together cover every honest spelling, 118 and
   * 118.00, 95.2 and 95.20, and checkNumbers normalizes trailing zeros on the
   * way in. Whole number facts such as the week, the team count and a seed are
   * integral already, so they need no rounding to pass.
   */
  const add = (value: number) => {
    out.add(String(value));
    out.add(value.toFixed(2));
  };

  add(facts.week);
  add(facts.teamCount);
  add(facts.playoffTeams);
  add(facts.shart.points);
  add(facts.managerOfWeek.points);

  for (const game of facts.games) {
    add(game.away.points);
    add(game.home.points);
    add(game.margin);
  }
  for (const p of facts.topPerformers) add(p.points);
  for (const s of facts.standings) {
    add(s.seed);
    add(s.pointsFor);
  }
  for (const r of facts.powerRankings) {
    add(r.rank);
    if (r.movement != null) add(Math.abs(r.movement));
  }
  for (const o of facts.odds) add(o.makePlayoffs);
  for (const a of facts.awards) {
    add(a.managerOfWeekCount);
    add(a.shartCount);
  }

  return out;
}
