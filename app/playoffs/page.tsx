import Link from 'next/link';
import Chrome from '@/components/Chrome';
import PlayoffTitle from '@/components/PlayoffTitle';
import { league, scoredWeek } from '@/lib/league';
import { getPlayoffOdds } from '@/lib/playoff-odds';

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
  const odds = await getPlayoffOdds();

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

        {postseason ? (
          <section>
            <div className="snffl-placeholder">
              <span className="snffl-placeholder-label">Checkpoint 9</span>
              <span className="snffl-placeholder-note">
                From Week {league.playoffWeekStart} this page becomes the Postseason Breakdown with
                the bracket and the Shart Bowl.
              </span>
            </div>
          </section>
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
        </section>
      </main>
    </>
  );
}
