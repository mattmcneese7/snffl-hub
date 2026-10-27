import { firstNameOf } from '@/config/managers';
import { teamByRoster } from '@/lib/league';
import type { FeedItemKind } from '@/lib/feed-view';
import type { Tone } from '../ui';

/** "K. Cousins" for lists; a defense keeps its team. */
export function shortName(name: string, position?: string, team?: string | null): string {
  if (position === 'DEF') return team ?? name;
  const [first, ...rest] = name.split(' ');
  if (!rest.length || first.includes('.')) return name;
  return `${first[0]}. ${rest.join(' ')}`;
}

/** The manager's first name, as the league says it. */
export const managerOf = (rosterId: number) => firstNameOf(rosterId) ?? teamByRoster(rosterId)?.manager ?? '';
/** The team's name, trimmed. */
export const teamOf = (rosterId: number) => teamByRoster(rosterId)?.teamName.trim() ?? `Roster ${rosterId}`;

/** The marks the Feed's moments carry, as letters on a tag, never color alone. */
export const FEED_MARK: Record<FeedItemKind, string> = { touchdown: 'TD', lead: 'LEAD', cmon: 'CMON', shart: 'SHART', clip: 'CLIP' };
export const feedMarkTone = (kind: FeedItemKind): Tone => (kind === 'shart' || kind === 'cmon' ? 'bad' : 'neutral');

export const MOVE_MARK = { start: 'START', bench: 'BENCH', add: 'ADD', drop: 'DROP' } as const;
export const moveMarkTone = (kind: keyof typeof MOVE_MARK): Tone => (kind === 'add' ? 'good' : kind === 'drop' ? 'bad' : 'neutral');

/** How long ago, against one "now" the server hands down so every row agrees. */
export function timeAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
