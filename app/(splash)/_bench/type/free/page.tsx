import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { toFeature } from '@/lib/feature';
import { getWeekGames, matchupOfTheWeek, scoredWeek } from '@/lib/league';
import { getMatchupContext, markInPlay, winProbabilities } from '@/lib/matchup-live';
import bench from '../../../testing.module.css';
import { exo, jost, sora } from '../faces/fonts';
import styles from '../faces/faces.module.css';

/**
 * Faces outside Google Fonts. Fontshare (Indian Type Foundry) families, free
 * for commercial use and allowed to be self hosted under the ITF Free Font
 * License. On this bench they load from Fontshare's own CSS service, so nothing
 * is downloaded into the repo until a face is picked; the pick then gets self
 * hosted. The three Google faces called closest so far sit at the end for
 * reference.
 *
 * Every card also shows emphasis: a distinct bold, and bold caps, reserved for
 * heavy emphasis only.
 */
export const metadata: Metadata = {
  title: { absolute: 'Faces beyond Google' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const FONTSHARE =
  'https://api.fontshare.com/v2/css?' +
  [
    'supreme@200,400,700,800',
    'technor@200,400,700,900',
    'general-sans@200,400,700',
    'satoshi@300,400,700,900',
    'switzer@200,400,700,800',
    'cabinet-grotesk@200,400,700,800',
    'clash-grotesk@200,400,700',
    'chillax@200,400,700',
    'synonym@200,400,700',
  ]
    .map((f) => `f[]=${f}`)
    .join('&') +
  '&display=swap';

type Face = { name: string; source: string; note: string; family: string; thin: number };

const FACES: Face[] = [
  { name: 'Supreme', source: 'Fontshare', note: 'technical geometric, hairline to heavy', family: "'Supreme'", thin: 200 },
  { name: 'Technor', source: 'Fontshare', note: 'constructed, monolinear', family: "'Technor'", thin: 200 },
  { name: 'General Sans', source: 'Fontshare', note: 'rationalist, orderly', family: "'General Sans'", thin: 200 },
  { name: 'Satoshi', source: 'Fontshare', note: 'modernist geometric grotesk', family: "'Satoshi'", thin: 300 },
  { name: 'Switzer', source: 'Fontshare', note: 'neo grotesk, 100 to 900', family: "'Switzer'", thin: 200 },
  { name: 'Cabinet Grotesk', source: 'Fontshare', note: 'grotesk with quirks, strong caps', family: "'Cabinet Grotesk'", thin: 200 },
  { name: 'Clash Grotesk', source: 'Fontshare', note: 'tight, contemporary grotesk', family: "'Clash Grotesk'", thin: 200 },
  { name: 'Chillax', source: 'Fontshare', note: 'soft geometric, open', family: "'Chillax'", thin: 200 },
  { name: 'Synonym', source: 'Fontshare', note: 'humanist, calm', family: "'Synonym'", thin: 200 },
  { name: 'Jost', source: 'Google, closest so far', note: 'reference', family: 'var(--f-jost)', thin: 200 },
  { name: 'Sora', source: 'Google, closest so far', note: 'reference', family: 'var(--f-sora)', thin: 200 },
  { name: 'Exo 2', source: 'Google, closest so far', note: 'reference', family: 'var(--f-exo)', thin: 200 },
];

export default async function FreeFacesPage() {
  const week = await scoredWeek();
  const [rawGames, ctx] = await Promise.all([getWeekGames(week), getMatchupContext(week)]);
  const games = markInPlay(rawGames, ctx.nfl);
  const game = matchupOfTheWeek(games);
  const f = game ? toFeature(game, 'Closest game', winProbabilities(games, ctx).get(game.matchupId)) : null;
  const leader = f ? (f.away.points >= f.home.points ? f.away : f.home) : null;
  const margin = f ? Math.abs(f.away.points - f.home.points) : 0;
  const state = f ? (f.status === 'final' ? 'Final' : f.status === 'live' ? 'Live' : 'Upcoming') : '';

  return (
    <div className={`${bench.stage} ${bench.glow} ${jost.variable} ${sora.variable} ${exo.variable}`}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={FONTSHARE} precedence="default" />
      <div className={bench.orbs} aria-hidden>
        <span className={bench.orbWhite} />
        <span className={bench.orbGold} />
        <span className={bench.orbPeach} />
        <span className={bench.orbRose} />
        <span className={bench.orbBlue} />
      </div>

      <main className={styles.page}>
        <header className={styles.head}>
          <h1 className={styles.title}>Beyond Google</h1>
          <span className={styles.sub}>Week {week}, closest game, in each face</span>
        </header>

        {f && leader
          ? FACES.map((face, i) => (
              <section
                key={face.name}
                className={`${styles.card} ${bench.glassC}`}
                style={
                  {
                    '--face': face.family,
                    '--w-team': 400,
                    '--w-score': face.thin,
                    '--stretch': '100%',
                    '--stretch-score': '100%',
                    '--axes': 'normal',
                  } as CSSProperties
                }
              >
                <div className={styles.top}>
                  <span className={styles.name}>
                    {i + 1}. {face.name}
                  </span>
                  <span className={styles.note}>
                    {face.source}, {face.note}
                  </span>
                </div>
                <div className={styles.sides}>
                  {[f.away, f.home].map((side, s, both) => (
                    <div key={side.rosterId} className={`${styles.side} ${s === 1 ? styles.right : ''}`}>
                      <span className={styles.team}>{side.teamName}</span>
                      <span className={`${styles.score} ${side.points >= both[1 - s].points ? styles.lead : ''}`}>
                        {side.points.toFixed(2)}
                      </span>
                      <span className={styles.meta}>
                        {side.manager} · {side.record}
                        {side.projected != null ? ` · proj ${side.projected.toFixed(1)}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={styles.emphasis}>
                  <span className={styles.bold}>
                    {leader.teamName} up {margin.toFixed(2)}
                  </span>
                  <span className={styles.caps}>{state}</span>
                </div>
              </section>
            ))
          : null}
      </main>
    </div>
  );
}
