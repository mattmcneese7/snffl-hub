// Adds one article to an issue that is already published, for a new section
// arriving mid season: node scripts/write-article.ts --week=1 --id=hardware
//
// Same writer, same validation and the same template fallback as publish, and
// the article lands in its place in ARTICLE_ORDER rather than at the end. The
// rest of the issue is left exactly as it was.
//
// Run with Node 24, which strips TypeScript types natively.

import { ARTICLE_ORDER, ARTICLE_SPECS, type ArticleId } from '../config/style-guide.ts';
import { allowedNumbers, buildWeekFacts, properNouns } from '../lib/fact-packets.ts';
import { readIssue, readTimeOf, slugFor, snapshotFrom, writeIssue } from '../lib/rag.ts';
import { retryArticle } from '../lib/rag-writer.ts';
import { templateFor } from '../lib/templates.ts';
import { countsFrom, validateArticle, type Candidate } from '../lib/validate.ts';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const week = Number(arg('week'));
const id = arg('id') as ArticleId;

if (!week || !ARTICLE_SPECS[id]) {
  console.error('usage: node scripts/write-article.ts --week=1 --id=hardware');
  process.exit(1);
}
const issue = readIssue(week);
if (!issue) {
  console.error(`Week ${week} has no published issue to add to`);
  process.exit(1);
}

const facts = await buildWeekFacts(week);
const allowed = allowedNumbers(facts);
const names = properNouns(facts);
const counts = countsFrom(facts);

let candidate: Candidate | null = null;
let fromTemplate = false;
for (let attempt = 1; attempt <= 2 && !candidate; attempt++) {
  const draft = await retryArticle(id, facts);
  if (!draft) continue;
  const check = validateArticle(draft, allowed, names, counts);
  if (check.ok) candidate = draft;
  else console.warn(`  attempt ${attempt} failed: ${check.violations.map((v) => v.detail).join('; ')}`);
}
if (!candidate) {
  candidate = templateFor(id, facts);
  fromTemplate = true;
}

const article = {
  id,
  slug: slugFor(candidate.headline),
  category: ARTICLE_SPECS[id].title,
  headline: candidate.headline,
  deck: candidate.deck,
  body: candidate.body,
  readTime: readTimeOf(candidate.body),
  fromTemplate: fromTemplate || undefined,
};

const rank = (articleId: string) => ARTICLE_ORDER.indexOf(articleId as ArticleId);
const articles = [...issue.articles.filter((a) => a.id !== id), article].sort(
  (a, b) => rank(a.id) - rank(b.id)
);
// An issue saved before writeIssue kept snapshots has none. Today's stats are
// the best record left of it, so the corrections check at least has a baseline
// from here on.
writeIssue({
  ...issue,
  articles,
  snapshot: issue.snapshot ?? snapshotFrom(facts),
  updatedAt: new Date().toISOString(),
});
console.log(`Week ${week}: ${fromTemplate ? 'template' : 'written'} ${ARTICLE_SPECS[id].title}, "${article.headline}"`);
