import { scoredWeek } from '@/lib/league';
import { leagueVerdicts, oracleFor, type Verdict } from '@/lib/squirt-says';
import Squirt from '../squirt/Squirt';
import { moodFor } from '../squirt/bus';
import { getV4Data } from '../data';
import { teamOf } from './shared';
import { Label, List, Row, Section, ui } from '../ui';
import l from './layout.module.css';

/**
 * Squirt Says: his read on each lineup this week, the one call that matters
 * most for each team, yours first, up to six. Each line names the team it is
 * about, so it is always clear who.
 */
export default async function SquirtSays({ week, mine = null }: { week?: number; mine?: number | null }) {
  const wk = week ?? (await scoredWeek());
  let verdicts: Verdict[] = [];
  try {
    const oracle = await oracleFor(wk);
    verdicts = leagueVerdicts(oracle.sides, oracle.input);
  } catch {
    verdicts = [];
  }
  const ordered = [...verdicts.filter((v) => v.rosterId === mine), ...verdicts.filter((v) => v.rosterId !== mine)].slice(0, 6);
  if (!ordered.length) return null;
  // His mood is your game's, the same lines the score bar uses.
  const data = await getV4Data(mine).catch(() => null);
  const mood = data?.mine ? moodFor(data.state, data.mine.a.score, data.mine.b.score) : 'calm';
  const [lead, ...rest] = ordered;
  return (
    <Section title="Squirt Says" action={{ href: '/matchup', label: 'Your matchup' }}>
      <div className={`${ui.card} ${l.lead}`}>
        <Squirt mood={mood} size={128} listen label={`Squirt, ${mood}`} />
        <p className={`${ui.body} ${l.note}`}>
          <Label tone="brand">{lead.rosterId === mine ? `You · ${teamOf(lead.rosterId)}` : teamOf(lead.rosterId)}</Label>
          <span className={ui.bodyText}>{lead.saying}</span>
        </p>
      </div>
      {rest.length ? (
        <List>
          {rest.map((v) => (
            <Row key={`${v.rosterId}-${v.kind}`} label={teamOf(v.rosterId)} title={v.saying} />
          ))}
        </List>
      ) : null}
    </Section>
  );
}
