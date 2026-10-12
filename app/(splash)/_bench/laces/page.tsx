import type { Metadata } from 'next';
import Shell from '../../kit/Shell';
import PageHead from '../../kit/PageHead';
import w from '../../home/widgets.module.css';
import { SEAM_FOOT, SEAM_TOP } from '../../marks';
import l from './laces.module.css';

export const metadata: Metadata = { title: { absolute: 'Laces, Splash' }, robots: { index: false, follow: false } };

const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

/**
 * The mark's laces, three ways. The seams sit where they are (the top one's
 * lower edge at y 20.2, the foot one's upper edge at y 53.3 on the 64 grid);
 * only the laces move.
 */
const OPTIONS = [
  { key: 'now', name: 'Now', note: 'Centered on the drop’s round body. The bottom lace runs into the foot seam.', top: 31, bottom: 52 },
  { key: 'even', name: 'Even', note: 'Centered between the two seams, the same gap to each, the way laces sit on a ball.', top: 27, bottom: 46.5 },
  { key: 'low', name: 'Low and clear', note: 'Kept low in the body where the drop is fullest, with a clear gap above the foot seam.', top: 29.5, bottom: 49 },
];

function Mark({ top, bottom, id }: { top: number; bottom: number; id: string }) {
  const span = bottom - top;
  const rows = [top + span * 0.24, top + span * 0.5, top + span * 0.76];
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse">
          <rect width="64" height="64" fill="#fff" />
          <g stroke="#000" strokeLinecap="round" fill="none">
            <path d={`M32 ${top} V ${bottom}`} strokeWidth="3.2" />
            <path d={rows.map((y) => `M27.4 ${y} H 36.6`).join(' ')} strokeWidth="2.8" />
            <path d={SEAM_TOP} strokeWidth="2.6" />
            <path d={SEAM_FOOT} strokeWidth="2.6" />
          </g>
        </mask>
      </defs>
      <path d={DROP} fill="currentColor" mask={`url(#${id})`} />
    </svg>
  );
}

export default function Laces() {
  return (
    <Shell active="more">
      <PageHead title="Laces" />
      <div className={w.grid}>
        {OPTIONS.map((o) => (
          <section key={o.key} className={`${w.widget} ${w.l}`}>
            <div className={l.row}>
              <span className={l.big}>
                <Mark top={o.top} bottom={o.bottom} id={`lace-${o.key}-big`} />
              </span>
              <div className={l.text}>
                <b>{o.name}</b>
                <span>{o.note}</span>
                <span className={l.small}>
                  <Mark top={o.top} bottom={o.bottom} id={`lace-${o.key}-small`} />
                  <span>Splash</span>
                </span>
              </div>
            </div>
          </section>
        ))}
      </div>
    </Shell>
  );
}
