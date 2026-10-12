import type { Metadata } from 'next';
import Shell from '../../kit/Shell';
import PageHead from '../../kit/PageHead';
import w from '../../home/widgets.module.css';
import { dropData } from './data';
import { DropMoment, DropSeven, DropSquirt } from './Treatments';
import d from './drop.module.css';

export const metadata: Metadata = { title: { absolute: 'The Drop, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** The Drop, three treatments on this week's real numbers. */
export default async function DropBench() {
  const data = await dropData();
  return (
    <Shell active="home">
      <PageHead title="The Drop" />
      <div className={w.grid}>
        {data ? (
          <>
            <div className={d.caption}>
              <b>1. Seven drops</b>
              <span>Every game is a drop, filled to the leader&rsquo;s chance to win. Live ones ripple.</span>
            </div>
            <DropSeven data={data} />
            <div className={d.caption}>
              <b>2. The moment</b>
              <span>The newest clip of a league starter, framed in the drop, with what it&rsquo;s worth.</span>
            </div>
            <DropMoment data={data} />
            <div className={d.caption}>
              <b>3. Squirt hosts</b>
              <span>Squirt reacts to your game and marks up the numbers in his own hand.</span>
            </div>
            <DropSquirt data={data} />
          </>
        ) : (
          <p className={w.empty}>No games this week yet.</p>
        )}
      </div>
    </Shell>
  );
}
