import Link from 'next/link';
import type { TrophyBoard } from '@/lib/trophies';
import { trophyBoard } from '../cached';
import AwardDeck from './AwardDeck';
import { AWARD_NAME } from './AwardIcon';
import { managerOf, teamOf } from './shared';
import s from '../v4.module.css';

/**
 * Hardware: the latest finished week's awards as Squirt's stage, one slide
 * per award. Pass `board` if the page has it.
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
      <div style={{ marginTop: 8 }}>
        <AwardDeck
          awards={b.latest.map((a) => ({
            kind: a.kind,
            name: AWARD_NAME[a.kind],
            rosterId: a.rosterId,
            team: teamOf(a.rosterId),
            manager: managerOf(a.rosterId),
            detail: a.detail ?? null,
            mine: a.rosterId === mine,
          }))}
        />
      </div>
    </section>
  );
}
