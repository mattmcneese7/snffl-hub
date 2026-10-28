import type { ReactNode } from 'react';
import { Stats } from '../ui';
import l from './layout.module.css';

/** Kit stats, three or four to a line, for more numbers than one line holds. */
export default function StatGrid({ items, per = 3 }: { items: { value: ReactNode; label: string }[]; per?: 3 | 4 }) {
  if (!items.length) return null;
  return (
    <div className={per === 4 ? l.per4 : l.per3}>
      <Stats items={items} />
    </div>
  );
}
