import { NextResponse } from 'next/server';
import { firstNameOf } from '@/config/managers';
import { league, playerOf, teamByRoster } from '@/lib/league';
import { getMatchups, getRosters } from '@/lib/sleeper';

/**
 * Everything the v4 player sheet shows, for one player: who he is, who has him
 * in this league and what he has done for them, his season and week by week
 * line, and how the rest of Sleeper rosters and starts him. All Sleeper,
 * scored PPR, which is this league's scoring.
 */
export const dynamic = 'force-dynamic';

type WeekStat = { opponent?: string; is_away_team?: boolean; stats?: Record<string, number> } | null;

const KEEP = new Set(['pass_att', 'pass_cmp', 'pass_yd', 'pass_td', 'pass_int', 'rush_att', 'rush_yd', 'rush_td', 'rec', 'rec_tgt', 'rec_yd', 'rec_td', 'fgm', 'fga', 'xpm', 'xpa', 'off_snp', 'tm_off_snp']);
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

async function json<T>(url: string, revalidate: number): Promise<T | null> {
  try {
    const r = await fetch(url, { next: { revalidate } });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[0-9A-Z]{1,8}$/.test(id)) return NextResponse.json({ error: 'No such player' }, { status: 404 });
  const p = playerOf(id);
  const season = league.season;
  const week = Math.max(1, league.state.week);
  const [weeks, projWeeks, info, research, rosters] = await Promise.all([
    json<Record<string, WeekStat>>(`https://api.sleeper.com/stats/nfl/player/${id}?season_type=regular&season=${season}&grouping=week`, 600),
    json<Record<string, WeekStat>>(`https://api.sleeper.com/projections/nfl/player/${id}?season_type=regular&season=${season}&grouping=week`, 1800),
    json<{ number?: number; age?: number; height?: string; weight?: string; years_exp?: number; college?: string; injury_status?: string | null; injury_body_part?: string | null }>(`https://api.sleeper.com/players/nfl/${id}`, 21600),
    json<Record<string, { owned?: number; started?: number }>>(`https://api.sleeper.com/players/nfl/research/regular/${season}/${week}`, 3600),
    getRosters().catch(() => []),
  ]);

  const owner = rosters.find((r) => (r.players ?? []).includes(id));
  let starts = 0;
  let forThem = 0;
  if (owner) {
    const weeksPlayed = Array.from({ length: week }, (_, i) => i + 1);
    const ms = await Promise.all(weeksPlayed.map((w) => getMatchups(w).catch(() => [])));
    for (const list of ms) {
      const m = list.find((x) => x.roster_id === owner.roster_id);
      if (m && m.starters?.includes(id)) {
        starts += 1;
        forThem += m.players_points?.[id] ?? 0;
      }
    }
  }
  const team = owner ? teamByRoster(owner.roster_id) : undefined;

  const log: { week: number; opp: string; pts: number | null; proj: number | null; line: Record<string, number> }[] = [];
  for (let w = 1; w <= Math.min(18, week + 1); w++) {
    const s = weeks?.[String(w)];
    const pr = projWeeks?.[String(w)];
    const opp = s?.opponent ?? pr?.opponent;
    if (!opp && !s) {
      log.push({ week: w, opp: 'BYE', pts: null, proj: null, line: {} });
      continue;
    }
    log.push({
      week: w,
      opp: `${(s ?? pr)?.is_away_team ? '@' : ''}${opp ?? ''}`,
      pts: s?.stats?.pts_ppr ?? null,
      proj: pr?.stats?.pts_ppr ?? null,
      line: Object.fromEntries(Object.entries(s?.stats ?? {}).filter(([k]) => KEEP.has(k))),
    });
  }
  const played = log.filter((l) => l.pts != null);
  const total = played.reduce((a, l) => a + (l.pts ?? 0), 0);
  const snaps = played.reduce((a, l) => a + (l.line.off_snp ?? 0), 0);
  const teamSnaps = played.reduce((a, l) => a + (l.line.tm_off_snp ?? 0), 0);

  return NextResponse.json(
    {
      id,
      name: p.name,
      position: p.position,
      team: p.team ?? null,
      headshot: p.headshot,
      espnId: p.espnId ?? null,
      number: info?.number ?? null,
      bio: [info?.age ? `Age ${info.age}` : null, info?.height ? `${Math.floor(Number(info.height) / 12)}'${Number(info.height) % 12}"` : null, info?.weight ? `${info.weight} lb` : null, info?.years_exp != null ? `${ordinal(info.years_exp + 1)} season` : null, info?.college ?? null].filter(Boolean),
      injury: info?.injury_status ? `${info.injury_status}${info.injury_body_part ? `, ${info.injury_body_part}` : ''}` : null,
      owner: team ? { team: team.teamName, manager: firstNameOf(team.rosterId) ?? team.manager, starts, points: Number(forThem.toFixed(2)) } : null,
      season: { points: Number(total.toFixed(2)), games: played.length, ppg: played.length ? Number((total / played.length).toFixed(2)) : 0, snapPct: teamSnaps ? Math.round((100 * snaps) / teamSnaps) : null },
      rostered: research?.[id]?.owned ?? null,
      started: research?.[id]?.started ?? null,
      log,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } },
  );
}
