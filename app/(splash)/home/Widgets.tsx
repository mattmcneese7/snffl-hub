import Link from 'next/link';
import type { Article as RagArticle } from '@/lib/rag';
import type { StoryArt } from '@/lib/story-images';
import type { FeedItem } from '@/lib/feed-view';
import type { PowerRank } from '@/lib/league';
import type { Trade } from '@/lib/trades';
import type { Game, LineupSlot, NflGame, Standing } from '@/lib/types';
import type { AwardTally } from '@/lib/awards';
import { PillLink } from './Glass';
import Icon from './Icons';
import Squirt from './Squirt';
import Masthead, { type MastStyle } from './Masthead';
import Widget from './Widget';
import w from './widgets.module.css';
import ClipPlayerRail, { type RailClip } from './ClipPlayer';
import { isPhone } from '../lib/device';
import { nflTeamName } from '../kit/nflTeams';
import { gameStatus } from '../kit/gameStatus';

/**
 * The home's widgets. Each takes data already fetched by the page (the same
 * sources v2's Home reads), so nothing here fetches, and each has an honest
 * empty state for the weeks when there is nothing to show.
 */

const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';
const pts = (n: number) => n.toFixed(2);

/** A Rag story's picture: the photo, or the player cut out on powder. */
function ArtImg({ art }: { art?: StoryArt }) {
  if (!art) return null;
  // eslint-disable-next-line @next/next/no-img-element
  if (art.kind === 'photo') return <img src={art.src} alt="" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={art.cutout} alt="" style={{ objectFit: 'contain', objectPosition: 'bottom' }} />;
}

// ---------- The Rag: the hero ----------

export function RagHero({
  week,
  articles,
  total,
  art,
  mast = 'tabloid',
  publishedAt = null,
}: {
  week: number;
  articles: RagArticle[];
  /** Stories in the whole issue, for the way in. */
  total: number;
  art: Record<string, StoryArt | undefined>;
  /** The nameplate at its head, and the day the issue went out. */
  mast?: MastStyle | 'plain';
  publishedAt?: string | null;
}) {
  const [lead, ...rest] = articles;
  if (!lead) return null;
  return (
    <Widget size="l" className={w.hero}>
      {mast === 'plain' ? (
        <div className={w.mast}>
          <Icon name="newspaper" className={w.mastIcon} />
          <span className={w.mastName}>The Rag</span>
          <span className={w.mastWeek}>Week {week}</span>
        </div>
      ) : (
        <Masthead style={mast} week={week} publishedAt={publishedAt} stories={total} />
      )}
      <Link href={`/rag/${week}/${lead.slug}`} className={w.lead}>
        <span className={w.heroArt} style={{ margin: '0 -16px 8px', borderRadius: 0 }}>
          <ArtImg art={art[lead.slug]} />
        </span>
        <span className={w.tag}>{lead.category}</span>
        <span className={w.leadHead}>{lead.headline}</span>
        {lead.deck ? <span className={w.deck}>{lead.deck}</span> : null}
        <span className={w.sub}>{lead.readTime} min read</span>
      </Link>
      <ul className={w.more2}>
        {rest.slice(0, 3).map((a) => (
          <li key={a.slug}>
            <Link href={`/rag/${week}/${a.slug}`} className={w.row}>
              <span className={w.thumb}>
                <ArtImg art={art[a.slug]} />
              </span>
              <span className={w.rowText}>
                <span className={w.rowCat}>{a.category}</span>
                <span className={w.rowHead}>{a.headline}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className={w.heroFoot}>
        <PillLink href={`/rag/${week}`} small>
          All {total} stories
        </PillLink>
      </div>
    </Widget>
  );
}

// ---------- The league's scoreboard ----------

type Chip = { text: string; hot?: boolean };

/**
 * The Scoreboard widget: every game, yours first and marked. The closest game
 * still being played gets Squirt, sweating it out, and each row carries one
 * piece of lore per side, so the grudges travel with the scores.
 */
export function Scoreboard({
  games,
  week,
  mine,
  chipOf,
  nameOf,
}: {
  games: Game[];
  week: number;
  mine: number | null;
  chipOf: (rosterId: number) => Chip | null;
  nameOf: (rosterId: number) => string;
}) {
  const isMine = (g: Game) => mine != null && (g.away.rosterId === mine || g.home.rosterId === mine);
  const ordered = [...games].sort((a, b) => Number(isMine(b)) - Number(isMine(a)));
  const live = games.filter((g) => g.inPlay || g.status === 'live');
  const closest = live.length ? live.reduce((a, b) => (Math.abs(a.away.points - a.home.points) <= Math.abs(b.away.points - b.home.points) ? a : b)) : null;
  return (
    <Widget size="m" icon="football" title="Scoreboard" href={`/scoreboard/${week}`} more="Every game">
      {games.length ? (
        <ul className={w.list}>
          {ordered.map((g) => {
            const awayLeads = g.away.points >= g.home.points;
            const chips = [g.away, g.home]
              .map((side) => ({ side, chip: chipOf(side.rosterId) }))
              .filter((x): x is { side: typeof x.side; chip: Chip } => x.chip != null);
            return (
              <li key={g.matchupId} className={isMine(g) ? w.mineRow : undefined}>
                <Link href={`/scoreboard/${week}/${g.matchupId}`} className={w.game}>
                  {[g.away, g.home].map((side, i) => (
                    <span key={side.rosterId} className={`${w.side} ${(i === 0) === awayLeads ? w.leader : ''}`}>
                      <span className={w.team}>
                        {i === 0 && g.inPlay ? (
                          <svg viewBox="0 0 64 64" className={w.liveDrop} aria-label="On the field">
                            <path d={DROP} />
                          </svg>
                        ) : null}
                        {side.team}
                      </span>
                      <span className={w.pts}>{pts(side.points)}</span>
                    </span>
                  ))}
                  {chips.length || closest === g ? (
                    <span className={w.gameLore}>
                      {closest === g ? (
                        <span className={w.sweat}>
                          <Squirt mood="sweat" size={22} />
                          Closest one. Squirt&rsquo;s sweating.
                        </span>
                      ) : null}
                      {chips.map(({ side, chip }) => (
                        <span key={side.rosterId} className={`${w.chip} ${chip.hot ? w.chipHot : ''}`}>
                          {nameOf(side.rosterId)} | {chip.text}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={w.empty}>Sleeper hasn&rsquo;t posted the matchups yet. Patience.</p>
      )}
    </Widget>
  );
}

// ---------- Small facts ----------

export function ChugMeter({
  tallies,
  nameOf,
  mine,
}: {
  tallies: AwardTally[];
  nameOf: (rosterId: number) => string;
  mine: number | null;
}) {
  const owed = tallies.filter((t) => t.count > 0);
  const top = owed[0];
  const yours = mine != null ? tallies.find((t) => t.rosterId === mine) : undefined;
  return (
    <Widget size="s" icon="stein" title="The Chug" href="/chug" more="Chug Meter">
      {top ? (
        <div className={w.fact}>
          {mine != null ? (
            <span>
              <span className={w.big}>{yours?.count ?? 0}</span>{' '}
              <span className={w.sub}>{(yours?.count ?? 0) === 1 ? 'beer' : 'beers'}</span>
              <span className={w.factName} style={{ display: 'block', marginTop: 4 }}>
                {yours?.count ? 'You owe' : 'You\u2019re clean'}
              </span>
            </span>
          ) : (
            <span>
              <span className={w.big}>{top.count}</span>{' '}
              <span className={w.sub}>{top.count === 1 ? 'beer' : 'beers'}</span>
              <span className={w.factName} style={{ display: 'block', marginTop: 4 }}>
                {nameOf(top.rosterId)}
              </span>
            </span>
          )}
          <span className={w.sub}>{mine != null ? `Most owed | ${nameOf(top.rosterId)}, ${top.count}` : 'owes the most'}</span>
          <span className={w.cameo}>
            <Squirt mood="smug" size={40} prop="stein" />
          </span>
        </div>
      ) : (
        <p className={w.empty}>Nobody owes yet. Somebody will.</p>
      )}
    </Widget>
  );
}

export function LatestTrade({ trade }: { trade?: Trade }) {
  return (
    <Widget size="s" icon="swap" title="Trades" href="/trades" more="All trades">
      {trade ? (
        <div className={w.trade}>
          <span className={w.sub}>Week {trade.week}</span>
          {trade.sides.map((side) => (
            <span key={side.rosterId}>
              <b>{side.teamName}</b>
              <span className={w.gets}>
                {side.gets.length || side.picks.length || side.faab
                  ? [
                      ...side.gets.map((p) => p.name),
                      ...side.picks,
                      ...(side.faab ? [`$${side.faab} FAAB`] : []),
                    ].join(', ')
                  : 'Nothing'}
              </span>
            </span>
          ))}
        </div>
      ) : (
        <div className={w.asleep}>
          <Squirt mood="sleep" size={56} />
          <p className={w.empty}>No trades yet. Squirt fell asleep waiting.</p>
        </div>
      )}
    </Widget>
  );
}

// ---------- Faces: the week's top scorers ----------

export function TopScorers({
  players,
  ownerOf,
  statLineOf,
}: {
  players: LineupSlot[];
  ownerOf: (playerId: string) => string | null;
  /** The player's real line this week, as a broadcast reads it. */
  statLineOf: (p: LineupSlot) => string;
}) {
  if (!players.length) return null;
  return (
    <Widget size="m" icon="jersey" title="Top scorers" href="/players" more="All players">
      <ul className={w.list}>
        {players.map((p) => {
          const owner = ownerOf(p.id);
          const line = statLineOf(p);
          return (
            <li key={p.id}>
              <Link href={`/players/${p.id}`} className={w.scorer}>
                <span className={w.headshot}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.headshot} alt="" loading="lazy" />
                </span>
                <span className={w.scorerText}>
                  <b>{p.name}</b>
                  <span className={w.sub}>
                    {/* "Sean's RB, Pittsburgh Steelers": whose he is, his position, his team in full. */}
                    {owner ? `${owner}\u2019s ` : ''}
                    {p.position}
                    {p.team ? `, ${nflTeamName(p.team)}` : ''}
                  </span>
                  {line ? <span className={w.statLine}>{line}</span> : null}
                </span>
                <span className={w.scorerPts}>{pts(p.points)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Widget>
  );
}

// ---------- NFL ----------

export function NflScores({ games, week, stills = {} }: { games: NflGame[]; week: number; stills?: Record<string, string> }) {
  // Live first, then the next to kick off, then the finished.
  const order = { in: 0, pre: 1, post: 2 } as const;
  const shown = [...games].sort((a, b) => order[a.state] - order[b.state]).slice(0, 6);
  return (
    <Widget size="m" icon="tv" title="NFL scores" href={`/scoreboard/${week}`} more="Full slate">
      {shown.length ? (
        <div className={w.nfl}>
          {shown.map((g) => {
            const scored = g.state !== 'pre';
            const awayWins = scored && (g.away.score ?? 0) > (g.home.score ?? 0);
            const homeWins = scored && (g.home.score ?? 0) > (g.away.score ?? 0);
            return (
              <Link key={g.id} href={`/nfl/${g.id}`} className={`${w.nflGame} ${stills[g.id] ? w.nflPictured : ''}`}>
                {stills[g.id] ? (
                  <span className={w.nflStill}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={stills[g.id]} alt="" loading="lazy" />
                  </span>
                ) : null}
                {[
                  { s: g.away, win: awayWins },
                  { s: g.home, win: homeWins },
                ].map(({ s, win }) => (
                  <span key={s.abbr} className={`${w.nflSide} ${win ? w.nflWin : ''}`}>
                    {s.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logo} alt="" loading="lazy" />
                    ) : (
                      <span />
                    )}
                    <span className={w.nflAbbr}>{s.abbr}</span>
                    <span className={w.nflScore}>{scored ? s.score : ''}</span>
                  </span>
                ))}
                <span className={`${w.nflState} ${g.state === 'in' ? w.nflLive : ''}`}>{gameStatus(g.status)}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className={w.empty}>No NFL on right now. The scores show up when the games do.</p>
      )}
    </Widget>
  );
}

// ---------- The Feed ----------

const MARK: Record<FeedItem['kind'], string> = { touchdown: 'TD', lead: 'LEAD', cmon: 'CMON', shart: 'SHART', clip: 'CLIP' };

export function FeedDigest({ items }: { items: FeedItem[] }) {
  return (
    <Widget size="m" icon="megaphone" title="The Feed" href="/feed" more="Everything">
      {items.length ? (
        <ul className={w.list}>
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className={w.post}>
              <span className={`${w.mark} ${item.kind === 'shart' || item.kind === 'cmon' ? w.markHot : ''}`}>{MARK[item.kind]}</span>
              <span>
                <span className={w.postTitle}>{item.title}</span>
                {item.body ? <span className={w.postBody}>{item.body}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={w.empty}>Quiet. Too quiet. Touchdowns, lead changes and callouts land here as they happen.</p>
      )}
    </Widget>
  );
}

// ---------- Standings ----------

const record = (t: Standing) => `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;

export function StandingsWidget({
  standings,
  power,
  oddsCount,
  mine,
}: {
  standings: Standing[];
  power: PowerRank[];
  oddsCount: number;
  mine: number | null;
}) {
  const table = [...standings].sort((a, b) => a.seed - b.seed);
  const top = table.slice(0, 4);
  // Your row always shows: in the top four, or under them after a gap.
  const yours = mine != null && !top.some((t) => t.rosterId === mine) ? table.find((t) => t.rosterId === mine) : undefined;
  const row = (t: Standing) => (
    <li key={t.rosterId} style={{ display: 'contents' }}>
      <Link href={`/managers/${t.rosterId}`} className={`${w.tRow} ${t.rosterId === mine ? w.mineRow : ''}`}>
        <span className={w.seed}>{t.seed}</span>
        <span className={w.tTeam}>
          <span className={w.tNameLine}>
            <span className={w.tName}>{t.teamName}</span>
            {t.seed === 1 ? (
              <span className={w.crowned} title="Top of the table">
                <Squirt mood="smug" size={24} prop="crown" />
              </span>
            ) : null}
          </span>
          <span className={w.sub}>{t.manager}</span>
        </span>
        <span className={w.cell}>
          {record(t)}
          {/* "Won 4", not "W4": W4 means week 4 everywhere else in the app. */}
          {t.streak ? <span className={w.streak}>{t.streak.replace(/^W(\d+)$/, 'Won $1').replace(/^L(\d+)$/, 'Lost $1')}</span> : null}
        </span>
        <span className={w.cell}>{t.pointsFor.toFixed(2)}</span>
      </Link>
    </li>
  );
  return (
    <Widget size="l" icon="ranking" title="Standings" href="/standings" more="Full table">
      <ol className={w.table}>
        {top.map(row)}
        {yours ? (
          <>
            <li className={w.gap} aria-hidden />
            {row(yours)}
          </>
        ) : null}
      </ol>
      <div className={w.power}>
        <span className={w.subHead}>Who&rsquo;s actually good</span>
        {power.slice(0, 3).map((p) => (
          <Link key={p.team.rosterId} href={`/managers/${p.team.rosterId}`} className={w.powerRow}>
            <span className={w.seed}>{p.rank}</span>
            <span>{p.team.teamName}</span>
            <span className={`${w.move} ${p.movement && p.movement > 0 ? w.moveUp : ''}`}>
              {p.movement == null ? 'new' : p.movement === 0 ? 'even' : p.movement > 0 ? `up ${p.movement}` : `down ${-p.movement}`}
            </span>
          </Link>
        ))}
      </div>
      <div className={w.foot}>
        <PillLink href="/standings#playoffs" small>
          Playoff odds, all {oddsCount}
        </PillLink>
      </div>
    </Widget>
  );
}

// ---------- Everything else ----------

// Three by three: everything that isn't a menu tab, yours first.
const LINKS = [
  { href: '/my-team', label: 'My Team', icon: 'jersey' },
  { href: '/insights', label: 'Insights', icon: 'chart' },
  { href: '/trophies', label: 'Trophy case', icon: 'trophy' },
  { href: '/managers', label: 'Managers', icon: 'person' },
  { href: '/players', label: 'Players', icon: 'binoculars' },
  { href: '/trades', label: 'Trades', icon: 'swap' },
  { href: '/chug', label: 'Chug Meter', icon: 'stein' },
  { href: '/rules', label: 'Rules', icon: 'gavel' },
  { href: '/settings', label: 'Settings', icon: 'gear' },
] as const;

export function QuickLinks() {
  return (
    <Widget size="m" icon="more" title="Everything else">
      <nav className={w.links} aria-label="Everything else">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={w.link}>
            <Icon name={l.icon} className={w.linkIcon} />
            {l.label}
          </Link>
        ))}
      </nav>
    </Widget>
  );
}

// ---------- The tape: NFL clips that play in place ----------

type Clip = {
  videoId: string;
  title: string;
  still: string;
  /** The still at the clip's own shape; falls back to `still`. */
  stillTall?: string;
  playerIds: string[];
  /** A Short, or taller than wide. */
  vertical?: boolean;
  channel?: string;
};
type Owner = { name: string; started: boolean };

/**
 * A rail of real NFL clips that play inside the app, muted, one at a time,
 * as they scroll into view; a tap turns the sound on. The clips come from
 * the broadcasters' channels (lib/embed-clips.ts), never the NFL's own,
 * whose embeds refuse to play off YouTube. Each is tagged with the league
 * manager it helped or hurt.
 *
 * Phones get vertical clips first, as 9:16 tiles; wide screens get wide
 * clips first, every tile 16:9. The device is read from the request.
 */
export async function ClipRail({
  title,
  icon,
  clips,
  ownerOf,
  size = 'l',
}: {
  title: string;
  icon: 'play' | 'helmet';
  clips: Clip[];
  ownerOf: (playerId: string) => Owner | null;
  size?: 'm' | 'l';
}) {
  if (!clips.length) return null;
  const phone = await isPhone();
  // Stable sort: within each shape the caller's order stands.
  const ordered = [...clips].sort((a, b) => (phone ? Number(Boolean(b.vertical)) - Number(Boolean(a.vertical)) : Number(Boolean(a.vertical)) - Number(Boolean(b.vertical))));
  const rail: RailClip[] = ordered.map((c) => ({
    videoId: c.videoId,
    title: c.title,
    still: c.still,
    stillTall: c.stillTall ?? c.still,
    vertical: Boolean(c.vertical),
    channel: c.channel ?? 'YouTube',
    owners: c.playerIds
      .map(ownerOf)
      .filter((o): o is Owner => o != null)
      .slice(0, 2),
  }));
  return (
    <Widget size={size} icon={icon} title={title}>
      <ClipPlayerRail clips={rail} phone={phone} />
      <span className={w.via}>Clips via YouTube | Tap a clip for sound</span>
    </Widget>
  );
}
