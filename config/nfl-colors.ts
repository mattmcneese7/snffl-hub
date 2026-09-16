// NFL team colors for player backgrounds.
//
// Hardcoded rather than fetched. These do not change from week to week, and a
// failed request would drop a gray hero behind a player whose color is known.
// Keys are the abbreviations the nightly player database uses, which are also
// the ids team defenses are stored under.
//
// Two teams list a light gold as their nominal primary. Behind a name at 22px
// that is unreadable at any text color, so Pittsburgh and New Orleans use their
// black instead.

import { contrastWithWhite } from '../lib/managers.ts';

export const NFL_PRIMARY: Record<string, string> = {
  ARI: '#97233F',
  ATL: '#A71930',
  BAL: '#241773',
  BUF: '#00338D',
  CAR: '#0085CA',
  CHI: '#0B162A',
  CIN: '#FB4F14',
  CLE: '#311D00',
  DAL: '#003594',
  DEN: '#FB4F14',
  DET: '#0076B6',
  GB: '#203731',
  HOU: '#03202F',
  IND: '#002C5F',
  JAX: '#006778',
  KC: '#E31837',
  LAC: '#0080C6',
  LAR: '#003594',
  LV: '#000000',
  MIA: '#008E97',
  MIN: '#4F2683',
  NE: '#002244',
  NO: '#101820',
  NYG: '#0B2265',
  NYJ: '#125740',
  PHI: '#004C54',
  PIT: '#101820',
  SEA: '#002244',
  SF: '#AA0000',
  TB: '#D50A0A',
  TEN: '#0C2340',
  WAS: '#5A1414',
};

/** Dark text for a light team color. A literal, never var(--ink). */
const ON_LIGHT = '#141210';
const ON_DARK = '#FFFFFF';

export type TeamPaint = { background: string; on: string };

/**
 * Background and text color for one NFL team.
 *
 * Only the player name sits directly on this color. At 22px bold it is large
 * text, so the floor is 3:1, and every real team color clears that with one
 * choice or the other. The 12px position and team line needs 4.5:1, which
 * powder blue cannot give in either direction, so that line carries its own
 * box instead of forcing the background away from the real brand color.
 *
 * White is preferred wherever it clears the floor, because that is how these
 * teams actually present themselves. The dark alternative is a literal, not a
 * theme token: the hero keeps its team color in both themes, so var(--ink)
 * would invert to near white and disappear.
 *
 * A player with no NFL team falls back to theme tokens, which are already gated.
 */
export function teamPaint(team?: string): TeamPaint {
  const background = team ? NFL_PRIMARY[team] : undefined;
  if (!background) return { background: 'var(--surface)', on: 'var(--ink)' };
  return {
    background,
    on: contrastWithWhite(background) >= 3 ? ON_DARK : ON_LIGHT,
  };
}
