import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { publishedWeeks, readIssue } from '@/lib/rag';
import { issueArt } from '../art';
import { weekParam } from '../../../../kit/weekParam';
import { getV4Data } from '../../data';
import Shell, { SectionHead } from '../../Shell';
import IssueView from '../Issue';

export const metadata: Metadata = { title: { absolute: 'The Rag, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** One week's issue. */
export default async function V4RagWeek({ params }: { params: Promise<{ week: string }> }) {
  const week = weekParam((await params).week);
  const issue = readIssue(week);
  if (!issue) notFound();
  const jar = await cookies();
  const data = await getV4Data(parseTeam(jar.get(TEAM_COOKIE)?.value));
  const art = await issueArt(week, issue.articles).catch(() => ({}));
  return (
    <Shell data={data} active="rag">
      <SectionHead icon="rag" word="the rag" title={`Week ${week}`} week={data.week} mine={data.myRoster} back={{ href: '/rag', label: 'The Rag' }} />
      <IssueView issue={issue} art={art} weeks={publishedWeeks()} />
    </Shell>
  );
}
