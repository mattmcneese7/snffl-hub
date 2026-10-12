// Insights, as facts. Pure functions over data the caller has already
// fetched: no network, no prose, no rounding for display. Each returns
// structured rows, or an empty answer when the data cannot support the
// insight yet, so the page shows nothing rather than a guess.

import type { DraftPick, Move, Trending } from './sleeper';
import type { NflverseFile } from './nflverse';

// ---------- Draft value ----------

export type DraftValueRow = {
  playerId: string;
  rosterId: number;
  round: number;
  pickNo: number;
  position: string;
  /** He was the Nth player at his position taken. */
  draftedRank: number;
  /** His season points rank at his position, ties sharing a rank. */
  seasonRank: number;
  points: number;
  /** Positive when he has outplayed his draft slot. */
  gain: number;
};

/**
 * Each pick's season points rank at his position against where he went
 * among players at that position.
 *
 * Steals come from anywhere in the draft. Busts only from the early rounds:
 * a thirteenth round flier who never plays has not let anybody down.
 */
export function draftValue(
  picks: DraftPick[],
  points: Record<string, number>,
  pool: { id: string; position: string }[],
  { count = 5, bustRounds = 5 }: { count?: number; bustRounds?: number } = {}
): { steals: DraftValueRow[]; busts: DraftValueRow[] } {
  const positionOf = new Map(pool.map((p) => [p.id, p.position]));

  // Competition ranking within each position: 1, 2, 2, 4.
  const rankOf = new Map<string, number>();
  const byPos = new Map<string, number[]>();
  for (const p of pool) {
    const list = byPos.get(p.position) ?? [];
    list.push(points[p.id] ?? 0);
    byPos.set(p.position, list);
  }
  for (const list of byPos.values()) list.sort((a, b) => b - a);
  for (const p of pool) {
    const list = byPos.get(p.position)!;
    rankOf.set(p.id, list.indexOf(points[p.id] ?? 0) + 1);
  }

  const takenAt = new Map<string, number>();
  const rows: DraftValueRow[] = [];
  for (const pick of picks) {
    // Today's position, so a rank is read in the pool he is ranked in.
    const position = positionOf.get(pick.playerId);
    if (!position) continue;
    const draftedRank = (takenAt.get(position) ?? 0) + 1;
    takenAt.set(position, draftedRank);
    const seasonRank = rankOf.get(pick.playerId);
    if (!seasonRank) continue;
    rows.push({
      playerId: pick.playerId,
      rosterId: pick.rosterId,
      round: pick.round,
      pickNo: pick.pickNo,
      position,
      draftedRank,
      seasonRank,
      points: points[pick.playerId] ?? 0,
      gain: draftedRank - seasonRank,
    });
  }

  const steals = rows
    .filter((r) => r.gain > 0)
    .sort((a, b) => b.gain - a.gain || a.pickNo - b.pickNo)
    .slice(0, count);
  const busts = rows
    .filter((r) => r.gain < 0 && r.round <= bustRounds)
    .sort((a, b) => a.gain - b.gain || a.pickNo - b.pickNo)
    .slice(0, count);
  return { steals, busts };
}

// ---------- Pickups ----------

export type StartedLine = { week: number; rosterId: number; starters: { playerId: string; points: number }[] };

export type PickupRow = {
  rosterId: number;
  adds: number;
  waiverClaims: number;
  freeAgentAdds: number;
  /** Null when the league does not bid, rather than a misleading zero. */
  faabSpent: number | null;
  /** Points his pickups scored in his starting lineup after he added them. */
  startedPoints: number;
  best: { playerId: string; points: number } | null;
};

/**
 * What each manager's waiver claims and free agent adds have been worth to
 * him: started points only, from the week he added the player on.
 */
export function pickupReturn(moves: Move[], lineups: StartedLine[]): PickupRow[] {
  const done = moves.filter((m) => m.status === 'complete' && (m.type === 'waiver' || m.type === 'free_agent'));
  const bidding = done.some((m) => m.waiverBid != null && m.waiverBid > 0);

  const rows = new Map<number, PickupRow>();
  const row = (rosterId: number) => {
    let r = rows.get(rosterId);
    if (!r) {
      r = { rosterId, adds: 0, waiverClaims: 0, freeAgentAdds: 0, faabSpent: bidding ? 0 : null, startedPoints: 0, best: null };
      rows.set(rosterId, r);
    }
    return r;
  };

  /** rosterId|playerId to the first week he added him. */
  const addedFrom = new Map<string, number>();
  for (const m of done) {
    for (const [playerId, rosterId] of Object.entries(m.adds)) {
      const r = row(rosterId);
      r.adds += 1;
      if (m.type === 'waiver') r.waiverClaims += 1;
      else r.freeAgentAdds += 1;
      if (bidding && m.type === 'waiver' && m.waiverBid) r.faabSpent = (r.faabSpent ?? 0) + m.waiverBid;
      const key = `${rosterId}|${playerId}`;
      const prior = addedFrom.get(key);
      if (prior == null || m.week < prior) addedFrom.set(key, m.week);
    }
  }

  const byPlayer = new Map<string, number>();
  for (const line of lineups) {
    for (const s of line.starters) {
      const key = `${line.rosterId}|${s.playerId}`;
      const from = addedFrom.get(key);
      if (from == null || line.week < from) continue;
      row(line.rosterId).startedPoints += s.points;
      byPlayer.set(key, (byPlayer.get(key) ?? 0) + s.points);
    }
  }
  for (const [key, pts] of byPlayer) {
    const [rosterId, playerId] = key.split('|');
    const r = row(Number(rosterId));
    if (!r.best || pts > r.best.points) r.best = { playerId, points: Number(pts.toFixed(2)) };
  }

  return [...rows.values()]
    .map((r) => ({ ...r, startedPoints: Number(r.startedPoints.toFixed(2)) }))
    .filter((r) => r.adds > 0)
    .sort((a, b) => b.startedPoints - a.startedPoints || b.adds - a.adds);
}

// ---------- Usage risers and fallers ----------

export type UsageMove = {
  playerId: string;
  position: string;
  rosterId: number;
  snapNow: number;
  snapBefore: number;
  targetNow: number;
  targetBefore: number;
  /** Games behind each average. */
  gamesNow: number;
  gamesBefore: number;
};

export type UsageMovers = {
  recentWeeks: number[];
  priorWeeks: number[];
  risers: UsageMove[];
  fallers: UsageMove[];
};

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Snap share and target share over the last three weeks with complete snap
 * counts, against every complete week before them, for rostered running
 * backs, receivers and tight ends.
 *
 * A move counts at ten points of snap share or five of target share, the
 * line under which a share is game script rather than a coach's decision.
 * Target share moves count double in the order, because a target is worth
 * more than a snap.
 */
export function usageMovers(
  file: NflverseFile,
  owned: Map<string, number>,
  positionOf: (id: string) => string | null,
  { count = 5, window = 3 }: { count?: number; window?: number } = {}
): UsageMovers | null {
  const weeks = [...file.snapWeeks].sort((a, b) => a - b);
  const recentWeeks = weeks.slice(-window);
  const priorWeeks = weeks.slice(0, -window);
  if (recentWeeks.length < window || !priorWeeks.length) return null;

  const moves: (UsageMove & { score: number })[] = [];
  for (const [playerId, rosterId] of owned) {
    const position = positionOf(playerId);
    if (position !== 'RB' && position !== 'WR' && position !== 'TE') continue;
    const player = file.players[playerId];
    if (!player) continue;
    const games = (ws: number[]) => ws.map((wk) => player.w[String(wk)]).filter((g) => g?.sp != null);
    const now = games(recentWeeks);
    const before = games(priorWeeks);
    if (now.length < 2 || before.length < 1) continue;
    const m = {
      playerId,
      position,
      rosterId,
      snapNow: avg(now.map((g) => g.sp ?? 0)),
      snapBefore: avg(before.map((g) => g.sp ?? 0)),
      targetNow: avg(now.map((g) => g.ts ?? 0)),
      targetBefore: avg(before.map((g) => g.ts ?? 0)),
      gamesNow: now.length,
      gamesBefore: before.length,
    };
    const snapDelta = m.snapNow - m.snapBefore;
    const targetDelta = m.targetNow - m.targetBefore;
    if (Math.abs(snapDelta) < 0.1 && Math.abs(targetDelta) < 0.05) continue;
    moves.push({ ...m, score: snapDelta + 2 * targetDelta });
  }

  const strip = ({ score: _score, ...rest }: UsageMove & { score: number }): UsageMove => rest;
  return {
    recentWeeks,
    priorWeeks,
    risers: moves.filter((m) => m.score > 0).sort((a, b) => b.score - a.score).slice(0, count).map(strip),
    fallers: moves.filter((m) => m.score < 0).sort((a, b) => a.score - b.score).slice(0, count).map(strip),
  };
}

// ---------- Trending free agents ----------

/** Sleeper's most added players right now that nobody in this league has. */
export function trendingFreeAgents(trending: Trending[], owned: Map<string, number>, known: (id: string) => boolean, count = 8): Trending[] {
  return trending.filter((t) => !owned.has(t.playerId) && known(t.playerId)).slice(0, count);
}

// ---------- Luck ----------

export type WeekScore = { week: number; rosterId: number; points: number; opponentPoints: number };

export type LuckRow = {
  rosterId: number;
  wins: number;
  losses: number;
  ties: number;
  allPlayWins: number;
  allPlayLosses: number;
  allPlayTies: number;
  /** Wins his scores would have earned against an average schedule. */
  expectedWins: number;
  /** Actual wins less expected. Positive is lucky. */
  luck: number;
  weeks: number;
};

/**
 * All-play luck: each week, every score against every other score in the
 * league. A team that would have beaten most of the league but lost its one
 * real game was unlucky by most of a win.
 */
export function luck(scores: WeekScore[]): LuckRow[] {
  const weeks = [...new Set(scores.map((s) => s.week))];
  if (weeks.length < 2) return [];
  const rows = new Map<number, LuckRow>();
  const row = (rosterId: number) => {
    let r = rows.get(rosterId);
    if (!r) {
      r = { rosterId, wins: 0, losses: 0, ties: 0, allPlayWins: 0, allPlayLosses: 0, allPlayTies: 0, expectedWins: 0, luck: 0, weeks: 0 };
      rows.set(rosterId, r);
    }
    return r;
  };

  for (const week of weeks) {
    const field = scores.filter((s) => s.week === week);
    if (field.length < 2) continue;
    for (const s of field) {
      const r = row(s.rosterId);
      r.weeks += 1;
      if (s.points > s.opponentPoints) r.wins += 1;
      else if (s.points < s.opponentPoints) r.losses += 1;
      else r.ties += 1;
      let w = 0;
      let t = 0;
      for (const other of field) {
        if (other.rosterId === s.rosterId) continue;
        if (s.points > other.points) w += 1;
        else if (s.points === other.points) t += 1;
      }
      r.allPlayWins += w;
      r.allPlayTies += t;
      r.allPlayLosses += field.length - 1 - w - t;
      r.expectedWins += (w + t / 2) / (field.length - 1);
    }
  }

  return [...rows.values()]
    .map((r) => ({
      ...r,
      expectedWins: Number(r.expectedWins.toFixed(2)),
      luck: Number((r.wins + r.ties / 2 - r.expectedWins).toFixed(2)),
    }))
    .sort((a, b) => b.luck - a.luck || a.rosterId - b.rosterId);
}
