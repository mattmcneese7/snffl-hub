/**
 * Points he has actually scored this week, or null. Null until his NFL game
 * has kicked off (and on a bye): Sleeper carries every rostered player at 0
 * until he plays, and a 0 before kickoff is not a score. Rows show the
 * projection instead.
 */
export function scoredThisWeek(gameState: 'pre' | 'in' | 'post' | null | undefined, ...sources: (number | null | undefined)[]): number | null {
  if (gameState !== 'in' && gameState !== 'post') return null;
  for (const v of sources) if (v != null) return v;
  return null;
}
