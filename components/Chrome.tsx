import SiteChrome from './SiteChrome';
import { getNflScoreboard } from '@/lib/espn';
import { getWeekGames, scoredWeek, teamByRoster } from '@/lib/league';

/**
 * Builds the ticker rails once and renders the chrome, so every page does not
 * re-implement it. Both sources are unofficial, so failures yield empty rails
 * and the chrome shows its own placeholder copy.
 */
export default async function Chrome({
  section,
  sub,
  week,
}: {
  section: string;
  sub?: string;
  week?: number;
}) {
  const current = week ?? (await scoredWeek());

  const [games, nfl] = await Promise.all([
    getWeekGames(current).catch(() => []),
    getNflScoreboard().catch(() => []),
  ]);

  const leagueTicker = games.map((game) => {
    const away = teamByRoster(game.away.rosterId);
    const home = teamByRoster(game.home.rosterId);
    return {
      id: `league-${game.matchupId}`,
      label: `${away?.teamName ?? game.away.team} ${game.away.points.toFixed(2)} at ${home?.teamName ?? game.home.team} ${game.home.points.toFixed(2)}`,
      detail:
        game.status === 'pending' ? 'PENDING' : game.status === 'live' ? 'LIVE' : 'FINAL',
    };
  });

  const nflTicker = nfl.slice(0, 14).map((game) => ({
    id: `nfl-${game.id}`,
    label: `${game.away.abbr} ${game.away.score ?? ''} ${game.home.abbr} ${game.home.score ?? ''}`.trim(),
    detail: game.status,
  }));

  return (
    <SiteChrome
      section={section}
      sub={sub}
      week={current}
      leagueTicker={leagueTicker}
      nflTicker={nflTicker}
    />
  );
}
