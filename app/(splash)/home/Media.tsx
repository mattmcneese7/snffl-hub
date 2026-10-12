'use client';

import { useEffect, useState } from 'react';
import { Play } from '@phosphor-icons/react';
import WeekStory from '@/components/WeekStory';
import Icon from './Icons';
import w from './widgets.module.css';
import type { StorySlide } from '@/lib/week-story';
import styles from './home.module.css';

/**
 * The two pieces of film the league makes, up top the way v2 leads with them,
 * as two pills, each with a small thumbnail: the week's story (the live
 * app's own story player, so the same slides) and the latest chug, which
 * opens full screen with sound.
 */
export default function Media({
  slides,
  storyWeek,
  cover,
  chug,
  tiles = false,
}: {
  slides: StorySlide[];
  storyWeek: number | null;
  cover: string | null;
  chug: { week: number; src: string } | null;
  /** As two small square widgets on the home's grid, rather than pills. */
  tiles?: boolean;
}) {
  const [story, setStory] = useState(false);
  const [film, setFilm] = useState(false);
  // The pour moment's Watch button opens the chug from wherever it is.
  useEffect(() => {
    const open = () => setFilm(true);
    window.addEventListener('snffl:v3-chug', open);
    return () => window.removeEventListener('snffl:v3-chug', open);
  }, []);
  if (!slides.length && !chug) return null;

  const players = (
    <>
      {story ? <WeekStory slides={slides} onClose={() => setStory(false)} /> : null}
      {film && chug ? (
        <div className={styles.filmModal} role="dialog" aria-label={`The chug, week ${chug.week}`} onClick={() => setFilm(false)}>
          <video src={chug.src} controls autoPlay playsInline className={styles.filmVideo} onClick={(e) => e.stopPropagation()} />
          <button type="button" className={styles.filmClose} onClick={() => setFilm(false)}>
            Close
          </button>
        </div>
      ) : null}
    </>
  );

  if (tiles) {
    return (
      <div className={w.films}>
        {slides.length && storyWeek ? (
          <button type="button" className={`${w.widget} ${w.s} ${w.film}`} onClick={() => setStory(true)}>
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className={w.filmArt} />
            ) : null}
            <span className={w.filmShade} aria-hidden />
            <span className={w.filmPlay} aria-hidden>
              <Play weight="fill" />
            </span>
            <span className={w.filmText}>
              <b>Week {storyWeek}</b>
              <span>in 90 seconds</span>
            </span>
          </button>
        ) : null}
        {chug ? (
          <button type="button" className={`${w.widget} ${w.s} ${w.film}`} onClick={() => setFilm(true)}>
            <video src={`${chug.src}#t=1.5`} muted playsInline preload="metadata" className={w.filmArt} aria-hidden />
            <span className={w.filmShade} aria-hidden />
            <span className={w.filmPlay} aria-hidden>
              <Play weight="fill" />
            </span>
            <span className={w.filmBadge} aria-hidden>
              <Icon name="stein" />
            </span>
            <span className={w.filmText}>
              <b>The chug</b>
              <span>Week {chug.week}</span>
            </span>
          </button>
        ) : null}
        {players}
      </div>
    );
  }

  return (
    <>
      <div className={styles.media}>
        {slides.length && storyWeek ? (
          <button type="button" className={styles.film} onClick={() => setStory(true)}>
            <span className={styles.filmThumb}>
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" />
              ) : null}
              <span className={styles.filmPlay} aria-hidden>
                <Play weight="fill" />
              </span>
            </span>
            <span className={styles.filmText}>
              <b>Week {storyWeek}</b>
              <span>in 90 seconds</span>
            </span>
          </button>
        ) : null}
        {chug ? (
          <button type="button" className={styles.film} onClick={() => setFilm(true)}>
            <span className={styles.filmThumb}>
              <video src={`${chug.src}#t=1.5`} muted playsInline preload="metadata" aria-hidden />
              <span className={styles.filmPlay} aria-hidden>
                <Play weight="fill" />
              </span>
            </span>
            <span className={styles.filmText}>
              <b>The chug</b>
              <span>Week {chug.week}</span>
            </span>
          </button>
        ) : null}
      </div>

      {players}
    </>
  );
}
