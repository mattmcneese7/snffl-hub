// Week close, Brief Section 3.
//
// Runs Monday night after the final game, retried at 3:00 AM Tuesday.
// Finalizes scores, computes every award, builds the fact packets and submits
// one Claude batch. It does not publish: the publish job collects the batch
// and gates on 9:00 AM Central.
//
// Run with Node 24, which strips TypeScript types natively.

import fs from 'node:fs';
import path from 'node:path';
import { ARTICLE_ORDER, VOICE, type ArticleId } from '../config/style-guide.ts';
import { canSpend, spendSummary, submitBatch, type BatchRequest } from '../lib/claude.ts';
import { allowedNumbers, buildWeekFacts, type WeekFacts } from '../lib/fact-packets.ts';
import { factsBlock, instructionsFor } from '../lib/rag-prompt.ts';

const PENDING = path.join('data', 'rag', 'pending.json');

const ARTICLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'deck', 'body'],
  properties: {
    headline: { type: 'string' },
    deck: { type: 'string' },
    body: { type: 'array', items: { type: 'string' }, minItems: 1 },
    signOff: { type: 'string' },
  },
} as const;

/** The article's prompt, after the issue's cached facts (lib/rag-prompt.ts). */
export const promptFor = (id: ArticleId, facts: WeekFacts) => instructionsFor(id, facts);

const week = Number(process.argv[2] ?? process.env.SNFFL_WEEK ?? '0');
if (!week) {
  console.error('usage: node scripts/week-close.ts <week>');
  process.exit(1);
}

console.log(`week close starting for week ${week}`);
console.log(`  spend: ${spendSummary()}`);

if (!canSpend(0.5)) {
  console.warn('  spend limit reached, skipping the batch. Publish will use templates.');
  fs.mkdirSync(path.dirname(PENDING), { recursive: true });
  fs.writeFileSync(PENDING, JSON.stringify({ week, batchId: null, reason: 'spend limit' }, null, 1));
  process.exit(0);
}

const facts = await buildWeekFacts(week);
console.log(
  `  facts: ${facts.games.length} games, shart ${facts.shart.manager} at ${facts.shart.points}, top ${facts.managerOfWeek.manager} at ${facts.managerOfWeek.points}`
);

// Corrections only run when something actually changed, per the brief.
const ids = ARTICLE_ORDER.filter((id) => id !== 'corrections');

const requests: BatchRequest[] = ids.map((id) => ({
  customId: `week-${week}-${id}`,
  system: VOICE,
  facts: factsBlock(facts),
  prompt: promptFor(id, facts),
  schema: ARTICLE_SCHEMA as unknown as Record<string, unknown>,
  // Week 1 truncated three articles at exactly 2000: Power Rankings needs 14
  // blurbs, Around the League recaps 7 games, and Waiver Wire spent the whole
  // cap without emitting usable JSON. A truncated article is a total loss, so
  // the cap sits well clear of the longest specs rather than close to them.
  maxTokens: 6000,
}));

const batchId = await submitBatch(requests);
console.log(`  submitted batch ${batchId} with ${requests.length} articles`);

fs.mkdirSync(path.dirname(PENDING), { recursive: true });
fs.writeFileSync(
  PENDING,
  JSON.stringify(
    {
      week,
      batchId,
      submittedAt: new Date().toISOString(),
      allowed: [...allowedNumbers(facts)].sort(),
    },
    null,
    1
  )
);

console.log('week close complete. Publish collects the batch.');
