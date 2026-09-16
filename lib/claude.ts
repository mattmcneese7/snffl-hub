// Claude API client for the writing pipeline, Brief Section 3.
//
// The Tuesday package goes through the Batch API, which bills at half rate and
// suits work that is not latency sensitive. Feed posts and highlight tagging
// use Haiku.
//
// Every call is gated by a spend guard: the $10 is prepaid, so the worst case
// has to be "writing pauses", never a surprise bill.

import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

/** Brief Section 3 names Sonnet for the Tuesday package and Haiku elsewhere. */
export const MODELS = {
  writer: 'claude-sonnet-5',
  tagger: 'claude-haiku-4-5',
} as const;

/** Dollars per million tokens, first party API rates. */
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

const LEDGER = path.join('data', 'spend.json');

export type Ledger = {
  /** Dollars spent, running total. */
  spent: number;
  /** Hard ceiling. Writing pauses above this rather than charging on. */
  limitUsd: number;
  entries: { at: string; job: string; model: string; usd: number }[];
};

const DEFAULT_LIMIT = Number(process.env.CLAUDE_SPEND_LIMIT_USD ?? '8.5');

export function readLedger(): Ledger {
  try {
    const raw = JSON.parse(fs.readFileSync(LEDGER, 'utf8')) as Ledger;
    return { ...raw, limitUsd: DEFAULT_LIMIT };
  } catch {
    return { spent: 0, limitUsd: DEFAULT_LIMIT, entries: [] };
  }
}

function writeLedger(ledger: Ledger) {
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  // Keys sorted so the nightly commit does not churn on ordering.
  const sorted = {
    entries: ledger.entries.slice(-200),
    limitUsd: ledger.limitUsd,
    spent: Number(ledger.spent.toFixed(4)),
  };
  fs.writeFileSync(LEDGER, JSON.stringify(sorted, null, 1));
}

export function costOf(
  model: string,
  usage: { input_tokens?: number; output_tokens?: number },
  batch = false
): number {
  const price = PRICING[model] ?? PRICING['claude-sonnet-5'];
  const input = ((usage.input_tokens ?? 0) / 1_000_000) * price.input;
  const output = ((usage.output_tokens ?? 0) / 1_000_000) * price.output;
  // Batch bills at half rate.
  return (input + output) * (batch ? 0.5 : 1);
}

export function recordSpend(job: string, model: string, usd: number) {
  const ledger = readLedger();
  ledger.spent += usd;
  ledger.entries.push({ at: new Date().toISOString(), job, model, usd: Number(usd.toFixed(4)) });
  writeLedger(ledger);
}

/** False means fall back to templates rather than spend. */
export function canSpend(estimateUsd = 0): boolean {
  const ledger = readLedger();
  return ledger.spent + estimateUsd < ledger.limitUsd;
}

export function spendSummary(): string {
  const { spent, limitUsd } = readLedger();
  return `$${spent.toFixed(2)} of $${limitUsd.toFixed(2)} used`;
}

export function client(): Anthropic {
  // Resolves ANTHROPIC_API_KEY from the environment.
  return new Anthropic();
}

export type BatchRequest = {
  customId: string;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
};

/**
 * Submits one batch and returns its id. Results are collected later by the
 * publish job, which is why this does not wait.
 */
export async function submitBatch(requests: BatchRequest[]): Promise<string> {
  const anthropic = client();
  const batch = await anthropic.messages.batches.create({
    requests: requests.map((request) => ({
      custom_id: request.customId,
      params: {
        model: MODELS.writer,
        max_tokens: request.maxTokens ?? 4000,
        system: request.system,
        messages: [{ role: 'user' as const, content: request.prompt }],
        // Structured output keeps validation mechanical rather than parsing prose.
        output_config: { format: { type: 'json_schema' as const, schema: request.schema } },
      },
    })),
  });
  return batch.id;
}

export type BatchOutcome = {
  ready: boolean;
  status: string;
  /** Keyed by custom_id. Batch results arrive in arbitrary order. */
  results: Record<string, { ok: true; data: unknown } | { ok: false; error: string }>;
  usd: number;
};

export async function collectBatch(batchId: string): Promise<BatchOutcome> {
  const anthropic = client();
  const batch = await anthropic.messages.batches.retrieve(batchId);

  if (batch.processing_status !== 'ended') {
    return { ready: false, status: batch.processing_status, results: {}, usd: 0 };
  }

  const results: BatchOutcome['results'] = {};
  let usd = 0;

  for await (const entry of await anthropic.messages.batches.results(batchId)) {
    const id = entry.custom_id;
    if (entry.result.type !== 'succeeded') {
      results[id] = { ok: false, error: entry.result.type };
      continue;
    }

    const message = entry.result.message;
    usd += costOf(message.model, message.usage, true);

    // A refusal or a token cap is a failed article, not a usable one.
    if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') {
      results[id] = { ok: false, error: message.stop_reason };
      continue;
    }

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    try {
      results[id] = { ok: true, data: JSON.parse(text) };
    } catch {
      results[id] = { ok: false, error: 'unparseable json' };
    }
  }

  return { ready: true, status: batch.processing_status, results, usd };
}
