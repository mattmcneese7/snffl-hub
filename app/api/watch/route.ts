// The live watcher and lineup alerts, triggered every minute by Supabase's
// scheduler (pg_cron and pg_net, set up once from docs/sql/12b-watcher.sql).
//
// Guarded by a shared secret in the Authorization header, WATCH_SECRET, so
// nobody else can make the site hammer ESPN or send pushes by hitting the URL.
// Most calls return in one cached ESPN request because nothing is live.

import { runLineupAlerts } from '@/lib/lineup-alerts';
import { runWatcher } from '@/lib/watcher';

export const dynamic = 'force-dynamic';
// A busy Sunday minute reads a dozen ESPN play feeds and sends pushes.
export const maxDuration = 30;

function authorised(request: Request): boolean {
  const secret = process.env.WATCH_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

async function handle(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: 'not authorised' }, { status: 401 });
  }

  const started = Date.now();
  const lines: string[] = [];
  const log = (line: string) => lines.push(line);

  const [watch, lineup] = await Promise.all([
    runWatcher(log).catch((error: Error) => ({ note: `watcher failed: ${error.message}` })),
    runLineupAlerts(log).catch((error: Error) => ({ note: `lineup alerts failed: ${error.message}` })),
  ]);

  return Response.json({
    ms: Date.now() - started,
    watch,
    lineup,
    log: lines,
  });
}

export const GET = handle;
export const POST = handle;
