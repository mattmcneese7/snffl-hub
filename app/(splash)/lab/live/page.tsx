import type { Metadata } from 'next';
import { scoredWeek } from '@/lib/league';
import w from '../../home/widgets.module.css';
import Board from './Board';
import { labLive } from './winpath';
import s from './live.module.css';

export const metadata: Metadata = { title: { absolute: 'Gameday Live, Splash 4.0 lab' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** The live board: every matchup this week, polled and reordered as it plays out. */
export default async function LivePage() {
  const week = await scoredWeek();
  const initial = await labLive(week);
  if (!initial) {
    return (
      <div className={w.grid}>
        <section className={`${w.widget} ${w.l}`}>
          <p className={s.empty}>Sleeper is not answering right now. Try again in a minute.</p>
        </section>
      </div>
    );
  }
  return <Board initial={initial} />;
}
