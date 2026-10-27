import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { dsRos } from '@/lib/draftsharks';
import { ESPN_CUTOUT, ESPN_TEAM_LOGO } from '@/lib/espn';
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
import Clips from '../Clips';
import PointsBars from '../PointsBars';
import s from '../../v4.module.css';
import p from '../p4.module.css';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ playerId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { playerId } = await params;
  const name = /^\d+$/.test(playerId) ? playerOf(playerId).name : nflTeamName(playerId);
  return { title: { absolute: `${name}, Splash 4.0` }, robots: { index: false, follow: false } };
}

const PLURAL: Record<string, string> = { QB: 'quarterbacks', RB: 'running backs', WR: 'wide receivers', TE: 'tight ends', K: 'kickers', DEF: 'defenses' };
const pct = (n: number | undefined | null) => `${Math.round((n ?? 0) * 100)}%`;
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const kickoff = (iso: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(new Date(iso));
const epa = (n: number | undefined) => {
  const v = n ?? 0;
  return v > 0 ? `+${v.toFixed(1)}` : v < 0 ? `−${Math.abs(v).toFixed(1)}` : '0.0';
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
const TONE = { soft: s.tagGood, even: '', hard: s.tagBad } as const;

/**
 * A player's profile: the sheet, given the whole page and everything v3's
 * player page carried. Who he is and who has him here, his week (the game,
 * every number on it, Sleeper's props), the outlook and the working under
 * it, the news, his plays, the season in four numbers, every week he has
 * scored, the full stat sheet, his usage and the rest of his season.
 */
export default async function V4Player({ params }: Params) {
  const { playerId } = await params;
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
  const started = new Map(season.weeks.map((x) => [x.week, x]));
  const thisWeek = d.log.find((l) => l.week === week);
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

  return (
    <Shell data={data} active="league">
      <div className={p.wrap}>
        <SectionHead icon="person" word="player" week={data.week} mine={data.myRoster} back={{ href: '/lab/app/players', label: 'Players' }} />

        <article className={p.hero}>
          <div className={p.heroHead} style={{ ['--tc' as string]: g?.color ?? 'var(--deep)' }}>
            {pl.team ? <img className={p.heroLogo} src={ESPN_TEAM_LOGO(pl.team)} alt="" /> : null}
            {unit ? null : <img className={p.heroCut} src={pl.espnId ? ESPN_CUTOUT(pl.espnId) : pl.headshot} alt="" />}
            <div className={p.heroWho} style={unit ? { paddingLeft: 14 } : undefined}>
              <h1>{pl.name}</h1>
              <span className={p.heroMeta}>
                <i className={`${s.pos} ${s[`p${pl.position}`] ?? ''}`}>{pl.position}</i>
                {unit ? null : <span>{pl.team ? nflTeamName(pl.team) : 'Free agent'}</span>}
                {d.number != null ? <span>#{d.number}</span> : null}
              </span>
              {injury || (pl.practice && pl.practice !== 'None') ? (
                <span className={p.chips}>
                  {injury ? <span className={`${s.tag} ${s.tagBad}`}>{injury}</span> : null}
                  {pl.practice && pl.practice !== 'None' ? <span className={`${s.tag} ${s.tagBad}`}>{pl.practice} in practice</span> : null}
                </span>
              ) : null}
            </div>
          </div>
          {owner ? (
            <Link href={`/lab/app/managers/${owner.rosterId}`} className={p.owner}>
              <span className={s.av} style={{ width: 32, height: 32, ['--mgr' as string]: owner.colors?.primary }}>
                {owner.avatarUrl ? <img src={owner.avatarUrl} alt="" /> : null}
              </span>
              <span className={p.ownerText}>
                <b>{owner.teamName.trim()}</b>
                <small>
                  {owner.rosterId === mine ? 'Your team' : (d.owner?.manager ?? owner.manager)}
                  {d.owner ? ` · ${d.owner.starts} starts · ${d.owner.points.toFixed(2)} pts for them` : ''}
                </small>
              </span>
              <span className={`${s.tag} ${p.blue}`}>Rostered</span>
            </Link>
          ) : (
            <div className={p.owner}>
              <span className={s.av} style={{ width: 32, height: 32 }} />
              <span className={p.ownerText}>
                <b>Nobody</b>
                <small>On waivers in this league</small>
              </span>
              <span className={`${s.tag} ${s.tagGood}`}>Free agent</span>
            </div>
          )}
          {owner?.rosterId === mine ? null : (
            <div className={p.handoff}>
              <CopyMove
                label={owner ? 'Copy trade ask' : 'Copy claim'}
                text={owner ? `Trade ask: ${pl.name} from ${owner.teamName}` : `Claim ${pl.name}${unit ? ' (defense)' : ''}`}
              />
            </div>
          )}
          {d.bio.length ? <div className={p.heroBio}>{d.bio.join(' · ')}</div> : null}
        </article>

        <div className={s.title}>
          <h2>Week {wk.week}</h2>
          {g ? <a href={`/lab/app/nfl/${g.id}`}>Game</a> : null}
        </div>
        <section className={s.card}>
          {g ? (
            <a href={`/lab/app/nfl/${g.id}`} className={p.gameRow}>
              <img src={g.oppLogo} alt="" />
              <span>
                <b>
                  {g.home ? 'vs' : '@'} {g.oppName}
                </b>
                <small>
                  {gameLine}
                  {final && thisWeek?.pts != null ? ` · ${thisWeek.pts.toFixed(2)} pts` : ''}
                </small>
              </span>
              <span>{final ? 'Final' : g.state === 'in' ? 'Live' : 'Next'}</span>
            </a>
          ) : (
            <p className={s.note}>Bye week.</p>
          )}
          {wk.line ? (
            <div className={p.line}>
              <span className={p.label}>Line</span>
              <span>{wk.line}</span>
            </div>
          ) : null}
          {wk.projectedLine ? (
            <div className={p.line}>
              <span className={p.label}>Projected line</span>
              <span>{wk.projectedLine}</span>
            </div>
          ) : null}
          {wk.cells.length ? (
            <div className={p.cells}>
              {wk.cells.map((c) => (
                <span key={c.label} className={p.cell}>
                  <span className={p.label}>{c.label}</span>
                  <b>{c.value}</b>
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {wk.props.length ? (
          <>
            <div className={s.title}>
              <h2>Sleeper Props</h2>
            </div>
            <div className={s.list}>
              {wk.props.map((pr) => (
                <div key={pr.wager} className={p.prop}>
                  <span>{pr.label}</span>
                  <b>{pr.line}</b>
                  <small>{[pr.over != null ? `Over ${pr.over.toFixed(2)}x` : null, pr.under != null ? `Under ${pr.under.toFixed(2)}x` : null].filter(Boolean).join(' · ')}</small>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className={s.title}>
          <h2>Outlook</h2>
        </div>
        <section className={s.card}>
          <div className={p.split}>
            <span className={p.cell}>
              <span className={p.label}>Projected</span>
              <span className={p.big}>{o.adjusted.toFixed(2)}</span>
              <span className={p.sub}>
                Range {o.floor.toFixed(1)} to {o.ceiling.toFixed(1)}
              </span>
            </span>
            <span className={p.cell}>
              <span className={p.label}>Matchup</span>
              {o.matchup ? (
                <>
                  <span className={`${p.pill} ${TONE[o.matchup.label]}`} style={o.matchup.label === 'even' ? { background: 'var(--paper)', boxShadow: 'inset 0 0 0 1px var(--hair)' } : undefined}>
                    {LABEL[o.matchup.label]}
                  </span>
                  <span className={p.sub}>
                    {o.matchup.home ? 'vs' : '@'} {o.matchup.opponent}, {ordinal(o.matchup.rank)} most points allowed to {PLURAL[pl.position] ?? pl.position}
                  </span>
                </>
              ) : (
                <span className={p.sub}>No opponent this week</span>
              )}
            </span>
          </div>
          {o.read ? <p className={p.para}>{o.read}</p> : null}
          {o.boomBust ? (
            <div className={p.chips}>
              <span className={`${s.tag} ${s.tagGood}`}>
                <b>{pct(o.boomBust.boom)}</b> Boom, {o.boomBust.boomLine}+
              </span>
              <span className={`${s.tag} ${s.tagBad}`}>
                <b>{pct(o.boomBust.bust)}</b> Bust, {o.boomBust.bustLine} or less
              </span>
            </div>
          ) : null}
          {o.source === 'deterministic' && o.matchup && Math.abs(o.adjusted - o.base) >= 0.05 ? (
            <p className={s.note}>
              {o.base.toFixed(2)} before the matchup. {nflTeamName(o.matchup.opponent)} allows {o.matchup.conceded.toFixed(1)} a game to {PLURAL[pl.position] ?? 'the position'}.
            </p>
          ) : null}
          {o.role || o.usage ? (
            <div className={p.chips}>
              {o.role ? <span className={`${s.tag} ${p.blue}`}>{o.role}</span> : null}
              {o.usage ? (
                <>
                  <span className={s.tag}>
                    Snaps <b>{pct(o.usage.snaps)}</b>
                  </span>
                  {o.usage.share ? (
                    <span className={s.tag}>
                      {o.usage.shareLabel} <b>{pct(o.usage.share)}</b>
                    </span>
                  ) : null}
                  {o.usage.redZone ? (
                    <span className={s.tag}>
                      Red zone looks <b>{o.usage.redZone}</b> a game
                    </span>
                  ) : null}
                </>
              ) : null}
              {o.trend && o.trend !== 'steady' ? <span className={s.tag}>Usage {o.trend}</span> : null}
            </div>
          ) : null}
          {o.ahead.length ? (
            <div className={p.line}>
              <span className={p.label}>Coming up</span>
              <div className={p.chips}>
                {o.ahead.map((f) => (
                  <span key={f.week} className={`${s.tag} ${TONE[f.label]}`}>
                    W{f.week} {f.home ? 'vs' : '@'} {f.opponent}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {o.source === 'model' ? (
            <p className={p.via}>SQUIRT model, {o.median?.toFixed(1)} median. A projection, not a promise.</p>
          ) : o.confidence === 'thin' ? (
            <p className={p.via}>Defense ratings are {Math.round(o.weight * 100)}% applied this early in the season.</p>
          ) : null}
        </section>

        <div className={s.title}>
          <h2>News</h2>
          {wk.news.length ? <span className={p.count}>via ESPN</span> : null}
        </div>
        {wk.news.length ? (
          <div className={s.list}>
            {wk.news.slice(0, 5).map((n) => (
              <a key={n.url || n.headline} href={n.url} className={p.news} target="_blank" rel="noopener noreferrer">
                <b>{n.headline}</b>
                {n.summary ? <span>{n.summary}</span> : null}
                <small>{[n.byline, n.source, filed(n.published)].filter(Boolean).join(' · ')}</small>
              </a>
            ))}
          </div>
        ) : (
          <p className={s.empty}>No recent news.</p>
        )}

        {clips.length ? (
          <>
            <div className={s.title}>
              <h2>Highlights</h2>
              <span className={p.count}>via YouTube</span>
            </div>
            <section className={s.card}>
              <Clips clips={clips.map((c) => ({ videoId: c.videoId, title: c.title, still: c.still, stillTall: c.stillTall ?? c.still, vertical: Boolean(c.vertical), channel: c.channel }))} />
            </section>
          </>
        ) : null}

        <div className={s.title}>
          <h2>Season</h2>
        </div>
        <section className={s.card}>
          <div className={p.tiles}>
            <span className={p.tile}>
              <b>{season.totalPoints.toFixed(1)}</b>
              <small>Points</small>
              <small>Avg {season.weeks.length ? (season.totalPoints / season.weeks.length).toFixed(2) : '0.00'}</small>
            </span>
            <span className={p.tile}>
              <b>{season.startedPoints.toFixed(1)}</b>
              <small>Started</small>
              <small>{season.totalPoints > 0 ? `${Math.round((season.startedPoints / season.totalPoints) * 100)}% of it` : 'None'}</small>
            </span>
            <span className={p.tile}>
              <b>{best ? best.points.toFixed(1) : '–'}</b>
              <small>Best</small>
              <small>{best ? `Week ${best.week}` : 'None yet'}</small>
            </span>
            <span className={p.tile}>
              <b>{season.weeks.length}</b>
              <small>Games</small>
              <small>{season.weeks.filter((x) => x.started).length} started</small>
            </span>
          </div>
          {d.rostered != null || d.season.snapPct != null ? (
            <div className={p.chips}>
              {d.rostered != null ? (
                <span className={s.tag}>
                  Rostered on Sleeper <b>{Math.round(d.rostered)}%</b>
                </span>
              ) : null}
              {d.started != null ? (
                <span className={s.tag}>
                  Started on Sleeper <b>{Math.round(d.started)}%</b>
                </span>
              ) : null}
              {d.season.snapPct != null ? (
                <span className={s.tag}>
                  Snaps <b>{d.season.snapPct}%</b>
                </span>
              ) : null}
            </div>
          ) : null}
        </section>

        <div className={s.title}>
          <h2>Points by Week</h2>
        </div>
        <section className={s.card}>
          <PointsBars
            points={season.weeks.map((x) => ({ week: x.week, points: x.points, good: x.started }))}
            playoffWeekStart={league.playoffWeekStart}
            weeks={Math.max(week, ...season.weeks.map((x) => x.week))}
            solid="Started here"
            hollow="Benched or free agent"
          />
        </section>

        <div className={s.title}>
          <h2>Game Log</h2>
        </div>
        <div className={s.list}>
          {d.log.map((l) => {
            const here = l.opp === 'BYE' ? undefined : started.get(l.week);
            const pts = l.opp === 'BYE' ? null : (here?.points ?? l.pts);
            return (
              <div key={l.week} className={p.row} style={{ cursor: 'default', gridTemplateColumns: '22px minmax(0, 1fr) auto' }}>
                <span className={p.wk}>{l.week}</span>
                <span className={p.rowName}>
                  <b>{l.opp === 'BYE' ? 'Bye' : l.opp}</b>
                  <small>{pts != null ? boxLine(pl.position, l.line) || 'No stats' : l.opp === 'BYE' ? 'No game' : 'Yet to play'}</small>
                  {here ? <em>{here.started ? 'Started' : 'Benched'}</em> : null}
                </span>
                <span className={p.rowPts}>
                  <b>{pts != null ? pts.toFixed(2) : '–'}</b>
                  <small>{l.proj != null ? `Proj ${l.proj.toFixed(2)}` : ''}</small>
                </span>
              </div>
            );
          })}
        </div>

        <div className={s.title}>
          <h2>Season Stats</h2>
        </div>
        {blocks.length ? (
          <section className={s.card}>
            <div className={p.blocks}>
              {blocks.map((b) => (
                <div key={b.title}>
                  <span className={p.label}>{b.title}</span>
                  <dl className={p.pairs}>
                    {b.lines.map((x) => (
                      <div key={x.label} className={p.pair}>
                        <dt>{x.label}</dt>
                        <dd>{x.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <p className={s.empty}>No season stats yet.</p>
        )}

        {USAGE[pl.position] ? (
          <>
            <div className={s.title}>
              <h2>Usage</h2>
              {usage.length ? <span className={p.count}>via nflverse</span> : null}
            </div>
            {usage.length ? (
              <section className={s.card}>
                <table className={p.table}>
                  <thead>
                    <tr>
                      <th>Week</th>
                      <th>Snaps</th>
                      {USAGE[pl.position].map((c) => (
                        <th key={c.label}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usage.map((r) => (
                      <tr key={r.week}>
                        <td>Week {r.week}</td>
                        <td>{r.snapsIn ? pct(r.sp) : 'Pending'}</td>
                        {USAGE[pl.position].map((c) => (
                          <td key={c.label}>{c.value(r)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : (
              <p className={s.empty}>No usage logged yet.</p>
            )}
          </>
        ) : null}

        <div className={s.title}>
          <h2>Rest of Season</h2>
          {ros ? <span className={p.count}>DraftSharks</span> : null}
        </div>
        {ros ? (
          <section className={s.card}>
            <div className={p.cells}>
              {rosCells.map((c) => (
                <span key={c.label} className={p.cell}>
                  <span className={p.label}>{c.label}</span>
                  <b>{c.value}</b>
                </span>
              ))}
            </div>
          </section>
        ) : (
          <p className={s.empty}>Not ranked by DraftSharks.</p>
        )}
      </div>
    </Shell>
  );
}
