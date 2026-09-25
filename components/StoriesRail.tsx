'use client';

import { useState } from 'react';
import type { ReelClip } from '@/lib/reel-clips';
import ManagerLink from './ManagerLink';
import ReelPlayer from './ReelPlayer';

/**
 * Manager stories, the rail above the Rag on Home.
 *
 * Each bubble is a manager. Tapping one plays his players' clips from the last
 * finished week as a vertical story: full screen, one clip at a time, tap the
 * right side for the next. Managers with clips carry the lit ring and come
 * first.
 *
 * Every bubble opens. ESPN prunes the clips off a game page within days, so on
 * most weeks most managers have no clip and ten of the fourteen rings were
 * dark and unpressable. His week as a card is the last slide of every story
 * and the whole story for a manager with no clips, so there is always
 * something true behind the ring.
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
  const videos = (manager: StoryManager) => manager.clips.filter((clip) => !clip.card).length;
  const ordered = [...managers].sort((a, b) => videos(b) - videos(a));

  return (
    <>
      <div className="snffl-stories-rail">
        {ordered.map((manager) => {
          const reels = videos(manager);
          const has = reels > 0;
          return (
            <div className="snffl-story-bubble" key={manager.rosterId}>
              <button
                type="button"
                className="snffl-story-button"
                disabled={!manager.clips.length}
                onClick={() => setOpen(manager)}
                aria-label={
                  has
                    ? `${manager.firstName}'s Week ${week} story, ${reels} ${reels === 1 ? 'clip' : 'clips'}`
                    : `${manager.firstName}'s week in numbers`
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
              </button>
              {/* The ring plays the story; the name goes to his page. */}
              <ManagerLink rosterId={manager.rosterId} className="snffl-story-label">
                {manager.firstName}
              </ManagerLink>
              {/* No count under the name. The lit ring already says a manager
                  has replays to watch, and the number printed under every
                  bubble was a second line of small type saying the same thing
                  fourteen times. */}
            </div>
          );
        })}
      </div>

      {/* No week in the story header: a story can hold clips from the week in
          progress and a card from the week before, and every slide names its
          own week underneath. */}
      {open ? (
        <ReelPlayer
          variant="story"
          clips={open.clips}
          start={0}
          title={open.firstName}
          avatar={open.avatarUrl}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}
