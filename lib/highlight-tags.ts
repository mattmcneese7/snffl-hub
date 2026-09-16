// Classifying NFL uploads into highlights, Brief Section 3.
//
// The NFL channel is a mixed feed. A real page of uploads carries per play
// clips next to power rankings shows, full game replays, weekly compilations
// and social filler, so something has to decide which are actually highlights.
//
// A regex over titles was tried first and was too blunt: it passed 51% of a
// 150 upload sample, including "FULL GAME" replays, "Every Touchdown of Week 1"
// compilations and "welcome back, Patrick Mahomes" social posts, which are not
// clips of a play. Judgment is what a small model is good at, so Haiku makes
// the call and code keeps the parts that must be verifiable.
//
// The split matters: Haiku says what a video is and which players it names,
// and then matching a name to a player id and deciding owned versus free agent
// happens in code, against the roster, where it can be checked.
//
// One message carrying many titles rather than the Batch API. Batches can take
// hours to come back and this runs every 30 minutes during games, so a clip
// would surface long after anybody cared.

import type Anthropic from '@anthropic-ai/sdk';
import { client, costOf, MODELS, recordSpend } from './claude.ts';
import type { Upload } from './youtube.ts';

export type VideoKind = 'play' | 'compilation' | 'full_game' | 'show' | 'social';

export type Classified = {
  id: string;
  kind: VideoKind;
  /** "rushing touchdown", "sack", "interception". Empty when not a play. */
  playType: string;
  /** Player names as written in the title, for code to match against rosters. */
  players: string[];
};

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['videos'],
  properties: {
    videos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'kind', 'play_type', 'players'],
        properties: {
          id: { type: 'string' },
          kind: {
            type: 'string',
            enum: ['play', 'compilation', 'full_game', 'show', 'social'],
          },
          play_type: { type: 'string' },
          players: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const;

const SYSTEM = `You sort NFL video uploads for a fantasy football site.

For each video decide what it is:
- play: a single football play or one player's plays from one game. This is the only kind worth showing as a highlight.
- compilation: many plays across many games, such as "Every Touchdown of Week 1".
- full_game: a full game or extended game highlights covering a whole matchup.
- show: studio content, power rankings, previews, takeaways, press conferences, interviews, analysis.
- social: reaction clips, jokes, memes, hype posts, anything with no football play in it.

Then:
- play_type: for a play, describe it plainly, such as "rushing touchdown", "receiving touchdown", "interception", "sack", "field goal". Empty string for anything else.
- players: every NFL player named, spelled as the title spells them. Empty when none.

Judge only from the title and description given. Do not guess at players who are not named.`;

/**
 * Classifies a page of uploads in one call.
 *
 * Returns an empty list on any failure, so a tagging outage means no new
 * highlights rather than a broken job.
 */
export async function classifyUploads(uploads: Upload[]): Promise<Classified[]> {
  if (!uploads.length) return [];

  const lines = uploads.map(
    (upload) => `${upload.id} :: ${upload.title}${upload.description ? ` :: ${upload.description.slice(0, 160)}` : ''}`
  );

  try {
    const message = await client().messages.create({
      model: MODELS.tagger,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Classify every video. Return one entry per video, keeping the ids exactly as given.\n\n${lines.join('\n')}`,
        },
      ],
      output_config: { format: { type: 'json_schema' as const, schema: SCHEMA } },
    });

    recordSpend('highlight tagging', MODELS.tagger, costOf(message.model, message.usage, false));

    if (message.stop_reason === 'max_tokens' || message.stop_reason === 'refusal') return [];

    // Anthropic.TextBlock, not a hand written shape: the SDK block carries
    // citations too, so an invented predicate is not assignable to ContentBlock.
    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const parsed = JSON.parse(text) as { videos?: Record<string, unknown>[] };
    const rows = Array.isArray(parsed?.videos) ? parsed.videos : [];

    return rows.flatMap((row): Classified[] => {
      const id = typeof row.id === 'string' ? row.id : null;
      if (!id) return [];
      return [
        {
          id,
          kind: (row.kind as VideoKind) ?? 'social',
          playType: typeof row.play_type === 'string' ? row.play_type : '',
          players: Array.isArray(row.players) ? row.players.map(String) : [],
        },
      ];
    });
  } catch {
    return [];
  }
}
