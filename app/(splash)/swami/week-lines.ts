import { dsWeekly } from '@/lib/draftsharks';
import {
  gamesByTeam,
  getNflGames,
  getSlateLines,
  impliedTeamTotal,
  type GameLines,
  type TeamGame,
} from '@/lib/gameday';
import { formatStatLine, getWeekProjectionLines, getWeekStatLines, type PlayerWeekLine } from '@/lib/sleeper-live';
import { DEFAULT_BOOK, moneyText, slateLines } from '../lib/odds-books';
import { statWords } from '../kit/statWords';

/**
 * A player's week in numbers, for any v3 row that shows one: his stat line
 * (what he has done if he has played, what he is projected to do if not), the
 * book's line on his game, and DraftSharks' range. The same sources v2's
 * player page reads: Sleeper's weekly stat and projection lines, the book
 * this device picked (DraftKings through ESPN's game summaries where that
 * book has none), and the DraftSharks board.
 *
 * Every reader underneath degrades to empty rather than throwing, so a
 * missing line is a missing sentence, never a broken page.
 */
export type WeekLines = {
  byTeam: Map<string, TeamGame>;
  lines: Record<string, GameLines>;
  projected: Record<string, PlayerWeekLine>;
  actual: Record<string, PlayerWeekLine>;
};

export async function weekLines(season: string, week: number, teams?: Iterable<string>, book: string = DEFAULT_BOOK): Promise<WeekLines> {
  const games = await getNflGames(week, season);
  const live = games.some((g) => g.state === 'in');
  const byTeam = gamesByTeam(games);
  // Only the games somebody on screen plays in, when the caller knows who that
  // is: one summary call per game, so a lineup asks for nine at most.
  const wanted = teams ? new Set(teams) : null;
  const slate = wanted ? games.filter((g) => wanted.has(g.home.abbr) || wanted.has(g.away.abbr)) : games;
  const [espnLines, projected, actual] = await Promise.all([
    getSlateLines(slate).catch(() => ({})),
    getWeekProjectionLines(season, week).catch(() => ({})),
    getWeekStatLines(season, week, live).catch(() => ({})),
  ]);
  const lines = await slateLines(slate, espnLines, book);
  return { byTeam, lines, projected, actual };
}

export type Pair = { label: string; value: string };

export type PlayerWeek = {
  /** "This week" once he has stats this week, else "Projected". */
  statLabel: string | null;
  /** The stat line in words: "13 carries, 59 yards". */
  stat: string | null;
  /** The book the line on his game came from: the one picked, or DraftKings standing in. */
  provider: string | null;
  /** The book on his game, one fact a pair. */
  book: Pair[];
  /** DraftSharks' weekly range and position rank. */
  ds: Pair[];
};

/**
 * lib/sleeper-live prints a stat line the way a box score does (CAR, YD,
 * REC). Splash spells them out, so nobody has to know the shorthand.
 */
const WORDS: [RegExp, string][] = [
  // The lib joins a number to its word with a no-break space, so every
  // pattern takes either kind of space.
  [/\bRUSH[\s ]TD\b/g, 'rushing TD'],
  [/\bREC[\s ]TD\b/g, 'receiving TD'],
  [/\bCAR\b/g, 'carries'],
  [/\bYD\b/g, 'yards'],
  [/\bREC\b/g, 'catches'],
  [/\bINT\b/g, 'interceptions'],
  [/\bFUM\b/g, 'fumbles'],
  [/\bFG\b/g, 'field goals'],
  [/\bXP\b/g, 'extra points'],
  [/\bLONG\b/g, 'long'],
  [/\bSACK\b/g, 'sacks'],
  [/\bPA\b/g, 'points allowed'],
];
/** One of a thing is singular: "1 carry", not "1 carries". */
const ONE: Record<string, string> = {
  carries: 'carry',
  yards: 'yard',
  catches: 'catch',
  interceptions: 'interception',
  fumbles: 'fumble',
  sacks: 'sack',
};
const spell = (line: string) =>
  WORDS.reduce((out, [re, word]) => out.replace(re, word), line).replace(
    /(^|[\s,])1([\s ])(carries|yards|catches|interceptions|fumbles|sacks)\b/g,
    (_, lead: string, gap: string, word: string) => `${lead}1${gap}${ONE[word]}`
  );

export function playerWeek(ctx: WeekLines, id: string, position: string, team?: string): PlayerWeek {
  const done = formatStatLine(position, ctx.actual[id]?.stats);
  const proj = formatStatLine(position, ctx.projected[id]?.stats, true);
  // Spelled out the way a broadcast says it: "19 of 28 passes", not "19/28".
  const raw = statWords(done || proj) || null;
  const statLabel = done ? 'This week' : proj ? 'Projected' : null;

  let provider: string | null = null;
  const book: Pair[] = [];
  const tg = team ? ctx.byTeam.get(team) : undefined;
  const lines = tg ? ctx.lines[tg.game.id] : undefined;
  if (tg && lines && tg.game.state !== 'post') {
    const total = impliedTeamTotal(lines, tg.home);
    if (lines.details) book.push({ label: 'Spread', value: lines.details });
    if (lines.overUnder != null) book.push({ label: 'Over/under', value: String(lines.overUnder) });
    const money = moneyText(lines, tg.home);
    if (money) book.push({ label: 'Moneyline', value: money });
    if (total != null) book.push({ label: 'Team total', value: String(total) });
    if (book.length) provider = lines.provider;
  }

  const w = dsWeekly(id);
  const ds: Pair[] = [];
  if (w && w.floor != null && w.ceiling != null) {
    ds.push({ label: 'DraftSharks range', value: `${w.floor.toFixed(1)} to ${w.ceiling.toFixed(1)}` });
    ds.push({ label: 'DraftSharks rank', value: `${w.position}${w.posRank}` });
  }

  return { statLabel, stat: raw ? spell(raw) : null, provider, book, ds };
}
