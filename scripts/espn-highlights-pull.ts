// ESPN highlights pull, Checkpoint 12b. Replaces the YouTube pull as the
// scheduled source: the NFL blocks its YouTube clips on sites it has not
// approved, and ESPN's syndicatable clips play in ESPN's own embed player.
//
// Hourly across game windows. Reads the clip lists on this week's and last
// week's game summaries plus ESPN's recent feed, keeps syndicatable NFL clips
// it has not stored, asks Haiku what each one is (a play, a recap, a show) and
// which unit made it, and attributes it by ESPN athlete id first.
//
// Run with Node 24, which strips TypeScript types natively.

import { buildAttributor } from '../lib/clip-attribution.ts';
import { clipIdsForGames, getEspnClip, recentNflClips, type EspnClip } from '../lib/espn-video.ts';
import { getNflGames } from '../lib/gameday.ts';
import { classifyUploads } from '../lib/highlight-tags.ts';
import { saveHighlights, storedIds, type NewHighlight } from '../lib/highlights.ts';
import { league, scoredWeek } from '../lib/league.ts';
import { writerConfigured } from '../lib/supabase.ts';

if (!writerConfigured) {
  console.error('no Supabase service credentials, nothing can be written');
  process.exit(1);
}

const week = await scoredWeek();
const weeks = [...new Set([week, Math.max(1, week - 1)])];
console.log(`ESPN highlights pull, weeks ${weeks.join(' and ')}`);

// Which ESPN game belongs to which fantasy week, so a clip lands in its week.
const weekOfGame = new Map<string, number>();
const eventIds: string[] = [];
for (const w of weeks) {
  for (const game of await getNflGames(w, league.season)) {
    weekOfGame.set(game.id, w);
    if (game.state !== 'pre') eventIds.push(game.id);
  }
}

const [seen, fromGames, fromFeed] = await Promise.all([
  storedIds(2000),
  clipIdsForGames(eventIds),
  recentNflClips(),
]);
console.log(`  ${eventIds.length} games started, ${fromGames.length} clips on their pages, ${fromFeed.length} NFL clips in the feed`);

const clips = new Map<string, EspnClip>();
for (const clip of fromFeed) if (!seen.has(`espn:${clip.id}`)) clips.set(clip.id, clip);
const missing = fromGames.filter((id) => !seen.has(`espn:${id}`) && !clips.has(id));
for (const clip of await Promise.all(missing.map((id) => getEspnClip(id)))) {
  if (clip) clips.set(clip.id, clip);
}
console.log(`  ${clips.size} new syndicatable clips`);
if (!clips.size) {
  console.log('nothing new. Done.');
  process.exit(0);
}

const list = [...clips.values()];
const classified = await classifyUploads(
  list.map((clip) => ({
    id: `espn:${clip.id}`,
    title: clip.headline,
    description: clip.description,
    publishedAt: clip.publishedAt,
    thumbnail: clip.thumbnail,
  }))
);
if (!classified.length) {
  console.log('nothing came back from the tagger. Done.');
  process.exit(0);
}

const attribute = await buildAttributor(weeks, (line) => console.log(line));

const rows: NewHighlight[] = classified.map((entry) => {
  const clip = clips.get(entry.id.slice('espn:'.length))!;
  const clipWeek = (clip.gameId && weekOfGame.get(clip.gameId)) || week;
  // Anything that is not a single play is still stored, against week 0, so it
  // is never offered to the tagger again and never read back as a highlight.
  if (entry.kind !== 'play') {
    return {
      id: entry.id,
      week: 0,
      title: clip.headline,
      published_at: clip.publishedAt,
      play_type: null,
      player_ids: null,
      owner_team_id: null,
      started: null,
      fantasy_points: null,
      is_cmon_man: false,
      thumbnail: clip.thumbnail,
    };
  }
  const who = attribute(entry, clipWeek, clip.athleteIds);
  return {
    id: entry.id,
    week: clipWeek,
    title: clip.headline,
    published_at: clip.publishedAt,
    play_type: entry.playType || null,
    ...who,
    is_cmon_man: false,
    thumbnail: clip.thumbnail,
  };
});

const written = await saveHighlights(rows);
const plays = rows.filter((row) => row.week > 0);
console.log(`  stored ${written}: ${plays.length} plays (${plays.filter((r) => r.owner_team_id).length} attributed), ${rows.length - plays.length} marked seen`);
for (const row of plays) {
  console.log(`   [${row.owner_team_id ?? 'free agent'}] ${row.side ?? ''} ${row.play_type ?? ''} :: ${row.title.slice(0, 60)}`);
}
