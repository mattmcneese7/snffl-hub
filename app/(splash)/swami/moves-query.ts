import { cache } from 'react';
import { loadRosBoard } from '@/lib/ros-load';

/**
 * The Swami's URL, shared by the research filters, the trade evaluator and
 * the waiver pickups. Everything on the page lives in it, so a half built
 * trade or a filtered waiver list is a link that opens on exactly what was on
 * screen, and changing one widget never resets another.
 *
 *   pos, own        the research filters
 *   a, b, pa, pb    the trade: two rosters and who each sends
 *   team, wpos      waivers: a roster id or "league", and a position
 */

export type SwamiQuery = Record<string, string | string[] | undefined>;

/** The keys the trade and waiver widgets own. */
export const MOVE_KEYS = ['a', 'b', 'pa', 'pb', 'team', 'wpos'] as const;
const ALL_KEYS = ['pos', 'own', ...MOVE_KEYS] as const;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
export const qv = (query: SwamiQuery, key: string) => one(query[key]);

/** The trade and waiver keys as they stand, for the research filters to carry. */
export function keepMoves(query: SwamiQuery): URLSearchParams {
  const q = new URLSearchParams();
  for (const key of MOVE_KEYS) {
    const v = one(query[key]);
    if (v) q.set(key, v);
  }
  return q;
}

/** The Swami with some keys changed. Null removes one. */
export function swamiHref(query: SwamiQuery, next: Record<string, string | null>): string {
  const q = new URLSearchParams();
  for (const key of ALL_KEYS) {
    const v = key in next ? next[key] : one(query[key]);
    if (v) q.set(key, v);
  }
  const qs = q.toString();
  return qs ? `/swami?${qs}` : '/swami';
}

/** Comma separated player ids, cleaned the way v2 cleans them. */
export const idList = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => /^[A-Za-z0-9]+$/.test(x))
    .slice(0, 10);

/**
 * The rest of season board, loaded once per request however many widgets
 * read it: rosters, projections and every player's read are shared.
 */
export const rosBoard = cache(loadRosBoard);
