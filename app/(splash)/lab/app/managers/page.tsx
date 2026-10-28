import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { TROPHY_NAMES as TROPHIES } from '@/lib/trophy-names';
import { firstNameOf } from '@/config/managers';
import { getStandings } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getTrophyBoard } from '@/lib/trophies';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import { Avatar, Empty, List, Rank, Row } from '../ui';
import l from '../players/layout.module.css';

export const metadata: Metadata = { title: { absolute: 'Managers, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const record = (t: { wins: number; losses: number; ties: number }) => `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;

/**
 * Managers: every team in table order, the seed and face, the team name
 * leading and the manager under it with the hardware each one holds from
 * the latest week, the record and points for. A row opens that manager's page.
 */
export default async function V4Managers() {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const [data, standings, board] = await Promise.all([getV4Data(mine), getStandings(), getTrophyBoard().catch(() => null)]);
  return (
    <Shell data={data} active="league">
      <SectionHead icon="groups" word="managers" week={data.week} mine={data.myRoster} back={{ href: '/league', label: 'League' }} />
      {standings.length ? (
        <List tap>
          {standings.map((t) => {
            const held = (board?.holders[t.rosterId] ?? []).map((k) => TROPHIES[k].name);
            const who = `${firstNameOf(t.rosterId) ?? t.manager}${t.rosterId === mine ? ' (you)' : ''}`;
            return (
              <Row
                key={t.rosterId}
                href={`/managers/${t.rosterId}`}
                lead={
                  <span className={l.lead}>
                    <Rank n={t.seed} />
                    <Avatar src={t.avatarUrl} color={t.colors?.primary} size={34} />
                  </span>
                }
                title={t.teamName.trim()}
                sub={[who, ...held].join(' · ')}
                value={record(t)}
                valueSub={`PF ${t.pointsFor.toFixed(1)}`}
              />
            );
          })}
        </List>
      ) : (
        <Empty>League unavailable from Sleeper.</Empty>
      )}
    </Shell>
  );
}
