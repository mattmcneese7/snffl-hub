import type { Metadata } from 'next';
import Shell from '../kit/Shell';
import PageHead from '../kit/PageHead';
import LinkList from '../kit/LinkList';
import Widget from '../home/Widget';
import w from '../home/widgets.module.css';
import m from './more.module.css';
import VersionTap from './VersionTap';

export const metadata: Metadata = { title: { absolute: 'More, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * More: everything that is not a tab, grouped the way v2's colors grouped
 * it (your team, the league, the rules), as widgets on the wallpaper.
 */
export default function MorePage() {
  return (
    <Shell active="more">
      <PageHead title="More" />
      <div className={w.grid}>
        <Widget size="m" icon="person" title="You">
          <LinkList
            items={[
              { href: '/my-team', label: 'My Team', note: 'Your lineup, what is wrong with it, your moves', icon: 'jersey' },
              { href: '/settings', label: 'Settings', note: 'Your team, your book, alerts, install', icon: 'gear' },
            ]}
          />
        </Widget>
        <Widget size="m" icon="ranking" title="The league">
          <LinkList
            items={[
              { href: '/standings', label: 'Standings', note: 'The table, the rankings, the odds', icon: 'ranking' },
              { href: '/swami', label: 'The Swami', note: 'Research a lineup: projections, matchups, usage', icon: 'genie' },
              { href: '/insights', label: 'Insights', note: 'Draft value, usage, pickups, trending, luck', icon: 'chart' },
              { href: '/chug', label: 'Chug Meter', note: 'Who owes beers, and how many', icon: 'stein' },
              { href: '/trades', label: 'Trades', note: 'Every trade this season', icon: 'swap' },
              { href: '/trophies', label: 'Trophy case', note: 'Every award, every shelf', icon: 'trophy' },
              { href: '/managers', label: 'Managers', note: 'All 14 teams and their seasons', icon: 'person' },
              { href: '/players', label: 'Players', note: 'Every player, rostered or free', icon: 'binoculars' },
            ]}
          />
        </Widget>
        <Widget size="m" icon="gavel" title="The rules">
          <LinkList items={[{ href: '/rules', label: 'Rules', note: 'Scoring, roster, and the chug rules', icon: 'gavel' }]} />
        </Widget>
      </div>
      <footer className={m.foot}>
        <VersionTap className={m.version}>Splash 3.0</VersionTap>
        <span>
          Genie lamp icon by Lorc,{' '}
          <a href="https://game-icons.net/1x1/lorc/magic-lamp.html" target="_blank" rel="noopener noreferrer">
            game-icons.net
          </a>
          , CC BY 3.0
        </span>
      </footer>
    </Shell>
  );
}
