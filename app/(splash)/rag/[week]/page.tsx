import type { Metadata } from 'next';
import Link from 'next/link';
import { publishDateFor, publishedWeeks, readIssue } from '@/lib/rag';
import Shell from '../../kit/Shell';
import RagWeekPicker from '../RagWeekPicker';
import Widget, { WidgetHead } from '../../home/Widget';
import Masthead from '../../home/Masthead';
import Squirt from '../../home/Squirt';
import { PillLink } from '../../home/Glass';
import w from '../../home/widgets.module.css';
import r from '../rag.module.css';
import { Art, RetractedTag, StoryRows, dayOf, issueArt, scheduleDay, weekFrom } from '../parts';
import { weekParam } from '../../kit/weekParam';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ week: string }> }): Promise<Metadata> {
  const { week } = await params;
  return { title: { absolute: `The Rag, Week ${weekFrom(week)}, Splash` }, robots: { index: false, follow: false } };
}

/**
 * An issue's front page. The red top nameplate heads one big card that holds
 * the whole front: the week picker, when it went out, and the lead story with
 * its picture flush to the edges. Every other story follows as a row with its
 * own thumbnail. A week that has not gone out yet says when it will.
 */
export default async function RagWeek({ params }: { params: Promise<{ week: string }> }) {
  const { week: raw } = await params;
  const week = weekParam(raw);
  const issue = readIssue(week);
  const published = publishedWeeks();
  const latest = published.length ? published[published.length - 1] : null;

  const articles = issue?.articles ?? [];
  const [lead, ...rest] = articles;
  const art = await issueArt(week, articles);

  return (
    <Shell active="rag">
      <h1 className={r.srOnly}>The Rag, Week {week}</h1>
      <div className={w.grid}>
        <Widget size="l" className={w.hero}>
          <div className={r.mastWrap}>
            <Masthead style="redtop" week={week} publishedAt={issue?.publishedAt ?? null} stories={articles.length} />
          </div>
          <div className={r.picker}>
            <RagWeekPicker week={week} />
          </div>

          {issue ? (
            <>
              {/* The masthead already carries the day it went out; only a
                  later correction earns a line here. */}
              {issue.updatedAt && dayOf(issue.updatedAt) !== dayOf(issue.publishedAt) ? (
                <p className={r.status}>
                  <b>Updated | {dayOf(issue.updatedAt)}</b>
                </p>
              ) : null}

              {lead ? (
                <Link href={`/rag/${week}/${lead.slug}`} className={r.leadLink}>
                  <span className={r.leadArt} aria-hidden>
                    <Art art={art[lead.slug]} />
                  </span>
                  <span className={r.lead}>
                    <span className={r.tags}>
                      <span className={w.tag}>{lead.category}</span>
                      {lead.retracted ? <RetractedTag /> : null}
                    </span>
                    <span className={r.leadHead}>{lead.headline.trim()}</span>
                    {lead.deck ? <span className={r.deck}>{lead.deck.trim()}</span> : null}
                    <span className={r.meta}>
                      <span>{lead.readTime} min read</span>
                    </span>
                  </span>
                </Link>
              ) : (
                <p className={w.empty} style={{ margin: 0, padding: '0 16px 18px' }}>
                  This issue went out with no stories in it.
                </p>
              )}
            </>
          ) : (
            <div className={r.wait} style={{ paddingTop: 14 }}>
              <Squirt mood="sleep" size={52} />
              <div className={r.waitText}>
                <span>
                  <b>Week {week} publishes {scheduleDay(publishDateFor(week))} at 9:00 AM Central.</b>
                  {latest ? ` Latest issue: Week ${latest}.` : ' Nothing has gone out yet.'}
                </span>
                {latest ? (
                  <PillLink href={`/rag/${latest}`} small>
                    Read Week {latest}
                  </PillLink>
                ) : null}
              </div>
            </div>
          )}
        </Widget>

        {issue && rest.length ? (
          <Widget size="m">
            <WidgetHead icon="newspaper" title="Top stories" />
            <StoryRows week={week} articles={rest} art={art} />
          </Widget>
        ) : null}
      </div>
    </Shell>
  );
}
