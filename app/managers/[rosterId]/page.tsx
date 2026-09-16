import Link from 'next/link';
import { notFound } from 'next/navigation';
import Chrome from '@/components/Chrome';
import PointsByWeekChart from '@/components/PointsByWeekChart';
import TeamAvatar from '@/components/TeamAvatar';
import { getChugCounts, getManagerOfTheWeekCounts, getPointsByWeek } from '@/lib/awards';
import { getStandings, league, playerOf, teamByRoster } from '@/lib/league';
import { getOddsFor } from '@/lib/playoff-odds';
import { getRosters } from '@/lib/sleeper';

export default async function ManagerPage({
  params,
}: {
  params: Promise<{ rosterId: string }>;
}) {
  const { rosterId: raw } = await params;
  const rosterId = Number(raw);
  const team = teamByRoster(rosterId);
  if (!team) notFound();

  const [standings, byWeek, chugs, motw, odds] = await Promise.all([
    getStandings(),
    getPointsByWeek(rosterId),
    getChugCounts(),
    getManagerOfTheWeekCounts(),
    getOddsFor(rosterId),
  ]);

  const standing = standings.find((s) => s.rosterId === rosterId);
  const bestWeek = byWeek.reduce((max, w) => (w.points > max ? w.points : max), 0);
  const chugCount = chugs.find((c) => c.rosterId === rosterId)?.count ?? 0;
  const motwCount = motw.find((c) => c.rosterId === rosterId)?.count ?? 0;

  let starters: string[] = team.starters;
  let bench: string[] = [];
  try {
    const rosters = await getRosters();
    const live = rosters.find((r) => r.roster_id === rosterId);
    if (live) {
      starters = live.starters ?? starters;
      bench = (live.players ?? []).filter((id) => !starters.includes(id));
    }
  } catch {
    // Nightly roster is the fallback.
  }

  return (
    <>
      <Chrome section="Managers" sub={team.manager} />
      <main className="snffl-page">
        <section
          className={`snffl-profile-hero mgr-${team.userId}`}
          style={{ background: team.colors?.primary }}
        >
          <TeamAvatar rosterId={rosterId} className="snffl-profile-avatar" />
          <div>
            <h1 className="snffl-headline snffl-profile-name">{team.teamName}</h1>
            <p className="snffl-profile-sub">{team.manager}</p>
          </div>
        </section>

        <section className="snffl-stat-tiles">
          <div className="snffl-stat-tile">
            <span className="snffl-stat-label">Record</span>
            <span className="snffl-stat-value snffl-numeric">
              {team.wins}-{team.losses}
              {team.ties ? `-${team.ties}` : ''}
            </span>
          </div>
          <div className="snffl-stat-tile">
            <span className="snffl-stat-label">Standing</span>
            <span className="snffl-stat-value snffl-numeric">{standing?.seed ?? '-'}</span>
          </div>
          <div className="snffl-stat-tile">
            <span className="snffl-stat-label">Points For</span>
            <span className="snffl-stat-value snffl-numeric">{team.pointsFor.toFixed(1)}</span>
          </div>
          <div className="snffl-stat-tile">
            <span className="snffl-stat-label">Playoff Odds</span>
            <span className="snffl-stat-value snffl-numeric">
              {odds ? `${odds.makePlayoffs.toFixed(0)}%` : '-'}
            </span>
          </div>
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Trophy Case</h2>
          </div>
          <div className="snffl-trophy-case">
            <div className="snffl-trophy">
              <span className="snffl-trophy-count snffl-numeric">{motwCount}</span>
              <span className="snffl-trophy-label">Manager of the Week</span>
            </div>
            {/* Sharts and chugs are the same event under our model: the week's
                lowest score. Showing one number twice reads as a bug. */}
            <div className="snffl-trophy">
              <span className="snffl-trophy-count snffl-numeric">{chugCount}</span>
              <span className="snffl-trophy-label">Sharts and Chugs</span>
            </div>
            <div className="snffl-trophy">
              <span className="snffl-trophy-count snffl-numeric">{bestWeek.toFixed(1)}</span>
              <span className="snffl-trophy-label">Best Week</span>
            </div>
          </div>
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Points By Week</h2>
            <span className="snffl-block-heading-link">{byWeek.length} played</span>
          </div>
          <div className="snffl-card snffl-chart-card">
            <PointsByWeekChart points={byWeek} playoffWeekStart={league.playoffWeekStart} />
          </div>
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Roster</h2>
          </div>
          <div className="snffl-card">
            {starters.map((id) => {
              const player = playerOf(id);
              return (
                <Link className="snffl-roster-row" href={`/players/${id}`} key={`s-${id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="snffl-lineup-headshot" src={player.headshot} alt="" loading="lazy" />
                  <span>
                    <span className="snffl-lineup-name">{player.name}</span>
                    <span className="snffl-lineup-meta">
                      {player.position}
                      {player.team ? ` · ${player.team}` : ''}
                    </span>
                  </span>
                  <span className="snffl-roster-tag">
                    <span>START</span>
                  </span>
                </Link>
              );
            })}
            {bench.map((id) => {
              const player = playerOf(id);
              return (
                <Link className="snffl-roster-row" href={`/players/${id}`} key={`b-${id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="snffl-lineup-headshot" src={player.headshot} alt="" loading="lazy" />
                  <span>
                    <span className="snffl-lineup-name">{player.name}</span>
                    <span className="snffl-lineup-meta">
                      {player.position}
                      {player.team ? ` · ${player.team}` : ''}
                    </span>
                  </span>
                  <span className="snffl-roster-tag snffl-roster-tag-bench">
                    <span>BN</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
