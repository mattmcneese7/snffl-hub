import ManagerLink from './ManagerLink';
import type { Verdict, VerdictKind } from '@/lib/squirt-says';

/**
 * Squirt Says, Checkpoint 12c.
 *
 * One line per manager, the fixable mistakes first. Every saying carries the
 * number it was built from and the player it is about, so it reads as a
 * judgment and checks out as arithmetic.
 *
 * The section is the mascot's, and looks it: he sits at the head of it with
 * the sayings running out of him, rather than the app printing a list under a
 * heading that happens to use his name.
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

/** Squirt at the head of his section, usable as a section title of its own. */
export function SquirtHead({ count, week }: { count: number; week: number }) {
  return (
    <div className="snffl-squirt-head">
      <span className="snffl-squirt-face">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark-v2-128.png" alt="" />
      </span>
      <span className="snffl-squirt-title">
        <strong>Squirt says</strong>
        <span>
          {count === 1 ? 'One word' : `${count} words`} on Week {week}
        </span>
      </span>
    </div>
  );
}

export default function Squirt({
  verdicts,
  week,
  limit,
  showWeek = false,
  head = true,
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
  /** Off where the section already leads with his face. */
  head?: boolean;
}) {
  const shown = limit ? verdicts.slice(0, limit) : verdicts;
  if (!shown.length) return null;

  return (
    <div className="snffl-squirt-says">
      {head ? <SquirtHead count={shown.length} week={week} /> : null}
    <ol className="snffl-squirt">
      {shown.map((verdict) => (
        <li className={`snffl-squirt-row snffl-squirt-${verdict.kind}`} key={`${verdict.rosterId}-${verdict.kind}`}>
          <span className="snffl-squirt-head">
            <span className={`snffl-squirt-tag snffl-squirt-tag-${verdict.kind}`}>
              {LABELS[verdict.kind]}
            </span>
            <ManagerLink rosterId={verdict.rosterId} className="snffl-squirt-manager">
              {verdict.manager}
            </ManagerLink>
            {showWeek ? <span className="snffl-squirt-week">Week {week}</span> : null}
          </span>
          <p className="snffl-squirt-saying">{verdict.saying}</p>
        </li>
      ))}
      </ol>
    </div>
  );
}
