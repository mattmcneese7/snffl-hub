import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { publishedWeeks, readIssue } from '@/lib/rag';
import { issueArt } from '../../../rag/parts';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import IssueView from './Issue';
import s from '../v4.module.css';

export const metadata: Metadata = { title: { absolute: 'The Rag, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** The Rag tab: the latest issue. */
export default async function V4Rag() {
  const jar = await cookies();
  const data = await getV4Data(parseTeam(jar.get(TEAM_COOKIE)?.value));
  const weeks = publishedWeeks();
  const week = weeks.at(-1);
  const issue = week ? readIssue(week) : null;
  const art = issue ? await issueArt(issue.week, issue.articles).catch(() => ({})) : {};
  return (
    <Shell data={data} active="rag">
      <SectionHead icon="rag" word="the rag" week={data.week} mine={data.myRoster} />
      {issue ? <IssueView issue={issue} art={art} weeks={weeks} /> : <p className={s.empty}>No issue published yet.</p>}
    </Shell>
  );
}
