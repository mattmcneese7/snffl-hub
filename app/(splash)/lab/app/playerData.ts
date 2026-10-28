import { firstNameOf } from '@/config/managers';
import { league, playerOf, teamByRoster } from '@/lib/league';
import { getMatchups, getRosters } from '@/lib/sleeper';
import { dsWeekly } from '@/lib/draftsharks';
import { formatMoneyline, gamesByTeam, getGameLines, getNflGames, impliedTeamTotal } from '@/lib/gameday';
import { newsFor } from '@/lib/news';
import { outlookFor, roleOf } from '@/lib/outlook';
import { readOf } from '@/lib/player-read';
import { scoreStats } from '@/lib/scoring';
import { formatStatLine, getWeekProjectionLines, getWeekStatLines } from '@/lib/sleeper-live';
import { lineFor, moneyText } from '../../lib/odds-books';
import { sleeperPropsFor, type SleeperProp } from '../../lib/sleeper-props';

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


export type PlayerData = Awaited<ReturnType<typeof getPlayerData>>;

/**
 * One player, as Splash 4.0 shows him: who he is, who has him in this league
 * and what he has done for them, his season and week by week line, and how
 * the rest of Sleeper rosters and starts him. Sleeper only, scored PPR,
 * which is this league's scoring. The sheet and the profile both read this.
 */
export async function getPlayerData(id: string) {
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

  return {
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
    };
}

export type PlayerWeek = Awaited<ReturnType<typeof getPlayerWeek>>;

/**
 * His week: the NFL game he plays in, every number on it as its own labeled
 * cell (projection, DraftSharks range and rank, implied total, spread, total,
 * moneyline, book, TV), his line so far or projected, the outlook with its
 * range and matchup, Sleeper's props and the latest news. Lines come from the
 * book this device picked, DraftKings where it has none.
 */
export async function getPlayerWeek(id: string, bookKey: string) {
  const p = playerOf(id);
  const week = Math.max(1, league.state.week);
  const [nfl, projLines, statLines, props] = await Promise.all([
    getNflGames(week, league.season).catch(() => []),
    getWeekProjectionLines(league.season, week).catch(() => ({}) as Awaited<ReturnType<typeof getWeekProjectionLines>>),
    getWeekStatLines(league.season, week).catch(() => ({}) as Awaited<ReturnType<typeof getWeekStatLines>>),
    sleeperPropsFor(id).catch(() => [] as SleeperProp[]),
  ]);
  const projection = projLines[id];
  const projected = projection?.stats ? scoreStats(projection.stats, league.scoring as Record<string, number>) : null;
  const matchup = p.team ? gamesByTeam(nfl).get(p.team) : undefined;
  const espn = matchup ? await getGameLines(matchup.game.id, matchup.game.state === 'in').catch(() => null) : null;
  const lines = matchup ? await lineFor(matchup.game, espn, bookKey).catch(() => null) : null;
  const teamTotal = matchup ? impliedTeamTotal(lines ?? undefined, matchup.home) : null;
  const book = matchup && lines ? (matchup.home ? lines.home : lines.away) : null;
  const weekly = dsWeekly(id);
  const outlook = outlookFor(id, p.position, p.team, projected ?? 0, week);

  // His team's side of the line, so a favorite reads negative.
  const spread = lines?.spread != null && matchup ? (matchup.home ? lines.spread : -lines.spread) : null;
  const open = Boolean(lines && matchup && matchup.game.state !== 'post');
  const cells: { label: string; value: string }[] = [
    ...(projected != null ? [{ label: 'Sleeper proj', value: projected.toFixed(2) }] : []),
    ...(weekly?.floor != null && weekly?.ceiling != null ? [{ label: 'DS range', value: `${weekly.floor.toFixed(1)} to ${weekly.ceiling.toFixed(1)}` }] : []),
    ...(weekly ? [{ label: 'DS rank', value: `${weekly.position}${weekly.posRank}` }] : []),
    ...(teamTotal != null ? [{ label: 'Implied total', value: String(teamTotal) }] : []),
    ...(open && spread != null ? [{ label: 'Spread', value: spread > 0 ? `+${spread}` : spread === 0 ? 'Even' : String(spread) }] : []),
    ...(open && lines!.overUnder != null ? [{ label: 'Total', value: String(lines!.overUnder) }] : []),
    ...(open
      ? lines!.win
        ? [{ label: 'Moneyline', value: moneyText(lines!, !!matchup?.home) ?? '' }]
        : [
            ...(book?.moneyline != null ? [{ label: 'Moneyline', value: formatMoneyline(book.moneyline) }] : []),
            ...(book?.implied != null ? [{ label: 'Win chance', value: `${Math.round(book.implied * 100)}%` }] : []),
          ]
      : []),
    ...(open && lines ? [{ label: 'Book', value: lines.provider }] : []),
    ...(matchup?.game.broadcast ? [{ label: 'TV', value: matchup.game.broadcast }] : []),
  ].filter((c) => c.value);

  const u = outlook.usage;
  const share = p.position === 'RB' ? u?.carryShare : u?.targetShare;
  return {
    week,
    game: matchup
      ? {
          id: matchup.game.id,
          home: matchup.home,
          opp: matchup.opponent.abbr,
          oppName: matchup.opponent.name,
          oppLogo: matchup.opponent.logo,
          color: matchup.team.color,
          state: matchup.game.state,
          status: matchup.game.status,
          kickoff: matchup.game.kickoff,
          us: matchup.team.score,
          them: matchup.opponent.score,
        }
      : null,
    cells,
    line: formatStatLine(p.position, statLines[id]?.stats),
    projectedLine: formatStatLine(p.position, projection?.stats, true),
    outlook: {
      adjusted: outlook.adjusted,
      base: outlook.base,
      floor: outlook.floor,
      ceiling: outlook.ceiling,
      median: outlook.median,
      source: outlook.source,
      confidence: outlook.confidence,
      weight: outlook.weight,
      matchup: outlook.matchup,
      boomBust: outlook.boomBust,
      trend: outlook.trend,
      ahead: outlook.ahead.map((f) => ({ week: f.week, opponent: f.opponent, home: f.home, label: f.label })),
      read: readOf(outlook, id),
      role: roleOf(id, p.position),
      usage: u ? { snaps: u.snapShare, shareLabel: p.position === 'RB' ? 'Carry share' : 'Target share', share: share ?? null, redZone: u.redZone ?? null } : null,
    },
    props,
    news: newsFor(p.espnId),
  };
}
