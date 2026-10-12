import Link from 'next/link';
import Widget from '../home/Widget';
import type { IconName } from '../home/Icons';
import s from './statrow.module.css';

export type Stat = { label: string; value: string; sub?: string; sub2?: string; href?: string };

/**
 * A season in four numbers, in one compact widget: label, number, one line
 * under it, side by side with hairlines between. Four small facts read
 * better as a row than as four cards floating apart.
 */
export default function StatRow({ icon, title, stats }: { icon: IconName; title: string; stats: Stat[] }) {
  return (
    <Widget size="m" icon={icon} title={title}>
      <dl className={s.row}>
        {stats.map((st) => {
          const body = (
            <>
              <dt className={s.label}>{st.label}</dt>
              <dd className={s.value}>{st.value}</dd>
              {st.sub ? <dd className={s.sub}>{st.sub}</dd> : null}
              {st.sub2 ? <dd className={s.sub}>{st.sub2}</dd> : null}
            </>
          );
          return st.href ? (
            <Link key={st.label} href={st.href} className={s.cell}>
              {body}
            </Link>
          ) : (
            <div key={st.label} className={s.cell}>
              {body}
            </div>
          );
        })}
      </dl>
    </Widget>
  );
}
