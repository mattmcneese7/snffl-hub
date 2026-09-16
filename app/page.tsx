import Link from 'next/link';
import Chrome from '@/components/Chrome';
import FeatureMatchup from '@/components/FeatureMatchup';
import StandingsTable from '@/components/StandingsTable';
import YourMatchup from '@/components/YourMatchup';
import { toFeature } from '@/lib/feature';
import {
  getStandings,
  getTopPerformers,
  getWeekGames,
  matchupOfTheWeek,
  scoredWeek,
  teams,
} from '@/lib/league';

export default async function HomePage() {
  const week = await scoredWeek();
  const [games, standings, performers] = await Promise.all([
    getWeekGames(week),
    getStandings(),
    getTopPerformers(week),
  ]);

  const feature = matchupOfTheWeek(games);

  return (
    <>
      <Chrome section="Home" week={week} />
      <main className="snffl-page">
        <section>
          <div className="snffl-stories-rail">
            {teams.slice(0, 10).map((team, i) => (
              <div className="snffl-story-bubble" key={team.rosterId}>
                <div className={`snffl-story-ring${i < 3 ? ' snffl-story-ring-unwatched' : ''}`}>
                  {team.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={team.avatarUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="snffl-avatar-fallback" style={{ background: team.colors?.primary }}>
                      {team.manager.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="snffl-story-label">{team.manager}</div>
              </div>
            ))}
          </div>
        </section>

        {feature ? (
          <section>
            <div className="snffl-block-heading">
              <h2 className="snffl-headline">Matchup of the Week</h2>
            </div>
            <FeatureMatchup data={toFeature(feature, 'Closest Game')} />
          </section>
        ) : null}

        <div className="snffl-home-grid">
          <div>
            <section>
              <div className="snffl-block-heading">
                <h2 className="snffl-headline">Your Matchup</h2>
              </div>
              <YourMatchup
                options={games.map((g) => toFeature(g, 'Your Matchup'))}
                teams={teams.map((t) => ({
                  rosterId: t.rosterId,
                  teamName: t.teamName,
                  manager: t.manager,
                }))}
              />
            </section>

            <section>
              <div className="snffl-block-heading">
                <h2 className="snffl-headline">Top Performers</h2>
              </div>
              <div className="snffl-performers">
                {performers.map((player) => (
                  <div className="snffl-performer-card" key={player.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="snffl-performer-headshot" src={player.headshot} alt="" loading="lazy" />
                    <div className="snffl-performer-name">{player.name}</div>
                    <div className="snffl-performer-meta">
                      {player.position}
                      {player.team ? ` · ${player.team}` : ''}
                    </div>
                    <div className="snffl-performer-points snffl-numeric">
                      {player.points.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div>
            <section>
              <div className="snffl-block-heading">
                <h2 className="snffl-headline">Latest From The Rag</h2>
              </div>
              <div className="snffl-placeholder">
                <span className="snffl-placeholder-label">Checkpoint 6</span>
                <span className="snffl-placeholder-note">
                  The SquirtRag publishes Tuesdays at 9:00 AM Central once the writing pipeline
                  lands.
                </span>
              </div>
            </section>

            <section>
              <div className="snffl-block-heading">
                <h2 className="snffl-headline">The Feed</h2>
              </div>
              <div className="snffl-placeholder">
                <span className="snffl-placeholder-label">Checkpoint 7</span>
                <span className="snffl-placeholder-note">
                  Live alerts, C&apos;mon Man and Shart Watch arrive with the live layer.
                </span>
              </div>
            </section>

            <section>
              <div className="snffl-block-heading">
                <h2 className="snffl-headline">Standings</h2>
                <Link className="snffl-block-heading-link" href="/standings">
                  Full Table
                </Link>
              </div>
              <StandingsTable standings={standings} limit={8} />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
