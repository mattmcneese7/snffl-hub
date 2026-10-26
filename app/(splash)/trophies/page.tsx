import type { Metadata } from 'next';
import { TROPHIES, type TrophyKey } from '@/components/Trophy';
import { firstNameOf } from '@/config/managers';
import { teamByRoster, teams } from '@/lib/league';
import { getTrophyBoard, type Award } from '@/lib/trophies';
import AwardIcon from '../home/Awards';
import Shell from '../kit/Shell';
import PageHead from '../kit/PageHead';
import { WidgetHead } from '../home/Widget';
import w from '../home/widgets.module.css';
import styles from './trophies.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Trophy case, Splash' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const ORDER: TrophyKey[] = ['champion', 'plunger', 'motw', 'shart', 'blowout', 'squeaker', 'heartbreaker', 'lucky', 'bench'];

/**
 * The trophy case at full size, in the icon set: this week's hardware as big
 * tiles, every award with its history and who has won it most, and each
 * manager's own shelf. All from the same trophy board v2 reads.
 */
export default async function TrophiesPage() {
  const board = await getTrophyBoard();
  const nameOf = (rosterId: number) => firstNameOf(rosterId) ?? teamByRoster(rosterId)?.manager ?? '';
  const byKind = new Map<TrophyKey, Award[]>();
  for (const a of board.all) byKind.set(a.kind, [...(byKind.get(a.kind) ?? []), a]);

  // Each manager's shelf: award to count, most decorated first.
  const shelves = teams
    .map((t) => {
      const won = board.all.filter((a) => a.rosterId === t.rosterId);
      const counts = ORDER.map((k) => ({ kind: k, n: won.filter((a) => a.kind === k).length })).filter((c) => c.n);
      return { team: t, total: won.length, counts };
    })
    .sort((a, b) => b.total - a.total || a.team.teamName.localeCompare(b.team.teamName));

  return (
    <Shell active="more">
      <PageHead title="Trophy case" />
      <div className={w.grid}>
        {board.latest.length ? (
          <section className={`${w.widget} ${w.l}`}>
            <WidgetHead icon="trophy" title={`Week ${board.latestWeek} hardware`} />
            <div className={styles.latest}>
              {board.latest.map((a) => (
                <div key={a.kind} className={styles.tile}>
                  <AwardIcon kind={a.kind} size={64} />
                  <span className={styles.award}>{TROPHIES[a.kind].name}</span>
                  <span className={styles.winner}>{nameOf(a.rosterId)}</span>
                  <span className={styles.detail}>{a.detail}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className={`${w.widget} ${w.l}`}>
          <WidgetHead icon="crown" title="Every award" />
          <ul className={styles.awards}>
            {ORDER.map((k) => {
              const list = byKind.get(k) ?? [];
              const tally = new Map<number, number>();
              for (const a of list) tally.set(a.rosterId, (tally.get(a.rosterId) ?? 0) + 1);
              const most = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
              return (
                <li key={k} className={styles.awardRow}>
                  <AwardIcon kind={k} size={52} />
                  <span className={styles.awardText}>
                    <b>{TROPHIES[k].name}</b>
                    <span className={styles.blurb}>{TROPHIES[k].blurb}</span>
                    {list.length ? (
                      <span className={styles.history}>
                        {list.map((a) => (
                          <span key={`${a.week}-${a.rosterId}`} className={styles.chip}>
                            {a.week ? `W${a.week}` : 'Season'} | {nameOf(a.rosterId)}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className={styles.none}>Not handed out yet</span>
                    )}
                    {most && most[1] > 1 ? (
                      <span className={styles.most}>
                        Most | {nameOf(most[0])}, {most[1]}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={`${w.widget} ${w.l}`}>
          <WidgetHead icon="person" title="Every shelf" />
          <ul className={styles.shelves}>
            {shelves.map(({ team, total, counts }) => (
              <li key={team.rosterId} className={styles.shelf}>
                <span className={styles.avatar}>
                  {team.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={team.avatarUrl} alt="" />
                  ) : null}
                </span>
                <span className={styles.shelfWho}>
                  <b>{team.teamName}</b>
                  <span className={styles.blurb}>
                    {nameOf(team.rosterId)} | {total ? `${total} ${total === 1 ? 'award' : 'awards'}` : 'No awards yet'}
                  </span>
                </span>
                <span className={styles.pieces}>
                  {counts.map((c) => (
                    <span key={c.kind} className={styles.piece} title={TROPHIES[c.kind].name}>
                      <AwardIcon kind={c.kind} size={30} />
                      {c.n > 1 ? <span className={styles.times}>{c.n}</span> : null}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
