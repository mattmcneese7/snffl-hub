// Scoring plays from ESPN's summary endpoint, for the live watcher.
//
// Ground truth rather than inference. A touchdown could be guessed from a jump
// in fantasy points, but a six point jump is equally six receiving yards' worth
// of points in this league, so the watcher reads what actually happened and
// uses Sleeper only to attribute it to a manager.
//
// Verified against a finished Week 1 game: scoringPlays carries type.text
// ("Passing Touchdown"), a full text description, team, period and clock.
//
// Unofficial, like the scoreboard, so every reader degrades to an empty list
// rather than throwing, per Brief Section 9.

const SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary';

export type ScoringPlay = {
  /** ESPN play id, which is what keeps the watcher from posting twice. */
  id: string;
  gameId: string;
  /** "Passing Touchdown", "Rushing Touchdown", "Field Goal" and so on. */
  type: string;
  text: string;
  team: string;
  period: number;
  clock: string;
  homeScore: number;
  awayScore: number;
};

const isTouchdown = (type: string) => /touchdown/i.test(type);

/** Scoring plays for one game. Empty on any failure. */
export async function getScoringPlays(gameId: string): Promise<ScoringPlay[]> {
  try {
    const res = await fetch(`${SUMMARY}?event=${gameId}`, {
      next: { revalidate: 30 },
    } as RequestInit);
    if (!res.ok) return [];
    const json = await res.json();
    const plays = Array.isArray(json?.scoringPlays) ? json.scoringPlays : [];

    return plays.flatMap((play: Record<string, any>): ScoringPlay[] => {
      if (!play?.id) return [];
      return [
        {
          id: String(play.id),
          gameId,
          type: String(play.type?.text ?? play.scoringType?.displayName ?? ''),
          text: String(play.text ?? ''),
          team: String(play.team?.displayName ?? ''),
          period: Number(play.period?.number ?? 0),
          clock: String(play.clock?.displayValue ?? ''),
          homeScore: Number(play.homeScore ?? 0),
          awayScore: Number(play.awayScore ?? 0),
        },
      ];
    });
  } catch {
    return [];
  }
}

/** Touchdowns only, across several games, for the alert path. */
export async function getTouchdowns(gameIds: string[]): Promise<ScoringPlay[]> {
  const all = await Promise.all(gameIds.map((id) => getScoringPlays(id)));
  return all.flat().filter((play) => isTouchdown(play.type));
}
