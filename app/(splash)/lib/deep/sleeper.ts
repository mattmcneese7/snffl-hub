// Deeper Sleeper reads for Splash's Insights: the draft, every transaction,
// and what the whole of Sleeper is adding and dropping. Cached through Next's
// fetch cache the same way lib/sleeper.ts is, and a failed call returns an
// empty answer rather than throwing, so one bad endpoint empties one widget.

import { LEAGUE_ID } from '@/lib/sleeper';

const API = 'https://api.sleeper.app/v1';

/** The league's one startup draft, 14 teams by 13 rounds. */
export const DRAFT_ID = '1394336595993182208';

async function get<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(`${API}/${path}`, { next: { revalidate } } as RequestInit);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---------- Draft ----------

export type DraftPick = {
  pickNo: number;
  round: number;
  /** The roster that made the pick. */
  rosterId: number;
  playerId: string;
  /** As Sleeper recorded it on draft day. */
  position: string;
};

type RawPick = {
  pick_no?: number;
  round?: number;
  roster_id?: number;
  player_id?: string;
  metadata?: { position?: string } | null;
};

/** Every pick in order. The draft is over, so a day of cache is plenty. */
export async function getDraftPicks(): Promise<DraftPick[]> {
  const rows = await get<RawPick[]>(`draft/${DRAFT_ID}/picks`, 86400);
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => r.player_id && r.pick_no && r.round && r.roster_id)
    .map((r) => ({
      pickNo: r.pick_no!,
      round: r.round!,
      rosterId: r.roster_id!,
      playerId: r.player_id!,
      position: r.metadata?.position ?? '',
    }))
    .sort((a, b) => a.pickNo - b.pickNo);
}

// ---------- Transactions ----------

export type MoveType = 'waiver' | 'free_agent' | 'trade' | 'commissioner';

export type Move = {
  id: string;
  type: MoveType;
  status: string;
  /** The week it was processed in (Sleeper's leg). */
  week: number;
  /** Epoch milliseconds it was processed. */
  at: number;
  /** playerId to the roster that received him. */
  adds: Record<string, number>;
  /** playerId to the roster that let him go. */
  drops: Record<string, number>;
  rosterIds: number[];
  /** FAAB bid on a waiver claim, when the league runs FAAB. */
  waiverBid: number | null;
  /** Draft picks moved in a trade, as Sleeper sends them. */
  draftPicks: { season: string; round: number; roster_id: number; owner_id: number; previous_owner_id: number }[];
  /** FAAB moved in a trade. */
  budget: { sender: number; receiver: number; amount: number }[];
};

type RawMove = {
  transaction_id?: string;
  type?: string;
  status?: string;
  leg?: number;
  status_updated?: number;
  created?: number;
  adds?: Record<string, number> | null;
  drops?: Record<string, number> | null;
  roster_ids?: number[] | null;
  settings?: { waiver_bid?: number } | null;
  draft_picks?: Move['draftPicks'] | null;
  waiver_budget?: Move['budget'] | null;
};

const TYPES = new Set<MoveType>(['waiver', 'free_agent', 'trade', 'commissioner']);

/** Every transaction from week 1 through the given week, oldest first. */
export async function getMoves(throughWeek: number): Promise<Move[]> {
  const weeks = Array.from({ length: Math.max(0, throughWeek) }, (_, i) => i + 1);
  const perWeek = await Promise.all(
    weeks.map(async (week) => ({ week, rows: (await get<RawMove[]>(`league/${LEAGUE_ID}/transactions/${week}`, 300)) ?? [] }))
  );
  const out: Move[] = [];
  for (const { week, rows } of perWeek) {
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      if (!r?.transaction_id || !TYPES.has(r.type as MoveType)) continue;
      const bid = r.settings?.waiver_bid;
      out.push({
        id: r.transaction_id,
        type: r.type as MoveType,
        status: r.status ?? '',
        week: r.leg ?? week,
        at: r.status_updated ?? r.created ?? 0,
        adds: r.adds ?? {},
        drops: r.drops ?? {},
        rosterIds: r.roster_ids ?? [],
        waiverBid: typeof bid === 'number' ? bid : null,
        draftPicks: r.draft_picks ?? [],
        budget: r.waiver_budget ?? [],
      });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

// ---------- Trending ----------

export type Trending = { playerId: string; count: number };

/** What managers across every Sleeper league added or dropped lately. */
export async function getTrending(kind: 'add' | 'drop', hours = 24, limit = 25): Promise<Trending[]> {
  const rows = await get<{ player_id?: string; count?: number }[]>(
    `players/nfl/trending/${kind}?lookback_hours=${hours}&limit=${limit}`,
    1800
  );
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => r.player_id && typeof r.count === 'number')
    .map((r) => ({ playerId: r.player_id!, count: r.count! }));
}
