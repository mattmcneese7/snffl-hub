import Link from 'next/link';
import { notFound } from 'next/navigation';
import Chrome from '@/components/Chrome';
import FeatureMatchup from '@/components/FeatureMatchup';
import LiveRefresh from '@/components/LiveRefresh';
import MatchupLineup from '@/components/MatchupLineup';
import NflSlate from '@/components/NflSlate';
import { SleeperActions } from '@/components/SleeperAction';
import { SourceStrip } from '@/components/SourceMark';
import PageHead from '@/components/PageHead';
import { Figure } from '@/components/Stat';
import { toFeature } from '@/lib/feature';
import { getWeekGames } from '@/lib/league';
import { firstNameOf } from '@/config/managers';
import { buildLiveMatchup, getMatchupContext } from '@/lib/matchup-live';

export default async function MatchupDetail({
  params,
}: {
  params: Promise<{ week: string; matchupId: string }>;
}) {
  const { week: rawWeek, matchupId: rawId } = await params;
  const week = Math.min(17, Math.max(1, Number(rawWeek) || 1));
  const matchupId = Number(rawId);

  const [games, ctx] = await Promise.all([getWeekGames(week), getMatchupContext(week)]);
  const game = games.find((g) => g.matchupId === matchupId);
  if (!game) notFound();

  const live = buildLiveMatchup(game, ctx);

  // Only the NFL games this matchup has a starter in, so the side panel is
  // the set of windows these two managers are actually sweating.
  const teamsInPlay = new Set(
    [...live.away.lineup, ...live.home.lineup].map((p) => p.nfl?.game.id).filter(Boolean)
  );
  const relevant = ctx.nfl.filter((g) => teamsInPlay.has(g.id));

  // Who is carrying each side right now, which is the question a lineup page
  // exists to answer and the page never actually answered.
  const topOf = (side: typeof live.home) =>
    [...side.lineup].sort((a, b) => b.points - a.points)[0] ?? null;
  const leader = live.home.points >= live.away.points ? live.home : live.away;
  const trailer = leader === live.home ? live.away : live.home;
  const nameOf = (rosterId: number, fallback: string) => firstNameOf(rosterId) ?? fallback;
  const startersInGame: Record<string, number> = {};
  for (const p of [...live.away.lineup, ...live.home.lineup]) {
    if (p.team) startersInGame[p.team] = (startersInGame[p.team] ?? 0) + 1;
  }

  return (
    <>
      <Chrome section="Matchups" sub={`Week ${week}`} week={week} />
      <LiveRefresh live={ctx.nfl.some((g) => g.state === 'in')} week={week} />
      <main className="snffl-page">
        <Link className="snffl-back" href={`/matchups/${week}`}>
          <span aria-hidden>&lsaquo;</span> Week {week}
        </Link>

        <PageHead
          title={`${nameOf(live.away.rosterId, live.away.manager)} vs ${nameOf(
            live.home.rosterId,
            live.home.manager
          )}`}
          facts={[
            { label: 'Margin', value: Math.abs(game.margin).toFixed(2) },
            {
              label: 'To play',
              value: String(live.away.yetToPlay + live.home.yetToPlay),
              tone: game.status === 'live' ? 'live' : 'plain',
            },
            { label: 'Win prob', value: `${Math.round(leader.winProb * 100)}%` },
          ]}
        />

        <div className="snffl-matchup-detail">
          <div className="snffl-matchup-detail-main">
            <FeatureMatchup data={toFeature(game, `Week ${week}`, live)} size="lg" link={false} />
            {/* Opens whoever taps it on their own team in Sleeper: Sleeper
                knows who is logged in, the site does not need to. */}
            {game.status !== 'final' ? <SleeperActions actions={['lineup', 'matchup']} /> : null}

            {/* What is actually deciding it: the best man on each side, and
                how much football each still has to come. */}
            <section className="snffl-swing">
              <div className="snffl-block-heading">
                <h2 className="snffl-headline">Deciding it</h2>
                <span className="snffl-block-heading-link">
                  {nameOf(leader.rosterId, leader.manager)} by {Math.abs(game.margin).toFixed(2)}
                </span>
              </div>
              <div className="snffl-swing-grid">
                {[leader, trailer].map((side) => {
                  const best = topOf(side);
                  return (
                    <div className="snffl-card snffl-swing-card" key={side.rosterId}>
                      <span className="snffl-stat-label">
                        {nameOf(side.rosterId, side.manager)}
                      </span>
                      <Figure value={side.points.toFixed(2)} size="lg" />
                      <span className="snffl-swing-line">
                        {best ? `${best.short} leads on ${best.points.toFixed(2)}` : 'Nobody yet'}
                      </span>
                      <span className="snffl-swing-line">
                        {side.yetToPlay} to play · {side.inPlay} playing
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={{ marginTop: 18 }}>
              <div className="snffl-block-heading">
                <h2 className="snffl-headline">Lineups</h2>
              </div>
              <MatchupLineup matchup={live} />
              <SourceStrip
                items={[
                  { source: 'sleeper', label: 'Stats and projections' },
                  { source: 'draftsharks', label: 'Floor and ceiling' },
                  { source: 'espn', label: 'Game status' },
                  { source: 'draftkings', label: 'Lines' },
                ]}
              />
            </section>
          </div>

          <aside className="snffl-matchup-detail-side">
            <section>
              <div className="snffl-block-heading">
                <h2 className="snffl-headline">Their Games</h2>
                <span className="snffl-block-heading-link">
                  {relevant.length} {relevant.length === 1 ? 'game' : 'games'}
                </span>
              </div>
              <NflSlate games={relevant} lines={ctx.lines} startersByTeam={startersInGame} />
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
