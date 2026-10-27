import type { WeekView } from '../scores/weekData';
import { List, Row, Section } from '../ui';
import { matchupTimeline, type Moment } from './engine';

const pct = (w: number) => `${Math.round(w * 100)}%`;

/**
 * The week's biggest turning points across every matchup: lead changes and
 * deciders first, then the largest swings in win chance, three at most. Each
 * names who, what, where and when, and opens that matchup's moments.
 */
export default async function BiggestSwings({ wv, week }: { wv: WeekView; week: number }) {
  const games = [...(wv.mine ? [wv.mine] : []), ...wv.others];
  const found = await Promise.all(
    games.map(async (g) => {
      const live = wv.live.get(g.id);
      if (!live) return [];
      const t = await matchupTimeline(live, g.a.rosterId).catch(() => null);
      return (t?.moments ?? []).map((m) => ({ m, g }));
    }),
  );
  const weight = (m: Moment) => Math.abs(m.swing) + (m.kinds.includes('decider') ? 0.5 : 0) + (m.kinds.includes('lead') ? 0.2 : 0) + (m.kinds.includes('late') ? 0.1 : 0);
  const top = found
    .flat()
    .filter(({ m }) => m.kinds.includes('lead') || Math.abs(m.swing) >= 0.15)
    .sort((x, y) => weight(y.m) - weight(x.m))
    .slice(0, 3);
  if (!top.length) return null;
  return (
    <Section title="Biggest Swings">
      <List tap>
        {top.map(({ m, g }) => {
          // The side the play helped, named the way the rows name teams.
          const helped = m.gain.a >= m.gain.b ? g.a : g.b;
          const other = helped === g.a ? g.b : g.a;
          const chance = helped === g.a ? m.winA : 1 - m.winA;
          const before = helped === g.a ? m.winA - m.swing : 1 - (m.winA - m.swing);
          const verb = m.kinds.includes('decider') ? 'wins it' : m.kinds.includes('lead') ? 'takes the lead' : 'swings it';
          return (
            <Row
              key={`${g.id}-${m.at}`}
              href={`/lab/app/matchup?id=${g.id}&week=${week}&view=moments`}
              label={`${m.when} · ${m.clock}`}
              title={m.what}
              sub={`${m.where} · ${helped.team} ${verb} against ${other.team}`}
              value={pct(chance)}
              valueSub={`from ${pct(before)}`}
            />
          );
        })}
      </List>
    </Section>
  );
}
