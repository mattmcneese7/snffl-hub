'use client';

import { useState } from 'react';
import type { Highlight } from '@/lib/highlights';
import { toReelClip } from '@/lib/reel-clips';
import HighlightCard from './HighlightCard';
import ReelPlayer from './ReelPlayer';

/**
 * A list of clips that plays as one reel: tapping any card opens the full
 * screen player on that clip, and swiping carries on through the rest of the
 * list in the order shown.
 */
export default function HighlightList({
  clips,
  managers = {},
  title,
}: {
  clips: Highlight[];
  /** Roster id as text to the name shown on a clip. */
  managers?: Record<string, string>;
  title?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const nameOf = (clip: Highlight) => (clip.ownerTeamId ? (managers[clip.ownerTeamId] ?? null) : null);

  return (
    <>
      <div className="snffl-card">
        {clips.map((clip, index) => (
          <HighlightCard
            key={clip.id}
            highlight={clip}
            managerName={nameOf(clip)}
            onPlay={() => setOpen(index)}
          />
        ))}
      </div>
      {open != null ? (
        <ReelPlayer
          clips={clips.map((clip) => toReelClip(clip, nameOf(clip)))}
          start={open}
          onClose={() => setOpen(null)}
          title={title}
        />
      ) : null}
    </>
  );
}
