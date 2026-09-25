'use client';

import { useState } from 'react';
import WeekStory from './WeekStory';
import type { StorySlide } from '@/lib/week-story';

/**
 * The way into the week's story.
 *
 * A client island holding only the open state, so the slides themselves are
 * built on the server and the page does not ship the trophy and highlight
 * code to the phone to render five cards.
 */
export default function WeekStoryButton({ slides }: { slides: StorySlide[] }) {
  const [open, setOpen] = useState(false);
  if (!slides.length) return null;
  const week = slides[0].week;

  return (
    <>
      <button type="button" className="snffl-wstory-open" onClick={() => setOpen(true)}>
        <span className="snffl-wstory-open-dot" aria-hidden />
        <span className="snffl-wstory-open-body">
          <strong>Week {week} in 90 seconds</strong>
          <span>{slides.length} slides</span>
        </span>
        <span aria-hidden>&#9654;</span>
      </button>
      {open ? <WeekStory slides={slides} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
