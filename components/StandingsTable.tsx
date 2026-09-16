import { league } from '@/lib/league';
import type { Standing } from '@/lib/types';

export default function StandingsTable({
  standings,
  limit,
}: {
  standings: Standing[];
  limit?: number;
}) {
  const rows = limit ? standings.slice(0, limit) : standings;
  const lineAfter = league.playoffTeams;

  return (
    <div className="snffl-card">
      {rows.map((team) => (
        <div
          key={team.rosterId}
          className={`snffl-standings-row mgr-${team.userId}${
            team.seed === lineAfter ? ' snffl-standings-playoff-line' : ''
          }`}
        >
          <span className="snffl-standings-seed snffl-numeric">{team.seed}</span>
          <span className="snffl-standings-colorbar" />
          <span className="snffl-standings-team">
            <span className="snffl-standings-team-name">{team.teamName}</span>
            <span className="snffl-standings-manager">{team.manager}</span>
          </span>
          <span className="snffl-standings-record snffl-numeric">
            {team.wins}-{team.losses}
            {team.ties ? `-${team.ties}` : ''}
            {team.streak ? <span className="snffl-standings-streak"> {team.streak}</span> : null}
          </span>
          <span className="snffl-standings-points snffl-numeric">{team.pointsFor.toFixed(2)}</span>
        </div>
      ))}
      {rows.length >= lineAfter ? (
        <div className="snffl-standings-playoff-caption">Playoff line, top {lineAfter}</div>
      ) : null}
    </div>
  );
}
