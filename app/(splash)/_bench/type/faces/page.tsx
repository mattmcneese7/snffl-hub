import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { toFeature } from '@/lib/feature';
import { getWeekGames, matchupOfTheWeek, scoredWeek } from '@/lib/league';
import { getMatchupContext, markInPlay, winProbabilities } from '@/lib/matchup-live';
import bench from '../../../testing.module.css';
import { allFaces } from './fonts';
import styles from './faces.module.css';

/**
 * The faces wall. Round 3's faces read as basic; the ask is sleeker, thinner,
 * less generic, tighter. Instead of betting on three more, this sets twelve
 * candidates side by side in the same real snippet, this week's closest game,
 * so the character is easy to compare. The picks become full house cuts.
 *
 * Glass here is the plain CSS stand in, since twelve sheets is past what the
 * canvas draws; the ground is the settled glow.
 */
export const metadata: Metadata = {
  title: { absolute: 'Faces wall' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

type Face = {
  name: string;
  note: string;
  font: string;
  team: number;
  score: number;
  stretch?: string;
  scoreStretch?: string;
  axes?: string;
};

const FACES: Face[] = [
  { name: 'Geologica', note: 'sharpness axis, corners cut crisp', font: '--f-geologica', team: 400, score: 200, axes: "'SHRP' 60" },
  { name: 'Saira', note: 'width axis 50 to 125, narrow figures', font: '--f-saira', team: 400, score: 200, stretch: '87.5%', scoreStretch: '75%' },
  { name: 'Science Gothic', note: 'contrast and width axes, drafted', font: '--f-science', team: 400, score: 200, stretch: '72%', scoreStretch: '62%', axes: "'CTRS' 40" },
  { name: 'Anybody', note: 'width axis 50 to 150, lean and long', font: '--f-anybody', team: 400, score: 200, stretch: '85%', scoreStretch: '70%' },
  { name: 'Zalando Sans', note: 'fashion grotesk, width axis', font: '--f-zalando', team: 400, score: 200, stretch: '85%', scoreStretch: '78%' },
  { name: 'Afacad Flux', note: 'slim humanist, weight 100 to 1000', font: '--f-afacad', team: 400, score: 200 },
  { name: 'Stack Sans', note: 'new, tall and quiet', font: '--f-stack', team: 400, score: 200 },
  { name: 'SUSE', note: 'crisp, slightly technical', font: '--f-suse', team: 400, score: 200 },
  { name: 'Jost', note: 'geometric, Futura lineage', font: '--f-jost', team: 400, score: 200 },
  { name: 'Sora', note: 'geometric, built for screens', font: '--f-sora', team: 400, score: 200 },
  { name: 'Exo 2', note: 'technical, a little sporty', font: '--f-exo', team: 400, score: 200 },
  { name: 'Ysabeau Office', note: 'humanist, hairline weights', font: '--f-ysabeau', team: 400, score: 250 },
];

export default async function FacesPage() {
  const week = await scoredWeek();
  const [rawGames, ctx] = await Promise.all([getWeekGames(week), getMatchupContext(week)]);
  const games = markInPlay(rawGames, ctx.nfl);
  const game = matchupOfTheWeek(games);
  const f = game ? toFeature(game, 'Closest game', winProbabilities(games, ctx).get(game.matchupId)) : null;

  return (
    <div className={`${bench.stage} ${bench.glow} ${allFaces}`}>
      <div className={bench.orbs} aria-hidden>
        <span className={bench.orbWhite} />
        <span className={bench.orbGold} />
        <span className={bench.orbPeach} />
        <span className={bench.orbRose} />
        <span className={bench.orbBlue} />
      </div>

      <main className={styles.page}>
        <header className={styles.head}>
          <h1 className={styles.title}>Faces</h1>
          <span className={styles.sub}>Week {week}, closest game, in each face</span>
        </header>

        {f
          ? FACES.map((face, i) => (
              <section
                key={face.name}
                className={`${styles.card} ${bench.glassC}`}
                style={
                  {
                    '--face': `var(${face.font})`,
                    '--w-team': face.team,
                    '--w-score': face.score,
                    '--stretch': face.stretch ?? '100%',
                    '--stretch-score': face.scoreStretch ?? face.stretch ?? '100%',
                    '--axes': face.axes ?? 'normal',
                  } as CSSProperties
                }
              >
                <div className={styles.top}>
                  <span className={styles.name}>
                    {i + 1}. {face.name}
                  </span>
                  <span className={styles.note}>{face.note}</span>
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
                        {side.winProb != null ? ` · ${Math.round(side.winProb * 100)}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))
          : null}
      </main>
    </div>
  );
}
