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
      parts: [
        { text: away?.teamName ?? game.away.team, kind: 'team' as const },
        { text: game.away.points.toFixed(2), kind: 'score' as const },
        { text: 'at', kind: 'link' as const },
        { text: home?.teamName ?? game.home.team, kind: 'team' as const },
        { text: game.home.points.toFixed(2), kind: 'score' as const },
      ],
      detail:
        game.status === 'pending' ? 'PENDING' : game.status === 'live' ? 'LIVE' : 'FINAL',
    };
  });

  const nflTicker = nfl.slice(0, 14).map((game) => ({
    id: `nfl-${game.id}`,
    parts: [
      { text: game.away.abbr, kind: 'team' as const },
      { text: game.away.score != null ? String(game.away.score) : '', kind: 'score' as const },
      { text: 'at', kind: 'link' as const },
      { text: game.home.abbr, kind: 'team' as const },
      { text: game.home.score != null ? String(game.home.score) : '', kind: 'score' as const },
    ],
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
