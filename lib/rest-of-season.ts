// Rest of season value, for the trade evaluator and the waiver board.
//
// The model projects one week. A trade or a pickup is a bet on every week a
// player has left, so this carries one week's number across the rest of his
// schedule, and the way it does that is the whole method, so it is written
// out here rather than discovered.
//
//   1. Take this week's projection on this league's rules: the model's where
//      it is current and has him, Sleeper's scored by our engine otherwise.
//      That is his per game rate. It is not adjusted for this week's
//      opponent first, because neither source prices our defence ratings:
//      measured, not assumed, and written up in DECISIONS.md.
//   2. For each remaining week, multiply the rate by that week's defence
//      factor, at the same damping the outlook card uses. A bye scores zero,
//      because it does.
//   3. The current week, when it is still to play, uses this week's own
//      number instead, the same one the research table shows.
//      A player out now, or on a bye, takes his rate from the first of the
//      next two weeks Sleeper projects him for, and counts zero until then.
//   4. Stop at the last fantasy week, or at the last week the stored schedule
//      reaches if that comes first, and say which.
//
// What it does not know, and says so wherever the number is shown: injuries
// that have not happened, depth charts that have not changed, and anything
// about a player hurt now beyond what Sleeper projects for the next two
// weeks. A player listed out with no projection in that span gets no read at
// all, never a guessed return date.
//
// The lineup half is the part that makes it a decision tool rather than a
// ranking. Adding a player is only worth what he adds to the best lineup a
// team can field, week by week, byes included, and that is computed exactly
// rather than estimated.

import { lastFantasyWeek, STARTER_SLOTS } from './league.ts';
import { modelFor } from './model.ts';
import { WEIGHT } from './outlook.ts';
import type { ProjectionDetail } from './projections.ts';
import { dvpConfidence, dvpFor, fixturesFor, scheduleThrough, type Pos } from './spine.ts';
import type { PlayerLite } from './types.ts';

/** Designations that mean he is not playing this week. Questionable plays. */
export const SITTING = new Set(['Out', 'Doubtful', 'IR', 'Sus', 'PUP', 'NA', 'DNR']);

const POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']);

/** Which positions each starting slot accepts. A slot not listed takes its own name. */
const SLOT_TAKES: Record<string, string[]> = {
  FLEX: ['RB', 'WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
  REC_FLEX: ['WR', 'TE'],
  WRRB_FLEX: ['WR', 'RB'],
};

export const slotTakes = (slot: string, position: string) =>
  slot === position || (SLOT_TAKES[slot]?.includes(position) ?? false);

export type RosWeek = {
  week: number;
  /** Null on a bye. */
  opponent: string | null;
  home: boolean;
  /** The damped defence multiplier applied this week, 1 on a bye. */
  factor: number;
  points: number;
  /** He has a game but is not projected to be back for it yet. */
  out: boolean;
};

export type RosRead = {
  player: PlayerLite;
  /** Sleeper's designation from this week's feed, else the nightly file's. */
  status: string | null;
  /** Where the per game number came from. */
  source: 'model' | 'sleeper' | null;
  /** This week's projection, matchup applied. Zero when he is not playing, null on a bye. */
  thisWeek: number | null;
  /** His NFL game this week has already kicked off. */
  thisWeekLocked: boolean;
  /** Per game, before any week's defence is applied. Null when there is no read. */
  rate: number | null;
  /**
   * The projection the rate was taken from, so the working can be shown. Its
   * week is also his first counted game: anything before it he is out for.
   */
  basis: { week: number; points: number } | null;
  /** Every week in the window, byes and weeks out included as zero. */
  weeks: RosWeek[];
  /** Sum of `weeks`. Null when there is no read. */
  total: number | null;
  games: number;
  byes: number[];
  /** Why there is no number, in a few words. Null when there is one. */
  noRead: string | null;
};

/** How far ahead to look for a player's next projected game. */
export const LOOK_AHEAD = 2;

export type RosContext = {
  /** The league's current week. */
  week: number;
  /**
   * Sleeper's projections for this week and the LOOK_AHEAD weeks after it,
   * scored on this league's rules, keyed by week.
   */
  sleeper: Record<number, ProjectionDetail>;
  /** NFL teams whose game this week has kicked off. */
  started: Set<string>;
  /** First and last week the rest of season counts. */
  from: number;
  through: number;
  /** How far the stored schedule reaches, which can be short of the season. */
  scheduleThrough: number;
  lastWeek: number;
  weight: number;
  confidence: ReturnType<typeof dvpConfidence>;
};

/**
 * The window everything is valued over.
 *
 * Once any game of the current week has kicked off, the current week is out:
 * a trade or a pickup cannot reach back into a slate already under way, and
 * counting half a week for some players and not others would make two sides
 * of a trade incomparable. Before kickoff it is in.
 */
export function rosContext(input: {
  week: number;
  sleeper: Record<number, ProjectionDetail>;
  started: Set<string>;
}): RosContext {
  const confidence = dvpConfidence();
  const lastWeek = lastFantasyWeek();
  const known = scheduleThrough();
  const from = input.started.size ? input.week + 1 : input.week;
  return {
    ...input,
    from,
    through: Math.min(lastWeek, known),
    scheduleThrough: known,
    lastWeek,
    weight: WEIGHT[confidence],
    confidence,
  };
}

/** The damped multiplier for a defence, floored so a rate can never blow up. */
function factorFor(opponent: string, position: string, weight: number): number {
  if (!POSITIONS.has(position)) return 1;
  const vs = dvpFor(opponent, position as Pos)?.vsAverage ?? 1;
  return Math.max(0.25, 1 + (vs - 1) * weight);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
/**
 * Every figure on screen is a tenth, so every figure is held as a tenth: the
 * rate, each week's points, and each total as a sum of those. Rounding only at
 * display let a lineup read "1130.0 now, 1147.8 after" beside a gain of 17.7,
 * which is the kind of number nobody should be able to catch out.
 */
export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Everything this module can say about one player's rest of season. */
export function rosRead(player: PlayerLite, ctx: RosContext): RosRead {
  const status = ctx.sleeper[ctx.week]?.[player.id]?.injury ?? player.injuryStatus ?? null;
  const empty = (noRead: string): RosRead => ({
    player,
    status,
    source: null,
    thisWeek: null,
    thisWeekLocked: false,
    rate: null,
    basis: null,
    weeks: [],
    total: null,
    games: 0,
    byes: [],
    noRead,
  });

  const team = player.team;
  if (!team) return empty('No NFL team');
  if (!POSITIONS.has(player.position)) return empty('Not a fantasy position');

  const fixtures = fixturesFor(team);
  const fixtureIn = (week: number) => fixtures.find((f) => f.week === week) ?? null;
  const current = fixtureIn(ctx.week);
  const sitting = SITTING.has(status ?? '');
  const locked = ctx.started.has(team);
  const row = (week: number) => ctx.sleeper[week]?.[player.id] ?? null;

  // The per game rate is a projection taken as it stands, not one with its
  // week's defence divided out. Measured before choosing: neither source
  // prices our defence ratings (see DECISIONS.md), so dividing by them would
  // invent a correction, and the first build that did it turned a 7.9 point
  // defence into an 11.3 point one.
  //
  // This week's number comes first: the model's where it is current and has
  // him, Sleeper's otherwise. The model does not read the injury report, so a
  // man listed out never takes it. Failing that, the first of the next
  // LOOK_AHEAD weeks Sleeper projects him for, which is where a bye or a
  // return from injury shows up, and the weeks before it count as zero.
  const m = current && !sitting ? modelFor(player.id) : null;
  let rate: number | null = null;
  let basis: RosRead['basis'] = null;
  let source: RosRead['source'] = null;
  if (m && m.proj > 0) {
    rate = round1(m.proj);
    source = 'model';
    basis = { week: ctx.week, points: rate };
  } else {
    for (let week = ctx.week; week <= ctx.week + LOOK_AHEAD; week++) {
      const r = row(week);
      if (fixtureIn(week) && r?.projected && r.points > 0) {
        rate = round1(r.points);
        source = 'sleeper';
        basis = { week, points: rate };
        break;
      }
    }
  }

  if (rate == null) {
    if (sitting) {
      return {
        ...empty(
          `Listed ${status}, and Sleeper projects no game for him in the next ${LOOK_AHEAD + 1} weeks`
        ),
        thisWeek: current ? 0 : null,
        thisWeekLocked: locked,
      };
    }
    const projectedZero =
      (m && m.proj <= 0) ||
      Array.from({ length: LOOK_AHEAD + 1 }, (_, k) => row(ctx.week + k)).some((r) => r?.projected);
    if (!projectedZero) return empty('Not projected by the model or Sleeper');
    // Projected, for nothing. That is a real number, and it is zero.
    rate = 0;
    source = m ? 'model' : 'sleeper';
  }

  const returns = basis?.week ?? ctx.week;

  // This week's figure, the same one the research table and the outlook card
  // show: the model's as it stands, since it already reads this game's line,
  // Sleeper's with the damped defence applied, and zero for a man not
  // projected to play it.
  const thisWeek = !current
    ? null
    : returns > ctx.week
      ? 0
      : source === 'model'
        ? rate
        : round1(rate * round2(factorFor(current.opponent, player.position, ctx.weight)));

  const weeks: RosWeek[] = [];
  const byes: number[] = [];
  for (let week = ctx.from; week <= ctx.through; week++) {
    const f = fixtureIn(week);
    if (!f) {
      byes.push(week);
      weeks.push({ week, opponent: null, home: false, factor: 1, points: 0, out: false });
      continue;
    }
    // The factor is held at the two places it is shown to, so the working on
    // screen (rate times factor) reproduces each week's points exactly.
    const factor = round2(factorFor(f.opponent, player.position, ctx.weight));
    const out = week < returns;
    const points = out ? 0 : week === ctx.week && thisWeek != null ? thisWeek : round1(rate * factor);
    weeks.push({ week, opponent: f.opponent, home: f.home, factor, points, out });
  }

  const total = round1(weeks.reduce((sum, w) => sum + w.points, 0));
  return {
    player,
    status,
    source,
    thisWeek,
    thisWeekLocked: locked,
    rate,
    basis,
    weeks,
    total,
    games: weeks.filter((w) => w.opponent && !w.out).length,
    byes,
    noRead: null,
  };
}

export type LineupEntry = { id: string; position: string; points: number };
export type FilledSlot = { slot: string; id: string | null; points: number };

/**
 * The best lineup a set of players can field, given a value for each.
 *
 * Fills the most restrictive slots first, each with the best player it takes
 * who is still free. For this league's shape (one position slots, then FLEX
 * over RB, WR and TE) that is exactly optimal: anyone a FLEX would rather have
 * is still free for it, because a single position slot only ever took the
 * best at its own position. An empty slot scores zero, as it does in Sleeper.
 */
export function bestLineup(entries: LineupEntry[], slots: string[] = STARTER_SLOTS) {
  const order = slots
    .map((slot, index) => ({ slot, index, breadth: SLOT_TAKES[slot]?.length ?? 1 }))
    .sort((a, b) => a.breadth - b.breadth || a.index - b.index);
  const pool = [...entries].sort((a, b) => b.points - a.points);
  const used = new Set<string>();
  const filled: FilledSlot[] = new Array(slots.length);
  for (const { slot, index } of order) {
    const pick = pool.find((e) => !used.has(e.id) && slotTakes(slot, e.position));
    if (pick) used.add(pick.id);
    filled[index] = { slot, id: pick?.id ?? null, points: pick?.points ?? 0 };
  }
  const total = round1(filled.reduce((sum, f) => sum + f.points, 0));
  return { total, filled };
}

/** A roster's best lineup in every week of the window. */
export function lineupByWeek(reads: RosRead[], ctx: RosContext) {
  const out: { week: number; total: number; filled: FilledSlot[] }[] = [];
  for (let week = ctx.from; week <= ctx.through; week++) {
    const entries = reads.map((r) => ({
      id: r.player.id,
      position: r.player.position,
      points: r.weeks.find((w) => w.week === week)?.points ?? 0,
    }));
    out.push({ week, ...bestLineup(entries) });
  }
  return out;
}

/** The best lineup at per game rates: a typical week, byes and matchups aside. */
export function typicalLineup(reads: RosRead[]) {
  return bestLineup(
    reads.map((r) => ({ id: r.player.id, position: r.player.position, points: r.rate ?? 0 }))
  );
}

export const sumTotals = (weeks: { total: number }[]) =>
  round1(weeks.reduce((sum, w) => sum + w.total, 0));

/** "weeks 6 to 17", or "week 17" when the window is one week. */
export function windowLabel(ctx: RosContext): string {
  if (ctx.through < ctx.from) return 'no weeks left';
  return ctx.from === ctx.through ? `week ${ctx.from}` : `weeks ${ctx.from} to ${ctx.through}`;
}

export const weeksIn = (ctx: RosContext) => Math.max(0, ctx.through - ctx.from + 1);

/**
 * Same phrasing for the same subject in the same week, different across
 * subjects, so a board of these does not read as one template repeated.
 * The same scheme Squirt Says uses.
 */
export function pick<T>(options: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return options[hash % options.length];
}
