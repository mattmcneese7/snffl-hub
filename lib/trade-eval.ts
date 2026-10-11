// The trade evaluator. Checkpoint 18, built into the Swami.
//
// Raw points are the number every trade calculator leads with, and it is the
// wrong one. A third receiver to a team already starting three good ones is
// worth whatever he scores in the weeks somebody is on a bye, which is close
// to nothing. So this leads with what each side's best lineup gains or loses,
// week by week across the rest of the season, and shows the raw totals beside
// it so the gap between the two is visible when there is one.
//
// The verdict is arithmetic, not taste. Under a point a week either way is
// called even, because a single player's weekly projection misses by about
// five points on average (the model's own backtest), so a smaller gap than
// that is not something this can honestly tell apart from nothing.

import { firstNameOf } from '../config/managers.ts';
import { teamByRoster } from './league.ts';
import {
  lineupByWeek,
  pick,
  round1,
  sumTotals,
  weeksIn,
  windowLabel,
  type RosContext,
  type RosRead,
} from './rest-of-season.ts';

/** Projected points a week, either way, below which a lineup has not moved. */
export const EVEN_PER_WEEK = 1;

export type TradeSide = {
  rosterId: number;
  manager: string;
  teamName: string;
  sends: RosRead[];
  gets: RosRead[];
  /** Best lineup over the window, before and after. */
  before: number;
  after: number;
  delta: number;
  perWeek: number;
  byWeek: { week: number; before: number; after: number }[];
  /** Rest of season points of the players coming in and going out, read players only. */
  rawGets: number;
  rawSends: number;
  /** Roster spots gained, so a 2 for 1 shows as a drop owed. */
  rosterChange: number;
};

export type TradeCall = 'a' | 'b' | 'both' | 'neither' | 'even';

export type TradeEval = {
  a: TradeSide;
  b: TradeSide;
  call: TradeCall;
  verdict: string;
  /** A second sentence, only when raw points and the lineups disagree. */
  rawNote: string | null;
  /** Players in the deal with no read, which the totals leave at zero. */
  unread: RosRead[];
  window: string;
  weeks: number;
};

const sum = (reads: RosRead[]) =>
  round1(reads.reduce((s, r) => s + (r.total ?? 0), 0));
const pts = (n: number) => Math.abs(n).toFixed(1);
const signed = (n: number) => `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(1)}`;

function side(
  rosterId: number,
  roster: string[],
  sends: string[],
  gets: string[],
  readOf: (id: string) => RosRead,
  ctx: RosContext
): TradeSide {
  const team = teamByRoster(rosterId);
  const beforeReads = roster.map(readOf);
  const afterIds = [...roster.filter((id) => !sends.includes(id)), ...gets];
  const before = lineupByWeek(beforeReads, ctx);
  const after = lineupByWeek(afterIds.map(readOf), ctx);
  const b = sumTotals(before);
  const a = sumTotals(after);
  const delta = round1(a - b);
  const weeks = weeksIn(ctx);
  return {
    rosterId,
    manager: firstNameOf(rosterId) ?? team?.manager ?? `Team ${rosterId}`,
    teamName: team?.teamName ?? `Team ${rosterId}`,
    sends: sends.map(readOf),
    gets: gets.map(readOf),
    before: b,
    after: a,
    delta,
    perWeek: weeks ? Math.round((delta / weeks) * 100) / 100 : 0,
    byWeek: before.map((w, i) => ({ week: w.week, before: w.total, after: after[i].total })),
    rawGets: sum(gets.map(readOf)),
    rawSends: sum(sends.map(readOf)),
    rosterChange: gets.length - sends.length,
  };
}

export function evaluateTrade(input: {
  a: { rosterId: number; roster: string[]; sends: string[] };
  b: { rosterId: number; roster: string[]; sends: string[] };
  readOf: (id: string) => RosRead;
  ctx: RosContext;
}): TradeEval {
  const { readOf, ctx } = input;
  const A = side(input.a.rosterId, input.a.roster, input.a.sends, input.b.sends, readOf, ctx);
  const B = side(input.b.rosterId, input.b.roster, input.b.sends, input.a.sends, readOf, ctx);
  const window = windowLabel(ctx);
  const seed = `${[...input.a.sends, ...input.b.sends].sort().join(',')}:${ctx.week}`;

  const up = (s: TradeSide) => s.perWeek >= EVEN_PER_WEEK;
  const down = (s: TradeSide) => s.perWeek <= -EVEN_PER_WEEK;
  const moved = (s: TradeSide) =>
    `${s.manager}'s lineup ${s.delta >= 0 ? 'gains' : 'loses'} ${pts(s.delta)} (${signed(s.perWeek)} a week)`;

  let call: TradeCall;
  let verdict: string;
  if (up(A) && up(B)) {
    call = 'both';
    verdict = pick(
      [
        `The unicorn: a trade that helps both lineups. ${moved(A)}, ${moved(B)}, over ${window}.`,
        `Everybody wins, on paper. ${moved(A)} and ${moved(B)} across ${window}.`,
      ],
      seed
    );
  } else if (up(A) || up(B)) {
    const [w, l] = up(A) ? [A, B] : [B, A];
    call = up(A) ? 'a' : 'b';
    const loser = down(l)
      ? `${l.manager}'s loses ${pts(l.delta)} (${signed(l.perWeek)} a week)`
      : `${l.manager}'s moves ${signed(l.delta)}, which is nothing`;
    verdict = pick(
      [
        `${w.manager} wins this. His best lineup gains ${pts(w.delta)} over ${window} (${signed(w.perWeek)} a week) and ${loser}.`,
        `Lineup math says ${w.manager}: ${signed(w.delta)} over ${window}, ${signed(w.perWeek)} a week. ${loser.charAt(0).toUpperCase()}${loser.slice(1)}.`,
        `${l.manager} should read this twice. ${w.manager} comes out ${signed(w.delta)} over ${window} and ${loser}.`,
      ],
      seed
    );
  } else if (down(A) && down(B)) {
    call = 'neither';
    verdict = pick(
      [
        `Both lineups get worse. ${moved(A)}, ${moved(B)}. A trade for the sake of a notification.`,
        `Somehow a loss for everyone: ${moved(A)} and ${moved(B)} over ${window}.`,
      ],
      seed
    );
  } else if (down(A) || down(B)) {
    const [l, o] = down(A) ? [A, B] : [B, A];
    call = down(A) ? 'b' : 'a';
    verdict = `${l.manager} loses this without ${o.manager} gaining much: ${moved(l)}, while ${o.manager}'s moves ${signed(o.delta)} over ${window}.`;
  } else {
    call = 'even';
    verdict = pick(
      [
        `A wash. Neither lineup moves a point a week: ${A.manager} ${signed(A.delta)}, ${B.manager} ${signed(B.delta)} over ${window}.`,
        `Two managers shuffling deck chairs. ${A.manager} ${signed(A.delta)}, ${B.manager} ${signed(B.delta)} across ${window}, under a point a week each.`,
      ],
      seed
    );
  }

  // The interesting case: one side takes more raw points and still does worse,
  // because they land on its bench. Only said when it is true.
  let rawNote: string | null = null;
  const rawEdgeA = A.rawGets - B.rawGets;
  const lineupEdgeA = A.delta - B.delta;
  if (Math.abs(rawEdgeA) >= 1 && Math.abs(lineupEdgeA) >= 1 && Math.sign(rawEdgeA) !== Math.sign(lineupEdgeA)) {
    const [rawWinner, other] = rawEdgeA > 0 ? [A, B] : [B, A];
    rawNote = `On raw points ${rawWinner.manager} takes more, ${pts(rawWinner.rawGets)} to ${pts(other.rawGets)}. Lineups are what score, and there ${other.manager} comes out ${pts(other.delta - rawWinner.delta)} ahead.`;
  }

  const unread = [...A.sends, ...B.sends].filter((r) => r.noRead);

  return { a: A, b: B, call, verdict, rawNote, unread, window, weeks: weeksIn(ctx) };
}
