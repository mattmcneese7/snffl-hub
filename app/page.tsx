import Link from 'next/link';
import Chrome from '@/components/Chrome';
import FeatureMatchup from '@/components/FeatureMatchup';
import HomeWidget from '@/components/HomeWidget';
import LiveRefresh from '@/components/LiveRefresh';
import Masthead from '@/components/Masthead';
import StoriesRail from '@/components/StoriesRail';
import TopPlays from '@/components/TopPlays';
import { firstNameOf } from '@/config/managers';
import { toReelClip } from '@/lib/reel-clips';
import PlayoffTitle from '@/components/PlayoffTitle';
import RagHero from '@/components/RagHero';
import ResultBug from '@/components/ResultBug';
import StandingsTable from '@/components/StandingsTable';
import YourMatchup from '@/components/YourMatchup';
import { getChugCounts } from '@/lib/awards';
import NflSlate from '@/components/NflSlate';
import { SourceStrip } from '@/components/SourceMark';
import { anyGameLive, ESPN_TEAM_LOGO, getNflScoreboard } from '@/lib/espn';
import { toFeature } from '@/lib/feature';
import { getFeedPosts } from '@/lib/feed';
import { getHighlights, isEspnClip } from '@/lib/highlights';
import { artForArticles, featuredPlayers } from '@/lib/story-images';
import {
  getPowerRankings,
  getStandings,
  getTopPerformers,
  getWeekGames,
  matchupOfTheWeek,
  scoredWeek,
  teamByRoster,
  teams,
} from '@/lib/league';
import {
  getMatchupContext,
  outlookOf,
  startersByNflTeam,
  winProbabilities,
} from '@/lib/matchup-live';
import { getPlayoffOdds } from '@/lib/playoff-odds';
import { publishedWeeks, readIssue } from '@/lib/rag';
import { getTrades } from '@/lib/trades';

const QUICK_LINKS = [
  { href: '/managers', label: 'Managers', note: 'All 14 teams' },
  { href: '/players', label: 'Players', note: 'Every rostered player' },
  { href: '/trades', label: 'Trades', note: 'Every deal this season' },
  { href: '/rules', label: 'Rules', note: 'Scoring and the chug rules' },
  { href: '/feed', label: 'The Feed', note: 'Live alerts' },
  { href: '/settings', label: 'Settings', note: 'Your team and theme' },
];

export default async function HomePage() {
  const week = await scoredWeek();
  const [games, standings, performers, rankings, odds, chugs, trades, nfl, livePosts, clips, ctx] =
    await Promise.all([
      getWeekGames(week),
      getStandings(),
      getTopPerformers(week),
      getPowerRankings(),
      getPlayoffOdds(),
      getChugCounts(),
      getTrades(),
      getNflScoreboard(),
      getFeedPosts(8),
      getHighlights(),
      getMatchupContext(week),
    ]);
  const models = winProbabilities(games, ctx);

  // Stories and Top Plays show only clips that play inside the site, ESPN's
  // syndicated ones. The NFL's YouTube clips can only link out, so they stay
  // in the Feed. The week in progress leads as soon as it has playable clips,
  // which makes the stories live game highlights on a Sunday; otherwise the
  // week before.
  const playableIn = async (w: number) =>
    (await getHighlights(w, 200)).filter((clip) => isEspnClip(clip.id));
  const thisWeekClips = await playableIn(week);
  const storyWeek = thisWeekClips.length || week === 1 ? week : week - 1;
  const storyClips = storyWeek === week ? thisWeekClips : await playableIn(storyWeek);

  // ESPN rather than the game status, which is derived from week arithmetic and
  // can read live on a week that merely has points on the board.
  const liveNow = anyGameLive(nfl);

  const ragWeeks = publishedWeeks();
  const latestRagWeek = ragWeeks.length ? ragWeeks[ragWeeks.length - 1] : null;
  const ragIssue = latestRagWeek ? readIssue(latestRagWeek) : null;
  // The Rag's art comes from its own week: its clips, else its top scorers.
  const [ragClips, ragFeatured] = latestRagWeek
    ? await Promise.all([getHighlights(latestRagWeek, 200), featuredPlayers(latestRagWeek)])
    : [[], []];

  const feature = matchupOfTheWeek(games);
  const topChuggers = chugs.filter((c) => c.count > 0).slice(0, 5);
  const latestTrade = trades[0];

  return (
    <>
      <Chrome section="Home" week={week} />
      <LiveRefresh live={liveNow} week={week} />
      <main className="snffl-page">
        {/* Manager stories: each manager's clips from the last finished week,
            played as a vertical story. */}
        <section className="snffl-home-section">
          <StoriesRail
            week={storyWeek}
            managers={teams.map((team) => ({
              rosterId: team.rosterId,
              firstName: firstNameOf(team.rosterId) ?? team.manager,
              avatarUrl: team.avatarUrl,
              color: team.colors?.primary ?? '#5d6a86',
              clips: storyClips
                .filter((clip) => clip.ownerTeamId === String(team.rosterId))
                .map((clip) => toReelClip(clip, firstNameOf(team.rosterId) ?? team.manager)),
            }))}
          />
        </section>

        <HomeWidget
          title={<Masthead />}
          href={latestRagWeek ? `/rag/${latestRagWeek}` : '/rag'}
          linkLabel={latestRagWeek ? `Week ${latestRagWeek} issue` : 'The section'}
        >
          <RagHero
            week={latestRagWeek}
            articles={ragIssue?.articles ?? []}
            stills={artForArticles(
              ragIssue?.articles ?? [],
              ragClips,
              Object.fromEntries(teams.map((t) => [String(t.rosterId), t.manager])),
              ragFeatured
            )}
          />
        </HomeWidget>

        {storyClips.length ? (
          <HomeWidget title="Top Plays" href="/feed" linkLabel="All highlights">
            <TopPlays
              week={storyWeek}
              clips={storyClips.slice(0, 12).map((clip) =>
                toReelClip(
                  clip,
                  clip.ownerTeamId ? (firstNameOf(Number(clip.ownerTeamId)) ?? null) : 'Free agent'
                )
              )}
            />
          </HomeWidget>
        ) : null}

        {feature ? (
          <HomeWidget title="Matchup of the Week" href={`/matchups/${week}`} linkLabel="All matchups">
            <FeatureMatchup
              data={toFeature(feature, 'Closest Game', models.get(feature.matchupId))}
            />
          </HomeWidget>
        ) : null}

        {/* Brief Section 40: during a live window Home carries a third column,
            the live Feed and NFL scores, alongside the matchups the left column
            already shows. Outside a live window it stays two columns. */}
        <div className={`snffl-home-grid${liveNow ? ' snffl-home-grid-gameday' : ''}`}>
          <div>
            <HomeWidget title="Your Matchup">
              <YourMatchup
                options={games.map((g) => toFeature(g, 'Your Matchup', models.get(g.matchupId)))}
                teams={teams.map((t) => ({
                  rosterId: t.rosterId,
                  teamName: t.teamName,
                  manager: t.manager,
                }))}
              />
            </HomeWidget>

            <HomeWidget title={`Week ${week} Scoreboard`} href={`/matchups/${week}`}>
              <div className="snffl-card">
                {games.map((game) => (
                  <ResultBug
                    game={game}
                    key={game.matchupId}
                    outlook={outlookOf(models.get(game.matchupId))}
                  />
                ))}
              </div>
              <SourceStrip
                items={[
                  { source: 'snffl', label: 'Win probability' },
                  { source: 'sleeper', label: 'Projections' },
                ]}
              />
            </HomeWidget>

            <HomeWidget title="Top Performers" href={`/players`} linkLabel="All players">
              <div className="snffl-performers">
                {performers.map((player) => (
                  <Link
                    className="snffl-performer-card"
                    href={`/players/${player.id}`}
                    key={player.id}
                  >
                    <span className="snffl-performer-face">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="snffl-performer-headshot"
                        src={player.headshot}
                        alt=""
                        loading="lazy"
                      />
                      {player.team && player.position !== 'DEF' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="snffl-performer-logo"
                          src={ESPN_TEAM_LOGO(player.team)}
                          alt=""
                          loading="lazy"
                        />
                      ) : null}
                    </span>
                    <span className="snffl-performer-name">{player.name}</span>
                    <span className="snffl-performer-meta">
                      {player.position}
                      {player.team ? ` · ${player.team}` : ''}
                    </span>
                    <span className="snffl-performer-points snffl-numeric">
                      {player.points.toFixed(2)}
                    </span>
                  </Link>
                ))}
              </div>
            </HomeWidget>
          </div>

          <div>
            <HomeWidget title="Power Rankings" href="/power-rankings">
              <div className="snffl-card">
                {rankings.slice(0, 3).map((entry) => (
                  <Link
                    className={`snffl-mini-row mgr-${entry.team.userId}`}
                    href={`/managers/${entry.team.rosterId}`}
                    key={entry.team.rosterId}
                  >
                    <span className="snffl-mini-rank snffl-numeric">{entry.rank}</span>
                    <span className="snffl-standings-colorbar" />
                    <span className="snffl-mini-body">
                      <span className="snffl-standings-team-name">{entry.team.teamName}</span>
                      <span className="snffl-standings-manager">{entry.team.manager}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </HomeWidget>

            <HomeWidget
              title={
                <span className="snffl-playoff-title snffl-playoff-title-compact">
                  <PlayoffTitle week={week} />
                </span>
              }
              href="/playoffs"
              linkLabel="Full tracker"
            >
              <div className="snffl-card">
                {odds.slice(0, 5).map((row) => (
                  <Link
                    className={`snffl-mini-row mgr-${row.team.userId}`}
                    href={`/managers/${row.rosterId}`}
                    key={row.rosterId}
                  >
                    <span className="snffl-standings-colorbar" />
                    <span className="snffl-mini-body">
                      <span className="snffl-standings-team-name">{row.team.teamName}</span>
                      <span className="snffl-standings-manager">{row.tag}</span>
                    </span>
                    <span className="snffl-mini-value snffl-numeric">
                      {row.makePlayoffs.toFixed(0)}%
                    </span>
                  </Link>
                ))}
              </div>
            </HomeWidget>

            <HomeWidget title="Chug Meter" href="/chug" linkLabel="Full meter">
              {topChuggers.length ? (
                <div className="snffl-card">
                  {topChuggers.map((entry) => {
                    const team = teamByRoster(entry.rosterId);
                    return (
                      <Link
                        className={`snffl-mini-row mgr-${team?.userId}`}
                        href={`/managers/${entry.rosterId}`}
                        key={entry.rosterId}
                      >
                        <span className="snffl-standings-colorbar" />
                        <span className="snffl-mini-body">
                          <span className="snffl-standings-team-name">{team?.teamName}</span>
                          <span className="snffl-standings-manager">{team?.manager}</span>
                        </span>
                        <span className="snffl-mini-value snffl-numeric">
                          {entry.count} {entry.count === 1 ? 'beer' : 'beers'}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="snffl-placeholder">
                  <span className="snffl-placeholder-label">Nobody owes yet</span>
                  <span className="snffl-placeholder-note">
                    Lowest score each week goes on the board.
                  </span>
                </div>
              )}
            </HomeWidget>

            {liveNow ? null : (
              <HomeWidget title="The Lines" href={`/matchups/${week}`} linkLabel="Full slate">
                <NflSlate
                  games={ctx.nfl}
                  lines={ctx.lines}
                  startersByTeam={startersByNflTeam(games)}
                  compact
                />
              </HomeWidget>
            )}

            <HomeWidget title="Standings" href="/standings" linkLabel="Full table">
              <StandingsTable standings={standings} />
            </HomeWidget>

            <HomeWidget title="Trade Desk" href="/trades" linkLabel="All trades">
              {latestTrade ? (
                <div className="snffl-card snffl-mini-trade">
                  <span className="snffl-week-tag">
                    <span>WEEK {latestTrade.week}</span>
                  </span>
                  <span className="snffl-mini-trade-teams">
                    {latestTrade.sides.map((side) => side.teamName).join(' and ')}
                  </span>
                </div>
              ) : (
                <div className="snffl-placeholder">
                  <span className="snffl-placeholder-label">No trades yet</span>
                  <span className="snffl-placeholder-note">Somebody make a move.</span>
                </div>
              )}
            </HomeWidget>
          </div>

          {/* Only while something is in play. Outside a live window this column
              does not render at all, so the grid stays two columns and nobody
              gets an empty Feed and a slate of scheduled kickoffs on Home. */}
          {liveNow ? (
            <div className="snffl-gameday-nfl">
              <HomeWidget title="Live Feed" href="/feed" linkLabel="Full feed">
                {livePosts.length ? (
                  <div className="snffl-card">
                    {livePosts.map((post) => (
                      <article className="snffl-feed-post" key={post.id}>
                        <div className="snffl-feed-post-head">
                          <span className="snffl-feed-post-title">{post.title}</span>
                        </div>
                        {post.body ? <p className="snffl-feed-post-body">{post.body}</p> : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="snffl-placeholder">
                    <span className="snffl-placeholder-label">Quiet so far</span>
                    <span className="snffl-placeholder-note">
                      Touchdowns and lead changes land here as they happen.
                    </span>
                  </div>
                )}
              </HomeWidget>

              <HomeWidget title="NFL Scores" href={`/matchups/${week}`} linkLabel="Full slate">
                <NflSlate
                  games={ctx.nfl}
                  lines={ctx.lines}
                  startersByTeam={startersByNflTeam(games)}
                  compact
                />
              </HomeWidget>
            </div>
          ) : null}
        </div>

        <HomeWidget title="Everything Else">
          <div className="snffl-quick-links">
            {QUICK_LINKS.map((link) => (
              <Link className="snffl-quick-link" href={link.href} key={link.href}>
                <span className="snffl-menu-label">{link.label}</span>
                <span className="snffl-menu-note">{link.note}</span>
              </Link>
            ))}
          </div>
        </HomeWidget>
      </main>
    </>
  );
}
