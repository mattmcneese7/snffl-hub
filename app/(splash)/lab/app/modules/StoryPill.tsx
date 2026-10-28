'use client';

import { useState } from 'react';
import type { StorySlide } from '@/lib/week-story';
import { Ms } from '../icons';
import { useOverlayHistory } from '../nav/overlay';
import Story from './Story';
import { ui } from '../ui';

/** "Week 6 in 90 Seconds": one pill that opens the week's story. */
export default function StoryPill({ slides, week }: { slides: StorySlide[]; week: number }) {
  const [open, setOpen] = useState(false);
  const dismiss = useOverlayHistory('story', open, () => setOpen(false));
  if (!slides.length) return null;
  return (
    <>
      <button type="button" className={`${ui.pill} ${ui.pillSecondary}`} style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(true)}>
        <Ms name="play" size={20} />
        Week {week} in 90 Seconds
      </button>
      {open ? <Story slides={slides} onClose={dismiss} /> : null}
    </>
  );
}
