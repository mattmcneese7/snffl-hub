'use client';

import { useState } from 'react';
import type { ReelClip } from '@/lib/reel-clips';
import ReelPlayer from './ReelPlayer';

/**
 * Manager stories, the rail above the Rag on Home.
 *
 * Each bubble is a manager. Tapping one plays his players' clips from the last
 * finished week as a vertical story: full screen, one clip at a time, tap the
 * right side for the next. Managers with clips carry the lit ring and come
 * first; a manager with none still shows, dimmed, so all 14 are always there.
 */

export type StoryManager = {
  rosterId: number;
  firstName: string;
  avatarUrl: string | null;
  color: string;
  clips: ReelClip[];
};

export default function StoriesRail({ managers, week }: { managers: StoryManager[]; week: number }) {
  const [open, setOpen] = useState<StoryManager | null>(null);
  const ordered = [...managers].sort((a, b) => Number(b.clips.length > 0) - Number(a.clips.length > 0));

  return (
    <>
      <div className="snffl-stories-rail">
        {ordered.map((manager) => {
          const has = manager.clips.length > 0;
          return (
            <div className="snffl-story-bubble" key={manager.rosterId}>
              <button
                type="button"
                className="snffl-story-button"
                disabled={!has}
                onClick={() => setOpen(manager)}
                aria-label={
                  has
                    ? `${manager.firstName}'s Week ${week} story, ${manager.clips.length} clips`
                    : `${manager.firstName} has no clips from Week ${week}`
                }
              >
                <div className={`snffl-story-ring${has ? ' snffl-story-ring-live' : ''}`}>
                  {manager.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={manager.avatarUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="snffl-avatar-fallback" style={{ background: manager.color }}>
                      {manager.firstName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="snffl-story-label">{manager.firstName}</div>
                <span className="snffl-story-count">
                  {has ? `${manager.clips.length} ${manager.clips.length === 1 ? 'CLIP' : 'CLIPS'}` : 'NO CLIPS'}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {open ? (
        <ReelPlayer
          variant="story"
          clips={open.clips}
          start={0}
          title={`${open.firstName}, Week ${week}`}
          avatar={open.avatarUrl}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}
