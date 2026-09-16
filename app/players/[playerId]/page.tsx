import Link from 'next/link';
import Chrome from '@/components/Chrome';
import PointsByWeekChart from '@/components/PointsByWeekChart';
import { ESPN_CUTOUT } from '@/lib/espn';
import { league, teamByRoster } from '@/lib/league';
import { getPlayerSeason } from '@/lib/players';
import { getWeekProjections } from '@/lib/projections';
import { statBlocksFor, statsFor } from '@/lib/stats';
import { teamPaint } from '@/config/nfl-colors';

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  // state.week is the week actually in progress. display_week lags it, and
  // projecting off the lagging value would show last week as next week.
  const upcoming = league.state.week;
  const [season, projections] = await Promise.all([
    getPlayerSeason(playerId),
    getWeekProjections(league.season, upcoming),
  ]);
  const { player } = season;
  const projected = projections[playerId];
  const blocks = statBlocksFor(player.position, statsFor(playerId));
  const paint = teamPaint(player.team);
  const owner = season.ownerRosterId ? teamByRoster(season.ownerRosterId) : null;

  // ESPN cutout when the nflverse map has an id, Sleeper headshot otherwise.
  const portrait = player.espnId ? ESPN_CUTOUT(player.espnId) : player.headshot;
  const best = season.weeks.reduce((max, w) => (w.points > max ? w.points : max), 0);

  return (
    <>
      <Chrome section="Players" sub={player.position} />
      <main className="snffl-page">
        {/* The player's NFL team, not the manager who owns them: Derrick Henry
            reads as Ravens purple whoever has him on their roster. */}
        <section
          className="snffl-profile-hero snffl-player-hero"
          style={{ background: paint.background, color: paint.on }}
        >
          {player.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="snffl-player-watermark" src={player.logo} alt="" aria-hidden />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="snffl-player-cutout" src={portrait} alt="" />
          <div>
            <h1 className="snffl-headline snffl-profile-name">{player.name}</h1>
            <p className="snffl-player-chip">
              {player.position}
              {player.team ? ` · ${player.team}` : ''}
            </p>
          </div>
        </section>

        <section className="snffl-stat-tiles">
          <div className="snffl-stat-tile">
            <span className="snffl-stat-label">Season</span>
            <span className="snffl-stat-value snffl-numeric">{season.totalPoints.toFixed(1)}</span>
          </div>
          <div className="snffl-stat-tile">
            <span className="snffl-stat-label">Started</span>
            <span className="snffl-stat-value snffl-numeric">{season.startedPoints.toFixed(1)}</span>
          </div>
          <div className="snffl-stat-tile">
            <span className="snffl-stat-label">Best Week</span>
            <span className="snffl-stat-value snffl-numeric">{best.toFixed(1)}</span>
          </div>
          <div className="snffl-stat-tile">
            <span className="snffl-stat-label">Games</span>
            <span className="snffl-stat-value snffl-numeric">{season.weeks.length}</span>
          </div>
        </section>

        {blocks.length ? (
          <section>
            <div className="snffl-block-heading">
              <h2 className="snffl-headline">Season Stats</h2>
            </div>
            <div className="snffl-stat-blocks">
              {blocks.map((block) => (
                <div className="snffl-stat-block" key={block.title}>
                  <h3 className="snffl-stat-block-title">{block.title}</h3>
                  <div className="snffl-stat-grid">
                    {block.lines.map((entry) => (
                      <div className="snffl-stat-pair" key={entry.label}>
                        <span className="snffl-stat-pair-label">{entry.label}</span>
                        <span className="snffl-stat-pair-value snffl-numeric">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Week {upcoming} Projection</h2>
          </div>
          <div className="snffl-stat-block">
            {projected != null ? (
              <div className="snffl-stat-grid">
                <div className="snffl-stat-pair">
                  <span className="snffl-stat-pair-label">Projected Points</span>
                  <span className="snffl-stat-pair-value snffl-numeric">
                    {projected.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              // Roughly 475 of 3305 rows carry a projection, so most bench
              // players have none. Saying so beats printing a confident 0.00.
              <p className="snffl-projection-note">
                No projection published for Week {upcoming}.
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Rostered By</h2>
          </div>
          {owner ? (
            <Link className={`snffl-card snffl-roster-row mgr-${owner.userId}`} href={`/managers/${owner.rosterId}`}>
              <span className="snffl-standings-colorbar" />
              <span>
                <span className="snffl-lineup-name">{owner.teamName}</span>
                <span className="snffl-lineup-meta">{owner.manager}</span>
              </span>
              <span className="snffl-menu-arrow" aria-hidden>
                &rsaquo;
              </span>
            </Link>
          ) : (
            <div className="snffl-placeholder">
              <span className="snffl-placeholder-label">Free agent</span>
              <span className="snffl-placeholder-note">Nobody has claimed this one.</span>
            </div>
          )}
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Points By Week</h2>
          </div>
          <div className="snffl-card snffl-chart-card">
            <PointsByWeekChart
              points={season.weeks.map((w) => ({ week: w.week, points: w.points, won: w.started }))}
              playoffWeekStart={league.playoffWeekStart}
            />
          </div>
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Game Log</h2>
          </div>
          <div className="snffl-card">
            {season.weeks.length === 0 ? (
              <div className="snffl-rules-row">
                <span className="snffl-menu-note">No scored weeks yet.</span>
              </div>
            ) : (
              season.weeks.map((week) => (
                <div className="snffl-rules-row" key={week.week}>
                  <span>
                    Week {week.week}
                    <span className="snffl-menu-note">{week.started ? 'Started' : 'Benched'}</span>
                  </span>
                  <span className="snffl-numeric">{week.points.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </>
  );
}
