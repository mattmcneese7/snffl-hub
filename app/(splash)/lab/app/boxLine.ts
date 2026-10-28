import { formatStatLine } from '@/lib/sleeper-live';

/**
 * The box score line, as Sleeper prints it. One formatter for the whole app
 * (the matchup rows, the sheet and the game log), so every line reads alike:
 * "26/44, 295 YD, 2 TD" and "6/7 REC, 148 YD, 1 REC TD".
 */
export function boxLine(pos: string, l: Record<string, number>): string {
  return formatStatLine(pos, l);
}
