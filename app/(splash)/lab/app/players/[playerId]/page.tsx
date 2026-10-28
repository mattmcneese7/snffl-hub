import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { dsRos } from '@/lib/draftsharks';
import { ESPN_CUTOUT } from '@/lib/espn';
import { league, playerOf, teamByRoster } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { filed } from '@/lib/news';
import { getPlayerSeason } from '@/lib/players';
import CopyMove from '../../swami/CopyMove';
import { statBlocksFor, statsFor } from '@/lib/stats';
import { NFL_TEAMS, nflTeamName } from '../../../../kit/nflTeams';
import { recentUsage, type UsageRow } from '../../../../lib/deep/nflverse';
import { embedClipsForPlayers, type EmbedClip } from '../../../../lib/embed-clips';
import { bookFrom } from '../../../../lib/odds-books';
import { boxLine } from '../../boxLine';
import { getV4Data } from '../../data';
import { getPlayerData, getPlayerWeek } from '../../playerData';
import Shell, { SectionHead } from '../../Shell';
import { Art, Avatar, Card, Crest, Empty, Face, List, Row, Section, Seg, Tag, ui as u, type Tone } from '../../ui';
import { ProfileHead } from '../../ui/blocks/ProfileHead';
import { WeekBars } from '../../ui/blocks/WeekBars';
import { Pos } from '../../ui/blocks/Pos';
import Clips from '../Clips';
import StatGrid from '../StatGrid';
import l from '../layout.module.css';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ playerId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { playerId } = await params;
  const name = /^\d+$/.test(playerId) ? playerOf(playerId).name : nflTeamName(playerId);
  return { title: { absolute: `${name}, Splash` }, robots: { index: false, follow: false } };
}

const PLURAL: Record<string, string> = { QB: 'quarterbacks', RB: 'running backs', WR: 'wide receivers', TE: 'tight ends', K: 'kickers', DEF: 'defenses' };
const pct = (n: number | undefined | null) => `${Math.round((n ?? 0) * 100)}%`;
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const kickoff = (iso: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(new Date(iso));
const epa = (n: number | undefined) => {
  const v = n ?? 0;
  return v > 0 ? `+${v.toFixed(1)}` : v < 0 ? `-${Math.abs(v).toFixed(1)}` : '0.0';
};
const USAGE: Record<string, { label: string; value: (r: UsageRow) => string }[]> = {
  QB: [
    { label: 'CAR', value: (r) => String(r.car ?? 0) },
    { label: 'Pass EPA', value: (r) => epa(r.pepa) },
    { label: 'Rush EPA', value: (r) => epa(r.repa) },
  ],
  RB: [
    { label: 'CAR', value: (r) => String(r.car ?? 0) },
    { label: 'CAR %', value: (r) => pct(r.cs) },
    { label: 'TGT', value: (r) => String(r.tgt ?? 0) },
  ],
  WR: [
    { label: 'TGT', value: (r) => String(r.tgt ?? 0) },
    { label: 'TGT %', value: (r) => pct(r.ts) },
    { label: 'Air %', value: (r) => pct(r.ays) },
  ],
  TE: [
    { label: 'TGT', value: (r) => String(r.tgt ?? 0) },
    { label: 'TGT %', value: (r) => pct(r.ts) },
    { label: 'Air %', value: (r) => pct(r.ays) },
  ],
};
const LABEL = { soft: 'Soft', even: 'Even', hard: 'Hard' } as const;
const TONE: Record<'soft' | 'even' | 'hard', Tone> = { soft: 'good', even: 'neutral', hard: 'bad' };

/**
 * A player's profile: who he is and who has him here, his week (the game,
 * every number on it, Sleeper's props), the outlook and the working under
 * it, the news, his plays, the season, every week he has scored, the full
 * stat sheet, his usage and the rest of his season.
 */
const VIEWS = [
  { key: 'outlook', label: 'Outlook' },
  { key: 'season', label: 'Season' },
  { key: 'log', label: 'Game Log' },
] as const;
type View = (typeof VIEWS)[number]['key'];

/**
 * A player: who he is, who has him and this week's game up top, then one
 * view at a time (Outlook, Season, Game Log) so the page reads summary first
 * (Step 1 rule 8). The game log rides on the points chart: tap a week for
 * its game, so each week's points show once.
 */
export default async function V4Player({ params, searchParams }: Params & { searchParams: Promise<{ view?: string }> }) {
  const { playerId } = await params;
  const sp = await searchParams;
  const view: View = VIEWS.some((v) => v.key === sp.view) ? (sp.view as View) : 'outlook';
  if (!/^[0-9A-Z]{1,8}$/.test(playerId)) notFound();
  if (/^\d+$/.test(playerId) ? playerOf(playerId).name === 'Unknown Player' : !NFL_TEAMS[playerId]) notFound();
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const week = Math.max(1, league.state.week);
  const [data, d, wk, season, clipsNow, clipsBefore] = await Promise.all([
    getV4Data(mine),
    getPlayerData(playerId),
    getPlayerWeek(playerId, bookFrom(jar)),
    getPlayerSeason(playerId),
    embedClipsForPlayers(week, [playerId]).catch(() => [] as EmbedClip[]),
    week > 1 ? embedClipsForPlayers(week - 1, [playerId]).catch(() => [] as EmbedClip[]) : Promise.resolve([] as EmbedClip[]),
  ]);
  const pl = season.player;
  const unit = pl.position === 'DEF';
  const owner = season.ownerRosterId ? teamByRoster(season.ownerRosterId) : null;
  const o = wk.outlook;
  const blocks = statBlocksFor(pl.position, statsFor(playerId));
  const ros = dsRos(playerId);
  const usage = USAGE[pl.position] ? recentUsage(playerId, 3) : [];
  const clips = [...clipsNow, ...clipsBefore.filter((c) => !clipsNow.some((x) => x.videoId === c.videoId))].slice(0, 8);
  const best = season.weeks.length ? season.weeks.reduce((a, b) => (b.points > a.points ? b : a)) : null;
  const thisWeek = d.log.find((x) => x.week === week);
  const g = wk.game;
  const final = g?.state === 'post';
  const us = g?.us ?? 0;
  const them = g?.them ?? 0;
  const gameLine = !g ? '' : g.state === 'pre' ? kickoff(g.kickoff) : `${final ? (us > them ? 'W ' : us < them ? 'L ' : 'T ') : `${g.status} · `}${us}-${them}`;
  const rosCells = ros
    ? [
        { label: 'Overall', value: `#${ros.rank}` },
        { label: 'Position', value: `${ros.position}${ros.posRank}` },
        ...(ros.projection != null ? [{ label: 'Per game', value: ros.projection.toFixed(1) }] : []),
        ...(ros.value != null ? [{ label: 'DS value', value: String(ros.value) }] : []),
        ...(ros.floor != null && ros.ceiling != null ? [{ label: 'Weekly range', value: `${ros.floor.toFixed(1)} to ${ros.ceiling.toFixed(1)}` }] : []),
        ...(ros.injuryRisk != null ? [{ label: 'Injury risk', value: pct(ros.injuryRisk) }] : []),
        ...(ros.sos != null ? [{ label: 'Schedule', value: `${ros.sos >= 0 ? '+' : ''}${(ros.sos * 100).toFixed(1)}%` }] : []),
      ]
    : [];
  const injury = d.injury ?? pl.injuryStatus ?? null;
  const practice = pl.practice && pl.practice !== 'None' ? pl.practice : null;
  const lead = unit ? <Crest src={pl.team ? `https://a.espncdn.com/i/teamlogos/nfl/500/${pl.team === 'WAS' ? 'wsh' : pl.team.toLowerCase()}.png` : null} size={40} /> : pl.espnId ? <Art src={ESPN_CUTOUT(pl.espnId)} size={72} /> : <Face id={pl.id} team={pl.team} size={48} />;
  const usageLine = [
    o.role,
    o.usage ? `Snaps ${pct(o.usage.snaps)}` : null,
    o.usage?.share ? `${o.usage.shareLabel} ${pct(o.usage.share)}` : null,
    o.usage?.redZone ? `Red zone looks ${o.usage.redZone} a game` : null,
    o.trend && o.trend !== 'steady' ? `Usage ${o.trend}` : null,
  ].filter(Boolean);

  return (
    <Shell data={data} active="league">
      <SectionHead icon="person" word="player" week={data.week} mine={data.myRoster} back={{ href: '/players', label: 'Players' }} />

      <ProfileHead
        lead={lead}
        name={pl.name}
        meta={
          <>
            <Pos position={pl.position} />
            {[unit ? '' : pl.team ? nflTeamName(pl.team) : 'Free agent', d.number != null ? `#${d.number}` : ''].filter(Boolean).map((x) => ` ${x}`).join(' ·')}
          </>
        }
        tags={
          injury || practice ? (
            <>
              {injury ? <Tag tone="bad">{injury}</Tag> : null}
              {practice ? <Tag tone="bad">{practice} in practice</Tag> : null}
            </>
          ) : undefined
        }
      />
      {d.bio.length ? <p className={`${u.sub} ${l.inset}`}>{d.bio.join(' · ')}</p> : null}

      <Section title="On Sleeper">
        {owner ? (
          <List tap>
            <Row
              href={`/managers/${owner.rosterId}`}
              lead={<Avatar src={owner.avatarUrl} color={owner.colors?.primary} size={34} />}
              title={owner.teamName.trim()}
              sub={`${owner.rosterId === mine ? 'Your team' : (d.owner?.manager ?? owner.manager)}${d.owner ? ` · ${d.owner.starts} starts` : ''}`}
              value={d.owner ? d.owner.points.toFixed(2) : undefined}
              valueSub={d.owner ? 'Pts for them' : undefined}
            />
          </List>
        ) : (
          <List>
            <Row lead={<Avatar size={34} />} title="Free agent" sub="On waivers in this league" />
          </List>
        )}
        {owner?.rosterId === mine ? null : (
          <Card>
            <CopyMove
              label={owner ? 'Copy trade ask' : 'Copy claim'}
              text={owner ? `Trade ask: ${pl.name} from ${owner.teamName.trim()}` : `Claim ${pl.name}${unit ? ' (defense)' : ''}`}
            />
          </Card>
        )}
      </Section>

      <Section title={`Week ${wk.week}`}>
        {g ? (
          <List tap>
            <Row
              href={`/nfl/${g.id}`}
              lead={<Crest src={g.oppLogo} size={32} />}
              title={`${g.home ? 'vs' : 'at'} ${g.oppName}`}
              sub={`${gameLine}${final && thisWeek?.pts != null ? ` · ${thisWeek.pts.toFixed(2)} pts` : ''}`}
              value={final ? 'Final' : g.state === 'in' ? 'Live' : undefined}
            />
          </List>
        ) : (
          <Empty>Bye week.</Empty>
        )}
        {wk.line || wk.projectedLine || wk.cells.length ? (
          <Card>
            {wk.line ? <Row label="Stat line" title={wk.line} /> : null}
            {wk.projectedLine ? <Row label="Projected line" title={wk.projectedLine} /> : null}
            <StatGrid items={wk.cells} />
          </Card>
        ) : null}
      </Section>

      <Seg label={pl.name} items={VIEWS.map((v) => ({ label: v.label, href: v.key === 'outlook' ? `/players/${playerId}` : `/players/${playerId}?view=${v.key}`, on: v.key === view }))} />

      {view === 'outlook' ? (
        <>
      {wk.props.length ? (
        <Section title="Props">
          <List>
            {wk.props.map((pr) => (
              <Row
                key={pr.wager}
                title={pr.label}
                sub={[pr.over != null ? `Over ${pr.over.toFixed(2)}x` : null, pr.under != null ? `Under ${pr.under.toFixed(2)}x` : null].filter(Boolean).join(' · ')}
                value={pr.line}
              />
            ))}
          </List>
        </Section>
      ) : null}

      <Section title="Outlook">
        <Card>
          <StatGrid
            items={[
              { value: o.adjusted.toFixed(2), label: 'Projected' },
              { value: `${o.floor.toFixed(1)} to ${o.ceiling.toFixed(1)}`, label: 'Range' },
              { value: o.matchup ? <Tag tone={TONE[o.matchup.label]}>{LABEL[o.matchup.label]}</Tag> : 'None', label: 'Matchup' },
              ...(o.boomBust
                ? [
                    { value: pct(o.boomBust.boom), label: `Boom, ${o.boomBust.boomLine}+` },
                    { value: pct(o.boomBust.bust), label: `Bust, ${o.boomBust.bustLine} or less` },
                  ]
                : []),
            ]}
          />
          <p className={`${u.sub} ${l.note}`}>
            {o.matchup
              ? `${o.matchup.home ? 'vs' : 'at'} ${o.matchup.opponent}, ${ordinal(o.matchup.rank)} most points allowed to ${PLURAL[pl.position] ?? pl.position}.`
              : 'No opponent this week.'}
            {o.source === 'deterministic' && o.matchup && Math.abs(o.adjusted - o.base) >= 0.05
              ? ` ${o.base.toFixed(2)} before the matchup; ${nflTeamName(o.matchup.opponent)} allows ${o.matchup.conceded.toFixed(1)} a game to ${PLURAL[pl.position] ?? 'the position'}.`
              : ''}
          </p>
          {o.read ? <p className={u.bodyText}>{o.read}</p> : null}
          {usageLine.length ? <p className={`${u.sub} ${l.note}`}>{usageLine.join(' · ')}</p> : null}
          {o.ahead.length ? (
            <div className={l.stack}>
              <span className={u.label}>Schedule</span>
              <span className={u.chips}>
                {o.ahead.map((f) => (
                  <Tag key={f.week} tone={TONE[f.label]}>
                    W{f.week} {f.home ? 'vs' : '@'} {f.opponent}
                  </Tag>
                ))}
              </span>
            </div>
          ) : null}
          {o.source === 'model' ? (
            <p className={`${u.label} ${l.note}`}>SQUIRT model, {o.median?.toFixed(1)} median. A projection, not a promise.</p>
          ) : o.confidence === 'thin' ? (
            <p className={`${u.label} ${l.note}`}>Defense ratings are {Math.round(o.weight * 100)}% applied this early in the season.</p>
          ) : null}
        </Card>
      </Section>

      <Section title="News">
        {wk.news.length ? (
          <List tap>
            {wk.news.slice(0, 5).map((n) => (
              <a key={n.url || n.headline} href={n.url} className={`${u.row} ${u.rowNoLead}`} target="_blank" rel="noopener noreferrer">
                <span className={u.body}>
                  <span className={u.title}>{n.headline}</span>
                  {n.summary ? <span className={u.sub}>{n.summary}</span> : null}
                  <span className={u.label}>{[n.byline, n.source, filed(n.published)].filter(Boolean).join(' · ')}</span>
                </span>
              </a>
            ))}
          </List>
        ) : (
          <Empty>No recent news.</Empty>
        )}
      </Section>

      {clips.length ? (
        <Section title="Highlights">
          <Clips clips={clips.map((c) => ({ videoId: c.videoId, title: c.title, still: c.still, stillTall: c.stillTall ?? c.still, vertical: Boolean(c.vertical), channel: c.channel }))} />
        </Section>
      ) : null}

      <Section title="Rest of Season">
        {ros ? (
          <Card>
            <StatGrid items={rosCells} />
            <p className={`${u.label} ${l.note}`}>Source: DraftSharks</p>
          </Card>
        ) : (
          <Empty>Not ranked by DraftSharks.</Empty>
        )}
      </Section>
        </>
      ) : null}

      {view === 'season' ? (
        <>
      <Section title="Season">
        <Card>
          <StatGrid
            per={4}
            items={[
              { value: season.totalPoints.toFixed(1), label: 'Points' },
              { value: season.weeks.length ? (season.totalPoints / season.weeks.length).toFixed(2) : '0.00', label: 'Per game' },
              { value: best ? best.points.toFixed(1) : '–', label: best ? `Best, W${best.week}` : 'Best' },
              { value: season.weeks.length, label: 'Games' },
              { value: season.startedPoints.toFixed(1), label: 'Pts started' },
              { value: season.weeks.filter((x) => x.started).length, label: 'Starts' },
              ...(d.rostered != null ? [{ value: `${Math.round(d.rostered)}%`, label: 'Rostered, Sleeper' }] : []),
              ...(d.started != null ? [{ value: `${Math.round(d.started)}%`, label: 'Started, Sleeper' }] : []),
              ...(d.season.snapPct != null ? [{ value: `${d.season.snapPct}%`, label: 'Snaps' }] : []),
            ]}
          />
        </Card>
      </Section>

      <Section title="Season Stats">
        {blocks.length ? (
          <Card>
            {blocks.map((b) => (
              <div key={b.title} className={l.stack}>
                <span className={u.label}>{b.title}</span>
                <StatGrid items={b.lines.map((x) => ({ value: x.value, label: x.label }))} />
              </div>
            ))}
          </Card>
        ) : (
          <Empty>No season stats yet.</Empty>
        )}
      </Section>

      {USAGE[pl.position] ? (
        <Section title="Usage">
          {usage.length ? (
            <List>
              {usage.map((r) => (
                <Row
                  key={r.week}
                  title={`Week ${r.week}`}
                  sub={USAGE[pl.position].map((c) => `${c.label} ${c.value(r)}`).join(' · ')}
                  value={r.snapsIn ? pct(r.sp) : 'Pending'}
                  valueSub="Snaps"
                />
              ))}
            </List>
          ) : (
            <Empty>No usage logged yet.</Empty>
          )}
          {usage.length ? <p className={`${u.label} ${l.inset}`}>Source: nflverse</p> : null}
        </Section>
      ) : null}

        </>
      ) : null}

      {view === 'log' ? (
        <Section title="Game Log">
          <Card>
            <WeekBars
              points={season.weeks.map((x) => ({ week: x.week, points: x.points, good: x.started }))}
              playoffWeekStart={league.playoffWeekStart}
              weeks={Math.max(week, ...season.weeks.map((x) => x.week))}
              solid="Started here"
              hollow="Benched or free agent"
              log={Object.fromEntries(
                d.log
                  .filter((x) => x.opp !== 'BYE')
                  .map((x) => [x.week, { opp: x.opp, line: boxLine(pl.position, x.line) || 'No stats', proj: x.proj != null ? x.proj.toFixed(2) : null }]),
              )}
            />
          </Card>
        </Section>
      ) : null}
    </Shell>
  );
}
