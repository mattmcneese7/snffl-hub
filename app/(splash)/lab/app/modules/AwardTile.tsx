import Link from 'next/link';
import type { TrophyKey } from '@/lib/trophy-names';
import { AwardArt, AWARD_NAME } from './AwardIcon';
import { managerOf, teamOf } from './shared';
import m from './modules.module.css';

/**
 * One award: the art in a square slot, then three lines and nothing else.
 * The award's name as a label, the team that won it, the manager and the
 * number that won it. Sized to its content; it opens the winner's page.
 */
export default function AwardTile({
  kind,
  rosterId,
  detail,
  mine = false,
  art,
  row = false,
}: {
  kind: TrophyKey;
  rosterId: number;
  detail?: string | null;
  mine?: boolean;
  art?: string;
  /** A divided row inside a list card, for the Trophy Case. */
  row?: boolean;
}) {
  return (
    <Link href={`/lab/app/managers/${rosterId}`} className={`${row ? m.hwRow : m.hw} ${mine ? m.mine : ''}`}>
      <AwardArt kind={kind} art={art} />
      <span className={m.hwText}>
        <small>{AWARD_NAME[kind]}</small>
        <b>{teamOf(rosterId)}</b>
        <span>
          {managerOf(rosterId)}
          {detail ? <> &middot; {detail}</> : null}
        </span>
      </span>
    </Link>
  );
}
