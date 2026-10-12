import { WidgetHead } from '../../home/Widget';
import { recentUsage, type UsageRow } from '../../lib/deep/nflverse';
import w from '../../home/widgets.module.css';
import u from './usage.module.css';

const pct = (n: number | undefined) => `${Math.round((n ?? 0) * 100)}%`;
const count = (n: number | undefined) => String(n ?? 0);
const epa = (n: number | undefined) => {
  const v = n ?? 0;
  return v > 0 ? `+${v.toFixed(1)}` : v < 0 ? `−${Math.abs(v).toFixed(1)}` : '0.0';
};

type Column = { label: string; value: (r: UsageRow) => string };

/** Snaps first for everyone, then what his position's role is measured in. */
const COLUMNS: Record<string, Column[]> = {
  QB: [
    { label: 'Carries', value: (r) => count(r.car) },
    { label: 'Passing EPA', value: (r) => epa(r.pepa) },
    { label: 'Rushing EPA', value: (r) => epa(r.repa) },
  ],
  RB: [
    { label: 'Carries', value: (r) => count(r.car) },
    { label: 'Carry share', value: (r) => pct(r.cs) },
    { label: 'Targets', value: (r) => count(r.tgt) },
  ],
  WR: [
    { label: 'Targets', value: (r) => count(r.tgt) },
    { label: 'Target share', value: (r) => pct(r.ts) },
    { label: 'Air yards share', value: (r) => pct(r.ays) },
  ],
  TE: [
    { label: 'Targets', value: (r) => count(r.tgt) },
    { label: 'Target share', value: (r) => pct(r.ts) },
    { label: 'Air yards share', value: (r) => pct(r.ays) },
  ],
};

/**
 * His last three weeks of usage from nflverse: share of the offense's snaps,
 * then the touches his position lives on. Week by week, so it never repeats
 * the season averages the Outlook and Season stats already carry. Kickers
 * and defenses have no usage to show, so they get no widget.
 */
export default function Usage({ playerId, position }: { playerId: string; position: string }) {
  const columns = COLUMNS[position];
  if (!columns) return null;
  const rows = recentUsage(playerId, 3);
  return (
    <section className={`${w.widget} ${w.m}`}>
      <WidgetHead icon="gauge" title="Usage" aside={rows.length ? <span className={w.sub}>nflverse</span> : null} />
      {rows.length ? (
        <div className={u.table} role="table">
          <div className={u.row} role="row">
            <span className={w.subHead} role="columnheader">
              Week
            </span>
            <span className={`${w.subHead} ${u.num}`} role="columnheader">
              Snaps
            </span>
            {columns.map((c) => (
              <span key={c.label} className={`${w.subHead} ${u.num}`} role="columnheader">
                {c.label}
              </span>
            ))}
          </div>
          {rows.map((r) => (
            <div key={r.week} className={`${u.row} ${u.line}`} role="row">
              <span className={u.week} role="cell">
                Week {r.week}
              </span>
              <span className={u.num} role="cell">
                {r.snapsIn ? pct(r.sp) : <span className={u.pending}>Pending</span>}
              </span>
              {columns.map((c) => (
                <span key={c.label} className={u.num} role="cell">
                  {c.value(r)}
                </span>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className={w.empty}>No snaps or touches this season.</p>
      )}
    </section>
  );
}
