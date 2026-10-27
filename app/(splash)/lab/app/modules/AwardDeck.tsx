'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Squirt from '../squirt/Squirt';
import { Ms } from '../icons';
import { Card, ui } from '../ui';
import d from './AwardDeck.module.css';

export type DeckAward = { kind: string; name: string; rosterId: number; team: string; manager: string; detail: string | null; mine: boolean };

/**
 * The week's hardware, flat on the page: Squirt stays put on the left and
 * takes each award's pose as its slide comes to rest beside him. Swipe the
 * slides or step with the arrows; tap one to open the winner's page.
 */
export default function AwardDeck({ awards }: { awards: DeckAward[] }) {
  const [at, setAt] = useState(0);
  // Squirt takes the pose of the slide that comes to rest, not every slide
  // the track passes on the way there.
  const [rest, setRest] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    let settle = 0;
    const index = () => Math.max(0, Math.min(awards.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setAt(index()));
      window.clearTimeout(settle);
      settle = window.setTimeout(() => setRest(index()), 140);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); window.clearTimeout(settle); };
  }, [awards.length]);

  const go = (i: number) => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: 'smooth' });
  const a = awards[rest];

  return (
    <Card className={ui.deck}>
      <div className={ui.deckStage}>
        <Squirt award={a.kind} size={120} label={`Squirt, ${a.name}`} />
      </div>
      <div className={ui.deckSide}>
        <div ref={track} className={ui.deckTrack} role="group" aria-roledescription="carousel" aria-label="This week's awards">
          {awards.map((x, i) => (
            <Link key={`${x.kind}-${x.rosterId}`} href={`/lab/app/managers/${x.rosterId}`} className={`${ui.deckSlide} ${x.mine ? ui.deckMine : ''}`} aria-roledescription="slide" aria-label={`${i + 1} of ${awards.length}: ${x.name}, ${x.team}`}>
              <span className={`${ui.label} ${x.kind === 'motw' ? ui.labelGold : ''}`}>{x.name}</span>
              <span className={ui.title}>{x.team}</span>
              <span className={ui.sub}>
                {x.manager}
                {x.detail ? <> &middot; {x.detail}</> : null}
              </span>
            </Link>
          ))}
        </div>
        <div className={d.nav}>
          <button type="button" className={ui.chip} aria-label="Previous award" onClick={() => go((at - 1 + awards.length) % awards.length)}>
            <Ms name="chevronLeft" size={20} />
          </button>
          <button type="button" className={`${ui.chip} ${d.next}`} aria-label="Next award" onClick={() => go((at + 1) % awards.length)}>
            <Ms name="chevronLeft" size={20} />
          </button>
          <span className={ui.label} aria-live="polite">
            {at + 1} of {awards.length}
          </span>
        </div>
      </div>
    </Card>
  );
}
