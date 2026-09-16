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
  Siren,
  Moon,
  Sun,
} from '@phosphor-icons/react';
import SnfflWordmark from './SnfflWordmark';

type TickerItem = { id: string; label: string; detail?: string };

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

function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const saved = root.dataset.theme;
    setDark(saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next = dark ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('snffl.theme', next);
    } catch {
      // Private browsing can refuse storage. The toggle still works for this visit.
    }
    setDark(!dark);
  };

  return { dark, toggle };
}

// The header shrinks on scroll: wordmark 160px down to about 92px.
function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

function Ticker({ tag, items, variant }: { tag: string; items: TickerItem[]; variant: 'league' | 'nfl' }) {
  const content = items.length
    ? [...items, ...items]
    : [{ id: 'empty', label: variant === 'nfl' ? 'NFL scores appear during game windows' : 'League scores appear on game day' }];

  return (
    <div className={`snffl-ticker-row snffl-ticker-row-${variant}`}>
      <span className={`snffl-ticker-tag snffl-ticker-tag-${variant}`}>{tag}</span>
      <div className="snffl-ticker-track">
        {content.map((item, i) => (
          <span className="snffl-ticker-item" key={`${item.id}-${i}`}>
            <span>{item.label}</span>
            {item.detail ? <span className="snffl-ticker-item-status">{item.detail}</span> : null}
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
  const { dark, toggle } = useTheme();
  const scrolled = useScrolled();
  const pathname = usePathname();
  const ThemeIcon = dark ? Sun : Moon;

  return (
    <>
      <header className={`snffl-header${scrolled ? ' snffl-header-compact' : ''}`}>
        <button className="snffl-header-slot" aria-label="Alerts" type="button">
          <Siren weight="duotone" className="snffl-header-icon" />
        </button>
        <SnfflWordmark className="snffl-wordmark-svg" compact={scrolled} />
        <button className="snffl-header-slot" aria-label="Switch theme" type="button" onClick={toggle}>
          <ThemeIcon weight="duotone" className="snffl-header-icon" />
        </button>
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
        <div className="snffl-desktop-nav-actions">
          <button className="snffl-header-slot" aria-label="Alerts" type="button">
            <Siren weight="duotone" className="snffl-header-icon" />
          </button>
          <button className="snffl-header-slot" aria-label="Switch theme" type="button" onClick={toggle}>
            <ThemeIcon weight="duotone" className="snffl-header-icon" />
          </button>
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
