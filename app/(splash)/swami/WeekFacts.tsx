import type { PlayerWeek } from './week-lines';
import s from './swami.module.css';

/**
 * A player's week, as Swami and My Team both show it: the stat line in words,
 * then one chip a fact for the book on his game and DraftSharks' read. Each
 * chip is one label and one value; the book's chips sit under its name.
 */
export default function WeekFacts({ pw }: { pw: PlayerWeek }) {
  if (!pw.stat && !pw.book.length && !pw.ds.length) return null;
  return (
    <span className={s.facts}>
      {pw.stat ? (
        <span className={s.line}>
          <b>{pw.statLabel}:</b> {pw.stat}
        </span>
      ) : null}
      {pw.book.length ? (
        <span className={s.pairs}>
          <span className={s.source}>{pw.provider}</span>
          {pw.book.map((p) => (
            <span key={p.label} className={s.pair}>
              {p.label} | <b>{p.value}</b>
            </span>
          ))}
        </span>
      ) : null}
      {pw.ds.length ? (
        <span className={s.pairs}>
          {pw.ds.map((p) => (
            <span key={p.label} className={s.pair}>
              {p.label} | <b>{p.value}</b>
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}
