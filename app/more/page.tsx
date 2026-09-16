import Link from 'next/link';
import Chrome from '@/components/Chrome';
import { league } from '@/lib/league';

const MENU = [
  { href: '/power-rankings', label: 'Power Rankings', note: 'All 14, ranked and roasted' },
  { href: '/standings', label: 'Standings', note: 'Records, points, playoff line' },
  { href: '/playoffs', label: 'Playoff Tracker', note: 'SNFFL odds from our own simulation' },
  { href: '/chug', label: 'Chug Meter', note: 'Who owes beers, and how many' },
  { href: '/trades', label: 'Trade Tracker', note: 'Every trade this season' },
  { href: '/managers', label: 'Managers', note: 'All 14 teams and their seasons' },
  { href: '/players', label: 'Players', note: 'Every rostered player' },
  { href: '/rules', label: 'Rules', note: 'Scoring, roster, and the chug rules' },
  { href: '/settings', label: 'Settings', note: 'Your team, theme, alerts, install' },
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
