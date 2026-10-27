import Link from 'next/link';
import { getChugCounts, type AwardTally } from '@/lib/awards';
import { teamByRoster } from '@/lib/league';
import { Mx } from './icons';
import { managerOf, teamOf } from './shared';
import s from '../v4.module.css';
import m from './modules.module.css';

/** Who Owes: the five managers with the most chugs owed, a stein per beer. */
export default async function ChugCounts({ tallies, mine = null }: { tallies?: AwardTally[]; mine?: number | null }) {
  const all = tallies ?? (await getChugCounts().catch(() => [] as AwardTally[]));
  const owed = all.filter((t) => t.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
  const total = all.reduce((n, t) => n + t.count, 0);
  return (
    <section aria-label="Who owes">
      <div className={s.title}>
        <h2>Who Owes</h2>
        <Link href="/lab/app/chug">Chug Meter</Link>
      </div>
      {owed.length ? (
        <div className={s.list} style={{ marginTop: 8 }}>
          {owed.map((t, i) => {
            const team = teamByRoster(t.rosterId);
            return (
              <Link key={t.rosterId} href="/lab/app/chug" className={`${m.rank} ${t.rosterId === mine ? m.mine : ''}`}>
                <span className={m.rankN}>{i + 1}</span>
                <span className={s.av} style={{ width: 28, height: 28, ['--mgr' as string]: team?.colors?.primary }}>
                  {team?.avatarUrl ? <img src={team.avatarUrl} alt="" /> : null}
                </span>
                <span className={s.who}>
                  <b>{teamOf(t.rosterId)}</b>
                  <small>
                    {managerOf(t.rosterId)} &middot; {t.weeks.map((w) => `W${w}`).join(', ')}
                  </small>
                </span>
                <span className={m.bigSub}>
                  <span className={m.big}>{t.count}</span>
                  <small>{t.count === 1 ? 'Beer' : 'Beers'}</small>
                </span>
              </Link>
            );
          })}
          <div className={m.via}>
            <span className={m.steins} aria-hidden style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }}>
              <Mx name="beer" size={14} />
            </span>
            {total} {total === 1 ? 'beer' : 'beers'} owed this season
          </div>
        </div>
      ) : (
        <p className={s.empty} style={{ marginTop: 8 }}>
          Nobody owes a chug yet.
        </p>
      )}
    </section>
  );
}
