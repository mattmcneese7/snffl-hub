import ManagerLink from './ManagerLink';
import type { Verdict, VerdictKind } from '@/lib/squirtfucius';

/**
 * Squirtfucius Says, Checkpoint 12c.
 *
 * One line per manager, the fixable mistakes first. Every saying carries the
 * number it was built from and the player it is about, so it reads as a
 * judgment and checks out as arithmetic.
 */
const LABELS: Record<VerdictKind, string> = {
  sit: 'Sit him',
  bench: 'Start him',
  thin: 'A hole',
  trap: 'Quiet game',
  ceiling: 'Swing',
  lock: 'Safe',
  top: 'Leans on',
};

export default function Squirtfucius({
  verdicts,
  week,
  limit,
  showWeek = false,
}: {
  verdicts: Verdict[];
  week: number;
  /** Home shows a few; the matchups page shows all fourteen. */
  limit?: number;
  /**
   * Only where the week is not already obvious. On a week page the heading
   * says it once, and repeating it on all fourteen rows is furniture.
   */
  showWeek?: boolean;
}) {
  const shown = limit ? verdicts.slice(0, limit) : verdicts;
  if (!shown.length) return null;

  return (
    <ol className="snffl-oracle">
      {shown.map((verdict) => (
        <li className={`snffl-oracle-row snffl-oracle-${verdict.kind}`} key={`${verdict.rosterId}-${verdict.kind}`}>
          <span className="snffl-oracle-head">
            <span className={`snffl-oracle-tag snffl-oracle-tag-${verdict.kind}`}>
              {LABELS[verdict.kind]}
            </span>
            <ManagerLink rosterId={verdict.rosterId} className="snffl-oracle-manager">
              {verdict.manager}
            </ManagerLink>
            {showWeek ? <span className="snffl-oracle-week">Week {week}</span> : null}
          </span>
          <p className="snffl-oracle-saying">{verdict.saying}</p>
        </li>
      ))}
    </ol>
  );
}
