// Corrections check, Brief Section 3.
//
// Runs Wednesday and Thursday. Compares final stats against what each issue
// recorded at publication. Any change stamps the article Updated. If the Shart
// itself changed, the article is retracted and the next issue runs a formal
// apology.
//
// Run with Node 24, which strips TypeScript types natively.

import { buildWeekFacts } from '../lib/fact-packets.ts';
import {
  publishedWeeks,
  queueRetraction,
  readIssue,
  writeIssue,
  type Issue,
} from '../lib/rag.ts';

/** Only recent issues can still move: stat corrections do not arrive in March. */
const LOOKBACK_WEEKS = 3;

const weeks = publishedWeeks().slice(-LOOKBACK_WEEKS);
if (!weeks.length) {
  console.log('nothing published yet, no corrections to check');
  process.exit(0);
}

console.log(`checking weeks ${weeks.join(', ')}`);
let changed = 0;

for (const week of weeks) {
  const issue = readIssue(week);
  if (!issue?.snapshot) {
    console.log(`  week ${week}: no snapshot, skipping`);
    continue;
  }

  const facts = await buildWeekFacts(week);
  const snap = issue.snapshot;
  const notes: string[] = [];

  // Did any score move at all?
  for (const result of snap.results) {
    const now = facts.games.find((g) => g.matchupId === result.matchupId);
    if (!now) continue;
    if (
      now.away.points !== result.awayPoints ||
      now.home.points !== result.homePoints
    ) {
      notes.push(
        `matchup ${result.matchupId} went from ${result.awayPoints} and ${result.homePoints} to ${now.away.points} and ${now.home.points}`
      );
    }
    if (now.winner !== result.winner) {
      notes.push(`matchup ${result.matchupId} now shows ${now.winner} winning, not ${result.winner}`);
    }
  }

  const shartMoved = facts.shart.manager !== snap.shart.manager;
  const shartPointsMoved = facts.shart.points !== snap.shart.points;

  if (!notes.length && !shartMoved && !shartPointsMoved) {
    console.log(`  week ${week}: unchanged`);
    continue;
  }

  const updated: Issue = { ...issue, updatedAt: new Date().toISOString() };

  if (shartMoved) {
    console.log(
      `  week ${week}: THE SHART CHANGED, ${snap.shart.manager} to ${facts.shart.manager}`
    );
    updated.articles = updated.articles.map((article) =>
      article.id === 'shart'
        ? { ...article, retracted: true, updatedAt: new Date().toISOString() }
        : article
    );
    queueRetraction({
      week,
      queuedAt: new Date().toISOString(),
      reason: 'The Shart changed after publication',
      was: `${snap.shart.manager} at ${snap.shart.points}`,
      now: `${facts.shart.manager} at ${facts.shart.points}`,
    });
  } else {
    // Scores moved but the Shart stands: stamp the affected articles Updated.
    updated.articles = updated.articles.map((article) =>
      article.id === 'shart' || article.id === 'around' || article.id === 'game'
        ? { ...article, updatedAt: new Date().toISOString() }
        : article
    );
  }

  for (const note of notes) console.log(`    ${note}`);
  writeIssue(updated);
  changed++;
}

console.log(changed ? `${changed} issue(s) corrected` : 'no corrections needed');
