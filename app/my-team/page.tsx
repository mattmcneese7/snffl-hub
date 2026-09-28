import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import Chrome from '@/components/Chrome';
import MovementFeed from '@/components/MovementFeed';
import PageHead from '@/components/PageHead';
import SleeperConnect from '@/components/SleeperConnect';
import SwapButton from '@/components/SwapButton';
import TeamPicker from '@/components/TeamPicker';
import { firstNameOf } from '@/config/managers';
import { getWeekGames, league, playerOf, teamByRoster, teams } from '@/lib/league';
import { movementFor } from '@/lib/movement';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { outlookFor, roleOf } from '@/lib/outlook';
import { getWeekProjections } from '@/lib/projections';
import { getRosters, LEAGUE_ID } from '@/lib/sleeper';
import { sleeperLink } from '@/lib/sleeper-links';
import { STARTER_SLOTS } from '@/lib/league';

export const metadata: Metadata = { title: 'My Team' };
export const dynamic = 'force-dynamic';

/**
 * Your team, and what to do about it.
 *
 * Everything in v3 so far has been the league's: the league's movement, every
 * player's outlook, thirty two defences. This is the page that makes any of it
 * yours, and it is a server page rather than a client shell because the team
 * choice moved from localStorage into a cookie, which the server can read
 * before it draws anything.
 *
 * It is deliberately a list of decisions rather than a dashboard. A manager
 * opening this on a Sunday morning wants to know what is wrong with his
 * lineup, not how his season is going.
 */
export default async function MyTeamPage() {
  const jar = await cookies();
  const rosterId = parseTeam(jar.get(TEAM_COOKIE)?.value);

  if (!rosterId) {
    return (
      <>
        <Chrome section="My Team" />
        <main className="snffl-page">
          <PageHead title="My Team" />
          <section>
            <div className="snffl-card snffl-mine-empty">
              <p>Pick your team once and this page becomes yours: your lineup, what is
                wrong with it, and every move you have made this season.</p>
              <TeamPicker
                teams={teams.map((t) => ({
                  rosterId: t.rosterId,
                  teamName: t.teamName,
                  manager: firstNameOf(t.rosterId) ?? t.manager,
                }))}
              />
            </div>
          </section>
        </main>
      </>
    );
  }

  const week = league.state.week;
  const team = teamByRoster(rosterId);
  const [rosters, projections, moves, games] = await Promise.all([
    getRosters().catch(() => []),
    getWeekProjections(league.state.season, week),
    movementFor(rosterId, 12),
    getWeekGames(week).catch(() => []),
  ]);

  const mine = rosters.find((r) => r.roster_id === rosterId);
  const starterIds = (mine?.starters ?? []).filter((id) => id && id !== '0');
  const benchIds = (mine?.players ?? []).filter((id) => id && !starterIds.includes(id));

  const read = (id: string, slot?: string) => {
    const player = playerOf(id);
    const outlook = outlookFor(id, player.position, player.team, projections[id] ?? 0, week);
    return { id, player, slot, outlook, role: roleOf(id, player.position) };
  };

  const starters = starterIds.map((id, i) => read(id, STARTER_SLOTS[i] ?? 'FLEX'));
  const bench = benchIds.map((id) => read(id));

  /** Anything in the lineup that should not be. */
  const SITTING = new Set(['Out', 'Doubtful', 'IR', 'Sus', 'PUP', 'NA', 'DNR']);
  const problems = starters.filter(
    (s) => SITTING.has(s.player.injuryStatus ?? '') || s.outlook.adjusted === 0
  );

  /**
   * A bench player worth more than a starter he could legally replace.
   *
   * Three points of margin, the same threshold Squirt Says uses, because a
   * projection is not precise enough for a one point swap to be advice.
   */
  const FLEX = new Set(['RB', 'WR', 'TE']);
  const canFill = (slot: string, position: string) =>
    slot === position || (slot === 'FLEX' && FLEX.has(position));
  const upgrades = bench
    .flatMap((b) => {
      const target = starters
        .filter((s) => canFill(s.slot ?? '', b.player.position))
        .sort((a, c) => a.outlook.adjusted - c.outlook.adjusted)[0];
      if (!target) return [];
      const gain = b.outlook.adjusted - target.outlook.adjusted;
      // The write is a positional array, so the swap needs the slot's index
      // and not just the man standing in it.
      const slotIndex = starterIds.indexOf(target.id);
      return gain >= 3 && slotIndex >= 0 ? [{ bench: b, starter: target, gain, slotIndex }] : [];
    })
    .sort((a, b) => b.gain - a.gain);

  // The lineup screen, as an app link where one has been confirmed and the web
  // route otherwise. This is the primary action for anyone not connected, which
  // is almost everyone, so it routes through the same place every Sleeper
  // handoff does rather than a hardcoded web URL.
  const sleeperLineup = sleeperLink('lineup');

  const game = games.find(
    (g) => g.home.rosterId === rosterId || g.away.rosterId === rosterId
  );
  const total = starters.reduce((sum, s) => sum + s.outlook.adjusted, 0);

  return (
    <>
      <Chrome section="My Team" />
      <main className="snffl-page">
        <PageHead title={team?.teamName ?? 'My Team'} />

        <section>
          <div className="snffl-card snffl-mine-top">
            <span className="snffl-label">Week {week} projected</span>
            <strong>{total.toFixed(1)}</strong>
            {game ? (
              <Link
                className="snffl-mine-opp"
                href={`/matchups/${week}/${game.matchupId}`}
              >
                vs {(game.home.rosterId === rosterId ? game.away : game.home).manager} &rsaquo;
              </Link>
            ) : null}
          </div>
        </section>

        {problems.length ? (
          <section>
            <div className="snffl-block-heading">
              <h2 className="snffl-headline">Fix This</h2>
            </div>
            <div className="snffl-card snffl-mine-list">
              {problems.map((p) => (
                <Link key={p.id} className="snffl-mine-row snffl-mine-bad" href={`/players/${p.id}`}>
                  <span>
                    <strong>{p.player.name}</strong>
                    <em>
                      {p.slot} ·{' '}
                      {p.player.injuryStatus
                        ? `${p.player.injuryStatus}${p.player.injuryPart ? `, ${p.player.injuryPart}` : ''}`
                        : 'no game this week'}
                    </em>
                  </span>
                  <span className="snffl-mine-num">{p.outlook.adjusted.toFixed(1)}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {upgrades.length ? (
          <section>
            <div className="snffl-block-heading">
              <h2 className="snffl-headline">Worth A Swap</h2>
            </div>
            <div className="snffl-card snffl-mine-list">
              {upgrades.slice(0, 4).map((u) => (
                <Link
                  key={u.bench.id}
                  className="snffl-mine-row"
                  href={`/players/${u.bench.id}`}
                >
                  <span>
                    <strong>{u.bench.player.name}</strong>
                    <em>
                      over {u.starter.player.short || u.starter.player.name} at {u.starter.slot}
                      {u.bench.outlook.matchup ? ` · ${u.bench.outlook.matchup.label} matchup` : ''}
                    </em>
                  </span>
                  <span className="snffl-mine-num snffl-mine-gain">+{u.gain.toFixed(1)}</span>
                </Link>
              ))}
              {/* The whole point of v3 in one control. The app already knows
                  this swap is worth points, so the next thing it should do is
                  offer to make it, not send somebody to another app to do it
                  by hand. */}
              <div className="snffl-mine-act">
                <SwapButton
                  leagueId={LEAGUE_ID}
                  rosterId={rosterId}
                  starters={starterIds}
                  slotIndex={upgrades[0].slotIndex}
                  playerId={upgrades[0].bench.id}
                  playerName={upgrades[0].bench.player.short || upgrades[0].bench.player.name}
                  deepLink={sleeperLineup}
                />
              </div>
            </div>
          </section>
        ) : null}

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Lineup</h2>
            <Link className="snffl-block-heading-link" href="/swami">
              Research &rsaquo;
            </Link>
          </div>
          <div className="snffl-card snffl-mine-list">
            {starters.map((s) => (
              <Link key={s.id} className="snffl-mine-row" href={`/players/${s.id}`}>
                <span>
                  <strong>{s.player.name}</strong>
                  <em>
                    {s.slot} · {s.player.team ?? 'FA'}
                    {s.role ? ` · ${s.role}` : ''}
                  </em>
                </span>
                {s.outlook.matchup ? (
                  <span className={`snffl-swami-edge snffl-outlook-${s.outlook.matchup.label}`}>
                    {s.outlook.matchup.home ? '' : '@'}
                    {s.outlook.matchup.opponent}
                  </span>
                ) : null}
                <span className="snffl-mine-num">{s.outlook.adjusted.toFixed(1)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Sleeper</h2>
          </div>
          <div className="snffl-card snffl-mine-connect">
            <SleeperConnect />
          </div>
        </section>

        {moves.length ? (
          <section>
            <div className="snffl-block-heading">
              <h2 className="snffl-headline">Your Moves</h2>
            </div>
            <MovementFeed events={moves} limit={6} showManager={false} />
          </section>
        ) : null}
      </main>
    </>
  );
}
