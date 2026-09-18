import Link from 'next/link';
import { league } from '@/lib/league';
import type { PickupCounts } from '@/lib/transactions';
import type { TrophyKey } from '@/lib/trophies';
import type { Standing } from '@/lib/types';
import { TrophyBadges } from './TrophyBits';

/**
 * Seven columns will not fit legibly at 375px, so the table keeps a minimum
 * width and scrolls sideways on a phone rather than crushing team names.
 */
export default function StandingsTable({
  standings,
  limit,
  pickups,
  holders,
}: {
  standings: Standing[];
  limit?: number;
  pickups?: Record<number, PickupCounts>;
  /** Roster id to the trophies it holds from the latest week. */
  holders?: Record<number, TrophyKey[]>;
}) {
  const rows = limit ? standings.slice(0, limit) : standings;
  const lineAfter = league.playoffTeams;
  const showAdds = Boolean(pickups);

  return (
    <div className="snffl-card">
      <div className="snffl-standings-scroll">
        <div className={`snffl-standings-table${showAdds ? '' : ' snffl-standings-table-slim'}`}>
          <div className="snffl-standings-head">
            <span>#</span>
            <span />
            <span>Team</span>
            <span className="snffl-standings-num">W-L</span>
            <span className="snffl-standings-num">PF</span>
            <span className="snffl-standings-num">PA</span>
            {showAdds ? <span className="snffl-standings-num">Adds</span> : null}
          </div>

          {rows.map((team) => {
            const adds = pickups?.[team.rosterId];
            return (
              <Link
                href={`/managers/${team.rosterId}`}
                className={`snffl-standings-row mgr-${team.userId}${
                  team.seed === lineAfter ? ' snffl-standings-playoff-line' : ''
                }`}
                key={team.rosterId}
              >
                <span className="snffl-standings-seed snffl-numeric">{team.seed}</span>
                <span className="snffl-standings-colorbar" />
                <span className="snffl-standings-team">
                  <span className="snffl-standings-team-name">
                    {team.teamName}
                    <TrophyBadges kinds={holders?.[team.rosterId]} size={16} />
                  </span>
                  <span className="snffl-standings-manager">{team.manager}</span>
                </span>
                <span className="snffl-standings-num snffl-numeric">
                  {team.wins}-{team.losses}
                  {team.ties ? `-${team.ties}` : ''}
                  {team.streak ? <span className="snffl-standings-streak"> {team.streak}</span> : null}
                </span>
                <span className="snffl-standings-num snffl-numeric">{team.pointsFor.toFixed(1)}</span>
                <span className="snffl-standings-num snffl-numeric snffl-standings-against">
                  {team.pointsAgainst.toFixed(1)}
                </span>
                {showAdds ? (
                  <span className="snffl-standings-num snffl-numeric">{adds?.total ?? 0}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      {rows.length >= lineAfter ? (
        <div className="snffl-standings-playoff-caption">Playoff line, top {lineAfter}</div>
      ) : null}
    </div>
  );
}
