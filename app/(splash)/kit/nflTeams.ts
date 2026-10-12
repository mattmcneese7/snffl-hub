/**
 * Every NFL team by its abbreviation, as "Area Team": San Francisco 49ers.
 * Keyed the way Sleeper writes them (WAS, LAR, LAC, JAX, LV), with the few
 * spellings ESPN uses instead (WSH) mapped to the same team.
 */
export const NFL_TEAMS: Record<string, string> = {
  ARI: 'Arizona Cardinals',
  ATL: 'Atlanta Falcons',
  BAL: 'Baltimore Ravens',
  BUF: 'Buffalo Bills',
  CAR: 'Carolina Panthers',
  CHI: 'Chicago Bears',
  CIN: 'Cincinnati Bengals',
  CLE: 'Cleveland Browns',
  DAL: 'Dallas Cowboys',
  DEN: 'Denver Broncos',
  DET: 'Detroit Lions',
  GB: 'Green Bay Packers',
  HOU: 'Houston Texans',
  IND: 'Indianapolis Colts',
  JAX: 'Jacksonville Jaguars',
  KC: 'Kansas City Chiefs',
  LV: 'Las Vegas Raiders',
  LAC: 'Los Angeles Chargers',
  LAR: 'Los Angeles Rams',
  MIA: 'Miami Dolphins',
  MIN: 'Minnesota Vikings',
  NE: 'New England Patriots',
  NO: 'New Orleans Saints',
  NYG: 'New York Giants',
  NYJ: 'New York Jets',
  PHI: 'Philadelphia Eagles',
  PIT: 'Pittsburgh Steelers',
  SF: 'San Francisco 49ers',
  SEA: 'Seattle Seahawks',
  TB: 'Tampa Bay Buccaneers',
  TEN: 'Tennessee Titans',
  WAS: 'Washington Commanders',
  WSH: 'Washington Commanders',
};

/** "San Francisco 49ers", or the abbreviation if it is not a team we know. */
export const nflTeamName = (abbr: string | null | undefined) => (abbr ? NFL_TEAMS[abbr.toUpperCase()] ?? abbr : '');

/** The club's name alone, "Raiders", "49ers", "Commanders": the logo beside it says the rest. */
export function nflNickname(abbr: string | null | undefined): string {
  const full = nflTeamName(abbr ?? '');
  return full.split(' ').pop() || full;
}
