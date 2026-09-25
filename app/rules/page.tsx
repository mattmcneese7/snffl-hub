import PageHead from '@/components/PageHead';
import Chrome from '@/components/Chrome';
import { league } from '@/lib/league';
import { CHUG_SUBMISSION, CUSTOM_RULES } from '@/config/league-rules';

/** Sleeper scoring keys worth showing, in the order people actually ask about. */
const SCORING_LABELS: [string, string][] = [
  ['pass_td', 'Passing TD'],
  ['pass_yd', 'Passing yards, per yard'],
  ['pass_int', 'Interception'],
  ['rush_td', 'Rushing TD'],
  ['rush_yd', 'Rushing yards, per yard'],
  ['rec', 'Reception'],
  ['rec_td', 'Receiving TD'],
  ['rec_yd', 'Receiving yards, per yard'],
  ['fum_lost', 'Fumble lost'],
  ['pass_2pt', 'Two point conversion, pass'],
  ['rush_2pt', 'Two point conversion, rush'],
  ['rec_2pt', 'Two point conversion, catch'],
];

const KICKING_LABELS: [string, string][] = [
  ['fgm_0_19', 'Field goal, under 20'],
  ['fgm_20_29', 'Field goal, 20 to 29'],
  ['fgm_30_39', 'Field goal, 30 to 39'],
  ['fgm_40_49', 'Field goal, 40 to 49'],
  ['fgm_50_59', 'Field goal, 50 to 59'],
  ['fgm_60p', 'Field goal, 60 plus'],
  ['fgmiss', 'Missed field goal'],
  ['xpm', 'Extra point'],
  ['xpmiss', 'Missed extra point'],
];

const DEFENSE_LABELS: [string, string][] = [
  ['sack', 'Sack'],
  ['int', 'Interception'],
  ['fum_rec', 'Fumble recovery'],
  ['def_td', 'Defensive TD'],
  ['safe', 'Safety'],
  ['blk_kick', 'Blocked kick'],
  ['pts_allow_0', 'Shutout'],
  ['pts_allow_1_6', 'Allow 1 to 6'],
  ['pts_allow_7_13', 'Allow 7 to 13'],
  ['pts_allow_14_20', 'Allow 14 to 20'],
  ['pts_allow_28_34', 'Allow 28 to 34'],
  ['pts_allow_35p', 'Allow 35 plus'],
];

function ScoringTable({ title, labels }: { title: string; labels: [string, string][] }) {
  const rows = labels
    .map(([key, label]) => [label, league.scoring[key]] as const)
    .filter(([, value]) => typeof value === 'number');

  if (!rows.length) return null;

  return (
    <div className="snffl-rules-group">
      <h3 className="snffl-rules-subhead">{title}</h3>
      <div className="snffl-card">
        {rows.map(([label, value]) => (
          <div className="snffl-rules-row" key={label}>
            <span>{label}</span>
            <span className="snffl-numeric">{value > 0 ? `+${value}` : value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RulesPage() {
  const starters = league.rosterPositions.filter((p) => p !== 'BN' && p !== 'IR');
  const bench = league.rosterPositions.filter((p) => p === 'BN').length;
  const ir = league.rosterPositions.filter((p) => p === 'IR').length;

  return (
    <>
      <Chrome section="Rules" />
      <main className="snffl-page">
        <PageHead title="Rules" />
        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">League Setup</h2>
            <span className="snffl-block-heading-link">From Sleeper</span>
          </div>
          <div className="snffl-card">
            <div className="snffl-rules-row">
              <span>Teams</span>
              <span className="snffl-numeric">{league.teamCount}</span>
            </div>
            <div className="snffl-rules-row">
              <span>Playoff teams</span>
              <span className="snffl-numeric">{league.playoffTeams}</span>
            </div>
            <div className="snffl-rules-row">
              <span>Playoffs start</span>
              <span className="snffl-numeric">Week {league.playoffWeekStart}</span>
            </div>
            <div className="snffl-rules-row">
              <span>Starters</span>
              <span>{starters.join(', ')}</span>
            </div>
            <div className="snffl-rules-row">
              <span>Bench and IR</span>
              <span className="snffl-numeric">
                {bench} bench, {ir} IR
              </span>
            </div>
          </div>
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Scoring</h2>
            <span className="snffl-block-heading-link">Full PPR</span>
          </div>
          <ScoringTable title="Offense" labels={SCORING_LABELS} />
          <ScoringTable title="Kicking" labels={KICKING_LABELS} />
          <ScoringTable title="Defense and special teams" labels={DEFENSE_LABELS} />
        </section>

        {CUSTOM_RULES.map((section) => (
          <section key={section.title}>
            <div className="snffl-block-heading">
              <h2 className="snffl-headline">{section.title}</h2>
              <span className="snffl-block-heading-link">League rule</span>
            </div>
            <div className="snffl-card snffl-rules-card">
              {section.intro ? <p className="snffl-rules-intro">{section.intro}</p> : null}
              <ol className="snffl-rules-list">
                {section.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ol>
              <p className="snffl-rules-note">{CHUG_SUBMISSION}</p>
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
