import Link from 'next/link';
import type { Article } from '@/lib/rag';

/**
 * The Rag as a hero slider, the way a sports site leads with its stories.
 *
 * Scroll snap rather than a JavaScript carousel: native momentum scrolling on
 * iOS, correct touch behaviour for free, and nothing added to the phone bundle.
 */
export default function RagHero({
  week,
  articles,
}: {
  week: number | null;
  articles: Article[];
}) {
  if (!week || !articles.length) {
    return (
      <div className="snffl-card snffl-rag-hero-empty">
        <span className="snffl-rag-category">The SquirtRag</span>
        <p className="snffl-rag-hero-empty-line">
          New stories every Tuesday at 9:00 AM Central. The first issue lands once Week 1 closes.
        </p>
        <Link className="snffl-block-heading-link" href="/rag">
          Visit the section
        </Link>
      </div>
    );
  }

  return (
    <div className="snffl-rag-hero" role="list">
      {articles.map((article, index) => (
        <Link
          role="listitem"
          className={`snffl-rag-hero-card${index === 0 ? ' snffl-rag-hero-lead' : ''}`}
          href={`/rag/${week}/${article.slug}`}
          key={article.slug}
        >
          <span className="snffl-rag-hero-art" aria-hidden />
          <span className="snffl-rag-hero-body">
            <span className="snffl-rag-category">{article.category}</span>
            <span className="snffl-rag-hero-headline">{article.headline}</span>
            {article.deck ? <span className="snffl-rag-hero-deck">{article.deck}</span> : null}
            <span className="snffl-rag-meta">
              {article.readTime} min read
              {article.retracted ? ' · Retracted' : ''}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
