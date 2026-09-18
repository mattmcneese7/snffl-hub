// Sleeper API client. Official, read-only, no key. Stay under 1,000 calls per
// minute. Everything here is isomorphic: visitors' browsers poll these same
// endpoints for live scores, per Brief Section 3.

const API = 'https://api.sleeper.app/v1';

export const LEAGUE_ID =
  process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID ||
  process.env.SLEEPER_LEAGUE_ID ||
  '1394336593518546944';

export const AVATAR = (id: string, thumb = true) =>
  `https://sleepercdn.com/avatars/${thumb ? 'thumbs/' : ''}${id}`;

export const HEADSHOT = (playerId: string) =>
  `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`;

export const TEAM_LOGO = (abbr: string) =>
  `https://sleepercdn.com/images/team_logos/nfl/${abbr.toLowerCase()}.png`;

async function get<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${API}/${path}`, { next: { revalidate } } as RequestInit);
  if (!res.ok) throw new Error(`Sleeper ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

export type SleeperLeague = {
  name: string;
  season: string;
  status: string;
  total_rosters: number;
  roster_positions: string[];
  scoring_settings: Record<string, number>;
  settings: Record<string, number>;
};

export type SleeperUser = {
  user_id: string;
  display_name: string;
  avatar: string | null;
  metadata?: { team_name?: string };
};

export type SleeperRoster = {
  roster_id: number;
  owner_id: string;
  starters: string[] | null;
  players: string[] | null;
  settings: Record<string, number>;
};

export type SleeperMatchup = {
  matchup_id: number;
  roster_id: number;
  points: number;
  starters: string[] | null;
  players: string[] | null;
  players_points: Record<string, number> | null;
};

export type SleeperState = {
  week: number;
  leg: number;
  season: string;
  season_type: string;
  display_week: number;
};

export type BracketMatch = {
  m: number;
  r: number;
  t1: number | null;
  t2: number | null;
  w: number | null;
  l: number | null;
  p?: number;
  t1_from?: { w?: number; l?: number };
  t2_from?: { w?: number; l?: number };
};

export const getLeague = () => get<SleeperLeague>(`league/${LEAGUE_ID}`, 3600);
export const getUsers = () => get<SleeperUser[]>(`league/${LEAGUE_ID}/users`, 3600);
export const getRosters = () => get<SleeperRoster[]>(`league/${LEAGUE_ID}/rosters`, 60);
export const getState = () => get<SleeperState>('state/nfl', 300);
// 15 seconds, matching the live poll: this is the call every score on the
// site comes from, and a longer cache would make the faster poll pointless.
export const getMatchups = (week: number) =>
  get<SleeperMatchup[]>(`league/${LEAGUE_ID}/matchups/${week}`, 15);
export const getWinnersBracket = () =>
  get<BracketMatch[]>(`league/${LEAGUE_ID}/winners_bracket`, 300);
export const getLosersBracket = () =>
  get<BracketMatch[]>(`league/${LEAGUE_ID}/losers_bracket`, 300);
export const getTransactions = (week: number) =>
  get<Record<string, unknown>[]>(`league/${LEAGUE_ID}/transactions/${week}`, 300);

/**
 * The full player database is about 14.6MB and Sleeper asks that it be pulled
 * at most once a day, so only the nightly job calls this. Everything else reads
 * the trimmed data/players.json that the nightly job commits.
 */
export async function getAllPlayers(): Promise<Record<string, RawPlayer>> {
  const res = await fetch(`${API}/players/nfl`);
  if (!res.ok) throw new Error(`Sleeper ${res.status} on players/nfl`);
  return res.json();
}

export type RawPlayer = {
  player_id: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string | null;
  status?: string;
  active?: boolean;
};
