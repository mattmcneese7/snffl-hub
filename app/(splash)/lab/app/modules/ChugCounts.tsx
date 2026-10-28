import { getChugCounts, type AwardTally } from '@/lib/awards';
import { teamByRoster } from '@/lib/league';
import { managerOf, teamOf } from './shared';
import { Avatar, Empty, List, Rank, Row, Section, ui } from '../ui';
import l from './layout.module.css';

/** Chug Meter: the five teams with the most chugs owed. */
export default async function ChugCounts({ tallies, mine = null }: { tallies?: AwardTally[]; mine?: number | null }) {
  const all = tallies ?? (await getChugCounts().catch(() => [] as AwardTally[]));
  const owed = all.filter((t) => t.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
  const total = all.reduce((n, t) => n + t.count, 0);
  return (
    <Section title="Chug Meter" label="Who owes" action={{ href: '/chug', label: 'All teams' }}>
      {owed.length ? (
        <>
          <List tap>
            {owed.map((t, i) => {
              const team = teamByRoster(t.rosterId);
              return (
                <Row
                  key={t.rosterId}
                  href="/chug"
                  lead={
                    <span className={l.lead}>
                      <Rank n={i + 1} />
                      <Avatar src={team?.avatarUrl} color={team?.colors?.primary} />
                    </span>
                  }
                  title={teamOf(t.rosterId)}
                  strong={t.rosterId === mine}
                  sub={`${managerOf(t.rosterId)} · ${t.weeks.map((w) => `W${w}`).join(', ')}`}
                  value={t.count}
                  valueSub={t.count === 1 ? 'Beer' : 'Beers'}
                />
              );
            })}
          </List>
          <p className={`${ui.sub} ${l.note}`}>
            {total} {total === 1 ? 'beer' : 'beers'} owed this season
          </p>
        </>
      ) : (
        <Empty>Nobody owes a chug yet.</Empty>
      )}
    </Section>
  );
}
