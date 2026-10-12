// Which sportsbook's lines you see. The same shape as the team pick in
// lib/my-team.ts: one cookie, one device, no account, readable by the server
// at the moment the page is built, written by the client picker in Settings.
//
// Safe to import from client components: no fs, nothing server only. The
// lines themselves live in ./odds-books, which reads data/odds.json.

export const BOOK_COOKIE = 'snffl_book';
export const DEFAULT_BOOK = 'draftkings';

/** A season is the longest this is ever useful for. */
const MAX_AGE = 60 * 60 * 24 * 200;

export type Book = {
  /** The Odds API bookmaker key. */
  key: string;
  name: string;
  /**
   * A logo only where there is a reliable public one to point at. None of
   * these has a stable, licensed URL we can rely on, so every book is shown
   * by name.
   */
  logo: string | null;
};

/**
 * The regulated US books The Odds API returns for region "us", DraftKings
 * first because it is also the line ESPN carries. Keys are The Odds API's.
 * Checked against a real pull on 2026-10-11: these four carry every game.
 * Caesars and Fanatics were not in it; another region would cost more
 * credits per pull, so they are not offered. The offshore books the same
 * pull returns (Bovada, BetOnline, MyBookie, BetUS, LowVig) are left out.
 */
export const BOOKS: Book[] = [
  { key: 'draftkings', name: 'DraftKings', logo: null },
  { key: 'fanduel', name: 'FanDuel', logo: null },
  { key: 'betmgm', name: 'BetMGM', logo: null },
  { key: 'betrivers', name: 'BetRivers', logo: null },
  // Not a sportsbook: a prediction market, read live from its public API
  // (lib/polymarket.ts), so it costs no credits. Its moneyline is a price
  // per share, shown as a percent.
  { key: 'polymarket', name: 'Polymarket', logo: null },
];

export const POLYMARKET = 'polymarket';

export const bookName = (key: string) => BOOKS.find((b) => b.key === key)?.name ?? key;

/**
 * One side's moneyline as a label would print it: "+150" from a book, "62%"
 * from Polymarket, whose win price is the percent. Takes any line object, so
 * a line passed through a GameLines type still reads right.
 */
export function moneyText(
  lines: { home: { moneyline: number | null }; away: { moneyline: number | null }; win?: { home: number; away: number } | null },
  home: boolean,
): string | null {
  if (lines.win) return `${Math.round((home ? lines.win.home : lines.win.away) * 100)}%`;
  const ml = (home ? lines.home : lines.away).moneyline;
  return ml == null ? null : ml > 0 ? `+${ml}` : String(ml);
}

/** A book key from a cookie value, DraftKings for anything unknown. */
export function parseBook(value: string | undefined | null): string {
  return value && BOOKS.some((b) => b.key === value) ? value : DEFAULT_BOOK;
}

/** Write the choice where both the browser and the server can read it. Client only. */
export function setBook(key: string) {
  if (typeof document === 'undefined') return;
  document.cookie =
    key === DEFAULT_BOOK
      ? `${BOOK_COOKIE}=; path=/; max-age=0; samesite=lax`
      : `${BOOK_COOKIE}=${encodeURIComponent(key)}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}
