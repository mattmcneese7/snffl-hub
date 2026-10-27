'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BarState, SideView } from './data';
import { LivePoints } from './live/Live';
import s from './v4.module.css';

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * Your matchup, pinned above the tab bar on every screen. Slim, it is the
 * label, the state and two rows: team, score, chance. Tapped, the same rows
 * grow into a quick read (avatars, what is left, the top scorer) and a way into
 * the full matchup. The open state is a morph, not a swap: every keyed piece is
 * measured before and after and travels from where it was (FLIP).
 *
 * Docked (`dockTo`, the id of your game's hero on the page): while that hero
 * is on screen the bar is only its label and state, since the hero shows the
 * scores; scroll the hero away and the rows grow back. One object, never the
 * same score twice.
 */
export default function ScoreBar({ week, state, rows, href, dockTo }: { week: number; state: BarState; rows: [SideView, SideView]; href: string; dockTo?: string }) {
  const [open, setOpen] = useState(false);
  const [stub, setStub] = useState(Boolean(dockTo));
  useEffect(() => {
    if (!dockTo) return;
    const hero = document.getElementById(dockTo);
    if (!hero) { setStub(false); return; }
    const io = new IntersectionObserver(([e]) => {
      bar.current?.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      before.current = measure();
      setStub(e.isIntersecting);
      if (e.isIntersecting) setOpen(false);
    }, { threshold: 0.25 });
    io.observe(hero);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dockTo]);
  const bar = useRef<HTMLDivElement>(null);
  const before = useRef<{ h: number; rects: Map<string, DOMRect> } | null>(null);

  const measure = () => {
    const el = bar.current;
    if (!el) return null;
    const rects = new Map<string, DOMRect>();
    el.querySelectorAll<HTMLElement>('[data-k]').forEach((e) => rects.set(e.dataset.k!, e.getBoundingClientRect()));
    return { h: el.getBoundingClientRect().height, rects };
  };

  const toggle = () => {
    if (stub && dockTo) {
      document.getElementById(dockTo)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    bar.current?.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    before.current = measure();
    setOpen((o) => !o);
  };

  useLayoutEffect(() => {
    const el = bar.current;
    const was = before.current;
    before.current = null;
    if (!el || !was) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.animate([{ opacity: 0.5 }, { opacity: 1 }], { duration: 150 });
      return;
    }
    const h1 = el.getBoundingClientRect().height;
    el.animate([{ height: `${was.h}px` }, { height: `${h1}px` }], { duration: 440, easing: EASE });
    el.querySelectorAll<HTMLElement>('[data-k]').forEach((e) => {
      const r = was.rects.get(e.dataset.k!);
      const n = e.getBoundingClientRect();
      if (!r || !r.width || !n.width) {
        if (n.width) e.animate([{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 80, easing: EASE, fill: 'backwards' });
        return;
      }
      const right = e.dataset.align === 'end';
      const dx = right ? r.right - n.right : r.left - n.left;
      e.animate([{ transform: `translate(${dx}px, ${r.top - n.top}px) scale(${r.height / n.height})` }, { transform: 'none' }], { duration: 440, easing: EASE });
    });
    if (open) el.querySelectorAll<HTMLElement>('[data-fade]').forEach((e) => e.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 140, easing: EASE, fill: 'backwards' }));
  }, [open, stub]);

  const chip = state === 'live' ? 'Live' : state === 'final' ? 'Final' : 'Preview';
  return (
    <div
      ref={bar}
      className={`${s.bar} ${open ? s.barOpen : ''}`}
      role="button"
      tabIndex={0}
      aria-expanded={stub ? undefined : open}
      aria-label={`Week ${week} matchup, ${chip}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) return;
        toggle();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <span className={s.barHead} data-k="head">
        <b>Week {week} Matchup</b>
        <span className={state === 'live' ? s.liveChip : undefined}>
          {state === 'live' ? <i className={s.liveDot} aria-hidden /> : null}
          {chip}
        </span>
      </span>
      {stub ? null : rows.map((r, i) => (
        <span key={r.rosterId} className={`${s.barRow} ${r.lost ? s.lost : ''}`}>
          <span className={s.barAv} data-k={`a${i}`} style={{ ['--mgr' as string]: r.color }}>
            {r.avatar ? <img src={r.avatar} alt="" /> : null}
          </span>
          <span className={s.barName}>
            <b data-k={`n${i}`}>{r.team}</b>
            <small className={s.barSub} data-fade>
              {r.lines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </small>
          </span>
          <span className={s.barScore} data-k={`s${i}`} data-align="end">
            {state === 'live' ? <LivePoints week={week} rosterId={r.rosterId} fallback={r.score} /> : r.score.toFixed(2)}
          </span>
          <small className={s.barMark} data-k={`m${i}`} data-align="end">
            {r.mark === 'W' || r.mark === 'L' ? <b className={r.mark === 'W' ? s.win : s.loss}>{r.mark}</b> : r.mark}
          </small>
        </span>
      ))}
      {stub ? null : <Link href={href} className={s.barGo} data-fade>
        Full matchup
      </Link>}
    </div>
  );
}
