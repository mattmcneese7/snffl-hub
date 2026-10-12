import type { Metadata } from 'next';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { Broadcast, DropHalfBottom, Heartbeat, Lightning, Siren, Waves } from '@phosphor-icons/react/dist/ssr';
import Shell from '../../kit/Shell';
import PageHead from '../../kit/PageHead';
import w from '../../home/widgets.module.css';
import ic from '../../home/icons.module.css';
import d from '../../home/thedrop.module.css';
import b from './drop-icon.module.css';

export const metadata: Metadata = { title: { absolute: 'The Drop icon, Splash' }, robots: { index: false, follow: false } };

/** Six icons for The Drop, all from our Phosphor set so they match every other widget. */
const OPTIONS: { name: string; note: string; Icon: PhIcon }[] = [
  { name: 'Half drop', note: 'A drop filling up, like the week getting played. The closest to the brand without being the logo.', Icon: DropHalfBottom },
  { name: 'Broadcast', note: 'A signal going out. Reads as live, on air, right now.', Icon: Broadcast },
  { name: 'Heartbeat', note: 'The league’s pulse. A check-in on how everyone is doing.', Icon: Heartbeat },
  { name: 'Siren', note: 'Game day alarm. Loud and urgent; already in the wallpaper.', Icon: Siren },
  { name: 'Waves', note: 'Water in motion. Ties to Splash, but reads calm rather than live.', Icon: Waves },
  { name: 'Lightning', note: 'A jolt. Energy and big plays, less about checking in.', Icon: Lightning },
];

/** The Drop's head, closed, with each candidate in the mark's place. */
export default function DropIconBench() {
  return (
    <Shell active="home">
      <PageHead title="The Drop icon" />
      <div className={w.grid}>
        {OPTIONS.map(({ name, note, Icon }, i) => (
          <div key={name} className={b.option}>
            <div className={b.caption}>
              <b>
                {i + 1}. {name}
              </b>
              <span>{note}</span>
            </div>
            <div className={d.drop}>
              <div className={`${d.head} ${b.head}`}>
                <Icon weight="duotone" className={`${ic.icon} ${b.icon}`} aria-hidden />
                <span className={d.title}>
                  <span className={d.name}>The Drop</span>
                  <span className={d.sub}>Your Sunday check-in</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
