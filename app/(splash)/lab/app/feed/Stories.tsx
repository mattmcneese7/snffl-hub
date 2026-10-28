'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Avatar, Label, ui } from '../ui';
import { storyStage as st } from '../ui/blocks/StoryStage';
import f from './feed.module.css';
import { MS } from '../icons';

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
      <div className={ui.rail} role="group" aria-label="Stories">
        {managers.map((mg) => {
          const lit = mg.clips > 0;
          return (
            <button
              key={mg.rosterId}
              type="button"
              className={f.bubble}
              disabled={!mg.slides.length}
              onClick={() => setOpen(mg)}
              aria-label={lit ? `${mg.teamName}, week ${week} story, ${mg.clips} ${mg.clips === 1 ? 'clip' : 'clips'}` : `${mg.teamName}, week in numbers`}
            >
              <Avatar src={mg.avatarUrl} size={44} />
              <Label tone={lit ? 'brand' : undefined}>{mg.firstName}</Label>
            </button>
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
  useEffect(() => setHost(document.querySelector('main')?.parentElement ?? document.body), []);

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
    <div className={st.wrap} role="dialog" aria-modal="true" aria-label={`${manager.teamName} story`}>
      <div className={st.progress} aria-hidden>
        {slides.map((x, i) => (
          <i key={x.id} className={i <= at ? st.done : ''} />
        ))}
      </div>
      <header className={st.top}>
        <div className={st.row}>
          {manager.avatarUrl ? <img className={st.face} src={manager.avatarUrl} alt="" /> : null}
          <span>
            <b>{manager.teamName}</b>
            <small>
              {manager.firstName} &middot; {at + 1} of {slides.length}
            </small>
          </span>
        </div>
        <button ref={closeBtn} type="button" className={st.close} onClick={close} aria-label="Close story">
          <Glyph d={MS.close} />
        </button>
      </header>
      <div className={st.body}>
        <button type="button" className={`${st.tap} ${st.back}`} onClick={prev} aria-label="Previous" />
        <button type="button" className={`${st.tap} ${st.next}`} onClick={next} aria-label={at === slides.length - 1 ? 'Close story' : 'Next'} />
        {slide.kind === 'clip' ? (
          <article className={st.sheet} key={slide.id}>
            <span className={st.still}>
              <img src={slide.still} alt="" />
            </span>
            <h2 className={st.name}>{slide.title}</h2>
            {slide.tags.length ? (
              <span className={st.tags}>
                {slide.tags.map((t) => (
                  <span key={t} className={`${st.tag} ${t === 'Benched' ? st.tagBad : ''}`}>
                    {t}
                  </span>
                ))}
              </span>
            ) : null}
            <a className={st.go} href={slide.url} target="_blank" rel="noopener noreferrer">
              <Glyph d={MS.play} />
              Watch on YouTube
            </a>
          </article>
        ) : (
          <article className={st.sheet} key={slide.id}>
            <div className={st.panel}>
              <small className={st.kicker}>Week {slide.week} in Numbers</small>
              <h2 className={st.name}>{slide.headline}</h2>
              <p className={st.line}>{slide.score}</p>
              {slide.player ? (
                <span className={st.row}>
                  <img className={st.face} src={slide.player.headshot} alt="" loading="lazy" />
                  <span className={st.rowText}>
                    <b>{slide.player.name}</b>
                    <small className={st.sub}>
                      Top start &middot; {slide.player.slot} &middot; {slide.player.points} pts
                    </small>
                  </span>
                </span>
              ) : null}
              <dl className={st.lines}>
                {slide.lines.map((l) => (
                  <div key={l.label}>
                    <dt>{l.label}</dt>
                    <dd>{l.value}</dd>
                  </div>
                ))}
              </dl>
              <Link href={slide.href} className={st.go}>
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
