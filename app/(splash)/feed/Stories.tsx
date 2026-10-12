'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import f from './feed.module.css';
import { SLEEPER_MARK } from '../kit/sleeperMark';

/**
 * Manager stories: fourteen bubbles, and behind each one his week.
 *
 * A story is the clips of his players from the broadcasters' YouTube
 * channels (lib/embed-clips.ts), then his week in numbers to close. A clip
 * slide is the still and the title with a button that opens YouTube; the
 * Replays rail is where clips play in place. Every bubble
 * opens, because every manager has a week, even one with no clips.
 *
 * The viewer is drawn into the page's own stage rather than the body, so it
 * keeps Splash's type and sits above the menu and the tickers.
 */

export type ClipSlide = {
  kind: 'clip';
  id: string;
  title: string;
  still: string;
  url: string;
  /** "Puka Nacua", "Started", "21.40 pts", the play type when known. */
  tags: string[];
};

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

export type StoryManager = {
  rosterId: number;
  firstName: string;
  avatarUrl: string | null;
  clips: number;
  slides: Slide[];
};

export default function Stories({ managers, week }: { managers: StoryManager[]; week: number }) {
  const [open, setOpen] = useState<StoryManager | null>(null);
  const shut = useCallback(() => setOpen(null), []);
  return (
    <>
      <div className={`${f.rail} ${f.railBleed}`}>
        {managers.map((m) => {
          const lit = m.clips > 0;
          return (
            <div key={m.rosterId} className={f.bubble}>
              <button
                type="button"
                className={`${f.ring} ${lit ? f.ringLit : ''}`}
                disabled={!m.slides.length}
                onClick={() => setOpen(m)}
                aria-label={lit ? `${m.firstName}’s week ${week} story, ${m.clips} ${m.clips === 1 ? 'clip' : 'clips'}` : `${m.firstName}’s week in numbers`}
              >
                <span className={f.avatar}>
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatarUrl} alt="" loading="lazy" />
                  ) : (
                    <span className={f.initials}>{m.firstName.slice(0, 2).toUpperCase()}</span>
                  )}
                </span>
              </button>
              {/* The ring plays the story; the name goes to his page. */}
              <Link href={`/managers/${m.rosterId}`} className={f.bubbleName}>
                {m.firstName}
              </Link>
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

  // Into the stage, which carries the type; the body would lose it.
  useEffect(() => setHost(document.querySelector<HTMLElement>('[data-stage]') ?? document.body), []);

  // The stage is the page's scroller, so it is the one held still.
  useEffect(() => {
    if (!host) return;
    const previous = host.style.overflowY;
    host.style.overflowY = 'hidden';
    const back = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    return () => {
      host.style.overflowY = previous;
      back?.focus?.();
    };
  }, [host]);

  // Back closes the story rather than leaving the Feed.
  useEffect(() => {
    // One entry per story, even when React runs this effect twice in dev.
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
    <div className={f.viewer} role="dialog" aria-modal="true" aria-label={`${manager.firstName}’s story`}>
      <div className={f.progress} aria-hidden>
        {slides.map((s, i) => (
          <i key={s.id} className={i < at ? f.barDone : i === at ? f.barNow : ''} />
        ))}
      </div>
      <header className={f.vHead}>
        <span className={f.vAvatar}>
          {manager.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={manager.avatarUrl} alt="" />
          ) : null}
        </span>
        <span className={f.vWho}>
          <b>{manager.firstName}</b>
          <span>
            {at + 1} of {slides.length}
          </span>
        </span>
        <button ref={closeBtn} type="button" className={f.vClose} onClick={close} aria-label="Close story">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className={f.vBody}>
        {/* Tap zones: the left third goes back, the rest goes on. They sit
            under the slide's own buttons, which stay pressable. */}
        <button type="button" className={`${f.tap} ${f.tapBack}`} onClick={prev} aria-label="Previous" />
        <button type="button" className={`${f.tap} ${f.tapNext}`} onClick={next} aria-label={at === slides.length - 1 ? 'Close story' : 'Next'} />

        {slide.kind === 'clip' ? (
          <article className={f.vSlide} key={slide.id}>
            <span className={f.vStill}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slide.still} alt="" />
            </span>
            <h2 className={f.vTitle}>{slide.title}</h2>
            {slide.tags.length ? (
              <span className={f.vTags}>
                {slide.tags.map((t) => (
                  <span key={t} className={`${f.vTag} ${t === 'Benched' ? f.vTagHot : ''}`}>
                    {t}
                  </span>
                ))}
              </span>
            ) : null}
            <a className={f.yt} href={slide.url} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
              Watch on YouTube
            </a>
          </article>
        ) : (
          <article className={`${f.vSlide} ${f.card}`} key={slide.id}>
            <span className={f.cardLabel}>Week {slide.week}</span>
            <p className={f.cardHead}>{slide.headline}</p>
            <p className={f.cardScore}>{slide.score}</p>
            {slide.player ? (
              <span className={f.cardPlayer}>
                <span className={f.cardShot}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slide.player.headshot} alt="" loading="lazy" />
                </span>
                <span className={f.cardWho}>
                  <b>{slide.player.name}</b>
                  <span>
                    Top start | {slide.player.slot} | {slide.player.points} pts
                  </span>
                </span>
              </span>
            ) : null}
            <dl className={f.cardLines}>
              {slide.lines.map((l) => (
                <div key={l.label}>
                  <dt>{l.label}</dt>
                  <dd>{l.value}</dd>
                </div>
              ))}
            </dl>
            <Link href={slide.href} className={f.sleeper}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SLEEPER_MARK} alt="" />
              Scoring via Sleeper
            </Link>
          </article>
        )}
      </div>
    </div>,
    host
  );
}
