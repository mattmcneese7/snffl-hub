import type { Metadata } from 'next';
import { latestPerChannel } from '../../lib/embed-clips';
import Check from './Check';
import c from './check.module.css';

/**
 * Which channels' clips actually play inside Splash.
 *
 * The API cannot answer this: the NFL's own clips report embeddable and
 * still refuse to play off YouTube. So this mounts each candidate channel's
 * latest 3 wide clips and latest 3 Shorts with the IFrame Player API, muted,
 * and records what each one does into window.videoCheck. Add ?control=1 to
 * include the NFL's channel, which should fail, to prove the check can tell.
 */
export const metadata: Metadata = {
  title: { absolute: 'Video check' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default async function VideoCheckPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const control = params.control === '1';
  const { clips, calls } = await latestPerChannel(control);

  return (
    <main className={c.page}>
      <h1 className={c.title}>Video check</h1>
      <p className={c.sub}>
        {clips.length} clips from {new Set(clips.map((x) => x.channel)).size} channels | {calls} API units | {control ? 'NFL control included' : 'Add ?control=1 for the NFL control'}
      </p>
      <Check clips={clips} />
    </main>
  );
}
