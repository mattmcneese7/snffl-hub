import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getTrades, type Trade } from '@/lib/trades';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import { TradeRows } from '../modules/TradeCard';
import { Empty, List, Section, ui } from '../ui';
import l from '../modules/layout.module.css';

export const metadata: Metadata = { title: { absolute: 'Trades, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Every trade this season, newest first, from Sleeper's transactions: the
 * week and date, each team and what it got, picks and FAAB included. No grade
 * until something real grades them.
 */
export default async function V4Trades() {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const [data, trades] = await Promise.all([getV4Data(mine), getTrades().catch(() => [] as Trade[])]);
  const yours = mine != null ? trades.filter((t) => t.sides.some((x) => x.rosterId === mine)).length : 0;
  return (
    <Shell data={data} active="league">
      <SectionHead icon="swap" word="trades" week={data.week} mine={data.myRoster} back={{ href: '/lab/app/league', label: 'League' }} />
      {trades.length ? (
        <Section title="Every Trade">
          <p className={`${ui.sub} ${l.note}`}>
            {trades.length} {trades.length === 1 ? 'trade' : 'trades'} this season{mine != null && yours ? `, ${yours} yours` : ''}
          </p>
          <List>
            {trades.map((t) => (
              <TradeRows key={t.id} trade={t} mine={mine} />
            ))}
          </List>
        </Section>
      ) : (
        <Empty action={{ href: '/lab/app/swami', label: 'Check a trade in Swami' }}>No trades yet this season.</Empty>
      )}
    </Shell>
  );
}
