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

  // Nothing at all until it lands, rather than a collapsed box.
  //
  // A zero height element is still a child of the page grid, still costs a
  // row gap, and still has a height the browser is free to disagree with me
  // about, which it did: three attempts at collapsing it left 44, then 32,
  // then 32 pixels of nothing above the Rag. An element that does not exist
  // cannot reserve anything, and the reflow when it appears is the push.
  if (!landed) {
    return open ? <WeekStory slides={slides} onClose={() => setOpen(false)} /> : null;
  }

  return (
    <div className="snffl-wstory-ribbon">
      {/* The clip. A grid row animating from 0fr can only collapse a child
          that is allowed to have no height, and a button with a tap sized
          min-height is not, so it needs something between it and the row. */}
      <span className="snffl-ribbon-clip">
        {/* One button. It is a way in, not a panel: the slide count and a
            status dot were furniture on something you either tap or scroll
            past. */}
        <button type="button" className="snffl-wstory-open" onClick={() => setOpen(true)}>
        <span className="snffl-frost" aria-hidden />
        {/* Drawn, not typed. U+25B6 carries emoji presentation on iOS, so the
            character turns into a colour glyph from the system font and the
            button stops being ours. */}
        <svg className="snffl-wstory-play" viewBox="0 0 10 12" aria-hidden focusable="false">
          <path d="M0 0 L10 6 L0 12 Z" fill="currentColor" />
        </svg>
        Week {week} in 90 seconds
        </button>
      </span>
      {open ? <WeekStory slides={slides} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
