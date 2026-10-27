import Link from 'next/link';
import { getTrophyBoard, type TrophyBoard } from '@/lib/trophies';
import AwardIcon, { AWARD_NAME } from './AwardIcon';
import { managerOf, teamOf } from './shared';
import s from '../v4.module.css';
import m from './modules.module.css';

/**
 * Hardware: the latest finished week's awards, one gold tile each, the team
 * that won it first and the manager under it. Pass `board` if the page has it.
 */
export default async function Hardware({ board }: { board?: TrophyBoard }) {
  const b = board ?? (await getTrophyBoard().catch(() => null));
  if (!b?.latest.length) return null;
  return (
    <section aria-label={`Week ${b.latestWeek} hardware`}>
      <div className={s.title}>
        <h2>Week {b.latestWeek} Hardware</h2>
        <Link href="/lab/app/trophies">Trophy case</Link>
      </div>
      <div className={m.rail} style={{ marginTop: 8 }}>
        {b.latest.map((a) => (
          <div key={a.kind} className={m.hwTile}>
            <AwardIcon kind={a.kind} size={36} />
            <small>{AWARD_NAME[a.kind]}</small>
            <span className={m.hwWho}>
              <b>{teamOf(a.rosterId)}</b>
              <span>
                {managerOf(a.rosterId)} &middot; {a.detail}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
