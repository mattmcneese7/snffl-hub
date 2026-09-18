// Writes one Rag article in a single message, for publish's retry and for
// adding an article to an issue that is already out (scripts/write-article.ts).
// Same prompt as the weekly batch, so a single article reads like the rest.

import type Anthropic from '@anthropic-ai/sdk';
import {
  ARTICLE_SPECS,
  SIGN_OFF_RULE,
  SIGN_OFF_SEED,
  VOICE,
  type ArticleId,
} from '../config/style-guide.ts';
import { canSpend, client, costOf, MODELS, recordSpend } from './claude.ts';
import type { WeekFacts } from './fact-packets.ts';
import { signOffHistory } from './rag.ts';
import type { Candidate } from './validate.ts';

/** Matches the batch schema. minItems above 1 is rejected with a 400. */
const RETRY_SCHEMA = {
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

/**
 * One more attempt at a single article.
 *
 * Deliberately a single message rather than a batch: a batch is submitted and
 * collected on separate runs, which is the whole reason a failed article used
 * to go straight to a template. One retry costs cents.
 *
 * The prompt is built the same way week-close builds it, so a retry is written
 * against the same instructions as the original rather than a looser variant.
 */
export async function retryArticle(id: ArticleId, facts: WeekFacts): Promise<Candidate | null> {
  // An unattended job must never charge past the ceiling.
  if (!canSpend(0.05)) {
    console.warn(`  ${id} not retried, spend limit reached`);
    return null;
  }

  const spec = ARTICLE_SPECS[id];
  const parts = [
    `Write the ${spec.title} article for Week ${facts.week} of ${facts.leagueName}.`,
    spec.brief,
    `Length: roughly ${spec.words[0]} to ${spec.words[1]} words in the body.`,
    '',
    'These are the only facts you may use. Every number you write must appear here:',
    JSON.stringify(facts, null, 1),
    '',
    'Every entry in body must be a complete paragraph of prose. Never emit an empty string, a field name, or bare punctuation as a paragraph.',
  ];

  if (id === 'shart') {
    const history = signOffHistory();
    parts.push(
      '',
      SIGN_OFF_RULE,
      history.length
        ? history.map((line, i) => `${i + 1}. ${line}`).join('\n')
        : `1. ${SIGN_OFF_SEED}`,
      '',
      'Put your sign off in the signOff field as well as at the end of the body.'
    );
  }

  try {
    const message = await client().messages.create({
      model: MODELS.writer,
      max_tokens: 6000,
      system: VOICE,
      messages: [{ role: 'user', content: parts.join('\n') }],
      output_config: { format: { type: 'json_schema' as const, schema: RETRY_SCHEMA } },
    });
    recordSpend(`rag retry ${id}`, MODELS.writer, costOf(message.model, message.usage, false));

    if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') {
      console.warn(`  ${id} retry stopped on ${message.stop_reason}`);
      return null;
    }

    // Anthropic.TextBlock rather than a hand written shape: the SDK's block
    // carries citations too, so an invented predicate is not assignable to
    // ContentBlock. lib/claude.ts narrows the same way.
    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
    return JSON.parse(text) as Candidate;
  } catch (error) {
    console.warn(`  ${id} retry failed: ${(error as Error).message}`);
    return null;
  }
}

