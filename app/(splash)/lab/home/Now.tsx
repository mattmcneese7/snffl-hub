'use client';

import Link from 'next/link';
import { ViewTransition } from 'react';
import { motion } from 'motion/react';
import { CaretRight } from '@phosphor-icons/react';
import Rolling from '../kit/Rolling';
import { SPRING } from '../kit/motion';
import { gameFor, useLive } from '../kit/useLive';
import type { LabGame, LabLive, LabSide } from '../kit/liveFeed';
import Icon from '../../home/Icons';
import w from '../../home/widgets.module.css';
import h from './home.module.css';

export type Upcoming = {
  live: boolean;
  title: string;
  when: string;
  games: { id: string; away: string; home: string; awayLogo: string; homeLogo: string }[];
  starters: number;
  names: string[];
};

const pct = (n: number) => `${Math.round(n * 100)}%`;
const list = (names: string[]) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`);

/** "4 league starters play: Puka Nacua, Bijan Robinson and 2 more." */
function startersLine(u: Upcoming): string {
  if (!u.starters) return 'No league starters play.';
  const more = u.starters - u.names.length;
  const names = more > 0 ? [...u.names, `${more} more`] : u.names;
  const said = names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${u.starters} league starter${u.starters === 1 ? ' plays' : 's play'}: ${said}.`;
}

/** What it takes, in one sentence, from the live numbers. */
export function whatItTakes(g: LabGame): string {
  const [a, b] = [g.away, g.home];
  if (g.status === 'final') {
    const [win, lose] = a.points >= b.points ? [a, b] : [b, a];
    return `${win.firstName} beat ${lose.firstName} by ${(win.points - lose.points).toFixed(2)}.`;
  }
  const left = (s: LabSide) => s.starters.filter((p) => p.gameState === 'pre' || p.gameState === 'in');
  const [lead, trail] = a.expected >= b.expected ? [a, b] : [b, a];
  const trailLeft = left(trail);
  const leadLeft = left(lead);
  if (!trailLeft.length && !leadLeft.length) return `${a.points >= b.points ? a.firstName : b.firstName} wins it once the stats settle.`;
  if (!trailLeft.length) {
    if (lead.points > trail.points) return `${lead.firstName} has it won. ${trail.firstName} has nobody left to play.`;
    return `${trail.firstName} is done at ${trail.points.toFixed(2)}. ${lead.firstName} needs ${(trail.points - lead.points + 0.01).toFixed(2)} more from ${list(leadLeft.map((p) => p.name))}.`;
  }
  const need = Math.max(0, lead.expected - trail.points);
  return `${trail.firstName} needs ${need.toFixed(2)} more from ${list(trailLeft.map((p) => p.name))} to pass ${lead.firstName}'s projected ${lead.expected.toFixed(2)}.`;
}

function Face({ s, size = 44 }: { s: LabSide; size?: number }) {
  return (
    <span className={h.face} style={{ width: size, height: size, ['--mgr' as string]: s.color ?? '#c9dcfa' }}>
      {s.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.avatarUrl} alt="" />
      ) : null}
    </span>
  );
}

/** A game as a compact live score card, for the rail. */
function Mini({ g }: { g: LabGame }) {
  return (
    <Link href={`/lab/live/${g.matchupId}`} className={h.mini}>
      <ViewTransition name={`matchup-${g.matchupId}`}>
        <span className={h.miniScores}>
          {[g.away, g.home].map((s) => {
            const lead = s.points > (s === g.away ? g.home.points : g.away.points);
            return (
              <span key={s.rosterId} className={h.miniRow}>
                <Face s={s} size={24} />
                <span className={h.miniName}>{s.firstName}</span>
                <Rolling className={`${h.miniPts} ${lead ? h.lead : ''}`} value={s.points} />
              </span>
            );
          })}
        </span>
      </ViewTransition>
      <span className={h.miniFoot}>
        <span className={h.miniTrack}>
          <motion.span animate={{ width: pct(g.away.winProb) }} transition={SPRING.roll} />
        </span>
        <span>{g.status === 'final' ? 'Final' : g.inPlay ? 'In play' : `${g.away.yetToPlay + g.home.yetToPlay} to play`}</span>
      </span>
    </Link>
  );
}

/**
 * Now: the top of Home, the part that changes through a game day. What is
 * on or next and how many of the league's starters are in it; then your game,
 * live, with the chances and what it takes; then every other game.
 */
export default function Now({ week, mine, initial, upcoming }: { week: number; mine: number | null; initial: LabLive; upcoming: Upcoming | null }) {
  const data = useLive(week, undefined, initial) ?? initial;
  const pick = gameFor(data, mine);
  if (!pick) return null;
  const { game, me } = pick;
  const [left, right] = me === 'home' ? [game.home, game.away] : [game.away, game.home];
  const others = data.games.filter((g) => g.matchupId !== game.matchupId).sort((a, b) => Number(b.inPlay) - Number(a.inPlay) || Math.abs(a.away.winProb - 0.5) - Math.abs(b.away.winProb - 0.5));

  return (
    <div className={w.grid}>
      {upcoming ? (
        <section className={`${w.widget} ${w.l} ${h.next}`}>
          <div className={w.head}>
            <Icon name="tv" className={w.headIcon} />
            <span className={w.title}>{upcoming.title}</span>
            {upcoming.live ? <span className={h.onDot} aria-label="Live" /> : null}
          </div>
          <div className={h.slate}>
            {upcoming.games.map((g) => (
              <span key={g.id} className={h.slateGame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.awayLogo} alt="" />
                <span>
                  {g.away} at {g.home}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.homeLogo} alt="" />
              </span>
            ))}
          </div>
          <p className={h.nextLine}>
            {upcoming.when}. {startersLine(upcoming)}
          </p>
        </section>
      ) : null}

      <section className={`${w.widget} ${w.l} ${h.game}`} data-island-anchor>
        <div className={w.head}>
          <Icon name="football" className={w.headIcon} />
          <span className={w.title}>{me ? 'Your game' : game.inPlay ? 'Closest game on now' : 'Closest game'}</span>
          <Link href={`/lab/live/${game.matchupId}`} className={w.more}>
            Gamecast
            <CaretRight weight="bold" className={w.caret} aria-hidden />
          </Link>
        </div>
        <Link href={`/lab/live/${game.matchupId}`} className={h.gameLink}>
          <ViewTransition name={`matchup-${game.matchupId}`}>
            <span className={h.sides}>
              {[left, right].map((s, i) => {
                const lead = s.points > (i ? left.points : right.points);
                return (
                  <span key={s.rosterId} className={`${h.side} ${i ? h.sideR : ''}`}>
                    <Face s={s} />
                    <b>{s.firstName}</b>
                    <span className={h.team}>{s.team}</span>
                    <Rolling className={`${h.big} ${lead ? h.lead : ''}`} value={s.points} />
                    <span className={h.proj}>Projected {s.expected.toFixed(2)}</span>
                  </span>
                );
              })}
            </span>
          </ViewTransition>
        </Link>
        <div className={h.wp} aria-label={`Win chance: ${left.firstName} ${pct(left.winProb)}, ${right.firstName} ${pct(right.winProb)}`}>
          <b>{pct(left.winProb)}</b>
          <span className={h.wpTrack}>
            <motion.span className={h.wpFill} animate={{ width: pct(left.winProb) }} transition={SPRING.roll} />
          </span>
          <b>{pct(right.winProb)}</b>
        </div>
        <p className={h.takes}>{whatItTakes(game)}</p>
        <Link href={`/lab/rivals?a=${left.rosterId}&b=${right.rosterId}`} className={h.rival}>
          {left.firstName} and {right.firstName}, side by side
          <CaretRight weight="bold" aria-hidden />
        </Link>
      </section>

      <section className={`${w.widget} ${w.l}`}>
        <div className={w.head}>
          <Icon name="ranking" className={w.headIcon} />
          <span className={w.title}>Every game</span>
          <Link href="/lab/live" className={w.more}>
            All
            <CaretRight weight="bold" className={w.caret} aria-hidden />
          </Link>
        </div>
        <div className={h.rail}>
          {others.map((g) => (
            <Mini key={g.matchupId} g={g} />
          ))}
        </div>
      </section>
    </div>
  );
}
