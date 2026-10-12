import Link from 'next/link';
import type { GameLines, NflGame, NflSide } from '@/lib/gameday';
import Icon from '../../home/Icons';
import { Drop, kickoff, quarter, WinBar } from './shared';
import s from '../sb.module.css';

const ORDER = { in: 0, pre: 1, post: 2 } as const;

/**
 * The NFL week as tiles, v2's NflSlate in Pool: live games first, then the
 * next to kick off, then the finished. Each tile has both logos and records,
 * the ball and the score; the win bar (the book's no-vig line before kickoff, ESPN's live
 * model during); the down and distance, or the spread and total; and how many
 * of this league's starters are in it. Each opens the game's own page.
 */
function Team({ side, game, lost }: { side: NflSide; game: NflGame; lost: boolean }) {
  return (
    <span className={`${s.nTeam} ${lost ? s.nLost : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={side.logo} alt="" loading="lazy" />
      <span className={s.nName}>
        <span className={s.nAbbr}>{side.abbr}</span>
        {side.record ? <span className={s.nRecord}>{side.record}</span> : null}
        {game.possession === side.abbr ? (
          <>
            <Icon name="football" className={s.ball} />
            <span className={s.hidden}>has the ball</span>
          </>
        ) : null}
      </span>
      {game.state === 'pre' ? null : <span className={s.nScore}>{side.score ?? 0}</span>}
    </span>
  );
}

export function SlateTile({
  game,
  lines,
  starters,
  lineBook = null,
}: {
  game: NflGame;
  lines?: GameLines;
  starters: number;
  /** The book the widget's source line names; a line from any other book says its own. */
  lineBook?: string | null;
}) {
  const awayWin = lines?.liveHomeWin != null && game.state === 'in' ? 1 - lines.liveHomeWin : (lines?.away.implied ?? null);
  const a = game.away.score ?? 0;
  const h = game.home.score ?? 0;
  const post = game.state === 'post';
  return (
    <Link href={`/nfl/${game.id}`} className={s.tile} aria-label={`${game.away.name} at ${game.home.name}`}>
      <span className={s.tileHead}>
        {game.state === 'in' ? (
          <span className={s.nLive}>
            <Drop />
            {quarter(game.period, game.clock)}
          </span>
        ) : (
          <span className={s.nWhen}>{post ? 'Final' : kickoff(game.kickoff)}</span>
        )}
        {game.broadcast ? <span className={s.nTv}>{game.broadcast}</span> : null}
      </span>

      <span className={s.mRows}>
        <Team side={game.away} game={game} lost={post && a < h} />
        <Team side={game.home} game={game} lost={post && h < a} />
      </span>

      {awayWin != null && !post ? (
        <WinBar away={awayWin} caption={game.state === 'in' ? 'Live win chance' : 'Implied by the line'} />
      ) : null}

      <span className={s.nFoot}>
        {game.state === 'in' && game.situation ? (
          <span>{game.situation}</span>
        ) : lines && (lines.details || lines.overUnder != null) ? (
          <span className={s.pairs}>
            {lines.details ? (
              <span>
                <b>Spread</b> {lines.details}
              </span>
            ) : null}
            {lines.overUnder != null ? (
              <span>
                <b>Total</b> {lines.overUnder}
              </span>
            ) : null}
            {lines.provider !== lineBook ? (
              <span>
                <b>Book</b> {lines.provider}
              </span>
            ) : null}
          </span>
        ) : (
          <span />
        )}
        {starters ? (
          <span className={s.chip}>
            {starters} league {starters === 1 ? 'starter' : 'starters'}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export default function Slate({
  games,
  lines,
  startersByTeam,
  lineBook = null,
}: {
  games: NflGame[];
  lines: Record<string, GameLines>;
  startersByTeam: Record<string, number>;
  lineBook?: string | null;
}) {
  if (!games.length) {
    return <p className={s.empty}>No NFL games on ESPN&rsquo;s slate.</p>;
  }
  const sorted = [...games].sort((x, y) => ORDER[x.state] - ORDER[y.state] || x.kickoff.localeCompare(y.kickoff));
  return (
    <div className={s.tiles}>
      {sorted.map((g) => (
        <SlateTile key={g.id} game={g} lines={lines[g.id]} starters={(startersByTeam[g.home.abbr] ?? 0) + (startersByTeam[g.away.abbr] ?? 0)} lineBook={lineBook} />
      ))}
    </div>
  );
}
