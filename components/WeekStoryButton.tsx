'use client';

import { useEffect, useState } from 'react';
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
  // It arrives rather than being there. Held back until the page has settled,
  // then it drops in and the column moves down to take it.
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (!slides.length) return;
    const id = setTimeout(() => setLanded(true), 2200);
    return () => clearTimeout(id);
  }, [slides.length]);

  if (!slides.length) return null;
  const week = slides[0].week;

  return (
    <div className={`snffl-wstory-ribbon${landed ? ' snffl-wstory-ribbon-in' : ''}`}>
      {/* One button. It is a way in, not a panel: the slide count and a
          status dot were furniture on something you either tap or scroll
          past. */}
      <button type="button" className="snffl-wstory-open" onClick={() => setOpen(true)}>
        <span aria-hidden>&#9654;</span>
        Week {week} in 90 seconds
      </button>
      {open ? <WeekStory slides={slides} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
