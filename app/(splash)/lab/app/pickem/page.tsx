import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { firstNameOf } from '@/config/managers';
import { teamByRoster, teams } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import { Avatar, Empty, List, Rank, Row, Section, ui } from '../ui';
import l from '../modules/layout.module.css';
import Board, { type BoardTeam } from './Board';
import { pickWeek, seasonStandings, weekPicks } from './store';

export const metadata: Metadata = { title: { absolute: "Pick'em, Splash" }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const LOCK = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * Pick'em: every manager picks the winner of each league game, their own
 * included. Picks lock at the week's first kickoff and stay hidden until
 * then; after it, everyone sees everyone's. The season table counts correct
 * picks; the week's best picker takes a Hardware award.
 */
export default async function V4Pickem() {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const data = await getV4Data(mine);
  const week = await pickWeek(data.state, data.week);
  const [w, season] = await Promise.all([weekPicks(week), seasonStandings(week - 1)]);
  const team = (id: number): BoardTeam => {
    const t = teamByRoster(id);
    return { rosterId: id, team: t?.teamName.trim() ?? `Team ${id}`, manager: firstNameOf(id) ?? t?.manager ?? '', avatar: t?.avatarUrl ?? null, color: t?.colors?.primary ?? '#2d4c9c' };
  };
  const everyone = Object.fromEntries(teams.map((t) => [t.rosterId, team(t.rosterId)]));
  const games = w.games.map((g) => ({ matchupId: g.matchupId, a: team(g.a), b: team(g.b), winner: g.winner }));
  const out = Object.values(everyone).filter((t) => !w.inRosters.includes(t.rosterId));
  const lockText = w.lockAt ? LOCK.format(new Date(w.lockAt)) : null;

  return (
    <Shell data={data} active="league">
      <SectionHead icon="checklist" word="pick'em" week={data.week} mine={data.myRoster} back={{ href: '/league', label: 'League' }} />
      {!w.configured ? (
        <Empty>Pick&rsquo;em opens once the league table is set up.</Empty>
      ) : (
        <>
          <Section title={`Week ${week} Picks`}>
            <p className={`${ui.sub} ${l.note}`}>
              {w.locked ? (w.decided ? 'Final' : `Locked ${lockText ? `at ${lockText}` : ''}`.trim()) : lockText ? `Locks ${lockText}` : 'Locks at the first kickoff'} &middot; {w.inRosters.length} of {Object.keys(everyone).length} teams in
              {!w.locked && out.length && out.length <= 5 ? ` · Still out: ${out.map((t) => t.manager).join(', ')}` : ''}
            </p>
            {mine == null ? <Empty action={{ href: '/account', label: 'Pick your team' }}>Pick your team to make picks.</Empty> : null}
            <Board week={week} mine={mine} games={games} locked={w.locked} decided={w.decided} all={w.all} teams={everyone} />
          </Section>
          <Section title="Season">
            {season.table.length ? (
              <List>
                {season.table.map((s, i) => {
                  const t = everyone[s.rosterId];
                  return (
                    <Row
                      key={s.rosterId}
                      lead={
                        <span className={l.lead}>
                          <Rank n={i + 1} />
                          <Avatar src={t?.avatar} color={t?.color} />
                        </span>
                      }
                      title={t?.team ?? ''}
                      strong={s.rosterId === mine}
                      sub={`${t?.manager ?? ''}${s.weeksWon ? ` · ${s.weeksWon} ${s.weeksWon === 1 ? 'week' : 'weeks'} won` : ''}`}
                      value={s.correct}
                      valueSub={`of ${s.decided}`}
                    />
                  );
                })}
              </List>
            ) : (
              <Empty>The table starts after the first locked week is final.</Empty>
            )}
          </Section>
        </>
      )}
    </Shell>
  );
}
