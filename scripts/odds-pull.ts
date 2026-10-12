// Sportsbook lines. Spread, total and moneyline for every NFL game from every
// US book The Odds API carries, kept as one JSON snapshot in Supabase Storage
// (public-read bucket "odds", object "nfl.json") so Splash can show each manager
// the book he picked and shop lines on the game page.
//
// Not in the repo on purpose: this runs every 20 minutes while games are on,
// and a commit that often would redeploy the live site each time.
//
// The workflow fires every 20 minutes; this script decides what is due:
//
//   full      h2h, spreads, totals (3 credits). Twice a day at 14:00 and
//             23:00 UTC, and once about an hour before each kickoff window.
//   live      h2h only (1 credit), every 20 minutes while ESPN shows a game
//             in progress. New moneylines are merged in; spreads and totals
//             stay as the last full pull left them.
//   nothing   most runs. Exits 0 after one free ESPN call.
//
// Spreads and totals on a game that has kicked off are never overwritten: the
// line people see for a live or finished game is the last one before kickoff.
//
// Budget: every response's x-requests-remaining is stored. Under 40 left, no
// live pulls; under 10, nothing until the month resets. Below 40 the stored
// count is refreshed first from The Odds API's /sports endpoint, which costs
// nothing, so a reset is noticed on the next run.
//
// Keys are read from the environment only and never printed: ODDS_API_KEY,
// SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY.
// Locally: node --env-file=.env.local scripts/odds-pull.ts [--full]
//
// Run with Node 24, which strips TypeScript types natively.

const ODDS_BASE = 'https://api.the-odds-api.com/v4';
const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
const BUCKET = 'odds';
const OBJECT = 'nfl.json';
const USER_AGENT = 'SquirtniteFFL/1.0 (+https://www.squirtnite.live; league hub)';

/** Full pulls at these UTC hours, every day. */
const SLOTS_UTC = [14, 23];
/** A kickoff this far ahead (minutes) gets its pre-kickoff full pull. */
const PRE_MIN = 50;
const PRE_MAX = 80;
/** One pre-kickoff pull covers every kickoff up to this far ahead (minutes). */
const PRE_COVER = 120;
/** A scheduled full pull is skipped when a full pull ran this recently (hours). */
const RECENT_FULL_H = 4;
/** ...or when a pre-kickoff pull is due within this long (hours). */
const SOON_KICK_H = 5;
/** Live pulls no closer together than this (minutes); cron drift tolerance. */
const LIVE_GAP_MIN = 15;
const LIVE_FLOOR = 40;
const HARD_FLOOR = 10;
/** Started games older than this drop out of the snapshot. */
const KEEP_DAYS = 5;

type Outcome = { name: string; price: number; point?: number };
type Market = { key: string; outcomes: Outcome[] };
type Bookmaker = { key: string; title: string; last_update: string; markets: Market[] };
type ApiEvent = { id: string; commence_time: string; home_team: string; away_team: string; bookmakers: Bookmaker[] };

type OddsBook = {
  title: string;
  spread: { home: number; away: number; homePrice: number | null; awayPrice: number | null } | null;
  total: { points: number; overPrice: number | null; underPrice: number | null } | null;
  moneyline: { home: number; away: number } | null;
  updated: string;
};
type OddsGame = { id: string; commence: string; home: string; away: string; books: Record<string, OddsBook> };
type Meta = {
  /** Last full pull, ISO. */
  fullAt: string | null;
  /** Last live (h2h) pull, ISO. */
  liveAt: string | null;
  /** Scheduled slots already handled, "2026-10-11T14". */
  slots: string[];
  /** Kickoff times already given their pre-kickoff pull, ISO. */
  kicks: string[];
  remainingAt: string | null;
};
type Snapshot = { pulledAt: string; remaining: number | null; games: OddsGame[]; meta: Meta };

// ---------- Environment ----------

const ODDS_KEY = process.env.ODDS_API_KEY || '';
// || rather than ??: Actions sets a missing secret to "", see lib/supabase.ts.
const SB_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const FORCE_FULL = process.argv.includes('--full');

if (!ODDS_KEY || !SB_URL || !SB_KEY) {
  const missing = [!ODDS_KEY && 'ODDS_API_KEY', !SB_URL && 'SUPABASE_URL', !SB_KEY && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean);
  console.log(`${missing.join(', ')} not set, nothing pulled`);
  process.exit(0);
}

/** Anything printed goes through this, so no key can reach a log. */
const scrub = (text: string) => [ODDS_KEY, SB_KEY].reduce((t, k) => t.split(k).join('[key]'), text);
const fail = (message: string): never => {
  console.error(scrub(message));
  process.exit(1);
};

// ---------- Supabase Storage ----------

const sbHeaders = { authorization: `Bearer ${SB_KEY}`, apikey: SB_KEY };

async function readSnapshot(): Promise<Snapshot | null> {
  const res = await fetch(`${SB_URL}/storage/v1/object/authenticated/${BUCKET}/${OBJECT}`, { headers: sbHeaders });
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) fail(`Supabase read failed: HTTP ${res.status}`);
  try {
    const snap = (await res.json()) as Snapshot;
    return Array.isArray(snap?.games) ? snap : null;
  } catch {
    return null;
  }
}

async function ensureBucket() {
  const res = await fetch(`${SB_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...sbHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  if (res.ok) {
    console.log(`created public-read bucket "${BUCKET}"`);
    return;
  }
  const body = await res.text();
  if (/already exists|Duplicate/i.test(body) || res.status === 409) return;
  fail(`Supabase bucket create failed: HTTP ${res.status} ${body.slice(0, 200)}`);
}

async function writeSnapshot(snap: Snapshot) {
  const put = () =>
    fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${OBJECT}`, {
      method: 'POST',
      headers: { ...sbHeaders, 'content-type': 'application/json', 'x-upsert': 'true', 'cache-control': 'max-age=60' },
      body: JSON.stringify(snap),
    });
  let res = await put();
  if (!res.ok) {
    // First run: no bucket yet.
    await ensureBucket();
    res = await put();
  }
  if (!res.ok) fail(`Supabase write failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  console.log(`wrote ${BUCKET}/${OBJECT}`);
}

// ---------- ESPN: what is on ----------

type Kick = { at: number; state: 'pre' | 'in' | 'post' };

async function espnSlate(): Promise<Kick[]> {
  try {
    const res = await fetch(ESPN_SCOREBOARD, { headers: { 'user-agent': USER_AGENT } });
    if (!res.ok) return [];
    const json = (await res.json()) as { events?: { date?: string; competitions?: { status?: { type?: { state?: string } } }[] }[] };
    return (json.events ?? []).flatMap((e) => {
      const at = Date.parse(e.date ?? '');
      const state = e.competitions?.[0]?.status?.type?.state;
      return Number.isFinite(at) && (state === 'pre' || state === 'in' || state === 'post') ? [{ at, state }] : [];
    });
  } catch {
    return [];
  }
}

// ---------- The Odds API ----------

const remainingOf = (res: Response) => {
  const left = res.headers.get('x-requests-remaining');
  return left != null && left !== '' && Number.isFinite(Number(left)) ? Number(left) : null;
};

/** Free: /sports does not count against the quota, and carries the usage headers. */
async function probeRemaining(): Promise<number | null> {
  try {
    const res = await fetch(`${ODDS_BASE}/sports?${new URLSearchParams({ apiKey: ODDS_KEY })}`, { headers: { 'user-agent': USER_AGENT } });
    return res.ok ? remainingOf(res) : null;
  } catch {
    return null;
  }
}

async function pullOdds(markets: string): Promise<{ events: ApiEvent[]; remaining: number | null }> {
  const query = new URLSearchParams({ apiKey: ODDS_KEY, regions: 'us', markets, oddsFormat: 'american' });
  let res: Response;
  try {
    res = await fetch(`${ODDS_BASE}/sports/americanfootball_nfl/odds?${query}`, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' } });
  } catch (error) {
    return fail(`The Odds API request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const remaining = remainingOf(res);
  console.log(
    `The Odds API (${markets}): HTTP ${res.status}, this call ${res.headers.get('x-requests-last') ?? '?'} credits, used ${res.headers.get('x-requests-used') ?? '?'}, remaining ${remaining ?? '?'}`
  );
  if (!res.ok) fail(`pull failed, snapshot left as it is. ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as unknown;
  if (!Array.isArray(json)) fail('unexpected response shape, snapshot left as it is');
  return { events: json as ApiEvent[], remaining };
}

// ---------- Normalize and merge ----------

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function bookOf(event: ApiEvent, bm: Bookmaker): OddsBook {
  const market = (k: string) => bm.markets?.find((m) => m.key === k);
  const side = (m: Market | undefined, name: string) => m?.outcomes?.find((o) => o.name === name);

  const sp = market('spreads');
  const spHome = side(sp, event.home_team);
  const spAway = side(sp, event.away_team);
  const spread =
    num(spHome?.point) != null && num(spAway?.point) != null
      ? { home: spHome!.point!, away: spAway!.point!, homePrice: num(spHome?.price), awayPrice: num(spAway?.price) }
      : null;

  const tot = market('totals');
  const over = side(tot, 'Over');
  const under = side(tot, 'Under');
  const total = num(over?.point) != null ? { points: over!.point!, overPrice: num(over?.price), underPrice: num(under?.price) } : null;

  const h2h = market('h2h');
  const mlHome = num(side(h2h, event.home_team)?.price);
  const mlAway = num(side(h2h, event.away_team)?.price);
  const moneyline = mlHome != null && mlAway != null ? { home: mlHome, away: mlAway } : null;

  return { title: bm.title, spread, total, moneyline, updated: bm.last_update };
}

const hasAny = (b: OddsBook) => !!(b.spread || b.total || b.moneyline);

/**
 * Fold a pull into the stored games. A game not yet started takes a full
 * pull whole. Anything else (a live pull, or any pull once a game has kicked
 * off) only moves moneylines; spreads and totals stay as they were.
 */
function merge(stored: OddsGame[], events: ApiEvent[], full: boolean, now: number): OddsGame[] {
  const byId = new Map(stored.map((g) => [g.id, g]));
  const seen = new Set<string>();
  for (const event of events) {
    if (!event?.id || !event.home_team || !event.away_team) continue;
    seen.add(event.id);
    const started = Date.parse(event.commence_time) <= now;
    const old = byId.get(event.id);
    const fresh: Record<string, OddsBook> = {};
    for (const bm of event.bookmakers ?? []) {
      const book = bookOf(event, bm);
      if (hasAny(book)) fresh[bm.key] = book;
    }

    if (full && !started) {
      if (Object.keys(fresh).length) byId.set(event.id, { id: event.id, commence: event.commence_time, home: event.home_team, away: event.away_team, books: fresh });
      continue;
    }

    const books: Record<string, OddsBook> = { ...(old?.books ?? {}) };
    for (const [key, book] of Object.entries(fresh)) {
      if (!book.moneyline) continue;
      const before = books[key];
      books[key] = {
        title: book.title,
        spread: before?.spread ?? (started ? null : book.spread),
        total: before?.total ?? (started ? null : book.total),
        moneyline: book.moneyline,
        updated: book.updated,
      };
    }
    if (Object.keys(books).length) {
      byId.set(event.id, { id: event.id, commence: old?.commence ?? event.commence_time, home: event.home_team, away: event.away_team, books });
    }
  }

  return [...byId.values()]
    .filter((g) => {
      const kick = Date.parse(g.commence);
      // A full pull lists every game still on the board, so an upcoming game
      // missing from it is off the board (moved or pulled).
      if (full && kick > now && !seen.has(g.id)) return false;
      return kick > now || now - kick < KEEP_DAYS * 86_400_000;
    })
    .sort((a, b) => a.commence.localeCompare(b.commence) || a.id.localeCompare(b.id));
}

// ---------- Decide ----------

const now = Date.now();
const snap = await readSnapshot();
const meta: Meta = { fullAt: null, liveAt: null, slots: [], kicks: [], remainingAt: null, ...(snap?.meta ?? {}) };
let remaining = snap?.remaining ?? null;

const slate = await espnSlate();
const live = slate.some((k) => k.state === 'in');

// The latest scheduled slot at or before now, today or yesterday.
const day = new Date(now);
day.setUTCMinutes(0, 0, 0);
const slotTimes = [-1, 0].flatMap((d) =>
  SLOTS_UTC.map((h) => Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + d, h))
);
const slotAt = Math.max(...slotTimes.filter((t) => t <= now));
const slotKey = new Date(slotAt).toISOString().slice(0, 13);
const lastFull = meta.fullAt ? Date.parse(meta.fullAt) : 0;
const kickSoon = slate.some((k) => k.state === 'pre' && k.at > now && k.at - now < SOON_KICK_H * 3_600_000);
const slotDue = !meta.slots.includes(slotKey) && now - lastFull > RECENT_FULL_H * 3_600_000 && !kickSoon;

const preKicks = slate.filter((k) => k.state === 'pre' && k.at - now >= PRE_MIN * 60_000 && k.at - now <= PRE_MAX * 60_000);
const preDue = preKicks.some((k) => !meta.kicks.includes(new Date(k.at).toISOString()));

const liveDue = live && (!meta.liveAt || now - Date.parse(meta.liveAt) >= LIVE_GAP_MIN * 60_000);

const wantFull = FORCE_FULL || !snap || preDue || slotDue;
if (!wantFull && !liveDue) {
  if (snap && !meta.slots.includes(slotKey)) {
    // Covered by a recent or upcoming full pull. Marked handled so it is not
    // picked up hours late; a metadata write, no credits.
    meta.slots.push(slotKey);
    await writeSnapshot({ ...snap, meta });
    console.log(`nothing due, slot ${slotKey} covered by a recent or upcoming full pull`);
  } else {
    console.log(`nothing due: ${live ? 'live, last live pull too recent' : 'no game in progress'}, no kickoff in ${PRE_MIN} to ${PRE_MAX} minutes, slot ${slotKey} handled`);
  }
  process.exit(0);
}

// Budget guard, refreshed for free once it is getting low.
if (remaining != null && remaining < LIVE_FLOOR) {
  const fresh = await probeRemaining();
  if (fresh != null) remaining = fresh;
  console.log(`credits remaining ${remaining ?? 'unknown'} (checked for free)`);
}
if (remaining != null && remaining < HARD_FLOOR) {
  console.log(`under ${HARD_FLOOR} credits left, nothing pulled until the month resets`);
  process.exit(0);
}
const doFull = wantFull;
if (!doFull && remaining != null && remaining < LIVE_FLOOR) {
  console.log(`under ${LIVE_FLOOR} credits left, live pulls paused`);
  process.exit(0);
}

const reason = FORCE_FULL ? 'forced' : !snap ? 'first snapshot' : preDue ? 'pre-kickoff' : slotDue ? `slot ${slotKey}` : 'live';
console.log(`pulling: ${doFull ? 'full' : 'live moneylines'} (${reason})`);

const pulled = await pullOdds(doFull ? 'h2h,spreads,totals' : 'h2h');
remaining = pulled.remaining ?? remaining;
const games = merge(snap?.games ?? [], pulled.events, doFull, now);

const stamp = new Date(now).toISOString();
if (doFull) {
  meta.fullAt = stamp;
  meta.slots.push(slotKey);
  // One pull covers every kickoff in the next two hours: 4:05 and 4:25 are one window.
  for (const k of slate) if (k.state === 'pre' && k.at > now && k.at - now <= PRE_COVER * 60_000) meta.kicks.push(new Date(k.at).toISOString());
}
if (!doFull || live) meta.liveAt = stamp;
meta.remainingAt = stamp;
// Keep the bookkeeping short: a few days of slots and kickoffs is plenty.
const cutoff = now - 3 * 86_400_000;
meta.slots = [...new Set(meta.slots)].filter((s) => Date.parse(`${s}:00:00Z`) > cutoff).sort();
meta.kicks = [...new Set(meta.kicks)].filter((k) => Date.parse(k) > cutoff).sort();

const books = new Set(games.flatMap((g) => Object.keys(g.books))).size;
console.log(`${pulled.events.length} events, ${games.length} games stored, ${books} books`);
await writeSnapshot({ pulledAt: stamp, remaining, games, meta });

export {};
