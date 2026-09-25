import Link from 'next/link';
import Chrome from '@/components/Chrome';
import FeatureMatchup from '@/components/FeatureMatchup';
import HomeWidget from '@/components/HomeWidget';
import LiveRefresh from '@/components/LiveRefresh';
import ManagerLink from '@/components/ManagerLink';
import ShartZone from '@/components/ShartZone';
import { HardwareStrip } from '@/components/TrophyBits';
import { getTrophyBoard } from '@/lib/trophies';
import StoriesRail from '@/components/StoriesRail';
import TopPlays from '@/components/TopPlays';
import { firstNameOf } from '@/config/managers';
import { toReelClip, weekCardClip } from '@/lib/reel-clips';
import RagHero from '@/components/RagHero';
import ResultBug from '@/components/ResultBug';
import YourMatchup from '@/components/YourMatchup';
import { getChugCounts } from '@/lib/awards';
import NflSlate from '@/components/NflSlate';
import { PageSources } from '@/components/SourceMark';
import { anyGameLive, ESPN_TEAM_LOGO, getNflScoreboard } from '@/lib/espn';
import { toFeature } from '@/lib/feature';
import { getFeedPosts } from '@/lib/feed';
import { getHighlights, isEspnClip, isRelevantClip } from '@/lib/highlights';
import { artForArticles, featuredPlayers } from '@/lib/story-images';
import {
  allPlayers,
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
import { photosForWeek } from '@/lib/game-photos';
import FeedDigest from '@/components/FeedDigest';
import SquirtSays, { SquirtHead } from '@/components/SquirtSays';
import { leagueVerdicts, oracleFor } from '@/lib/squirt-says';
import { buildFeed } from '@/lib/feed-view';
import type { Game, GameSide } from '@/lib/types';

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
  const [games, standings, performers, rankings, odds, chugs, trades, nfl, livePosts, clips, ctx, trophies] =
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
      getTrophyBoard(),
    ]);
  const models = winProbabilities(games, ctx);

  // The Shartzone: every week's Shart, newest first, the latest one chugging.
  const nameOf = (rosterId: number) => firstNameOf(rosterId) ?? teamByRoster(rosterId)?.manager ?? '';
  const sharts = trophies.all
    .filter((award) => award.kind === 'shart' && award.week != null)
    .map((award) => ({
      week: award.week!,
      rosterId: award.rosterId,
      firstName: nameOf(award.rosterId),
      teamName: teamByRoster(award.rosterId)?.teamName ?? '',
      avatarUrl: teamByRoster(award.rosterId)?.avatarUrl ?? null,
      points: award.value,
    }));
  const firstNames = Object.fromEntries(teams.map((t) => [t.rosterId, nameOf(t.rosterId)]));

  // Stories and Top Plays show only clips that play inside the site, ESPN's
  // syndicated ones. The NFL's YouTube clips can only link out, so they stay
  // in the Feed. The week in progress leads as soon as it has playable clips,
  // which makes the stories live game highlights on a Sunday; otherwise the
  // week before.
  const fantasyIds = new Set(
    allPlayers()
      .filter((player) => ['QB', 'RB', 'WR', 'TE', 'K'].includes(player.position))
      .map((player) => player.id)
  );
  const playableIn = async (w: number) =>
    (await getHighlights(w, 200)).filter(
      (clip) => isEspnClip(clip.id) && isRelevantClip(clip, (id) => fantasyIds.has(id))
    );
  const thisWeekClips = await playableIn(week);
  const storyWeek = thisWeekClips.length || week === 1 ? week : week - 1;
  const storyClips = storyWeek === week ? thisWeekClips : await playableIn(storyWeek);
  // The card that closes every manager's story prefers his last finished
  // matchup, per manager. A week in progress is not a result: a card reading
  // "beat Adam 35.30 to 18.48" off one running back is a scoreboard mid
  // quarter dressed up as a verdict. If nothing of his is final yet, the card
  // says who is ahead and says it is still being played.
  const storyGames = storyWeek === week ? games : await getWeekGames(storyWeek);
  const priorGames = storyWeek > 1 ? await getWeekGames(storyWeek - 1) : [];
  type CardSide = { side: GameSide; opponent: GameSide; status: Game['status']; week: number };
  const sidesOf = (list: typeof storyGames, atWeek: number) => {
    const out = new Map<number, CardSide>();
    for (const game of list) {
      out.set(game.home.rosterId, { side: game.home, opponent: game.away, status: game.status, week: atWeek });
      out.set(game.away.rosterId, { side: game.away, opponent: game.home, status: game.status, week: atWeek });
    }
    return out;
  };
  const thisWeekSides = sidesOf(storyGames, storyWeek);
  const priorSides = sidesOf(priorGames, storyWeek - 1);
  const cardFor = (rosterId: number): CardSide | null => {
    const current = thisWeekSides.get(rosterId) ?? null;
    const prior = priorSides.get(rosterId) ?? null;
    if (current?.status === 'final') return current;
    if (prior?.status === 'final') return prior;
    // Nothing finished yet, so his game in progress is the honest card.
    if (current && (current.side.points > 0 || current.opponent.points > 0)) return current;
    return prior ?? current;
  };

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

  // Squirt Says: the week read forwards, before anybody can fix it.
  const oracle = await oracleFor(week);
  const sayings = leagueVerdicts(oracle.sides, oracle.input);

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
              clips: (() => {
                const name = firstNameOf(team.rosterId) ?? team.manager;
                const reels = storyClips
                  .filter((clip) => clip.ownerTeamId === String(team.rosterId))
                  .map((clip) => toReelClip(clip, name));
                const own = cardFor(team.rosterId);
                // His week closes the story, and is the whole of it when ESPN
                // has no clip of anybody he started.
                return own
                  ? [
                      ...reels,
                      weekCardClip(own.side, own.opponent, name, nameOf(own.opponent.rosterId), own.week, own.status),
                    ]
                  : reels;
              })(),
            }))}
          />
        </section>

        <HomeWidget
          title={<span className="snffl-rag-wordmark">The Rag</span>}
          href={latestRagWeek ? `/rag/${latestRagWeek}` : '/rag'}
          linkLabel={latestRagWeek ? `Week ${latestRagWeek}` : 'The section'}
        >
          <RagHero
            week={latestRagWeek}
            articles={ragIssue?.articles ?? []}
            stills={artForArticles(
              ragIssue?.articles ?? [],
              ragClips,
              Object.fromEntries(teams.map((t) => [String(t.rosterId), t.manager])),
              ragFeatured,
              latestRagWeek ? photosForWeek(latestRagWeek) : []
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
          <HomeWidget title="Featured" href={`/matchups/${week}`} linkLabel="Full scoreboard">
            <FeatureMatchup
              data={toFeature(feature, 'Closest Game', models.get(feature.matchupId))}
            />
          </HomeWidget>
        ) : null}

        {trophies.latest.length ? (
          <HomeWidget title="Hardware" href="/managers" linkLabel="Trophy cases">
            <HardwareStrip awards={trophies.latest} names={firstNames} />
          </HomeWidget>
        ) : null}

        {/* The wall of shame, right under the week's hardware. */}
        <ShartZone current={sharts[0] ?? null} wall={sharts} />

        {/* Brief Section 40: during a live window Home carries a third column,
            the live Feed and NFL scores, alongside the matchups the left column
            already shows. Outside a live window it stays two columns. */}
        <div className={`snffl-home-grid${liveNow ? ' snffl-home-grid-gameday' : ''}`}>
          <div>
            <HomeWidget title="Your Game">
              <YourMatchup
                options={games.map((g) => toFeature(g, '', models.get(g.matchupId)))}
                teams={teams.map((t) => ({
                  rosterId: t.rosterId,
                  teamName: t.teamName,
                  manager: t.manager,
                }))}
              />
            </HomeWidget>

            <HomeWidget title="Scoreboard" href={`/matchups/${week}`}>
              <div className="snffl-card">
                {games.map((game) => (
                  <ResultBug
                    game={game}
                    key={game.matchupId}
                    outlook={outlookOf(models.get(game.matchupId))}
                  />
                ))}
              </div>
            </HomeWidget>

            <HomeWidget title="Top Scorers" href={`/players`} linkLabel="All players">
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
            {/* The Feed is a section of its own, so it sits here every day
                rather than only while a game is on. */}
            <HomeWidget title="The Feed" href="/feed" linkLabel="Everything">
              <FeedDigest items={buildFeed(livePosts, []).slice(0, 5)} />
            </HomeWidget>

            <HomeWidget
              title={<SquirtHead count={Math.min(sayings.length, 4)} week={week} />}
              href={`/matchups/${week}`}
              linkLabel="Every lineup"
            >
              <div className="snffl-card">
                <SquirtSays verdicts={sayings} week={week} limit={4} head={false} />
              </div>
            </HomeWidget>

            {/* One section for where everyone stands, holding the three
                modules that used to be three separate widgets scattered down
                the column. Each one opens its own part of the page. */}
            <HomeWidget title="Standings" href="/standings" linkLabel="Full table">
              <div className="snffl-stack">
                <div>
                  <Link className="snffl-sub-head" href="/standings#table">
                    Standings
                  </Link>
                  <div className="snffl-card">
                    {standings.slice(0, 4).map((team) => (
                      <Link
                        className={`snffl-mini-row mgr-${team.userId}`}
                        href={`/managers/${team.rosterId}`}
                        key={team.rosterId}
                      >
                        <span className="snffl-mini-rank snffl-numeric">{team.seed}</span>
                        <span className="snffl-standings-colorbar" />
                        <span className="snffl-mini-body">
                          <span className="snffl-standings-team-name">{team.teamName}</span>
                          <span className="snffl-standings-manager">{team.manager}</span>
                        </span>
                        <span className="snffl-mini-value snffl-numeric">
                          {team.wins}-{team.losses}
                          {team.ties ? `-${team.ties}` : ''}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <Link className="snffl-sub-head" href="/standings#power">
                    Power Rankings
                  </Link>
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
                </div>

                <Link className="snffl-module-button" href="/standings#playoffs">
                  <span>Playoff Picture</span>
                  <span className="snffl-module-button-note">Odds for all {odds.length}</span>
                </Link>
              </div>
            </HomeWidget>

            <HomeWidget title="The Chug" href="/chug" linkLabel="Full meter">
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
              <HomeWidget title="NFL Scores" href={`/matchups/${week}`} linkLabel="Full slate">
                <NflSlate
                  games={ctx.nfl}
                  lines={ctx.lines}
                  startersByTeam={startersByNflTeam(games)}
                  compact
                />
              </HomeWidget>
            )}

            <HomeWidget title="Trades" href="/trades" linkLabel="All trades">
              {latestTrade ? (
                <div className="snffl-card snffl-mini-trade">
                  <span className="snffl-week-tag">
                    <span>WEEK {latestTrade.week}</span>
                  </span>
                  <span className="snffl-mini-trade-teams">
                    {latestTrade.sides.map((side, index) => (
                      <span key={side.rosterId}>
                        {index ? ' and ' : ''}
                        <ManagerLink rosterId={side.rosterId}>{side.teamName}</ManagerLink>
                      </span>
                    ))}
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
        <PageSources
          items={[
            { source: 'snffl', label: 'Win probability' },
            { source: 'sleeper', label: 'Projections' },
            { source: 'draftsharks', label: 'Floors and ceilings' },
            { source: 'draftkings', label: 'Game totals' },
          ]}
        />
      </main>
    </>
  );
}
