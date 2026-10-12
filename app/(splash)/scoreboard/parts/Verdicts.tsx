import Link from 'next/link';
import { CaretDown } from '@phosphor-icons/react/dist/ssr';
import type { Verdict, VerdictKind } from '@/lib/squirt-says';
import Squirt, { type Mood } from '../../home/Squirt';
import Widget from '../../home/Widget';
import { curl } from './shared';
import s from '../sb.module.css';

/** v2's kind tags, word for word. The ones a manager can still fix are the bad news. */
const LABELS: Record<VerdictKind, string> = {
  sit: 'Sit him',
  bench: 'Start him',
  thin: 'A hole',
  trap: 'Quiet game',
  ceiling: 'Swing',
  lock: 'Safe',
  top: 'Leans on',
};
const HOT = new Set<VerdictKind>(['sit', 'bench', 'thin']);
/** How many reads show before the fold. */
const OPEN = 4;

function Row({ v }: { v: Verdict }) {
  return (
    <li className={s.verdict}>
      <span className={s.vHead}>
        <span className={`${s.chip} ${HOT.has(v.kind) ? s.chipHot : ''}`}>{LABELS[v.kind]}</span>
        <Link href={`/managers/${v.rosterId}`} className={s.vName}>
          {v.manager}
        </Link>
      </span>
      <p className={s.vSaying}>{curl(v.saying)}</p>
    </li>
  );
}

/**
 * Squirt says, for every manager: v2 folded all fourteen into a collapsible
 * under his face. Here Squirt leads with one read in his bubble (yours once
 * you have picked a team, else the week's most consequential), the next few
 * sit under him, and the rest open on a tap, natively, with no script.
 * One read a manager, the fixable mistakes first, as lib/squirt-says ranks
 * them.
 */
export default function Verdicts({ verdicts, mine, week }: { verdicts: Verdict[]; mine: number | null; week: number }) {
  if (!verdicts.length) {
    return (
      <Widget size="m" icon="drop" title="Squirt says">
        <div className={s.nudge}>
          <Squirt mood="sleep" size={56} />
          <p className={s.empty}>No reads for week {week} yet.</p>
        </div>
      </Widget>
    );
  }
  const yours = mine != null ? verdicts.find((v) => v.rosterId === mine) : undefined;
  const lead = yours ?? verdicts[0];
  const rest = verdicts.filter((v) => v !== lead);
  const shown = rest.slice(0, OPEN);
  const folded = rest.slice(OPEN);
  const mood: Mood = HOT.has(lead.kind) ? 'sweat' : lead.kind === 'lock' || lead.kind === 'top' ? 'smug' : 'calm';

  return (
    <Widget size="m" icon="drop" title="Squirt says">
      <div className={s.says}>
        <Squirt mood={mood} size={72} />
        <div className={s.bubble}>
          <span className={s.bubbleWho}>
            <span className={`${s.chip} ${HOT.has(lead.kind) ? s.chipHot : ''}`}>{LABELS[lead.kind]}</span>
            <span className={s.label}>{lead === yours ? `${lead.manager} | You` : lead.manager}</span>
          </span>
          <q>{curl(lead.saying)}</q>
        </div>
      </div>
      {shown.length ? (
        <ul className={s.verdicts}>
          {shown.map((v) => (
            <Row key={v.rosterId} v={v} />
          ))}
        </ul>
      ) : null}
      {folded.length ? (
        <details className={s.fold}>
          <summary>
            <span>
              <span className={s.whenShut}>
                {folded.length} more
              </span>
              <span className={s.whenOpen}>Show fewer</span>
            </span>
            <CaretDown weight="bold" className={s.caret} aria-hidden />
          </summary>
          <ul className={s.verdicts}>
            {folded.map((v) => (
              <Row key={v.rosterId} v={v} />
            ))}
          </ul>
        </details>
      ) : null}
    </Widget>
  );
}
