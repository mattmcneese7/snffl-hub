import Link from 'next/link';
import type { TrophyBoard } from '@/lib/trophies';
import { trophyBoard } from '../cached';
import AwardTile from './AwardTile';
import s from '../v4.module.css';

/**
 * Hardware: the latest finished week's awards, one tile each in a rail.
 * Pass `board` if the page has it.
 */
export default async function Hardware({ board, mine = null }: { board?: TrophyBoard; mine?: number | null }) {
  const b = board ?? (await trophyBoard().catch(() => null));
  if (!b?.latest.length) return null;
  return (
    <section aria-label={`Week ${b.latestWeek} hardware`}>
      <div className={s.title}>
        <h2>Week {b.latestWeek} Hardware</h2>
        <Link href="/lab/app/trophies">Trophy case</Link>
      </div>
      <div className={s.rail} style={{ marginTop: 8 }}>
        {b.latest.map((a) => (
          <AwardTile key={a.kind} kind={a.kind} rosterId={a.rosterId} detail={a.detail} mine={a.rosterId === mine} />
        ))}
      </div>
    </section>
  );
}
