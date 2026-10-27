import { getTopPerformers, getWeekGames, league, scoredWeek } from '@/lib/league';
import { formatStatLine, getWeekStatLines } from '@/lib/sleeper-live';
import type { Game, LineupSlot } from '@/lib/types';
import { managerOf, shortName, teamOf } from './shared';
import { Face, List, Row, Section } from '../ui';

/**
 * Top Scorers: the week's five best starters across the league, with the box
 * score line and the team that started him. Rows open the player sheet.
 */
export default async function TopScorers({ week, mine = null }: { week?: number; mine?: number | null }) {
  const wk = week ?? (await scoredWeek());
  const [players, games, stats] = await Promise.all([
    getTopPerformers(wk, 5).catch(() => [] as LineupSlot[]),
    getWeekGames(wk).catch(() => [] as Game[]),
    getWeekStatLines(league.state.season, wk).catch(() => ({}) as Record<string, { stats: Record<string, number> }>),
  ]);
  const scored = players.filter((p) => p.points > 0);
  if (!scored.length) return null;
  const owner = new Map<string, number>();
  for (const g of games) for (const side of [g.away, g.home]) for (const p of side.lineup) owner.set(p.id, side.rosterId);
  return (
    <Section title="Top Scorers" label={`Week ${wk} top scorers`} action={{ href: '/lab/app/swami', label: 'Swami' }}>
      <List tap>
        {scored.map((p) => {
          const r = owner.get(p.id);
          const line = formatStatLine(p.position, stats[p.id]?.stats as never);
          return (
            <Row
              key={p.id}
              data={{ player: p.id }}
              lead={<Face id={p.id} team={p.team} defense={p.position === 'DEF'} />}
              title={shortName(p.name, p.position, p.team)}
              strong={r === mine}
              sub={[`${p.position} ${p.team ?? ''}`.trim(), r != null ? `${teamOf(r)}, ${managerOf(r)}` : null, line || null].filter(Boolean).join(' · ')}
              value={p.points.toFixed(2)}
              valueSub="Pts"
            />
          );
        })}
      </List>
    </Section>
  );
}
