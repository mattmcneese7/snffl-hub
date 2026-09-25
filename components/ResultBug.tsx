import Link from 'next/link';
import { teamByRoster } from '@/lib/league';
import type { Game, GameSide } from '@/lib/types';

/** Model output for the list, optional so the bug still renders without it. */
export type BugOutlook = {
  awayWin: number;
  homeWin: number;
  awayProjected: number;
  homeProjected: number;
};
import { LiveTeamPoints } from './LiveScores';
import ManagerLink from './ManagerLink';
import TeamAvatar from './TeamAvatar';
import WinBar from './WinBar';

/**
 * WIN or LOSE, inline to the left of the team's avatar.
 *
 * Only rendered once a result exists: a live or pending game has no winner, so
 * a badge there would be meaningless. The meta line below still reports the
 * game state in those cases.
 */
function Outcome({ game, side }: { game: Game; side: GameSide }) {
  // Final only. A live game has a leader, not a winner, and calling the
  // leader WIN at 27.90 to -4.00 on a Thursday night is a lie by Sunday.
  if (game.winner == null || game.status !== 'final') {
    return <span className="snffl-outcome snffl-outcome-none" aria-hidden />;
  }
  const won = game.winner === side.rosterId;
  return (
    <span className={`snffl-outcome ${won ? 'snffl-outcome-win' : 'snffl-outcome-lose'}`}>
      {won ? 'WIN' : 'LOSE'}
    </span>
  );
}

/**
 * Live state, pinned to the upper right of the box.
 *
 * Red rather than the brief's blue --live token: a red dot is the broadcast
 * convention and Matt asked for it explicitly.
 */
function LiveBadge() {
  return (
    <span className="snffl-live-badge">
      <span className="snffl-live-badge-dot" aria-hidden />
      LIVE
    </span>
  );
}

function Side({ side, game, projected }: { side: GameSide; game: Game; projected?: number }) {
  const team = teamByRoster(side.rosterId);
  const decided = game.winner != null && game.status === 'final';
  const lost = decided && game.winner !== side.rosterId;

  return (
    <div
      className={`snffl-bug-side${lost ? ' snffl-bug-side-loser' : ''}${game.status === 'final' ? '' : ' snffl-bug-side-open'}`}
    >
      {game.status === 'final' ? <Outcome game={game} side={side} /> : null}
      <TeamAvatar rosterId={side.rosterId} className="snffl-bug-avatar" />
      <ManagerLink rosterId={side.rosterId} className="snffl-bug-team">
        {team?.teamName ?? side.team}
      </ManagerLink>
      <span className="snffl-bug-score-wrap">
        {projected != null && game.status !== 'final' ? (
          <span className="snffl-bug-proj">P {projected.toFixed(1)}</span>
        ) : null}
        <LiveTeamPoints
          rosterId={side.rosterId}
          week={game.week}
          fallback={side.points}
          className="snffl-bug-score snffl-numeric"
        />
      </span>
    </div>
  );
}

export default function ResultBug({ game, outlook }: { game: Game; outlook?: BugOutlook }) {
  const close = game.status !== 'pending' && game.margin < 10;

  return (
    <div className="snffl-bug-link snffl-card-link">
      <Link
        className="snffl-card-link-cover"
        href={`/matchups/${game.week}/${game.matchupId}`}
        aria-label={`Open ${game.away.team} against ${game.home.team}`}
      />
      <div className={`snffl-bug${game.status === 'live' ? ' snffl-bug-live' : ''}`}>
        {game.status === 'live' ? <LiveBadge /> : null}
        <div className="snffl-bug-body">
          <Side side={game.away} game={game} projected={outlook?.awayProjected} />
          <Side side={game.home} game={game} projected={outlook?.homeProjected} />
          {outlook && game.status !== 'final' ? (
            // The same bar the matchup page draws, in the same two team
            // colours. This row used to paint itself blue against red whoever
            // was playing, so the colour said nothing and contradicted the
            // card you reached by tapping it.
            <WinBar
              compact
              away={{
                pct: outlook.awayWin,
                primary: teamByRoster(game.away.rosterId)?.colors?.primary ?? '#72809f',
                name: teamByRoster(game.away.rosterId)?.teamName ?? game.away.team,
              }}
              home={{
                pct: outlook.homeWin,
                primary: teamByRoster(game.home.rosterId)?.colors?.primary ?? '#72809f',
                name: teamByRoster(game.home.rosterId)?.teamName ?? game.home.team,
              }}
            />
          ) : null}
          <div className="snffl-bug-meta">
            {game.status === 'pending' ? (
              <span>Not started</span>
            ) : (
              <>
                {/* Color never works alone, so a close game says so in words. */}
                <span className="snffl-margin-chip">
                  <span>
                    &#9650; {game.margin.toFixed(2)}
                    {close ? ' · CLOSE' : ''}
                  </span>
                </span>
                <span>{game.status === 'live' ? 'Live' : 'Final'}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
