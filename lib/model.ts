// The weekly model's projections, as the app reads them. Checkpoint 18b.
//
// Written nightly by ml/predict.py and imported the way every other data file
// here is, so a server component has it without a fetch. Keyed by Sleeper
// player id, the same id the app uses everywhere, because the model trains and
// serves on Sleeper data and needs no crosswalk.
//
// Every number in here was computed from real games by a model backtested on
// six seasons (see ml/README.md). A player the model could not project, for
// want of recent form, is simply absent, and a caller falls back to the
// deterministic projection rather than showing an invented one.

import modelData from '../data/model.json' with { type: 'json' };

export type PlayerModel = {
  /** Point projection, this league's scoring. */
  proj: number;
  /** Calibrated percentiles of the outcome: p10 is the floor, p90 the ceiling. */
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  /** Prior games of form behind the projection. */
  games: number;
};

export type BoomBust = {
  /** Chance of a top-quarter week for the position. */
  boom: number;
  /** Chance of a bottom-quarter dud. */
  bust: number;
  /** The scores those lines sit at, so the app can name them. */
  boomLine: number;
  bustLine: number;
};

type ModelFile = {
  season: number;
  week: number;
  built_at: string;
  quantiles: number[];
  thresholds: Record<string, { boom: number; bust: number }>;
  players: Record<string, PlayerModel>;
};

export const model = modelData as unknown as ModelFile;

/** The model's read on a player, or null if it could not project him. */
export const modelFor = (playerId: string): PlayerModel | null =>
  model.players[playerId] ?? null;

/** Which week these projections are for. */
export const modelWeek = () => ({ season: model.season, week: model.week });

/**
 * Chance he scores at least `points`, from the calibrated distribution.
 *
 * Linear interpolation across the stored percentiles: honest to the precision
 * the model actually has, and no more. Returns null when he is not projected,
 * so a caller never turns "unknown" into a fabricated probability.
 */
export function chanceOf(playerId: string, points: number): number | null {
  const m = modelFor(playerId);
  if (!m) return null;
  const grid: [number, number][] = [
    [m.p10, 0.1], [m.p25, 0.25], [m.p50, 0.5], [m.p75, 0.75], [m.p90, 0.9],
  ];
  // Below the floor he almost certainly clears it; above the ceiling he almost
  // certainly does not. Between, interpolate the CDF and return the upper tail.
  if (points <= grid[0][0]) return 1 - 0.1;
  if (points >= grid[grid.length - 1][0]) return 1 - 0.9;
  for (let i = 0; i < grid.length - 1; i++) {
    const [lo, loCdf] = grid[i];
    const [hi, hiCdf] = grid[i + 1];
    if (points <= hi) {
      const t = hi === lo ? 0 : (points - lo) / (hi - lo);
      return Number((1 - (loCdf + t * (hiCdf - loCdf))).toFixed(2));
    }
  }
  return 1 - 0.9;
}

/**
 * The odds of a big week and a dud, against this position's historical lines.
 *
 * Both probabilities come from the calibrated distribution, both lines from
 * real history, so nothing here is a guess. Null when the player is not
 * projected or the position has no lines, so a caller shows nothing rather
 * than a number it made up.
 */
export function boomBust(playerId: string, position: string): BoomBust | null {
  const m = modelFor(playerId);
  const t = model.thresholds[position];
  if (!m || !t) return null;
  const boom = chanceOf(playerId, t.boom);
  const bustAtOrBelow = chanceOf(playerId, t.bust);
  if (boom === null || bustAtOrBelow === null) return null;
  return {
    boom,
    // chanceOf is an at-least probability, so the chance of landing at or below
    // the bust line is its complement.
    bust: Number((1 - bustAtOrBelow).toFixed(2)),
    boomLine: t.boom,
    bustLine: t.bust,
  };
}
