'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { ArrowsLeftRight } from '@phosphor-icons/react';
import Rolling from '../kit/Rolling';
import Sheet from '../kit/Sheet';
import Press from '../kit/Press';
import { haptic } from '../kit/haptics';
import { SPRING } from '../kit/motion';
import Icon from '../../home/Icons';
import w from '../../home/widgets.module.css';
import r from './rivals.module.css';

export type RivalTeam = {
  rosterId: number;
  name: string;
  team: string;
  avatar: string | null;
  color: string;
  seed: number;
  wins: number;
  losses: number;
  ties: number;
  pf: number;
  pa: number;
  ppg: number;
  allPlayW: number;
  allPlayL: number;
  best: number | null;
  bestWeek: number | null;
  worst: number | null;
  worstWeek: number | null;
  streak: string;
  playoffs: number | null;
  weekly: (number | null)[];
};
type Meeting = { week: number; a: number; b: number; aPts: number; bPts: number; status: 'final' | 'live' | 'pending' };

const rec = (w: number, l: number, t = 0) => `${w}-${l}${t ? `-${t}` : ''}`;

function Face({ t, size }: { t: RivalTeam; size: number }) {
  return (
    <span className={r.face} style={{ width: size, height: size, ['--mgr' as string]: t.color }}>
      {t.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.avatar} alt="" />
      ) : null}
    </span>
  );
}

/** One line of the tape: the two values either side, bars growing outward from the middle. */
function Tape({ label, a, b, fmt, decimals = 2, higher = true, note }: { label: string; a: number | null; b: number | null; fmt?: (n: number) => string; decimals?: number; higher?: boolean | null; note?: [string | null, string | null] }) {
  const max = Math.max(Math.abs(a ?? 0), Math.abs(b ?? 0), 0.0001);
  const aWins = higher != null && a != null && b != null && (higher ? a > b : a < b);
  const bWins = higher != null && a != null && b != null && (higher ? b > a : b < a);
  const val = (v: number | null, win: boolean) =>
    v == null ? (
      <span className={r.val}>None</span>
    ) : fmt ? (
      <span className={`${r.val} ${win ? r.win : ''}`}>{fmt(v)}</span>
    ) : (
      <Rolling className={`${r.val} ${win ? r.win : ''}`} value={v} decimals={decimals} />
    );
  return (
    <li className={r.tape}>
      <span className={r.tapeA}>
        {val(a, aWins)}
        {note?.[0] ? <span className={r.tapeNote}>{note[0]}</span> : null}
      </span>
      <span className={r.tapeMid}>
        <span className={r.tapeLabel}>{label}</span>
        <span className={r.bars} aria-hidden>
          <span className={r.barL}>
            <motion.span className={`${r.bar} ${aWins ? r.barWin : ''}`} animate={{ width: `${((a ?? 0) / max) * 100}%` }} transition={SPRING.roll} />
          </span>
          <span className={r.barR}>
            <motion.span className={`${r.bar} ${bWins ? r.barWin : ''}`} animate={{ width: `${((b ?? 0) / max) * 100}%` }} transition={SPRING.roll} />
          </span>
        </span>
      </span>
      <span className={r.tapeB}>
        {val(b, bWins)}
        {note?.[1] ? <span className={r.tapeNote}>{note[1]}</span> : null}
      </span>
    </li>
  );
}

/** Both seasons, week by week, as two lines on one scale. */
function Weekly({ a, b }: { a: RivalTeam; b: RivalTeam }) {
  const weeks = a.weekly.map((_, i) => i).filter((i) => a.weekly[i] != null || b.weekly[i] != null);
  const vals = [...a.weekly, ...b.weekly].filter((v): v is number => v != null);
  if (!weeks.length || !vals.length) return null;
  const W = 320, H = 150, L = 30, R = 8, T = 10, B = 22;
  const lo = Math.floor(Math.min(...vals) / 20) * 20;
  const hi = Math.ceil(Math.max(...vals) / 20) * 20;
  const x = (i: number) => L + (weeks.length === 1 ? (W - L - R) / 2 : (weeks.indexOf(i) / (weeks.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - T - B);
  const path = (t: RivalTeam) =>
    weeks
      .filter((i) => t.weekly[i] != null)
      .map((i, k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)},${y(t.weekly[i]!).toFixed(1)}`)
      .join(' ');
  const ticks = [lo, (lo + hi) / 2, hi];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={r.chart} role="img" aria-label={`Weekly scores, ${a.name} and ${b.name}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className={r.grid} />
          <text x={L - 6} y={y(t) + 4} className={r.axis} textAnchor="end">
            {Math.round(t)}
          </text>
        </g>
      ))}
      {weeks.map((i) => (
        <text key={i} x={x(i)} y={H - 6} className={r.axis} textAnchor="middle">
          {i + 1}
        </text>
      ))}
      <motion.path key={`b-${b.rosterId}`} d={path(b)} className={r.lineB} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} />
      <motion.path key={`a-${a.rosterId}`} d={path(a)} className={r.lineA} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} />
      {weeks.map((i) =>
        [a, b].map((t, k) =>
          t.weekly[i] != null ? <circle key={`${k}-${i}`} cx={x(i)} cy={y(t.weekly[i]!)} r={3} className={k ? r.dotB : r.dotA} /> : null
        )
      )}
    </svg>
  );
}

export default function Rivals({ teams, meetings, initialA, initialB, currentWeek }: { teams: RivalTeam[]; meetings: Meeting[]; initialA: number; initialB: number; currentWeek: number }) {
  const [aId, setA] = useState(initialA);
  const [bId, setB] = useState(initialB);
  const [picking, setPicking] = useState<'a' | 'b' | null>(null);
  const a = teams.find((t) => t.rosterId === aId)!;
  const b = teams.find((t) => t.rosterId === bId)!;

  useEffect(() => {
    try {
      const u = new URL(location.href);
      u.searchParams.set('a', String(aId));
      u.searchParams.set('b', String(bId));
      history.replaceState(history.state, '', u);
    } catch {}
  }, [aId, bId]);

  const theirs = useMemo(
    () => meetings.filter((m) => (m.a === aId && m.b === bId) || (m.a === bId && m.b === aId)).map((m) => (m.a === aId ? m : { ...m, a: m.b, b: m.a, aPts: m.bPts, bPts: m.aPts })),
    [meetings, aId, bId]
  );
  const done = theirs.filter((m) => m.status === 'final');
  const aW = done.filter((m) => m.aPts > m.bPts).length;
  const bW = done.filter((m) => m.bPts > m.aPts).length;
  const next = theirs.find((m) => m.status !== 'final');
  const series = !done.length
    ? next
      ? `${a.name} and ${b.name} have not met yet. They meet in week ${next.week}${next.week === currentWeek ? ', this week' : ''}.`
      : `${a.name} and ${b.name} do not meet in the regular season.`
    : aW === bW
      ? `Even at ${aW}-${bW} this season.`
      : `${aW > bW ? a.name : b.name} leads the season series ${Math.max(aW, bW)}-${Math.min(aW, bW)}.`;

  const choose = (id: number) => {
    haptic('tick');
    if (picking === 'a') {
      if (id === bId) setB(aId);
      setA(id);
    } else if (picking === 'b') {
      if (id === aId) setA(bId);
      setB(id);
    }
    setPicking(null);
  };

  return (
    <div className={w.grid}>
      <section className={`${w.widget} ${w.l} ${r.hero}`}>
        <div className={w.head}>
          <Icon name="swap" className={w.headIcon} />
          <span className={w.title}>Rivals</span>
        </div>
        <div className={r.versus}>
          {[a, b].map((t, i) => (
            <Press key={i} className={`${r.side} ${i ? r.sideB : ''}`} onClick={() => setPicking(i ? 'b' : 'a')} aria-label={`Change ${t.name}`}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={t.rosterId} className={r.sideInner} initial={{ opacity: 0, y: 8, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.94 }} transition={SPRING.glide}>
                  <Face t={t} size={64} />
                  <b className={r.name}>{t.name}</b>
                  <span className={r.team}>{t.team}</span>
                  <span className={r.rec}>
                    {rec(t.wins, t.losses, t.ties)}, seed {t.seed}
                  </span>
                </motion.span>
              </AnimatePresence>
              <span className={r.change}>Change</span>
            </Press>
          ))}
          <Press
            className={r.swap}
            aria-label="Swap sides"
            onClick={() => {
              setA(bId);
              setB(aId);
            }}
          >
            <ArrowsLeftRight weight="bold" />
          </Press>
        </div>
        <p className={r.series}>{series}</p>
      </section>

      <section className={`${w.widget} ${w.l}`}>
        <div className={w.head}>
          <Icon name="chart" className={w.headIcon} />
          <span className={w.title}>Tale of the tape</span>
        </div>
        <ul className={r.tapes}>
          <Tape label="Wins" a={a.wins} b={b.wins} decimals={0} />
          <Tape label="Points for" a={a.pf} b={b.pf} />
          <Tape label="Points per week" a={a.ppg} b={b.ppg} />
          <Tape label="All play wins" a={a.allPlayW / Math.max(1, a.allPlayW + a.allPlayL)} b={b.allPlayW / Math.max(1, b.allPlayW + b.allPlayL)} fmt={(n) => `${Math.round(n * 100)}%`} note={[rec(a.allPlayW, a.allPlayL), rec(b.allPlayW, b.allPlayL)]} />
          <Tape label="Best week" a={a.best} b={b.best} note={[a.bestWeek ? `Week ${a.bestWeek}` : null, b.bestWeek ? `Week ${b.bestWeek}` : null]} />
          <Tape label="Worst week" a={a.worst} b={b.worst} note={[a.worstWeek ? `Week ${a.worstWeek}` : null, b.worstWeek ? `Week ${b.worstWeek}` : null]} />
          <Tape label="Points against" a={a.pa} b={b.pa} higher={null} />
          {a.playoffs != null && b.playoffs != null ? (
            <Tape label="Playoff chance" a={Math.round(a.playoffs)} b={Math.round(b.playoffs)} fmt={(n) => `${n}%`} />
          ) : null}
        </ul>
      </section>

      <section className={`${w.widget} ${w.l}`}>
        <div className={w.head}>
          <Icon name="trending" className={w.headIcon} />
          <span className={w.title}>Week by week</span>
          <span className={r.legend}>
            <i className={r.keyA} />
            {a.name}
            <i className={r.keyB} />
            {b.name}
          </span>
        </div>
        <Weekly a={a} b={b} />
      </section>

      {theirs.length ? (
        <section className={`${w.widget} ${w.l}`}>
          <div className={w.head}>
            <Icon name="calendar" className={w.headIcon} />
            <span className={w.title}>Their games</span>
          </div>
          <ul className={r.games}>
            {theirs.map((m) => (
              <li key={m.week}>
                <span className={r.gWeek}>Week {m.week}</span>
                {m.status === 'pending' ? (
                  <span className={r.gState}>Scheduled</span>
                ) : (
                  <span className={r.gScore}>
                    <b className={m.aPts > m.bPts ? r.win : ''}>{m.aPts.toFixed(2)}</b>
                    <span>to</span>
                    <b className={m.bPts > m.aPts ? r.win : ''}>{m.bPts.toFixed(2)}</b>
                    {m.status === 'live' ? <span className={r.gState}>In progress</span> : null}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Sheet open={picking != null} onClose={() => setPicking(null)} title={picking === 'a' ? 'Left side' : 'Right side'}>
        <div className={r.pickGrid}>
          {teams.map((t) => {
            const on = (picking === 'a' ? aId : bId) === t.rosterId;
            return (
              <Press key={t.rosterId} className={`${r.pick} ${on ? r.pickOn : ''}`} onClick={() => choose(t.rosterId)}>
                <Face t={t} size={48} />
                <b>{t.name}</b>
                <span>{rec(t.wins, t.losses, t.ties)}</span>
              </Press>
            );
          })}
        </div>
      </Sheet>
    </div>
  );
}
