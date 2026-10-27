'use client';

import { useRef, useState, type PointerEvent } from 'react';
import u from '../ui.module.css';
import t from './WinChart.module.css';

export type WinBeat = {
  winA: number;
  when: string;
  clock: string;
  what: string;
  where: string;
  scoreA: number;
  scoreB: number;
  day: string;
  moment: boolean;
};

/**
 * A matchup's win chance across its week, one step per scoring play, as
 * plain SVG in the kit's tokens: the line in deep, the even line as a
 * hairline, the days split by hairlines, a dot on every moment. At rest the
 * readout is the summary (where it ended and how it got there); a finger on
 * the chart names the play under it (when, what, where, the score and the
 * chance after it), arrow keys step. The moments list below carries the
 * plays, so the readout never repeats one until it is asked.
 */
export function WinChart({ start, beats, team, summary }: { start: number; beats: WinBeat[]; team: string; summary: string }) {
  const [picked, setPicked] = useState<number | null>(null);
  const down = useRef(false);
  if (!beats.length) return <p className={u.sub}>The chart starts at the first kickoff.</p>;
  const W = 320;
  const H = 132;
  const top = 10;
  const bottom = 18;
  const left = 2;
  const plotH = H - top - bottom;
  const plotW = W - left - 2;
  const n = beats.length;
  const x = (i: number) => left + (i / n) * plotW;
  const y = (w: number) => top + (1 - w) * plotH;
  const path = [`M${x(0).toFixed(1)} ${y(start).toFixed(1)}`, ...beats.map((b, i) => `L${x(i + 1).toFixed(1)} ${y(b.winA).toFixed(1)}`)].join(' ');
  // A label per day, dropped when it would crowd the one before (a Thursday with three plays).
  const days = beats
    .map((b, i) => ({ i, day: b.day }))
    .filter((d, k, all) => k === 0 || all[k - 1].day !== d.day)
    // When two crowd, the later day (the one with the plays) keeps its label.
    .filter((d, k, all) => k === all.length - 1 || x(all[k + 1].i) - x(d.i) >= 30);
  const rest = n - 1;
  const shown = beats[picked ?? rest];
  const at = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - box.left) / box.width) * W;
    return Math.min(n - 1, Math.max(0, Math.round(((vx - left) / plotW) * n) - 1));
  };
  const pct = (w: number) => `${Math.round(w * 100)}%`;
  return (
    <div className={t.chart}>
      <div className={t.readout} aria-live="polite">
        <span className={t.big}>
          <span className={u.value}>{pct(shown.winA)}</span>
          <span className={u.sub}>{team} to win</span>
        </span>
        {picked == null ? (
          <span className={u.sub}>{summary}</span>
        ) : (
          <>
            <span className={u.label}>
              {shown.when} &middot; {shown.clock}
            </span>
            <span className={u.title}>{shown.what}</span>
            <span className={u.sub}>
              {shown.where} &middot; {shown.scoreA.toFixed(2)} to {shown.scoreB.toFixed(2)}
            </span>
          </>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={t.scrub}
        role="slider"
        tabIndex={0}
        aria-label={`${team} win chance across the week`}
        aria-valuemin={1}
        aria-valuemax={n}
        aria-valuenow={(picked ?? rest) + 1}
        aria-valuetext={`${shown.when}, ${shown.what}, ${pct(shown.winA)} to win`}
        onPointerDown={(e) => {
          down.current = true;
          setPicked(at(e));
        }}
        onPointerMove={(e) => {
          if (down.current) setPicked(at(e));
        }}
        onPointerUp={() => (down.current = false)}
        onPointerLeave={() => (down.current = false)}
        onKeyDown={(e) => {
          const i = picked ?? rest;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setPicked(Math.min(n - 1, i + 1));
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setPicked(Math.max(0, i - 1));
          else return;
          e.preventDefault();
        }}
      >
        <line className={t.even} x1={left} x2={left + plotW} y1={y(0.5)} y2={y(0.5)} />
        {days.map((d) => (
          <g key={d.i}>
            {d.i ? <line className={t.grid} x1={x(d.i)} x2={x(d.i)} y1={top} y2={top + plotH} /> : null}
            <text x={x(d.i) + 3} y={H - 4}>
              {d.day}
            </text>
          </g>
        ))}
        <path className={t.line} d={path} />
        {beats.map((b, i) => (b.moment ? <circle key={i} className={t.dot} cx={x(i + 1)} cy={y(b.winA)} r={3.5} /> : null))}
        <circle className={t.here} cx={x((picked ?? rest) + 1)} cy={y(shown.winA)} r={5} />
      </svg>
    </div>
  );
}
