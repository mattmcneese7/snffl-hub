import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { publishedWeeks } from '@/lib/rag';
import Shell from '../kit/Shell';
import PageHead from '../kit/PageHead';
import Widget from '../home/Widget';
import Squirt from '../home/Squirt';
import w from '../home/widgets.module.css';
import r from './rag.module.css';

export const metadata: Metadata = { title: { absolute: 'The Rag, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * The Rag's front door: straight to the latest issue. Before the first issue
 * goes out there is nothing to send anyone to, so it says when there will be.
 */
export default function RagIndex() {
  const weeks = publishedWeeks();
  if (weeks.length) redirect(`/rag/${weeks[weeks.length - 1]}`);

  return (
    <Shell active="rag">
      <PageHead title="The Rag" sub="New stories every Tuesday at 9:00 AM Central" />
      <div className={w.grid}>
        <Widget size="m" icon="newspaper" title="Nothing published yet">
          <div className={r.wait} style={{ padding: 0 }}>
            <Squirt mood="sleep" size={52} />
            <p className={w.empty} style={{ margin: 0 }}>
              The first issue lands the Tuesday after Week 1 is final.
            </p>
          </div>
        </Widget>
      </div>
    </Shell>
  );
}
