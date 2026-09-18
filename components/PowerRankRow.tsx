import type { PowerRank } from '@/lib/league';
import ManagerLink from './ManagerLink';

/** Top 3 solid, the rest outlined, movement in a fixed right column. */
export default function PowerRankRow({ entry }: { entry: PowerRank }) {
  const { rank, movement, team, blurb } = entry;

  const movementLabel =
    movement == null || movement === 0
      ? movement === 0 ? 'even' : 'new'
      : `${movement > 0 ? '▲' : '▼'} ${Math.abs(movement)}`;

  const movementClass =
    movement == null || movement === 0
      ? ''
      : movement > 0
        ? ' snffl-rank-movement-up'
        : ' snffl-rank-movement-down';

  return (
    <div className={`snffl-rank-row mgr-${team.userId}`}>
      <span className={`snffl-rank-number${rank <= 3 ? ' snffl-rank-number-top' : ''}`}>
        <span>{rank}</span>
      </span>
      <span className="snffl-standings-colorbar" />
      <span>
        <ManagerLink rosterId={team.rosterId} className="snffl-standings-team-name">
          {team.teamName}
        </ManagerLink>
        <ManagerLink rosterId={team.rosterId} className="snffl-standings-manager">
          {team.manager}
        </ManagerLink>
        <span className="snffl-rank-blurb">{blurb}</span>
      </span>
      <span className={`snffl-rank-movement${movementClass}`}>{movementLabel}</span>
    </div>
  );
}
