// The NFL week around a fantasy matchup: every game with logos, records, TV and
// live state from ESPN's scoreboard, and DraftKings lines from ESPN's game
// summaries. Unofficial and public, so every reader degrades to empty rather
// than throwing, per Brief Section 9.

import { ESPN_TEAM_LOGO } from './espn.ts';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

/** ESPN abbreviations that differ from the Sleeper codes the rest of the site uses. */
const ESPN_TO_SLEEPER: Record<string, string> = { WSH: 'WAS' };
export const toSleeperTeam = (abbr: string) => ESPN_TO_SLEEPER[abbr] ?? abbr;
const toEspnTeam = (abbr: string) =>
  Object.entries(ESPN_TO_SLEEPER).find(([, s]) => s === abbr)?.[0] ?? abbr;

export type NflSide = {
  /** Sleeper code: WAS, not ESPN's WSH. */
  abbr: string;
  name: string;
  logo: string;
  /** Team primary color as #rrggbb, for small accents only. */
  color: string | null;
  record: string | null;
  score: number | null;
};

export type NflGame = {
  id: string;
  kickoff: string;
  state: 'pre' | 'in' | 'post';
  /** ESPN's short status: "Thu 7:15 PM", "Q3 4:12", "Final". */
  status: string;
  clock: string | null;
  period: number | null;
  home: NflSide;
  away: NflSide;
  broadcast: string | null;
  venue: string | null;
  /** Down and distance while live, "2nd & 7 at DET 34". */
  situation: string | null;
  /** Sleeper code of the team with the ball while live. */
  possession: string | null;
};

type Json = Record<string, any>;

function sideOf(competitor: Json): NflSide {
  const abbr = toSleeperTeam(competitor?.team?.abbreviation ?? '');
  return {
    abbr,
    name: competitor?.team?.shortDisplayName ?? competitor?.team?.displayName ?? abbr,
    logo: ESPN_TEAM_LOGO(toEspnTeam(abbr)),
    color: competitor?.team?.color ? `#${competitor.team.color}` : null,
    record:
      (competitor?.records as Json[] | undefined)?.find((r) => r.type === 'total')?.summary ?? null,
    score: competitor?.score != null && competitor.score !== '' ? Number(competitor.score) : null,
  };
}

/**
 * Every game of an NFL week. With no week it is whatever ESPN is showing now,
 * which is the week in progress.
 */
export async function getNflGames(week?: number, season?: string): Promise<NflGame[]> {
  const query =
    week != null ? `?seasontype=2&week=${week}${season ? `&dates=${season}` : ''}` : '';
  try {
    const res = await fetch(`${SITE}/scoreboard${query}`, { next: { revalidate: 15 } } as RequestInit);
    if (!res.ok) return [];
    const json = await res.json();
    const events: Json[] = Array.isArray(json?.events) ? json.events : [];

    return events.flatMap((event): NflGame[] => {
      const comp = event?.competitions?.[0];
      const competitors: Json[] = comp?.competitors ?? [];
      const home = competitors.find((c) => c.homeAway === 'home');
      const away = competitors.find((c) => c.homeAway === 'away');
      if (!comp || !home || !away) return [];
      const state = (comp.status?.type?.state ?? 'pre') as NflGame['state'];
      const possessionId = comp.situation?.possession;
      const possessor = competitors.find((c) => c.team?.id === possessionId);

      return [
        {
          id: String(event.id),
          kickoff: event.date,
          state,
          status: comp.status?.type?.shortDetail ?? '',
          clock: comp.status?.displayClock ?? null,
          period: comp.status?.period ?? null,
          home: sideOf(home),
          away: sideOf(away),
          broadcast: comp.broadcast ?? comp.broadcasts?.[0]?.names?.[0] ?? null,
          venue: comp.venue?.fullName ?? null,
          situation: state === 'in' ? (comp.situation?.downDistanceText ?? null) : null,
          possession: state === 'in' && possessor ? toSleeperTeam(possessor.team.abbreviation) : null,
        },
      ];
    });
  } catch {
    return [];
  }
}

/** The game a team plays this week, from that team's side. */
export type TeamGame = {
  game: NflGame;
  team: NflSide;
  opponent: NflSide;
  home: boolean;
};

export function gamesByTeam(games: NflGame[]): Map<string, TeamGame> {
  const out = new Map<string, TeamGame>();
  for (const game of games) {
    out.set(game.home.abbr, { game, team: game.home, opponent: game.away, home: true });
    out.set(game.away.abbr, { game, team: game.away, opponent: game.home, home: false });
  }
  return out;
}

/**
 * Share of a game still to be played, 1 before kickoff and 0 at the final
 * whistle. Overtime is treated as a sliver left rather than zero, since a
 * player can still score in it.
 */
export function fractionRemaining(game: NflGame | undefined): number {
  if (!game || game.state === 'pre') return 1;
  if (game.state === 'post') return 0;
  const period = game.period ?? 1;
  if (period > 4) return 0.04;
  const [m, s] = String(game.clock ?? '15:00').split(':').map(Number);
  const clockLeft = (Number.isFinite(m) ? m : 15) + (Number.isFinite(s) ? s : 0) / 60;
  return Math.max(0, Math.min(1, ((4 - period) * 15 + clockLeft) / 60));
}

// ---------- Lines ----------

export type BookSide = {
  moneyline: number | null;
  /** No vig implied win probability from the moneylines, 0 to 1. */
  implied: number | null;
};

export type GameLines = {
  provider: string;
  logoLight: string | null;
  logoDark: string | null;
  /** "BUF -5.5", or "EVEN". */
  details: string | null;
  /** Home spread, negative when home is favored. */
  spread: number | null;
  overUnder: number | null;
  home: BookSide;
  away: BookSide;
  /** ESPN's live home win probability, 0 to 1, while the game is on. */
  liveHomeWin: number | null;
};

const rawImplied = (ml: number | null) =>
  ml == null ? null : ml < 0 ? -ml / (-ml + 100) : 100 / (ml + 100);

/** DraftKings lines and ESPN win probability for one game. */
export async function getGameLines(eventId: string, live = false): Promise<GameLines | null> {
  try {
    const res = await fetch(`${SITE}/summary?event=${eventId}`, {
      next: { revalidate: live ? 15 : 300 },
    } as RequestInit);
    if (!res.ok) return null;
    const json = await res.json();
    const pick: Json | undefined = (json?.pickcenter ?? [])[0];
    const series: Json[] = Array.isArray(json?.winprobability) ? json.winprobability : [];
    const lastWin = series.length ? series[series.length - 1]?.homeWinPercentage : null;
    if (!pick && lastWin == null) return null;

    const homeMl = pick?.homeTeamOdds?.moneyLine ?? null;
    const awayMl = pick?.awayTeamOdds?.moneyLine ?? null;
    const rh = rawImplied(homeMl);
    const ra = rawImplied(awayMl);
    // Strip the book's margin so the two sides add up to 100.
    const total = rh != null && ra != null ? rh + ra : null;
    const logos: Json[] = pick?.provider?.logos ?? [];

    return {
      provider: pick?.provider?.name ?? 'ESPN',
      logoLight: logos.find((l) => l.rel?.includes('light'))?.href ?? null,
      logoDark: logos.find((l) => l.rel?.includes('dark'))?.href ?? null,
      details: pick?.details ?? null,
      spread: typeof pick?.spread === 'number' ? pick.spread : null,
      overUnder: typeof pick?.overUnder === 'number' ? pick.overUnder : null,
      home: { moneyline: homeMl, implied: total ? Number((rh! / total).toFixed(3)) : null },
      away: { moneyline: awayMl, implied: total ? Number((ra! / total).toFixed(3)) : null },
      liveHomeWin: typeof lastWin === 'number' ? lastWin : null,
    };
  } catch {
    return null;
  }
}

/** Lines for a whole slate, keyed by ESPN event id. */
export async function getSlateLines(games: NflGame[]): Promise<Record<string, GameLines>> {
  const entries = await Promise.all(
    games.map(async (game) => [game.id, await getGameLines(game.id, game.state === 'in')] as const)
  );
  return Object.fromEntries(entries.filter((entry): entry is [string, GameLines] => entry[1] != null));
}

/** "-245" and "+200", the way a book prints a moneyline. */
export const formatMoneyline = (ml: number | null) =>
  ml == null ? '' : ml > 0 ? `+${ml}` : String(ml);

/** Team total implied by the spread and the over/under. */
export function impliedTeamTotal(lines: GameLines | undefined, home: boolean): number | null {
  if (!lines || lines.overUnder == null || lines.spread == null) return null;
  const homeTotal = (lines.overUnder - lines.spread) / 2;
  return Number((home ? homeTotal : lines.overUnder - homeTotal).toFixed(1));
}

type FantasySlot = {
  id: string;
  name: string;
  position: string;
  team?: string;
  headshot: string;
  slot: string;
  points: number;
};
type FantasySide = {
  rosterId: number;
  team: string;
  manager: string;
  lineup: FantasySlot[];
  bench?: FantasySlot[];
};

/** One league player appearing in an NFL game, and who owns him. */
export type LeagueEntry = {
  playerId: string;
  name: string;
  position: string;
  /** Sleeper code of the NFL team he plays for. */
  nflTeam: string;
  headshot: string;
  rosterId: number;
  manager: string;
  teamName: string;
  /** The lineup slot, or null when he is on the bench. */
  slot: string | null;
  points: number;
};

/**
 * Every league player on either side of one NFL game.
 *
 * This is the thing that makes an NFL game matter here. Nobody in a fourteen
 * person league watches Jets at Patriots for the football; they watch it
 * because three of their starters are in it and one of them belongs to the
 * manager they are playing this week. Bench players are included and marked,
 * because "he had him on the bench" is the whole joke.
 *
 * Sorted starters first, then by points, so the ones deciding somebody's week
 * are at the top.
 */
export function leagueEntriesInGame(
  weekGames: { home: FantasySide; away: FantasySide }[],
  teams: string[]
): LeagueEntry[] {
  const wanted = new Set(teams.filter(Boolean));
  const out: LeagueEntry[] = [];

  for (const game of weekGames) {
    for (const side of [game.away, game.home]) {
      const rows: [FantasySlot, string | null][] = [
        ...side.lineup.map((s) => [s, s.slot] as [FantasySlot, string | null]),
        ...(side.bench ?? []).map((s) => [s, null] as [FantasySlot, string | null]),
      ];
      for (const [slot, lineupSlot] of rows) {
        if (!slot.team || !wanted.has(slot.team)) continue;
        out.push({
          playerId: slot.id,
          name: slot.name,
          position: slot.position,
          nflTeam: slot.team,
          headshot: slot.headshot,
          rosterId: side.rosterId,
          manager: side.manager,
          teamName: side.team,
          slot: lineupSlot,
          points: slot.points,
        });
      }
    }
  }

  return out.sort((a, b) => {
    if (!!a.slot !== !!b.slot) return a.slot ? -1 : 1;
    return b.points - a.points;
  });
}

const CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';

export type GameWeather = {
  /** ESPN's own words: "Intermittent clouds". */
  summary: string;
  temperature: number | null;
  /** Chance of precipitation as a percentage. */
  precipitation: number | null;
  windSpeed: number | null;
  /** Compass point, "NNE". */
  windDirection: string | null;
  /** ESPN's numeric condition code, mapped for the icon. */
  conditionId: string | null;
};

export type GameVenue = {
  name: string;
  city: string | null;
  state: string | null;
  /** 2000x1125 exterior and interior shots from ESPN's venue library. */
  image: string | null;
  interior: string | null;
  indoor: boolean;
  grass: boolean | null;
};

export type GameExtras = {
  venue: GameVenue | null;
  /** Null for a dome, and for any game already played. */
  weather: GameWeather | null;
  attendance: number | null;
};

/**
 * The things that make a game feel like a place rather than a row: the
 * stadium, the forecast at kickoff, the wind.
 *
 * Three calls, because ESPN splits them. The site summary carries the venue
 * and its photographs, the core competition carries wind speed and direction
 * which the site one drops, and the core venue carries the indoor flag, which
 * matters because ESPN happily reports a forecast for a domed stadium and
 * reporting wind inside Ford Field would be nonsense.
 *
 * Every one of them is unofficial and public, so each degrades to null on its
 * own rather than taking the page down with it, per Brief Section 9.
 */
export async function getGameExtras(eventId: string, live = false): Promise<GameExtras> {
  const revalidate = live ? 60 : 900;
  const grab = async (url: string): Promise<Json | null> => {
    try {
      const res = await fetch(url, { next: { revalidate } } as RequestInit);
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  };

  const [summary, competition] = await Promise.all([
    grab(`${SITE}/summary?event=${eventId}`),
    grab(`${CORE}/events/${eventId}/competitions/${eventId}`),
  ]);

  const raw = summary?.gameInfo?.venue ?? null;
  const venueId = raw?.id ?? null;
  const detail = venueId ? await grab(`${CORE}/venues/${venueId}`) : null;

  const images: Json[] = raw?.images ?? [];
  const pick = (interior: boolean) =>
    images.find((i) => (i.rel ?? []).includes('interior') === interior)?.href ?? null;

  const venue: GameVenue | null = raw
    ? {
        name: raw.fullName ?? 'Unknown',
        city: raw.address?.city ?? null,
        state: raw.address?.state ?? null,
        image: pick(false),
        interior: pick(true),
        indoor: detail?.indoor === true,
        grass: typeof raw.grass === 'boolean' ? raw.grass : null,
      }
    : null;

  const w = competition?.weather ?? null;
  // A forecast is only worth showing for a game not yet played, outdoors.
  const weather: GameWeather | null =
    w && !venue?.indoor
      ? {
          summary: w.displayValue ?? '',
          temperature: typeof w.temperature === 'number' ? w.temperature : null,
          precipitation: typeof w.precipitation === 'number' ? w.precipitation : null,
          windSpeed: typeof w.windSpeed === 'number' ? w.windSpeed : null,
          windDirection: w.windDirection ?? null,
          conditionId: w.conditionId ?? null,
        }
      : null;

  return {
    venue,
    weather,
    attendance:
      typeof summary?.gameInfo?.attendance === 'number' ? summary.gameInfo.attendance : null,
  };
}

/**
 * ESPN's condition codes, bucketed. The full list runs to dozens of shades of
 * cloud; a football page needs to know whether to draw a sun, a cloud, rain,
 * snow or wind, so the codes collapse to those.
 */
export function weatherIcon(conditionId: string | null, windSpeed: number | null): string {
  if (windSpeed != null && windSpeed >= 18) return 'wind';
  const id = Number(conditionId);
  if (!Number.isFinite(id)) return 'cloud';
  if (id >= 22 && id <= 31) return 'snow';
  if (id >= 12 && id <= 21) return 'rain';
  if (id >= 32 && id <= 38) return 'clear';
  if (id <= 2 || id === 33 || id === 34) return 'sun';
  if (id <= 6) return 'partly';
  return 'cloud';
}
