import Link from 'next/link';
import Fold from '../kit/Fold';
import Icon from './Icons';
import BroadcastIcon from './BroadcastIcon';
import d from './thedrop.module.css';

/**
 * The Drop, the league live: on Sundays and Mondays it leads the Home, ahead
 * of the Rag. Its head opens and closes it. Inside: how much of the week is
 * on and left, your game, then the three numbers the group chat argues about
 * (top score, Shart watch, closest game), each marked up in Squirt's pen.
 */

export type DropSide = { rosterId: number; teamName: string; points: number; done: number; yetToPlay: number; inPlay: number; winProb: number | null };
export type DropGame = { matchupId: number; away: DropSide; home: DropSide };

const pts = (n: number) => n.toFixed(2);

/** Squirt's read on the closest game, by how close it really is. */
const closeNote = (gap: number) => (gap < 3 ? 'nobody breathe' : gap < 10 ? 'sweaty' : 'not that close');

export default function TheDrop({
  games,
  day,
  live,
  mine,
  nameOf,
  week,
}: {
  games: DropGame[];
  /** Sunday, Monday, or Game day. */
  day: string;
  live: boolean;
  mine: number | null;
  nameOf: (rosterId: number) => string;
  week: number;
}) {
  if (!games.length) return null;
  const sides = games.flatMap((g) => [g.away, g.home]);
  const onField = games.filter((g) => g.away.inPlay + g.home.inPlay > 0).length;
  const toPlay = sides.reduce((n, s) => n + s.yetToPlay + s.inPlay, 0);
  const done = sides.reduce((n, s) => n + s.done, 0);
  const all = done + toPlay;
  const played = all ? Math.round((done / all) * 100) : 0;
  const top = sides.reduce((a, b) => (b.points > a.points ? b : a));
  const low = sides.reduce((a, b) => (b.points < a.points ? b : a));
  const closest = games.reduce((a, b) => (Math.abs(b.away.points - b.home.points) < Math.abs(a.away.points - a.home.points) ? b : a));
  const gap = Math.abs(closest.away.points - closest.home.points);
  const yours = mine != null ? games.find((g) => g.away.rosterId === mine || g.home.rosterId === mine) : undefined;
  const you = yours ? (yours.away.rosterId === mine ? yours.away : yours.home) : undefined;
  const them = yours ? (yours.away.rosterId === mine ? yours.home : yours.away) : undefined;
  // 1 to 99, never a certainty while anyone is left to play.
  const chance = you?.winProb != null ? Math.min(99, Math.max(1, Math.round(you.winProb * 100))) : null;
  const sub = day === 'Sunday' || day === 'Monday' ? `Your ${day} check-in` : 'Your gameday check-in';

  return (
    <Fold
      className={d.drop}
      headClassName={d.head}
      label="The Drop"
      head={
        <>
          <BroadcastIcon live={live} className={d.mark} />
          <span className={d.title}>
            <span className={d.name}>The Drop</span>
            <span className={d.sub}>{sub}</span>
          </span>
        </>
      }
    >
      <div className={d.body}>
        <div className={d.counts}>
          <span>
            <b>{onField}</b>
            {onField === 1 ? 'game live' : 'games live'}
          </span>
          <span>
            <b>{toPlay}</b>
            {toPlay === 1 ? 'player to play' : 'players to play'}
          </span>
          <span>
            <b>{played}%</b>
            played
          </span>
        </div>

        {yours && you && them ? (
          <Link href={`/scoreboard/${week}/${yours.matchupId}`} className={d.yours}>
            <span className={d.yoursTop}>
              <span className={d.label}>Your game</span>
              {chance != null ? <span className={d.chance}>{chance}% to win</span> : null}
            </span>
            <span className={d.score}>
              <b className={you.points >= them.points ? d.ahead : ''}>{pts(you.points)}</b>
              <span>to</span>
              <b className={them.points > you.points ? d.ahead : ''}>{pts(them.points)}</b>
            </span>
            {chance != null ? (
              <span className={d.bar} aria-hidden>
                <span style={{ width: `${chance}%` }} />
              </span>
            ) : null}
            <span className={d.teams}>
              {you.teamName} v {them.teamName}
            </span>
            <span className={d.left}>
              {you.yetToPlay + you.inPlay} to play for you, {them.yetToPlay + them.inPlay} for them
            </span>
          </Link>
        ) : null}

        <ul className={d.facts}>
          <li>
            <Link href={`/scoreboard/${week}`} className={d.fact}>
              <Icon name="crown" className={d.factIcon} />
              <span className={d.factText}>
                <span className={d.label}>Top score</span>
                <span>{top.teamName}</span>
              </span>
              <b className={d.num}>
                {pts(top.points)}
                <span className={`${d.note} ${d.noteTop}`}>show off</span>
              </b>
            </Link>
          </li>
          <li>
            <Link href={`/scoreboard/${week}`} className={d.fact}>
              <Icon name="toiletPaper" className={d.factIcon} />
              <span className={d.factText}>
                <span className={d.label}>Shart watch</span>
                <span>{low.teamName}</span>
              </span>
              <b className={d.num}>
                <svg className={d.ring} viewBox="0 0 120 50" preserveAspectRatio="none" aria-hidden>
                  <path d="M8 26 C 6 10, 40 3, 66 4 C 96 5, 116 13, 113 27 C 110 42, 76 48, 50 46 C 22 44, 4 38, 9 22 C 11 15, 20 10, 30 8" />
                </svg>
                {pts(low.points)}
                <span className={`${d.note} ${d.noteLow}`}>yikes</span>
              </b>
            </Link>
          </li>
          <li>
            <Link href={`/scoreboard/${week}/${closest.matchupId}`} className={d.fact}>
              <Icon name="timer" className={d.factIcon} />
              <span className={d.factText}>
                <span className={d.label}>Closest</span>
                <span>
                  {nameOf(closest.away.rosterId)} v {nameOf(closest.home.rosterId)}
                </span>
              </span>
              <b className={d.num}>
                {pts(gap)}
                <span className={`${d.note} ${d.noteClose}`}>{closeNote(gap)}</span>
              </b>
            </Link>
          </li>
        </ul>
      </div>
    </Fold>
  );
}
