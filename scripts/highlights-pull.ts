// Highlights pull, Brief Section 3.
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
import { recentUploads, uploadsPlaylistId, youtubeConfigured } from '../lib/youtube.ts';

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

const [seen, since] = await Promise.all([storedIds(), newestPublishedAt()]);
console.log(`  ${seen.size} clips already stored${since ? `, newest ${since}` : ''}`);

const uploads = await recentUploads(playlist, { since, maxPages: since ? 2 : 3 });
const fresh = uploads.filter((upload) => !seen.has(upload.id));
console.log(`  ${uploads.length} uploads read, ${fresh.length} of them new`);

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
  { name?: string }
>;
const byName = new Map<string, string>();
for (const [id, player] of Object.entries(players)) {
  if (player?.name) byName.set(normaliseName(player.name), id);
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

/** Week points and whether the player was started, from the week's matchups. */
const pointsOf = new Map<string, number>();
const startedSet = new Set<string>();
try {
  for (const matchup of await getMatchups(week)) {
    for (const [playerId, points] of Object.entries(matchup.players_points ?? {})) {
      pointsOf.set(playerId, Number(points));
    }
    for (const playerId of matchup.starters ?? []) startedSet.add(playerId);
  }
} catch {
  console.warn('  matchups unavailable, clips store without points');
}

const rows: NewHighlight[] = plays.map((play) => {
  const upload = fresh.find((item) => item.id === play.id);
  const matched = play.players
    .map((name) => byName.get(normaliseName(name)))
    .filter((id): id is string => Boolean(id));

  // The first matched player who is actually rostered decides ownership, so a
  // clip naming both a scorer and a defender attributes to the one in our
  // league rather than to whoever was named first.
  const ownedId = matched.find((id) => ownerOf.has(id));
  const subject = ownedId ?? matched[0];
  const rosterId = ownedId ? ownerOf.get(ownedId) : undefined;

  return {
    id: play.id,
    week,
    title: upload?.title ?? '',
    published_at: upload?.publishedAt ?? new Date().toISOString(),
    play_type: play.playType || null,
    player_ids: matched.length ? matched : null,
    // Text, which is how the column was defined, even though roster ids are
    // numbers everywhere else.
    owner_team_id: rosterId != null ? String(rosterId) : null,
    started: subject ? startedSet.has(subject) : null,
    fantasy_points: subject && pointsOf.has(subject) ? pointsOf.get(subject)! : null,
    is_cmon_man: false,
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
