'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { ViewTransition } from 'react';
import { CaretLeft } from '@phosphor-icons/react';
import type { LabGame, LabSide } from '../kit/liveFeed';
import Rolling from '../kit/Rolling';
import { SPRING } from '../kit/motion';
import w from '../../home/widgets.module.css';
import { leaderOf, shownPct, statusOf } from './shared';
import s from './live.module.css';

export function Face({ side, size }: { side: LabSide; size: number }) {
  return (
    <span className={s.face} style={{ width: size, height: size, ['--mgr' as string]: side.color ?? '#c9dcfa' }}>
      {side.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={side.avatarUrl} alt="" />
      ) : null}
    </span>
  );
}

export function Status({ game }: { game: LabGame }) {
  const text = statusOf(game);
  return (
    <span className={`${s.status} ${game.inPlay ? s.statusLive : ''}`}>
      {game.inPlay ? <span className={s.pulse} aria-hidden /> : null}
      {text}
    </span>
  );
}

/** The win chance as one bar: the away side's share in powder, the home side's in deep blue. */
export function WinBar({ game, big = false }: { game: LabGame; big?: boolean }) {
  const a = shownPct(game, 'away');
  const h = shownPct(game, 'home');
  return (
    <div
      className={`${s.wp} ${big ? s.wpBig : ''}`}
      role="img"
      aria-label={`Win chance: ${game.away.firstName} ${a}%, ${game.home.firstName} ${h}%`}
    >
      <Rolling className={s.wpNum} value={a} decimals={0} suffix="%" />
      <span className={`${s.wpTrack} ${game.home.winProb > game.away.winProb ? s.wpHomeFav : ''}`} aria-hidden>
        <motion.span className={`${s.wpAway} ${game.away.winProb >= game.home.winProb ? s.wpAwayFav : ''}`} initial={false} animate={{ width: `${game.away.winProb * 100}%` }} transition={SPRING.roll} />
      </span>
      <Rolling className={`${s.wpNum} ${s.wpR}`} value={h} decimals={0} suffix="%" />
    </div>
  );
}

/**
 * The gamecast's score bug: both managers, the score rolling live, where
 * each is expected to finish, and the win chance in big numbers. It carries
 * the same view transition name as the board's card, so the card grows into
 * it on the way in and shrinks back on the way out.
 */
export default function HeroBug({ game }: { game: LabGame }) {
  const lead = leaderOf(game);
  return (
    <section className={`${w.widget} ${w.l} ${s.hero}`}>
      <div className={s.heroTop}>
        <Link href="/lab/live" className={s.back}>
          <CaretLeft weight="bold" aria-hidden />
          All games
        </Link>
        <Status game={game} />
      </div>
      <ViewTransition name={`matchup-${game.matchupId}`}>
        <div className={s.bug}>
          <div className={s.bugSides}>
            {(['away', 'home'] as const).map((k) => {
              const side = game[k];
              return (
                <div key={k} className={`${s.bugSide} ${k === 'home' ? s.bugRight : ''}`}>
                  <Face side={side} size={52} />
                  <b className={s.bugName}>{side.firstName}</b>
                  <span className={s.bugTeam}>{side.team}</span>
                  <span className={`${s.bugPts} ${lead === k ? s.leadPts : ''}`}>
                    <Rolling value={side.points} />
                  </span>
                  <span className={s.bugProj}>
                    Projected <Rolling value={side.expected} />
                  </span>
                  <span className={s.bugCount}>
                    {side.inPlay} playing, {side.yetToPlay} to play
                  </span>
                </div>
              );
            })}
          </div>
          <div className={s.bugWin}>
            <span className={s.bugWinLabel}>Win chance</span>
            <WinBar game={game} big />
          </div>
        </div>
      </ViewTransition>
    </section>
  );
}
