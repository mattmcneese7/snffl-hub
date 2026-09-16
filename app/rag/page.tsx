import { redirect } from 'next/navigation';
import Chrome from '@/components/Chrome';
import Masthead from '@/components/Masthead';
import { publishedWeeks } from '@/lib/rag';

export default function RagIndex() {
  const weeks = publishedWeeks();
  if (weeks.length) redirect(`/rag/${weeks[weeks.length - 1]}`);

  return (
    <>
      <Chrome section="The Rag" />
      <main className="snffl-page">
        <section>
          <Masthead />
          <p className="snffl-masthead-note">New stories every Tuesday at 9:00 AM Central</p>
        </section>
        <section>
          <div className="snffl-placeholder">
            <span className="snffl-placeholder-label">Nothing published yet</span>
            <span className="snffl-placeholder-note">
              The first issue lands the Tuesday after Week 1 is final.
            </span>
          </div>
        </section>
      </main>
    </>
  );
}
