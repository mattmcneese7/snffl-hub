import type { Issue } from '@/lib/rag';
import type { StoryArt } from '@/lib/story-images';
import { Chip, List, Rail, RagCard, Row, Section, ui } from '../ui';

const CT_DATE = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' });
export const artSrc = (a?: StoryArt) => (a ? (a.kind === 'photo' ? a.src : a.cutout) : null);

/** A Rag issue: the week picker, the issue's lead on the Rag card, then every other story as a row. */
export default function IssueView({ issue, art, weeks }: { issue: Issue; art: Record<string, StoryArt>; weeks: number[] }) {
  const stories = issue.articles.filter((a) => !a.retracted);
  const [lead, ...rest] = stories;
  const href = (slug: string) => `/lab/app/rag/${issue.week}/${slug}`;
  return (
    <>
      <Rail label="Issues">
        {weeks
          .slice()
          .reverse()
          .map((w) => (
            <Chip key={w} href={`/lab/app/rag/${w}`} on={w === issue.week}>
              Week {w}
            </Chip>
          ))}
      </Rail>
      {lead ? (
        <RagCard
          issueHref={`/lab/app/rag/${issue.week}`}
          meta={`Week ${issue.week} · ${CT_DATE.format(new Date(issue.publishedAt))}`}
          lead={{ href: href(lead.slug), category: lead.category, headline: lead.headline }}
          art={artSrc(art[lead.slug])}
          deck={lead.deck}
          readTime={lead.readTime}
          more={[]}
        />
      ) : null}
      {rest.length ? (
        <Section title="All Stories">
          <StoryList week={issue.week} stories={rest} art={art} />
        </Section>
      ) : null}
    </>
  );
}

/** Stories as rows in one tappable list: the art, the category, the headline, the read time. */
export function StoryList({ week, stories, art }: { week: number; stories: Issue['articles']; art: Record<string, StoryArt> }) {
  return (
    <List tap>
      {stories.map((a) => {
        const src = artSrc(art[a.slug]);
        return <Row key={a.slug} href={`/lab/app/rag/${week}/${a.slug}`} lead={src ? <img className={ui.thumb} src={src} alt="" loading="lazy" /> : undefined} label={a.category} title={a.headline} sub={`${a.readTime} min read`} />;
      })}
    </List>
  );
}
