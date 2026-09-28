// What to expect from a player this week, and why. Checkpoint 14.
//
// Three things joined: the projection Checkpoint 12 corrected, the defence he
// actually faces from Checkpoint 13, and how wide this position's outcomes
// really are, measured rather than assumed.
//
// Two decisions here are worth reading before trusting the number.
//
// **The matchup adjustment is damped.** Sleeper's own projections barely price
// the opponent: across 192 players the correlation between their projection
// relative to a player's season rate and our defence rating is 0.043, and the
// gap between a soft and a hard matchup in their numbers is 2.6 percent. So
// there is room to adjust without paying for the matchup twice. What cannot be
// told apart on two weeks of data is whether Sleeper ignores the matchup or
// whether our defence ratings are still noise, and both readings fit. So the
// adjustment is applied in proportion to how much evidence stands behind it,
// and the unadjusted number is always available beside it.
//
// **The floor and the ceiling are percentiles, not a band.** They come from
// the real distribution of actual minus projected for the position. Fantasy
// scoring is not symmetric: a receiver's downside stops at zero and his upside
// is a ninety yard touchdown, so a plus or minus band would be wrong in both
// directions at once. A quarterback's measured residuals run -6.22 to +8.13,
// and the floor and ceiling say so.

import {
  dvpConfidence,
  dvpFor,
  matchupFactor,
  scheduleAhead,
  spine,
  usageFor,
  usageTrend,
  type Fixture,
  type Pos,
  type UsageEntry,
} from './spine.ts';

/** How much of the defence rating to believe, by how much evidence there is. */
const WEIGHT: Record<ReturnType<typeof dvpConfidence>, number> = {
  thin: 0.34,
  fair: 0.67,
  good: 1,
};

export type MatchupRead = {
  opponent: string;
  home: boolean;
  label: 'soft' | 'even' | 'hard';
  /** 1 concedes most to this position. */
  rank: number;
  /** Points per game this defence concedes, shrunk toward the average. */
  conceded: number;
};

export type Outlook = {
  /** The projection as Sleeper gives it, scored on this league's rules. */
  base: number;
  /** The same number after the matchup, which is what to lead with. */
  adjusted: number;
  floor: number;
  ceiling: number;
  matchup: MatchupRead | null;
  /** How much of the defence rating was applied, 0 to 1. */
  weight: number;
  confidence: ReturnType<typeof dvpConfidence>;
  usage: UsageEntry | null;
  trend: ReturnType<typeof usageTrend>;
  /** The next few fixtures, each read the same way as this week's. */
  ahead: (Fixture & { label: 'soft' | 'even' | 'hard'; rank: number })[];
};

const isPos = (p: string): p is Pos => p in spine.positionMean;

/** Soft means a defence to attack. The band is deliberately wide. */
function labelFor(factor: number): 'soft' | 'even' | 'hard' {
  if (factor > 1.05) return 'soft';
  if (factor < 0.95) return 'hard';
  return 'even';
}

function readMatchup(opponent: string, pos: Pos, home: boolean): MatchupRead | null {
  const entry = dvpFor(opponent, pos);
  if (!entry) return null;
  return {
    opponent,
    home,
    label: labelFor(entry.vsAverage),
    rank: entry.rank,
    conceded: entry.adjusted,
  };
}

/**
 * Everything worth saying about a player's week.
 *
 * `base` is the projection already scored on this league's rules. The opponent
 * is looked up from the schedule rather than passed in, so a caller cannot
 * accidentally read one week's projection against another week's defence.
 */
export function outlookFor(
  playerId: string,
  position: string,
  team: string | undefined,
  base: number,
  week: number
): Outlook {
  const confidence = dvpConfidence();
  const weight = WEIGHT[confidence];
  const usage = usageFor(playerId);
  const trend = usageTrend(playerId);

  const fixtures = team ? scheduleAhead(team, 4) : [];
  const thisWeek = fixtures.find((f) => f.week === week) ?? null;

  if (!isPos(position) || !thisWeek) {
    // No opponent known, so no adjustment and no invented precision. The floor
    // and ceiling still apply: they are about the position, not the matchup.
    const spread = isPos(position) ? spine.dispersion?.[position] : undefined;
    return {
      base,
      adjusted: base,
      floor: Math.max(0, Number((base + (spread?.p20 ?? 0)).toFixed(2))),
      ceiling: Number((base + (spread?.p80 ?? 0)).toFixed(2)),
      matchup: null,
      weight,
      confidence,
      usage,
      trend,
      ahead: [],
    };
  }

  const pos = position as Pos;
  const factor = matchupFactor(thisWeek.opponent, pos);
  // Damped toward 1 by how much evidence stands behind the rating.
  const effective = 1 + (factor - 1) * weight;
  const adjusted = Number((base * effective).toFixed(2));

  const spread = spine.dispersion?.[pos];
  return {
    base,
    adjusted,
    floor: Math.max(0, Number((adjusted + (spread?.p20 ?? 0)).toFixed(2))),
    ceiling: Number((adjusted + (spread?.p80 ?? 0)).toFixed(2)),
    matchup: readMatchup(thisWeek.opponent, pos, thisWeek.home),
    weight,
    confidence,
    usage,
    trend,
    ahead: fixtures
      .filter((f) => f.week > week)
      .map((f) => {
        const entry = dvpFor(f.opponent, pos);
        return { ...f, label: labelFor(entry?.vsAverage ?? 1), rank: entry?.rank ?? 0 };
      }),
  };
}

/**
 * The role, in a few words, from usage rather than from points.
 *
 * Points swing on touchdowns and a share does not, so this describes what a
 * coach decided rather than what happened to bounce. Null when there is not
 * enough of a sample to say anything, which is better than a confident label
 * on one game.
 */
export function roleOf(playerId: string, position: string): string | null {
  const u = usageFor(playerId);
  if (!u || !u.weeks) return null;

  if (position === 'RB') {
    if (u.carryShare >= 0.6) return 'Lead back';
    if (u.carryShare >= 0.35) return 'Split backfield';
    if (u.targetShare >= 0.1) return 'Passing down back';
    return 'Rotational';
  }
  if (position === 'WR' || position === 'TE') {
    if (u.targetShare >= 0.25) return 'Primary target';
    if (u.targetShare >= 0.15) return 'Second option';
    if (u.snapShare >= 0.6) return 'On the field, not targeted';
    return 'Rotational';
  }
  if (position === 'QB') {
    if (u.snapShare >= 0.9) return u.carryShare >= 0.15 ? 'Starter, runs it' : 'Starter';
    return 'Not the starter';
  }
  return null;
}
