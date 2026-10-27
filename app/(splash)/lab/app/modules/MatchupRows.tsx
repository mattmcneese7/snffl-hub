import Link from 'next/link';
import type { GameView, SideView } from '../data';
import { LivePoints } from '../live/Live';
import s from '../v4.module.css';

function Row({ side, week, live }: { side: SideView; week: number; live: boolean }) {
  return (
    <span className={`${s.row} ${side.lost ? s.lost : ''}`}>
      <span className={s.av} style={{ width: 26, height: 26, ['--mgr' as string]: side.color }}>
        {side.avatar ? <img src={side.avatar} alt="" /> : null}
      </span>
      <span className={s.who}>
        <b>{side.team}</b>
        <small>{side.manager}</small>
      </span>
      <span className={s.score}>{live ? <LivePoints week={week} rosterId={side.rosterId} fallback={side.score} /> : side.score.toFixed(2)}</span>
      <small className={s.mark}>
        {side.mark === 'W' || side.mark === 'L' ? <b className={side.mark === 'W' ? s.win : s.loss}>{side.mark}</b> : side.mark}
      </small>
    </span>
  );
}

/**
 * Matchups as one list: each game two team rows and a labeled footer, the
 * loser grey only once final. Home and Scores both use it, so they match.
 */
export default function MatchupRows({ games, week, live, current = true }: { games: GameView[]; week: number; live: boolean; current?: boolean }) {
  return (
    <div className={s.list}>
      {games.map((g) => (
        <Link key={g.id} href={`/lab/app/matchup?id=${g.id}${current ? '' : `&week=${week}`}`} className={s.game}>
          <Row side={g.a} week={week} live={live} />
          <Row side={g.b} week={week} live={live} />
          <small className={s.foot}>{g.foot}</small>
        </Link>
      ))}
    </div>
  );
}
