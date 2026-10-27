import type { GameView, SideView } from '../data';
import { LivePoints } from '../live/Live';
import { Avatar, List, Pair, ui, type PairSide } from '../ui';

function side(x: SideView, week: number, live: boolean): PairSide {
  return {
    lead: <Avatar src={x.avatar} color={x.color} size={28} />,
    title: x.team,
    sub: x.manager,
    value: live ? <LivePoints week={week} rosterId={x.rosterId} fallback={x.score} /> : x.score.toFixed(2),
    mark: x.mark === 'W' || x.mark === 'L' ? <b className={ui.strong}>{x.mark}</b> : x.mark,
    lost: x.lost,
  };
}

/**
 * Matchups as one list of kit pairs: two team lines and a labeled foot, the
 * loser grey only once final. Home and Scores both use it, so they match.
 */
export default function MatchupRows({ games, week, live, current = true }: { games: GameView[]; week: number; live: boolean; current?: boolean }) {
  return (
    <List tap>
      {games.map((g) => (
        <Pair
          key={g.id}
          href={`/lab/app/matchup?id=${g.id}${current ? '' : `&week=${week}`}`}
          label={`${g.a.team} against ${g.b.team}`}
          sides={[side(g.a, week, live), side(g.b, week, live)]}
          foot={g.foot}
        />
      ))}
    </List>
  );
}
