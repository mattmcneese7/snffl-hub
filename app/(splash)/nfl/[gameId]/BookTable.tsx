import type { NflGame } from '@/lib/gameday';
import { BOOK_LOGOS } from '../../kit/bookLogos';
import { nflTeamName } from '../../kit/nflTeams';
import type { BookLines } from '../../lib/odds-books';
import sb from '../../scoreboard/sb.module.css';
import n from '../nfl.module.css';

/**
 * Lines across books, for shopping: one row a book, the spread, total and
 * moneyline side by side, the away team's number on top and the home team's
 * under it, as on the board. The best number in each column for each side
 * sits on a lime chip; nothing is marked where every book agrees. The row of
 * the book this device picked sits on powder.
 *
 * Polymarket's row shows its moneyline as the win price, with the American
 * equivalent of what that side costs in small type, and that American number
 * is what competes for the chip. Its volume sits under its name.
 */

type Num = { main: number; price: number | null } | null;

/** "$170.9K": dollars traded, short enough for the book column. */
const dollars = (v: number) =>
  `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)}`;

const signed = (v: number) => (v > 0 ? `+${v}` : v === 0 ? 'Even' : String(v));
const american = (v: number) => (v > 0 ? `+${v}` : String(v));

/**
 * Which rows hold the best number. `better` says whether a beats b on the
 * main number; a tie on it goes to the better price (higher is better for
 * the bettor in American odds).
 */
function best(values: Num[], better: (a: number, b: number) => boolean): Set<number> {
  const live = values.map((v, i) => ({ v, i })).filter((x): x is { v: NonNullable<Num>; i: number } => x.v != null);
  if (live.length < 2) return new Set();
  const price = (v: NonNullable<Num>) => v.price ?? -Infinity;
  const top = live.reduce((a, b) => (better(b.v.main, a.v.main) || (b.v.main === a.v.main && price(b.v) > price(a.v)) ? b : a)).v;
  const winners = live.filter((x) => x.v.main === top.main && price(x.v) === price(top));
  // Everyone tied is no news.
  return winners.length === live.length ? new Set() : new Set(winners.map((x) => x.i));
}

function Cell({ v, text, hot, win }: { v: Num; text: (main: number) => string; hot: boolean; win?: number | null }) {
  if (!v && win == null) return <span className={n.btVal}>-</span>;
  return (
    <span className={`${n.btVal} ${hot ? n.btBest : ''}`}>
      {win != null ? `${Math.round(win * 100)}%` : text(v!.main)}
      {win != null ? (v ? <small>{american(v.main)}</small> : null) : v!.price != null ? <small>{american(v!.price)}</small> : null}
    </span>
  );
}

export default function BookTable({ game, rows, chosen, updated }: { game: NflGame; rows: BookLines[]; chosen: string; updated: string | null }) {
  const awaySpread: Num[] = rows.map((r) => (r.spread != null ? { main: -r.spread, price: r.prices?.awaySpread ?? null } : null));
  const homeSpread: Num[] = rows.map((r) => (r.spread != null ? { main: r.spread, price: r.prices?.homeSpread ?? null } : null));
  const over: Num[] = rows.map((r) => (r.overUnder != null ? { main: r.overUnder, price: r.prices?.over ?? null } : null));
  const under: Num[] = rows.map((r) => (r.overUnder != null ? { main: r.overUnder, price: r.prices?.under ?? null } : null));
  const mlAway: Num[] = rows.map((r) => (r.away.moneyline != null ? { main: r.away.moneyline, price: null } : null));
  const mlHome: Num[] = rows.map((r) => (r.home.moneyline != null ? { main: r.home.moneyline, price: null } : null));

  const more = (a: number, b: number) => a > b;
  const less = (a: number, b: number) => a < b;
  const hot = {
    awaySpread: best(awaySpread, more),
    homeSpread: best(homeSpread, more),
    // The over wants the lowest number, the under the highest.
    over: best(over, less),
    under: best(under, more),
    mlAway: best(mlAway, more),
    mlHome: best(mlHome, more),
  };

  return (
    <>
      <div className={n.facts1}>
        <span className={n.pair}>
          <span className={sb.label}>Top</span>
          {nflTeamName(game.away.abbr)}, over
        </span>
        <span className={n.pair}>
          <span className={sb.label}>Bottom</span>
          {nflTeamName(game.home.abbr)}, under
        </span>
      </div>
      <div className={n.bt} role="table" aria-label="Lines across books">
        <div className={`${n.btRow} ${n.btHead}`} role="row">
          <span className={sb.label} role="columnheader">Book</span>
          <span className={sb.label} role="columnheader">Spread</span>
          <span className={sb.label} role="columnheader">Total</span>
          <span className={sb.label} role="columnheader">Moneyline</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.bookKey} className={`${n.btRow} ${r.bookKey === chosen ? n.btMine : ''}`} role="row">
            <span className={n.btBook} role="rowheader">
              <span className={n.btBookName}>
                {BOOK_LOGOS[r.bookKey] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={n.bookLogo} src={BOOK_LOGOS[r.bookKey]} alt="" />
                ) : null}
                {r.provider}
              </span>
              {r.volume != null ? <small className={n.btVol}>Volume | {dollars(r.volume)}</small> : null}
            </span>
            <span className={n.btCell} role="cell">
              <Cell v={awaySpread[i]} text={signed} hot={hot.awaySpread.has(i)} />
              <Cell v={homeSpread[i]} text={signed} hot={hot.homeSpread.has(i)} />
            </span>
            <span className={n.btCell} role="cell">
              <Cell v={over[i]} text={String} hot={hot.over.has(i)} />
              <Cell v={under[i]} text={String} hot={hot.under.has(i)} />
            </span>
            <span className={n.btCell} role="cell">
              <Cell v={mlAway[i]} text={american} hot={hot.mlAway.has(i)} win={r.win?.away} />
              <Cell v={mlHome[i]} text={american} hot={hot.mlHome.has(i)} win={r.win?.home} />
            </span>
          </div>
        ))}
      </div>
      {updated ? <span className={sb.via}>Updated {updated}</span> : null}
    </>
  );
}
