// Live watcher, backup runner. Brief Section 3.
//
// Supabase's scheduler calls /api/watch every minute (Checkpoint 12b); this
// GitHub Actions job keeps firing every five as a backup in case that path is
// down. Both run lib/watcher.ts, and the dedupe key on each post means the two
// never announce the same thing twice.
//
// Run with Node 24, which strips TypeScript types natively.

import { runLineupAlerts } from '../lib/lineup-alerts.ts';
import { runWatcher } from '../lib/watcher.ts';

const log = (line: string) => console.log(line);

const result = await runWatcher(log);
console.log(`watcher: ${result.note}`);
for (const line of result.written) console.log(`  posted ${line}`);
if (result.pushed) console.log(`  push alerts delivered to ${result.pushed} devices`);

const lineup = await runLineupAlerts(log);
console.log(`lineup alerts: ${lineup.note}`);

if (/write failed/.test(result.note)) process.exit(1);
