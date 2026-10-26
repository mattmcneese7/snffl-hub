import type { Metadata } from 'next';
import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';
import LabShell from './kit/LabShell';
import Reveal from './kit/Reveal';
import Icon, { type IconName } from '../home/Icons';
import w from '../home/widgets.module.css';
import x from './lab-index.module.css';

export const metadata: Metadata = { title: { absolute: 'Splash 4.0 lab' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const EXPERIENCES: { href: string; icon: IconName; title: string; line: string; uses: string[] }[] = [
  {
    href: '/lab/home',
    icon: 'house',
    title: 'Home, v4',
    line: 'Home rebuilt from these pieces: week stories along the top, what is on next, your game live with what it takes, every game as a rail, and the playoff picture with real odds.',
    uses: ['Story rings', 'Streaming', 'Island hand off', 'Morphing cards'],
  },
  {
    href: '/lab/live',
    icon: 'football',
    title: 'Gameday Live',
    line: 'Every game live, then one game as a gamecast: the win chance across the week, what it takes to win, who is left, and scoring as it happens.',
    uses: ['View Transitions', 'Rolling scores', 'Live polling', 'Bottom sheet'],
  },
  {
    href: '/lab/story',
    icon: 'play',
    title: 'The Week in Stories',
    line: 'Last week as tap-through stories: the top score, the Shart, the closest game, the bench miss. Hold to pause, swipe down to close, share any slide.',
    uses: ['Gestures', 'Timed progress', 'Web Share'],
  },
  {
    href: '/lab/race',
    icon: 'trophy',
    title: 'Playoff Race',
    line: 'Pick the rest of the season and watch the standings reorder: seeds, the playoff line, who has clinched and who is out, magic numbers.',
    uses: ['Layout animation', 'Swipe weeks', 'Saved picks'],
  },
  {
    href: '/lab/rivals',
    icon: 'swap',
    title: 'Rivals',
    line: 'Any two managers side by side: the tale of the tape, all play, best and worst weeks, both seasons on one chart, and their games.',
    uses: ['Animated bars', 'Drawn charts', 'Picker sheet'],
  },
];

const SHELL: { icon: IconName; title: string; line: string }[] = [
  { icon: 'drop', title: 'The island', line: 'Your game rides above the ticker on every page, scores rolling. Tap it and it opens in place.' },
  { icon: 'bell', title: 'Scoring toasts', line: 'When a starter anywhere in the league scores, it drops in from the top. Real scoring only.' },
  { icon: 'binoculars', title: 'Search everything', line: 'Players, managers and pages from one field by the week. On a keyboard, press /.' },
  { icon: 'trending', title: 'A top that gets out of the way', line: 'The lockup fades and the menu rises as you scroll. CSS only.' },
  { icon: 'history', title: 'Pull to refresh', line: 'On Modules: pull down at the top and the data reloads in place.' },
  { icon: 'swap', title: 'Pages that move', line: 'Pages cross fade, and a game card grows into its gamecast instead of the page swapping.' },
];

const RESEARCH: { title: string; points: string[] }[] = [
  {
    title: 'Motion and feel',
    points: [
      'React 19.3 made View Transitions stable, and Next 16 runs them with no setup. A card can become the page it opens. Safari 18.2 and up.',
      'One spring family (snap, glide, roll) for everything that moves, from Motion 14. Scroll rails and swipe actions use native scroll snap, which costs nothing and keeps iOS momentum.',
      'Numbers roll with NumberFlow (about 6 KB): scores, odds, records.',
      'Sections open to their real height with the grid rows technique, which works in Safari. calc-size does not, yet.',
    ],
  },
  {
    title: 'Speed',
    points: [
      'Next 16.3 instant navigation: a prerendered shell paints at once and the data streams in behind a skeleton shaped like it. Partial prefetching on links.',
      'Heavy libraries load on demand (confetti loads on the tap that needs it).',
      'Live data by polling every 20 seconds while a game is on and the page is visible, which Vercel bills less for than open connections.',
    ],
  },
  {
    title: 'What the phone allows',
    points: [
      'Haptics: Android vibrates. iOS has no web haptic API, and the hidden switch trick stopped working in iOS 26.5. The one real iOS haptic is a person flipping a visible system switch, so v4 uses real switches for on and off settings.',
      'iOS 26 ignores theme-color. The toolbar tint now comes from the page background, which is already paper.',
      'Badges on the app icon and push work on iPhone only once Splash is on the Home Screen.',
      'Sharing an image file straight into a chat works in Safari, as long as the image is fetched before the tap.',
    ],
  },
  {
    title: 'Features worth building',
    points: [
      'Win chance as a chart across the week (ESPN shipped this in 2026). The lab rebuilds it from final scores; saving the model every few minutes on Sundays makes it play by play.',
      'Matchup moments: "Bijan, 12 yard touchdown, plus 8.20 for Matt, win chance 41% to 63%". ESPN play by play carries athlete ids for this.',
      'A sticky live matchup (the island), a playoff machine, rivals, story recaps: all in the lab.',
      'Points left on the bench and a best lineup ladder, biggest letdown and most forgotten bench player as weekly awards, a start and sit read before lock, a weekly pick’em among the league on device tokens, reactions on stories, a season wrapped.',
      'League history: the earlier seasons were on ESPN, which now returns private for them. A record book needs a one time import.',
    ],
  },
];

/**
 * The lab: what Splash 4.0 could feel like, built on real league data and
 * kept off the live app. Four experiences, the shell everything sits in, the
 * modules, and the research behind them.
 */
export default function Lab() {
  return (
    <LabShell>
      <header className={x.hero}>
        <h1 className={x.title}>The app, with motion, depth and live data everywhere</h1>
        <p className={x.lede}>Everything here runs on this week&rsquo;s real league data. None of it is in the app yet.</p>
      </header>

      <div className={w.grid}>
        {EXPERIENCES.map((e) => (
          <Link key={e.href} href={e.href} className={`${w.widget} ${w.l} ${x.exp}`}>
            <span className={w.head}>
              <Icon name={e.icon} className={w.headIcon} />
              <span className={w.title}>{e.title}</span>
              <CaretRight weight="bold" className={x.go} aria-hidden />
            </span>
            <span className={x.line}>{e.line}</span>
            <span className={x.uses}>
              {e.uses.map((u) => (
                <span key={u} className={x.use}>
                  {u}
                </span>
              ))}
            </span>
          </Link>
        ))}

        <section className={`${w.widget} ${w.l}`}>
          <div className={w.head}>
            <Icon name="phone" className={w.headIcon} />
            <span className={w.title}>On every page</span>
          </div>
          <ul className={x.shell}>
            {SHELL.map((s) => (
              <li key={s.title}>
                <Icon name={s.icon} className={x.shellIcon} />
                <span>
                  <b>{s.title}</b>
                  {s.line}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <Link href="/lab/modules" className={`${w.widget} ${w.l} ${x.exp}`}>
          <span className={w.head}>
            <Icon name="clipboard" className={w.headIcon} />
            <span className={w.title}>Modules</span>
            <CaretRight weight="bold" className={x.go} aria-hidden />
          </span>
          <span className={x.line}>Each piece on its own: rolling numbers, the sheet, toasts, streaming, folds, rails, swipe actions, menus, the switch, celebrations, image sharing.</span>
        </Link>

        <section className={`${w.widget} ${w.l}`}>
          <div className={w.head}>
            <Icon name="book" className={w.headIcon} />
            <span className={w.title}>Research</span>
          </div>
          <div className={x.research}>
            {RESEARCH.map((r, i) => (
              <Reveal key={r.title} head={<b className={x.rHead}>{r.title}</b>} defaultOpen={i === 0}>
                <ul className={x.points}>
                  {r.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </LabShell>
  );
}
