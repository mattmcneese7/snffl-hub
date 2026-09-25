import Link from 'next/link';
import Chrome from '@/components/Chrome';
import WeekSelector from '@/components/WeekSelector';
import { getHighlights } from '@/lib/highlights';
import { teams } from '@/lib/league';
import StoryArtView from '@/components/StoryArtView';
import { photosForWeek } from '@/lib/game-photos';
import { artForArticles, featuredPlayers } from '@/lib/story-images';
import { publishDateFor, publishedWeeks, readIssue } from '@/lib/rag';

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });

/** Every published issue is prerendered. An unpublished week still renders. */
export function generateStaticParams() {
  return publishedWeeks().map((week) => ({ week: String(week) }));
}

export default async function RagWeek({ params }: { params: Promise<{ week: string }> }) {
  const { week: raw } = await params;
  const week = Math.min(17, Math.max(1, Number(raw) || 1));
  const issue = readIssue(week);
  const published = publishedWeeks();

  const lead = issue?.articles[0];
  const rest = issue?.articles.slice(1) ?? [];

  // Lead art per Brief Section 2: a real photograph of the week where one
  // exists of the story's manager, else a highlight still, else his top scorer
  // drawn from the week's data.
  const [clips, featured] = await Promise.all([getHighlights(week, 200), featuredPlayers(week)]);
  const stills = artForArticles(
    issue?.articles ?? [],
    clips,
    Object.fromEntries(teams.map((team) => [String(team.rosterId), team.manager])),
    featured,
    photosForWeek(week)
  );

  return (
    <>
      <Chrome section="The Rag" sub={`Week ${week}`} week={week} />
      <main className="snffl-page">
        <section>
          {/* The name, set in the app's own editorial voice. The drawn
              masthead was a second logo competing with the app's mark, and a
              section does not need a wordmark to be a section. */}
          <h1 className="snffl-rag-title snffl-headline-editorial">The Rag</h1>
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
                  {stills[lead.slug] ? (
                    <span className="snffl-rag-lead-art" aria-hidden>
                      <StoryArtView art={stills[lead.slug]} size="lg" />
                    </span>
                  ) : null}
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
                    <span className="snffl-rag-thumb" aria-hidden>
                      <StoryArtView art={stills[article.slug]} size="sm" />
                    </span>
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
