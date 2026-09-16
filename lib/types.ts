// Shared shapes for the data pipeline, Brief Section 3.

export type ManagerColors = {
  primary: string;
  secondary: string;
  onPrimary: string;
  contrast: number;
};

export type Team = {
  rosterId: number;
  userId: string;
  /** Sleeper team name, falling back to the manager's display name. */
  teamName: string;
  manager: string;
  avatar: string | null;
  avatarUrl: string | null;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  starters: string[];
  colors: ManagerColors;
};

/**
 * Trimmed player record. Optional fields are omitted entirely rather than
 * written as null, because this file is committed nightly to a public repo.
 */
export type PlayerLite = {
  id: string;
  name: string;
  short: string;
  position: string;
  team?: string;
  headshot: string;
  logo?: string;
  /** ESPN id from the nflverse map, used for cutout art. */
  espnId?: string;
};

export type LineupSlot = PlayerLite & {
  slot: string;
  points: number;
};

export type GameSide = {
  rosterId: number;
  team: string;
  manager: string;
  points: number;
  projected?: number;
  lineup: LineupSlot[];
  bench?: LineupSlot[];
};

export type Game = {
  matchupId: number;
  week: number;
  home: GameSide;
  away: GameSide;
  margin: number;
  winner: number | null;
  status: 'pending' | 'live' | 'final';
};

export type Standing = Team & {
  seed: number;
  inPlayoffs: boolean;
  streak: string;
};

export type LeagueInfo = {
  name: string;
  season: string;
  teamCount: number;
  playoffTeams: number;
  playoffWeekStart: number;
  rosterPositions: string[];
  scoring: Record<string, number>;
};

export type NflGame = {
  id: string;
  home: { abbr: string; score: number | null; logo: string | null };
  away: { abbr: string; score: number | null; logo: string | null };
  status: string;
  state: 'pre' | 'in' | 'post';
  clock?: string;
  period?: number;
};

export type PlayoffOdds = {
  rosterId: number;
  makePlayoffs: number;
  bye: number;
  topSeed: number;
  tag: 'Clinched' | 'Clinch Watch' | 'Bubble' | 'In Trouble' | 'Eliminated';
};
