import { firstNameOf } from '@/config/managers';
import { teamByRoster } from '@/lib/league';
import type { Game } from '@/lib/types';
import { shortName } from './weekData';

/** "Sun 12:00 PM", Central, the way Sleeper and ESPN print a kickoff. */
export function kickoffText(iso: string): string {
  const at = new Date(iso);
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Chicago' }).format(at);
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(at);
  return `${day} ${time}`;
}

/** "Q3 4:12", or "OT 2:00". */
export const quarter = (period: number | null | undefined, clock: string | null | undefined) =>
  `${period && period > 4 ? 'OT' : `Q${period ?? 1}`} ${clock ?? ''}`.trim();

export const record = (rosterId: number) => {
  const t = teamByRoster(rosterId);
  return t ? `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}` : '';
};

export const managerOf = (rosterId: number, fallback = '') => firstNameOf(rosterId) ?? teamByRoster(rosterId)?.manager ?? fallback;

/** League starters in one NFL game: how many, and yours by name. */
export function startersIn(games: Game[], abbrs: string[], mine: number | null) {
  const want = new Set(abbrs);
  let count = 0;
  const yours: string[] = [];
  for (const g of games)
    for (const side of [g.away, g.home])
      for (const p of side.lineup) {
        if (!p.team || !want.has(p.team)) continue;
        count++;
        if (side.rosterId === mine) yours.push(shortName(p.name, p.position, p.team));
      }
  return { count, yours };
}
