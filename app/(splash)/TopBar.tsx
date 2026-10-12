'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { FootballHelmet, MonitorPlay, NewspaperClipping, Strategy, type Icon } from '@phosphor-icons/react';
import styles from './topbar.module.css';

/**
 * The top of the app. A small floating bar of the page's glass, centered, with
 * room around it: the league's mark first, which is Home, then four sections
 * as icons. Only the chosen item shows its name, opening into a soft pill of
 * its section's color on the one spring; everything else stays an icon, so
 * the bar never crowds.
 *
 * It sticks to the top, so the cards scroll under it and its glass blurs them.
 * On the bench the items only select; in the app they would be the links.
 */

const SECTIONS: { label: string; hue: string; Icon: Icon }[] = [
  { label: 'Scores', hue: '#2f7fe0', Icon: FootballHelmet },
  { label: 'Feed', hue: '#d98a20', Icon: MonitorPlay },
  { label: 'Rag', hue: '#d6335e', Icon: NewspaperClipping },
  { label: 'More', hue: '#7b5ff0', Icon: Strategy },
];
const HOME_HUE = '#1eae9c';

export default function TopBar({
  glassClass,
  mark,
  sticky = true,
}: {
  glassClass: string;
  mark: ReactNode;
  sticky?: boolean;
}) {
  const [on, setOn] = useState(-1); // -1 is Home, the mark

  return (
    <div className={`${styles.dock} ${sticky ? styles.sticky : ''}`}>
      <nav className={`${styles.bar} ${glassClass}`} aria-label="Sections">
        <button
          type="button"
          className={`${styles.item} ${styles.home} ${on === -1 ? styles.on : ''}`}
          style={{ '--hue': HOME_HUE } as CSSProperties}
          aria-label="Home"
          aria-pressed={on === -1}
          onClick={() => setOn(-1)}
        >
          <span className={styles.mark}>{mark}</span>
        </button>
        {SECTIONS.map((s, i) => (
          <button
            key={s.label}
            type="button"
            className={`${styles.item} ${on === i ? styles.on : ''}`}
            style={{ '--hue': s.hue } as CSSProperties}
            aria-label={s.label}
            aria-pressed={on === i}
            onClick={() => setOn(i)}
          >
            <s.Icon className={styles.icon} weight={on === i ? 'fill' : 'regular'} aria-hidden />
            <span className={styles.label}>{s.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export type TickerGame = { id: number; away: string; awayPts: number; home: string; homePts: number };

/**
 * The ticker, with no box of its own: one line of scores drifting across the
 * ground and fading out at both edges, so it reads as part of the page. A
 * touch stops it so it can be swiped; with reduced motion it stands still and
 * simply scrolls.
 */
export function TickerLine({ games }: { games: TickerGame[] }) {
  const [held, setHeld] = useState(false);
  if (!games.length) return null;
  const row = (key: string) =>
    games.map((g) => {
      const awayUp = g.awayPts >= g.homePts;
      return (
        <span key={`${key}${g.id}`} className={styles.game}>
          <span className={styles.team}>{g.away}</span>
          <b className={awayUp ? styles.up : styles.down}>{g.awayPts.toFixed(2)}</b>
          <b className={awayUp ? styles.down : styles.up}>{g.homePts.toFixed(2)}</b>
          <span className={styles.team}>{g.home}</span>
        </span>
      );
    });
  return (
    <div
      className={`${styles.ticker} ${held ? styles.held : ''}`}
      aria-label="Every other game this week"
      onPointerDown={() => setHeld(true)}
    >
      <div className={styles.track} style={{ '--secs': `${Math.max(28, games.length * 8)}s` } as CSSProperties}>
        {row('a')}
        <span className={styles.copy} aria-hidden>
          {row('b')}
        </span>
      </div>
    </div>
  );
}
