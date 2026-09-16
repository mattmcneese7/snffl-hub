// Validation, Brief Section 3.
//
// Every number in generated text is checked against the fact packet that
// produced it. A mismatch triggers one retry, then the template fallback.
// This is what makes "the writer may not invent stats" enforceable.
//
// Proper nouns are redacted before any of that runs. A number inside a team
// name is not a claim ("Bibi's Ballers 69"), and a manager handle is spelled
// the way its owner spells it (nunnells, bearcat2789), so neither should be
// judged as a statistic or as a Title Case violation.

export type Violation = { kind: string; detail: string };

/** Years and small counts that are always fine regardless of the packet. */
const ALWAYS_ALLOWED = new Set(['1', '2', '3', '0', '100']);

const isYear = (value: string) => /^(19|20)\d{2}$/.test(value);

/**
 * Smart punctuation folded to plain ASCII before matching.
 *
 * Sleeper stores one team as "Bibi’s Ballers 69" with a curly apostrophe, and a
 * writer naturally types a straight one. Exact matching then never redacts that
 * name, and the 69 inside it reads as a statistic: five Week 1 articles were
 * rejected for "69 is not in the fact packet", all from that single character.
 */
const fold = (value: string) =>
  value.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

/** Replaces each known name with a marker so it cannot be parsed as content. */
export function redactNames(text: string, names: string[]): string {
  let out = fold(text);
  for (const name of names) {
    if (!name) continue;
    out = out.split(fold(name)).join('');
  }
  return out;
}

/**
 * Pulls every standalone number out of prose. Numbers glued to letters (4th,
 * QB1) are ordinals or labels rather than claims, so they are skipped.
 */
export function numbersIn(text: string): string[] {
  const matches = text.replace(/,/g, '').match(/(?<![\w.])\d+(?:\.\d+)?(?![\w])/g);
  return matches ?? [];
}

/** Spelled numerals, so a count written as a word can still be checked. */
const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20,
};

/**
 * Nouns whose count is a league fact rather than a turn of phrase.
 *
 * "points" is deliberately absent. A point total is a score, already checked
 * exactly by checkNumbers against the full packet, and including it here put
 * the two checkers in conflict over the same words.
 */
const COUNTED_NOUNS = 'weeks?|teams?|games?|matchups?|managers?';

/**
 * Catches a count that is wrong, whether it is spelled or written as digits.
 *
 * This deliberately does not use the general allowed set. That pool contains
 * every seed and every power ranking position, which for 14 rosters is every
 * integer from 0 to 14, so a count in that range could never be rejected:
 * "Twelve more weeks" passed only because somebody finished twelfth. The same
 * hole let a digit claim like "11 teams" through.
 *
 * Counts are checked against the handful of facts that can actually produce
 * one. Only league nouns are covered, because a blanket rule would reject
 * "explain this one to you" and other ordinary English.
 */
export function checkCounts(text: string, counts: Set<number>): Violation[] {
  const out: Violation[] = [];
  const words = Object.keys(NUMBER_WORDS).join('|');
  // The digit form must be a whole number standing on its own. Written as
  // \b\d{1,3}\b it matched the fractional half of "63.04 points", because a
  // word boundary sits happily after a decimal point, so an exactly correct
  // score was reported as an invented count.
  const pattern = new RegExp(
    `(?<![\\w.])(${words}|\\d{1,3})(?![\\w.])\\s+(?:more\\s+|other\\s+|further\\s+)?(?:${COUNTED_NOUNS})\\b`,
    'gi'
  );
  for (const match of text.matchAll(pattern)) {
    const token = match[1].toLowerCase();
    const value = token in NUMBER_WORDS ? NUMBER_WORDS[token] : Number(token);
    if (!Number.isFinite(value) || counts.has(value)) continue;
    out.push({
      kind: 'count',
      detail: `"${match[0].trim()}" is a count the facts do not support`,
    });
  }
  return out;
}

/**
 * Every count a writer can legitimately state, built from the packet rather
 * than from the permissive number pool.
 */
export function countsFrom(facts: {
  week: number;
  teamCount: number;
  playoffTeams: number;
  weeksRemaining?: number;
  games: unknown[];
  nextWeek: unknown[];
  topPerformers: unknown[];
}): Set<number> {
  const out = new Set<number>([
    facts.week,
    facts.teamCount,
    facts.playoffTeams,
    facts.games.length,
    facts.nextWeek.length,
    facts.topPerformers.length,
    // Two teams to a matchup. Structural, not a claim: the Preview describes
    // matchups for a living, and "two teams collide" failed three regenerations
    // in a row before it was clear the rule was wrong rather than the writing.
    2,
  ]);
  if (facts.weeksRemaining != null) out.add(facts.weeksRemaining);
  return out;
}

export function checkNumbers(text: string, allowed: Set<string>, names: string[] = []): Violation[] {
  const out: Violation[] = [];
  for (const raw of numbersIn(redactNames(text, names))) {
    if (ALWAYS_ALLOWED.has(raw) || isYear(raw)) continue;
    if (allowed.has(raw)) continue;
    // Trailing zero forms: 95.20 against 95.2, 95 against 95.00.
    const asNumber = Number(raw);
    if (
      allowed.has(asNumber.toFixed(1)) ||
      allowed.has(asNumber.toFixed(2)) ||
      allowed.has(String(asNumber))
    ) {
      continue;
    }
    out.push({ kind: 'number', detail: `${raw} is not in the fact packet` });
  }
  return out;
}

/** Rule 4 in CLAUDE.md: never an em dash or a double hyphen in site copy. */
export function checkDashes(text: string): Violation[] {
  const out: Violation[] = [];
  if (/—/.test(text)) out.push({ kind: 'dash', detail: 'contains an em dash' });
  if (/--/.test(text)) out.push({ kind: 'dash', detail: 'contains a double hyphen' });
  return out;
}

const SMALL_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'of', 'on',
  'or', 'the', 'to', 'up', 'vs',
]);

/**
 * Title Case: every word capitalized except short connecting words. Words that
 * came from a proper noun are skipped, since the redaction marker replaced them.
 */
export function checkHeadline(headline: string, names: string[] = []): Violation[] {
  const words = redactNames(headline, names).trim().split(/\s+/);
  const out: Violation[] = [];

  words.forEach((word, index) => {
    if (word.includes('')) return; // was a team or manager name
    const bare = word.replace(/[^A-Za-z]/g, '');
    if (!bare) return;
    const lower = bare.toLowerCase();
    const capitalized = bare[0] === bare[0].toUpperCase();

    if (index === 0 || index === words.length - 1) {
      if (!capitalized) out.push({ kind: 'headline', detail: `"${word}" should be capitalized` });
      return;
    }
    if (SMALL_WORDS.has(lower)) return;
    if (!capitalized) out.push({ kind: 'headline', detail: `"${word}" should be capitalized` });
  });

  return out;
}

/** Field names from the article schema, which must never appear as prose. */
const SCHEMA_KEYS = new Set(['headline', 'deck', 'body', 'signOff']);

/**
 * Rejects a body that is not prose.
 *
 * Week 1 published a Shart whose body was ["real", "real", "real", ", ", "] ,",
 * "signOff", "", " ", " ", " ", " "]. The structured output malformed itself in
 * a way that still parsed as valid JSON, so nothing upstream noticed and the
 * lead story went out with eight junk paragraphs. Numbers, dashes and Title
 * Case were all fine, because none of those checks ask whether a paragraph is
 * a sentence.
 */
export function checkBody(body: string[]): Violation[] {
  const out: Violation[] = [];
  body.forEach((paragraph, index) => {
    const text = paragraph.trim();
    if (!text) {
      out.push({ kind: 'body', detail: `paragraph ${index + 1} is empty` });
      return;
    }
    if (SCHEMA_KEYS.has(text)) {
      out.push({ kind: 'body', detail: `paragraph ${index + 1} is the field name "${text}"` });
      return;
    }
    // Punctuation only, such as a stray "] ," from a malformed array.
    if (!/[A-Za-z]/.test(text)) {
      out.push({ kind: 'body', detail: `paragraph ${index + 1} has no words: ${JSON.stringify(text)}` });
    }
  });
  return out;
}

export type Candidate = {
  headline: string;
  deck: string;
  body: string[];
  signOff?: string;
};

export function validateArticle(
  candidate: Candidate,
  allowed: Set<string>,
  names: string[] = [],
  /** Legitimate counts, from countsFrom. Omitted means counts go unchecked. */
  counts?: Set<number>
): { ok: boolean; violations: Violation[] } {
  const prose = [candidate.headline, candidate.deck, ...candidate.body, candidate.signOff ?? '']
    .filter(Boolean)
    .join('\n');

  const violations = [
    ...checkNumbers(prose, allowed, names),
    // Names are redacted first so a team called "Bibi's Ballers 69" cannot be
    // read as a count, the same trap that rejected five Week 1 articles.
    ...(counts ? checkCounts(redactNames(prose, names), counts) : []),
    ...checkDashes(prose),
    ...checkHeadline(candidate.headline, names),
  ];

  if (!candidate.headline.trim()) violations.push({ kind: 'empty', detail: 'no headline' });
  if (!candidate.body.length) violations.push({ kind: 'empty', detail: 'no body' });
  violations.push(...checkBody(candidate.body));

  return { ok: violations.length === 0, violations };
}
