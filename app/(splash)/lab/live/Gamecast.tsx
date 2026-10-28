'use client';

import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import type { LabGame, LabLive, LabSide, LabStarter } from '../kit/liveFeed';
import Press from '../kit/Press';
import Rolling from '../kit/Rolling';
import Sheet from '../kit/Sheet';
import { SPRING } from '../kit/motion';
import { useLive, type ScoreEvent } from '../kit/useLive';
import { PillLink } from '../../home/Glass';
import { WidgetHead } from '../../home/Widget';
import w from '../../home/widgets.module.css';
import { nflTeamName } from '../../kit/nflTeams';
import { statWords } from '../../kit/statWords';
import HeroBug from './HeroBug';
import { isDone, whatItTakes } from './shared';
import WinChart from './WinChart';
import type { Clock, Extras } from './winpath';
import s from './live.module.css';

type Side = 'away' | 'home';
type Play = { key: string; at: string; side: Side; firstName: string; player: LabStarter; delta: number };

const timeOf = (iso: string) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

function stateOf(p: LabStarter, clock: Clock | undefined): string {
  if (p.gameState === 'bye' || !clock) return p.team ? 'Bye' : 'Empty';
  return clock.short;
}

function PlayerCell({ p, clock, right, onOpen }: { p: LabStarter | undefined; clock: Clock | undefined; right?: boolean; onOpen: () => void }) {
  if (!p) return <span className={`${s.pCell} ${right ? s.pRight : ''}`} />;
  return (
    <Press className={`${s.pCell} ${right ? s.pRight : ''}`} onClick={onOpen} aria-label={`${p.name}, ${p.points.toFixed(2)} points. Details`}>
      <span className={s.pText}>
        <span className={s.pName}>{p.name}</span>
        <span className={s.pSub}>
          {p.gameState === 'in' ? <span className={s.pulse} aria-hidden /> : null}
          {stateOf(p, clock)}
        </span>
      </span>
      <span className={`${s.pPts} ${p.gameState === 'pre' ? s.pPre : ''}`}>
        {/* Before kickoff a 0 is not a score: a dash and his projection, as in 3.0. */}
        {p.gameState === 'pre' ? (
          <>
            <span>–</span>
            {p.projected != null ? <span className={s.pProj}>Proj {p.projected.toFixed(2)}</span> : null}
          </>
        ) : (
          <Rolling value={p.points} />
        )}
      </span>
    </Press>
  );
}

function PlayerSheet({ p, side, clock }: { p: LabStarter; side: LabSide; clock: Clock | undefined }) {
  const line = statWords(p.statLine);
  return (
    <>
      <div className={s.shHead}>
        <span className={s.shFace}>
          {p.headshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.headshot} alt="" />
          ) : null}
        </span>
        <span className={s.shWho}>
          <b className={s.shName}>{p.name}</b>
          <span className={s.shSub}>
            {p.position}
            {p.team ? `, ${nflTeamName(p.team)}` : ''}
          </span>
          <span className={s.shSub}>
            {side.firstName}&rsquo;s {p.slot}
          </span>
        </span>
      </div>
      <div className={s.tiles}>
        <span className={s.tile}>
          <span className={s.tileLabel}>Points</span>
          {p.gameState === 'pre' ? <span className={s.tileBig}>–</span> : <Rolling className={s.tileBig} value={p.points} />}
        </span>
        <span className={s.tile}>
          <span className={s.tileLabel}>Projected</span>
          <span className={s.tileBig}>{p.projected != null ? p.projected.toFixed(2) : 'None'}</span>
        </span>
      </div>
      <div className={s.tileWide}>
        <span className={s.tileLabel}>His game</span>
        {clock ? (
          <>
            <b className={s.shGame}>{clock.matchup}</b>
            <span className={s.shSub}>
              {p.gameState === 'in' ? <span className={s.pulse} aria-hidden /> : null}
              {clock.long}
              {clock.score ? `, ${clock.score}` : ''}
            </span>
          </>
        ) : (
          <b className={s.shGame}>{p.team ? 'Bye week' : 'Empty slot'}</b>
        )}
      </div>
      <div className={s.tileWide}>
        <span className={s.tileLabel}>Stat line</span>
        <span className={s.shLine}>{line || (p.gameState === 'pre' ? 'His game has not started.' : 'No stats recorded.')}</span>
      </div>
      <div className={s.shFoot}>
        <PillLink href={`/players/${p.id}`}>Player page</PillLink>
      </div>
    </>
  );
}

/**
 * The gamecast for one matchup: the score bug, the win chance across the
 * week, what the side behind needs, both lineups slot against slot, and the
 * scoring plays as they land. Scores poll through useLive; the win chance
 * path and the NFL clocks are reread with each live poll.
 */
export default function Gamecast({ initial, live, extras: first, week }: { initial: LabGame; live: LabLive; extras: Extras; week: number }) {
  const id = initial.matchupId;
  const [plays, setPlays] = useState<Play[]>([]);
  const [extras, setExtras] = useState(first);
  const [open, setOpen] = useState<{ side: Side; id: string } | null>(null);

  const onEvents = useCallback(
    (events: ScoreEvent[]) => {
      const mine = events.filter((e) => e.game.matchupId === id);
      if (!mine.length) return;
      const at = new Date().toISOString();
      const next = mine.map<Play>((e) => ({
        key: e.key,
        at,
        side: e.game.away.rosterId === e.rosterId ? 'away' : 'home',
        firstName: e.firstName,
        player: e.player,
        delta: e.delta,
      }));
      setPlays((list) => [...next, ...list].slice(0, 40));
    },
    [id]
  );
  const data = useLive(week, onEvents, live);
  const game = data?.games.find((g) => g.matchupId === id) ?? initial;

  // While games are on, the path's last point and the clocks move too.
  const at = data?.at;
  const anyLive = data?.anyLive;
  useEffect(() => {
    if (!at || !anyLive) return;
    let dead = false;
    fetch(`/api/lab/gamecast?week=${week}&id=${id}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((x: Extras | null) => !dead && x && setExtras(x))
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [at, anyLive, week, id]);

  const close = useCallback(() => setOpen(null), []);
  const picked = open ? game[open.side].starters.find((p) => p.id === open.id) : undefined;
  const rows = Math.max(game.away.starters.length, game.home.starters.length);

  return (
    <MotionConfig reducedMotion="user">
      <div className={w.grid}>
        <HeroBug game={game} />

        <section className={`${w.widget} ${w.l}`}>
          <WidgetHead icon="chart" title={<span className={s.wrapTitle}>Win chance after each kickoff window</span>} />
          <p className={w.sub}>Recomputed from final scores with the app&rsquo;s model.</p>
          <WinChart path={extras.path} away={game.away.firstName} home={game.home.firstName} done={isDone(game)} />
        </section>

        <section className={`${w.widget} ${w.l}`}>
          <WidgetHead icon="flag" title="What it takes" />
          <p className={s.takes}>{whatItTakes(game)}</p>
        </section>

        <section className={`${w.widget} ${w.l}`}>
          <WidgetHead icon="jersey" title="Lineups" />
          <div className={s.lineHead} aria-hidden>
            <span>{game.away.firstName}</span>
            <span />
            <span>{game.home.firstName}</span>
          </div>
          <ul className={s.lineup}>
            {Array.from({ length: rows }, (_, i) => {
              const a = game.away.starters[i];
              const h = game.home.starters[i];
              return (
                <li key={i} className={s.slotRow}>
                  <PlayerCell p={a} clock={a?.team ? extras.clocks[a.team] : undefined} onOpen={() => a && setOpen({ side: 'away', id: a.id })} />
                  <span className={s.slot}>{(a ?? h)?.slot}</span>
                  <PlayerCell p={h} clock={h?.team ? extras.clocks[h.team] : undefined} right onOpen={() => h && setOpen({ side: 'home', id: h.id })} />
                </li>
              );
            })}
          </ul>
        </section>

        <section className={`${w.widget} ${w.l}`}>
          <WidgetHead icon="megaphone" title="Scoring plays" />
          <ul className={s.feed}>
            <AnimatePresence initial={false}>
              {plays.map((e) => (
                <motion.li
                  key={e.key}
                  layout
                  className={s.play}
                  initial={{ opacity: 0, y: -14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={SPRING.glide}
                >
                  <span className={s.playFace}>
                    {e.player.headshot ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.player.headshot} alt="" />
                    ) : null}
                  </span>
                  <span className={s.playText}>
                    <b>{e.player.name}</b>
                    <span>
                      {e.firstName}
                      {e.player.statLine ? `, ${statWords(e.player.statLine)}` : ''}
                    </span>
                  </span>
                  <span className={s.playRight}>
                    <span className={`${s.playDelta} ${e.delta < 0 ? s.playDown : ''}`}>
                      {e.delta > 0 ? '+' : '−'}
                      {Math.abs(e.delta).toFixed(2)}
                    </span>
                    <span className={s.playAt}>{timeOf(e.at)}</span>
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {!plays.length ? <p className={s.empty}>Scoring plays land here while games are on.</p> : null}
        </section>
      </div>

      <Sheet open={Boolean(picked)} onClose={close}>
        {picked && open ? <PlayerSheet p={picked} side={game[open.side]} clock={picked.team ? extras.clocks[picked.team] : undefined} /> : null}
      </Sheet>
    </MotionConfig>
  );
}
