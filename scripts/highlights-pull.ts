// YouTube highlights pull, Brief Section 3. Unscheduled since Checkpoint 12b:
// the NFL blocks its YouTube clips on outside sites, so the hourly job runs
// scripts/espn-highlights-pull.ts instead. Kept for --reclassify and history.
//
// Every 30 minutes during game windows and once after the last game. Reads new
// NFL uploads, asks Haiku which are actually clips of a play, matches the named
// players to rosters, and stores the survivors.
//
// Only unseen uploads reach the tagger. Classifying a full page of 50 costs
// about two cents, so re-reading everything every half hour would run to
// roughly a dollar fifty over a weekend; classifying only what is new keeps it
// to a fraction of that. The video id is the dedupe key and the primary key.
//
// Run with Node 24, which strips TypeScript types natively.

import fs from 'node:fs';
import { classifyUploads } from '../lib/highlight-tags.ts';
import {
  newestPublishedAt,
  saveHighlights,
  storedIds,
  type NewHighlight,
} from '../lib/highlights.ts';
import { scoredWeek, teams } from '../lib/league.ts';
import { normaliseName } from '../lib/live.ts';
import { getMatchups, getRosters } from '../lib/sleeper.ts';
import { writerConfigured } from '../lib/supabase.ts';
import {
  recentUploads,
  uploadsPlaylistId,
  videoDetails,
  youtubeConfigured,
  type Upload,
} from '../lib/youtube.ts';

if (!youtubeConfigured()) {
  console.error('no YOUTUBE_API_KEY, nothing to pull');
  process.exit(1);
}
if (!writerConfigured) {
  console.error('no Supabase service credentials, nothing can be written');
  process.exit(1);
}

const week = await scoredWeek();
console.log(`highlights pull starting, week ${week}`);

const playlist = await uploadsPlaylistId();
if (!playlist) {
  console.error('could not resolve the uploads playlist');
  process.exit(1);
}

/**
 * --reclassify re-tags the clips already stored, for when the tagger learns
 * something new. Checkpoint 12b taught it which unit made a play, so defensive
 * clips stored before then can move to the D/ST that owns them. Costs about
 * a cent per 50 clips.
 */
const reclassify = process.argv.includes('--reclassify');

const [seen, since] = await Promise.all([storedIds(), newestPublishedAt()]);
console.log(`  ${seen.size} clips already stored${since ? `, newest ${since}` : ''}`);

let fresh: Upload[];
if (reclassify) {
  // Every stored row, the ones judged not a play too, with the full title and
  // description from YouTube: the tagger needs the same text it had the first
  // time, or it demotes real clips it can no longer recognise from a title.
  fresh = await videoDetails([...seen]);
  console.log(`  reclassifying ${fresh.length} of ${seen.size} stored rows with full descriptions`);
} else {
  const uploads = await recentUploads(playlist, { since, maxPages: since ? 2 : 3 });
  fresh = uploads.filter((upload) => !seen.has(upload.id));
  console.log(`  ${uploads.length} uploads read, ${fresh.length} of them new`);
}
/**
 * A re-tagged clip takes the week it was published in. NFL weeks run
 * Wednesday to Tuesday for uploads: Monday night's clips go up after midnight
 * and still belong to that week. Week 1 of 2026 opened Thursday, September 10.
 */
const WEEK_ONE_OPENS = Date.parse('2026-09-09T10:00:00Z');
const weekOfUpload = (publishedAt: string) =>
  Math.max(1, Math.floor((Date.parse(publishedAt) - WEEK_ONE_OPENS) / (7 * 24 * 3600 * 1000)) + 1);
const storedWeek = new Map<string, number>();
if (reclassify) for (const upload of fresh) storedWeek.set(upload.id, weekOfUpload(upload.publishedAt));

if (!fresh.length) {
  console.log('nothing new. Done.');
  process.exit(0);
}

const classified = await classifyUploads(fresh);
const plays = classified.filter((entry) => entry.kind === 'play');
console.log(`  ${classified.length} classified, ${plays.length} are clips of a play`);

if (!classified.length) {
  console.log('nothing came back from the tagger. Done.');
  process.exit(0);
}

/** Normalised player name to id, from the nightly database. */
const players = JSON.parse(fs.readFileSync('data/players.json', 'utf8')) as Record<
  string,
  { name?: string; position?: string; team?: string }
>;
const byName = new Map<string, string>();
const bySurnameTeam = new Map<string, string[]>();
const bySurname = new Map<string, string[]>();
const surnameOf = (name: string) => normaliseName(name).split(' ').slice(-1)[0] ?? '';
for (const [id, player] of Object.entries(players)) {
  if (!player?.name || !player.position || player.position === 'DEF') continue;
  byName.set(normaliseName(player.name), id);
  const last = surnameOf(player.name);
  const key = `${last}|${player.team ?? ''}`;
  bySurnameTeam.set(key, [...(bySurnameTeam.get(key) ?? []), id]);
  bySurname.set(last, [...(bySurname.get(last) ?? []), id]);
}

/**
 * A title often names only a surname: "Herbert to McConkey for the TD". Full
 * name first; then the surname on the team the tagger says made the play;
 * then the surname alone, only if exactly one fantasy player carries it.
 */
function matchName(name: string, team: string): string | null {
  const full = byName.get(normaliseName(name));
  if (full) return full;
  const last = surnameOf(name);
  if (!last) return null;
  const onTeam = team ? bySurnameTeam.get(`${last}|${DEF_CODE[team] ?? team}`) : undefined;
  if (onTeam?.length === 1) return onTeam[0];
  const anywhere = bySurname.get(last);
  return anywhere?.length === 1 ? anywhere[0] : null;
}

/**
 * Ownership from the live rosters, not the nightly starters.
 *
 * teams.json holds 126 starters rather than full rosters, and building
 * attribution from it left bench players looking like free agents. The same
 * trap cost touchdown attribution 18 of 30 before it was fixed there.
 */
const ownerOf = new Map<string, number>();
try {
  for (const roster of await getRosters()) {
    for (const playerId of roster.players ?? []) ownerOf.set(playerId, roster.roster_id);
  }
  console.log(`  ownership from live rosters, ${ownerOf.size} players`);
} catch {
  for (const team of teams) {
    for (const playerId of team.starters) ownerOf.set(playerId, team.rosterId);
  }
  console.warn(`  Sleeper rosters unavailable, using nightly starters, ${ownerOf.size} players`);
}

/**
 * Week points and whether the player was started, from each week's matchups.
 * Keyed by week, since a re-tag can span several.
 */
const pointsOf = new Map<string, number>();
const startedSet = new Set<string>();
const weekKey = (w: number, id: string) => `${w}:${id}`;
const weeksNeeded = new Set<number>([week, ...storedWeek.values()]);
for (const w of weeksNeeded) {
  try {
    for (const matchup of await getMatchups(w)) {
      for (const [playerId, points] of Object.entries(matchup.players_points ?? {})) {
        pointsOf.set(weekKey(w, playerId), Number(points));
      }
      for (const playerId of matchup.starters ?? []) startedSet.add(weekKey(w, playerId));
    }
  } catch {
    console.warn(`  Week ${w} matchups unavailable, clips store without points`);
  }
}

/** Sleeper keys a team defense by its code: KC, SF. ESPN style codes mapped. */
const DEF_CODE: Record<string, string> = { WSH: 'WAS', JAC: 'JAX', LA: 'LAR', LVR: 'LV' };
const defenseId = (team: string): string | null => {
  const code = DEF_CODE[team] ?? team;
  return code && players[code] ? code : null;
};

const rows: NewHighlight[] = plays.map((play) => {
  const upload = fresh.find((item) => item.id === play.id);
  const clipWeek = storedWeek.get(play.id) ?? week;
  const matched = play.players
    .map((name) => matchName(name, play.team))
    .filter((id): id is string => Boolean(id));

  // A defensive or special teams play belongs to the D/ST that made it, not
  // to the cornerback or returner, who nobody in this league rosters. So the
  // clip is attributed to whoever owns that team's defense, or reads as a
  // free agent defense if nobody does.
  const unit = play.side === 'defense' || play.side === 'special_teams' ? defenseId(play.team) : null;

  // Otherwise the first matched player who is actually rostered decides
  // ownership, so a clip naming both a scorer and a defender attributes to
  // the one in our league rather than to whoever was named first.
  const ownedId = unit ?? matched.find((id) => ownerOf.has(id));
  const subject = ownedId ?? matched[0];
  const rosterId = ownedId ? ownerOf.get(ownedId) : undefined;

  return {
    id: play.id,
    week: clipWeek,
    title: upload?.title ?? '',
    published_at: upload?.publishedAt ?? new Date().toISOString(),
    play_type: play.playType || null,
    player_ids: unit ? [unit] : matched.length ? matched : null,
    // Text, which is how the column was defined, even though roster ids are
    // numbers everywhere else.
    owner_team_id: rosterId != null ? String(rosterId) : null,
    started: subject ? startedSet.has(weekKey(clipWeek, subject)) : null,
    fantasy_points: subject && pointsOf.has(weekKey(clipWeek, subject)) ? pointsOf.get(weekKey(clipWeek, subject))! : null,
    is_cmon_man: false,
    side: play.side || null,
  };
});

/**
 * Everything classified is recorded, not just the clips worth showing.
 *
 * Storing only plays meant the tagger forgot every show, compilation and social
 * post it had already judged, and re-judged them on the next run: a second run
 * re-classified 16 uploads for nine tenths of a cent, and that grows with every
 * quiet hour. A non play is stored against week 0, which is a week the league
 * never plays, so it marks the id as seen without ever being read back as a
 * highlight.
 */
const seenRows: NewHighlight[] = classified
  .filter((entry) => entry.kind !== 'play')
  .map((entry) => {
    const upload = fresh.find((item) => item.id === entry.id);
    return {
      id: entry.id,
      week: 0,
      title: upload?.title ?? '',
      published_at: upload?.publishedAt ?? new Date().toISOString(),
      play_type: null,
      player_ids: null,
      owner_team_id: null,
      started: null,
      fantasy_points: null,
      is_cmon_man: false,
    };
  });

const written = await saveHighlights([...rows, ...seenRows]);
const attributed = rows.filter((row) => row.owner_team_id).length;
console.log(
  `  stored ${written} rows: ${rows.length} clips (${attributed} attributed), ${seenRows.length} marked seen`
);
for (const row of rows) {
  console.log(`   [${row.owner_team_id ?? 'free agent'}] ${row.play_type ?? 'play'} :: ${row.title.slice(0, 54)}`);
}
console.log('highlights pull complete.');
