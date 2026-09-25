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

/**
 * One player's season stat line, stored exactly as Sleeper returns it.
 *
 * Not remapped into camelCase on purpose. Trimming the field list saved 1KB of
 * 230KB, so a sixty field mapping layer would buy nothing and add sixty chances
 * to put a mislabeled number on screen. Presentation picks and labels the
 * fields instead, in lib/stats.ts, where the league's own scoring decides which
 * ones matter.
 */
export type RawStats = Record<string, number>;

/** A labeled stat ready to render, already formatted. */
export type StatLine = {
  label: string;
  value: string;
};

/** A titled group of stat lines, such as Passing or Field Goals. */
export type StatBlock = {
  title: string;
  lines: StatLine[];
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
  /**
   * A starter is on the field right now.
   *
   * Distinct from status: 'live', which only means somebody has scored this
   * week and stays true from Thursday night until the week rolls over. A
   * pulsing LIVE badge on a Tuesday afternoon is a lie, so the badge reads
   * this and the scoring logic keeps reading status.
   */
  inPlay?: boolean;
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
