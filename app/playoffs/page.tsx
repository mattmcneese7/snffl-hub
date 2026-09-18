import ManagerLink from '@/components/ManagerLink';
import { SourceStrip } from '@/components/SourceMark';
import Link from 'next/link';
import Bracket from '@/components/Bracket';
import Chrome from '@/components/Chrome';
import PlayoffTitle from '@/components/PlayoffTitle';
import { league, scoredWeek, teamByRoster } from '@/lib/league';
import { getPlayoffOdds } from '@/lib/playoff-odds';
import { getPostseason } from '@/lib/postseason';

const TAG_CLASS: Record<string, string> = {
  Clinched: 'snffl-odds-tag-clinched',
  'Clinch Watch': 'snffl-odds-tag-watch',
  Bubble: 'snffl-odds-tag-bubble',
  'In Trouble': 'snffl-odds-tag-trouble',
  Eliminated: 'snffl-odds-tag-out',
};

export default async function PlayoffsPage() {
  const week = await scoredWeek();
  const postseason = week >= league.playoffWeekStart;
  const [odds, bracket] = await Promise.all([getPlayoffOdds(), getPostseason()]);

  const champion = bracket.championRosterId ? teamByRoster(bracket.championRosterId) : null;
  const shartTeam = bracket.shartRosterId ? teamByRoster(bracket.shartRosterId) : null;

  return (
    <>
      <Chrome section="Playoff Tracker" />
      <main className="snffl-page">
        <section>
          <div className="snffl-playoff-head">
            <h2 className="snffl-headline snffl-playoff-title">
              <PlayoffTitle week={week} />
            </h2>
          </div>
          <p className="snffl-menu-note">
            SNFFL odds, from our own simulation of the rest of the season. Not Sleeper&apos;s
            numbers.
          </p>
        </section>

        {/* From Week 15 this page leads with the bracket, per Brief Section 2.
            Before then the odds stay on top and the bracket sits underneath,
            because Sleeper seeds it early and it is worth looking at. */}
        {postseason ? (
          <>
            {champion ? (
              <section>
                <div className="snffl-champion">
                  <span className="snffl-champion-label">Champion</span>
                  <ManagerLink rosterId={champion.rosterId} className="snffl-headline snffl-champion-name">
                    {champion.teamName}
                  </ManagerLink>
                  <ManagerLink rosterId={champion.rosterId} className="snffl-standings-manager">
                    {champion.manager}
                  </ManagerLink>
                </div>
              </section>
            ) : null}

            <section>
              <div className="snffl-block-heading">
                <h2 className="snffl-headline">Postseason Breakdown</h2>
                <span className="snffl-block-heading-link">Top {league.playoffTeams}</span>
              </div>
              <Bracket
                rounds={bracket.rounds}
                byeRosterIds={bracket.byeRosterIds}
                emptyNote="Sleeper publishes the bracket once the playoff field is set."
              />
            </section>

            <section>
              <div className="snffl-block-heading">
                <h2 className="snffl-headline">The Shart Bowl</h2>
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
            </section>
          </>
        ) : null}

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Odds To Make The Playoffs</h2>
            <span className="snffl-block-heading-link">Top {league.playoffTeams} qualify</span>
          </div>
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
                <span className="snffl-odds-pct snffl-numeric">
                  {row.makePlayoffs.toFixed(1)}%
                </span>
              </Link>
            ))}
          </div>
          <p className="snffl-chug-axis-note">
            Ten thousand simulated seasons, using scoring averages and week to week swing.
          </p>
          <SourceStrip
            items={[
              { source: 'snffl', label: 'Playoff odds' },
              { source: 'sleeper', label: 'Schedule and results' },
            ]}
          />
        </section>

        {/* Before the playoffs the bracket is still worth a look: Sleeper seeds
            it from the current standings, so it shows who would play whom. */}
        {!postseason ? (
          <section>
            <div className="snffl-block-heading">
              <h2 className="snffl-headline">If The Season Ended Today</h2>
              <span className="snffl-block-heading-link">Week {league.playoffWeekStart} start</span>
            </div>
            <Bracket
              rounds={bracket.rounds}
              byeRosterIds={bracket.byeRosterIds}
              emptyNote="Sleeper publishes the bracket once the playoff field is set."
            />
          </section>
        ) : null}
      </main>
    </>
  );
}
