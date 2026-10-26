'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { LabLive, LabSide } from './liveFeed';
import Rolling from './Rolling';
import { haptic } from './haptics';
import { SPRING } from './motion';
import { useToast } from './Toasts';
import { gameFor, useLive } from './useLive';
import s from './island.module.css';

const pct = (n: number) => `${Math.round(n * 100)}%`;

function Face({ side }: { side: LabSide }) {
  return (
    <span className={s.face} style={{ ['--mgr' as string]: side.color ?? '#c9dcfa' }}>
      {side.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={side.avatarUrl} alt="" />
      ) : null}
    </span>
  );
}

/**
 * The island: your game, always with you. A pill floating over the ticker
 * with both scores rolling live and the win chance as a hairline under them.
 * Tap it and it grows in place (one shared layout, the glide spring) into the
 * matchup: who is on the field now, who is left, the chances, and the way to
 * the full gamecast. Scoring in any game in the league arrives as a toast.
 */
export default function Island({ week, mine, initial }: { week: number; mine: number | null; initial: LabLive | null }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const path = usePathname();
  // A page that already shows your game marks it data-island-anchor; while
  // that card is on screen the island steps aside, and it comes back as the
  // card scrolls away, like a mini player.
  const [anchored, setAnchored] = useState(false);
  useEffect(() => {
    const el = document.querySelector('[data-island-anchor]');
    if (!el) return setAnchored(false);
    const stage = el.closest('[data-stage]') ?? window;
    const check = () => {
      const r = el.getBoundingClientRect();
      // On screen when at least a fifth of the card is inside the viewport.
      const seen = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      setAnchored(seen > r.height * 0.2);
    };
    check();
    stage.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      stage.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [path]);
  const data = useLive(week, (events) => {
    for (const e of events.slice(0, 3)) {
      toast({
        id: e.key,
        image: e.player.headshot,
        title: `${e.player.name}`,
        body: `${e.firstName}${e.player.statLine ? `, ${e.player.statLine}` : ''}`,
        value: `${e.delta > 0 ? '+' : ''}${e.delta.toFixed(2)}`,
        tone: e.delta > 0 ? 'good' : 'bad',
      });
    }
  }, initial);
  const pick = gameFor(data, mine);
  if (!pick || path?.startsWith('/lab/live') || path?.startsWith('/lab/story')) return null;
  const { game, me } = pick;
  const [left, right] = me === 'home' ? [game.home, game.away] : [game.away, game.home];
  const label = me ? 'Your game' : game.inPlay ? 'Closest game on now' : 'Closest game';
  const onField = [...left.starters.map((p) => ({ p, side: left })), ...right.starters.map((p) => ({ p, side: right }))].filter((x) => x.p.gameState === 'in');

  return (
    <div className={s.dock}>
      <AnimatePresence initial={false} mode="popLayout">
        {open ? (
          <motion.div
            key="open"
            layoutId="island"
            className={s.card}
            transition={SPRING.glide}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={(_, i) => (i.offset.y > 60 || i.velocity.y > 400) && setOpen(false)}
          >
            <motion.div className={s.cardInner} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.12 } }}>
              <div className={s.cardHead}>
                <span className={s.kicker}>{label}</span>
                <button type="button" className={s.closeBtn} onClick={() => { haptic('tick'); setOpen(false); }} aria-label="Close">
                  <span aria-hidden />
                </button>
              </div>
              <div className={s.sides}>
                {[left, right].map((side, i) => (
                  <div key={side.rosterId} className={`${s.side} ${i ? s.sideR : ''}`}>
                    <Face side={side} />
                    <b className={s.who}>{side.firstName}</b>
                    <span className={s.team}>{side.team}</span>
                    <Rolling className={s.big} value={side.points} />
                    <span className={s.proj}>Projected {side.expected.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className={s.wp} aria-label={`Win chance ${left.firstName} ${pct(left.winProb)}, ${right.firstName} ${pct(right.winProb)}`}>
                <span className={s.wpL}>{pct(left.winProb)}</span>
                <span className={s.wpTrack}>
                  <motion.span className={s.wpFill} animate={{ width: pct(left.winProb) }} transition={SPRING.roll} />
                </span>
                <span className={s.wpR}>{pct(right.winProb)}</span>
              </div>
              <div className={s.counts}>
                {[left, right].map((side) => (
                  <span key={side.rosterId}>
                    {side.firstName}: {side.inPlay} playing, {side.yetToPlay} to play
                  </span>
                ))}
              </div>
              {onField.length ? (
                <ul className={s.field}>
                  {onField.map(({ p, side }) => (
                    <li key={`${side.rosterId}-${p.id}`}>
                      {p.headshot ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.headshot} alt="" />
                      ) : (
                        <span className={s.noFace} />
                      )}
                      <span className={s.fieldText}>
                        <b>{p.name}</b>
                        <span>{p.statLine || `${p.position}, ${side.firstName}`}</span>
                      </span>
                      <Rolling className={s.fieldPts} value={p.points} />
                    </li>
                  ))}
                </ul>
              ) : null}
              <Link href={`/lab/live/${game.matchupId}`} className={s.go} onClick={() => setOpen(false)}>
                Open the gamecast
              </Link>
            </motion.div>
          </motion.div>
        ) : anchored ? null : (
          <motion.button
            key="pill"
            layoutId="island"
            type="button"
            className={s.pill}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.9 }}
            transition={SPRING.glide}
            whileTap={{ scale: 0.97 }}
            onClick={() => { haptic('tick'); setOpen(true); }}
            aria-label={`${label}: ${left.firstName} ${left.points.toFixed(2)}, ${right.firstName} ${right.points.toFixed(2)}. Open`}
          >
            <Face side={left} />
            <span className={s.pillName}>{left.firstName}</span>
            <Rolling className={`${s.pillPts} ${left.points >= right.points ? s.lead : ''}`} value={left.points} />
            <span className={s.dash} aria-hidden />
            <Rolling className={`${s.pillPts} ${right.points > left.points ? s.lead : ''}`} value={right.points} />
            <span className={s.pillName}>{right.firstName}</span>
            <Face side={right} />
            <span className={s.pillWp} aria-hidden>
              <motion.span animate={{ width: pct(left.winProb) }} transition={SPRING.roll} />
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
