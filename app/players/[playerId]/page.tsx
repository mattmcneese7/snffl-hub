import { firstNameOf } from '@/config/managers';
import Link from 'next/link';
import Chrome from '@/components/Chrome';
import PointsByWeekChart from '@/components/PointsByWeekChart';
import { ESPN_CUTOUT } from '@/lib/espn';
import { league, teamByRoster } from '@/lib/league';
import { getPlayerSeason } from '@/lib/players';
import HighlightList from '@/components/HighlightList';
import { getHighlightsForPlayer } from '@/lib/highlights';
import SleeperActionButton from '@/components/SleeperAction';
import SourceMark, { PageSources } from '@/components/SourceMark';
import { dsRos, dsWeekly } from '@/lib/draftsharks';
import {
  formatMoneyline,
  gamesByTeam,
  getGameLines,
  getNflGames,
  impliedTeamTotal,
} from '@/lib/gameday';
import { formatStatLine, getWeekProjectionLines, getWeekStatLines } from '@/lib/sleeper-live';
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
  const [season, projections, statLines, nflWeek, clips] = await Promise.all([
    getPlayerSeason(playerId),
    getWeekProjectionLines(league.season, upcoming),
    getWeekStatLines(league.season, upcoming),
    getNflGames(upcoming, league.season),
    getHighlightsForPlayer(playerId),
  ]);
  const { player } = season;
  const projection = projections[playerId];
  const projected = projection?.stats.pts_ppr ?? null;
  const matchup = player.team ? gamesByTeam(nflWeek).get(player.team) : undefined;
  const lines = matchup ? await getGameLines(matchup.game.id, matchup.game.state === 'in') : null;
  const teamTotal = matchup ? impliedTeamTotal(lines ?? undefined, matchup.home) : null;
  const book = matchup && lines ? (matchup.home ? lines.home : lines.away) : null;
  const weekly = dsWeekly(playerId);
  const ros = dsRos(playerId);
  const actualLine = formatStatLine(player.position, statLines[playerId]?.stats);
  const projectedLine = formatStatLine(player.position, projection?.stats, true);
  const injury = projection?.injury ?? null;
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
            <h2 className="snffl-headline">Week {upcoming}</h2>
            {injury ? <span className="snffl-mu-injury">{injury}</span> : null}
          </div>
          <div className="snffl-card snffl-week-card">
            {matchup ? (
              <div className="snffl-week-card-head">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="snffl-week-card-opp" src={matchup.opponent.logo} alt="" />
                <div className="snffl-week-card-title">
                  <strong>
                    {matchup.home ? 'vs' : 'at'} {matchup.opponent.name}
                  </strong>
                  <span>
                    {matchup.game.state === 'pre'
                      ? new Intl.DateTimeFormat('en-US', {
                          weekday: 'long',
                          hour: 'numeric',
                          minute: '2-digit',
                          timeZone: 'America/Chicago',
                        }).format(new Date(matchup.game.kickoff))
                      : `${matchup.game.status}, ${matchup.team.abbr} ${matchup.team.score ?? 0} ${matchup.opponent.abbr} ${matchup.opponent.score ?? 0}`}
                    {matchup.game.broadcast ? `, ${matchup.game.broadcast}` : ''}
                  </span>
                </div>
              </div>
            ) : (
              <p className="snffl-week-card-note">No game this week.</p>
            )}

            <div className="snffl-week-card-grid">
              <div className="snffl-week-card-cell">
                <span className="snffl-label">Projected</span>
                <span className="snffl-numeric">{projected != null ? projected.toFixed(1) : 'None'}</span>
              </div>
              <div className="snffl-week-card-cell">
                <span className="snffl-label">DS range</span>
                <span className="snffl-numeric">
                  {weekly?.floor != null && weekly?.ceiling != null
                    ? `${weekly.floor.toFixed(1)} to ${weekly.ceiling.toFixed(1)}`
                    : 'None'}
                </span>
              </div>
              <div className="snffl-week-card-cell">
                <span className="snffl-label">DS week rank</span>
                <span className="snffl-numeric">
                  {weekly ? `${weekly.position}${weekly.posRank}` : 'Unranked'}
                </span>
              </div>
              <div className="snffl-week-card-cell">
                <span className="snffl-label">Team total</span>
                <span className="snffl-numeric">{teamTotal != null ? teamTotal : 'None'}</span>
              </div>
            </div>

            {lines && matchup && matchup.game.state !== 'post' ? (
              <p className="snffl-week-card-note">
                {lines.details ? `${lines.details}, ` : ''}
                {lines.overUnder != null ? `O/U ${lines.overUnder}` : ''}
                {book?.moneyline != null ? `, ${player.team} ML ${formatMoneyline(book.moneyline)}` : ''}
                {book?.implied != null ? `, ${Math.round(book.implied * 100)}% to win` : ''}
              </p>
            ) : null}
            {actualLine ? (
              <p className="snffl-week-card-note">
                <strong>So far:</strong> {actualLine}
              </p>
            ) : projectedLine ? (
              <p className="snffl-week-card-note">
                <strong>Projected line:</strong> {projectedLine}
              </p>
            ) : null}

            <div className="snffl-source-strip">
              <SourceMark source="sleeper" label="Projection" />
              <SourceMark source="draftsharks" label="Range" />
              {lines ? <SourceMark source="draftkings" label="Line" /> : null}
            </div>
          </div>
        </section>

        {ros ? (
          <section>
            <div className="snffl-block-heading">
              <h2 className="snffl-headline">Rest of Season</h2>
              <span className="snffl-block-heading-link">DraftSharks</span>
            </div>
            <div className="snffl-card snffl-week-card">
              <div className="snffl-week-card-grid">
                <div className="snffl-week-card-cell">
                  <span className="snffl-label">Overall</span>
                  <span className="snffl-numeric">#{ros.rank}</span>
                </div>
                <div className="snffl-week-card-cell">
                  <span className="snffl-label">Position</span>
                  <span className="snffl-numeric">
                    {ros.position}
                    {ros.posRank}
                  </span>
                </div>
                <div className="snffl-week-card-cell">
                  <span className="snffl-label">Per game</span>
                  <span className="snffl-numeric">{ros.projection?.toFixed(1) ?? 'None'}</span>
                </div>
                <div className="snffl-week-card-cell">
                  <span className="snffl-label">3D Value</span>
                  <span className="snffl-numeric">{ros.value ?? 'None'}</span>
                </div>
              </div>
              <p className="snffl-week-card-note">
                {ros.floor != null && ros.ceiling != null
                  ? `Weekly range ${ros.floor.toFixed(1)} to ${ros.ceiling.toFixed(1)}. `
                  : ''}
                {ros.injuryRisk != null ? `Injury risk ${Math.round(ros.injuryRisk * 100)}%. ` : ''}
                {ros.sos != null
                  ? `Schedule factor ${ros.sos >= 0 ? '+' : ''}${(ros.sos * 100).toFixed(1)}%.`
                  : ''}
              </p>
              <div className="snffl-source-strip">
                <SourceMark source="draftsharks" label="Rankings" />
              </div>
            </div>
          </section>
        ) : null}

        {clips.length ? (
          <section>
            <div className="snffl-block-heading">
              <h2 className="snffl-headline">Highlights</h2>
              <span className="snffl-block-heading-link">{clips.length} clips</span>
            </div>
            <HighlightList
              clips={clips}
              managers={owner ? { [String(owner.rosterId)]: firstNameOf(owner.rosterId) ?? owner.manager } : {}}
              title={`${player.name} Highlights`}
            />
          </section>
        ) : null}

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
          <div className="snffl-sleeper-actions">
            {owner ? (
              <SleeperActionButton action="trades" label="Trade for him in Sleeper" />
            ) : (
              <SleeperActionButton action="players" label="Add him in Sleeper" />
            )}
          </div>
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
        <PageSources
          items={[
            { source: 'sleeper', label: 'Season stats' },
            { source: 'youtube', label: 'Highlights' },
          ]}
        />
      </main>
    </>
  );
}
