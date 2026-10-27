import type { NflGame } from '@/lib/gameday';
import type { BookLines } from '../../../lib/odds-books';
import x from '../scores/scores.module.css';

/**
 * Lines across books, for shopping: a row a book, the away number over the
 * home number in each column (the over over the under for the total). The
 * best number in a column wears green; where every book agrees nothing does.
 * The book this device picked sits on powder. Polymarket's moneyline is its
 * win price, with what buying that side costs under it.
 */
type Num = { main: number; price: number | null } | null;

const dollars = (v: number) => `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)}`;
const signed = (v: number) => (v > 0 ? `+${v}` : v === 0 ? 'Even' : String(v));
const american = (v: number) => (v > 0 ? `+${v}` : String(v));

function best(values: Num[], better: (a: number, b: number) => boolean): Set<number> {
  const live = values.map((v, i) => ({ v, i })).filter((q): q is { v: NonNullable<Num>; i: number } => q.v != null);
  if (live.length < 2) return new Set();
  const price = (v: NonNullable<Num>) => v.price ?? -Infinity;
  const top = live.reduce((a, b) => (better(b.v.main, a.v.main) || (b.v.main === a.v.main && price(b.v) > price(a.v)) ? b : a)).v;
  const winners = live.filter((q) => q.v.main === top.main && price(q.v) === price(top));
  return winners.length === live.length ? new Set() : new Set(winners.map((q) => q.i));
}

function Cell({ v, text, hot, win }: { v: Num; text: (main: number) => string; hot: boolean; win?: number | null }) {
  if (!v && win == null) return <span className={x.btVal}>&ndash;</span>;
  return (
    <span className={`${x.btVal} ${hot ? x.btBest : ''}`}>
      {win != null ? `${Math.round(win * 100)}%` : text(v!.main)}
      {win != null ? (v ? <small>{american(v.main)}</small> : null) : v!.price != null ? <small>{american(v!.price)}</small> : null}
    </span>
  );
}

export default function BookTable({ game, rows, chosen }: { game: NflGame; rows: BookLines[]; chosen: string }) {
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
    over: best(over, less),
    under: best(under, more),
    mlAway: best(mlAway, more),
    mlHome: best(mlHome, more),
  };
  return (
    <div className={x.bt} role="table" aria-label="Lines across books">
      <div className={`${x.btRow} ${x.btHead}`} role="row">
        <span role="columnheader">Book</span>
        <span role="columnheader" style={{ textAlign: 'right' }}>
          Spread
        </span>
        <span role="columnheader" style={{ textAlign: 'right' }}>
          Total
        </span>
        <span role="columnheader" style={{ textAlign: 'right' }}>
          ML
        </span>
      </div>
      {rows.map((r, i) => (
        <div key={r.bookKey} className={`${x.btRow} ${r.bookKey === chosen ? x.btMine : ''}`} role="row">
          <span className={x.btBook} role="rowheader">
            {r.provider}
            <small>{r.volume != null ? `Volume ${dollars(r.volume)}` : r.bookKey === chosen ? 'Your book' : `${game.away.abbr} over ${game.home.abbr}`}</small>
          </span>
          <span className={x.btCell} role="cell">
            <Cell v={awaySpread[i]} text={signed} hot={hot.awaySpread.has(i)} />
            <Cell v={homeSpread[i]} text={signed} hot={hot.homeSpread.has(i)} />
          </span>
          <span className={x.btCell} role="cell">
            <Cell v={over[i]} text={(n) => `O ${n}`} hot={hot.over.has(i)} />
            <Cell v={under[i]} text={(n) => `U ${n}`} hot={hot.under.has(i)} />
          </span>
          <span className={x.btCell} role="cell">
            <Cell v={mlAway[i]} text={american} hot={hot.mlAway.has(i)} win={r.win?.away} />
            <Cell v={mlHome[i]} text={american} hot={hot.mlHome.has(i)} win={r.win?.home} />
          </span>
        </div>
      ))}
    </div>
  );
}
