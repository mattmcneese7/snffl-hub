import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CHUG_SUBMISSION, CUSTOM_RULES } from '@/config/league-rules';
import { league } from '@/lib/league';
import Shell from '../kit/Shell';
import PageHead from '../kit/PageHead';
import { WidgetHead } from '../home/Widget';
import Icon, { type IconName } from '../home/Icons';
import w from '../home/widgets.module.css';
import r from './rules.module.css';

export const metadata: Metadata = { title: { absolute: 'Rules, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Sleeper scoring keys worth showing, in the order people ask about them.
 * The same lists v2 shows, plus the rows Sleeper scores that v2 skipped:
 * forced fumbles, special teams touchdowns, the 21 to 27 points allowed
 * band (so the ladder has no gap) and the yards allowed ladder.
 */
const OFFENSE: [string, string][] = [
  ['pass_td', 'Passing TD'],
  ['pass_yd', 'Passing yards'],
  ['pass_int', 'Interception thrown'],
  ['rush_td', 'Rushing TD'],
  ['rush_yd', 'Rushing yards'],
  ['rec', 'Reception'],
  ['rec_td', 'Receiving TD'],
  ['rec_yd', 'Receiving yards'],
  ['fum_lost', 'Fumble lost'],
  ['pass_2pt', 'Two point pass'],
  ['rush_2pt', 'Two point rush'],
  ['rec_2pt', 'Two point catch'],
];

const KICKING: [string, string][] = [
  ['fgm_0_19', 'Field goal, 0 to 19 yards'],
  ['fgm_20_29', 'Field goal, 20 to 29 yards'],
  ['fgm_30_39', 'Field goal, 30 to 39 yards'],
  ['fgm_40_49', 'Field goal, 40 to 49 yards'],
  ['fgm_50_59', 'Field goal, 50 to 59 yards'],
  ['fgm_60p', 'Field goal, 60 or more yards'],
  ['fgmiss', 'Missed field goal'],
  ['xpm', 'Extra point'],
  ['xpmiss', 'Missed extra point'],
];

const DEFENSE: [string, string][] = [
  ['sack', 'Sack'],
  ['int', 'Interception'],
  ['fum_rec', 'Fumble recovery'],
  ['ff', 'Forced fumble'],
  ['def_td', 'Defensive TD'],
  ['def_st_td', 'Special teams TD'],
  ['safe', 'Safety'],
  ['blk_kick', 'Blocked kick'],
];

const POINTS_ALLOWED: [string, string][] = [
  ['pts_allow_0', 'Shutout'],
  ['pts_allow_1_6', '1 to 6 points'],
  ['pts_allow_7_13', '7 to 13 points'],
  ['pts_allow_14_20', '14 to 20 points'],
  ['pts_allow_21_27', '21 to 27 points'],
  ['pts_allow_28_34', '28 to 34 points'],
  ['pts_allow_35p', '35 or more points'],
];

const YARDS_ALLOWED: [string, string][] = [
  ['yds_allow_0_100', '0 to 100 yards'],
  ['yds_allow_100_199', '100 to 199 yards'],
  ['yds_allow_200_299', '200 to 299 yards'],
  ['yds_allow_300_349', '300 to 349 yards'],
  ['yds_allow_350_399', '350 to 399 yards'],
  ['yds_allow_400_449', '400 to 449 yards'],
  ['yds_allow_450_499', '450 to 499 yards'],
  ['yds_allow_500_549', '500 to 549 yards'],
  ['yds_allow_550p', '550 or more yards'],
];

/** +4, -2, +0.04, 0: the sign says which way it goes. */
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

/** A per yard value as people say it: 0.04 a yard is a point every 25. */
const perPoint = (n: number) => (n > 0 && n < 1 ? Math.round(1 / n) : null);

type Row = { label: string; value: number; key: string };

const rowsOf = (labels: [string, string][]): Row[] =>
  labels
    .map(([key, label]) => ({ key, label, value: league.scoring[key] }))
    .filter((x): x is Row => typeof x.value === 'number');

function ScoreRows({ rows }: { rows: Row[] }) {
  return (
    <ul className={r.list}>
      {rows.map((row) => {
        const every = row.key.endsWith('_yd') ? perPoint(row.value) : null;
        return (
          <li key={row.key} className={r.row}>
            <span className={r.label}>
              {row.label}
              {every ? <span className={r.hint}>1 point per {every} yards</span> : null}
            </span>
            <span className={`${r.value} ${row.value < 0 ? r.neg : row.value === 0 ? r.zero : ''}`}>{signed(row.value)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ScoreWidget({ icon, title, aside, children }: { icon: IconName; title: string; aside?: string; children: ReactNode }) {
  return (
    <section className={`${w.widget} ${w.l}`}>
      <WidgetHead icon={icon} title={title} aside={aside ? <span className={w.sub}>{aside}</span> : undefined} />
      {children}
    </section>
  );
}

/**
 * The rules: how the league is set up and how it scores, both read from
 * Sleeper's own settings so they cannot drift from what Sleeper actually
 * counts, then the rules Sleeper cannot know about, the chugging ones.
 */
export default function RulesPage() {
  const starters = league.rosterPositions.filter((p) => p !== 'BN' && p !== 'IR');
  const bench = league.rosterPositions.filter((p) => p === 'BN').length;
  const ir = league.rosterPositions.filter((p) => p === 'IR').length;

  const offense = rowsOf(OFFENSE);
  const kicking = rowsOf(KICKING);
  const defense = rowsOf(DEFENSE);
  const points = rowsOf(POINTS_ALLOWED);
  const yards = rowsOf(YARDS_ALLOWED);

  const setup: { label: string; value: ReactNode }[] = [
    { label: 'Teams', value: league.teamCount },
    { label: 'Playoff teams', value: league.playoffTeams },
    { label: 'Playoffs start', value: `Week ${league.playoffWeekStart}` },
    { label: 'Bench', value: bench },
    { label: 'IR', value: ir || 'None' },
  ];

  return (
    <Shell active="more">
      <PageHead title="Rules" collapse />
      <div className={w.grid}>
        <ScoreWidget icon="gear" title="League setup" aside="Sleeper">
          <ul className={r.list}>
            {setup.map((s) => (
              <li key={s.label} className={r.row}>
                <span className={r.label}>{s.label}</span>
                <span className={r.value}>{s.value}</span>
              </li>
            ))}
          </ul>
          <div className={r.lineup}>
            <span className={w.subHead}>Lineup</span>
            <div className={r.slots}>
              {starters.map((p, i) => (
                <span key={i} className={r.slot}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </ScoreWidget>

        {offense.length ? (
          <ScoreWidget icon="football" title="Offense">
            <ScoreRows rows={offense} />
          </ScoreWidget>
        ) : null}

        {kicking.length ? (
          <ScoreWidget icon="flag" title="Kicking">
            <ScoreRows rows={kicking} />
          </ScoreWidget>
        ) : null}

        {defense.length || points.length || yards.length ? (
          <ScoreWidget icon="helmet" title="Defense and special teams">
            {defense.length ? <ScoreRows rows={defense} /> : null}
            {points.length ? (
              <div className={r.group}>
                <span className={w.subHead}>Points allowed</span>
                <ScoreRows rows={points} />
              </div>
            ) : null}
            {yards.some((y) => y.value !== 0) ? (
              <div className={r.group}>
                <span className={w.subHead}>Yards allowed</span>
                <ScoreRows rows={yards} />
              </div>
            ) : null}
          </ScoreWidget>
        ) : null}

        {CUSTOM_RULES.map((section) => (
          <section key={section.title} className={`${w.widget} ${w.l}`}>
            <WidgetHead icon="gavel" title={section.title} />
            {section.intro ? <p className={r.intro}>{section.intro}</p> : null}
            <ol className={r.rules}>
              {section.rules.map((rule, i) => (
                <li key={rule}>
                  <span className={r.ruleNum}>{i + 1}</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ol>
            <p className={r.submit}>
              <Icon name="megaphone" className={r.submitIcon} />
              <span>{CHUG_SUBMISSION}</span>
            </p>
          </section>
        ))}
      </div>
    </Shell>
  );
}
