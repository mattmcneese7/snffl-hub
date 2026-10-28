import { getNflScoreboard } from '@/lib/espn';
import type { NflGame } from '@/lib/types';
import { gameStatus } from '../../../kit/gameStatus';
import { Crest, LiveTag, Rail, Section, Tile, TileRow } from '../ui';

const ORDER = { in: 0, pre: 1, post: 2 } as const;

/** NFL Scores: up to six games, live first, then the next kickoffs, then finals. */
export default async function NflScores({ games, week }: { games?: NflGame[]; week?: number }) {
  const list = games ?? (await getNflScoreboard().catch(() => [] as NflGame[]));
  const shown = [...list].sort((a, b) => ORDER[a.state] - ORDER[b.state]).slice(0, 6);
  if (!shown.length) return null;
  return (
    <Section title="NFL Scores" action={{ href: week ? `/nfl?week=${week}` : '/nfl', label: 'All games' }}>
      <Rail label="NFL scores">
        {shown.map((g) => {
          const scored = g.state !== 'pre';
          const a = g.away.score ?? 0;
          const h = g.home.score ?? 0;
          return (
            <Tile key={g.id} href={`/nfl/${g.id}`} label={`${g.away.abbr} at ${g.home.abbr}`} head={g.state === 'in' ? <LiveTag text={gameStatus(g.status)} /> : gameStatus(g.status)}>
              <TileRow crest={<Crest src={g.away.logo} size={24} />} name={g.away.abbr} value={scored ? a : undefined} lost={g.state === 'post' && a < h} />
              <TileRow crest={<Crest src={g.home.logo} size={24} />} name={g.home.abbr} value={scored ? h : undefined} lost={g.state === 'post' && h < a} />
            </Tile>
          );
        })}
      </Rail>
    </Section>
  );
}
