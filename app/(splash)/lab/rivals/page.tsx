import type { Metadata } from 'next';
import { firstNameOf } from '@/config/managers';
import { getStandings, getWeekGames, league, scoredWeek } from '@/lib/league';
import { getPlayoffOdds } from '@/lib/playoff-odds';
import LabShell from '../kit/LabShell';
import Rivals, { type RivalTeam } from './Rivals';

export const metadata: Metadata = { title: { absolute: 'Rivals, Splash 4.0 lab' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const regularWeeks = () => Math.max(1, league.playoffWeekStart - 1);

/**
 * Every manager's season as numbers that can be laid side by side: weekly
 * scores, record, points for and against, all play record (how they would
 * stand had they played everyone every week), best and worst week, streak,
 * playoff odds, and every meeting between any two, past and scheduled.
 */
export default async function RivalsPage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const sp = await searchParams;
  const week = await scoredWeek();
  const last = regularWeeks();
  const weeks = Array.from({ length: last }, (_, i) => i + 1);
  const [standings, odds, perWeek] = await Promise.all([getStandings(), getPlayoffOdds().catch(() => []), Promise.all(weeks.map((w) => getWeekGames(w).catch(() => [])))]);

  const meetings: { week: number; a: number; b: number; aPts: number; bPts: number; status: 'final' | 'live' | 'pending' }[] = [];
  const scores = new Map<number, (number | null)[]>();
  const allPlay = new Map<number, { w: number; l: number }>();
  for (const games of perWeek) {
    const finals = games.filter((g) => g.status === 'final');
    const pts = finals.flatMap((g) => [g.home, g.away]).map((s) => s.points);
    for (const g of games) {
      meetings.push({ week: g.week, a: g.home.rosterId, b: g.away.rosterId, aPts: g.home.points, bPts: g.away.points, status: g.status });
      for (const s of [g.home, g.away]) {
        const row = scores.get(s.rosterId) ?? Array(last).fill(null);
        if (g.status === 'final') row[g.week - 1] = s.points;
        scores.set(s.rosterId, row);
        if (g.status === 'final') {
          const ap = allPlay.get(s.rosterId) ?? { w: 0, l: 0 };
          ap.w += pts.filter((p) => p < s.points).length;
          ap.l += pts.filter((p) => p > s.points).length;
          allPlay.set(s.rosterId, ap);
        }
      }
    }
  }

  const teams: RivalTeam[] = standings.map((s) => {
    const weekly = scores.get(s.rosterId) ?? [];
    const played = weekly.filter((v): v is number => v != null);
    const o = odds.find((x) => x.rosterId === s.rosterId);
    const best = played.length ? Math.max(...played) : null;
    const worst = played.length ? Math.min(...played) : null;
    return {
      rosterId: s.rosterId,
      name: firstNameOf(s.rosterId) ?? s.manager,
      team: s.teamName,
      avatar: s.avatarUrl ?? null,
      color: s.colors?.primary ?? '#c9dcfa',
      seed: s.seed,
      wins: s.wins,
      losses: s.losses,
      ties: s.ties,
      pf: s.pointsFor,
      pa: s.pointsAgainst,
      ppg: played.length ? played.reduce((a, b) => a + b, 0) / played.length : 0,
      allPlayW: allPlay.get(s.rosterId)?.w ?? 0,
      allPlayL: allPlay.get(s.rosterId)?.l ?? 0,
      best,
      bestWeek: best != null ? weekly.indexOf(best) + 1 : null,
      worst,
      worstWeek: worst != null ? weekly.indexOf(worst) + 1 : null,
      streak: s.streak,
      playoffs: o ? o.makePlayoffs : null,
      weekly,
    };
  });

  const pick = (v: string | undefined, fallback: number) => {
    const n = Number(v);
    return teams.some((t) => t.rosterId === n) ? n : fallback;
  };
  const a = pick(sp.a, teams[0].rosterId);
  const b = pick(sp.b, teams.find((t) => t.rosterId !== a)!.rosterId);

  return (
    <LabShell active="standings">
      <Rivals teams={teams} meetings={meetings} initialA={a} initialB={b === a ? teams.find((t) => t.rosterId !== a)!.rosterId : b} currentWeek={week} />
    </LabShell>
  );
}
