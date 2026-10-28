import type { LiveMatchup } from '@/lib/matchup-live';
import { playerOf } from '@/lib/league';
import { Card, Empty, Face, List, Row, Section, ui } from '../ui';
import l from '../modules/layout.module.css';
import { WinChart, type WinBeat } from '../ui/blocks/WinChart';
import { matchupTimeline, type Moment, type MomentKind } from './engine';

const KIND: Record<MomentKind, string> = { decider: 'Decider', lead: 'Lead change', swing: 'Big swing', late: 'Late' };
const ORDER: MomentKind[] = ['decider', 'lead', 'swing', 'late'];
const dayOf = (ms: number) => new Date(ms).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short' });
const pct = (w: number) => `${Math.round(w * 100)}%`;
const short = (id: string) => {
  const p = playerOf(id);
  return p.position === 'DEF' ? (p.team ?? p.name) : p.short || p.name;
};

/**
 * The Moments view of a matchup: the win chance across the week, the plays
 * that changed the game (who, what, where, when, and what it did to the
 * score and the chance), and the starters who blew past their projection.
 * `a` is the side the page leads with.
 */
export default async function MatchupMoments({ live, a, b, final }: { live: LiveMatchup; a: { rosterId: number; team: string }; b: { rosterId: number; team: string }; final: boolean }) {
  const t = await matchupTimeline(live, a.rosterId);
  if (!t.beats.length) {
    return (
      <Section title="Moments">
        <Empty>Moments start with the first kickoff.</Empty>
      </Section>
    );
  }
  const momentAt = new Set(t.moments.map((m) => m.at));
  const beats: WinBeat[] = t.beats.map((x) => ({
    winA: x.winA,
    when: x.when,
    clock: x.clock,
    what: x.what,
    where: x.where,
    scoreA: x.scoreA,
    scoreB: x.scoreB,
    day: dayOf(x.at),
    moment: momentAt.has(x.at),
  }));

  const line = (m: Moment) => {
    const gainer = m.gain.a >= m.gain.b ? a.team : b.team;
    const gained = Math.max(m.gain.a, m.gain.b);
    const score = `${m.scoreA.toFixed(2)} to ${m.scoreB.toFixed(2)}`;
    const lead = m.kinds.includes('lead') ? `${m.scoreA > m.scoreB ? a.team : b.team} takes the lead, ${score}` : `${gainer} +${gained.toFixed(2)}, ${score}`;
    return `${m.where} · ${lead}`;
  };

  return (
    <>
      <Section title="Win Chance">
        <Card>
          <WinChart
            start={t.start.winA}
            beats={beats}
            team={a.team}
            summary={`${final ? 'Final' : 'Now'} · ${t.leadChanges === 0 ? 'no lead changes' : t.leadChanges === 1 ? '1 lead change' : `${t.leadChanges} lead changes`} · from ${pct(t.start.winA)} at kickoff`}
          />
        </Card>
        <p className={`${ui.sub} ${l.note}`}>Drag across the chart for any play. Sleeper&rsquo;s win formula after each of {t.beats.length} scoring plays.</p>
      </Section>

      {t.moments.length ? (
        <Section title="Moments">
          <List tap>
            {[...t.moments].reverse().map((m) => (
              <Row
                key={m.at}
                data={m.playerIds[0] ? { player: m.playerIds[0] } : undefined}
                label={`${ORDER.filter((k) => m.kinds.includes(k)).map((k) => KIND[k]).join(' · ')} · ${m.when} · ${m.clock}`}
                title={m.what}
                sub={line(m)}
                value={pct(m.winA)}
                valueSub={`from ${pct(m.winA - m.swing)}`}
              />
            ))}
          </List>
        </Section>
      ) : null}

      {t.outdid.length ? (
        <Section title="Beat the Projection">
          <List tap>
            {t.outdid.slice(0, 4).map((o) => {
              const p = playerOf(o.playerId);
              return (
                <Row
                  key={o.playerId}
                  data={{ player: o.playerId }}
                  lead={<Face id={o.playerId} team={p.team} size={40} defense={p.position === 'DEF'} />}
                  title={short(o.playerId)}
                  sub={`${p.position} · ${o.side === 'a' ? a.team : b.team} · Proj ${o.projected.toFixed(2)}`}
                  value={o.points.toFixed(2)}
                  valueSub={`+${(o.points - o.projected).toFixed(2)}`}
                />
              );
            })}
          </List>
        </Section>
      ) : null}
    </>
  );
}
