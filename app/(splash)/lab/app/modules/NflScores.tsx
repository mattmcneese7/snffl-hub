import Link from 'next/link';
import { getNflScoreboard } from '@/lib/espn';
import type { NflGame } from '@/lib/types';
import { gameStatus } from '../../../kit/gameStatus';
import s from '../v4.module.css';
import m from './modules.module.css';

const ORDER = { in: 0, pre: 1, post: 2 } as const;

/** NFL Scores: up to six games, live first, then the next kickoffs, then finals. */
export default async function NflScores({ games, week }: { games?: NflGame[]; week?: number }) {
  const list = games ?? (await getNflScoreboard().catch(() => [] as NflGame[]));
  const shown = [...list].sort((a, b) => ORDER[a.state] - ORDER[b.state]).slice(0, 6);
  if (!shown.length) return null;
  return (
    <section aria-label="NFL scores">
      <div className={s.title}>
        <h2>NFL Scores</h2>
        <Link href="/lab/app/matchup">{week ? `Week ${week}` : 'Scores'}</Link>
      </div>
      <div className={m.nfl} style={{ marginTop: 8 }}>
        {shown.map((g) => {
          const scored = g.state !== 'pre';
          const a = g.away.score ?? 0;
          const h = g.home.score ?? 0;
          return (
            <Link key={g.id} href={`/lab/app/nfl/${g.id}`} className={m.nflGame}>
              {[
                { t: g.away, lost: g.state === 'post' && a < h },
                { t: g.home, lost: g.state === 'post' && h < a },
              ].map(({ t, lost }) => (
                <span key={t.abbr} className={`${m.nflSide} ${lost ? m.nflLost : ''}`}>
                  {t.logo ? <img src={t.logo} alt="" loading="lazy" /> : <span />}
                  <span>{t.abbr}</span>
                  <b>{scored ? t.score : ''}</b>
                </span>
              ))}
              <span className={`${m.nflState} ${g.state === 'in' ? m.nflLive : ''}`}>{gameStatus(g.status)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
