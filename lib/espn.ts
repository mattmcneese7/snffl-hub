// ESPN public JSON. Unofficial and can change without notice, so every reader
// degrades to an empty list rather than throwing, per Brief Section 9.

import type { NflGame } from './types.ts';

const SCOREBOARD =
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

export const ESPN_CUTOUT = (espnId: string) =>
  `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`;

export const ESPN_TEAM_LOGO = (abbr: string) =>
  `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr.toLowerCase()}.png`;

type EspnCompetitor = {
  homeAway: 'home' | 'away';
  score?: string;
  team?: { abbreviation?: string; logo?: string };
};

export async function getNflScoreboard(): Promise<NflGame[]> {
  try {
    const res = await fetch(SCOREBOARD, { next: { revalidate: 15 } } as RequestInit);
    if (!res.ok) return [];
    const json = await res.json();
    const events = Array.isArray(json?.events) ? json.events : [];

    return events.flatMap((event: Record<string, any>): NflGame[] => {
      const comp = event?.competitions?.[0];
      if (!comp) return [];
      const competitors: EspnCompetitor[] = comp.competitors ?? [];
      const home = competitors.find((c) => c.homeAway === 'home');
      const away = competitors.find((c) => c.homeAway === 'away');
      if (!home || !away) return [];

      const side = (c: EspnCompetitor) => ({
        abbr: c.team?.abbreviation ?? '',
        score: c.score != null ? Number(c.score) : null,
        logo: c.team?.logo ?? null,
      });

      return [
        {
          id: String(event.id),
          home: side(home),
          away: side(away),
          status: comp.status?.type?.shortDetail ?? '',
          state: (comp.status?.type?.state ?? 'pre') as NflGame['state'],
          clock: comp.status?.displayClock,
          period: comp.status?.period,
        },
      ];
    });
  } catch {
    // Source moved or blocked us. Callers show the empty state.
    return [];
  }
}

/** True while any NFL game is in progress, which gates the live polling. */
export const anyGameLive = (games: NflGame[]) => games.some((g) => g.state === 'in');
