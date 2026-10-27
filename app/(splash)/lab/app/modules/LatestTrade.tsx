import { getTrades, type Trade } from '@/lib/trades';
import { TradeRows } from './TradeCard';
import { List, Section } from '../ui';

/** Latest Trade: the newest deal, both sides. Nothing renders before the first trade. */
export default async function LatestTrade({ trade, mine = null }: { trade?: Trade | null; mine?: number | null }) {
  const t = trade !== undefined ? trade : ((await getTrades().catch(() => [] as Trade[]))[0] ?? null);
  if (!t) return null;
  return (
    <Section title="Latest Trade" action={{ href: '/lab/app/trades', label: 'All trades' }}>
      <List>
        <TradeRows trade={t} mine={mine} />
      </List>
    </Section>
  );
}
