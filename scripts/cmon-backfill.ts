// One off: writes C'mon Man calls for weeks already played, so the tab is not
// empty for a season the watcher spent silent. Posts are dated to the end of
// their own week rather than now, so the Feed's order stays honest, and no
// push alerts go out for a decision somebody made a fortnight ago.
//
// node scripts/cmon-backfill.ts --weeks=1,2

import { cmonDedupeKey, cmonManPosts } from '../lib/cmon-man.ts';
import { getNflGames } from '../lib/gameday.ts';
import { getWeekGames, league, teams } from '../lib/league.ts';
import { firstNameOf } from '../config/managers.ts';
import { writeClient } from '../lib/supabase.ts';

const weeks = (process.argv.find((a) => a.startsWith('--weeks='))?.split('=')[1] ?? '')
  .split(',')
  .map(Number)
  .filter(Boolean);
if (!weeks.length) {
  console.error('usage: node scripts/cmon-backfill.ts --weeks=1,2');
  process.exit(1);
}

const supabase = writeClient();
if (!supabase) {
  console.error('no Supabase service credentials');
  process.exit(1);
}

const managerOf = new Map(teams.map((t) => [t.rosterId, firstNameOf(t.rosterId) ?? t.manager]));

for (const week of weeks) {
  const [games, nfl] = await Promise.all([getWeekGames(week), getNflGames(week, league.season)]);
  const posts = cmonManPosts(games, { nfl, week, managerOf });
  if (!posts.length) {
    console.log(`week ${week}: nothing to call out`);
    continue;
  }

  // The last kickoff of the week plus four hours: after the games, before the
  // next week's posts.
  const last = nfl.map((g) => Date.parse(g.kickoff)).sort((a, b) => b - a)[0] ?? Date.now();
  const createdAt = new Date(last + 4 * 3600 * 1000).toISOString();

  const rows = posts.map((post, i) => ({
    ...post,
    dedupe_key: cmonDedupeKey(post),
    created_at: new Date(Date.parse(createdAt) + i * 1000).toISOString(),
  }));

  const { data, error } = await supabase
    .from('feed_posts')
    .upsert(rows, { onConflict: 'dedupe_key', ignoreDuplicates: true })
    .select('title');
  if (error) {
    console.error(`week ${week}: ${error.message}`);
    continue;
  }
  console.log(`week ${week}: wrote ${data?.length ?? 0} of ${rows.length} calls`);
}
