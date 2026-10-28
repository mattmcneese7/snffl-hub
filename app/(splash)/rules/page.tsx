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
import { DEFENSE, KICKING, OFFENSE, perPoint, POINTS_ALLOWED, rowsOf, signed, YARDS_ALLOWED, type Row } from './scoring';

export const metadata: Metadata = { title: { absolute: 'Rules, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

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
    ...(ir ? [{ label: 'IR', value: ir }] : []),
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
