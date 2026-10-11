// Waiver suggestions. Checkpoint 18, built into the Swami.
//
// "Best available" ranked by projected points is a list of players nobody
// needs: the top free agent receiver is no use to a team whose fourth receiver
// already outscores him. So a pickup is ranked by what it adds to one team's
// best lineup, which is the same exact lineup arithmetic the trade evaluator
// runs, and the slot it fills is named along with the starter it pushes out.
//
// Usage is shown, not multiplied in. The model already reads recent snap and
// target share as features, so scaling its projection again by a trend would
// count the same evidence twice with a weight nobody calibrated. The trend
// sits beside the number so a reader can see a role growing before the
// projection catches up, and decide for himself.

import { firstNameOf } from '../config/managers.ts';
import { teamByRoster } from './league.ts';
import {
  bestLineup,
  lineupByWeek,
  pick,
  round1,
  sumTotals,
  typicalLineup,
  windowLabel,
  type FilledSlot,
  type RosContext,
  type RosRead,
} from './rest-of-season.ts';
import { usageFor, usageTrend, type UsageEntry } from './spine.ts';

/** How many free agents per position are worth running the lineup math on. */
const CANDIDATES_PER_POS = 30;

export type WaiverPick = {
  read: RosRead;
  /** Lineup gain over the whole window, byes and matchups included. */
  rosGain: number;
  /** Lineup gain in a typical week, at per game rates. */
  perGame: number;
  /** The starter he pushes out of a typical week's lineup, and from which slot. */
  replaces: { read: RosRead; slot: string } | null;
  /** This week's lineup gain. Null when his game has kicked off or he has none. */
  thisWeek: number | null;
  usage: UsageEntry | null;
  trend: ReturnType<typeof usageTrend>;
};

export type TeamWaivers = {
  rosterId: number;
  manager: string;
  teamName: string;
  /** The typical week lineup, slot by slot, which is what a pickup is measured against. */
  lineup: (FilledSlot & { read: RosRead | null })[];
  picks: WaiverPick[];
  /** The headline, with its numbers. Null when nothing on the wire helps. */
  line: string | null;
  window: string;
};

export type LeagueWaiver = {
  read: RosRead;
  /** Teams whose typical lineup he would start in. */
  startsFor: number;
  /** Mean lineup gain over the window across all fourteen teams, zeros included. */
  meanGain: number;
  /** The team he helps most, and by how much. */
  best: { rosterId: number; manager: string; gain: number } | null;
  usage: UsageEntry | null;
  trend: ReturnType<typeof usageTrend>;
};

/** The free agents worth testing: best per game rate first, a cap per position. */
export function candidatePool(reads: RosRead[], pos: string | null): RosRead[] {
  const byPos = new Map<string, RosRead[]>();
  for (const r of reads) {
    if (r.noRead || !r.rate || r.rate <= 0) continue;
    if (pos && r.player.position !== pos) continue;
    const list = byPos.get(r.player.position) ?? [];
    list.push(r);
    byPos.set(r.player.position, list);
  }
  return [...byPos.values()].flatMap((list) =>
    list.sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0)).slice(0, CANDIDATES_PER_POS)
  );
}

const thisWeekValue = (r: RosRead) => (r.thisWeekLocked ? 0 : (r.thisWeek ?? 0));

export function waiversForTeam(input: {
  rosterId: number;
  roster: RosRead[];
  pool: RosRead[];
  ctx: RosContext;
  limit?: number;
}): TeamWaivers {
  const { rosterId, roster, pool, ctx } = input;
  const team = teamByRoster(rosterId);
  const manager = firstNameOf(rosterId) ?? team?.manager ?? `Team ${rosterId}`;
  const window = windowLabel(ctx);

  const baseWeeks = lineupByWeek(roster, ctx);
  const base = sumTotals(baseWeeks);
  const typical = typicalLineup(roster);
  const thisWeekBase = bestLineup(
    roster.map((r) => ({ id: r.player.id, position: r.player.position, points: thisWeekValue(r) }))
  ).total;
  const byId = new Map(roster.map((r) => [r.player.id, r]));

  const picks: WaiverPick[] = [];
  for (const cand of pool) {
    const withHim = [...roster, cand];
    const rosGain = round1(sumTotals(lineupByWeek(withHim, ctx)) - base);
    const t = typicalLineup(withHim);
    const perGame = round1(t.total - typical.total);
    if (rosGain <= 0 && perGame <= 0) continue;

    // Who he pushes out: whoever started the typical week before and does not
    // now. With FLEX in the mix that can be a different position from his, a
    // receiver bumping a back out of FLEX, and naming it is the useful part.
    const after = new Set(t.filled.map((f) => f.id));
    const outSlot = typical.filled.find((f) => f.id && !after.has(f.id));
    const replaces =
      outSlot?.id && byId.get(outSlot.id)
        ? { read: byId.get(outSlot.id)!, slot: outSlot.slot }
        : null;

    let thisWeek: number | null = null;
    if (!cand.thisWeekLocked && cand.thisWeek != null && ctx.from === ctx.week) {
      const withThis = bestLineup(
        withHim.map((r) => ({ id: r.player.id, position: r.player.position, points: thisWeekValue(r) }))
      ).total;
      thisWeek = round1(withThis - thisWeekBase);
    }

    picks.push({
      read: cand,
      rosGain,
      perGame,
      replaces,
      thisWeek,
      usage: usageFor(cand.player.id),
      trend: usageTrend(cand.player.id),
    });
  }
  picks.sort((a, b) => b.rosGain - a.rosGain || b.perGame - a.perGame);
  const top = picks.slice(0, input.limit ?? 12);

  const lineup = typical.filled.map((f) => ({ ...f, read: f.id ? (byId.get(f.id) ?? null) : null }));

  let line: string | null = null;
  const lead = top[0];
  if (lead) {
    const name = lead.read.player.name;
    const seed = `${rosterId}:${lead.read.player.id}:${ctx.week}`;
    if (lead.replaces && lead.perGame > 0) {
      const who = lead.replaces.read.player.name;
      const rate = (lead.replaces.read.rate ?? 0).toFixed(1);
      line = pick(
        [
          `${manager}'s softest spot is ${lead.replaces.slot}, where ${who} is good for ${rate} a game. ${name} is sitting on the wire at ${(lead.read.rate ?? 0).toFixed(1)}, which is +${lead.perGame.toFixed(1)} a game and +${lead.rosGain.toFixed(1)} over ${window} once byes and matchups are counted.`,
          `${manager} is starting ${who} at ${lead.replaces.slot} for ${rate} a game while ${name} goes unclaimed at ${(lead.read.rate ?? 0).toFixed(1)}. That is +${lead.rosGain.toFixed(1)} over ${window}, free.`,
          `Free points, ${manager}: ${name} over ${who} at ${lead.replaces.slot} is +${lead.perGame.toFixed(1)} a game, +${lead.rosGain.toFixed(1)} across ${window}.`,
        ],
        seed
      );
    } else {
      // He never beats a starter in a typical week. What he adds comes from
      // single weeks where a starter scores nothing or less than him, and the
      // only things that make that happen here are a bye, a starter out, or
      // a worse matchup, so that is exactly what the sentence says.
      line = `${manager}'s lineup has no weak slot the wire can fix in a typical week. The best spot starter is ${name}, worth +${lead.rosGain.toFixed(1)} over ${window}, from weeks a starter is on a bye, out, or in a worse matchup.`;
    }
  }

  return {
    rosterId,
    manager,
    teamName: team?.teamName ?? `Team ${rosterId}`,
    lineup,
    picks: top,
    line,
    window,
  };
}

export function waiversLeagueWide(input: {
  rosters: { rosterId: number; reads: RosRead[] }[];
  pool: RosRead[];
  ctx: RosContext;
  limit?: number;
}): { picks: LeagueWaiver[]; line: string | null; window: string } {
  const { rosters, pool, ctx } = input;
  const window = windowLabel(ctx);
  const bases = rosters.map((r) => ({
    ...r,
    base: sumTotals(lineupByWeek(r.reads, ctx)),
    typical: typicalLineup(r.reads).total,
  }));

  const picks: LeagueWaiver[] = pool.map((cand) => {
    let startsFor = 0;
    let total = 0;
    let best: LeagueWaiver['best'] = null;
    for (const team of bases) {
      const withHim = [...team.reads, cand];
      const gain = sumTotals(lineupByWeek(withHim, ctx)) - team.base;
      if (typicalLineup(withHim).total - team.typical > 0) startsFor++;
      total += gain;
      if (gain > 0 && (!best || gain > best.gain)) {
        best = {
          rosterId: team.rosterId,
          manager: firstNameOf(team.rosterId) ?? teamByRoster(team.rosterId)?.manager ?? '',
          gain: round1(gain),
        };
      }
    }
    return {
      read: cand,
      startsFor,
      meanGain: bases.length ? Math.round((total / bases.length) * 100) / 100 : 0,
      best,
      usage: usageFor(cand.player.id),
      trend: usageTrend(cand.player.id),
    };
  });

  const ranked = picks
    .filter((p) => p.meanGain > 0)
    .sort((a, b) => b.meanGain - a.meanGain || b.startsFor - a.startsFor)
    .slice(0, input.limit ?? 15);

  const lead = ranked[0];
  const line = lead
    ? pick(
        [
          `Best thing on the wire: ${lead.read.player.name}, who would start for ${lead.startsFor} of ${bases.length} teams in a normal week and adds ${lead.meanGain.toFixed(1)} over ${window} to the average lineup.`,
          `${lead.read.player.name} is unclaimed and would crack ${lead.startsFor} of ${bases.length} starting lineups. Worth ${lead.meanGain.toFixed(1)} over ${window} to the average team${lead.best ? `, ${lead.best.gain.toFixed(1)} to ${lead.best.manager}` : ''}.`,
        ],
        `${lead.read.player.id}:${ctx.week}`
      )
    : null;

  return { picks: ranked, line, window };
}
