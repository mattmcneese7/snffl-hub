import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getV4Data } from '../../data';
import Shell, { SectionHead } from '../../Shell';
import ChugCounts from '../ChugCounts';
import FeedDigest from '../FeedDigest';
import FilmTile from '../FilmTile';
import Hardware from '../Hardware';
import LatestTrade from '../LatestTrade';
import NflScores from '../NflScores';
import ShartCitation from '../ShartCitation';
import SquirtSays from '../SquirtSays';
import TopScorers from '../TopScorers';

export const metadata: Metadata = { title: { absolute: 'Modules, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** Every Home module on one page, for checking them before they go on Home. Not linked from anywhere. */
export default async function ModulesPreview({ searchParams }: { searchParams: Promise<{ only?: string }> }) {
  const only = (await searchParams).only;
  const on = (k: string) => !only || only === k;
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const data = await getV4Data(mine);
  return (
    <Shell data={data} active="home">
      <SectionHead icon="home" word="modules" week={data.week} mine={data.myRoster} />
      {on('FilmTile') ? <FilmTile week={data.week} /> : null}
      {on('Hardware') ? <Hardware /> : null}
      {on('ShartCitation') ? <ShartCitation /> : null}
      {on('SquirtSays') ? <SquirtSays week={data.week} mine={mine} /> : null}
      {on('TopScorers') ? <TopScorers week={data.week} mine={mine} /> : null}
      {on('NflScores') ? <NflScores week={data.week} /> : null}
      {on('FeedDigest') ? <FeedDigest mine={mine} week={data.week} games={data.games} /> : null}
      {on('ChugCounts') ? <ChugCounts mine={mine} /> : null}
      {on('LatestTrade') ? <LatestTrade mine={mine} /> : null}
    </Shell>
  );
}
