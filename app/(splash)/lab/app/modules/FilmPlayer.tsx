'use client';

import { useEffect, useState } from 'react';
import Story from './Story';
import type { StorySlide } from '@/lib/week-story';
import { MX } from './icons';
import m from './modules.module.css';

const Play = () => (
  <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden>
    <path d={MX.play} />
  </svg>
);

/**
 * The league's two films as square tiles: the week in 90 seconds, which opens
 * the story player, and the latest chug, which opens
 * full screen with its controls so the sound is one tap away.
 */
export default function FilmPlayer({
  slides,
  storyWeek,
  cover,
  chug,
  shart,
}: {
  slides: StorySlide[];
  storyWeek: number | null;
  cover: string | null;
  chug: { week: number; src: string } | null;
  /** Who drank it: the Shart of the chug's week, by team then manager. */
  shart: { team: string; manager: string } | null;
}) {
  const [story, setStory] = useState(false);
  const [film, setFilm] = useState(false);

  useEffect(() => {
    if (!film) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFilm(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [film]);

  return (
    <div className={m.films}>
      {slides.length && storyWeek ? (
        <button type="button" className={m.film} onClick={() => setStory(true)} aria-label={`Play week ${storyWeek} in 90 seconds`}>
          {cover ? <img src={cover} alt="" /> : null}
          <span className={m.filmShade} aria-hidden />
          <span className={m.filmPlay} aria-hidden>
            <Play />
          </span>
          <span className={m.filmText}>
            <small>Week {storyWeek}</small>
            <b>In 90 Seconds</b>
            <span>{slides.length} slides</span>
          </span>
        </button>
      ) : null}
      {chug ? (
        <button type="button" className={m.film} onClick={() => setFilm(true)} aria-label={`Play the week ${chug.week} chug`}>
          <video src={`${chug.src}#t=1.5`} muted playsInline preload="metadata" aria-hidden />
          <span className={m.filmShade} aria-hidden />
          <span className={m.filmPlay} aria-hidden>
            <Play />
          </span>
          <span className={m.filmText}>
            <small>Week {chug.week}</small>
            <b>The Chug</b>
            {shart ? <span>{shart.team}</span> : null}
            {shart ? <span>{shart.manager}</span> : null}
          </span>
        </button>
      ) : null}
      {story ? <Story slides={slides} onClose={() => setStory(false)} /> : null}
      {film && chug ? (
        <div className={m.modal} role="dialog" aria-modal="true" aria-label={`The chug, week ${chug.week}`} onClick={() => setFilm(false)}>
          <video src={chug.src} controls autoPlay playsInline onClick={(e) => e.stopPropagation()} />
          <button type="button" className={m.modalClose} onClick={() => setFilm(false)}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
