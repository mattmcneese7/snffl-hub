import ManagerLink from '@/components/ManagerLink';
import { PageSources } from '@/components/SourceMark';
import Link from 'next/link';
import Bracket from '@/components/Bracket';
import Chrome from '@/components/Chrome';
import PageHead from '@/components/PageHead';
import PowerRankRow from '@/components/PowerRankRow';
import StandingsTable from '@/components/StandingsTable';
import { getPowerRankings, getStandings, league, scoredWeek, teamByRoster } from '@/lib/league';
import { getPlayoffOdds } from '@/lib/playoff-odds';
import { getPostseason } from '@/lib/postseason';
import { getPickupCounts } from '@/lib/transactions';
import { getTrophyBoard } from '@/lib/trophies';

/**
 * Where everyone stands.
 *
 * This was three pages, and they were three answers to one question. The
 * table says who is winning, the rankings say who is actually good, and the
 * odds say who plays in January; nobody opens one of those without wanting
 * the other two, and splitting them across three entries in a menu made the
 * reader do the joining. One page, three sections, in the order the question
 * gets asked.
 */
const TAG_CLASS: Record<string, string> = {
  Clinched: 'snffl-odds-tag-clinched',
  'Clinch Watch': 'snffl-odds-tag-watch',
  Bubble: 'snffl-odds-tag-bubble',
  'In Trouble': 'snffl-odds-tag-trouble',
  Eliminated: 'snffl-odds-tag-out',
};

const SECTIONS = [
  { id: 'table', label: 'Standings' },
  { id: 'power', label: 'Power' },
  { id: 'playoffs', label: 'Playoffs' },
];

export default async function StandingsPage() {
  const week = await scoredWeek();
  const postseason = week >= league.playoffWeekStart;

  const [standings, pickups, trophies, rankings, odds, bracket] = await Promise.all([
    getStandings(),
    getPickupCounts(),
    getTrophyBoard(),
    getPowerRankings(),
    getPlayoffOdds(),
    getPostseason(),
  ]);

  const totalAdds = Object.values(pickups).reduce((sum, p) => sum + p.total, 0);
  const champion = bracket.championRosterId ? teamByRoster(bracket.championRosterId) : null;
  const shartTeam = bracket.shartRosterId ? teamByRoster(bracket.shartRosterId) : null;

  return (
    <>
      <Chrome section="Standings" />
      <main className="snffl-page">
        <PageHead title="Standings" />

        {/* Three sections is enough to scroll past, so the page says what is
            on it and lets you jump. Plain anchors: no JavaScript, and the
            browser handles the scrolling and the history. */}
        <nav className="snffl-jump" aria-label="Sections on this page">
          {SECTIONS.map((section) => (
            <a className="snffl-jump-link" href={`#${section.id}`} key={section.id}>
              {section.label}
            </a>
          ))}
        </nav>

        <section id="table" className="snffl-anchor">
        {/* No heading: the masthead above already says Standings, and giving
            this section a second name only to avoid repeating the first one is
            how you end up calling a league table The Table. */}
          <StandingsTable standings={standings} pickups={pickups} holders={trophies.holders} />
          <p className="snffl-chug-axis-note">
            Top {league.playoffTeams} qualify. PF is points for, PA is points against. Adds
            counts waiver claims and free agent pickups, {totalAdds} across the league so far.
          </p>
        </section>

        <section id="power" className="snffl-anchor">
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Power Rankings</h2>
            <span className="snffl-block-heading-link">Our order, not the table&apos;s</span>
          </div>
          <div className="snffl-card">
            {rankings.map((entry) => (
              <PowerRankRow key={entry.team.rosterId} entry={entry} />
            ))}
          </div>
        </section>

        <section id="playoffs" className="snffl-anchor">
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Playoff Picture</h2>
            <span className="snffl-block-heading-link">Top {league.playoffTeams} qualify</span>
          </div>

          {/* Once the bracket is real it leads, per Brief Section 2. Before
              then the odds lead and the bracket sits under them, because
              Sleeper seeds it early and it is worth looking at. */}
          {postseason && champion ? (
            <div className="snffl-champion">
              <span className="snffl-champion-label">Champion</span>
              <ManagerLink
                rosterId={champion.rosterId}
                className="snffl-headline snffl-champion-name"
              >
                {champion.teamName}
              </ManagerLink>
              <ManagerLink rosterId={champion.rosterId} className="snffl-standings-manager">
                {champion.manager}
              </ManagerLink>
            </div>
          ) : null}

          {postseason ? (
            <Bracket
              rounds={bracket.rounds}
              byeRosterIds={bracket.byeRosterIds}
              emptyNote="Sleeper publishes the bracket once the playoff field is set."
            />
          ) : null}

          <div className="snffl-card">
            {odds.map((row) => (
              <Link
                className={`snffl-odds-row mgr-${row.team.userId}`}
                href={`/managers/${row.rosterId}`}
                key={row.rosterId}
              >
                <span className="snffl-standings-colorbar" />
                <span className="snffl-odds-team">
                  <span className="snffl-standings-team-name">{row.team.teamName}</span>
                  <span className="snffl-standings-manager">
                    {row.team.manager} &middot; {row.team.wins}-{row.team.losses}
                  </span>
                </span>
                <span className={`snffl-odds-tag ${TAG_CLASS[row.tag] ?? ''}`}>
                  <span>{row.tag}</span>
                </span>
                <span className="snffl-odds-pct snffl-numeric">{row.makePlayoffs.toFixed(1)}%</span>
              </Link>
            ))}
          </div>
          <p className="snffl-chug-axis-note">
            Ten thousand simulated seasons, using scoring averages and week to week swing. Our
            numbers, not Sleeper&apos;s.
          </p>

          {!postseason ? (
            <div className="snffl-sub-block">
              <div className="snffl-block-heading">
                <h3 className="snffl-headline">If The Season Ended Today</h3>
                <span className="snffl-block-heading-link">
                  Week {league.playoffWeekStart} start
                </span>
              </div>
              <Bracket
                rounds={bracket.rounds}
                byeRosterIds={bracket.byeRosterIds}
                emptyNote="Sleeper publishes the bracket once the playoff field is set."
              />
            </div>
          ) : null}

          {postseason ? (
            <div className="snffl-sub-block">
              <div className="snffl-block-heading">
                <h3 className="snffl-headline">The Shart Bowl</h3>
                {shartTeam ? (
                  <ManagerLink rosterId={shartTeam.rosterId} className="snffl-block-heading-link">
                    {shartTeam.manager} chugs
                  </ManagerLink>
                ) : null}
              </div>
              <p className="snffl-menu-note">
                The losers bracket. Whoever loses it finishes last and owes the season&apos;s final
                chug.
              </p>
              <Bracket
                rounds={bracket.shartBowl}
                emptyNote="The losers bracket fills in once the regular season ends."
              />
            </div>
          ) : null}

        </section>
        <PageSources
          items={[
            { source: 'sleeper', label: 'Records and points' },
            { source: 'snffl', label: 'Rankings' },
            { source: 'sleeper', label: 'Scores' },
            { source: 'snffl', label: 'Playoff odds' },
            { source: 'sleeper', label: 'Schedule and results' },
          ]}
        />
      </main>
    </>
  );
}
