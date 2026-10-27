import Link from 'next/link';
import { scoredWeek } from '@/lib/league';
import { leagueVerdicts, oracleFor, type Verdict } from '@/lib/squirt-says';
import Squirt from '../../../home/Squirt';
import { teamOf } from './shared';
import s from '../v4.module.css';
import m from './modules.module.css';

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
  return (
    <section aria-label="Squirt says">
      <div className={s.title}>
        <h2>Squirt Says</h2>
        <Link href="/lab/app/matchup">Your matchup</Link>
      </div>
      <div className={s.card} style={{ marginTop: 8 }}>
        <div className={m.squirt}>
          <Squirt mood="calm" size={52} />
          <ul className={m.says}>
            {ordered.map((v) => (
              <li key={`${v.rosterId}-${v.kind}`} className={v.rosterId === mine ? m.mine : undefined}>
                <small>{v.rosterId === mine ? `You · ${teamOf(v.rosterId)}` : teamOf(v.rosterId)}</small>
                {v.saying}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
