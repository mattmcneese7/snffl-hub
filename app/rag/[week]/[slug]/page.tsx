import Link from 'next/link';
import { notFound } from 'next/navigation';
import Chrome from '@/components/Chrome';
import { BYLINE } from '@/config/style-guide';
import { readIssue } from '@/lib/rag';

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });

export default async function RagArticle({
  params,
}: {
  params: Promise<{ week: string; slug: string }>;
}) {
  const { week: raw, slug } = await params;
  const week = Math.min(17, Math.max(1, Number(raw) || 1));
  const issue = readIssue(week);
  const article = issue?.articles.find((a) => a.slug === slug);
  if (!issue || !article) notFound();

  const more = issue.articles.filter((a) => a.slug !== slug).slice(0, 4);

  return (
    <>
      <Chrome section="The Rag" sub={`Week ${week}`} week={week} />
      <main className="snffl-page">
        <section>
          <Link className="snffl-block-heading-link" href={`/rag/${week}`}>
            &larr; Week {week} issue
          </Link>
        </section>

        <article className="snffl-rag-article">
          <span className="snffl-rag-category">{article.category}</span>
          <h1 className="snffl-headline snffl-rag-article-headline">{article.headline}</h1>
          {article.deck ? <p className="snffl-rag-deck">{article.deck}</p> : null}

          <p className="snffl-rag-byline">
            {BYLINE} &middot; Published {dateLabel(issue.publishedAt)}
            {article.updatedAt ? ` · Updated ${dateLabel(article.updatedAt)}` : ''}
          </p>

          {article.retracted ? <span className="snffl-stamp-retracted">RETRACTED</span> : null}

          <div className="snffl-rag-body">
            {article.body.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          {article.fromTemplate ? (
            <p className="snffl-rag-note">
              This one came straight from the box score rather than the desk.
            </p>
          ) : null}
        </article>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">More From This Week</h2>
          </div>
          <div className="snffl-card">
            {more.map((other) => (
              <Link className="snffl-rag-row" href={`/rag/${week}/${other.slug}`} key={other.slug}>
                <span className="snffl-rag-thumb" aria-hidden />
                <span>
                  <span className="snffl-rag-category">{other.category}</span>
                  <span className="snffl-rag-row-headline">{other.headline}</span>
                  <span className="snffl-rag-meta">{other.readTime} min read</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
