import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { TROPHY_NAMES, type TrophyKey } from '@/lib/trophy-names';
import { teams } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getTrophyBoard, type Award } from '@/lib/trophies';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import { AwardArt, AwardChip } from '../modules/AwardIcon';
import AwardTile from '../modules/AwardTile';
import { managerOf, teamOf } from '../modules/shared';
import m from '../modules/modules.module.css';
import s from '../v4.module.css';
import t from './trophies.module.css';

export const metadata: Metadata = { title: { absolute: 'Trophy Case, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const ORDER: TrophyKey[] = ['champion', 'plunger', 'motw', 'shart', 'blowout', 'squeaker', 'heartbreaker', 'lucky', 'bench'];
const SHORT: Partial<Record<TrophyKey, string>> = { motw: 'MOTW', heartbreaker: 'Heartbreak', plunger: 'Plunger' };

/**
 * The Trophy Case: the latest week's hardware, every award with its history
 * and who has won it most, and every team's shelf. All from the trophy board.
 */
export default async function V4Trophies() {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const [data, board] = await Promise.all([getV4Data(mine), getTrophyBoard()]);
  const byKind = new Map<TrophyKey, Award[]>();
  for (const a of board.all) byKind.set(a.kind, [...(byKind.get(a.kind) ?? []), a]);
  const shelves = teams
    .map((team) => {
      const won = board.all.filter((a) => a.rosterId === team.rosterId);
      const counts = ORDER.map((k) => ({ kind: k, n: won.filter((a) => a.kind === k).length })).filter((c) => c.n);
      return { team, total: won.length, counts };
    })
    .sort((a, b) => b.total - a.total || a.team.teamName.localeCompare(b.team.teamName));

  return (
    <Shell data={data} active="league">
      <SectionHead icon="trophy" word="trophies" week={data.week} mine={data.myRoster} back={{ href: '/lab/app/league', label: 'League' }} />

      {board.latest.length ? (
        <>
          <div className={s.title}>
            <h2>Week {board.latestWeek} Hardware</h2>
          </div>
          <div className={s.list}>
            {board.latest.map((a) => (
              <AwardTile key={a.kind} kind={a.kind} rosterId={a.rosterId} detail={a.detail} mine={a.rosterId === mine} row />
            ))}
          </div>
        </>
      ) : null}

      <div className={s.title}>
        <h2>Every Award</h2>
      </div>
      <div className={s.list}>
        {ORDER.map((k) => {
          const list = byKind.get(k) ?? [];
          const tally = new Map<number, number>();
          for (const a of list) tally.set(a.rosterId, (tally.get(a.rosterId) ?? 0) + 1);
          const most = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
          return (
            <div key={k} className={t.award}>
              <AwardArt kind={k} size={48} />
              <span className={t.awardText}>
                <b>{TROPHY_NAMES[k].name}</b>
                <small>{TROPHY_NAMES[k].blurb}</small>
                {list.length ? (
                  <span className={t.history}>
                    {list.map((a) => (
                      <span key={`${a.week}-${a.rosterId}`} className={t.won}>
                        <b>{a.week ? `W${a.week}` : 'Season'}</b> {teamOf(a.rosterId)}
                      </span>
                    ))}
                  </span>
                ) : (
                  <small>Not handed out yet</small>
                )}
                {most && most[1] > 1 ? (
                  <small className={t.most}>
                    Most &middot; {teamOf(most[0])}, {most[1]}
                  </small>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>

      <div className={s.title}>
        <h2>Every Shelf</h2>
      </div>
      <div className={s.list}>
        {shelves.map(({ team, total, counts }) => (
          <div key={team.rosterId} className={`${t.shelf} ${team.rosterId === mine ? m.mine : ''}`}>
            <span className={s.av} style={{ width: 28, height: 28, ['--mgr' as string]: team.colors?.primary }}>
              {team.avatarUrl ? <img src={team.avatarUrl} alt="" /> : null}
            </span>
            <span className={s.who}>
              <b>{team.teamName.trim()}</b>
              <small>
                {managerOf(team.rosterId)} &middot; {total ? `${total} ${total === 1 ? 'award' : 'awards'}` : 'No awards yet'}
              </small>
              {counts.length ? (
                <span className={t.pieces}>
                  {counts.map((c) => (
                    <AwardChip key={c.kind} kind={c.kind} label={`${SHORT[c.kind] ?? TROPHY_NAMES[c.kind].name.replace(/^The /, '')}${c.n > 1 ? ` x${c.n}` : ''}`} />
                  ))}
                </span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </Shell>
  );
}
