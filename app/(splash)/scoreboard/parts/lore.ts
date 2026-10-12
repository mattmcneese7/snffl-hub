import { getChugCounts } from '@/lib/awards';
import { getStandings } from '@/lib/league';
import { getTrophyBoard } from '@/lib/trophies';

export type Lore = { text: string; hot?: boolean }[];

/**
 * What this season says about a team, the same lore the Home's score card
 * and scoreboard carry, as clean labels: "3 game win streak", "Shart | W4",
 * "Manager of the Week | W1, W3", "Chugged | W1". Hot chips are the bad
 * news. Read from the same three sources the Home reads, and an empty list
 * when any of them fails.
 */
export async function loreTable(): Promise<(rosterId: number) => Lore> {
  const [standings, trophies, chugs] = await Promise.all([
    getStandings().catch(() => []),
    getTrophyBoard().catch(() => null),
    getChugCounts().catch(() => []),
  ]);
  const all = trophies?.all ?? [];
  // Weeks as labels: "W1, W3", oldest first.
  const weeks = (list: (number | null)[]) =>
    [...new Set(list.filter((x): x is number => x != null))].sort((a, b) => a - b).map((x) => `W${x}`).join(', ');
  return (rosterId: number) => {
    const out: Lore = [];
    const streak = standings.find((t) => t.rosterId === rosterId)?.streak ?? '';
    const n = Number(streak.slice(1));
    if (n >= 2) out.push({ text: streak.startsWith('W') ? `${n} game win streak` : `${n} game losing streak`, hot: streak.startsWith('L') });
    const sharts = all.filter((a) => a.kind === 'shart' && a.rosterId === rosterId).map((a) => a.week);
    if (sharts.length) out.push({ text: `Shart | ${weeks(sharts)}`, hot: true });
    const motw = all.filter((a) => a.kind === 'motw' && a.rosterId === rosterId).map((a) => a.week);
    if (motw.length) out.push({ text: `Manager of the Week | ${weeks(motw)}` });
    const chug = chugs.find((c) => c.rosterId === rosterId);
    if (chug?.count) out.push({ text: `Chugged | ${weeks(chug.weeks)}`, hot: true });
    return out;
  };
}
