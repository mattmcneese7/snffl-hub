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
import { allowedNumbers, buildWeekFacts, properNouns, type WeekFacts } from '../lib/fact-packets.ts';
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
import { validateArticle, type Candidate } from '../lib/validate.ts';

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

const facts = await buildWeekFacts(week);
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

const articles: Article[] = [];
let signOff: string | undefined;

for (const id of ARTICLE_ORDER) {
  const spec = ARTICLE_SPECS[id];
  const result = written[`week-${week}-${id}`];

  let candidate: Candidate | null = null;
  let fromTemplate = false;

  if (result?.ok) {
    const data = result.data as Candidate;
    const check = validateArticle(data, allowed, names, counts);
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

  // One retry, then the template.
  //
  // This used to be a comment saying a retry belonged here, and the absence was
  // expensive: Week 1 sent six articles to templates, five of them over a
  // single curly apostrophe, with no second attempt. A retry is one message
  // rather than a whole batch, so a bad draft costs cents instead of an issue.
  if (!candidate && result?.ok) {
    const retry = await retryArticle(id, facts);
    if (retry) {
      const check = validateArticle(retry, allowed, names, counts);
      if (check.ok) {
        candidate = retry;
        console.log(`  ${id} passed on retry`);
      } else {
        console.warn(`  ${id} failed again: ${check.violations.map((v) => v.detail).join('; ')}`);
      }
    }
  }

  // A second failure falls through to the template, which is always correct
  // because it is built from the facts.
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
