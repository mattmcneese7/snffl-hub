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
import {
  ARTICLE_ORDER,
  ARTICLE_SPECS,
  SIGN_OFF_RULE,
  SIGN_OFF_SEED,
  VOICE,
  type ArticleId,
} from '../config/style-guide.ts';
import { canSpend, spendSummary, submitBatch, type BatchRequest } from '../lib/claude.ts';
import { allowedNumbers, buildWeekFacts, type WeekFacts } from '../lib/fact-packets.ts';
import { signOffHistory } from '../lib/rag.ts';

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

export function promptFor(id: ArticleId, facts: WeekFacts): string {
  const spec = ARTICLE_SPECS[id];
  const history = signOffHistory();

  const parts = [
    `Write the ${spec.title} article for Week ${facts.week} of ${facts.leagueName}.`,
    spec.brief,
    `Length: roughly ${spec.words[0]} to ${spec.words[1]} words in the body.`,
    '',
    'These are the only facts you may use. Every number you write must appear here:',
    JSON.stringify(facts, null, 1),
  ];

  if (id === 'shart') {
    parts.push(
      '',
      SIGN_OFF_RULE,
      history.length ? history.map((line, i) => `${i + 1}. ${line}`).join('\n') : `1. ${SIGN_OFF_SEED}`,
      '',
      'Put your sign off in the signOff field as well as at the end of the body.'
    );
  }

  return parts.join('\n');
}

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
  prompt: promptFor(id, facts),
  schema: ARTICLE_SCHEMA as unknown as Record<string, unknown>,
  maxTokens: 2000,
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
