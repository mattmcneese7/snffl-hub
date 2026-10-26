'use client';

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'motion/react';
import Link from 'next/link';
import { ViewTransition, useMemo, useState } from 'react';
import type { LabGame, LabLive } from '../kit/liveFeed';
import Rolling from '../kit/Rolling';
import Segmented from '../kit/Segmented';
import { SPRING } from '../kit/motion';
import { useLive } from '../kit/useLive';
import Icon from '../../home/Icons';
import w from '../../home/widgets.module.css';
import { Face, Status, WinBar } from './HeroBug';
import { lean, leaderOf } from './shared';
import { hold } from './stash';
import s from './live.module.css';

type Filter = 'all' | 'close' | 'blowout';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All games' },
  { value: 'close', label: 'Closest' },
  { value: 'blowout', label: 'Blowouts' },
];
/** Closest: the favorite is under 80 percent. Blowouts: 90 percent or more. */
const KEEP: Record<Filter, (g: LabGame) => boolean> = {
  all: () => true,
  close: (g) => lean(g) < 0.3,
  blowout: (g) => lean(g) >= 0.4,
};
const EMPTY: Record<Filter, string> = {
  all: 'No matchups on Sleeper this week.',
  close: 'Nothing close this week. Somebody is getting buried.',
  blowout: 'No blowouts this week. Everybody showed up.',
};

/** In play first, then the closest win chance. */
const order = (a: LabGame, b: LabGame) => Number(b.inPlay) - Number(a.inPlay) || lean(a) - lean(b) || a.matchupId - b.matchupId;

function Card({ game }: { game: LabGame }) {
  const lead = leaderOf(game);
  return (
    <Link href={`/lab/live/${game.matchupId}`} className={s.cardLink} onClick={() => hold(game)}>
      <div className={s.cardHead}>
        <Status game={game} />
        <span className={s.open}>Gamecast</span>
      </div>
      <ViewTransition name={`matchup-${game.matchupId}`}>
        <div className={s.score}>
          {(['away', 'home'] as const).map((k) => {
            const side = game[k];
            return (
              <div key={k} className={s.row}>
                <Face side={side} size={36} />
                <span className={s.who}>
                  <b>{side.firstName}</b>
                  <span className={s.team}>{side.team}</span>
                  <span className={s.count}>
                    {side.inPlay} playing, {side.yetToPlay} to play
                  </span>
                </span>
                <span className={`${s.rowPts} ${lead === k ? s.leadPts : ''}`}>
                  <Rolling value={side.points} />
                </span>
              </div>
            );
          })}
          <WinBar game={game} />
        </div>
      </ViewTransition>
    </Link>
  );
}

/**
 * The live board: every matchup this week, the ones in play on top, then the
 * closest. Scores roll as they land, and when a swing changes the order the
 * cards glide to their new places.
 */
export default function Board({ initial }: { initial: LabLive }) {
  const live = useLive(initial.week, undefined, initial) ?? initial;
  const [filter, setFilter] = useState<Filter>('all');
  const games = useMemo(() => [...live.games].sort(order).filter(KEEP[filter]), [live, filter]);

  return (
    <MotionConfig reducedMotion="user">
      <div className={w.grid}>
        <section className={`${w.widget} ${w.l} ${s.boardHead}`}>
          <div className={w.head}>
            <Icon name="football" className={w.headIcon} />
            <h1 className={`${w.title} ${s.h1}`}>Week {live.week} scoreboard</h1>
            {live.anyLive ? (
              <span className={`${w.aside} ${s.status} ${s.statusLive}`}>
                <span className={s.pulse} aria-hidden />
                Games on
              </span>
            ) : null}
          </div>
          <Segmented options={FILTERS} value={filter} onChange={setFilter} label="Which games" />
        </section>
        <LayoutGroup>
          <AnimatePresence mode="popLayout" initial={false}>
            {games.map((g) => (
              <motion.section
                key={g.matchupId}
                layout
                className={`${w.widget} ${w.l} ${s.card}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={SPRING.glide}
                whileTap={{ scale: 0.98 }}
              >
                <Card game={g} />
              </motion.section>
            ))}
            {!games.length ? (
              <motion.section key="empty" layout className={`${w.widget} ${w.l}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className={s.empty}>{EMPTY[filter]}</p>
              </motion.section>
            ) : null}
          </AnimatePresence>
        </LayoutGroup>
      </div>
    </MotionConfig>
  );
}
