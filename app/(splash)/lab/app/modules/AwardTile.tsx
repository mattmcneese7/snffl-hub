import type { TrophyKey } from '@/lib/trophy-names';
import { AwardArt, AWARD_NAME } from './AwardIcon';
import { managerOf, teamOf } from './shared';
import { Row } from '../ui';

/**
 * One award as a row: the art, the award's name as a label, the team that
 * won it, the manager and the number that won it. It opens the winner's page.
 */
export default function AwardTile({ kind, rosterId, detail, mine = false, art }: { kind: TrophyKey; rosterId: number; detail?: string | null; mine?: boolean; art?: string; row?: boolean }) {
  return (
    <Row
      href={`/lab/app/managers/${rosterId}`}
      lead={<AwardArt kind={kind} art={art} />}
      label={AWARD_NAME[kind]}
      title={teamOf(rosterId)}
      strong={mine}
      sub={`${managerOf(rosterId)}${detail ? ` · ${detail}` : ''}`}
    />
  );
}
