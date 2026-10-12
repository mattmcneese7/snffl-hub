'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, DotsThree, Football, ListNumbers, Newspaper, PlayCircle, Sparkle, type Icon } from '@phosphor-icons/react';
import { MarkDropRefined } from './marks';
import SetIcon, { type IconName } from './home/Icons';
import styles from './menus.module.css';

/**
 * The menu, at the reference clip's own proportions. Measured from the clip,
 * against the bar's height H: names and icons about a third of H; the
 * selection pill sits inside with an eighth of H clear above and below and
 * about half of H either side of its contents; neighboring items stand about
 * 1.2 H apart. Four named items at those proportions need a bar roughly eleven
 * times as wide as it is tall, wider than a phone, so each attempt gives up
 * something else instead of squeezing the spacing:
 *
 *   split   three in the bar, More as its own round button beside it
 *   scroll  all five at full proportion, the bar scrolling sideways under a fade
 *   names   four names and no icons, which fit at full proportion
 *
 * Selection: Pool's powder blue as the clip's pill measured it, a crisp pill
 * of one flat color softened by a white glow along the inside of its edge;
 * it stretches as it travels, its leading edge first. Every name always shows; a pressed item grays.
 * Home is the league's mark, A1, plain black. On the bench items only select.
 */

type Item = { label: string; icon: ReactNode };

const ph = (I: Icon) => <I className={styles.icon} weight="fill" aria-hidden />;
const markIcon = (m: ReactNode) => <span className={styles.icon}>{m}</span>;

const HOME: Item = { label: 'Home', icon: markIcon(<MarkDropRefined />) };
const SCORES: Item = { label: 'Scores', icon: ph(Football) };
const FEED: Item = { label: 'Feed', icon: ph(PlayCircle) };
const RAG: Item = { label: 'Rag', icon: ph(Newspaper) };
const SWAMI: Item = { label: 'Swami', icon: ph(Sparkle) };
const STANDINGS: Item = { label: 'Standings', icon: ph(ListNumbers) };
const MORE: Item = { label: 'More', icon: ph(DotsThree) };

const LEAD = 240; // ms, the edge in the direction of travel
const TRAIL = 420; // ms, the edge that follows

function Bar({
  items,
  variant,
  iconless = false,
  after,
}: {
  items: Item[];
  variant: 'split' | 'scroll' | 'names' | 'plain';
  iconless?: boolean;
  after?: ReactNode;
}) {
  const [on, setOn] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [moving, setMoving] = useState(false);
  const [edges, setEdges] = useState<{ l: number; w: number; t: number; h: number } | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    const place = () => {
      const el = refs.current[on];
      // Cut 2px past the item all round, which leaves the clip's clear band,
      // about 8% of the bar, above and below and at the bar's ends.
      if (el) setEdges({ l: el.offsetLeft - 2, w: el.offsetWidth + 4, t: el.offsetTop - 2, h: el.offsetHeight + 4 });
    };
    place();
    window.addEventListener('resize', place);
    document.fonts?.ready.then(place);
    return () => window.removeEventListener('resize', place);
  }, [on]);

  const choose = (i: number) => {
    if (i === on) return;
    setDir(i > on ? 1 : -1);
    setMoving(true);
    setOn(i);
    window.setTimeout(() => setMoving(false), TRAIL);
  };

  // Left and right edges as clip insets from the track, so each can move at
  // its own pace: moving right, the right edge leads; moving left, the left.
  const leftMs = dir === 1 ? TRAIL : LEAD;
  const rightMs = dir === 1 ? LEAD : TRAIL;

  return (
    <div className={`${styles.dock} ${styles[variant]}`}>
      <nav className={styles.bar} aria-label="Sections">
        <div className={styles.track}>
          {edges ? (
            <span
              className={`${styles.pill} ${moving ? styles.moving : ''}`}
              style={
                {
                  '--l': `${edges.l}px`,
                  '--r': `${edges.l + edges.w}px`,
                  top: edges.t,
                  height: edges.h,
                  transitionDuration: `${leftMs}ms, ${rightMs}ms, 200ms`,
                } as CSSProperties
              }
              aria-hidden
            />
          ) : null}
          {items.map((it, i) => (
            <button
              key={it.label}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              className={`${styles.item} ${i === on ? styles.on : ''}`}
              aria-pressed={i === on}
              onClick={() => choose(i)}
            >
              {iconless ? null : it.icon}
              <span className={styles.label}>{it.label}</span>
            </button>
          ))}
        </div>
      </nav>
      {after}
    </div>
  );
}

/** 1. Three in the bar at full proportion, More as its own round button. */
export function MenuSplit() {
  return (
    <Bar
      items={[HOME, SCORES, RAG]}
      variant="split"
      after={
        <button type="button" className={styles.round} aria-label="More">
          <DotsThree className={styles.roundIcon} weight="bold" aria-hidden />
        </button>
      }
    />
  );
}
/** 2. All five at full proportion; the bar scrolls sideways. */
export function MenuScroll() {
  return <Bar items={[HOME, SCORES, FEED, RAG, SWAMI, MORE]} variant="scroll" />;
}
/** 3. Four names, no icons, at full proportion. */
export function MenuNames() {
  return <Bar items={[HOME, SCORES, RAG, MORE]} variant="names" iconless />;
}

/* ---------- 2. Marker: no bar, the highlighter is the selection ---------- */

const NAMES = ['Home', 'Scores', 'Feed', 'Rag', 'More'];

/**
 * Names alone, sitting on the page like a masthead. The chosen one gets the
 * brand's lime highlighter, drawn in from the left like a marker stroke each
 * time it is chosen; the others stay plain ink.
 */
export function MenuMarker() {
  const [on, setOn] = useState(0);
  return (
    <nav className={styles.marker} aria-label="Sections">
      {NAMES.map((n, i) => (
        <button
          key={n}
          type="button"
          className={`${styles.mItem} ${i === on ? styles.mOn : ''}`}
          aria-pressed={i === on}
          onClick={() => setOn(i)}
        >
          {/* Keyed to the selection, so the stroke draws afresh each time. */}
          {i === on ? <span key={`stroke-${on}`} className={styles.stroke} aria-hidden /> : null}
          <span className={styles.mLabel}>{n}</span>
        </button>
      ))}
    </nav>
  );
}

/* ---------- 3. Drop dock: the league's drop is the selection ---------- */

const DOCK: Item[] = [HOME, SCORES, FEED, RAG, MORE];

/**
 * A frosted dock, icons over names. The chosen tab turns deep blue and the
 * league's drop sits under it as the marker; choosing another, the drop hops
 * across to it in a small arc.
 */
export function MenuDropDock() {
  const [on, setOn] = useState(0);
  const [hop, setHop] = useState(0);
  return (
    <nav className={styles.dockBar} aria-label="Sections">
      {DOCK.map((it, i) => (
        <button
          key={it.label}
          type="button"
          className={`${styles.dItem} ${i === on ? styles.dOn : ''}`}
          aria-pressed={i === on}
          onClick={() => {
            if (i === on) return;
            setOn(i);
            setHop((h) => h + 1);
          }}
        >
          {it.icon}
          <span className={styles.dLabel}>{it.label}</span>
        </button>
      ))}
      <span
        className={styles.dropTrack}
        style={{ transform: `translateX(${on * 100}%)` } as CSSProperties}
        aria-hidden
      >
        <svg key={hop} viewBox="0 0 64 64" className={styles.drop}>
          <path d="M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z" />
        </svg>
      </span>
    </nav>
  );
}

/* ---------- Marker on the scrolling bar (Matt's pick) ---------- */

// Home is a house here: the name and mark now sit above the menu.
/** An icon from the Splash set, in the menu's frame. */
const set = (name: IconName) => (
  <span className={`${styles.icon} ${styles.setIcon}`}>
    <SetIcon name={name} />
  </span>
);
// In the order the Home tells the week: the Rag leads, then the scores, the
// Feed, the table; Swami has no widget on the Home, so it sits last before
// More.
// Each named exactly as its page heads itself, with the same icon its widget
// carries on the Home: The Rag, Scoreboard, The Feed, Standings, The Swami.
const ALL: Item[] = [
  { label: 'Home', icon: set('house') },
  { label: 'The Rag', icon: set('newspaper') },
  { label: 'Scoreboard', icon: set('football') },
  { label: 'The Feed', icon: set('megaphone') },
  { label: 'Standings', icon: set('ranking') },
  { label: 'The Swami', icon: set('genie') },
  { label: 'More', icon: set('more') },
];

/**
 * The white bar with every section at full proportion, scrolling sideways,
 * and the Marker selection: a powder blue marker stroke drawn in under the
 * chosen name, which turns bold, its icon deep blue, and which scrolls itself
 * to the middle. (Selection is the soft blue's job in Pool; the lime is kept
 * for emphasis.) The bar
 * fades at whichever edge has more to show.
 */
export function MenuMarkerScroll({ markHome = false }: { markHome?: boolean } = {}) {
  const items: Item[] = markHome ? [{ label: 'Home', icon: markIcon(<MarkDropRefined />) }, ...ALL.slice(1)] : ALL;
  const [on, setOn] = useState(0);
  const [ends, setEnds] = useState({ left: false, right: true });
  // The track scrolls inside the pill; the pill itself never moves or fades.
  const bar = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const measure = () => {
    const el = bar.current;
    if (!el) return;
    setEnds({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  };
  useLayoutEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <nav className={styles.mScroll} aria-label="Sections">
      <div
        ref={bar}
        className={`${styles.msTrack} ${ends.left ? styles.fadeLeft : ''} ${ends.right ? styles.fadeRight : ''}`}
        onScroll={measure}
      >
      {items.map((it, i) => (
        <button
          key={it.label}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          className={`${styles.msItem} ${i === on ? styles.mOn : ''}`}
          aria-pressed={i === on}
          onClick={() => {
            setOn(i);
            // Scroll the bar alone to center the choice, never the page.
            const el = refs.current[i];
            const b = bar.current;
            if (el && b) b.scrollTo({ left: el.offsetLeft - (b.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' });
          }}
        >
          {it.icon}
          <span className={styles.msName}>
            {i === on ? <span key={`stroke-${on}`} className={styles.stroke} aria-hidden /> : null}
            <span className={styles.mLabel}>{it.label}</span>
          </span>
        </button>
      ))}
      </div>
    </nav>
  );
}

export const MenuReference = MenuMarkerScroll;
/** The reference bar with a given mark, in plain black, as Home. */
export function MenuWithMark({ mark }: { mark: ReactNode }) {
  return <Bar items={[{ ...HOME, icon: markIcon(mark) }, SCORES, RAG]} variant="split" />;
}

/** The v3 sections, in the Home's order, with where each one lives. */
export const SECTIONS = [
  { key: 'home', label: 'Home', icon: 'house', href: '/' },
  { key: 'rag', label: 'The Rag', icon: 'newspaper', href: '/rag' },
  { key: 'scoreboard', label: 'Scoreboard', icon: 'football', href: '/scoreboard' },
  { key: 'feed', label: 'The Feed', icon: 'megaphone', href: '/feed' },
  { key: 'standings', label: 'Standings', icon: 'ranking', href: '/standings' },
  { key: 'swami', label: 'The Swami', icon: 'genie', href: '/swami' },
  { key: 'more', label: 'More', icon: 'more', href: '/more' },
] as const;
export type SectionKey = (typeof SECTIONS)[number]['key'];

/**
 * The menu that navigates: the same bar as the Home's, every item a link,
 * the current section marked with the powder stroke and its icon filled.
 * On arrival the bar scrolls itself (never the page) so the current section
 * sits in view.
 */
/** Set once the menu has shown a device that it scrolls. */
const HINT_KEY = 'splash.menuHint';

export function MenuNav({ active }: { active: SectionKey }) {
  const bar = useRef<HTMLDivElement>(null);
  const on = useRef<HTMLAnchorElement>(null);
  const [ends, setEnds] = useState({ left: false, right: true });
  const measure = () => {
    const el = bar.current;
    if (!el) return;
    setEnds({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  };
  useLayoutEffect(() => {
    const b = bar.current;
    const el = on.current;
    if (b && el && active !== 'home') b.scrollLeft = el.offsetLeft - (b.clientWidth - el.offsetWidth) / 2;
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active]);

  // First visit on this device: the bar glides a little to the side and
  // back, and a tag says it scrolls. Once, then never again.
  const [hint, setHint] = useState(false);
  useEffect(() => {
    const b = bar.current;
    if (!b || b.scrollWidth <= b.clientWidth + 2) return;
    let seen = true;
    try {
      seen = localStorage.getItem(HINT_KEY) === '1';
    } catch {
      return;
    }
    if (seen) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers: number[] = [];
    const start = b.scrollLeft;
    const play = () => {
      timers.push(
        window.setTimeout(() => {
          setHint(true);
          if (!still) b.scrollTo({ left: start + 64, behavior: 'smooth' });
        }, 600),
      );
      if (!still) timers.push(window.setTimeout(() => b.scrollTo({ left: start, behavior: 'smooth' }), 1500));
      timers.push(
        window.setTimeout(() => {
          setHint(false);
          try {
            localStorage.setItem(HINT_KEY, '1');
          } catch {
            // A private window: the hint can show again, which is harmless.
          }
        }, 4000),
      );
    };
    // After the intro, and after the week's chug if it is popping up.
    const root = document.documentElement;
    const onChugClosed = () => play();
    timers.push(
      window.setTimeout(() => {
        if (root.dataset.chugPending) window.addEventListener('splash:chug-closed', onChugClosed, { once: true });
        else play();
      }, root.dataset.intro === 'running' ? 2900 : 1200),
    );
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('splash:chug-closed', onChugClosed);
    };
  }, []);

  return (
    <nav className={styles.mScroll} aria-label="Sections">
      <span className={`${styles.hint} ${hint ? styles.hintOn : ''}`} aria-hidden>
        Swipe for more
        <ArrowRight weight="bold" />
      </span>
      <div ref={bar} className={`${styles.msTrack} ${ends.left ? styles.fadeLeft : ''} ${ends.right ? styles.fadeRight : ''}`} onScroll={measure}>
        {SECTIONS.map((it) => {
          const current = it.key === active;
          return (
            <Link
              key={it.key}
              ref={current ? on : undefined}
              href={it.href}
              className={`${styles.msItem} ${current ? styles.mOn : ''}`}
              aria-current={current ? 'page' : undefined}
            >
              {set(it.icon)}
              <span className={styles.msName}>
                {current ? <span className={styles.stroke} aria-hidden /> : null}
                <span className={styles.mLabel}>{it.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
