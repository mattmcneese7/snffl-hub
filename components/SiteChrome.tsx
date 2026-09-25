'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Football,
  FootballHelmet,
  MonitorPlay,
  NewspaperClipping,
  Strategy,
  type IconWeight,
} from '@phosphor-icons/react';

/** Parts rather than one string, so scores can read differently to names. */
export type TickerPart = { text: string; kind: 'team' | 'score' | 'link' | 'logo'; src?: string };
type TickerItem = { id: string; parts: TickerPart[]; detail?: string };

type SiteChromeProps = {
  section: string;
  sub?: string;
  week: number;
  leagueTicker?: TickerItem[];
  nflTicker?: TickerItem[];
};

/**
 * Two helmets meeting, for the Scoreboard.
 *
 * Built from the same Phosphor helmet the tab already used rather than drawn
 * by hand, so it carries the set's own weights and corners: one helmet facing
 * right, one mirrored to face it, overlapping where they meet. A single
 * helmet said football; two of them say a game between two teams, which is
 * what the tab opens.
 */
function HelmetClash({ weight, className }: { weight?: IconWeight; className?: string }) {
  return (
    <span className={`snffl-clash${className ? ` ${className}` : ''}`} aria-hidden>
      <FootballHelmet weight={weight} />
      <FootballHelmet weight={weight} className="snffl-clash-away" />
    </span>
  );
}

/** What a tab needs of an icon, which both Phosphor's and ours satisfy. */
type TabIcon = (props: { weight?: IconWeight; className?: string }) => React.ReactNode;

/* Four labelled tabs, two either side of the mark, which is Home. */
const TABS: { label: string; href: string; Icon: TabIcon }[] = [
  { label: 'Scoreboard', href: '/matchups', Icon: HelmetClash },
  { label: 'Feed', href: '/feed', Icon: MonitorPlay },
  { label: 'The Rag', href: '/rag', Icon: NewspaperClipping },
  { label: 'More', href: '/more', Icon: Strategy },
];

function Tab({
  tab,
  pathname,
}: {
  tab: { label: string; href: string; Icon: TabIcon };
  pathname: string;
}) {
  const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
  return (
    <Link href={tab.href} className={`snffl-tab${active ? ' snffl-tab-active' : ''}`}>
      <tab.Icon weight={active ? 'fill' : 'duotone'} className="snffl-tab-icon" />
      <span>{tab.label}</span>
    </Link>
  );
}

/* The desktop bar still names every destination, Home included. */
const DESKTOP_TABS: { label: string; href: string; Icon: TabIcon }[] = [
  { label: 'Home', href: '/', Icon: Football },
  ...TABS,
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

/**
 * Pixels per second for the crawl. A fixed duration made the speed depend on
 * how much was in the rail: sixteen NFL games with logos ran several times
 * faster than the idea of a crawl allows. Measuring the rail and deriving the
 * duration keeps every ticker at the same readable pace.
 */
const CRAWL_SPEED = 32;

function Ticker({ tag, items, variant }: { tag: string; items: TickerItem[]; variant: 'league' | 'nfl' }) {
  const track = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      // The content is doubled for a seamless loop, so one pass is half.
      const distance = el.scrollWidth / 2;
      if (distance > 0) setDuration(Math.max(20, distance / CRAWL_SPEED));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length]);

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
      {/* The crawl runs inside its own clipped window, so text passing under
          the tag stops at the tag's edge instead of showing beside it. */}
      <div className="snffl-ticker-window">
        <div
          className="snffl-ticker-track"
          ref={track}
          style={duration ? { animationDuration: `${duration.toFixed(1)}s` } : undefined}
        >
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
                {item.parts.map((part, j) =>
                  part.kind === 'logo' ? (
                    part.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="snffl-ticker-logo" src={part.src} alt="" key={j} loading="lazy" />
                    ) : null
                  ) : (
                    <span className={`snffl-ticker-${part.kind}`} key={j}>
                      {part.text}
                    </span>
                  )
                )}
                {item.detail ? <span className="snffl-ticker-item-status">{item.detail}</span> : null}
              </span>
              <span className="snffl-ticker-divider" aria-hidden>
                |
              </span>
            </span>
          ))}
        </div>
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
      {/* One pinned bar: where you are on the left, the wordmark in the middle,
          the week on the right. It replaced a separate section strip, which
          spent a whole band of the screen on two words. Theme and alerts live
          in Settings. */}
      <nav className="snffl-desktop-nav">
        {/* The mark and the name. This was an SVG that drew the letters
            S N F F L as custom paths, with water sloshing inside them: a nice
            piece of work for a name the app no longer has. Redrawing six new
            letterforms by hand would be worse than setting them, so the name
            is set in the display face the headlines already use, beside the
            mark that is the brand everywhere else in the app. */}
        <span className="snffl-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark-v4-128.png" alt="" />
          SQUIRT
        </span>
        <div className="snffl-desktop-nav-links">
          {DESKTOP_TABS.map(({ label, href }) => {
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
        <span className="snffl-desktop-nav-week">
          {sub ? <span className="snffl-header-section-sub">{sub}</span> : null}
          <span className="snffl-week-tag">
            <span>WEEK {week}</span>
          </span>
        </span>
      </nav>

      {/* Scores at the top, navigation at the bottom. Removing the header left
          the top of the screen empty, and a crawl is the one thing that wants
          to be glanced at rather than reached for. It also gives the mark room
          to rise out of the bar below without the two colliding. */}
      <div className="snffl-ticker-stack">
        <span className="snffl-frost" aria-hidden />
        <Ticker tag="LEAGUE" items={leagueTicker} variant="league" />
        <Ticker tag="NFL" items={nflTicker} variant="nfl" />
      </div>

      <div className="snffl-dock">
        {/* The bar's glass, clipped to its own shape. It is a defined object
            now rather than a wash that fades into the page, so it needs one
            surface with an edge instead of a ramp. Its own element because the
            glass is clipped to the rounded rectangle while the mark above it
            has to break out of it. */}
        <span className="snffl-frost" aria-hidden />
        {/* Two tabs, the mark, two tabs. The mark is Home and the app's one
            raised control, which is where the opening animation now lands: the
            logo ends its flight on the thing you press rather than on a
            decoration at the top of a screen nobody looks at twice. */}
        <nav className="snffl-tabbar">
          {TABS.slice(0, 2).map((tab) => (
            <Tab key={tab.label} tab={tab} pathname={pathname} />
          ))}

          <Link
            href="/"
            id="snffl-app-mark"
            className={`snffl-app-mark${pathname === '/' ? ' snffl-app-mark-on' : ''}`}
            aria-label="Home"
          >
            {/* Just the mark. The week used to hang under it as this button's
                label, which spent a slot on a number the page itself always
                states and left the one round thing on the bar carrying a
                caption nothing else had. The button is Home; the logo says
                so. */}
            <span className="snffl-app-mark-disc">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark-v4-128.png" alt="" />
            </span>
          </Link>

          {TABS.slice(2).map((tab) => (
            <Tab key={tab.label} tab={tab} pathname={pathname} />
          ))}
        </nav>
      </div>
    </>
  );
}
