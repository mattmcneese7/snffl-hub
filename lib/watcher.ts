// The live watcher, Brief Section 3, as a function both runners share.
//
// Two things call this: /api/watch, which Supabase's scheduler hits every
// minute (Checkpoint 12b), and scripts/live-watch.ts, the five minute GitHub
// Actions job that stays on as a backup. Running both means two runs can
// overlap, so every post carries a dedupe_key with a unique index behind it
// and the insert skips a key that already exists. Without that, two runs that
// both read the feed before either wrote would post the same touchdown twice.
//
// It keeps no state of its own. Dedupe reads what earlier runs wrote into
// feed_posts, and the hourly cap counts recent rows.

import { cmonDedupeKey, cmonManPosts } from './cmon-man.ts';
import { getNflGames } from './gameday.ts';
import { getTouchdowns } from './espn-plays.ts';
import { allPlayers, getWeekGames, league, scoredWeek, teams } from './league.ts';
import {
  applyCap,
  leadChangePosts,
  normaliseName,
  shartWatchPost,
  touchdownPosts,
  type NewPost,
  type PlayerLookup,
} from './live.ts';
import { pushConfigured, sendAlert } from './push.ts';
import { scoreAlerts } from './score-alerts.ts';
import { getRosters } from './sleeper.ts';
import { writeClient } from './supabase.ts';
import { firstNameOf } from '../config/managers.ts';

const HOUR_MS = 60 * 60 * 1000;

export type WatchResult = {
  live: boolean;
  candidates: number;
  written: string[];
  pushed: number;
  note: string;
};

type Log = (line: string) => void;

/**
 * Ownership from the live rosters rather than the nightly starters, so a bench
 * player's touchdown still names his manager. The nightly starters are the
 * fallback when Sleeper does not answer.
 */
async function buildLookup(log: Log): Promise<PlayerLookup> {
  const byName = new Map<string, string>();
  for (const player of allPlayers()) {
    if (player?.name) byName.set(normaliseName(player.name), player.id);
  }

  const ownerOf = new Map<string, number>();
  // First names in the post copy: "TOUCHDOWN, Adam", not SexRobot69.
  const managerOf = new Map<number, string>();
  for (const team of teams) managerOf.set(team.rosterId, firstNameOf(team.rosterId) ?? team.manager);

  try {
    const rosters = await getRosters();
    for (const roster of rosters) {
      for (const playerId of roster.players ?? []) ownerOf.set(playerId, roster.roster_id);
    }
    log(`  ownership from live rosters, ${ownerOf.size} players`);
  } catch {
    for (const team of teams) {
      for (const playerId of team.starters) ownerOf.set(playerId, team.rosterId);
    }
    log(`  Sleeper rosters unavailable, using nightly starters, ${ownerOf.size} players`);
  }

  return { byName, ownerOf, managerOf };
}

/** The key that makes a post unique, so an overlapping run cannot repeat it. */
function dedupeKey(post: NewPost, prior: { leads: Map<number, number>; sharts: number }): string | null {
  const payload = post.payload ?? {};
  if (post.kind === 'cmon-man') return cmonDedupeKey(post);
  if (payload.play_id) return `td:${payload.play_id}`;
  if (payload.matchup_id != null) {
    // The nth lead change in this matchup. Two runs racing on the same change
    // compute the same n; the next genuine change gets n + 1.
    const n = (prior.leads.get(Number(payload.matchup_id)) ?? 0) + 1;
    return `lead:${post.week}:${payload.matchup_id}:${n}`;
  }
  if (post.kind === 'shart-watch' && payload.roster_id != null) {
    return `shart:${post.week}:${payload.roster_id}:${prior.sharts + 1}`;
  }
  return null;
}

export async function runWatcher(log: Log = () => {}): Promise<WatchResult> {
  const supabase = writeClient();
  if (!supabase) {
    return { live: false, candidates: 0, written: [], pushed: 0, note: 'no Supabase service credentials' };
  }

  const week = await scoredWeek();
  const nfl = await getNflGames(week, league.season);
  const live = nfl.some((game) => game.state === 'in');
  // C'mon Man judges finished games, so the watcher keeps working after the
  // last whistle: a bench blunder is only a fact once the player can no
  // longer score. Nothing at all happened yet means nothing to do.
  const anyFinished = nfl.some((game) => game.state === 'post');
  if (!live && !anyFinished) {
    return { live: false, candidates: 0, written: [], pushed: 0, note: `nothing in progress or finished, ${nfl.length} on the slate` };
  }

  const liveGameIds = nfl.filter((game) => game.state === 'in').map((game) => game.id);
  log(`watcher: ${liveGameIds.length} games in progress, ${nfl.filter((g) => g.state === 'post').length} final`);

  const postedPlayIds = async () => {
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
  };

  /** Last leader announced per matchup, and how many changes each has had. */
  const announcedLeaders = async () => {
    const { data } = await supabase
      .from('feed_posts')
      .select('payload, created_at')
      .eq('week', week)
      .not('payload->>matchup_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(500);
    const leaders = new Map<number, number>();
    const counts = new Map<number, number>();
    for (const row of data ?? []) {
      const payload = (row as { payload?: { matchup_id?: number; leader?: number } }).payload;
      if (payload?.matchup_id != null && payload.leader != null) {
        const id = Number(payload.matchup_id);
        leaders.set(id, Number(payload.leader));
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return { leaders, counts };
  };

  const shartHistory = async () => {
    const { data } = await supabase
      .from('feed_posts')
      .select('payload')
      .eq('week', week)
      .eq('kind', 'shart-watch')
      .order('created_at', { ascending: false })
      .limit(50);
    const payload = (data?.[0] as { payload?: { roster_id?: number } } | undefined)?.payload;
    return {
      last: payload?.roster_id != null ? Number(payload.roster_id) : null,
      count: data?.length ?? 0,
    };
  };

  const postedInLastHour = async () => {
    const since = new Date(Date.now() - HOUR_MS).toISOString();
    const { count } = await supabase
      .from('feed_posts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since);
    return count ?? 0;
  };

  const [lookup, seen, announced, shart, recent] = await Promise.all([
    buildLookup(log),
    postedPlayIds(),
    announcedLeaders(),
    shartHistory(),
    postedInLastHour(),
  ]);
  log(`  ${seen.size} plays already posted, ${recent} posts in the last hour`);

  const [plays, games] = await Promise.all([
    liveGameIds.length ? getTouchdowns(liveGameIds) : Promise.resolve([]),
    getWeekGames(week),
  ]);
  const candidates: NewPost[] = [
    ...touchdownPosts(plays, week, lookup, seen),
    ...leadChangePosts(games, week, announced.leaders, lookup.managerOf),
    ...cmonManPosts(games, { nfl, week, managerOf: lookup.managerOf }),
  ];
  const shartPost = shartWatchPost(games, week, lookup.managerOf, shart.last);
  if (shartPost) candidates.push(shartPost);

  // Close finishes and final scores are not feed posts, so they send whether or
  // not anything new was written, and they are claimed in their own table.
  const scores = pushConfigured()
    ? await scoreAlerts({ client: supabase, games, nfl, week, managerOf: lookup.managerOf, log })
    : { sent: 0, note: 'push not configured' };

  const toWrite = applyCap(candidates, recent);
  if (!toWrite.length) {
    return {
      live,
      candidates: candidates.length,
      written: [],
      pushed: scores.sent,
      note: `nothing new, score alerts: ${scores.note}`,
    };
  }

  const rows = toWrite.map((post) => ({
    ...post,
    dedupe_key: dedupeKey(post, { leads: announced.counts, sharts: shart.count }),
  }));

  // ignoreDuplicates turns the insert into ON CONFLICT DO NOTHING, and select
  // returns only the rows that actually went in, which is exactly what should
  // be announced. A database without the dedupe_key column yet (the one time
  // SQL not run) falls back to a plain insert so posts still land.
  let inserted: NewPost[] = [];
  const upsert = await supabase
    .from('feed_posts')
    .upsert(rows, { onConflict: 'dedupe_key', ignoreDuplicates: true })
    .select('week, kind, title, body, team_ids, player_ids, payload');
  if (upsert.error) {
    if (!/dedupe_key/.test(upsert.error.message)) {
      return { live: true, candidates: candidates.length, written: [], pushed: 0, note: `write failed: ${upsert.error.message}` };
    }
    log('  dedupe_key column missing, inserting without it');
    const plain = await supabase.from('feed_posts').insert(toWrite).select('week, kind, title, body, team_ids, player_ids, payload');
    if (plain.error) {
      return { live: true, candidates: candidates.length, written: [], pushed: 0, note: `write failed: ${plain.error.message}` };
    }
    inserted = (plain.data ?? []) as NewPost[];
  } else {
    inserted = (upsert.data ?? []) as NewPost[];
  }

  // Push after the write, and only for what was actually written: an alert
  // never points at a post that failed to save or that another run already
  // announced.
  //
  // Every alert is addressed. A touchdown reaches the manager who owns the
  // scorer as his guy, the manager across from him as one against him, and
  // anybody else only if they asked for the whole league. Nobody hears the
  // same touchdown twice, because the two named managers are excluded from
  // the league wide send.
  const opponentOf = new Map<number, number>();
  for (const game of games) {
    opponentOf.set(game.home.rosterId, game.away.rosterId);
    opponentOf.set(game.away.rosterId, game.home.rosterId);
  }
  const nameOf = (rosterId: number) => lookup.managerOf.get(rosterId) ?? 'Somebody';

  let pushed = scores.sent;
  if (pushConfigured()) {
    for (const post of inserted) {
      const payload = post.payload ?? {};

      if (payload.play_id) {
        const tag = `td-${payload.play_id}`;
        const owner = post.team_ids?.[0] ?? null;
        const opponent = owner != null ? opponentOf.get(owner) ?? null : null;
        const play = post.body ?? post.title;
        if (owner != null) {
          pushed += await sendAlert(
            { alert: 'my_td', teamIds: [String(owner)] },
            { title: 'Your guy just scored', body: play, url: '/feed', tag }
          );
        }
        if (opponent != null) {
          pushed += await sendAlert(
            { alert: 'opponent_td', teamIds: [String(opponent)] },
            { title: `Bad news, that one is on ${nameOf(owner as number)}`, body: play, url: '/feed', tag }
          );
        }
        const named = [owner, opponent].filter((id): id is number => id != null).map(String);
        pushed += await sendAlert(
          { alert: 'league_td', except: named },
          { title: post.title, body: play, url: '/feed', tag }
        );
        continue;
      }

      if (post.kind === 'cmon-man' && post.team_ids?.length) {
        pushed += await sendAlert(
          { alert: 'cmon', teamIds: post.team_ids.map(String) },
          { title: post.title, body: post.body ?? '', url: '/feed', tag: `cmon-${payload.roster_id}-${payload.call}` }
        );
        continue;
      }

      if (payload.matchup_id != null && post.team_ids?.length) {
        pushed += await sendAlert(
          { alert: 'lead_change', teamIds: post.team_ids.map(String) },
          {
            title: post.title,
            body: post.body ?? '',
            url: `/matchups/${week}/${payload.matchup_id}`,
            tag: `lead-${payload.matchup_id}`,
          }
        );
      }
    }
  }

  return {
    live,
    candidates: candidates.length,
    written: inserted.map((post) => `[${post.kind}] ${post.title}`),
    pushed,
    note: `wrote ${inserted.length} of ${candidates.length} candidates, score alerts: ${scores.note}`,
  };
}
