// NFL highlight clips from the official YouTube channel, for the redesign
// bench only. Read only: nothing here writes to Supabase or anywhere else.
//
// The live app stores ESPN clips because the NFL blocks some YouTube embeds on
// outside sites (see scripts/highlights-pull.ts). This reads YouTube directly
// so the redesign can try the clips that do embed, without touching that path.
//
// Quota. The YouTube Data API gives 10,000 units a day. playlistItems.list is
// 1 unit for a page of 50; search.list would be 100, so this never searches.
// One invocation reads at most MAX_PAGES pages, so at most 6 units. Every page
// is a fetch cached for 30 minutes, and the page URLs are the same whichever
// week asks, so week 4 and week 5 on one render share the same pages. Worst
// case for one deployment is 6 units every 30 minutes, about 288 a day, under
// 3% of the free allowance. The unscheduled script in scripts/ does not run,
// so nothing else is spending it.
//
// The catch is volume. On a Sunday the channel posts roughly 100 uploads every
// five or six hours, mostly social captions, and the playlist only reads newest
// first. Six pages reach back about one game day, so an older week is usually
// out of reach without spending far more pages. readWeek says whether it got
// all the way back to the start of the week, so a caller can tell.

import { allPlayers, getWeekGames } from '@/lib/league';
import { normaliseName } from '@/lib/live';
import { uploadsPlaylistId } from '@/lib/youtube';
import type { PlayerLite } from '@/lib/types';

export type NflClip = {
  videoId: string;
  title: string;
  publishedAt: string;
  /** Widest still YouTube offered, else the hqdefault derived from the id. */
  still: string;
  /** Sleeper player ids named in the title, rostered players first. */
  playerIds: string[];
  /** Team abbreviations named in the title, Sleeper style (SF, LAC, WAS). */
  nflTeams: string[];
};

const API = 'https://www.googleapis.com/youtube/v3';
const MAX_PAGES = 6;
const REVALIDATE = 1800;
const DAY = 24 * 3600 * 1000;

/**
 * An NFL week's upload window.
 *
 * There is no dated schedule in the repo (data/spine.json has opponents but
 * no dates), so this counts from the opener the rest of the code uses:
 * Thursday, September 10, 2026. A week opens Thursday at midnight Eastern
 * and runs to 6 AM Eastern the following Wednesday, so Monday night clips
 * posted after midnight still land in their own week.
 */
const WEEK_ONE_OPENS = Date.parse('2026-09-10T04:00:00Z');
export function weekWindow(week: number): { start: number; end: number } {
  const start = WEEK_ONE_OPENS + (week - 1) * 7 * DAY;
  return { start, end: start + 6 * DAY + 6 * 3600 * 1000 };
}

type RawUpload = { id: string; title: string; publishedAt: string; still: string };

const bestStill = (id: string, thumbnails: Record<string, { url?: string }> | undefined) => {
  for (const size of ['maxres', 'standard', 'high']) {
    const url = thumbnails?.[size]?.url;
    if (url) return url;
  }
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
};

/**
 * Newest uploads until the window's start is passed or the page cap is hit.
 *
 * Errors end the walk and keep what came back. A missing key, a spent quota
 * or a network failure all read as "fewer clips", never as a thrown error.
 */
async function readUploads(start: number): Promise<{ uploads: RawUpload[]; calls: number; complete: boolean }> {
  const key = process.env.YOUTUBE_API_KEY;
  const playlistId = await uploadsPlaylistId();
  if (!key || !playlistId) return { uploads: [], calls: 0, complete: false };

  const uploads: RawUpload[] = [];
  let pageToken: string | undefined;
  let calls = 0;
  let complete = false;

  try {
    while (calls < MAX_PAGES) {
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: '50',
        key,
      });
      if (pageToken) params.set('pageToken', pageToken);
      calls++;
      const res = await fetch(`${API}/playlistItems?${params}`, {
        next: { revalidate: REVALIDATE },
      } as RequestInit);
      if (!res.ok) break;
      const json = await res.json();
      const items: unknown[] = Array.isArray(json?.items) ? json.items : [];

      for (const raw of items) {
        const item = raw as {
          snippet?: { title?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }>; resourceId?: { videoId?: string } };
          contentDetails?: { videoId?: string; videoPublishedAt?: string };
        };
        const id = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
        const publishedAt = item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt;
        if (!id || !publishedAt) continue;
        uploads.push({
          id,
          title: String(item.snippet?.title ?? ''),
          publishedAt,
          still: bestStill(id, item.snippet?.thumbnails),
        });
      }

      const oldest = uploads.length ? Date.parse(uploads[uploads.length - 1].publishedAt) : Infinity;
      if (oldest < start) {
        complete = true;
        break;
      }
      pageToken = json?.nextPageToken;
      if (!items.length || !pageToken) {
        complete = !pageToken;
        break;
      }
    }
  } catch {
    // Keep whatever pages arrived before the failure.
  }
  return { uploads, calls, complete };
}

/**
 * Titles that are not a play or a single game.
 *
 * There is no duration on a playlist item (that would cost a videos.list
 * call per 50), so long videos are caught by what they call themselves: full
 * games, condensed games, shows, podcasts, press conferences, previews,
 * the daily NFL Report and the sponsored challenge videos.
 */
export const NOT_A_CLIP =
  /podcast|good morning football|\bgmfb\b|total access|nfl network|inside the nfl|press conference|presser|mic['’]?d up|full game|condensed|all[- ]?22|film (session|breakdown|room)|power rankings|prediction|preview|fantasy|live ?stream|\binterview|trailer|mock draft|\bdraft\b|hard knocks|throwback|\bepisode\b|\bep\.? ?\d|\bshow\b|top 100|reaction|\bpicks\b|announc|nfl report|injury update|r2ez|blind rank|challenge|national anthem|retire|passes away/i;

/**
 * Titles that read like a play or a game, kept even when no player is named.
 * Anything else that names no player is a social caption ("👀", "jets win!")
 * or a weekday talk segment ("Could Tyreek Be Returning to the Chiefs"), and
 * drops out. Naming a team is not enough on its own: those two are exactly
 * the titles that name a team and show no play.
 */
export const LOOKS_LIKE_A_PLAY =
  /highlights|best (plays|catches|throws|runs)|every (td|touchdown|catch|pass|sack|play)|touchdown|\btds?\b|interception|pick[- ]?six|\bint\b|fumble|sack|field goal|\bfg\b|catch|throw|\bruns?\b|rush|receiving|scores?\b|punt|kick|return|swat|juke|first down|4th down|ending|game[- ]winn|walk[- ]off|safety|onside|end zone/i;

/**
 * Nicknames and cities, to Sleeper's abbreviations. Only cities with a single
 * team: New York and Los Angeles name two, so those titles need the nickname.
 * Cities run after full names are blanked out, so Parker Washington is a
 * Jaguar and not the Commanders.
 */
const TEAM_NAMES: [RegExp, string][] = [
  [/\bcardinals\b|\barizona\b/, 'ARI'],
  [/\bfalcons\b|\batlanta\b/, 'ATL'],
  [/\bravens\b|\bbaltimore\b/, 'BAL'],
  [/\bbills\b|\bbuffalo\b/, 'BUF'],
  [/\bpanthers\b|\bcarolina\b/, 'CAR'],
  [/\bbears\b|\bchicago\b/, 'CHI'],
  [/\bbengals\b|\bcincinnati\b/, 'CIN'],
  [/\bbrowns\b|\bcleveland\b/, 'CLE'],
  [/\bcowboys\b|\bdallas\b/, 'DAL'],
  [/\bbroncos\b|\bdenver\b/, 'DEN'],
  [/\blions\b|\bdetroit\b/, 'DET'],
  [/\bpackers\b|\bgreen bay\b/, 'GB'],
  [/\btexans\b|\bhouston\b/, 'HOU'],
  [/\bcolts\b|\bindianapolis\b|\bindy\b/, 'IND'],
  [/\bjaguars\b|\bjags\b|\bjacksonville\b/, 'JAX'],
  [/\bchiefs\b|\bkansas city\b/, 'KC'],
  [/\braiders\b|\blas vegas\b/, 'LV'],
  [/\bchargers\b|\bbolts\b/, 'LAC'],
  [/\brams\b/, 'LAR'],
  [/\bdolphins\b|\bmiami\b/, 'MIA'],
  [/\bvikings\b|\bminnesota\b/, 'MIN'],
  [/\bpatriots\b|\bpats\b|\bnew england\b/, 'NE'],
  [/\bsaints?\b|\bnew orleans\b/, 'NO'],
  [/\bgiants\b/, 'NYG'],
  [/\bjets\b/, 'NYJ'],
  [/\beagles\b|\bphiladelphia\b|\bphilly\b/, 'PHI'],
  [/\bsteelers\b|\bpittsburgh\b/, 'PIT'],
  [/\b49ers\b|\bniners?\b|\bsan francisco\b/, 'SF'],
  [/\bseahawks\b|\bseattle\b/, 'SEA'],
  [/\bbuccaneers\b|\bbucc?s\b|\btampa bay\b/, 'TB'],
  [/\btitans\b|\btennessee\b/, 'TEN'],
  [/\bcommanders\b|\bwashington\b/, 'WAS'],
];

/**
 * Surnames that are everyday words or very common names. A title saying
 * "love", "chase" or "williams" on its own is not evidence of a player, so
 * these only count when the title also names that player's team. The word
 * half came from checking every surname in the player file against a
 * dictionary, after "Erick All", "Cooper Rush" and "Jaxson Dart" matched
 * captions that said all, rush and dart.
 */
const COMMON = new Set(
  (
    'all bass bell black blue bond booth boston branch brown burden chase cook cooks cooper dart ' +
    'folk ford golden gray grey green hall hardy hill holiday homer hope horn house hull hunt ' +
    'hurts key king knight lamb lance lane large law lemon likely little lock long loop love ' +
    'mason moss muse pierce price rattler reed rice rush sample sermon sharp small smack stick ' +
    'stone strand strange strong swift tremble ward warren white wise wood woods worthy young ' +
    'downs field fields best sweet guy page ' +
    'london jordan washington dallas houston austin henry james allen williams johnson smith jones ' +
    'davis miller wilson moore taylor anderson thomas jackson harris martin thompson robinson lewis ' +
    'walker wright adams baker campbell mitchell carter roberts turner phillips evans collins ' +
    'edwards stewart morris murphy rogers brooks watson banks sanders foster palmer'
  ).split(' ')
);

/**
 * How the channel and fans write a few players, to the name in the player
 * file. Resolved by name at runtime, so a player missing from the file is
 * simply skipped.
 */
const ALIASES: Record<string, string> = {
  jsn: 'jaxon smith njigba',
  cmc: 'christian mccaffrey',
  jamo: 'jameson williams',
  arsb: 'amon ra st brown',
  mhj: 'marvin harrison',
  bijan: 'bijan robinson',
  saquon: 'saquon barkley',
  puka: 'puka nacua',
  jamarr: 'jamarr chase',
  deebo: 'deebo samuel',
  tetairoa: 'tetairoa mcmillan',
};

/** Names as words, the same way on both sides: no possessives, no punctuation. */
const words = (value: string) =>
  ` ${normaliseName(
    value
      .replace(/(\w)['’]s\b/g, '$1')
      .replace(/(\w)['’](?=\s|$)/g, '$1')
  )
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;

type NameIndex = {
  byFull: Map<string, PlayerLite>;
  bySurname: Map<string, PlayerLite[]>;
  /** Every first name in the file, to spot a different person's full name. */
  firstNames: Set<string>;
  /** Longest first, so "amon ra st brown" is tried before "st brown". */
  fullNames: string[];
  surnames: string[];
};

let indexCache: NameIndex | null = null;

/**
 * Every fantasy player in the nightly file, by full name and by surname. The
 * surname is everything after the first name, so "st brown" and
 * "smith njigba" stay whole. Team defenses are left out: a title that names
 * the Lions is a team, not a D/ST pick.
 */
function nameIndex(): NameIndex {
  if (indexCache) return indexCache;
  const byFull = new Map<string, PlayerLite>();
  const bySurname = new Map<string, PlayerLite[]>();
  const firstNames = new Set<string>();
  for (const player of allPlayers()) {
    if (!player?.name || !player.position || player.position === 'DEF') continue;
    const full = words(player.name).trim();
    if (!full.includes(' ')) continue;
    byFull.set(full, player);
    firstNames.add(full.split(' ')[0]);
    const surname = full.split(' ').slice(1).join(' ');
    if (surname.length < 3) continue;
    bySurname.set(surname, [...(bySurname.get(surname) ?? []), player]);
  }
  const byLength = (a: string, b: string) => b.length - a.length;
  indexCache = {
    byFull,
    bySurname,
    firstNames,
    fullNames: [...byFull.keys()].sort(byLength),
    surnames: [...bySurname.keys()].sort(byLength),
  };
  return indexCache;
}

const teamsIn = (text: string) => TEAM_NAMES.filter(([pattern]) => pattern.test(text)).map(([, abbr]) => abbr);

/**
 * Sleeper ids named in a title.
 *
 * Full names first, and each match is blanked out of the title so its
 * surname cannot match a second player. Then aliases, then teams. Then
 * surnames alone, unless another first name sits right before them:
 * a rostered player with that surname wins, then the team in the title
 * decides between several, and a lone player with the name anywhere in the
 * file counts only if the surname is not a common word or name. Common
 * surnames need the team named too.
 */
/**
 * Clip titles as the NFL posts them often carry emoji and shouty marks
 * ("UNREAL‼️ 🔥"). Splash shows them as plain text: emoji and decorative
 * symbols out, runs of spaces collapsed.
 */
export function cleanTitle(title: string): string {
  return title
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{203C}\u{2049}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchTitle(title: string, rostered: Set<string>): { playerIds: string[]; nflTeams: string[] } {
  const index = nameIndex();
  let text = words(title);
  const found: string[] = [];
  const take = (id: string) => {
    if (!found.includes(id)) found.push(id);
  };
  const blank = (phrase: string) => {
    text = text.split(` ${phrase} `).join(' # ');
  };

  for (const full of index.fullNames) {
    if (!text.includes(` ${full} `)) continue;
    take(index.byFull.get(full)!.id);
    blank(full);
  }

  for (const [alias, full] of Object.entries(ALIASES)) {
    if (!text.includes(` ${alias} `)) continue;
    const player = index.byFull.get(full);
    if (player) take(player.id);
    blank(alias);
  }

  const nflTeams = teamsIn(text);

  // "Sean Payton", "Travis Hunter", "Mike Terrell": a surname right after
  // somebody else's first name is a different person, often a coach or a
  // defender who is not in the file. Skip it unless it appears bare as well.
  const bareSomewhere = (surname: string) =>
    text
      .split(` ${surname} `)
      .slice(0, -1)
      .some((before) => !index.firstNames.has(before.trim().split(' ').pop() ?? ''));

  for (const surname of index.surnames) {
    if (!text.includes(` ${surname} `)) continue;
    if (!bareSomewhere(surname)) continue;
    const everyone = index.bySurname.get(surname) ?? [];
    const onTeam = (list: PlayerLite[]) => list.filter((p) => p.team && nflTeams.includes(p.team));
    const owned = everyone.filter((p) => rostered.has(p.id));
    const common = COMMON.has(surname);

    let pick: PlayerLite | undefined;
    if (owned.length && onTeam(owned).length === 1) pick = onTeam(owned)[0];
    else if (onTeam(everyone).length === 1) pick = onTeam(everyone)[0];
    else if (!common && owned.length === 1) pick = owned[0];
    else if (!common && everyone.length === 1) pick = everyone[0];

    if (pick) {
      take(pick.id);
      blank(surname);
    }
  }

  // Rostered players first, since those are the clips this league cares about.
  const ordered = [...found.filter((id) => rostered.has(id)), ...found.filter((id) => !rostered.has(id))];
  return { playerIds: ordered, nflTeams };
}

/** Every player on a roster that week, starters and bench. */
async function rosteredIn(week: number): Promise<Set<string>> {
  try {
    const games = await getWeekGames(week);
    const ids = new Set<string>();
    for (const game of games) {
      for (const side of [game.home, game.away]) {
        for (const slot of [...side.lineup, ...(side.bench ?? [])]) ids.add(slot.id);
      }
    }
    return ids;
  } catch {
    return new Set();
  }
}

export type WeekRead = {
  clips: NflClip[];
  /** playlistItems.list calls this read made, one quota unit each. */
  calls: number;
  /** Whether the walk reached back to the start of the week. */
  complete: boolean;
  /** The ids rostered that week, for callers that want to split owned clips. */
  rostered: Set<string>;
};

/** clipsForWeek with the bookkeeping, for the bench page and for checks. */
export async function readWeek(week: number): Promise<WeekRead> {
  try {
    const { start, end } = weekWindow(week);
    const [{ uploads, calls, complete }, rostered] = await Promise.all([readUploads(start), rosteredIn(week)]);

    const clips: NflClip[] = [];
    for (const upload of uploads) {
      const at = Date.parse(upload.publishedAt);
      if (!(at >= start && at < end)) continue;
      if (NOT_A_CLIP.test(upload.title)) continue;
      const { playerIds, nflTeams } = matchTitle(upload.title, rostered);
      if (!playerIds.length && !LOOKS_LIKE_A_PLAY.test(upload.title)) continue;
      clips.push({
        videoId: upload.id,
        title: cleanTitle(upload.title),
        publishedAt: upload.publishedAt,
        still: upload.still,
        playerIds,
        nflTeams,
      });
    }
    return { clips, calls, complete, rostered };
  } catch {
    return { clips: [], calls: 0, complete: false, rostered: new Set() };
  }
}

/** The week's single play and single game clips, newest first. Never throws. */
export async function clipsForWeek(week: number): Promise<NflClip[]> {
  return (await readWeek(week)).clips;
}

/** The week's clips naming any of these players. */
export async function clipsForPlayers(week: number, playerIds: string[]): Promise<NflClip[]> {
  const wanted = new Set(playerIds);
  return (await clipsForWeek(week)).filter((clip) => clip.playerIds.some((id) => wanted.has(id)));
}
