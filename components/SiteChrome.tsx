'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Football,
  FootballHelmet,
  MonitorPlay,
  NewspaperClipping,
  Strategy,
} from '@phosphor-icons/react';
import SnfflWordmark from './SnfflWordmark';

/** Parts rather than one string, so scores can read differently to names. */
export type TickerPart = { text: string; kind: 'team' | 'score' | 'link' };
type TickerItem = { id: string; parts: TickerPart[]; detail?: string };

type SiteChromeProps = {
  section: string;
  sub?: string;
  week: number;
  leagueTicker?: TickerItem[];
  nflTicker?: TickerItem[];
};

const TABS = [
  { label: 'Home', href: '/', Icon: Football },
  { label: 'Matchups', href: '/matchups', Icon: FootballHelmet },
  { label: 'Feed', href: '/feed', Icon: MonitorPlay },
  { label: 'The Rag', href: '/rag', Icon: NewspaperClipping },
  { label: 'More', href: '/more', Icon: Strategy },
];

// The header shrinks on scroll: wordmark 160px down to about 92px.
function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  // The strip and ticker stack are pinned below the header and cannot read its
  // height, so the state goes on <html> for their sticky offsets to follow.
  useEffect(() => {
    document.documentElement.classList.toggle('snffl-scrolled', scrolled);
  }, [scrolled]);

  return scrolled;
}

function Ticker({ tag, items, variant }: { tag: string; items: TickerItem[]; variant: 'league' | 'nfl' }) {
  const content: TickerItem[] = items.length
    ? [...items, ...items]
    : [
        {
          id: 'empty',
          parts: [
            {
              text:
                variant === 'nfl'
                  ? 'NFL scores appear during game windows'
                  : 'League scores appear on game day',
              kind: 'team',
            },
          ],
        },
      ];

  return (
    <div className={`snffl-ticker-row snffl-ticker-row-${variant}`}>
      <span className={`snffl-ticker-tag snffl-ticker-tag-${variant}`}>{tag}</span>
      <div className="snffl-ticker-track">
        {content.map((item, i) => (
          // The second pass exists only so the marquee can loop without a seam.
          // Left readable, a screen reader announces the entire scoreboard and
          // then announces all of it again.
          <span
            className="snffl-ticker-entry"
            key={`${item.id}-${i}`}
            aria-hidden={items.length > 0 && i >= items.length ? true : undefined}
          >
            <span className="snffl-ticker-item">
              {item.parts.map((part, j) => (
                <span className={`snffl-ticker-${part.kind}`} key={j}>
                  {part.text}
                </span>
              ))}
              {item.detail ? <span className="snffl-ticker-item-status">{item.detail}</span> : null}
            </span>
            <span className="snffl-ticker-divider" aria-hidden>
              |
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SiteChrome({
  section,
  sub = '',
  week,
  leagueTicker = [],
  nflTicker = [],
}: SiteChromeProps) {
  const scrolled = useScrolled();
  const pathname = usePathname();

  return (
    <>
      <header className={`snffl-header${scrolled ? ' snffl-header-compact' : ''}`}>
        {/* Theme and alerts live in Settings, so the header carries only the
            wordmark. Cropped in the header so the drips do not overhang the section strip. */}
        <SnfflWordmark className="snffl-wordmark-svg" compact={scrolled} crop />
      </header>

      <nav className="snffl-desktop-nav">
        <SnfflWordmark className="snffl-wordmark-svg" />
        <div className="snffl-desktop-nav-links">
          {TABS.map(({ label, href }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={label}
                href={href}
                className={`snffl-desktop-nav-link${active ? ' snffl-desktop-nav-link-active' : ''}`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="snffl-section-strip">
        <div>
          <span className="snffl-section-strip-name">{section}</span>
          {sub ? <span className="snffl-section-strip-sub"> {sub}</span> : null}
        </div>
        <span className="snffl-week-tag">
          <span>WEEK {week}</span>
        </span>
      </div>

      <div className="snffl-ticker-stack">
        <Ticker tag="LEAGUE" items={leagueTicker} variant="league" />
        <Ticker tag="NFL" items={nflTicker} variant="nfl" />
      </div>

      <nav className="snffl-tabbar">
        {TABS.map(({ label, href, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link key={label} href={href} className={`snffl-tab${active ? ' snffl-tab-active' : ''}`}>
              <Icon weight={active ? 'fill' : 'duotone'} className="snffl-tab-icon" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
