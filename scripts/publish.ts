// Publish, Brief Section 3.
//
// Runs hourly on Tuesday morning and publishes once Central time reaches
// 9:00 AM. GitHub scheduled jobs start late, which is why the gate lives in
// the job rather than in the cron expression.
//
// Collects the batch, validates every number against the fact packet, retries
// a failed article once, then falls back to a template.

import fs from 'node:fs';
import path from 'node:path';
import { ARTICLE_ORDER, ARTICLE_SPECS, BYLINE, type ArticleId } from '../config/style-guide.ts';
import { collectBatch, recordSpend, spendSummary } from '../lib/claude.ts';
import { allowedNumbers, buildWeekFacts, handlesOf, properNouns, type WeekFacts } from '../lib/fact-packets.ts';
import { countsFrom } from '../lib/validate.ts';
import {
  readTimeOf,
  signOffFrom,
  slugFor,
  snapshotFrom,
  writeIssue,
  type Article,
  type Issue,
} from '../lib/rag.ts';
import { templateFor } from '../lib/templates.ts';
import { retryArticle } from '../lib/rag-writer.ts';
import { validateArticle, type Candidate, type Violation } from '../lib/validate.ts';
import { claimAlerts } from '../lib/alert-claims.ts';
import { pushConfigured, sendAlert } from '../lib/push.ts';
import { awardsForWeek, TROPHY_NAMES } from '../lib/trophies.ts';
import { firstNameOf } from '../config/managers.ts';

const PENDING = path.join('data', 'rag', 'pending.json');
const FORCE = process.argv.includes('--force');

/** 9:00 AM Central, expressed in UTC. Central is UTC-5 until 1 November 2026. */
function centralHour(now = new Date()): number {
  const offset = now < new Date('2026-11-01T07:00:00Z') ? 5 : 6;
  return (now.getUTCHours() - offset + 24) % 24;
}

const hour = centralHour();
if (!FORCE && hour < 9) {
  console.log(`it is ${hour}:00 Central, publishing waits for 9:00. Nothing to do.`);
  process.exit(0);
}

/** Republish a week from its saved output: node scripts/publish.ts --week=1 */
const WEEK_ARG = Number(
  process.argv.find((arg) => /^--week=\d+$/.test(arg))?.split('=')[1] ?? 0
);

let pending: { week: number; batchId: string | null; allowed?: string[] };
try {
  pending = JSON.parse(fs.readFileSync(PENDING, 'utf8'));
} catch {
  // Publish deletes pending.json once it succeeds, which used to make the saved
  // batch output unreachable by the only script that reads it: the raw store
  // kept the writing safe while the re-run path exited before ever looking at
  // it. A week given on the command line republishes from disk, at no cost.
  const savedWeek = WEEK_ARG;
  const savedPath = path.join('data', 'rag', 'raw', `week-${savedWeek}.json`);
  if (savedWeek && fs.existsSync(savedPath)) {
    pending = { week: savedWeek, batchId: null };
    console.log(`no pending issue, republishing week ${savedWeek} from ${savedPath}`);
  } else {
    console.log('no pending issue. Nothing to publish.');
    if (!savedWeek) console.log('  pass --week=N to republish that week from its saved output.');
    process.exit(0);
  }
}

const { week, batchId } = pending;
console.log(`publishing week ${week}`);
console.log(`  spend: ${spendSummary()}`);

// Sleeper sometimes answers a runner with nothing. An issue built on no games
// would be wrong from the headline down (and the templates have nothing to
// fill), so try again, then stop cleanly: the next hourly run picks it up.
let facts = await buildWeekFacts(week);
for (let attempt = 1; !facts.games.length && attempt <= 3; attempt++) {
  console.warn(`  Sleeper returned no games for week ${week}, retrying (${attempt} of 3)`);
  await new Promise((r) => setTimeout(r, 15_000));
  facts = await buildWeekFacts(week);
}
if (!facts.games.length) {
  console.error(`  still no games for week ${week}; not publishing. The next run tries again.`);
  process.exit(1);
}
const allowed = new Set(pending.allowed ?? [...allowedNumbers(facts)]);
// Team and manager names are redacted before numbers are read out of prose.
const names = properNouns(facts);
// Counts get their own small set. The general pool holds every seed and every
// power ranking position, which for 14 rosters is every integer from 0 to 14,
// so a claim like "twelve more weeks" could never be rejected against it.
const counts = countsFrom(facts);

let written: Record<string, { ok: true; data: unknown } | { ok: false; error: string }> = {};

// Raw model output is kept, not just the published issue.
//
// Batch results expire, and publish deletes pending.json once it succeeds, so
// for a while the only durable copy of the writing was whatever survived
// validation. Every fix to the validator then meant paying to generate the same
// articles again. The raw file is written before validation and read first, so
// a re-publish costs nothing.
const RAW_DIR = path.join('data', 'rag', 'raw');
const RAW = path.join(RAW_DIR, `week-${week}.json`);

if (fs.existsSync(RAW)) {
  written = JSON.parse(fs.readFileSync(RAW, 'utf8'));
  console.log(`  using saved batch output from ${RAW}, nothing to collect`);
} else if (batchId) {
  const outcome = await collectBatch(batchId);
  if (!outcome.ready) {
    console.log(`  batch ${batchId} is ${outcome.status}, trying again on the next run.`);
    process.exit(0);
  }
  written = outcome.results;
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.writeFileSync(RAW, JSON.stringify(written, null, 1));
  console.log(`  batch collected and saved to ${RAW}`);
  if (outcome.usd > 0) recordSpend(`rag week ${week}`, 'claude-sonnet-5', outcome.usd);
  console.log(`  batch collected, $${outcome.usd.toFixed(4)} spent`);
} else {
  console.log('  no batch was submitted, every article uses a template.');
}

/**
 * The draft with every sentence that carries a rejected claim removed: an
 * unsourced number, a raw field name or a wrong count. Null when the headline
 * or deck itself is at fault, since those cannot lose a sentence.
 */
function salvage(draft: Candidate, violations: Violation[]): Candidate | null {
  const bad = violations.map((v) => v.detail.match(/^(\d+(?:\.\d+)?) is not in the fact packet/)?.[1] ?? v.detail.match(/raw field name "([^"]+)"/)?.[1] ?? v.detail.match(/^"([^"]+)" is a count/)?.[1]).filter(Boolean) as string[];
  if (bad.length !== violations.length) return null;
  // A count ("4 team") matches its plural too, so no trailing boundary for it.
  const hit = (s: string) => bad.some((b) => new RegExp(`(?<![\\w.])${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${/ /.test(b) ? '' : '(?![\\w])'}`, 'i').test(s.replace(/,/g, '')));
  if (hit(draft.headline) || hit(draft.deck)) return null;
  const body = draft.body.map((p) => (p.match(/[^.!?]+[.!?]+["\u201d]?\s*|[^.!?]+$/g) ?? [p]).filter((s) => !hit(s)).join('').trim()).filter(Boolean);
  return body.length ? { ...draft, body } : null;
}

const articles: Article[] = [];
let signOff: string | undefined;

for (const id of ARTICLE_ORDER) {
  const spec = ARTICLE_SPECS[id];
  const result = written[`week-${week}-${id}`];

  let candidate: Candidate | null = null;
  let fromTemplate = false;

  if (result?.ok) {
    const data = result.data as Candidate;
    const check = validateArticle(data, allowed, names, counts, handlesOf(facts));
    if (check.ok) {
      candidate = data;
    } else {
      console.warn(
        `  ${id} failed validation: ${check.violations.map((v) => v.detail).join('; ')}`
      );
    }
  } else if (result) {
    console.warn(`  ${id} did not come back: ${result.error}`);
  }

  // One revision, then salvage, then the template.
  //
  // The retry used to start over blind, fail for a brand new reason and send
  // the lead story to a three line template (weeks 3 to 6). Now it gets its
  // own draft back with exactly what the fact check rejected, and fixes that.
  if (!candidate && result?.ok) {
    const first = result.data as Candidate;
    const firstCheck = validateArticle(first, allowed, names, counts, handlesOf(facts));
    const retry = await retryArticle(id, facts, first, firstCheck.violations);
    let last: { draft: Candidate; violations: Violation[] } = { draft: first, violations: firstCheck.violations };
    if (retry) {
      const check = validateArticle(retry, allowed, names, counts, handlesOf(facts));
      if (check.ok) {
        candidate = retry;
        console.log(`  ${id} passed on revision`);
      } else {
        console.warn(`  ${id} failed again: ${check.violations.map((v) => v.detail).join('; ')}`);
        last = { draft: retry, violations: check.violations };
      }
    }
    // Salvage: drop only the sentences that carry an unsourced claim. Kept
    // when the headline is clean and most of the article survives, because a
    // full article minus one bad sentence beats a stub every time.
    if (!candidate) {
      const saved = salvage(last.draft, last.violations);
      const words = saved ? saved.body.join(' ').split(/\s+/).length : 0;
      if (saved && words >= spec.words[0] * 0.6 && validateArticle(saved, allowed, names, counts, handlesOf(facts)).ok) {
        candidate = saved;
        console.log(`  ${id} salvaged: kept ${words} words, dropped the unsourced sentences`);
      }
    }
  }

  // A draft that never came back (cut off at the token cap, or errored) gets
  // one fresh single attempt with more room before anything falls back.
  if (!candidate && result && !result.ok && id !== 'corrections') {
    let fresh = await retryArticle(id, facts);
    let check = fresh ? validateArticle(fresh, allowed, names, counts, handlesOf(facts)) : null;
    // A fresh draft with a few unsourced claims gets the same revision as any other.
    if (fresh && check && !check.ok) {
      console.warn(`  ${id} fresh draft failed: ${check.violations.map((v) => v.detail).join('; ')}`);
      const revised = await retryArticle(id, facts, fresh, check.violations);
      const again = revised ? validateArticle(revised, allowed, names, counts, handlesOf(facts)) : null;
      if (revised && again?.ok) [fresh, check] = [revised, again];
      else if (revised && again) {
        const saved = salvage(revised, again.violations);
        const words = saved ? saved.body.join(' ').split(/\s+/).length : 0;
        if (saved && words >= spec.words[0] * 0.6 && validateArticle(saved, allowed, names, counts, handlesOf(facts)).ok) [fresh, check] = [saved, { ok: true, violations: [] }];
      }
    }
    if (fresh && check?.ok) {
      candidate = fresh;
      console.log(`  ${id} written fresh after the batch draft failed`);
    } else if (!fresh) console.warn(`  ${id} fresh attempt came back empty`);
  }

  // The last resort, built from the facts. It must never take the issue down.
  if (!candidate) {
    candidate = templateFor(id, facts);
    fromTemplate = true;
  }

  // Not candidate.signOff directly: a writer can close the body with a real
  // escalation and still return the bare seed in the field.
  if (id === 'shart') signOff = signOffFrom(candidate) ?? signOff;

  articles.push({
    id,
    slug: slugFor(candidate.headline),
    category: spec.title,
    headline: candidate.headline,
    deck: candidate.deck,
    body: candidate.body,
    readTime: readTimeOf(candidate.body),
    fromTemplate: fromTemplate || undefined,
  });
}

const issue: Issue = {
  week,
  season: facts.season,
  publishedAt: new Date().toISOString(),
  signOff,
  // What the stats said at publication, for the corrections check.
  snapshot: snapshotFrom(facts),
  articles,
};

writeIssue(issue);
fs.rmSync(PENDING, { force: true });

const templated = articles.filter((a) => a.fromTemplate).length;
console.log(
  `published week ${week}: ${articles.length} articles, ${templated} from templates, byline ${BYLINE}`
);

// The issue is out, so say so: one alert to everybody who wants the Rag, and a
// separate one to each manager who won hardware, naming what he won. Claimed
// per week, so a second run of the publisher does not announce it twice.
if (pushConfigured()) {
  const awards = await awardsForWeek(week);
  const hardware = new Map<number, string[]>();
  for (const award of awards) {
    const held = hardware.get(award.rosterId) ?? [];
    held.push(TROPHY_NAMES[award.kind].name);
    hardware.set(award.rosterId, held);
  }

  const claims = [{ key: `rag:${week}`, week, kind: 'rag' }];
  for (const rosterId of hardware.keys()) {
    claims.push({ key: `hardware:${week}:${rosterId}`, week, kind: 'rag' });
  }
  const won = await claimAlerts(claims);

  let sent = 0;
  if (won.has(`rag:${week}`)) {
    const lead = articles[0];
    sent += await sendAlert(
      { alert: 'rag' },
      {
        title: `The Squirtrag, Week ${week}`,
        body: lead ? lead.headline : 'This week\'s issue is up.',
        url: `/rag/${week}`,
        tag: `rag-${week}`,
      }
    );
  }
  for (const [rosterId, names] of hardware) {
    if (!won.has(`hardware:${week}:${rosterId}`)) continue;
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
    sent += await sendAlert(
      { alert: 'rag', teamIds: [String(rosterId)] },
      {
        title: names.length > 1 ? 'You won hardware' : `You won the ${names[0]}`,
        body: `Week ${week}: ${list}. ${firstNameOf(rosterId) ?? 'You'} is on the trophy case.`,
        url: `/managers/${rosterId}`,
        tag: `hardware-${week}-${rosterId}`,
      }
    );
  }
  console.log(`  alerts: ${won.size} claimed, ${sent} deliveries`);
}
