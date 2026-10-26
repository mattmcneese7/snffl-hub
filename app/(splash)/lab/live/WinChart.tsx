'use client';

import { useId } from 'react';
import type { WinPath } from './winpath';
import s from './live.module.css';

const W = 342;
const H = 196;
const PAD = { l: 14, r: 14, t: 14, b: 30 };
const PLOT_H = H - PAD.t - PAD.b;
const MID = PAD.t + PLOT_H / 2;

const pct = (p: number, done: boolean) => {
  const n = Math.round(p * 100);
  return done ? n : Math.min(99, Math.max(1, n));
};

/**
 * Win chance across the week, one checkpoint per kickoff window. Above the
 * middle line the away side is favored (powder), below it the home side
 * (deep blue tint). The line draws itself in once, on arrival.
 */
export default function WinChart({ path, away, home, done }: { path: WinPath; away: string; home: string; done: boolean }) {
  const id = useId().replace(/:/g, '');
  const cols = path.windows.length + 1;
  const x = (col: number) => PAD.l + (cols <= 1 ? 0 : (col * (W - PAD.l - PAD.r)) / (cols - 1));
  const y = (p: number) => PAD.t + (1 - p) * PLOT_H;
  const pts = path.points.map((p) => ({ x: x(p.window + 1), y: y(p.away), p: p.away, window: p.window }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  const area = pts.length > 1 ? `M${pts[0].x},${MID} ${pts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} L${last.x},${MID} Z` : '';

  const favAway = last.p >= 0.5;
  const tag = `${favAway ? away : home} ${pct(favAway ? last.p : 1 - last.p, done)}%`;
  const tagBelow = last.y < PAD.t + 22;
  const anchor = last.x > W - 70 ? 'end' : last.x < 70 ? 'start' : 'middle';

  const said = path.points
    .map((p) => `${p.window < 0 ? 'Pregame' : `after ${path.windows[p.window].long}`} ${away} ${pct(p.away, done && p === path.points[path.points.length - 1])}%`)
    .join(', ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={s.chart} role="img" aria-label={`${away}’s win chance: ${said}.`}>
      <defs>
        <clipPath id={`top${id}`}>
          <rect x={0} y={0} width={W} height={MID} />
        </clipPath>
        <clipPath id={`bot${id}`}>
          <rect x={0} y={MID} width={W} height={H - MID} />
        </clipPath>
      </defs>


      <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t} y2={PAD.t} className={s.chartHair} />
      <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + PLOT_H} y2={PAD.t + PLOT_H} className={s.chartHair} />
      <line x1={PAD.l} x2={W - PAD.r} y1={MID} y2={MID} className={s.chartMid} />

      {area ? (
        <g className={s.chartArea}>
          <path d={area} clipPath={`url(#top${id})`} fill="#c9dcfa" />
          <path d={area} clipPath={`url(#bot${id})`} fill="rgba(45, 76, 156, 0.26)" />
        </g>
      ) : null}

      {pts.length > 1 ? <path d={line} pathLength={1} className={s.chartLine} /> : null}

      {pts.map((p, i) => (
        <circle
          key={p.window}
          cx={p.x}
          cy={p.y}
          r={p === last ? 5 : 3.5}
          className={`${s.chartDot} ${p === last ? s.chartDotLast : ''}`}
          style={{ animationDelay: `${(pts.length > 1 ? i / (pts.length - 1) : 0) * 0.8}s` }}
        />
      ))}

      <text
        x={last.x + (anchor === 'start' ? -2 : anchor === 'end' ? 2 : 0)}
        y={tagBelow ? last.y + 20 : last.y - 11}
        textAnchor={anchor}
        className={s.chartTag}
      >
        {tag}
      </text>

      {/* The week along the bottom: pregame, then every kickoff window, the ones still to come in gray. */}
      {['Pre', ...path.windows.map((w) => w.label)].map((label, col) => {
        const played = col === 0 || path.windows[col - 1].state !== 'pre';
        return (
          <text
            key={label}
            x={x(col)}
            y={H - 8}
            textAnchor={col === 0 ? 'start' : col === cols - 1 ? 'end' : 'middle'}
            dx={col === 0 ? -PAD.l + 2 : col === cols - 1 ? PAD.r - 2 : 0}
            className={`${s.chartX} ${played ? s.chartXOn : ''}`}
          >
            {label}
          </text>
        );
      })}

      {/* Who is up top and who is below. */}
      <text x={PAD.l + 4} y={PAD.t + 14} className={s.chartSide}>
        {away} favored
      </text>
      <text x={PAD.l + 4} y={PAD.t + PLOT_H - 7} className={s.chartSide}>
        {home} favored
      </text>
    </svg>
  );
}
