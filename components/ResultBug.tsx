import Link from 'next/link';
import { teamByRoster } from '@/lib/league';
import type { Game, GameSide } from '@/lib/types';
import TeamAvatar from './TeamAvatar';

/**
 * WIN or LOSE, inline to the left of the team's avatar.
 *
 * Only rendered once a result exists: a live or pending game has no winner, so
 * a badge there would be meaningless. The meta line below still reports the
 * game state in those cases.
 */
function Outcome({ game, side }: { game: Game; side: GameSide }) {
  if (game.winner == null) {
    return <span className="snffl-outcome snffl-outcome-none" aria-hidden />;
  }
  const won = game.winner === side.rosterId;
  return (
    <span className={`snffl-outcome ${won ? 'snffl-outcome-win' : 'snffl-outcome-lose'}`}>
      {won ? 'WIN' : 'LOSE'}
    </span>
  );
}

function Side({ side, game }: { side: GameSide; game: Game }) {
  const team = teamByRoster(side.rosterId);
  const decided = game.winner != null;
  const lost = decided && game.winner !== side.rosterId;

  return (
    <div className={`snffl-bug-side${lost ? ' snffl-bug-side-loser' : ''}`}>
      <Outcome game={game} side={side} />
      <TeamAvatar rosterId={side.rosterId} className="snffl-bug-avatar" />
      <span className="snffl-bug-team">{team?.teamName ?? side.team}</span>
      <span className="snffl-bug-score snffl-numeric">{side.points.toFixed(2)}</span>
    </div>
  );
}

export default function ResultBug({ game }: { game: Game }) {
  const close = game.status !== 'pending' && game.margin < 10;

  return (
    <Link className="snffl-bug-link" href={`/matchups/${game.week}/${game.matchupId}`}>
      <div className="snffl-bug">
        <div className="snffl-bug-body">
          <Side side={game.away} game={game} />
          <Side side={game.home} game={game} />
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
    </Link>
  );
}
