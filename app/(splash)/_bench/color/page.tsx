import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import {
  BeerBottle,
  Football,
  ListNumbers,
  NewspaperClipping,
  Strategy,
  Toilet,
} from '@phosphor-icons/react/dist/ssr';
import { toFeature } from '@/lib/feature';
import { getStandings, getWeekGames, matchupOfTheWeek, scoredWeek } from '@/lib/league';
import { getMatchupContext, markInPlay, winProbabilities } from '@/lib/matchup-live';
import GlassCanvas from '../../GlassCanvas';
import bench from '../../testing.module.css';
import styles from './color.module.css';

/**
 * Color, as accent over the settled base (the glow, the glass, the navy ink).
 * Three layers, each from something real:
 *
 *   Identity   every manager's own color, generated nightly from their
 *              Sleeper avatar, already in the live app
 *   State      live in the logo's red, a lead in the logo's teal, and a loss
 *              in no color at all
 *   Sections   one hue per part of the app, worn by the buttons that go there,
 *              drawn from the logo, the beer and the gouache
 *
 * Glass is kept for the blocks that earn it (the matchup); the standings and
 * the ticker sit on the ground. The buttons are direction B, clear, with their
 * color in the rim and a fill on press.
 */
export const metadata: Metadata = {
  title: { absolute: 'Color' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1&display=swap';

/** Section hues. `tone` is for glass and fills, `ink` for icons beside type. */
const SECTIONS = [
  { name: 'Matchups', tone: '#005ab4', Icon: Football, from: 'logo blue' },
  { name: 'Standings', tone: '#0696a2', Icon: ListNumbers, from: 'logo cyan' },
  { name: 'Ask the Swami', tone: '#6b4fd8', Icon: Strategy, from: 'new, violet' },
  { name: 'Read the Rag', tone: '#c0264f', Icon: NewspaperClipping, from: 'press rose' },
  { name: 'Shart of the Week', tone: '#8a5a2b', Icon: Toilet, from: 'the gouache' },
  { name: 'Chug', tone: '#c97a1e', Icon: BeerBottle, from: 'beer amber' },
];

const STATE = [
  { name: 'Live', tone: '#e3182d', note: 'logo red, games in progress' },
  { name: 'Lead, win', tone: '#12907f', note: 'logo teal, darkened for type' },
  { name: 'Loss', tone: '#5a6478', note: 'no color, on purpose' },
];

const CLEAR = { 'data-bezel': 5, 'data-body': 0.1, 'data-rim': 0.18, 'data-disp': 0.03 };

const LIFTS = [
  { n: 0, name: 'Flat', note: 'the locked sheet' },
  { n: 1, name: 'Raised', note: '' },
  { n: 2, name: 'Floating', note: '' },
  { n: 3, name: 'Hovering', note: '' },
];

const record = (t: { wins: number; losses: number; ties: number }) =>
  `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;

export default async function ColorPage({ searchParams }: { searchParams: Promise<{ lift?: string }> }) {
  const asked = Number((await searchParams).lift);
  const lift = [0, 1, 2, 3].includes(asked) ? asked : 1;
  const week = await scoredWeek();
  const [rawGames, ctx, standings] = await Promise.all([getWeekGames(week), getMatchupContext(week), getStandings()]);
  const games = markInPlay(rawGames, ctx.nfl);
  const game = matchupOfTheWeek(games);
  const f = game ? toFeature(game, 'Closest game', winProbabilities(games, ctx).get(game.matchupId)) : null;
  const table = [...standings].sort((a, b) => a.seed - b.seed).slice(0, 8);
  const ticker = games.filter((g) => g !== game).slice(0, 4);

  return (
    <div className={`${bench.stage} ${bench.glow} ${styles.switzer}`} data-stage>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      <div className={bench.orbs} aria-hidden>
        <span className={bench.orbWhite} />
        <span className={bench.orbGold} />
        <span className={bench.orbPeach} />
        <span className={bench.orbRose} />
        <span className={bench.orbBlue} />
      </div>
      <GlassCanvas className={bench.canvas} />

      <main className={styles.page}>
        <header className={styles.head}>
          <h1 className={styles.title}>Color</h1>
          <p className={styles.sub}>The base stays. Everything here is accent. Press a button.</p>
        </header>

        {/* How far the glass stands off the ground. Plain links, so each level
            is its own address to compare and share. */}
        <nav className={styles.lifts} aria-label="Glass lift">
          {LIFTS.map((l) => (
            <Link
              key={l.n}
              href={`?lift=${l.n}`}
              scroll={false}
              className={`${styles.lift} ${l.n === lift ? styles.liftOn : ''}`}
              aria-current={l.n === lift ? 'page' : undefined}
            >
              <b>{l.n}</b> {l.name}
            </Link>
          ))}
        </nav>

        {/* ---------- Identity ---------- */}
        <section className={styles.layer}>
          <h2 className={styles.layerName}>
            Identity <span>Each manager&apos;s own color, from their avatar</span>
          </h2>

          {f ? (
            <article className={`${styles.pane} ${bench.glassC}`} data-glass data-lift={lift}>
              <div className={styles.row}>
                <span className={styles.label}>{f.label}</span>
                {f.status === 'live' ? <span className={styles.live}>Live</span> : null}
              </div>
              <div className={styles.sides}>
                {[f.away, f.home].map((side, i, both) => {
                  const lead = side.points >= both[1 - i].points;
                  return (
                    <div
                      key={side.rosterId}
                      className={`${styles.side} ${i === 1 ? styles.right : ''}`}
                      style={{ '--mgr': side.primary } as CSSProperties}
                    >
                      <span className={styles.avatar}>
                        {side.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={side.avatarUrl} alt="" />
                        ) : null}
                      </span>
                      <span className={styles.team}>{side.teamName}</span>
                      <span className={styles.meta}>{side.manager}</span>
                      <span className={`${styles.hero} ${lead ? styles.leadScore : ''}`}>{side.points.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              {f.away.winProb != null && f.home.winProb != null ? (
                <div className={styles.odds}>
                  <div className={styles.oddsNums}>
                    <span>{Math.round(f.away.winProb * 100)}%</span>
                    <span className={styles.oddsLabel}>Win probability</span>
                    <span>{Math.round(f.home.winProb * 100)}%</span>
                  </div>
                  <div className={styles.bar} aria-hidden>
                    <span style={{ flex: f.away.winProb, background: f.away.primary }} />
                    <span style={{ flex: f.home.winProb, background: f.home.primary }} />
                  </div>
                  <p className={styles.line}>
                    <strong className={styles.up}>
                      {(f.away.points >= f.home.points ? f.away : f.home).teamName} up{' '}
                      {Math.abs(f.away.points - f.home.points).toFixed(2)}
                    </strong>
                  </p>
                </div>
              ) : null}
            </article>
          ) : null}

          {/* On the ground, no glass: a list does not need lifting. */}
          <div className={styles.bare}>
            <div className={styles.bareHead}>
              <span className={styles.label}>Standings</span>
            </div>
            <ol className={styles.table}>
              <li className={`${styles.tr} ${styles.thead}`} aria-hidden>
                <span />
                <span />
                <span className={styles.colhead}>W-L</span>
                <span className={`${styles.colhead} ${styles.num}`}>PF</span>
              </li>
              {table.map((t, i) => (
                <li
                  key={t.rosterId}
                  className={`${styles.tr} ${t.inPlayoffs && !table[i + 1]?.inPlayoffs ? styles.cutline : ''}`}
                >
                  <span className={styles.seed} style={{ background: t.colors.primary }}>
                    {t.seed}
                  </span>
                  <span className={styles.who}>
                    <span className={styles.rowTeam}>{t.teamName}</span>
                    <span className={styles.meta}>{t.manager}</span>
                  </span>
                  <span className={styles.cell}>{record(t)}</span>
                  <span className={`${styles.cell} ${styles.num}`}>{t.pointsFor.toFixed(2)}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- State ---------- */}
        <section className={styles.layer}>
          <h2 className={styles.layerName}>
            State <span>Small, fixed, always meaning the same thing</span>
          </h2>
          <ul className={styles.swatches}>
            {STATE.map((s) => (
              <li key={s.name} className={styles.swatch}>
                <span className={styles.chip} style={{ background: s.tone }} />
                <span className={styles.swName}>{s.name}</span>
                <span className={styles.swNote}>{s.note}</span>
              </li>
            ))}
          </ul>
          {ticker.length ? (
            <ul className={`${styles.bare} ${styles.ticker}`}>
              {ticker.map((g) => {
                const awayUp = g.away.points >= g.home.points;
                return (
                  <li key={g.matchupId} className={styles.tickRow}>
                    <span className={styles.tickTeam}>{g.away.team}</span>
                    <span className={`${styles.tickScore} ${awayUp ? styles.ahead : styles.behind}`}>
                      {g.away.points.toFixed(2)}
                    </span>
                    <span className={`${styles.tickScore} ${awayUp ? styles.behind : styles.ahead}`}>
                      {g.home.points.toFixed(2)}
                    </span>
                    <span className={`${styles.tickTeam} ${styles.tickRight}`}>{g.home.team}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        {/* ---------- Sections ---------- */}
        <section className={styles.layer}>
          <h2 className={styles.layerName}>
            Sections <span>One hue per part of the app, worn by its buttons</span>
          </h2>
          <div className={styles.buttons}>
            {SECTIONS.map(({ name, tone, Icon, from }) => (
              <div key={name} className={styles.btnRow} style={{ '--acc': tone } as CSSProperties}>
                <button type="button" className={styles.btn} data-glass="button" data-tint={tone} {...CLEAR}>
                  <Icon className={styles.icon} weight="regular" aria-hidden />
                  {name}
                </button>
                <span className={styles.from}>
                  <span className={styles.dot} style={{ background: tone }} />
                  {tone} <span>{from}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
