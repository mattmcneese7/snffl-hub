import Link from 'next/link';
import { getTopPerformers, getWeekGames, league, scoredWeek } from '@/lib/league';
import { formatStatLine, getWeekStatLines } from '@/lib/sleeper-live';
import type { Game, LineupSlot } from '@/lib/types';
import { managerOf, shortName, teamOf } from './shared';
import s from '../v4.module.css';
import m from './modules.module.css';

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
    <section aria-label={`Week ${wk} top scorers`}>
      <div className={s.title}>
        <h2>Top Scorers</h2>
        <Link href="/lab/app/swami">Swami</Link>
      </div>
      <div className={s.list} style={{ marginTop: 8 }}>
        {scored.map((p, i) => {
          const r = owner.get(p.id);
          const line = formatStatLine(p.position, stats[p.id]?.stats as never);
          return (
            <button key={p.id} type="button" data-player={p.id} className={`${s.prow} ${r === mine ? s.prowMine : ''}`} aria-label={`${p.name}, open player`}>
              <span className={m.shot}>
                <img src={p.headshot} alt="" loading="lazy" />
              </span>
              <span className={s.prowName}>
                <b>
                  {i + 1}. {shortName(p.name, p.position, p.team)}
                </b>
                <small>
                  <i className={`${s.pos} ${s[`p${p.position}`] ?? ''}`}>{p.position}</i>
                  {p.team ?? ''}
                  {r != null ? ` · ${teamOf(r)}, ${managerOf(r)}` : ''}
                </small>
                {line ? <span className={m.line}>{line}</span> : null}
              </span>
              <span className={s.prowPts}>
                <b>{p.points.toFixed(2)}</b>
                <small>Pts</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
