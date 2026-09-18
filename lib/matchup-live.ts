// A fantasy matchup with everything around it: each starter's NFL game, line,
// stat line, projection and DraftSharks range, and a win probability built
// from all of it.
//
// The win probability model, in plain terms. Each starter is expected to
// finish on the points already scored plus his projection scaled by the share
// of his game still to play. His uncertainty comes from DraftSharks' weekly
// floor and ceiling where they rank him, read as roughly the 20th and 80th
// percentile outcomes, and from a spread of 45 percent of his projection where
// they do not. That uncertainty shrinks with the square root of the game left,
// so a player in the fourth quarter barely moves the needle. The two team
// totals are treated as independent normals, and the chance one beats the other
// is the normal CDF of the gap over the combined spread.

import { dsWeekly, type DsRow } from './draftsharks.ts';
import { league } from './league.ts';
import {
  fractionRemaining,
  gamesByTeam,
  getNflGames,
  getSlateLines,
  impliedTeamTotal,
  type GameLines,
  type NflGame,
  type TeamGame,
} from './gameday.ts';
import {
  formatStatLine,
  getWeekProjectionLines,
  getWeekStatLines,
  type PlayerWeekLine,
} from './sleeper-live.ts';
import type { Game, GameSide, LineupSlot } from './types.ts';

export type LivePlayer = LineupSlot & {
  /** Sleeper's projection for the week, league scoring. */
  projected: number | null;
  /** Expected final: points so far plus the projection for the game left. */
  expected: number;
  sd: number;
  /** Share of this player's game still to play, 0 to 1. */
  remaining: number;
  gameState: 'pre' | 'in' | 'post' | 'bye';
  nfl: TeamGame | null;
  lines: GameLines | null;
  /** The player's team total implied by the spread and the over/under. */
  teamTotal: number | null;
  statLine: string;
  projectedLine: string;
  injury: string | null;
  ds: DsRow | null;
};

export type LiveSide = Omit<GameSide, 'lineup' | 'bench'> & {
  lineup: LivePlayer[];
  bench: LivePlayer[];
  projectedTotal: number;
  expected: number;
  sd: number;
  winProb: number;
  yetToPlay: number;
  inPlay: number;
  done: number;
};

export type LiveMatchup = {
  game: Game;
  away: LiveSide;
  home: LiveSide;
};

export type MatchupContext = {
  nfl: NflGame[];
  lines: Record<string, GameLines>;
  stats: Record<string, PlayerWeekLine>;
  projections: Record<string, PlayerWeekLine>;
};

/**
 * Everything a week's matchups are measured against, fetched once per render.
 * Lines only for the week ESPN is showing: older weeks have settled and their
 * lines no longer say anything about who wins.
 */
export async function getMatchupContext(week: number): Promise<MatchupContext> {
  const season = league.season;
  const nfl = await getNflGames(week, season);
  const live = nfl.some((game) => game.state === 'in');
  const [lines, stats, projections] = await Promise.all([
    getSlateLines(nfl),
    getWeekStatLines(season, week, live),
    getWeekProjectionLines(season, week),
  ]);
  return { nfl, lines, stats, projections };
}

/** Standard normal CDF, Abramowitz and Stegun 7.1.26, good to about 1e-7. */
function phi(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

function livePlayer(slot: LineupSlot, ctx: MatchupContext, byTeam: Map<string, TeamGame>): LivePlayer {
  const nfl = slot.team ? (byTeam.get(slot.team) ?? null) : null;
  const remaining = nfl ? fractionRemaining(nfl.game) : 0;
  const gameState: LivePlayer['gameState'] = nfl ? nfl.game.state : 'bye';
  const projection = ctx.projections[slot.id];
  const projected = projection?.stats.pts_ppr != null ? Number(projection.stats.pts_ppr.toFixed(2)) : null;
  const ds = dsWeekly(slot.id) ?? null;

  const base = projected ?? ds?.projection ?? 0;
  const spread =
    ds?.floor != null && ds?.ceiling != null && ds.ceiling > ds.floor
      ? (ds.ceiling - ds.floor) / 1.68
      : Math.max(2.5, base * 0.45);
  const lines = nfl ? (ctx.lines[nfl.game.id] ?? null) : null;

  return {
    ...slot,
    projected,
    expected: slot.points + base * remaining,
    sd: spread * Math.sqrt(remaining),
    remaining,
    gameState,
    nfl,
    lines,
    teamTotal: nfl ? impliedTeamTotal(lines ?? undefined, nfl.home) : null,
    statLine: formatStatLine(slot.position, ctx.stats[slot.id]?.stats),
    projectedLine: formatStatLine(slot.position, projection?.stats, true),
    injury: projection?.injury ?? ctx.stats[slot.id]?.injury ?? null,
    ds,
  };
}

function liveSide(side: GameSide, ctx: MatchupContext, byTeam: Map<string, TeamGame>) {
  const lineup = side.lineup.map((slot) => livePlayer(slot, ctx, byTeam));
  const bench = (side.bench ?? []).map((slot) => livePlayer(slot, ctx, byTeam));
  const expected = lineup.reduce((sum, p) => sum + p.expected, 0);
  const sd = Math.sqrt(lineup.reduce((sum, p) => sum + p.sd ** 2, 0));
  return {
    ...side,
    lineup,
    bench,
    projectedTotal: Number(lineup.reduce((sum, p) => sum + (p.projected ?? p.ds?.projection ?? 0), 0).toFixed(2)),
    expected: Number(expected.toFixed(2)),
    sd,
    winProb: 0.5,
    yetToPlay: lineup.filter((p) => p.gameState === 'pre').length,
    inPlay: lineup.filter((p) => p.gameState === 'in').length,
    done: lineup.filter((p) => p.gameState === 'post' || p.gameState === 'bye').length,
  };
}

export function buildLiveMatchup(game: Game, ctx: MatchupContext): LiveMatchup {
  const byTeam = gamesByTeam(ctx.nfl);
  const away = liveSide(game.away, ctx, byTeam);
  const home = liveSide(game.home, ctx, byTeam);

  const spread = Math.sqrt(away.sd ** 2 + home.sd ** 2);
  let awayWin: number;
  if (game.status === 'final' || spread < 0.01) {
    awayWin = away.points === home.points ? 0.5 : away.points > home.points ? 1 : 0;
  } else {
    awayWin = phi((away.expected - home.expected) / spread);
  }
  // Never print a certainty the model has not earned while anything is left.
  if (game.status !== 'final' && spread >= 0.01) awayWin = Math.min(0.995, Math.max(0.005, awayWin));

  away.winProb = Number(awayWin.toFixed(3));
  home.winProb = Number((1 - awayWin).toFixed(3));
  return { game, away, home };
}

/** Win probability for every game in a week, for the list and the ticker. */
export function winProbabilities(games: Game[], ctx: MatchupContext): Map<number, LiveMatchup> {
  return new Map(games.map((game) => [game.matchupId, buildLiveMatchup(game, ctx)]));
}

/** League starters per NFL team this week, for the slate's "5 SNFFL starters". */
export function startersByNflTeam(games: Game[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const game of games) {
    for (const slot of [...game.home.lineup, ...game.away.lineup]) {
      if (!slot.team) continue;
      out[slot.team] = (out[slot.team] ?? 0) + 1;
    }
  }
  return out;
}

/** The list view's slice of a live matchup. */
export function outlookOf(live: LiveMatchup | undefined) {
  if (!live) return undefined;
  return {
    awayWin: live.away.winProb,
    homeWin: live.home.winProb,
    awayProjected: live.away.projectedTotal,
    homeProjected: live.home.projectedTotal,
  };
}
