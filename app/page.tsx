import SiteChrome from '@/components/SiteChrome';
import { getNflScoreboard } from '@/lib/espn';
import { getMatchups, getRosters, getState, getUsers } from '@/lib/sleeper';

type TickerItem = { id: string; label: string; detail?: string };

/**
 * League ticker from the most recently scored week. Every source here is
 * unofficial or can move, so a failure yields an empty rail and the chrome
 * shows its own placeholder rather than breaking the page.
 */
async function leagueTicker(): Promise<{ items: TickerItem[]; week: number }> {
  try {
    const state = await getState();
    const week = Math.max(1, state.display_week || state.week);
    const [matchups, rosters, users] = await Promise.all([
      getMatchups(week),
      getRosters(),
      getUsers(),
    ]);

    const nameByRoster = new Map<number, string>();
    const userById = new Map(users.map((u) => [u.user_id, u]));
    for (const roster of rosters) {
      const user = userById.get(roster.owner_id);
      nameByRoster.set(roster.roster_id, user?.display_name ?? `Team ${roster.roster_id}`);
    }

    const pairs = new Map<number, typeof matchups>();
    for (const row of matchups) {
      const list = pairs.get(row.matchup_id) ?? [];
      list.push(row);
      pairs.set(row.matchup_id, list);
    }

    const items: TickerItem[] = [];
    for (const [id, sides] of pairs) {
      if (sides.length !== 2) continue;
      const [a, b] = sides;
      const scored = (a.points ?? 0) > 0 || (b.points ?? 0) > 0;
      items.push({
        id: `league-${id}`,
        label: `${nameByRoster.get(a.roster_id)} ${(a.points ?? 0).toFixed(2)} at ${nameByRoster.get(b.roster_id)} ${(b.points ?? 0).toFixed(2)}`,
        detail: scored ? 'FINAL' : 'PENDING',
      });
    }
    return { items, week };
  } catch {
    return { items: [], week: 1 };
  }
}

async function nflTicker(): Promise<TickerItem[]> {
  const games = await getNflScoreboard();
  return games.slice(0, 14).map((game) => ({
    id: `nfl-${game.id}`,
    label: `${game.away.abbr} ${game.away.score ?? ''} ${game.home.abbr} ${game.home.score ?? ''}`.trim(),
    detail: game.status,
  }));
}

export default async function HomePage() {
  const [league, nfl] = await Promise.all([leagueTicker(), nflTicker()]);

  return (
    <>
      <SiteChrome
        section="Home"
        week={league.week}
        leagueTicker={league.items}
        nflTicker={nfl}
      />
      <main className="snffl-page">
        <h1 className="snffl-headline">Foundation</h1>
        <div className="snffl-placeholder">
          <span className="snffl-placeholder-label">Checkpoint 5</span>
          <span className="snffl-placeholder-note">
            Home, Matchups, Standings and the rest arrive here, built from the approved style
            frame. The tickers above are already live league and NFL data.
          </span>
        </div>
      </main>
    </>
  );
}
