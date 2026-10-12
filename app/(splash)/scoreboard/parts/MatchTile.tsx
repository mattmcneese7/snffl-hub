import Link from 'next/link';
import { LiveTeamPoints } from '@/components/LiveScores';
import { teamByRoster } from '@/lib/league';
import type { Game, GameSide } from '@/lib/types';
import Squirt from '../../home/Squirt';
import type { Lore } from './lore';
import { Drop, nameOf, pts, WinBar } from './shared';
import s from '../sb.module.css';

type Outlook = { awayWin: number; homeWin: number; awayProjected: number; homeProjected: number };

/**
 * One league matchup as a tile, v2's ResultBug grown up: WIN and LOSE once
 * it is final (a live game has a leader, not a winner), the live drop when
 * a starter is on the field right now, both avatars, teams, managers and a
 * piece of lore each, the scores ticking live, each side's projection, the
 * model's win bar, and the margin with CLOSE said in words under 10.
 */
export default function MatchTile({
  game,
  outlook,
  mine,
  lore,
  closest = false,
}: {
  game: Game;
  outlook?: Outlook;
  mine: boolean;
  lore: (rosterId: number) => Lore;
  closest?: boolean;
}) {
  const final = game.status === 'final' && game.winner != null;
  const close = game.status !== 'pending' && game.margin < 10;
  const leader = game.away.points === game.home.points ? null : game.away.points > game.home.points ? game.away.rosterId : game.home.rosterId;

  const row = (side: GameSide, projected?: number) => {
    const team = teamByRoster(side.rosterId);
    const won = final && game.winner === side.rosterId;
    const lost = final && !won;
    const chip = lore(side.rosterId)[0];
    return (
      <div key={side.rosterId} className={`${s.mRow} ${final ? s.mRowFlag : ''} ${leader === side.rosterId ? s.mLead : ''} ${lost ? s.mLost : ''}`}>
        {final ? <span className={`${s.flag} ${lost ? s.flagLose : ''}`}>{won ? 'WIN' : 'LOSE'}</span> : null}
        <span className={s.avatar}>
          {team?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.avatarUrl} alt="" loading="lazy" />
          ) : null}
        </span>
        <span className={s.mWho}>
          <span className={s.mTeam}>{team?.teamName ?? side.team}</span>
          <span className={s.mLine}>
            <span className={s.sub}>
              {nameOf(side.rosterId, side.manager)}
              {team ? `, ${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}` : ''}
            </span>
            {chip ? <span className={`${s.chip} ${chip.hot ? s.chipHot : ''}`}>{chip.text}</span> : null}
          </span>
        </span>
        <span className={s.mRight}>
          <LiveTeamPoints rosterId={side.rosterId} week={game.week} fallback={side.points} className={s.mScore} />
          {projected != null && game.status !== 'final' ? <span className={s.sub}>Projected {projected.toFixed(1)}</span> : null}
        </span>
      </div>
    );
  };

  return (
    <Link
      href={`/scoreboard/${game.week}/${game.matchupId}`}
      className={`${s.tile} ${mine ? s.tileMine : ''}`}
      aria-label={`${game.away.team} against ${game.home.team}`}
    >
      {mine || closest || game.inPlay ? (
        <span className={s.tileHead}>
          <span className={s.tileHeadLeft}>
            {mine ? <span className={s.label}>Your game</span> : null}
            {!mine && closest ? (
              <span className={s.tileHeadLeft}>
                <Squirt mood="sweat" size={20} />
                <span className={s.label}>Closest game</span>
              </span>
            ) : null}
          </span>
          {game.inPlay ? (
            <span className={s.liveTag}>
              <Drop />
              On the field
            </span>
          ) : null}
        </span>
      ) : null}

      <span className={s.mRows}>
        {row(game.away, outlook?.awayProjected)}
        {row(game.home, outlook?.homeProjected)}
      </span>

      {outlook && game.status !== 'final' ? <WinBar away={outlook.awayWin} /> : null}

      <span className={s.mFoot}>
        {game.status === 'pending' ? (
          <span>Upcoming</span>
        ) : (
          <span className={s.mFootLeft}>
            <span>
              Margin <b>{pts(game.margin)}</b>
            </span>
            {close ? <span className={s.chip}>CLOSE</span> : null}
          </span>
        )}
        {/* On the field is already in the tile's head. */}
        <span>{game.inPlay ? '' : game.status === 'final' ? 'Final' : game.status === 'live' ? 'In progress' : ''}</span>
      </span>
    </Link>
  );
}
