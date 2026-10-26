'use client';

import { animate, motion, MotionConfig, useMotionValue, useReducedMotion, useTransform, type Variants } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  ArrowCounterClockwise,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bomb,
  ChartLineUp,
  Couch,
  Crown,
  Export,
  Fire,
  Newspaper,
  PlayCircle,
  Ranking,
  Scales,
  SpeakerHigh,
  SpeakerSlash,
  Toilet,
  X,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';
import Rolling from '../kit/Rolling';
import { SPRING } from '../kit/motion';
import { haptic } from '../kit/haptics';
import { useToast } from '../kit/Toasts';
import { PillLink } from '../../home/Glass';
import home from '../../home/home.module.css';
import { imagesOf, type Beat, type Person, type Player, type Side, type TableRow } from './types';
import s from './story.module.css';

/** How long a slide holds before the next, in ms. */
const HOLD = 6000;

type Frame = { kind: 'beat'; beat: Beat } | { kind: 'end' } | { kind: 'empty' };

const group: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.06 } } };
const item: Variants = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: SPRING.glide } };

/** Slides drawn over a photograph; the rest are on paper. */
function onPhoto(frame: Frame): boolean {
  if (frame.kind !== 'beat') return false;
  const b = frame.beat;
  if (b.kind === 'play') return Boolean(b.image || b.video);
  if (b.kind === 'cover' || b.kind === 'motw' || b.kind === 'shart') return Boolean(b.image);
  return false;
}

const TITLES: Record<Beat['kind'], string> = {
  cover: 'The week',
  motw: 'Manager of the week',
  topPlayer: 'Top player',
  shart: 'The Shart',
  close: 'Closest game',
  blowout: 'Biggest blowout',
  bench: 'Left on the bench',
  play: 'Top play',
  movers: 'Standings movers',
  line: 'The playoff line',
  rag: 'From the Rag',
};

const pts = (n: number) => n.toFixed(2);

export default function StoryViewer({
  week,
  beats,
  start,
  latest,
  rag,
}: {
  week: number;
  beats: Beat[];
  start: number;
  latest: number;
  rag: string | null;
}) {
  const frames: Frame[] = beats.length
    ? [...beats.map((beat): Frame => ({ kind: 'beat', beat })), { kind: 'end' }]
    : [{ kind: 'empty' }];
  const count = frames.length;

  const router = useRouter();
  const toast = useToast();
  const reduced = useReducedMotion() ?? false;

  const [index, setIndex] = useState(() => Math.min(Math.max(0, start), count - 1));
  const [cycle, setCycle] = useState(0);
  const [held, setHeld] = useState(false);
  const [keyPaused, setKeyPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [muted, setMuted] = useState(true);

  const frame = frames[index];
  const last = index === count - 1;
  const paused = held || keyPaused || hidden || sharing;
  const photo = onPhoto(frame);

  const go = useCallback(
    (dir: 1 | -1) => {
      setKeyPaused(false);
      setMuted(true);
      if (dir === -1 && index === 0) return setCycle((c) => c + 1);
      if (dir === 1 && index >= count - 1) return;
      setIndex(index + dir);
    },
    [index, count]
  );

  const replay = useCallback(() => {
    setIndex(0);
    setCycle((c) => c + 1);
    setKeyPaused(false);
  }, []);

  // Swipe down to close: the card follows the finger, shrinks and rounds,
  // and the paper behind it fades so the lab shows through.
  const y = useMotionValue(0);
  const scale = useTransform(y, [0, 600], [1, 0.78]);
  const veil = useTransform(y, [0, 360], [1, 0]);
  const radius = useTransform(y, [0, 90], ['0px', '28px']);
  const closing = useRef(false);

  const close = useCallback(
    (velocity = 0) => {
      if (closing.current) return;
      closing.current = true;
      setHeld(true);
      haptic('tick');
      if (reduced) return router.push('/lab');
      animate(y, window.innerHeight, { ...SPRING.glide, velocity }).then(() => router.push('/lab'));
    },
    [reduced, router, y]
  );

  useEffect(() => {
    router.prefetch('/lab');
  }, [router]);

  // Tap thirds, press and hold to pause.
  const press = useRef<{ timer: number } | null>(null);
  const heldRef = useRef(false);
  const moved = useRef(false);
  const setHold = (on: boolean) => {
    heldRef.current = on;
    setHeld(on);
  };
  const isControl = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('[data-control]'));

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isControl(e.target) || closing.current) return;
    moved.current = false;
    press.current = { timer: window.setTimeout(() => setHold(true), 180) };
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    window.clearTimeout(p.timer);
    if (heldRef.current || moved.current) {
      if (!closing.current) setHold(false);
      return;
    }
    const box = e.currentTarget.getBoundingClientRect();
    const at = (e.clientX - box.left) / box.width;
    haptic('tick');
    go(at < 1 / 3 ? -1 : 1);
  };
  const onPointerCancel = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
    if (!closing.current) setHold(false);
  };

  // Keyboard: arrows step, space pauses, escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const onButton = e.target instanceof Element && e.target.closest('a, button');
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      } else if (e.key === ' ' && !onButton) {
        e.preventDefault();
        setKeyPaused((p) => !p);
      } else if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, close]);

  // A story in a background tab waits for you.
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // The address says which slide this is, so a reload or a copied link lands here.
  useEffect(() => {
    if (!beats.length) return;
    window.history.replaceState(null, '', `${window.location.pathname}?s=${index + 1}`);
  }, [index, beats.length]);

  // The next slide's pictures, fetched while this one plays.
  useEffect(() => {
    const next = frames[index + 1];
    if (next?.kind !== 'beat') return;
    for (const url of imagesOf(next.beat)) {
      const img = new Image();
      img.src = url;
    }
    // frames is rebuilt from beats each render; index is what moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, beats]);

  const share = async () => {
    const url = `${window.location.origin}/lab/story/${week}?s=${index + 1}`;
    const what = frame.kind === 'beat' ? TITLES[frame.beat.kind] : `That was week ${week}`;
    const title = `Week ${week} in stories: ${what}`;
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copied', body: `Week ${week}, slide ${index + 1}` });
      } catch {
        toast({ title: 'Could not copy the link', body: url, tone: 'bad' });
      }
    };
    setSharing(true);
    try {
      if (typeof navigator.share === 'function') await navigator.share({ title, url });
      else await copy();
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) await copy();
    } finally {
      setSharing(false);
    }
  };

  const slideKey = `${index}-${cycle}`;
  const playing = !paused && !reduced;

  return (
    <MotionConfig reducedMotion="user">
      <div className={s.layer} role="dialog" aria-modal="true" aria-label={`Week ${week} in stories`}>
        <motion.div className={s.veil} style={{ opacity: veil }} aria-hidden />
        <motion.div
          className={s.mover}
          style={{ y, scale }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.04, bottom: 0.85 }}
          dragMomentum={false}
          onDragStart={() => {
            moved.current = true;
            setHold(true);
          }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 700) close(info.velocity.y);
            else setHold(false);
          }}
        >
          <motion.div
            className={s.frame}
            data-tone={photo ? 'photo' : 'paper'}
            data-held={held ? '' : undefined}
            style={{ ['--drag-r' as string]: radius }}
            animate={{ scale: held && !closing.current ? 0.97 : 1 }}
            transition={SPRING.snap}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Backdrop key={`bg-${slideKey}`} frame={frame} muted={muted} paused={paused} />

            <div className={s.top}>
              <div className={s.bars} aria-hidden>
                {frames.map((_, i) => (
                  <span key={i} className={s.bar}>
                    <i
                      key={i === index ? slideKey : i}
                      className={i < index || (i === index && reduced) ? `${s.fill} ${s.done}` : i === index ? `${s.fill} ${s.now}` : s.fill}
                      style={i === index && !reduced ? { animationDuration: `${HOLD}ms`, animationPlayState: playing ? 'running' : 'paused' } : undefined}
                      onAnimationEnd={i === index ? () => !last && go(1) : undefined}
                    />
                  </span>
                ))}
              </div>
              <div className={s.head}>
                <span className={s.headText}>
                  <b>Week {week}</b>
                  {beats.length ? (
                    <span>
                      {index + 1} of {count}
                    </span>
                  ) : null}
                  {paused && !closing.current ? <span>Paused</span> : null}
                </span>
                <button type="button" className={s.close} data-control onClick={() => close()} aria-label="Close story">
                  <X weight="bold" />
                </button>
              </div>
            </div>

            <motion.div key={slideKey} className={s.slide} variants={group} initial="hidden" animate="show">
              {frame.kind === 'beat' ? <BeatView beat={frame.beat} week={week} rag={rag} /> : null}
              {frame.kind === 'end' ? <EndView week={week} rag={rag} onReplay={replay} /> : null}
              {frame.kind === 'empty' ? <EmptyView week={week} latest={latest} /> : null}
            </motion.div>

            <div className={s.foot}>
              {frame.kind === 'beat' && frame.beat.kind === 'play' && frame.beat.video ? (
                <button type="button" data-control className={`${home.pillBtn} ${home.pillSmall} ${s.pillIcon}`} onClick={() => setMuted((m) => !m)}>
                  {muted ? <SpeakerSlash weight="bold" /> : <SpeakerHigh weight="bold" />}
                  {muted ? 'Tap for sound' : 'Sound on'}
                </button>
              ) : (
                <span />
              )}
              {beats.length ? (
                <button type="button" data-control className={`${home.pillBtn} ${home.pillSmall} ${s.pillIcon}`} onClick={share}>
                  <Export weight="bold" />
                  Share
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </MotionConfig>
  );
}

/* Pictures behind a slide */

function Backdrop({ frame, muted, paused }: { frame: Frame; muted: boolean; paused: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const beat = frame.kind === 'beat' ? frame.beat : null;
  const src = beat?.kind === 'play' ? beat.video : null;
  const still =
    beat && (beat.kind === 'cover' || beat.kind === 'motw' || beat.kind === 'shart' || beat.kind === 'play') ? beat.image : null;

  useEffect(() => {
    if (video.current) video.current.muted = muted;
  }, [muted]);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (paused) v.pause();
    else v.play().catch(() => {});
  }, [paused]);

  if (!still && !src) return null;
  return (
    <>
      {src ? (
        <video ref={video} className={s.photo} src={src} poster={still ?? undefined} playsInline autoPlay muted loop aria-hidden />
      ) : (
        <motion.img
          className={s.photo}
          src={still!}
          alt=""
          aria-hidden
          draggable={false}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING.glide}
        />
      )}
      <span className={s.scrim} aria-hidden />
    </>
  );
}

/* Pieces */

function Up({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  );
}

/** A number that rolls up from zero when its slide opens. */
function Roll({ value, decimals = 2, className, suffix }: { value: number; decimals?: number; className?: string; suffix?: string }) {
  const reduced = useReducedMotion() ?? false;
  const [v, setV] = useState(reduced ? value : 0);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), 240);
    return () => window.clearTimeout(t);
  }, [value]);
  return <Rolling value={v} decimals={decimals} className={className} suffix={suffix} trend={1} />;
}

function Kicker({ icon: I, children }: { icon: PhosphorIcon; children: ReactNode }) {
  return (
    <Up className={s.kicker}>
      <I weight="duotone" className={s.icon} aria-hidden />
      {children}
    </Up>
  );
}

function Face({ who, size = 44 }: { who: Person; size?: number }) {
  return who.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={s.face} src={who.avatar} alt="" draggable={false} style={{ width: size, height: size }} />
  ) : (
    <span className={s.face} style={{ width: size, height: size }} aria-hidden />
  );
}

function Cutout({ player, size = 'big' }: { player: Player; size?: 'big' | 'small' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={size === 'big' ? s.cutout : s.cutoutSmall} src={player.headshot} alt="" draggable={false} />
  );
}

function ScoreRow({ side, win }: { side: Side; win: boolean }) {
  return (
    <Up className={s.row}>
      <Face who={side.who} />
      <span className={s.rowText}>
        <b>{side.who.first}</b>
        <span>{side.who.team}</span>
      </span>
      <span className={win ? `${s.rowNum} ${s.rowWin}` : s.rowNum}>
        <Roll value={side.points} />
      </span>
    </Up>
  );
}

function SeedRow({ row }: { row: TableRow }) {
  return (
    <Up className={s.row}>
      <span className={s.seed}>{row.seed}</span>
      <span className={s.rowText}>
        <b>{row.who.first}</b>
        <span>{row.who.team}</span>
      </span>
      <span className={s.rowMeta}>
        <b>
          {row.wins}-{row.losses}
        </b>
        <span>{pts(row.points)}</span>
      </span>
    </Up>
  );
}

/* Slides */

function BeatView({ beat, week, rag }: { beat: Beat; week: number; rag: string | null }) {
  switch (beat.kind) {
    case 'cover':
      return (
        <div className={s.bottom}>
          <Kicker icon={PlayCircle}>The week in stories</Kicker>
          <Up>
            <h1 className={s.mega}>Week {week}</h1>
          </Up>
          <Up className={s.stats}>
            <span>
              <b>
                <Roll value={beat.games} decimals={0} />
              </b>
              Games
            </span>
            <span>
              <b>
                <Roll value={beat.total} />
              </b>
              Points
            </span>
            <span>
              <b>
                <Roll value={beat.high} />
              </b>
              High score
            </span>
          </Up>
          <Up>
            <p className={s.hint}>Tap the right side for next, the left to go back. Hold to pause.</p>
          </Up>
        </div>
      );

    case 'motw':
      return (
        <div className={s.bottom}>
          <Kicker icon={Crown}>Manager of the week</Kicker>
          <Up>
            <h2 className={s.mega}>{beat.who.first}</h2>
            <p className={s.team}>{beat.who.team}</p>
          </Up>
          <Up>
            <span className={s.lime}>
              <Roll value={beat.value} className={s.big} />
              <small>points</small>
            </span>
          </Up>
          {beat.opponent && beat.margin != null ? (
            <Up>
              <p className={s.line}>
                {beat.won
                  ? `Beat ${beat.opponent.first} by ${pts(beat.margin)}.`
                  : `Top score of the week and still lost to ${beat.opponent.first}, by ${pts(beat.margin)}.`}
              </p>
            </Up>
          ) : null}
          {beat.star ? (
            <Up className={s.chipRow}>
              <Cutout player={beat.star} size="small" />
              <span className={s.rowText}>
                <b>{beat.star.name}</b>
                <span>{pts(beat.star.points)}, his best starter</span>
              </span>
            </Up>
          ) : null}
        </div>
      );

    case 'topPlayer':
      return (
        <div className={`${s.center} ${s.middle}`}>
          <Kicker icon={Fire}>Top player</Kicker>
          <Up className={s.cutoutWrap}>
            <Cutout player={beat.player} />
          </Up>
          <Up>
            <h2 className={s.title}>{beat.player.name}</h2>
            <p className={s.team}>
              {beat.player.position}
              {beat.player.nflTeam ? `, ${beat.player.nflTeam}` : ''}
            </p>
          </Up>
          <Up>
            <span className={s.lime}>
              <Roll value={beat.player.points} className={s.big} />
              <small>points</small>
            </span>
          </Up>
          <Up>
            <p className={s.line}>
              {beat.won ? `${beat.who.first} started him and won.` : `${beat.who.first} started him and still lost.`}
            </p>
          </Up>
        </div>
      );

    case 'shart': {
      const share = beat.star && beat.value > 0 ? Math.round((beat.star.points / beat.value) * 100) : null;
      return (
        <div className={s.bottom}>
          <Kicker icon={Toilet}>The Shart</Kicker>
          <Up>
            <h2 className={s.mega}>{beat.who.first}</h2>
            <p className={s.team}>{beat.who.team}</p>
          </Up>
          <Up>
            <span className={s.plain}>
              <Roll value={beat.value} className={s.big} />
              <small>points</small>
            </span>
          </Up>
          {beat.opponent && beat.margin != null ? (
            <Up>
              <p className={s.line}>
                Lost to {beat.opponent.first} by {pts(beat.margin)}.
              </p>
            </Up>
          ) : null}
          {beat.star && share != null ? (
            <Up>
              <p className={s.line}>
                {beat.star.name} put up {pts(beat.star.points)} of it, {share}% of {beat.who.first}&apos;s whole week.
              </p>
            </Up>
          ) : null}
        </div>
      );
    }

    case 'close':
    case 'blowout': {
      const close = beat.kind === 'close';
      const extra = close ? (beat.margin < 3 ? ' A field goal flips it.' : beat.margin < 6 ? ' One touchdown flips it.' : '') : '';
      return (
        <div className={s.center}>
          <Kicker icon={close ? Scales : Bomb}>{close ? 'Closest game' : 'Biggest blowout'}</Kicker>
          <Up>
            <span className={s.lime}>
              <Roll value={beat.margin} className={s.big} />
              <small>{close ? 'points apart' : 'point margin'}</small>
            </span>
          </Up>
          <div className={s.rows}>
            <ScoreRow side={beat.winner} win />
            <ScoreRow side={beat.loser} win={false} />
          </div>
          <Up>
            <p className={s.line}>
              {close ? `${beat.winner.who.first} edges ${beat.loser.who.first}.${extra}` : `${beat.winner.who.first} ran ${beat.loser.who.first} off the field.`}
            </p>
          </Up>
        </div>
      );
    }

    case 'bench':
      return (
        <div className={s.center}>
          <Kicker icon={Couch}>Left on the bench</Kicker>
          <Up>
            <h2 className={s.title}>{beat.who.first} started the wrong guy.</h2>
            <p className={s.team}>{beat.who.team}</p>
          </Up>
          <div className={s.duel}>
            <Up className={s.duelSide}>
              <Cutout player={beat.benched} />
              <span className={s.duelLabel}>Benched</span>
              <b className={s.duelName}>{beat.benched.name}</b>
              <span className={s.limeSmall}>
                <Roll value={beat.benched.points} />
              </span>
            </Up>
            <Up className={s.duelSide}>
              <Cutout player={beat.started} />
              <span className={s.duelLabel}>Started at {beat.started.slot}</span>
              <b className={s.duelName}>{beat.started.name}</b>
              <span className={s.plainSmall}>
                <Roll value={beat.started.points} />
              </span>
            </Up>
          </div>
          <Up>
            <p className={s.line}>
              {beat.result === 'flips'
                ? `A ${pts(beat.swing)} point swing. ${beat.who.first} lost by ${pts(beat.margin)}, so that swap wins the game.`
                : beat.result === 'lost'
                  ? `A ${pts(beat.swing)} point swing. ${beat.who.first} lost by ${pts(beat.margin)} anyway.`
                  : `A ${pts(beat.swing)} point swing. ${beat.who.first} won anyway, by ${pts(beat.margin)}.`}
            </p>
          </Up>
        </div>
      );

    case 'play':
      return (
        <div className={s.bottom}>
          <Kicker icon={PlayCircle}>Top play</Kicker>
          <Up>
            <h2 className={s.headline}>{beat.headline}</h2>
          </Up>
          {beat.points != null ? (
            <Up>
              <span className={s.lime}>
                <Roll value={beat.points} className={s.big} />
                <small>points{beat.first ? ` for ${beat.first}` : ''}</small>
              </span>
            </Up>
          ) : null}
        </div>
      );

    case 'movers': {
      const riser = [...beat.movers].filter((m) => m.to < m.from).sort((a, b) => b.from - b.to - (a.from - a.to))[0];
      const faller = beat.movers.find((m) => m.to > m.from);
      return (
        <div className={s.center}>
          <Kicker icon={ChartLineUp}>Standings movers</Kicker>
          <Up>
            <h2 className={s.title}>
              {riser ? `${riser.who.first} climbs to No. ${riser.to}.` : faller ? `${faller.who.first} slides to No. ${faller.to}.` : 'The table moved.'}
            </h2>
          </Up>
          <div className={s.rows}>
            {beat.movers.map((m) => {
              const up = m.to < m.from;
              return (
                <Up key={m.who.rosterId} className={s.row}>
                  <Face who={m.who} />
                  <span className={s.rowText}>
                    <b>{m.who.first}</b>
                    <span>{m.who.team}</span>
                  </span>
                  <span className={s.move}>
                    {up ? <ArrowUp weight="bold" className={s.up} aria-label="Up" /> : <ArrowDown weight="bold" className={s.down} aria-label="Down" />}
                    {m.from}
                    <ArrowRight weight="bold" className={s.to} aria-hidden />
                    <b>{m.to}</b>
                  </span>
                </Up>
              );
            })}
          </div>
        </div>
      );
    }

    case 'line': {
      const lastIn = beat.inside[beat.inside.length - 1];
      const firstOut = beat.outside[0];
      const gap = lastIn && firstOut ? lastIn.wins - firstOut.wins : null;
      return (
        <div className={s.center}>
          <Kicker icon={Ranking}>The playoff line</Kicker>
          <Up>
            <h2 className={s.title}>{lastIn ? `${lastIn.who.first} holds No. ${beat.seeds}.` : `${beat.seeds} make it.`}</h2>
          </Up>
          <div className={s.rows}>
            {beat.inside.map((r) => (
              <SeedRow key={r.who.rosterId} row={r} />
            ))}
            <Up className={s.cut}>
              <span>Top {beat.seeds} make the playoffs</span>
            </Up>
            {beat.outside.map((r) => (
              <SeedRow key={r.who.rosterId} row={r} />
            ))}
          </div>
          {lastIn && firstOut && gap != null ? (
            <Up>
              <p className={s.line}>
                {gap === 0
                  ? `Same record. ${firstOut.who.first} is out on points, ${pts(lastIn.points - firstOut.points)} behind.`
                  : `${firstOut.who.first} is ${gap} win${gap === 1 ? '' : 's'} back.`}
              </p>
            </Up>
          ) : null}
        </div>
      );
    }

    case 'rag':
      return (
        <div className={s.center}>
          <Kicker icon={Newspaper}>From the Rag</Kicker>
          <Up className={s.clip}>
            <span className={s.clipCat}>{beat.category}</span>
            <h2 className={s.title}>{beat.headline}</h2>
            <p className={s.deck}>{beat.deck}</p>
          </Up>
          {rag ? (
            <Up className={s.pills}>
              <span data-control>
                <PillLink href={rag} small>
                  Read the week {week} issue
                </PillLink>
              </span>
            </Up>
          ) : null}
        </div>
      );
  }
}

function EndView({ week, rag, onReplay }: { week: number; rag: string | null; onReplay: () => void }) {
  return (
    <div className={`${s.center} ${s.middle}`}>
      <Up>
        <h2 className={s.mega}>That was week {week}</h2>
      </Up>
      <Up className={s.pills}>
        {rag ? (
          <span data-control>
            <PillLink href={rag}>Read the Rag</PillLink>
          </span>
        ) : null}
        <span data-control>
          <PillLink href={`/scoreboard/${week}`}>Week {week} scoreboard</PillLink>
        </span>
        <button type="button" data-control className={`${home.pillBtn} ${s.pillIcon}`} onClick={onReplay}>
          <ArrowCounterClockwise weight="bold" />
          Replay
        </button>
      </Up>
    </div>
  );
}

function EmptyView({ week, latest }: { week: number; latest: number }) {
  return (
    <div className={`${s.center} ${s.middle}`}>
      <Up>
        <h2 className={s.mega}>Week {week}</h2>
      </Up>
      <Up>
        <p className={s.line}>
          {week === latest + 1
            ? `Week ${week} is still being played. Its story is told once every game is final.`
            : week > latest
              ? `Week ${week} has not been played yet.`
              : `Week ${week} has no story to tell.`}
        </p>
      </Up>
      <Up className={s.pills}>
        <span data-control>
          <PillLink href={`/lab/story/${latest}`}>Week {latest} story</PillLink>
        </span>
      </Up>
    </div>
  );
}
