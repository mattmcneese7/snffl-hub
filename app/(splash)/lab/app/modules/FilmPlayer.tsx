'use client';

import { useEffect, useState } from 'react';
import Story from './Story';
import type { StorySlide } from '@/lib/week-story';
import { Label, Media, Tag, ui } from '../ui';
import { storyStage as st } from '../ui/blocks/StoryStage';
import l from './layout.module.css';

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
    <div className={`${ui.card} ${l.grid2}`}>
      {slides.length && storyWeek ? (
        <button type="button" className={`${l.bare} ${ui.tile} ${ui.tap}`} onClick={() => setStory(true)} aria-label={`Play week ${storyWeek} in 90 seconds`}>
          {cover ? <Media src={cover} tag={<Tag>Play</Tag>} /> : null}
          <Label>Week {storyWeek}</Label>
          <span className={`${ui.title} ${ui.strong}`}>In 90 Seconds</span>
          <span className={ui.sub}>{slides.length} slides</span>
        </button>
      ) : null}
      {chug ? (
        <button type="button" className={`${l.bare} ${ui.tile} ${ui.tap}`} onClick={() => setFilm(true)} aria-label={`Play the week ${chug.week} chug`}>
          <Media src={`${chug.src}#t=1.5`} video tag={<Tag>Play</Tag>} />
          <Label>Week {chug.week}</Label>
          <span className={`${ui.title} ${ui.strong}`}>The Chug</span>
          {shart ? <span className={ui.sub}>{shart.team}, {shart.manager}</span> : null}
        </button>
      ) : null}
      {story ? <Story slides={slides} onClose={() => setStory(false)} /> : null}
      {film && chug ? (
        <div className={`${st.wrap} ${l.center}`} role="dialog" aria-modal="true" aria-label={`The chug, week ${chug.week}`} onClick={() => setFilm(false)}>
          <video className={l.fill} src={chug.src} controls autoPlay playsInline onClick={(e) => e.stopPropagation()} />
          <button type="button" className={`${ui.pill} ${ui.pillWhite}`} onClick={() => setFilm(false)}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
