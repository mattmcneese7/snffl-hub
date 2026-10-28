import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { TROPHY_NAMES, type TrophyKey } from '@/lib/trophy-names';
import { teams } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getTrophyBoard, type Award } from '@/lib/trophies';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import { AwardArt } from '../modules/AwardIcon';
import AwardTile from '../modules/AwardTile';
import { managerOf, teamOf } from '../modules/shared';
import { Avatar, Drawer, List, Row, Section } from '../ui';

export const metadata: Metadata = { title: { absolute: 'Trophy Case, Splash' }, robots: { index: false, follow: false } };
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
      <SectionHead icon="trophy" word="trophies" week={data.week} mine={data.myRoster} back={{ href: '/league', label: 'League' }} />

      {board.latest.length ? (
        <Section title={`Week ${board.latestWeek} Hardware`}>
          <List tap>
            {board.latest.map((a) => (
              <AwardTile key={a.kind} kind={a.kind} rosterId={a.rosterId} detail={a.detail} mine={a.rosterId === mine} />
            ))}
          </List>
        </Section>
      ) : null}

      <Section title="Every Award">
        <List>
          {ORDER.map((k) => {
            const list = byKind.get(k) ?? [];
            const tally = new Map<number, number>();
            for (const a of list) tally.set(a.rosterId, (tally.get(a.rosterId) ?? 0) + 1);
            const most = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
            return (
              <Row
                key={k}
                lead={<AwardArt kind={k} size={56} />}
                title={TROPHY_NAMES[k].name}
                sub={TROPHY_NAMES[k].blurb}
                value={list.length ? `${list.length}x` : undefined}
                valueSub={!list.length ? 'Not yet' : most && most[1] > 1 ? `Most: ${managerOf(most[0])}` : undefined}
              />
            );
          })}
        </List>
        {board.all.length ? (
          <Drawer title="Award History" value={board.all.length}>
            <List>
              {ORDER.flatMap((k) =>
                (byKind.get(k) ?? []).map((a) => (
                  <Row key={`${k}-${a.week}-${a.rosterId}`} label={TROPHY_NAMES[k].name} title={teamOf(a.rosterId)} sub={managerOf(a.rosterId)} valueSub={a.week ? `Week ${a.week}` : 'Season'} />
                )),
              )}
            </List>
          </Drawer>
        ) : null}
      </Section>

      <Section title="Every Shelf">
        <List tap>
          {shelves.map(({ team, total, counts }) => (
            <Row
              key={team.rosterId}
              href={`/managers/${team.rosterId}`}
              lead={<Avatar src={team.avatarUrl} color={team.colors?.primary} />}
              title={team.teamName.trim()}
              strong={team.rosterId === mine}
              sub={[managerOf(team.rosterId), ...counts.map((c) => `${SHORT[c.kind] ?? TROPHY_NAMES[c.kind].name.replace(/^The /, '')}${c.n > 1 ? ` x${c.n}` : ''}`)].join(' · ')}
              value={total}
              valueSub={total === 1 ? 'award' : 'awards'}
            />
          ))}
        </List>
      </Section>
    </Shell>
  );
}
