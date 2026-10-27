'use client';

import { useRef, useState, type PointerEvent } from 'react';
import u from '../ui.module.css';
import t from './WeekBars.module.css';

/**
 * Points by week as plain SVG: a solid bar for a week that went the good way
 * (won, or started), an outline for the other (lost, or benched), the
 * playoff weeks washed in powder. The axis comes off the same scale as the
 * bars, so a bar that reaches the 120 line scored 120. A tap on any week's
 * column reads it out above the chart, and a finger dragged across scrubs
 * week to week (the whole chart is the target, since a season's columns are
 * narrower than a fingertip); tapping the same week again goes back to the
 * best. Arrow keys step through the weeks.
 */
export function WeekBars({
  points,
  playoffWeekStart,
  weeks,
  solid,
  hollow,
}: {
  points: { week: number; points: number; good: boolean }[];
  playoffWeekStart: number;
  weeks: number;
  solid: string;
  hollow: string;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const down = useRef(false);
  if (!points.length) return <p className={u.sub}>No scored weeks yet.</p>;
  const W = 320;
  const H = 160;
  const left = 30;
  const top = 16;
  const bottom = 20;
  const plotH = H - top - bottom;
  const plotW = W - left - 2;
  const high = Math.max(...points.map((x) => x.points), 1);
  const tick = [5, 10, 20, 25, 50, 100].find((s) => high / s <= 4) ?? 100;
  const max = Math.ceil(high / tick) * tick;
  const ticks = Array.from({ length: max / tick + 1 }, (_, i) => i * tick);
  const y = (v: number) => top + plotH - (Math.max(0, v) / max) * plotH;
  const col = plotW / weeks;
  const barW = Math.max(5, col * 0.62);
  const x = (week: number) => left + (week - 1) * col;
  const best = points.reduce((a, b) => (b.points > a.points ? b : a));
  const shown = points.find((pt) => pt.week === picked) ?? best;
  const played = points.map((pt) => pt.week);
  // The scored week nearest the finger.
  const weekAt = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - box.left) / box.width) * W;
    const wk = Math.min(weeks, Math.max(1, Math.floor((vx - left) / col) + 1));
    return played.reduce((a, b) => (Math.abs(b - wk) < Math.abs(a - wk) ? b : a));
  };
  const step = (dir: 1 | -1) => {
    const i = played.indexOf(shown.week);
    setPicked(played[Math.min(played.length - 1, Math.max(0, i + dir))]);
  };
  return (
    <div className={t.chart}>
      <p className={t.readout} aria-live="polite">
        <span className={u.value}>{shown.points.toFixed(2)}</span>
        <span className={u.sub}>
          Week {shown.week} &middot; {shown.good ? solid : hollow}
          {shown === best ? ' · Best' : ''}
        </span>
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={t.scrub}
        role="slider"
        tabIndex={0}
        aria-label={`Points by week. Best ${best.points.toFixed(2)} in week ${best.week}.`}
        aria-valuemin={played[0]}
        aria-valuemax={played[played.length - 1]}
        aria-valuenow={shown.week}
        aria-valuetext={`Week ${shown.week}, ${shown.points.toFixed(2)} points`}
        onPointerDown={(e) => {
          down.current = true;
          const wk = weekAt(e);
          setPicked((w) => (w === wk ? null : wk));
        }}
        onPointerMove={(e) => {
          if (down.current) setPicked(weekAt(e));
        }}
        onPointerUp={() => (down.current = false)}
        onPointerLeave={() => (down.current = false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') step(1);
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') step(-1);
          else return;
          e.preventDefault();
        }}
      >
        {playoffWeekStart <= weeks ? <rect className={t.playoffs} x={x(playoffWeekStart)} y={top - 12} width={left + plotW - x(playoffWeekStart)} height={plotH + 12} rx={10} /> : null}
        {ticks.map((v) => (
          <g key={v}>
            <line className={t.grid} x1={left} x2={left + plotW} y1={y(v)} y2={y(v)} />
            <text x={left - 6} y={y(v) + 4} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {points.map((pt) => {
          const h = Math.max(1.5, y(0) - y(pt.points));
          const bx = x(pt.week) + (col - barW) / 2;
          const dim = picked != null && pt.week !== picked ? t.dim : '';
          return pt.good ? (
            <rect key={pt.week} className={`${t.solid} ${dim}`} x={bx} y={y(0) - h} width={barW} height={h} />
          ) : (
            <rect key={pt.week} className={`${t.hollow} ${dim}`} x={bx + 0.75} y={y(0) - h + 0.75} width={barW - 1.5} height={Math.max(1, h - 0.75)} />
          );
        })}
        {Array.from({ length: weeks }, (_, i) => i + 1)
          .filter((wk) => weeks <= 9 || wk % 2 === 1)
          .map((wk) => (
            <text key={wk} x={x(wk) + col / 2} y={H - 4} textAnchor="middle">
              {wk}
            </text>
          ))}
      </svg>
      <div className={t.legend}>
        <span className={u.label}>
          <i className={t.keySolid} />
          {solid}
        </span>
        <span className={u.label}>
          <i className={t.keyHollow} />
          {hollow}
        </span>
        {playoffWeekStart <= weeks ? (
          <span className={u.label}>
            <i className={t.keyPlayoffs} />
            Playoffs
          </span>
        ) : null}
      </div>
    </div>
  );
}
