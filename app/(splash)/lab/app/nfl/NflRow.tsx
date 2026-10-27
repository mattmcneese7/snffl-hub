import type { NflGame, NflSide } from '@/lib/gameday';
import { quarter } from '../scores/format';
import { Crest, LiveTag, Pair, type PairSide } from '../ui';

const TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });

function side(t: NflSide, g: NflGame, lost: boolean): PairSide {
  return { lead: <Crest src={t.logo} size={28} />, title: t.name, sub: t.record ?? undefined, value: g.state === 'pre' ? undefined : (t.score ?? 0), lost };
}

/** One game as a row: the clock or kickoff on top, both clubs, who here is starting in it. */
export default function NflRow({ g, week, starters }: { g: NflGame; week: number; starters: number }) {
  const a = g.away.score ?? 0;
  const h = g.home.score ?? 0;
  const post = g.state === 'post';
  const status =
    g.state === 'in' ? (
      <>
        <LiveTag text={quarter(g.period, g.clock)} />
        <span>{g.broadcast ?? ''}</span>
      </>
    ) : post ? undefined : (
      <>
        <span>{TIME.format(new Date(g.kickoff))}</span>
        <span>{g.broadcast ?? ''}</span>
      </>
    );
  return (
    <Pair
      href={`/lab/app/nfl/${g.id}?week=${week}`}
      label={`${g.away.name} at ${g.home.name}`}
      status={status}
      sides={[side(g.away, g, post && a < h), side(g.home, g, post && h < a)]}
      foot={starters ? `${starters} league starter${starters === 1 ? '' : 's'}` : undefined}
    />
  );
}

