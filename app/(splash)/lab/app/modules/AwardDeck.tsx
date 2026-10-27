'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Squirt from '../squirt/Squirt';
import { Card, ui } from '../ui';

export type DeckAward = { kind: string; name: string; rosterId: number; team: string; manager: string; detail: string | null; mine: boolean };

/**
 * The week's hardware in one card: Squirt stays put on the left and takes
 * each award's pose as its slide comes to rest beside him. Swipe the slides; tap one to
 * open the winner's page.
 */
export default function AwardDeck({ awards }: { awards: DeckAward[] }) {
  const [at, setAt] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setAt(Math.max(0, Math.min(awards.length - 1, Math.round(el.scrollLeft / el.clientWidth)))));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [awards.length]);

  const go = (i: number) => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: 'smooth' });
  const a = awards[at];

  return (
    <Card className={ui.deck}>
      <div className={ui.deckStage}>
        <Squirt award={a.kind} size={120} label={`Squirt, ${a.name}`} />
      </div>
      <div className={ui.deckSide}>
        <div ref={track} className={ui.deckTrack} role="group" aria-roledescription="carousel" aria-label="This week's awards">
          {awards.map((x, i) => (
            <Link key={x.kind} href={`/lab/app/managers/${x.rosterId}`} className={`${ui.deckSlide} ${x.mine ? ui.deckMine : ''}`} aria-roledescription="slide" aria-label={`${i + 1} of ${awards.length}: ${x.name}, ${x.team}`}>
              <span className={`${ui.label} ${ui.labelGold}`}>{x.name}</span>
              <span className={ui.title}>{x.team}</span>
              <span className={ui.sub}>
                {x.manager}
                {x.detail ? <> &middot; {x.detail}</> : null}
              </span>
            </Link>
          ))}
        </div>
        <div className={ui.dots}>
          {awards.map((x, i) => (
            <button key={x.kind} type="button" aria-label={`Show ${x.name}`} aria-current={i === at ? 'true' : undefined} className={i === at ? ui.dotOn : undefined} onClick={() => go(i)} />
          ))}
          <span className={ui.label}>
            {at + 1} of {awards.length}
          </span>
        </div>
      </div>
    </Card>
  );
}
