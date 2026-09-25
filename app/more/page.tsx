import Link from 'next/link';
import {
  BeerStein,
  ChartLineUp,
  Football,
  Gear,
  ListNumbers,
  Scroll,
  Swap,
  Trophy,
  UsersThree,
} from '@phosphor-icons/react/dist/ssr';
import Chrome from '@/components/Chrome';
import { league } from '@/lib/league';

/* Every row leads with a coloured chip, which is the pattern that turns a
   list of links into a menu. The colour groups them: blue is the league's
   standing, green its people, amber its rituals, slate its settings. */
const MENU = [
  { href: '/power-rankings', label: 'Power Rankings', note: 'All 14, ranked and roasted', Icon: ListNumbers, tone: 'blue' },
  { href: '/standings', label: 'Standings', note: 'Records, points, playoff line', Icon: ChartLineUp, tone: 'blue' },
  { href: '/playoffs', label: 'Playoff Tracker', note: 'Odds from our own simulation', Icon: Trophy, tone: 'blue' },
  { href: '/chug', label: 'Chug Meter', note: 'Who owes beers, and how many', Icon: BeerStein, tone: 'amber' },
  { href: '/trades', label: 'Trade Tracker', note: 'Every trade this season', Icon: Swap, tone: 'green' },
  { href: '/managers', label: 'Managers', note: 'All 14 teams and their seasons', Icon: UsersThree, tone: 'green' },
  { href: '/players', label: 'Players', note: 'Every rostered player', Icon: Football, tone: 'green' },
  { href: '/rules', label: 'Rules', note: 'Scoring, roster, and the chug rules', Icon: Scroll, tone: 'slate' },
  { href: '/settings', label: 'Settings', note: 'Your team, alerts, install', Icon: Gear, tone: 'slate' },
];

export default function MorePage() {
  return (
    <>
      <Chrome section="More" />
      <main className="snffl-page">
        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">More</h2>
            <span className="snffl-block-heading-link">{league.name}</span>
          </div>
          <div className="snffl-card">
            {MENU.map((item) => (
              <Link className="snffl-menu-row" href={item.href} key={item.href}>
                <span className={`snffl-icon-chip snffl-icon-chip-${item.tone}`} aria-hidden>
                  <item.Icon weight="fill" />
                </span>
                <span>
                  <span className="snffl-menu-label">{item.label}</span>
                  <span className="snffl-menu-note">{item.note}</span>
                </span>
                <span className="snffl-menu-arrow" aria-hidden>
                  &rsaquo;
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
