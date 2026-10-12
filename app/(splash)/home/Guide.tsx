'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUpRight } from '@phosphor-icons/react';
import { shareTarget, ShareGlyph, type Target } from '@/components/InstallGuide';
import g from './guide.module.css';

const GUIDE_KEY = 'splash.v3.guide';

/**
 * The install coach, Splash's version of v2's guide overlay. Raised only when
 * the invite hands off here (iOS saves the URL on screen, so the gesture has
 * to happen on the Home, not on the invite). A white card at the edge of the
 * screen nearest the control, an arrow at the control itself, two steps, and
 * Got it. It shows once and clears the hand off.
 */
export default function Guide() {
  const [target, setTarget] = useState<Target | null>(null);

  useEffect(() => {
    let asked = false;
    try {
      asked = window.sessionStorage.getItem(GUIDE_KEY) === '1';
      window.sessionStorage.removeItem(GUIDE_KEY);
    } catch {
      asked = false;
    }
    if (asked) setTarget(shareTarget());
  }, []);

  if (!target) return null;
  const top = target.aim === 'top-right';
  return (
    <div className={g.scrim} role="dialog" aria-label="Add Splash to your home screen" onClick={() => setTarget(null)}>
      <div className={`${g.card} ${top ? g.atTop : g.atBottom}`} onClick={(e) => e.stopPropagation()}>
        <ol className={g.steps}>
          <li>
            <span className={g.n}>1</span>
            <span>
              Tap {target.control === 'the Share button' ? <ShareGlyph /> : null} {target.control}
            </span>
          </li>
          <li>
            <span className={g.n}>2</span>
            <span>Pick Add to Home Screen</span>
          </li>
        </ol>
        <button type="button" className={g.done} onClick={() => setTarget(null)}>
          Got it
        </button>
      </div>
      <span className={`${g.arrow} ${g[target.aim.replace('-', '_') as 'bottom_center']}`} aria-hidden>
        {top ? <ArrowUpRight weight="bold" /> : <ArrowDown weight="bold" />}
      </span>
    </div>
  );
}
