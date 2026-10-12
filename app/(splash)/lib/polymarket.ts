// Polymarket's prices on NFL games, read straight from its public Gamma API.
// No key and no credits, so unlike The Odds API snapshot this is read at
// request time and kept for 2 minutes, live games included.
//
// Two reads, both small enough for the fetch cache: the week's moneyline
// markets (one a game, which also gives each game's event slug), then the
// one event per game that the page needs, for its spread and total ladders.
// The whole NFL series in one call is about 30 MB, so it is never read.
//
// Games are matched to ESPN's by team nickname and kickoff, never by
// Polymarket's slug abbreviations (it writes the Rams as "la"). Nothing here
// throws: anything missing or malformed is simply not there.

import type { NflGame } from '@/lib/gameday';
import { nflTeamName } from '../kit/nflTeams';

const GAMMA = 'https://gamma-api.polymarket.com';
/** Seconds a read is reused. */
export const POLY_REVALIDATE = 120;
/** Polymarket's NFL tag. */
const NFL_TAG = 450;
/** The same game within this long of ESPN's kickoff. */
const WINDOW = 18 * 3_600_000;
/** A main line priced further from even than this is not a main line. */
const MAIN_BAND = 0.15;

type RawMarket = {
  slug?: string;
  question?: string;
  sportsMarketType?: string;
  outcomes?: string;
  outcomePrices?: string;
  line?: number | string | null;
  active?: boolean;
  closed?: boolean;
  bestBid?: number | null;
  bestAsk?: number | null;
  endDate?: string;
  gameStartTime?: string;
  updatedAt?: string;
  volumeNum?: number;
};

type RawEvent = { slug?: string; volume?: number | string | null; updatedAt?: string; markets?: RawMarket[] };

/** A price, 0 to 1. */
type P = number;

export type PolyGame = {
  slug: string;
  /** Dollars traded on the game's event, every market in it. */
  volume: number | null;
  updated: string | null;
  /** Win prices, Polymarket's midpoint, 0 to 1. */
  win: { home: P; away: P } | null;
  /** What a share of each side costs to buy now: the best ask. */
  winAsk: { home: P | null; away: P | null } | null;
  /** The main spread, as the home side's number, with each side's ask. */
  spread: { home: number; homePrice: P | null; awayPrice: P | null } | null;
  /** The main total, with the ask on each side. */
  total: { points: number; overPrice: P | null; underPrice: P | null } | null;
};

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

function list(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v !== 'string') return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

const isPrice = (v: number | null): v is number => v != null && v > 0 && v < 1;

/**
 * The cost of each outcome right now: the first outcome's best ask, and the
 * second's, which is one minus the first's best bid. Null where the book is
 * empty on that side.
 */
function asks(m: RawMarket): [P | null, P | null] {
  const ask = num(m.bestAsk);
  const bid = num(m.bestBid);
  return [isPrice(ask) ? ask : null, isPrice(bid) ? Number((1 - bid).toFixed(4)) : null];
}

/** "Rams" from "LAR": the last word of the full name, which is what Polymarket writes. */
const nickname = (abbr: string) => nflTeamName(abbr).split(' ').pop()!.toLowerCase();

/** Which side of this ESPN game a Polymarket outcome name is. */
function sideOf(name: string, game: NflGame): 'home' | 'away' | null {
  const n = name.trim().toLowerCase();
  if (n === nickname(game.home.abbr) || n === nflTeamName(game.home.abbr).toLowerCase()) return 'home';
  if (n === nickname(game.away.abbr) || n === nflTeamName(game.away.abbr).toLowerCase()) return 'away';
  return null;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${GAMMA}${path}`, { next: { revalidate: POLY_REVALIDATE } } as RequestInit);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * The open NFL game moneylines kicking off from 8 hours ago (live games) to
 * 10 days out. The window is rounded to the hour so the URL, and with it the
 * cache entry, holds still.
 */
async function readIndex(): Promise<RawMarket[]> {
  const hour = 3_600_000;
  const from = new Date(Math.floor((Date.now() - 8 * hour) / hour) * hour).toISOString();
  const to = new Date(Math.floor((Date.now() + 240 * hour) / hour) * hour).toISOString();
  const q = `sports_market_types=moneyline&tag_id=${NFL_TAG}&closed=false&limit=100&end_date_min=${from}&end_date_max=${to}`;
  const rows = await getJson<RawMarket[]>(`/markets?${q}`);
  return Array.isArray(rows) ? rows.filter((m) => m.sportsMarketType === 'moneyline' && typeof m.slug === 'string') : [];
}

/** The index entry for an ESPN game: both nicknames in "Bills vs. Rams", kickoff close. */
function findSlug(game: NflGame, index: RawMarket[]): string | null {
  const kick = Date.parse(game.kickoff);
  for (const m of index) {
    const teams = (m.question ?? '').split(/\s+vs\.?\s+/i);
    if (teams.length !== 2) continue;
    const sides = teams.map((t) => sideOf(t, game));
    if (!sides.includes('home') || !sides.includes('away')) continue;
    const start = Date.parse((m.gameStartTime ?? m.endDate ?? '').replace(' ', 'T').replace(/\+00$/, 'Z'));
    if (Number.isFinite(kick) && Number.isFinite(start) && Math.abs(start - kick) > WINDOW) continue;
    return m.slug!;
  }
  return null;
}

const open = (m: RawMarket) => m.active !== false && m.closed !== true;

/** The ladder rung priced closest to even, if it is close enough to call the main line. */
function mainRung(markets: RawMarket[]): { m: RawMarket; prices: number[]; outcomes: string[] } | null {
  let best: { m: RawMarket; prices: number[]; outcomes: string[] } | null = null;
  for (const m of markets) {
    const outcomes = list(m.outcomes);
    const prices = list(m.outcomePrices).map(num);
    if (outcomes.length !== 2 || prices.length !== 2 || !prices.every(isPrice) || num(m.line) == null) continue;
    const off = Math.abs((prices[0] as number) - 0.5);
    if (off > MAIN_BAND) continue;
    if (!best || off < Math.abs(best.prices[0] - 0.5)) best = { m, prices: prices as number[], outcomes };
  }
  return best;
}

/** One event's moneyline, main spread and main total, as this ESPN game's home and away. */
function parseEvent(game: NflGame, event: RawEvent, slug: string): PolyGame | null {
  const markets = (event.markets ?? []).filter(open);

  let win: PolyGame['win'] = null;
  let winAsk: PolyGame['winAsk'] = null;
  const ml = markets.find((m) => m.sportsMarketType === 'moneyline');
  if (ml) {
    const outcomes = list(ml.outcomes);
    const prices = list(ml.outcomePrices).map(num);
    const sides = outcomes.map((o) => sideOf(o, game));
    if (outcomes.length === 2 && prices.every((p) => p != null) && sides.includes('home') && sides.includes('away')) {
      const [a0, a1] = asks(ml);
      const h = sides.indexOf('home');
      win = { home: prices[h]!, away: prices[1 - h]! };
      winAsk = { home: h === 0 ? a0 : a1, away: h === 0 ? a1 : a0 };
    }
  }

  let spread: PolyGame['spread'] = null;
  const sp = mainRung(markets.filter((m) => m.sportsMarketType === 'spreads'));
  if (sp) {
    const first = sideOf(sp.outcomes[0], game);
    const second = sideOf(sp.outcomes[1], game);
    if (first && second && first !== second) {
      const line = num(sp.m.line)!;
      const [a0, a1] = asks(sp.m);
      spread = first === 'home' ? { home: line, homePrice: a0, awayPrice: a1 } : { home: -line, homePrice: a1, awayPrice: a0 };
    }
  }

  let total: PolyGame['total'] = null;
  const tt = mainRung(markets.filter((m) => m.sportsMarketType === 'totals'));
  if (tt) {
    const o = tt.outcomes.map((x) => x.trim().toLowerCase());
    const overAt = o.indexOf('over');
    if (overAt !== -1 && o[1 - overAt] === 'under') {
      const a = asks(tt.m);
      total = { points: num(tt.m.line)!, overPrice: a[overAt], underPrice: a[1 - overAt] };
    }
  }

  if (!win && !spread && !total) return null;
  return {
    slug,
    volume: num(event.volume),
    updated: event.updatedAt ?? ml?.updatedAt ?? null,
    win,
    winAsk,
    spread,
    total,
  };
}

/**
 * Polymarket on each of these ESPN games that it has open, keyed by ESPN
 * event id. Final games are skipped: their markets are settling, and a
 * settled price is not a line.
 */
export async function polymarketFor(games: NflGame[]): Promise<Record<string, PolyGame>> {
  const wanted = games.filter((g) => g.state !== 'post');
  if (!wanted.length) return {};
  const index = await readIndex();
  if (!index.length) return {};
  const out: Record<string, PolyGame> = {};
  await Promise.all(
    wanted.map(async (game) => {
      const slug = findSlug(game, index);
      if (!slug) return;
      const event = await getJson<RawEvent>(`/events/slug/${encodeURIComponent(slug)}`);
      if (!event || typeof event !== 'object') return;
      const parsed = parseEvent(game, event, slug);
      if (parsed) out[game.id] = parsed;
    }),
  );
  return out;
}

/**
 * A price as an American line, the way a book would print what it pays:
 * 0.62 is -163, 0.40 is +150. Even money reads +100.
 */
export function americanFromPrice(p: number | null | undefined): number | null {
  if (p == null || !(p > 0 && p < 1)) return null;
  if (p > 0.5) return -Math.round((100 * p) / (1 - p));
  return Math.round((100 * (1 - p)) / p);
}
