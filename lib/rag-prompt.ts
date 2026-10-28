// The Rag's prompt, shared by the weekly batch (scripts/week-close.ts) and
// the single-article retry (lib/rag-writer.ts), so a retry is written against
// exactly the instructions the batch was.
//
// It comes in two parts. The facts are identical for every article in an
// issue, so they go first, in their own block marked for caching: the first
// article pays to read them and the other ten read them at a tenth of the
// price. The article's own instructions follow.

import { ARTICLE_SPECS, SIGN_OFF_RULE, SIGN_OFF_SEED, type ArticleId } from '../config/style-guide.ts';
import type { WeekFacts } from './fact-packets.ts';
import { signOffHistory } from './rag.ts';
import type { Violation } from './validate.ts';
import type { Candidate } from './validate.ts';

/**
 * How to use the packet. The Rag is supposed to be articles with context:
 * who made which call, what it cost, how close it was, what it means. The
 * matchups list carries all of that, sourced from Sleeper.
 */
export const SOURCING_RULE = [
  'How to use these facts:',
  '- The matchups list is the story under every score. For each game it has every starter against his projection with his box score line, the bench calls that cost points (benchCalls: who sat, who started instead, and the cost), whether the loser benched the win (benchedTheWin), how close it was, both records and streaks, where each score ranked that week (weekRank), and earlier meetings (headToHead). history has every week’s lowest and highest score so far.',
  '- Build the article out of those specifics. Name the decision, the player, his line and what it cost. A starter who busted against his projection, a bench player who outscored the man who started, a game lost by less than a bench call: that is the story. Generic recaps of the final score are not.',
  '- Every number you write must appear in these facts exactly as written. Do not add, subtract, round, average or remember numbers, and do not bring in earlier weeks unless they are in history or headToHead. If you want a number that is not here, write the sentence without it.',
  '- Write the record and streak the way they appear (3-4, L5). Use first names from managers when you talk about the people.',
  '- The field names (weekRank, vsProjection, benchCalls, benchedTheWin, headToHead, statLine and the rest) are for you. Never write them; say what they mean in plain English (the ninth best score of the week, 11.3 under his projection).',
].join('\n');

/** The facts block, identical for every article in the issue (the cached part). */
export function factsBlock(facts: WeekFacts): string {
  return ['These are the only facts you may use for this issue. Every number you write must appear here:', JSON.stringify(facts, null, 1)].join('\n');
}

/** One article's instructions, after the facts. */
export function instructionsFor(id: ArticleId, facts: WeekFacts): string {
  const spec = ARTICLE_SPECS[id];
  const parts = [
    `Write the ${spec.title} article for Week ${facts.week} of ${facts.leagueName}.`,
    spec.brief,
    `Length: roughly ${spec.words[0]} to ${spec.words[1]} words in the body, in full paragraphs.`,
    '',
    SOURCING_RULE,
    '',
    'Every entry in body must be a complete paragraph of prose. Never emit an empty string, a field name, or bare punctuation as a paragraph.',
  ];
  if (id === 'shart') {
    const history = signOffHistory();
    parts.push('', SIGN_OFF_RULE, history.length ? history.map((line, i) => `${i + 1}. ${line}`).join('\n') : `1. ${SIGN_OFF_SEED}`, '', 'Put your sign off in the signOff field as well as at the end of the body.');
  }
  return parts.join('\n');
}

/**
 * The retry's note: the draft that was rejected and exactly why, so the
 * second attempt fixes those claims instead of starting over blind (which is
 * how a fresh retry used to fail for a brand new reason and go to a template).
 */
export function revisionNote(draft: Candidate, violations: Violation[]): string {
  return [
    'Your draft below was rejected by the fact check for these reasons:',
    ...violations.map((v) => `- ${v.detail}`),
    '',
    'Rewrite it. Keep everything that was right, the voice and the length. Fix only those claims: use the number exactly as the facts give it, or write the sentence without a number. Never use a field name from the facts in the prose.',
    '',
    'The rejected draft:',
    JSON.stringify(draft, null, 1),
  ].join('\n');
}
