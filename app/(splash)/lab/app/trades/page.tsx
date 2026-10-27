import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getTrades, type Trade } from '@/lib/trades';
import { getV4Data } from '../data';
import Shell from '../Shell';
import XHead from '../modules/Head';
import { TradeRows } from '../modules/TradeCard';
import s from '../v4.module.css';

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
      <XHead icon="swap" word="trades" week={data.week} mine={data.myRoster} />
      <div className={s.title}>
        <h2>Every Trade</h2>
        <span className={s.wk}>
          {trades.length} {trades.length === 1 ? 'trade' : 'trades'}
          {mine != null ? ` · ${yours} yours` : ''}
        </span>
      </div>
      {trades.length ? (
        <div className={s.list}>
          {trades.map((t) => (
            <TradeRows key={t.id} trade={t} mine={mine} />
          ))}
        </div>
      ) : (
        <p className={s.empty}>No trades yet this season.</p>
      )}
    </Shell>
  );
}
