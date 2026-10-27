import Link from 'next/link';
import { getTrades, type Trade } from '@/lib/trades';
import { TradeRows } from './TradeCard';
import s from '../v4.module.css';

/** Latest Trade: the newest deal, both sides. Nothing renders before the first trade. */
export default async function LatestTrade({ trade, mine = null }: { trade?: Trade | null; mine?: number | null }) {
  const t = trade !== undefined ? trade : ((await getTrades().catch(() => [] as Trade[]))[0] ?? null);
  if (!t) return null;
  return (
    <section aria-label="Latest trade">
      <div className={s.title}>
        <h2>Latest Trade</h2>
        <Link href="/lab/app/trades">All trades</Link>
      </div>
      <div className={s.list} style={{ marginTop: 8 }}>
        <TradeRows trade={t} mine={mine} />
      </div>
    </section>
  );
}
