// Writes one Rag article in a single message, for publish's retry and for
// adding an article to an issue that is already out (scripts/write-article.ts).
// Same prompt as the weekly batch, so a single article reads like the rest.

import type Anthropic from '@anthropic-ai/sdk';
import { VOICE, type ArticleId } from '../config/style-guide.ts';
import { canSpend, client, costOf, MODELS, recordSpend } from './claude.ts';
import type { WeekFacts } from './fact-packets.ts';
import { factsBlock, instructionsFor, revisionNote } from './rag-prompt.ts';
import type { Candidate, Violation } from './validate.ts';

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
 * With the rejected draft and its violations it is a revision, not a fresh
 * try: a blind retry used to fail for a brand new reason and go to a
 * template. The prompt is the batch's own (lib/rag-prompt.ts), facts cached.
 */
export async function retryArticle(id: ArticleId, facts: WeekFacts, draft?: Candidate, violations: Violation[] = []): Promise<Candidate | null> {
  // An unattended job must never charge past the ceiling.
  if (!canSpend(0.1)) {
    console.warn(`  ${id} not retried, spend limit reached`);
    return null;
  }
  const instructions = [instructionsFor(id, facts), ...(draft && violations.length ? ['', revisionNote(draft, violations)] : [])].join('\n');
  try {
    const message = await client().messages.create({
      model: MODELS.writer,
      max_tokens: 12000,
      system: VOICE,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: factsBlock(facts), cache_control: { type: 'ephemeral' } },
            { type: 'text', text: instructions },
          ],
        },
      ],
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
