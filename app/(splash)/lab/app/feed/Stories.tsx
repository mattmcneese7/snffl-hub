'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { MX } from '../modules/icons';
import m from '../modules/modules.module.css';
import s from '../v4.module.css';
import f from './feed.module.css';

/**
 * Stories: a ring per manager, and behind each one his week. A story is the
 * broadcasters' clips of his players, oldest first, then his week in numbers
 * to close. Every ring opens, because every manager has a week.
 */
export type ClipSlide = { kind: 'clip'; id: string; title: string; still: string; url: string; tags: string[] };
export type CardSlide = {
  kind: 'card';
  id: string;
  week: number;
  headline: string;
  score: string;
  lines: { label: string; value: string }[];
  player: { name: string; slot: string; points: string; headshot: string } | null;
  href: string;
};
export type Slide = ClipSlide | CardSlide;
export type StoryManager = { rosterId: number; firstName: string; teamName: string; avatarUrl: string | null; clips: number; slides: Slide[] };

const Glyph = ({ d }: { d: string }) => (
  <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden>
    <path d={d} />
  </svg>
);

export default function Stories({ managers, week }: { managers: StoryManager[]; week: number }) {
  const [open, setOpen] = useState<StoryManager | null>(null);
  const shut = useCallback(() => setOpen(null), []);
  return (
    <>
      <div className={m.rail}>
        {managers.map((mg) => {
          const lit = mg.clips > 0;
          return (
            <div key={mg.rosterId} className={f.bubble}>
              <button
                type="button"
                className={`${f.ring} ${lit ? f.ringLit : ''}`}
                disabled={!mg.slides.length}
                onClick={() => setOpen(mg)}
                aria-label={lit ? `${mg.teamName}, week ${week} story, ${mg.clips} ${mg.clips === 1 ? 'clip' : 'clips'}` : `${mg.teamName}, week in numbers`}
              >
                <span className={f.ringAv}>{mg.avatarUrl ? <img src={mg.avatarUrl} alt="" loading="lazy" /> : <b>{mg.firstName.slice(0, 2).toUpperCase()}</b>}</span>
              </button>
              <span className={f.bubbleName}>{mg.firstName}</span>
            </div>
          );
        })}
      </div>
      {open ? <Viewer manager={open} onClose={shut} /> : null}
    </>
  );
}

function Viewer({ manager, onClose }: { manager: StoryManager; onClose: () => void }) {
  const [at, setAt] = useState(0);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const slides = manager.slides;
  const slide = slides[at];

  // Into the 4.0 root, which carries the type and tokens; the body would lose them.
  useEffect(() => setHost(document.querySelector<HTMLElement>(`.${s.root}`) ?? document.body), []);

  useEffect(() => {
    if (!host) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const back = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    return () => {
      document.documentElement.style.overflow = previous;
      back?.focus?.();
    };
  }, [host]);

  // Back closes the story rather than leaving the Feed.
  useEffect(() => {
    if (!history.state?.splashStory) history.pushState({ ...history.state, splashStory: true }, '');
    const onPop = () => onClose();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [onClose]);

  const close = useCallback(() => {
    if (history.state?.splashStory) history.back();
    else onClose();
  }, [onClose]);
  const next = useCallback(() => (at >= slides.length - 1 ? close() : setAt(at + 1)), [at, slides.length, close]);
  const prev = useCallback(() => setAt((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, next, prev]);

  if (!host || !slide) return null;

  return createPortal(
    <div className={f.viewer} role="dialog" aria-modal="true" aria-label={`${manager.teamName} story`}>
      <div className={f.progress} aria-hidden>
        {slides.map((x, i) => (
          <i key={x.id} className={i < at ? f.done : i === at ? f.now : ''} />
        ))}
      </div>
      <header className={f.vHead}>
        <span className={f.vAv}>{manager.avatarUrl ? <img src={manager.avatarUrl} alt="" /> : null}</span>
        <span className={f.vWho}>
          <b>{manager.teamName}</b>
          <span>
            {manager.firstName} &middot; {at + 1} of {slides.length}
          </span>
        </span>
        <button ref={closeBtn} type="button" className={f.vClose} onClick={close} aria-label="Close story">
          <Glyph d={MX.close} />
        </button>
      </header>
      <div className={f.vBody}>
        <button type="button" className={`${f.tap} ${f.tapBack}`} onClick={prev} aria-label="Previous" />
        <button type="button" className={`${f.tap} ${f.tapNext}`} onClick={next} aria-label={at === slides.length - 1 ? 'Close story' : 'Next'} />
        {slide.kind === 'clip' ? (
          <article className={f.vSlide} key={slide.id}>
            <span className={f.vStill}>
              <img src={slide.still} alt="" />
            </span>
            <h2 className={f.vTitle}>{slide.title}</h2>
            {slide.tags.length ? (
              <span className={f.vTags}>
                {slide.tags.map((t) => (
                  <span key={t} className={`${f.vTag} ${t === 'Benched' ? f.vTagBad : ''}`}>
                    {t}
                  </span>
                ))}
              </span>
            ) : null}
            <a className={f.yt} href={slide.url} target="_blank" rel="noopener noreferrer">
              <Glyph d={MX.play} />
              Watch on YouTube
            </a>
          </article>
        ) : (
          <article className={`${f.vSlide}`} key={slide.id}>
            <div className={f.wcard}>
              <small>Week {slide.week} in Numbers</small>
              <h2>{slide.headline}</h2>
              <p className={f.wcardScore}>{slide.score}</p>
              {slide.player ? (
                <span className={f.wcardP}>
                  <span>
                    <img src={slide.player.headshot} alt="" loading="lazy" />
                  </span>
                  <span>
                    <b>{slide.player.name}</b>
                    <em>
                      Top start &middot; {slide.player.slot} &middot; {slide.player.points} pts
                    </em>
                  </span>
                </span>
              ) : null}
              <dl className={f.wcardLines}>
                {slide.lines.map((l) => (
                  <div key={l.label}>
                    <dt>{l.label}</dt>
                    <dd>{l.value}</dd>
                  </div>
                ))}
              </dl>
              <Link href={slide.href} className={f.wcardGo}>
                Full matchup
              </Link>
            </div>
          </article>
        )}
      </div>
    </div>,
    host,
  );
}
