// Live watcher, Brief Section 3.
//
// Runs every 5 minutes Thursday to Monday and exits immediately when no NFL
// game is in progress, which is most of the time it fires.
//
// It keeps no state of its own. Dedupe reads the play ids the previous runs
// wrote into feed_posts.payload, and the hourly cap counts recent rows, so a
// missed run cannot desynchronise anything and there is no snapshot file to
// commit every five minutes.
//
// Run with Node 24, which strips TypeScript types natively.

import fs from 'node:fs';
import { anyGameLive, getNflScoreboard } from '../lib/espn.ts';
import { getTouchdowns } from '../lib/espn-plays.ts';
import { getWeekGames, scoredWeek, teams } from '../lib/league.ts';
import {
  applyCap,
  leadChangePosts,
  normaliseName,
  shartWatchPost,
  touchdownPosts,
  type NewPost,
  type PlayerLookup,
} from '../lib/live.ts';
import { firstNameOf } from '../config/managers.ts';
import { pushConfigured, sendAlert } from '../lib/push.ts';
import { getRosters } from '../lib/sleeper.ts';
import { writeClient, writerConfigured } from '../lib/supabase.ts';

const HOUR_MS = 60 * 60 * 1000;

if (!writerConfigured) {
  console.error('no Supabase service credentials, nothing can be written');
  process.exit(1);
}

const nfl = await getNflScoreboard();
if (!anyGameLive(nfl)) {
  console.log(`no NFL game in progress, ${nfl.length} on the slate. Nothing to do.`);
  process.exit(0);
}

const liveGameIds = nfl.filter((game) => game.state === 'in').map((game) => game.id);
console.log(`live watcher starting, ${liveGameIds.length} NFL games in progress`);

const week = await scoredWeek();
const supabase = writeClient()!;

/**
 * Ownership from the live rosters rather than the nightly starters.
 *
 * teams.json stores starters only, which is 126 players. Built from that, a
 * bench player's touchdown posts with no manager attached: on real Week 1 data
 * that was 18 of 30 attributed rather than 29. The live call carries full
 * rosters, and the nightly starters remain the fallback when it fails.
 */
async function buildLookup(): Promise<PlayerLookup> {
  const players = JSON.parse(fs.readFileSync('data/players.json', 'utf8')) as Record<
    string,
    { name?: string }
  >;

  const byName = new Map<string, string>();
  for (const [id, player] of Object.entries(players)) {
    if (player?.name) byName.set(normaliseName(player.name), id);
  }

  const ownerOf = new Map<string, number>();
  const managerOf = new Map<number, string>();
  // First names in the post copy: "TOUCHDOWN, Adam", not SexRobot69.
  for (const team of teams) managerOf.set(team.rosterId, firstNameOf(team.rosterId) ?? team.manager);

  try {
    const rosters = await getRosters();
    for (const roster of rosters) {
      for (const playerId of roster.players ?? []) ownerOf.set(playerId, roster.roster_id);
    }
    console.log(`  ownership from live rosters, ${ownerOf.size} players`);
  } catch {
    for (const team of teams) {
      for (const playerId of team.starters) ownerOf.set(playerId, team.rosterId);
    }
    console.warn(`  Sleeper rosters unavailable, using nightly starters, ${ownerOf.size} players`);
  }

  return { byName, ownerOf, managerOf };
}

/** Play ids already posted, so the same touchdown is never announced twice. */
async function postedPlayIds(): Promise<Set<string>> {
  const { data } = await supabase
    .from('feed_posts')
    .select('payload')
    .eq('week', week)
    .not('payload->>play_id', 'is', null)
    .limit(500);

  const out = new Set<string>();
  for (const row of data ?? []) {
    const id = (row as { payload?: { play_id?: string } }).payload?.play_id;
    if (id) out.add(String(id));
  }
  return out;
}

/** The last leader announced per matchup, so only a real change posts. */
async function announcedLeaders(): Promise<Map<number, number>> {
  const { data } = await supabase
    .from('feed_posts')
    .select('payload, created_at')
    .eq('week', week)
    .not('payload->>matchup_id', 'is', null)
    .order('created_at', { ascending: true })
    .limit(500);

  const out = new Map<number, number>();
  for (const row of data ?? []) {
    const payload = (row as { payload?: { matchup_id?: number; leader?: number } }).payload;
    if (payload?.matchup_id != null && payload.leader != null) {
      out.set(Number(payload.matchup_id), Number(payload.leader));
    }
  }
  return out;
}

/** The roster Shart Watch last named, so it does not repeat itself. */
async function lastShartRoster(): Promise<number | null> {
  const { data } = await supabase
    .from('feed_posts')
    .select('payload')
    .eq('week', week)
    .eq('kind', 'shart-watch')
    .order('created_at', { ascending: false })
    .limit(1);

  const payload = (data?.[0] as { payload?: { roster_id?: number } } | undefined)?.payload;
  return payload?.roster_id != null ? Number(payload.roster_id) : null;
}

async function postedInLastHour(): Promise<number> {
  const since = new Date(Date.now() - HOUR_MS).toISOString();
  const { count } = await supabase
    .from('feed_posts')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);
  return count ?? 0;
}

const [lookup, seen, leaders, lastShart, recent] = await Promise.all([
  buildLookup(),
  postedPlayIds(),
  announcedLeaders(),
  lastShartRoster(),
  postedInLastHour(),
]);

console.log(`  ${seen.size} plays already posted, ${recent} posts in the last hour`);

const [plays, games] = await Promise.all([getTouchdowns(liveGameIds), getWeekGames(week)]);

const candidates: NewPost[] = [
  ...touchdownPosts(plays, week, lookup, seen),
  ...leadChangePosts(games, week, leaders, lookup.managerOf),
];
const shart = shartWatchPost(games, week, lookup.managerOf, lastShart);
if (shart) candidates.push(shart);

console.log(`  ${candidates.length} candidate posts before the cap`);

const toWrite = applyCap(candidates, recent);
if (!toWrite.length) {
  console.log('nothing to write. Done.');
  process.exit(0);
}

const { error } = await supabase.from('feed_posts').insert(toWrite);
if (error) {
  console.error(`write failed: ${error.message}`);
  process.exit(1);
}

for (const post of toWrite) console.log(`  posted [${post.kind}] ${post.title}`);

/**
 * Push, after the write rather than before it, so an alert never points at a
 * post that failed to save. Only what cleared the hourly cap is announced: the
 * cap exists to stop the Feed flooding, and a phone buzzing for every candidate
 * that was trimmed would defeat it.
 */
if (pushConfigured()) {
  let delivered = 0;
  for (const post of toWrite) {
    const payload = post.payload ?? {};
    if (payload.play_id) {
      delivered += await sendAlert(
        { kind: 'touchdown' },
        { title: post.title, body: post.body ?? '', url: '/feed', tag: `td-${payload.play_id}` }
      );
    } else if (payload.matchup_id != null && post.team_ids?.length) {
      delivered += await sendAlert(
        { kind: 'lead_change', teamIds: post.team_ids.map(String) },
        { title: post.title, body: post.body ?? '', url: '/matchups', tag: `lead-${payload.matchup_id}` }
      );
    }
  }
  console.log(`  push alerts delivered to ${delivered} devices`);
}

console.log(`live watcher wrote ${toWrite.length} of ${candidates.length} candidates.`);
