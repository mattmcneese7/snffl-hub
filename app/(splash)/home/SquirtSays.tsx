'use client';

import { useState } from 'react';
import Squirt, { type Mood } from './Squirt';
import soul from './soul.module.css';
import w from './widgets.module.css';

/**
 * Squirt says, the body: Squirt on the left, his take on the game in the
 * first bubble, one of his lineup reads in the second. Tap him and he moves
 * on to his next read, the way v2 listed several; the first bubble stays.
 */
export default function SquirtSays({
  mood,
  lead,
  sayings,
}: {
  mood: Mood;
  /** The take on the game: before, the marked phrase, after. */
  lead: [string, string, string] | null;
  sayings: string[];
}) {
  const [i, setI] = useState(0);
  const many = sayings.length > 1;
  const next = () => setI((n) => (n + 1) % sayings.length);

  return (
    <div className={w.says}>
      {many ? (
        <button type="button" className={w.squirtTap} onClick={next} aria-label="Next read from Squirt">
          <Squirt mood={mood} size={84} />
        </button>
      ) : (
        <Squirt mood={mood} size={84} />
      )}
      <div className={w.quotes}>
        {lead ? (
          <p className={`${w.quote} ${w.quoteLead}`}>
            <q>
              {lead[0]}
              {lead[1] ? <mark className={soul.marker}>{lead[1]}</mark> : null}
              {lead[2]}
            </q>
          </p>
        ) : null}
        {sayings.length ? (
          <p className={w.quote} aria-live="polite" key={i}>
            <q>{sayings[i]}</q>
          </p>
        ) : null}
        {many ? (
          <span className={w.tapHint}>
            Tap me, I&rsquo;ve got more. {i + 1} of {sayings.length}
          </span>
        ) : null}
      </div>
    </div>
  );
}
