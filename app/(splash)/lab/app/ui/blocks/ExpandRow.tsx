import { Ms } from '../../icons';
import type { ReactNode } from 'react';
import u from '../ui.module.css';
import e from './ExpandRow.module.css';

/**
 * A row that opens in place: the kit row as the summary (lead, title and sub,
 * value), a caret, and the detail under it. Summary first, detail on tap.
 */
export function ExpandRow({ lead, label, title, sub, value, valueSub, children }: { lead?: ReactNode; label?: ReactNode; title: ReactNode; sub?: ReactNode; value?: ReactNode; valueSub?: ReactNode; children: ReactNode }) {
  return (
    <details className={`${u.xp} ${e.item}`}>
      <summary className={`${u.row} ${e.head} ${lead ? '' : e.noLead}`}>
        {lead ?? null}
        <span className={u.body}>
          {label ? <span className={u.label}>{label}</span> : null}
          <span className={u.title}>{title}</span>
          {sub ? <span className={u.sub}>{sub}</span> : null}
        </span>
        <span className={u.trail}>
          {value != null ? <span className={u.value}>{value}</span> : null}
          {valueSub ? <span className={u.valueSub}>{valueSub}</span> : null}
        </span>
        <span className={u.caret} aria-hidden>
          <Ms name="chevronRight" size={16} />
        </span>
      </summary>
      <div className={e.body}>{children}</div>
    </details>
  );
}
