import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { firstNameOf } from '@/config/managers';
import { getPowerRankings, getStandings, league } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getPlayoffOdds } from '@/lib/playoff-odds';
import { getTrophyBoard } from '@/lib/trophies';
import AwardIcon, { AWARD_NAME } from '../modules/AwardIcon';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import { Avatar, Chip, Label, List, Rail, Rank, Row, Section, ui } from '../ui';
import l from '../modules/layout.module.css';

export const metadata: Metadata = { title: { absolute: 'League, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const PAGES: [string, string][] = [
  ['Bracket', '/lab/app/league/bracket'],
  ["Pick'em", '/lab/app/pickem'],
  ['Feed', '/lab/app/feed'],
  ['Managers', '/lab/app/managers'],
  ['Trades', '/lab/app/trades'],
  ['Trophy Case', '/lab/app/trophies'],
  ['Chug Meter', '/lab/app/chug'],
  ['Insights', '/lab/app/insights'],
  ['Players', '/lab/app/players'],
  ['Rules', '/lab/app/rules'],
];

const avg = (t: { pointsFor: number; wins: number; losses: number; ties: number }) => {
  const g = t.wins + t.losses + t.ties;
  return g ? (t.pointsFor / g).toFixed(2) : '0.00';
};

/** League: its pages, the standings as one list with the playoff line where the field is cut, then the power rankings. */
export default async function V4League() {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const [data, standings, odds, power, board] = await Promise.all([
    getV4Data(mine),
    getStandings(),
    getPlayoffOdds().catch(() => []),
    getPowerRankings().catch(() => []),
    getTrophyBoard().catch(() => null),
  ]);
  const held = board?.holders ?? {};
  const oddsOf = new Map(odds.map((o) => [o.rosterId, o]));
  const cut = league.playoffTeams;
  const pct = (x: number) => `${Math.round(x > 1 ? x : x * 100)}%`;
  return (
    <Shell data={data} active="league">
      <SectionHead icon="league" word="league" week={data.week} mine={data.myRoster} />
      <Rail label="League pages">
        {PAGES.map(([label, href]) => (
          <Chip key={href} href={href}>
            {label}
          </Chip>
        ))}
      </Rail>
      <Section title="Standings">
        <List tap>
          {standings.flatMap((t) => {
            const o = oddsOf.get(t.rosterId);
            const row = (
              <Row
                key={t.rosterId}
                href={`/lab/app/managers/${t.rosterId}`}
                lead={
                  <span className={l.lead}>
                    <Rank n={t.seed} />
                    <Avatar src={t.avatarUrl} color={t.colors?.primary} />
                  </span>
                }
                title={t.teamName}
                strong={t.rosterId === mine}
                sub={
                  <span className={l.wrapLine}>
                    <span className={l.nowrap}>{`${firstNameOf(t.rosterId) ?? t.manager} · ${t.pointsFor.toFixed(2)} PF${t.streak ? ` · ${t.streak}` : ''}`}</span>
                    {(held[t.rosterId] ?? []).map((k) => (
                      <span key={k} className={l.inline}>
                        <AwardIcon kind={k} size={20} />
                        <span className={ui.sr}>Holds {AWARD_NAME[k]}</span>
                      </span>
                    ))}
                  </span>
                }
                value={`${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`}
                valueSub={o ? `${pct(o.makePlayoffs)} playoffs` : undefined}
              />
            );
            return t.seed === cut && standings.length > cut
              ? [
                  row,
                  <span key="cut" className={l.cut}>
                    <Label>Playoff line</Label>
                  </span>,
                ]
              : [row];
          })}
        </List>
        <p className={`${ui.sub} ${l.note}`}>Top {cut} make the playoffs. Odds from 10,000 simulated seasons.</p>
      </Section>
      {power.length ? (
        <Section title="Power Rankings">
          <List tap>
            {power.map((p) => (
              <Row
                key={p.team.rosterId}
                href={`/lab/app/managers/${p.team.rosterId}`}
                lead={
                  <span className={l.lead}>
                    <Rank n={p.rank} />
                    <Avatar src={p.team.avatarUrl} color={p.team.colors?.primary} />
                  </span>
                }
                title={p.team.teamName}
                strong={p.team.rosterId === mine}
                sub={`${firstNameOf(p.team.rosterId) ?? p.team.manager} · ${avg(p.team)} per game`}
                valueSub={p.movement == null ? 'New' : p.movement === 0 ? 'Even' : p.movement > 0 ? `Up ${p.movement}` : `Down ${-p.movement}`}
              />
            ))}
          </List>
          <p className={`${ui.sub} ${l.note}`}>Ranked on win rate, average score and the last three weeks.</p>
        </Section>
      ) : null}
    </Shell>
  );
}
