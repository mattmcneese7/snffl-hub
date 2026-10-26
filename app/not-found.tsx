import type { Metadata } from 'next';
import Shell from './(splash)/kit/Shell';
import PageHead from './(splash)/kit/PageHead';
import { PillLink } from './(splash)/home/Glass';
import w from './(splash)/home/widgets.module.css';

export const metadata: Metadata = { title: { absolute: 'Page not found, Splash' }, robots: { index: false, follow: false } };

/** Any address that isn't a page: said plainly, in the app, with the way home. */
export default function NotFound() {
  return (
    <Shell active="home">
      <PageHead title="Page not found" />
      <div className={w.grid}>
        <section className={`${w.widget} ${w.l}`}>
          <p className={w.empty}>That link doesn&rsquo;t go anywhere</p>
          <div>
            <PillLink href="/" small>
              Back to Home
            </PillLink>
          </div>
        </section>
      </div>
    </Shell>
  );
}
