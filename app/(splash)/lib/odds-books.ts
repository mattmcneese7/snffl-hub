// Lines from the book each manager picked. Server only: it reads the
// snapshot scripts/odds-pull.ts keeps in Supabase Storage (private bucket
// "odds", object "nfl.json") with the service role key, which never leaves
// the server. The Odds API itself is never called from a page; the plan has
// 500 credits a month.
//
// Every line carries the name of the book it actually came from. When the
// chosen book has nothing on a game, or the snapshot is missing, the line
// falls back to ESPN's (DraftKings), and it says DraftKings, never the book
// that was asked for.

import type { GameLines, NflGame } from '@/lib/gameday';
import { nflTeamName } from '../kit/nflTeams';
import { BOOK_COOKIE, BOOKS, bookName, DEFAULT_BOOK, moneyText, parseBook, POLYMARKET } from './book-pref';
import { americanFromPrice, polymarketFor, type PolyGame } from './polymarket';

export { BOOK_COOKIE, BOOKS, bookName, DEFAULT_BOOK, moneyText, parseBook, POLYMARKET, polymarketFor };
export type { PolyGame };

// ---------- The snapshot ----------

export type OddsBook = {
  title: string;
  spread: { home: number; away: number; homePrice: number | null; awayPrice: number | null } | null;
  total: { points: number; overPrice: number | null; underPrice: number | null } | null;
  moneyline: { home: number; away: number } | null;
  updated: string;
};

export type OddsGame = {
  id: string;
  commence: string;
  /** Full names, as The Odds API writes them: "San Francisco 49ers". */
  home: string;
  away: string;
  books: Record<string, OddsBook>;
};

export type OddsFile = { pulledAt: string; remaining: number | null; games: OddsGame[] };

/** How long a read of the snapshot is reused. Pulls land every 20 minutes at most. */
const REVALIDATE = 300;
let memo: { at: number; data: OddsFile | null } | null = null;

/** The pulled lines, or null when Storage is not configured or has no snapshot yet. */
export async function readOdds(): Promise<OddsFile | null> {
  if (memo && Date.now() - memo.at < REVALIDATE * 1000) return memo.data;
  // || rather than ??: a missing env var can arrive as "", see lib/supabase.ts.
  // The "odds" bucket is public-read (Matt's call, 2026-10-11: they are public
  // numbers), so the site reads it with no key and the service key stays in
  // GitHub Actions, where the pull writes it.
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  if (!url) return null;
  let data: OddsFile | null = null;
  try {
    const res = await fetch(`${url}/storage/v1/object/public/odds/nfl.json`, {
      next: { revalidate: REVALIDATE },
    } as RequestInit);
    if (res.ok) {
      const raw = (await res.json()) as OddsFile;
      data = raw && Array.isArray(raw.games) ? { pulledAt: raw.pulledAt, remaining: raw.remaining ?? null, games: raw.games } : null;
    }
  } catch {
    data = null;
  }
  memo = { at: Date.now(), data };
  return data;
}

/** Same teams within this long of ESPN's kickoff is the same game. */
const WINDOW = 3 * 86_400_000;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The snapshot's entry for an ESPN game, by full team names and kickoff.
 * `swapped` is true when the snapshot has home and away the other way round,
 * which happens at neutral sites.
 */
export function findOddsGame(game: NflGame, file: OddsFile | null): { odds: OddsGame; swapped: boolean } | null {
  if (!file) return null;
  const home = nflTeamName(game.home.abbr);
  const away = nflTeamName(game.away.abbr);
  const kick = Date.parse(game.kickoff);
  const near = file.games.filter((g) => !Number.isFinite(kick) || Math.abs(Date.parse(g.commence) - kick) < WINDOW);
  const straight = near.find((g) => same(g.home, home) && same(g.away, away));
  if (straight) return { odds: straight, swapped: false };
  const flipped = near.find((g) => same(g.home, away) && same(g.away, home));
  return flipped ? { odds: flipped, swapped: true } : null;
}

// ---------- One book's line ----------

export type BookLines = GameLines & {
  /** The book these numbers came from, which is what the label must say. */
  bookKey: string;
  /** True when the chosen book had no line and this is another book's. */
  fallback: boolean;
  /** When the book last moved, from the snapshot; null for ESPN's line. */
  updated: string | null;
  /** Spread and total prices, from the snapshot or Polymarket. */
  prices: { homeSpread: number | null; awaySpread: number | null; over: number | null; under: number | null } | null;
  /**
   * Polymarket only: each side's win price, 0 to 1, which is how its
   * moneyline is shown. The moneyline fields then hold the American
   * equivalent of what buying that side costs.
   */
  win?: { home: number; away: number } | null;
  /** Polymarket only: dollars traded on the game. */
  volume?: number | null;
};

const rawImplied = (ml: number | null) => (ml == null ? null : ml < 0 ? -ml / (-ml + 100) : 100 / (ml + 100));

/** A book key for a provider name as ESPN prints it ("DraftKings"). */
const keyOfProvider = (name: string) => BOOKS.find((b) => same(b.name, name))?.key ?? name.toLowerCase().replace(/\s+/g, '');

/**
 * "Buffalo Bills -5.5": the favorite by full name, never a team code, so
 * every page that prints `details` reads the same. "Even" for a pick'em.
 */
function detailsOf(game: NflGame, homeSpread: number, awaySpread: number): string {
  if (homeSpread === 0) return 'Even';
  return homeSpread < 0 ? `${nflTeamName(game.home.abbr)} ${homeSpread}` : `${nflTeamName(game.away.abbr)} ${awaySpread}`;
}

/** ESPN's "BUF -5.5" (or "EVEN") with the team spelled out, the same as detailsOf. */
function spellDetails(details: string | null): string | null {
  if (!details) return null;
  if (details.trim().toUpperCase() === 'EVEN') return 'Even';
  const [code, ...rest] = details.trim().split(/\s+/);
  return rest.length ? `${nflTeamName(code)} ${rest.join(' ')}` : details;
}

/** One book from the snapshot as GameLines, from ESPN's home and away. */
function fromFile(game: NflGame, key: string, book: OddsBook, swapped: boolean, espn: GameLines | null): BookLines {
  const s = book.spread;
  const homeSpread = s ? (swapped ? s.away : s.home) : null;
  const awaySpread = s ? (swapped ? s.home : s.away) : null;
  const mlHome = book.moneyline ? (swapped ? book.moneyline.away : book.moneyline.home) : null;
  const mlAway = book.moneyline ? (swapped ? book.moneyline.home : book.moneyline.away) : null;
  const rh = rawImplied(mlHome);
  const ra = rawImplied(mlAway);
  const sum = rh != null && ra != null ? rh + ra : null;
  return {
    provider: BOOKS.some((b) => b.key === key) ? bookName(key) : book.title,
    logoLight: null,
    logoDark: null,
    details: homeSpread != null && awaySpread != null ? detailsOf(game, homeSpread, awaySpread) : null,
    spread: homeSpread,
    overUnder: book.total?.points ?? null,
    home: { moneyline: mlHome, implied: sum ? Number((rh! / sum).toFixed(3)) : null },
    away: { moneyline: mlAway, implied: sum ? Number((ra! / sum).toFixed(3)) : null },
    // The live model is ESPN's, whichever book set the line.
    liveHomeWin: espn?.liveHomeWin ?? null,
    bookKey: key,
    fallback: false,
    updated: book.updated ?? null,
    prices: {
      homeSpread: s ? (swapped ? s.awayPrice : s.homePrice) : null,
      awaySpread: s ? (swapped ? s.homePrice : s.awayPrice) : null,
      over: book.total?.overPrice ?? null,
      under: book.total?.underPrice ?? null,
    },
  };
}

/**
 * Polymarket's line on a game as BookLines. The spread and total are the
 * rungs of its ladders priced closest to even. Every American number is
 * converted from the best ask, the price a share costs right now (before
 * Polymarket's taker fee), so it compares with a book's price; the win
 * percent is its midpoint, the price it shows. The implied chance is the
 * midpoint too, which carries no vig to strip.
 */
function fromPoly(game: NflGame, poly: PolyGame, espn: GameLines | null): BookLines {
  const s = poly.spread;
  const sum = poly.win ? poly.win.home + poly.win.away : null;
  return {
    provider: bookName(POLYMARKET),
    logoLight: null,
    logoDark: null,
    details: s ? detailsOf(game, s.home, -s.home) : null,
    spread: s ? s.home : null,
    overUnder: poly.total?.points ?? null,
    home: {
      moneyline: poly.win ? americanFromPrice(poly.winAsk?.home) : null,
      implied: poly.win && sum ? Number((poly.win.home / sum).toFixed(3)) : null,
    },
    away: {
      moneyline: poly.win ? americanFromPrice(poly.winAsk?.away) : null,
      implied: poly.win && sum ? Number((poly.win.away / sum).toFixed(3)) : null,
    },
    liveHomeWin: espn?.liveHomeWin ?? null,
    bookKey: POLYMARKET,
    fallback: false,
    updated: poly.updated,
    prices: {
      homeSpread: americanFromPrice(s?.homePrice),
      awaySpread: americanFromPrice(s?.awayPrice),
      over: americanFromPrice(poly.total?.overPrice),
      under: americanFromPrice(poly.total?.underPrice),
    },
    win: poly.win,
    volume: poly.volume,
  };
}

/** Polymarket worth showing: an open game with a price on it. */
const polyUsable = (game: NflGame, p: PolyGame | null | undefined): p is PolyGame =>
  !!p && game.state !== 'post' && (p.win != null || p.spread != null || p.total != null);

/** ESPN's line, labeled as the book ESPN says it is. */
const fromEspn = (espn: GameLines, chosen: string): BookLines => {
  const key = keyOfProvider(espn.provider);
  return { ...espn, details: spellDetails(espn.details), bookKey: key, fallback: key !== chosen, updated: null, prices: null };
};

/** Whether ESPN's line has any number on it, not just the live model. */
const hasNumbers = (l: GameLines | null | undefined) =>
  !!l && (l.details != null || l.overUnder != null || l.home.moneyline != null || l.away.moneyline != null);

/**
 * A snapshot entry worth showing: it has a pregame spread or total. A book
 * first seen after kickoff has only live moneylines, and a line of dashes
 * would be worse than ESPN's.
 */
const usable = (b: OddsBook | undefined): b is OddsBook => !!b && (b.spread != null || b.total != null);

/**
 * A snapshot book as shown for this game. Once a game is final its stored
 * moneyline is the last live price, not a line anyone bet, so it is dropped.
 */
const forState = (game: NflGame, lines: BookLines): BookLines =>
  game.state === 'post' ? { ...lines, home: { moneyline: null, implied: null }, away: { moneyline: null, implied: null } } : lines;

/**
 * The line on a game from the chosen book. In order: DraftKings straight from
 * ESPN when that is the pick, except while the game is on (ESPN refreshes it
 * more often before kickoff, and keeps the closing line after);
 * the chosen book from the snapshot (pregame spread and total, moneyline
 * live while the game is on); ESPN's line; DraftKings from the snapshot.
 * Polymarket, when picked, comes from its own live read (`poly`), before
 * and during the game, with the same fallbacks after it.
 * Whatever comes back is labeled by `provider` with the book it came from.
 */
export function getLine(
  game: NflGame,
  espn: GameLines | null | undefined,
  bookKey: string,
  file: OddsFile | null,
  poly?: PolyGame | null,
): BookLines | null {
  const chosen = parseBook(bookKey);
  const e = espn ?? null;
  if (chosen === POLYMARKET && polyUsable(game, poly)) return fromPoly(game, poly, e);
  const espnIsDk = !!e && hasNumbers(e) && keyOfProvider(e.provider) === DEFAULT_BOOK;
  if (chosen === DEFAULT_BOOK && espnIsDk && game.state !== 'in') return fromEspn(e!, chosen);

  const match = findOddsGame(game, file);
  const book = match?.odds.books[chosen];
  if (match && usable(book)) return forState(game, fromFile(game, chosen, book, match.swapped, e));

  if (e && hasNumbers(e)) return fromEspn(e, chosen);

  const dk = match?.odds.books[DEFAULT_BOOK];
  if (match && usable(dk)) return { ...forState(game, fromFile(game, DEFAULT_BOOK, dk, match.swapped, e)), fallback: chosen !== DEFAULT_BOOK };

  // Only ESPN's live model, no line: kept so the win bar still has it.
  return e ? fromEspn(e, chosen) : null;
}

/** Which book a line actually came from, by name, and whether it stood in for the pick. */
export function lineSource(lines: BookLines | GameLines | null | undefined): { key: string; name: string; fallback: boolean } | null {
  if (!lines) return null;
  const key = 'bookKey' in lines ? lines.bookKey : keyOfProvider(lines.provider);
  return { key, name: lines.provider, fallback: 'fallback' in lines ? lines.fallback : false };
}

/** A whole slate's lines from the chosen book, keyed by ESPN event id like getSlateLines. */
export async function slateLines(games: NflGame[], espn: Record<string, GameLines>, bookKey: string): Promise<Record<string, BookLines>> {
  const [file, poly] = await Promise.all([readOdds(), parseBook(bookKey) === POLYMARKET ? polymarketFor(games) : Promise.resolve({} as Record<string, PolyGame>)]);
  const out: Record<string, BookLines> = {};
  for (const game of games) {
    const line = getLine(game, espn[game.id], bookKey, file, poly[game.id]);
    if (line) out[game.id] = line;
  }
  return out;
}

/** A matchup context with its lines swapped for the chosen book's. */
export async function withBook<T extends { nfl: NflGame[]; lines: Record<string, GameLines> }>(
  ctx: T,
  bookKey: string,
): Promise<Omit<T, 'lines'> & { lines: Record<string, BookLines> }> {
  return { ...ctx, lines: await slateLines(ctx.nfl, ctx.lines, bookKey) };
}

/**
 * The one book to name in a widget's source line: the provider most of the
 * shown lines came from. Any line from a different book carries its own label.
 */
export function mainBook(lines: Iterable<GameLines | null | undefined>): string | null {
  const count = new Map<string, number>();
  for (const l of lines) if (hasNumbers(l)) count.set(l!.provider, (count.get(l!.provider) ?? 0) + 1);
  let best: string | null = null;
  for (const [name, n] of count) if (best == null || n > count.get(best)!) best = name;
  return best;
}

/** The chosen book from the request's cookies. */
export function bookFrom(jar: { get(name: string): { value: string } | undefined }): string {
  return parseBook(jar.get(BOOK_COOKIE)?.value);
}

// ---------- Every book on one game ----------

/**
 * Each listed book's line on a game, for shopping: the snapshot's numbers,
 * DraftKings from ESPN when the snapshot has no DraftKings line, and
 * Polymarket from its live read. Books with nothing on this game are left out.
 */
export function linesAcrossBooks(
  game: NflGame,
  espn: GameLines | null | undefined,
  file: OddsFile | null,
  poly?: PolyGame | null,
): BookLines[] {
  const match = findOddsGame(game, file);
  const rows: BookLines[] = [];
  for (const b of BOOKS) {
    if (b.key === POLYMARKET) {
      if (polyUsable(game, poly)) rows.push(fromPoly(game, poly, espn ?? null));
      continue;
    }
    const book = match?.odds.books[b.key];
    if (match && usable(book)) rows.push(fromFile(game, b.key, book, match.swapped, espn ?? null));
    else if (b.key === DEFAULT_BOOK && espn && hasNumbers(espn) && keyOfProvider(espn.provider) === DEFAULT_BOOK) rows.push(fromEspn(espn, b.key));
  }
  return rows;
}

/** The chosen book's line on one game, reading the snapshot, or Polymarket when that is the pick. */
export async function lineFor(game: NflGame, espn: GameLines | null | undefined, bookKey: string): Promise<BookLines | null> {
  const [file, poly] = await Promise.all([readOdds(), parseBook(bookKey) === POLYMARKET ? polymarketFor([game]) : Promise.resolve({} as Record<string, PolyGame>)]);
  return getLine(game, espn, bookKey, file, poly[game.id]);
}
