import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { firstNameOf } from '@/config/managers';
import { getPowerRankings, getStandings, league, scoredWeek, teamByRoster, teams } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getPlayoffOdds, type OddsRow } from '@/lib/playoff-odds';
import { getPostseason, type BracketRound, type Postseason } from '@/lib/postseason';
import { getPickupCounts, type PickupCounts } from '@/lib/transactions';
import { getTrophyBoard, TROPHY_NAMES, type TrophyKey } from '@/lib/trophies';
import Shell from '../kit/Shell';
import PageHead from '../kit/PageHead';
import Widget, { WidgetHead } from '../home/Widget';
import AwardIcon from '../home/Awards';
import BracketTabs from './BracketTabs';
import w from '../home/widgets.module.css';
import s from './standings.module.css';

export const metadata: Metadata = { title: { absolute: 'Standings, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const SECTIONS = [
  { id: 'table', label: 'Table' },
  { id: 'power', label: 'Power' },
  { id: 'playoffs', label: 'Playoffs' },
];

/** The odds tags, gentlest to worst. Lime is for the bad news only. */
const TAG: Record<OddsRow['tag'], string> = {
  Clinched: s.tagIn,
  'Clinch Watch': s.tagWatch,
  Bubble: s.tagBubble,
  'In Trouble': s.tagTrouble,
  Eliminated: s.tagOut,
};

const NO_POST: Postseason = { rounds: [], shartBowl: [], championRosterId: null, shartRosterId: null, byeRosterIds: [] };

/** Sleeper's "W4" as a label: "4 game win streak", "Lost last". */
function streakLabel(streak: string) {
  const m = streak.match(/^([WL])(\d+)$/);
  if (!m) return streak;
  const n = Number(m[2]);
  if (n === 1) return m[1] === 'W' ? 'Won last' : 'Lost last';
  return `${n} game ${m[1] === 'W' ? 'win' : 'losing'} streak`;
}

/**
 * The power blurb opens with the record and streak, which the table above
 * already shows, so the row keeps only what the blurb adds.
 */
/** Points per game played so far, to two decimals. */
function average(t: { pointsFor: number; wins: number; losses: number; ties: number }) {
  const games = t.wins + t.losses + t.ties;
  return games ? (t.pointsFor / games).toFixed(2) : '0.00';
}

function blurbBody(blurb: string) {
  const rest = blurb.replace(/^\d+-\d+(?:-\d+)?(?:, riding [WL]\d+)?, (?:and )?/, '');
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

const record = (t: { wins: number; losses: number; ties: number }) => `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;

/** A team that appears in round 2 without a round 1 game sat round 1 out. */
function byesOf(rounds: BracketRound[]) {
  const r1 = rounds.find((r) => r.round === 1);
  const r2 = rounds.find((r) => r.round === 2);
  if (!r1 || !r2) return [];
  const played = new Set(r1.games.flatMap((g) => [g.home.rosterId, g.away.rosterId]));
  return r2.games.flatMap((g) => [g.home.rosterId, g.away.rosterId]).filter((id): id is number => id != null && !played.has(id));
}

/** Movement since last week, drawn rather than typed (typed arrows turn into emoji on iOS). */
function Movement({ movement }: { movement: number | null }) {
  if (movement == null) return <span className={s.move}>new</span>;
  if (movement === 0) return <span className={s.move}>even</span>;
  const up = movement > 0;
  return (
    <span className={`${s.move} ${up ? s.moveUp : ''}`} aria-label={`${up ? 'up' : 'down'} ${Math.abs(movement)}`}>
      <svg viewBox="0 0 10 10" className={s.arrow} aria-hidden>
        <path d={up ? 'M5 1.5 9 8.5H1z' : 'M5 8.5 1 1.5h8z'} />
      </svg>
      {Math.abs(movement)}
    </span>
  );
}

function Face({ src }: { src: string | null | undefined }) {
  return (
    <span className={s.face}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" loading="lazy" /> : null}
    </span>
  );
}

/**
 * Standings: where everyone stands, in the order the question gets asked.
 * The table says who is winning, the power order says who is actually
 * good, and the playoff picture says who plays in January. One page, three
 * sections, jump links at the top, the same sources v2 reads.
 */
export default async function StandingsPage() {
  const week = await scoredWeek();
  const postseason = week >= league.playoffWeekStart;

  const [standings, pickups, trophies, rankings, odds, bracket, jar] = await Promise.all([
    getStandings(),
    getPickupCounts().catch(() => ({}) as Record<number, PickupCounts>),
    getTrophyBoard().catch(() => null),
    getPowerRankings().catch(() => []),
    getPlayoffOdds().catch(() => [] as OddsRow[]),
    getPostseason().catch(() => NO_POST),
    cookies(),
  ]);

  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const nameOf = (rosterId: number) => firstNameOf(rosterId) ?? teamByRoster(rosterId)?.manager ?? '';
  const names: Record<number, string> = Object.fromEntries(teams.map((t) => [t.rosterId, nameOf(t.rosterId)]));
  const holders: Record<number, TrophyKey[]> = trophies?.holders ?? {};
  const line = league.playoffTeams;
  const totalAdds = Object.values(pickups).reduce((sum, p) => sum + p.total, 0);
  const champion = bracket.championRosterId ? teamByRoster(bracket.championRosterId) : null;
  const shartRoster = bracket.shartRosterId;

  return (
    <Shell active="standings">
      <PageHead title="Standings" collapse>
        {/* Three sections is enough to scroll past, so the page says what is
            on it and lets you jump. Plain anchors: no script, and the browser
            handles the scrolling and the history. */}
        <nav className={s.jump} aria-label="Sections on this page">
          {SECTIONS.map((x) => (
            <a key={x.id} href={`#${x.id}`} className={s.jumpLink}>
              {x.label}
            </a>
          ))}
        </nav>
      </PageHead>

      <div className={w.grid}>
        {/* The table */}
        <section id="table" className={`${w.grid} ${s.section}`}>
          <Widget size="l" icon="ranking" title="The table">
            {standings.length ? (
              <>
                {/* One team per row: the name gets the full width, the record
                    sits on the right, and the numbers run along a labelled
                    line underneath, so nothing wraps and nothing scrolls. */}
                <ol className={s.rows}>
                  {standings.map((t) => {
                    const held = holders[t.rosterId] ?? [];
                    return (
                      <li key={t.rosterId} className={t.seed === line + 1 ? s.afterLine : undefined}>
                        <Link href={`/managers/${t.rosterId}`} className={`${s.tRow} ${t.rosterId === mine ? w.mineRow : ''}`}>
                          <span className={s.seed}>{t.seed}</span>
                          <span className={s.teamName}>
                            {t.teamName}
                            {held.length ? (
                              <span className={s.held}>
                                {held.map((k) => (
                                  <span key={k} className={s.heldOne} title={`Holds ${TROPHY_NAMES[k].name}`}>
                                    <AwardIcon kind={k} size={20} />
                                    <span className={s.hidden}>Holds {TROPHY_NAMES[k].name}</span>
                                  </span>
                                ))}
                              </span>
                            ) : null}
                          </span>
                          <span className={s.wl}>{record(t)}</span>
                          <span className={s.whoLine}>
                            <span className={s.who}>{nameOf(t.rosterId)}</span>
                            {t.streak ? <span className={s.streak}>{streakLabel(t.streak)}</span> : null}
                          </span>
                          <span className={s.nums}>
                            <span>
                              <i>For</i> {t.pointsFor.toFixed(2)}
                            </span>
                            <span>
                              <i>Against</i> {t.pointsAgainst.toFixed(2)}
                            </span>
                            <span>
                              <i>Adds</i> {pickups[t.rosterId]?.total ?? 0}
                            </span>
                          </span>
                        </Link>
                        {t.seed === line && standings.length > line ? (
                          <div className={s.line} role="presentation">
                            <span className={s.lineLabel}>Playoff line</span>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
                <p className={s.note}>League adds | {totalAdds}</p>
              </>
            ) : (
              <p className={w.empty}>No standings yet</p>
            )}
          </Widget>
        </section>

        {/* Power rankings */}
        <section id="power" className={`${w.grid} ${s.section}`}>
          <section className={`${w.widget} ${w.l}`}>
            <WidgetHead icon="fire" title="Power rankings" />
            {rankings.length ? (
              <ol className={w.list}>
                {rankings.map((p) => (
                  <li key={p.team.rosterId} className={p.team.rosterId === mine ? w.mineRow : undefined}>
                    <Link href={`/managers/${p.team.rosterId}`} className={s.pRow}>
                      <span className={`${s.pRank} ${p.rank <= 3 ? s.pTop : ''}`}>{p.rank}</span>
                      <Face src={p.team.avatarUrl} />
                      <span className={s.pText}>
                        <span className={s.pName}>{p.team.teamName}</span>
                        <span className={s.who}>{nameOf(p.team.rosterId)}</span>
                        <span className={s.blurb}>Average | {average(p.team)}</span>
                      </span>
                      <Movement movement={p.movement} />
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={w.empty}>No rankings yet</p>
            )}
          </section>
        </section>

        {/* The playoff picture */}
        <section id="playoffs" className={`${w.grid} ${s.section}`}>
          {/* Once the bracket is real it leads. Before then the odds lead and
              the bracket Sleeper has already seeded sits under them. */}
          {postseason && champion ? (
            <Link href={`/managers/${champion.rosterId}`} className={`${w.widget} ${w.l} ${s.champ}`}>
              <AwardIcon kind="champion" size={64} />
              <span className={s.champText}>
                <span className={w.subHead}>Champion</span>
                <span className={s.champName}>{champion.teamName}</span>
                <span className={s.who}>{nameOf(champion.rosterId)}</span>
              </span>
            </Link>
          ) : null}

          {postseason ? (
            <Widget size="l" icon="trophy" title="The bracket">
              <BracketTabs
                rounds={bracket.rounds}
                byes={bracket.byeRosterIds}
                mine={mine}
                names={names}
                kind="winners"
                empty="No bracket yet"
              />
            </Widget>
          ) : null}

          <section className={`${w.widget} ${w.l}`}>
            <WidgetHead icon="percent" title="Playoff odds" />
            {odds.length ? (
              <ol className={w.list}>
                {odds.map((row) => (
                  <li key={row.rosterId} className={row.rosterId === mine ? w.mineRow : undefined}>
                    <Link href={`/managers/${row.rosterId}`} className={s.oRow}>
                      <span className={s.oText}>
                        <span className={s.pName}>{row.team.teamName}</span>
                        <span className={s.who}>
                          {nameOf(row.rosterId)}
                        </span>
                      </span>
                      <span className={`${s.tag} ${TAG[row.tag] ?? ''}`}>{row.tag}</span>
                      <span className={s.pct}>{row.makePlayoffs.toFixed(1)}%</span>
                      <span className={s.bar} aria-hidden>
                        <span style={{ width: `${Math.max(0, Math.min(100, row.makePlayoffs))}%` }} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={w.empty}>No odds yet</p>
            )}
            <p className={s.note}>10,000 simulated seasons</p>
          </section>

          {!postseason ? (
            <section className={`${w.widget} ${w.l}`}>
              <WidgetHead icon="trophy" title="If the season ended today" aside={<span className={w.sub}>Starts week {league.playoffWeekStart}</span>} />
              <BracketTabs
                rounds={bracket.rounds}
                byes={bracket.byeRosterIds}
                mine={mine}
                names={names}
                kind="winners"
                empty="No bracket yet"
              />
            </section>
          ) : null}

          {postseason ? (
            <section className={`${w.widget} ${w.l}`}>
              <WidgetHead
                icon="toilet"
                title="The Shart Bowl"
                aside={
                  shartRoster != null ? (
                    <Link href={`/managers/${shartRoster}`} className={`${w.chip} ${w.chipHot}`}>
                      {nameOf(shartRoster)} chugs
                    </Link>
                  ) : undefined
                }
              />
              <p className={s.note}>Losers bracket | Loser chugs</p>
              <BracketTabs
                rounds={bracket.shartBowl}
                byes={byesOf(bracket.shartBowl)}
                mine={mine}
                names={names}
                kind="shart"
                empty="No losers bracket yet"
              />
            </section>
          ) : null}
        </section>
      </div>
    </Shell>
  );
}
