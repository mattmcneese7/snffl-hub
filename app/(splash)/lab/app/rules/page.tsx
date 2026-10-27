import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { CHUG_SUBMISSION, CUSTOM_RULES } from '@/config/league-rules';
import { league } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { DEFENSE, KICKING, OFFENSE, perPoint, POINTS_ALLOWED, rowsOf, signed, YARDS_ALLOWED, type Row } from '../../../rules/scoring';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import { Drawer, Label, List, Rank, Row as UiRow, Section, ui } from '../ui';
import { Pos } from '../ui/blocks/Pos';
import l from '../modules/layout.module.css';

export const metadata: Metadata = { title: { absolute: 'Rules, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function Rows({ rows }: { rows: Row[] }) {
  return (
    <List>
      {rows.map((row) => {
        const every = row.key.endsWith('_yd') ? perPoint(row.value) : null;
        return <UiRow key={row.key} title={row.label} sub={every ? `1 point per ${every} yards` : undefined} value={signed(row.value)} muted={row.value === 0} />;
      })}
    </List>
  );
}

/**
 * The rules: setup and scoring read straight from Sleeper's settings, so
 * they match what Sleeper counts, then the league's own rules, the chug.
 */
export default async function V4Rules() {
  const jar = await cookies();
  const data = await getV4Data(parseTeam(jar.get(TEAM_COOKIE)?.value));
  const starters = league.rosterPositions.filter((p) => p !== 'BN' && p !== 'IR');
  const bench = league.rosterPositions.filter((p) => p === 'BN').length;
  const ir = league.rosterPositions.filter((p) => p === 'IR').length;
  const offense = rowsOf(OFFENSE);
  const kicking = rowsOf(KICKING);
  const defense = rowsOf(DEFENSE);
  const points = rowsOf(POINTS_ALLOWED);
  const yards = rowsOf(YARDS_ALLOWED);
  const setup: [string, string | number][] = [
    ['Teams', league.teamCount],
    ['Playoff teams', league.playoffTeams],
    ['Playoffs start', `Week ${league.playoffWeekStart}`],
    ['Bench', bench],
    ...(ir ? [['IR', ir] as [string, number]] : []),
  ];
  return (
    <Shell data={data} active="league">
      <SectionHead icon="league" word="rules" week={data.week} mine={data.myRoster} back={{ href: '/lab/app/league', label: 'League' }} />
      {CUSTOM_RULES.map((sec) => (
        <Section key={sec.title} title={sec.title}>
          {sec.intro ? <p className={`${ui.bodyText} ${l.note}`}>{sec.intro}</p> : null}
          <List>
            {sec.rules.map((r, i) => (
              <UiRow key={r} lead={<Rank n={i + 1} />} title={r} />
            ))}
          </List>
          <p className={`${ui.sub} ${l.note}`}>{CHUG_SUBMISSION}</p>
        </Section>
      ))}
      <Section title="League Setup">
        <List>
          {setup.map(([k, v]) => (
            <UiRow key={k} title={k} value={v} />
          ))}
        </List>
        <div className={`${ui.card} ${l.stack}`}>
          <Label>Starting lineup</Label>
          <div className={ui.chips}>
            {starters.map((p, i) => (
              <Pos key={i} position={p === 'SUPER_FLEX' ? 'SF' : p} />
            ))}
          </div>
        </div>
      </Section>
      <Section title="Scoring">
        {(
          [
            ['Offense', offense],
            ['Kicking', kicking],
            ['Defense', defense],
            ['Points Allowed', points],
            ['Yards Allowed', yards.some((y) => y.value !== 0) ? yards : []],
          ] as [string, Row[]][]
        )
          .filter(([, rows]) => rows.length)
          .map(([title, rows]) => (
            <Drawer key={title} title={title} value={`${rows.length} rules`}>
              <Rows rows={rows} />
            </Drawer>
          ))}
      </Section>
      <p className={`${ui.sub} ${l.note}`}>Setup and scoring come from Sleeper&rsquo;s league settings.</p>
    </Shell>
  );
}
