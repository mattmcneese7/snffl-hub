import Link from 'next/link';
import Chrome from '@/components/Chrome';
import WeekSelector from '@/components/WeekSelector';
import { publishDateFor, publishedWeeks, readIssue } from '@/lib/rag';

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });

export default async function RagWeek({ params }: { params: Promise<{ week: string }> }) {
  const { week: raw } = await params;
  const week = Math.min(17, Math.max(1, Number(raw) || 1));
  const issue = readIssue(week);
  const published = publishedWeeks();

  const lead = issue?.articles[0];
  const rest = issue?.articles.slice(1) ?? [];

  return (
    <>
      <Chrome section="The Rag" sub={`Week ${week}`} week={week} />
      <main className="snffl-page">
        <section>
          <div className="snffl-masthead">
            <span className="snffl-masthead-the">THE</span>
            <span className="snffl-masthead-name">SQUIRTRAG</span>
          </div>
          <p className="snffl-masthead-note">New stories every Tuesday at 9:00 AM Central</p>
        </section>

        <section>
          <WeekSelector active={week} hrefFor={(w) => `/rag/${w}`} />
        </section>

        {issue ? (
          <>
            <section>
              <p className="snffl-rag-status">
                Published {dateLabel(issue.publishedAt)}
                {issue.updatedAt ? ` · Updated ${dateLabel(issue.updatedAt)}` : ''}
              </p>
            </section>

            {lead ? (
              <section>
                <Link className="snffl-card snffl-rag-lead" href={`/rag/${week}/${lead.slug}`}>
                  <span className="snffl-rag-category">{lead.category}</span>
                  <h2 className="snffl-headline snffl-rag-lead-headline">{lead.headline}</h2>
                  <p className="snffl-rag-deck">{lead.deck}</p>
                  <span className="snffl-rag-meta">
                    {lead.readTime} min read
                    {lead.fromTemplate ? ' · Written from the box score' : ''}
                  </span>
                </Link>
              </section>
            ) : null}

            <section>
              <div className="snffl-block-heading">
                <h2 className="snffl-headline">Top Stories</h2>
                <span className="snffl-block-heading-link">{rest.length} more</span>
              </div>
              <div className="snffl-card">
                {rest.map((article) => (
                  <Link
                    className="snffl-rag-row"
                    href={`/rag/${week}/${article.slug}`}
                    key={article.slug}
                  >
                    <span className="snffl-rag-thumb" aria-hidden />
                    <span>
                      <span className="snffl-rag-category">{article.category}</span>
                      <span className="snffl-rag-row-headline">{article.headline}</span>
                      <span className="snffl-rag-meta">{article.readTime} min read</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section>
            <div className="snffl-placeholder">
              <span className="snffl-placeholder-label">Not published yet</span>
              <span className="snffl-placeholder-note">
                Week {week} publishes {publishDateFor(week).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'America/Chicago',
                })} at 9:00 AM Central.
                {published.length ? ` Latest issue: Week ${published[published.length - 1]}.` : ''}
              </span>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
