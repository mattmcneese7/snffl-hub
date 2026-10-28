import { league } from '@/lib/league';

/**
 * Sleeper scoring keys worth showing, in the order people ask about them.
 * The same lists v2 shows, plus the rows Sleeper scores that v2 skipped:
 * forced fumbles, special teams touchdowns, the 21 to 27 points allowed
 * band (so the ladder has no gap) and the yards allowed ladder.
 */
export const OFFENSE: [string, string][] = [
  ['pass_td', 'Passing TD'],
  ['pass_yd', 'Passing yards'],
  ['pass_int', 'Interception thrown'],
  ['rush_td', 'Rushing TD'],
  ['rush_yd', 'Rushing yards'],
  ['rec', 'Reception'],
  ['rec_td', 'Receiving TD'],
  ['rec_yd', 'Receiving yards'],
  ['fum_lost', 'Fumble lost'],
  ['pass_2pt', 'Two point pass'],
  ['rush_2pt', 'Two point rush'],
  ['rec_2pt', 'Two point catch'],
];

export const KICKING: [string, string][] = [
  ['fgm_0_19', 'Field goal, 0 to 19 yards'],
  ['fgm_20_29', 'Field goal, 20 to 29 yards'],
  ['fgm_30_39', 'Field goal, 30 to 39 yards'],
  ['fgm_40_49', 'Field goal, 40 to 49 yards'],
  ['fgm_50_59', 'Field goal, 50 to 59 yards'],
  ['fgm_60p', 'Field goal, 60 or more yards'],
  ['fgmiss', 'Missed field goal'],
  ['xpm', 'Extra point'],
  ['xpmiss', 'Missed extra point'],
];

export const DEFENSE: [string, string][] = [
  ['sack', 'Sack'],
  ['int', 'Interception'],
  ['fum_rec', 'Fumble recovery'],
  ['ff', 'Forced fumble'],
  ['def_td', 'Defensive TD'],
  ['def_st_td', 'Special teams TD'],
  ['safe', 'Safety'],
  ['blk_kick', 'Blocked kick'],
];

export const POINTS_ALLOWED: [string, string][] = [
  ['pts_allow_0', 'Shutout'],
  ['pts_allow_1_6', '1 to 6 points'],
  ['pts_allow_7_13', '7 to 13 points'],
  ['pts_allow_14_20', '14 to 20 points'],
  ['pts_allow_21_27', '21 to 27 points'],
  ['pts_allow_28_34', '28 to 34 points'],
  ['pts_allow_35p', '35 or more points'],
];

export const YARDS_ALLOWED: [string, string][] = [
  ['yds_allow_0_100', '0 to 100 yards'],
  ['yds_allow_100_199', '100 to 199 yards'],
  ['yds_allow_200_299', '200 to 299 yards'],
  ['yds_allow_300_349', '300 to 349 yards'],
  ['yds_allow_350_399', '350 to 399 yards'],
  ['yds_allow_400_449', '400 to 449 yards'],
  ['yds_allow_450_499', '450 to 499 yards'],
  ['yds_allow_500_549', '500 to 549 yards'],
  ['yds_allow_550p', '550 or more yards'],
];

/** +4, -2, +0.04, 0: the sign says which way it goes. */
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

/** A per yard value as people say it: 0.04 a yard is a point every 25. */
export const perPoint = (n: number) => (n > 0 && n < 1 ? Math.round(1 / n) : null);

export type Row = { label: string; value: number; key: string };

export const rowsOf = (labels: [string, string][]): Row[] =>
  labels
    .map(([key, label]) => ({ key, label, value: league.scoring[key] }))
    .filter((x): x is Row => typeof x.value === 'number');

