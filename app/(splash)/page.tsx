import type { Metadata } from 'next';
import { statWords } from './kit/statWords';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';
import { TROPHIES } from '@/components/Trophy';
import type { FeatureData } from '@/components/FeatureMatchup';
import type { LineupSlot } from '@/lib/types';
import { firstNameOf } from '@/config/managers';
import { anyGameLive, getNflScoreboard } from '@/lib/espn';
import { toFeature } from '@/lib/feature';
import { photosForWeek } from '@/lib/game-photos';
import { getHighlights } from '@/lib/highlights';
import { getPowerRankings, getStandings, getTopPerformers, getWeekGames, matchupOfTheWeek, scoredWeek, teamByRoster, teams } from '@/lib/league';
import { getPlayoffOdds } from '@/lib/playoff-odds';
import { getTrades } from '@/lib/trades';
import { getFeedPosts } from '@/lib/feed';
import { buildFeed } from '@/lib/feed-view';
import { getMatchupContext, markInPlay, winProbabilities } from '@/lib/matchup-live';
import { formatStatLine } from '@/lib/sleeper-live';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { publishedWeeks, readIssue } from '@/lib/rag';
import { artForArticles, featuredPlayers, type StoryArt } from '@/lib/story-images';
import { getTrophyBoard } from '@/lib/trophies';
import { latestChug } from '@/lib/chug-video';
import { latestWeekStory } from '@/lib/week-story';
import { MenuNav } from './menus';
import bench from './testing.module.css';
import { PillLink } from './home/Glass';
import Lanes from './home/Lanes';
import CountUp from './home/CountUp';
import Squirt, { type Mood } from './home/Squirt';
import soul from './home/soul.module.css';
import { getChugCounts } from '@/lib/awards';
import { leagueVerdicts, oracleFor } from '@/lib/squirt-says';
import { BottomLine, HandOff, ScoreBug } from './home/Ticker';
import { MarkDropRefined } from './marks';
import Media from './home/Media';
import Head from './home/Head';
import ShartCitation from './home/ShartCitation';
import AwardIcon from './home/Awards';
import Pattern from './home/Pattern';
import SquirtSays from './home/SquirtSays';
import Moments from './home/Moments';
import Intro from './home/Intro';
import ChugPop from './home/ChugPop';
import Guide from './home/Guide';
import { embedClipsForWeek } from './lib/embed-clips';
import { HANDS, handHref, type HandKey } from './home/hands';
import TheDrop from './home/TheDrop';
import type { CSSProperties } from 'react';
import Icon from './home/Icons';
import Widget, { WidgetHead } from './home/Widget';
import { ClipRail, ChugMeter, FeedDigest, LatestTrade, NflScores, QuickLinks, RagHero, Scoreboard, StandingsWidget, TopScorers } from './home/Widgets';
import w from './home/widgets.module.css';
import styles from './home/home.module.css';

/**
 * Home, reworked in Pool, with the flow of the live v2 home. Every figure,
 * photo and film here is the league's own, from the same sources v2 uses.
 *
 *   Menu        the marker on the scrolling bar, powder for selection
 *   Headline    the week, said plainly in the Rag's voice, instead of "Home"
 *   Ticker      two labelled lanes, League and NFL, frameless and drifting
 *   Film        the week in 90 seconds and the latest chug, as tiles
 *   The Rag     a photo led carousel, the lead story first
 *   Your game   your matchup if you have picked a team, else the closest game
 *   Hardware    this week's trophies, a carousel
 *   Shart       the milky, dirty pane
 *   Standings   the top eight, the playoff line ruled
 *
 * Pool's jobs: powder for structure and selection; lime for emphasis only
 * (the winning score, "live" in the headline); deep blue for links, live
 * drops and accents in type.
 */
export const metadata: Metadata = {
  title: { absolute: 'Splash' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';

const record = (t: { wins: number; losses: number; ties: number }) =>
  `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;

const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

/** The wordmark: Splash, in Switzer, tight, beside the drop. */
function Wordmark() {
  return <span className={styles.wordmark}>Splash</span>;
}

/** The app's name and the week on one line. */
function TopLine({ week, live, inFlow = false }: { week: number; live: boolean; inFlow?: boolean }) {
  return (
    <div className={`${styles.topLine} ${inFlow ? styles.topLineFlow : ''}`}>
      <Link href="/" className={styles.topBrand} data-brand-lockup aria-label="Splash, home">
        <span className={styles.mastMark} data-brand-mark>
          <MarkDropRefined />
        </span>
        <Wordmark />
      </Link>
      <span className={styles.topWeek}>
        {live ? (
          <svg viewBox="0 0 64 64" className={styles.topDrop} aria-hidden>
            <path d={DROP} />
          </svg>
        ) : null}
        Week {week}
      </span>
    </div>
  );
}

/**
 * A matchup as a score bug: one row per team, the way a broadcast shows it.
 * Left, a small ringed avatar, the team and its manager; right, the score and
 * where it is heading. Then the odds on one line, and the way to every game.
 */
type Lore = { text: string; hot?: boolean }[];

function Matchup({
  f,
  href,
  nudge = false,
  lore,
  annotate = false,
  theatre = false,
  lastMet = null,
  topScorer = null,
}: {
  f: FeatureData;
  href: string;
  nudge?: boolean;
  /** Lore: what this season says about each side, by roster. */
  lore?: Record<number, Lore>;
  /** Voice: a marker circle and a note on a score that is getting buried. */
  annotate?: boolean;
  /** Theatre: scores count up and the live drop drips. */
  theatre?: boolean;
  /** Grudges: how it went the last time these two met. */
  lastMet?: string | null;
  /** The game's top scorer so far, across both sides. */
  topScorer?: { player: LineupSlot; owner: string; line: string } | null;
}) {
  const { away, home } = f;
  const gap = Math.abs(away.points - home.points);
  const hasModel = away.winProb != null && home.winProb != null;
  const awayRaw = Math.round((away.winProb ?? 0) * 100);
  const awayPct = f.status === 'final' ? awayRaw : Math.min(99, Math.max(1, awayRaw));
  const live = f.status === 'live';
  return (
    <article className={`${styles.bug} ${w.l}`}>
      {/* The whole card opens the matchup, in one tap. The pick link sits
          above it so it still goes to settings. */}
      <Link href={href} className={styles.bugLink} aria-label={`Open ${away.teamName} v ${home.teamName}`} />
      <WidgetHead
        icon="helmet"
        title={f.label}
        extra={
          nudge ? (
            <Link href="/settings" className={styles.pick}>
              Pick your team
            </Link>
          ) : null
        }
        aside={
          live ? (
            <span className={styles.live}>
              <svg viewBox="0 0 64 64" className={`${styles.liveDrop} ${theatre ? soul.drip : ''}`} aria-hidden>
                <path d={DROP} />
              </svg>
              Live
            </span>
          ) : (
            <span className={styles.state}>{f.status === 'final' ? 'Final' : 'Upcoming'}</span>
          )
        }
      />
      <CaretRight weight="bold" className={styles.bugCaret} aria-hidden />

      <div className={styles.bugRows}>
        {[away, home].map((side, i, both) => {
          const lead = side.points >= both[1 - i].points;
          const ahead: string[] = [];
          if (f.status !== 'final' && side.projected != null) ahead.push(`Projected ${side.projected.toFixed(1)}`);
          if (live) ahead.push(`${side.yetToPlay} to play`);
          return (
            <div key={side.rosterId} className={styles.bugRow}>
              <span className={styles.bugAvatar}>
                {side.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={side.avatarUrl} alt="" />
                ) : null}
              </span>
              <span className={styles.bugWho}>
                <span className={styles.bugTeam}>{side.teamName}</span>
                <span className={styles.sub}>
                  {side.manager}, {side.record}
                </span>
                {lore?.[side.rosterId]?.length ? (
                  <span className={soul.lore}>
                    {lore[side.rosterId].map((l) => (
                      <span key={l.text} className={`${soul.loreChip} ${l.hot ? soul.loreHot : ''}`}>
                        {l.text}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
              <span className={styles.bugRight}>
                <span className={`${styles.bugScore} ${lead ? styles.winning : ''}`}>
                  {/* Buried by 25 or more: the group chat circles it. */}
                  {annotate && !lead && gap >= 25 ? (
                    <span className={soul.ouch}>
                      <svg className={soul.circle} viewBox="0 0 120 50" preserveAspectRatio="none" aria-hidden>
                        <path d="M8 26 C 6 10, 40 3, 66 4 C 96 5, 116 13, 113 27 C 110 42, 76 48, 50 46 C 22 44, 4 38, 9 22 C 11 15, 20 10, 30 8" />
                      </svg>
                      <span className={soul.note}>ouch</span>
                      <span>{theatre ? <CountUp value={side.points} /> : side.points.toFixed(2)}</span>
                    </span>
                  ) : (
                    <span>{theatre ? <CountUp value={side.points} /> : side.points.toFixed(2)}</span>
                  )}
                </span>
                {ahead.length ? <span className={styles.sub}>{ahead.join(', ')}</span> : null}
              </span>
            </div>
          );
        })}
      </div>

      {hasModel ? (
        <div className={styles.oddsLine}>
          {/* Rounded once, so the two sides always total 100, and never 100
              to 0 until it's final: the same rule as every win bar. */}
          <b>{awayPct}%</b>
          <span className={styles.bar} aria-hidden>
            {/* The favorite in deep blue, the other side in powder. */}
            <span className={away.winProb! >= home.winProb! ? styles.barFav : styles.barDog} style={{ flex: away.winProb! }} />
            <span className={away.winProb! >= home.winProb! ? styles.barDog : styles.barFav} style={{ flex: home.winProb! }} />
          </span>
          <b>{100 - awayPct}%</b>
        </div>
      ) : null}

      {topScorer ? (
        <div className={styles.topScorer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={topScorer.player.headshot} alt="" loading="lazy" />
          <span className={styles.tsText}>
            <span className={styles.tsLabel}>Top scorer | {topScorer.owner}</span>
            <b>{topScorer.player.name}</b>
            {topScorer.line ? <span className={styles.tsLine}>{topScorer.line}</span> : null}
          </span>
          <span className={styles.tsPts}>{topScorer.player.points.toFixed(2)}</span>
        </div>
      ) : null}

      {lastMet ? <p className={styles.lastMet}>{lastMet}</p> : null}

      <div className={styles.bugFoot}>
        <span className={styles.sub}>{hasModel ? 'Chance to win' : ''}</span>
        <PillLink href={href} small>
          All matchups
        </PillLink>
      </div>
    </article>
  );
}

/** A Rag story's art: the photo, or the player cut out on powder. */
function Art({ art }: { art?: StoryArt }) {
  if (!art) return <span className={styles.artEmpty} aria-hidden />;
  if (art.kind === 'photo') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={art.src} alt="" className={styles.artPhoto} />;
  }
  return (
    <span className={styles.artPlayer}>
      {art.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art.logo} alt="" className={styles.artLogo} />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art.cutout} alt="" className={styles.artCutout} />
    </span>
  );
}

const TREATMENTS = [
  { n: 1, name: 'Bottom line' },
  { n: 2, name: 'Hand-off' },
  { n: 3, name: 'Score bug' },
  { n: 4, name: 'In the hero' },
] as const;

const TOPS = [
  { n: 1, name: 'Collapse on scroll' },
  { n: 2, name: 'Soft edge' },
  { n: 3, name: 'One capsule' },
  { n: 4, name: 'Mark in the menu' },
] as const;

export default async function ReworkedHome({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; top?: string; soul?: string; bg?: string; moment?: string; mast?: string; intro?: string; live?: string; hand?: string }>;
}) {
  const sp = await searchParams;
  // Soul layers, each switchable while Matt judges them: Voice, Squirt,
  // Lore, Theatre. All on by default.
  const soulOn = (sp as { soul?: string }).soul ?? 'vslt';
  const V = soulOn.includes('v');
  const S = soulOn.includes('s');
  const L = soulOn.includes('l');
  const T = soulOn.includes('t');
  // The paper's pattern, being judged: relief, depth, wallpaper, or none.
  const BGS = ['relief', 'depth', 'wallpaper', 'none'] as const;
  const bg = (BGS as readonly string[]).includes(sp.bg ?? '') ? (sp.bg as (typeof BGS)[number]) : 'wallpaper';
  const asked = Number(sp.t);
  const t = [1, 2, 3, 4].includes(asked) ? asked : 1;
  // Which top bar treatment is showing, while Matt chooses.
  const askedTop = Number(sp.top);
  const top = [1, 2, 3, 4].includes(askedTop) ? askedTop : 2;
  const week = await scoredWeek();
  const [rawGames, standings, ctx, nfl, trophies, jar, performers, power, odds, chugs, trades, posts] = await Promise.all([
    getWeekGames(week),
    getStandings(),
    getMatchupContext(week),
    getNflScoreboard().catch(() => []),
    getTrophyBoard(),
    cookies(),
    getTopPerformers(week),
    getPowerRankings(),
    getPlayoffOdds().catch(() => []),
    getChugCounts().catch(() => []),
    getTrades().catch(() => []),
    getFeedPosts(8).catch(() => []),
  ]);
  const games = markInPlay(rawGames, ctx.nfl);
  const models = winProbabilities(games, ctx);

  // Your game if you have picked a team; otherwise the closest one.
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const myGame = mine != null ? games.find((g) => g.away.rosterId === mine || g.home.rosterId === mine) : undefined;
  const closest = matchupOfTheWeek(games);
  const shown = myGame ?? closest;
  const f = shown ? toFeature(shown, myGame ? 'Your game' : 'The nail-biter', models.get(shown.matchupId)) : null;

  // The headline: where the week stands, in plain words.
  const onField = games.filter((g) => g.inPlay).length;
  const allFinal = games.length > 0 && games.every((g) => g.status === 'final');
  const underway = games.some((g) => g.status === 'live');
  const liveNow = anyGameLive(nfl);

  // Film.
  const slides = await latestWeekStory(week).catch(() => []);
  const intro = slides.find((s) => s.kind === 'intro');
  const storyWeek = intro && intro.kind === 'intro' ? intro.week : null;
  const cover = intro && intro.kind === 'intro' ? intro.art.still : null;
  const chug = latestChug(week);

  // The Rag, with its own week's art.
  const ragWeeks = publishedWeeks();
  const ragWeek = ragWeeks.length ? ragWeeks[ragWeeks.length - 1] : null;
  const issue = ragWeek ? readIssue(ragWeek) : null;
  const articles = (issue?.articles ?? []).filter((a) => !a.retracted).slice(0, 8);
  const [ragClips, ragFeatured] = ragWeek
    ? await Promise.all([getHighlights(ragWeek, 200), featuredPlayers(ragWeek)])
    : [[], []];
  const art = artForArticles(
    articles,
    ragClips,
    Object.fromEntries(teams.map((t) => [String(t.rosterId), t.manager])),
    ragFeatured,
    ragWeek ? photosForWeek(ragWeek) : [],
  );

  // The scores, shaped once for whichever ticker treatment is showing.
  const league = games.map((g) => ({
    id: g.matchupId,
    away: g.away.team,
    awayPts: g.away.points,
    home: g.home.team,
    homePts: g.home.points,
    live: Boolean(g.inPlay),
  }));
  const nflLines = nfl.map((g) => ({
    id: g.id,
    away: g.away.abbr,
    awayLogo: g.away.logo,
    awayScore: g.state === 'pre' ? null : g.away.score,
    home: g.home.abbr,
    homeLogo: g.home.logo,
    homeScore: g.state === 'pre' ? null : g.home.score,
    status: g.status,
    live: g.state === 'in',
  }));
  const bug = shown
    ? {
        label: myGame ? 'Your game' : 'Closest game',
        away: shown.away.team,
        awayPts: shown.away.points,
        home: shown.home.team,
        homePts: shown.home.points,
        live: Boolean(shown.inPlay),
      }
    : null;

  // ---------- Soul ----------

  // Whose eyes the page sees through: your side if you have picked a team,
  // else nobody's (the closest game, watched neutrally).
  const mySide = f && mine != null ? [f.away, f.home].find((x) => x.rosterId === mine) : undefined;
  const theirSide = f && mySide ? (f.away === mySide ? f.home : f.away) : undefined;

  // Squirt's mood.
  let mood: Mood = 'calm';
  if (f) {
    const live = f.status === 'live';
    if (mySide && theirSide) {
      const lead = mySide.points - theirSide.points;
      if (f.status === 'final') mood = lead >= 0 ? 'smug' : 'gloom';
      else if (lead >= 15) mood = 'smug';
      else if (lead <= -15) mood = 'gloom';
      else if (live) mood = 'sweat';
    } else if (live && Math.abs(f.away.points - f.home.points) < 15) mood = 'sweat';
  }

  const nameOf = (rosterId: number) => firstNameOf(rosterId) ?? teamByRoster(rosterId)?.manager ?? '';
  // Whose app this is, once a team is picked.
  const you = mine != null ? nameOf(mine) || null : null;

  // The voice: the headline takes a side, in the league's terms. One phrase
  // in it is marked with the highlighter, the only lime on text. With a team
  // picked it talks to you; otherwise it calls the closest game.
  let voiceLine: [string, string, string] | null = null;
  if (f && mySide && theirSide && you) {
    const lead = mySide.points - theirSide.points;
    const m = Math.abs(lead).toFixed(1);
    const opp = theirSide.teamName;
    if (mySide.points === 0 && theirSide.points === 0) voiceLine = [`${you}, it’s you against ${opp}.`, '', ''];
    else if (f.status === 'final')
      voiceLine = lead >= 0 ? [`${you}, you `, 'took it', `. ${opp} takes the long walk.`] : [`${you}, ${opp} got you. That’s `, 'the long walk', '.'];
    else if (lead >= 40) voiceLine = [`${you}, you’re `, 'cooking', `. ${opp} is not.`];
    else if (lead >= 15) voiceLine = [`${you}, you’re up ${m}. `, "Don’t get cute", '.'];
    else if (lead <= -15)
      voiceLine = mySide.yetToPlay
        ? [`${you}, you’re down ${m} with `, `${mySide.yetToPlay} to play`, '.']
        : [`${you}, you’re down ${m} and `, 'out of bullets', '.'];
    else voiceLine = [`${you}, ${m} in it. `, 'Nobody breathe', '.'];
  } else if (f) {
    const [lead, trail] = f.away.points >= f.home.points ? [f.away, f.home] : [f.home, f.away];
    const m = lead.points - trail.points;
    if (lead.points === 0 && trail.points === 0) voiceLine = [`${f.away.teamName} against ${f.home.teamName}.`, '', ''];
    else if (f.status === 'final') voiceLine = [`${lead.teamName} took it. ${trail.teamName} takes `, 'the long walk', '.'];
    else if (m >= 40) voiceLine = [`${lead.teamName} is `, 'cooking', `. ${trail.teamName} is not.`];
    else if (m >= 15)
      voiceLine = trail.yetToPlay
        ? [`${lead.teamName} up ${m.toFixed(1)}. ${trail.teamName} has `, `${trail.yetToPlay} left`, ' to play.']
        : [`${lead.teamName} up ${m.toFixed(1)}. ${trail.teamName} is `, 'out of bullets', '.'];
    else voiceLine = [`${lead.teamName} and ${trail.teamName}, ${m.toFixed(2)} apart. `, 'Nobody breathe', '.'];
  }

  // Squirt says: his reads on the week's lineups, yours first, then the rest
  // of the league's, up to six. Tapping him moves through them.
  let sayings: string[] = [];
  if (V || S) {
    try {
      const oracle = await oracleFor(week);
      const verdicts = leagueVerdicts(oracle.sides, oracle.input);
      const ordered = [...verdicts.filter((v) => v.rosterId === mine), ...verdicts.filter((v) => v.rosterId !== mine)];
      // Squirt's reads name players by initial; spell them out in full.
      const full = (text: string, ps: (LineupSlot | undefined)[]) =>
        ps.reduce((t, p) => (p && p.short && p.short !== p.name ? t.split(p.short).join(p.name) : t), text);
      sayings = ordered.slice(0, 6).map((v) => full(v.saying, [v.player, v.other]));
    } catch {
      sayings = [];
    }
  }

  // Lore: what this season says about a team, for the score card and every
  // row of the scoreboard. Hot chips are the bad news.
  // Clean labels, not sentences: "3 game win streak", "Manager of the
  // Week | W1, W3". The chug is the Shart's penalty, so it is not a chip of
  // its own.
  const weeksOf = (kind: string, rosterId: number) =>
    trophies.all
      .filter((a) => a.kind === kind && a.rosterId === rosterId && a.week != null)
      .map((a) => a.week as number)
      .sort((x, y) => x - y)
      .map((w) => `W${w}`)
      .join(', ');
  const loreOf = (rosterId: number): Lore => {
    const t = standings.find((x) => x.rosterId === rosterId);
    const out: Lore = [];
    const streak = t?.streak ?? '';
    const n = Number(streak.slice(1));
    if (n >= 2) out.push({ text: streak.startsWith('W') ? `${n} game win streak` : `${n} game losing streak`, hot: streak.startsWith('L') });
    const sharts = weeksOf('shart', rosterId);
    if (sharts) out.push({ text: `Shart | ${sharts}`, hot: true });
    const motw = weeksOf('motw', rosterId);
    if (motw) out.push({ text: `Manager of the Week | ${motw}` });
    return out;
  };
  const loreBy: Record<number, Lore> = {};
  if (L) for (const t of standings) loreBy[t.rosterId] = loreOf(t.rosterId).slice(0, 2);

  // Grudges: the last time the two sides of the game shown met this season.
  let lastMet: string | null = null;
  if (f && L) {
    for (let w = week - 1; w >= 1 && !lastMet; w--) {
      const past = await getWeekGames(w).catch(() => []);
      const g = past.find((x) => [x.away.rosterId, x.home.rosterId].includes(f.away.rosterId) && [x.away.rosterId, x.home.rosterId].includes(f.home.rosterId));
      if (g && g.status === 'final') {
        const [win, lose] = g.away.points >= g.home.points ? [g.away, g.home] : [g.home, g.away];
        lastMet = `Last met week ${w}: ${win.team} won, ${win.points.toFixed(2)} to ${lose.points.toFixed(2)}.`;
      }
    }
  }

  // A player's real line this week, as a broadcast reads it.
  const statLineOf = (p: LineupSlot) => statWords(formatStatLine(p.position, ctx.stats[p.id]?.stats));

  // The game's top scorer so far, across both sides: one bug, not two.
  let topScorer: { player: LineupSlot; owner: string; line: string } | null = null;
  if (shown) {
    for (const side of [shown.away, shown.home]) {
      for (const p of side.lineup) {
        if (p.points > 0 && (!topScorer || p.points > topScorer.player.points)) {
          topScorer = { player: p, owner: nameOf(side.rosterId), line: statLineOf(p) };
        }
      }
    }
  }

  // The tape: the week's NFL clips, tagged to the league. The rails play
  // clips in place, so they read the broadcasters' channels, whose embeds
  // play, and the score cards take their stills from the same read.
  const playable = await embedClipsForWeek(week).catch(() => []);
  const rosterOf = new Map<string, { rosterId: number; started: boolean }>();
  for (const g of games)
    for (const side of [g.away, g.home]) {
      for (const p of side.lineup) rosterOf.set(p.id, { rosterId: side.rosterId, started: true });
      for (const p of side.bench ?? []) if (!rosterOf.has(p.id)) rosterOf.set(p.id, { rosterId: side.rosterId, started: false });
    }
  const clipOwner = (playerId: string) => {
    const r = rosterOf.get(playerId);
    return r ? { name: nameOf(r.rosterId), started: r.started } : null;
  };
  // At most two clips of any one player per rail, so one big day doesn't
  // fill it.
  const capPerPlayer = <T extends { playerIds: string[] }>(list: T[], cap = 2) => {
    const seen = new Map<string, number>();
    return list.filter((c) => {
      const lead = c.playerIds[0];
      if (!lead) return true;
      const n = seen.get(lead) ?? 0;
      seen.set(lead, n + 1);
      return n < cap;
    });
  };
  // Plays that hit the league: clips with a rostered player, starters first.
  const leagueClips = capPerPlayer(playable
    .filter((c) => c.playerIds.some((id) => rosterOf.has(id)))
    .sort((a, b) => Number(b.playerIds.some((id) => rosterOf.get(id)?.started)) - Number(a.playerIds.some((id) => rosterOf.get(id)?.started))))
    .slice(0, 12);
  // Your game's tape: clips of anyone in the game shown.
  const gameIds = new Set(shown ? [shown.away, shown.home].flatMap((x) => [...x.lineup, ...(x.bench ?? [])].map((p) => p.id)) : []);
  const gameClips = capPerPlayer(playable.filter((c) => c.playerIds.some((id) => gameIds.has(id)))).slice(0, 8);
  // NFL cards: each game's first clip naming either team. ESPN writes
  // Washington as WSH where the clips (Sleeper style) write WAS.
  const sleeperAbbr = (a: string) => (a === 'WSH' ? 'WAS' : a);
  const nflStills: Record<string, string> = {};
  for (const g of nfl) {
    const teams = [sleeperAbbr(g.away.abbr), sleeperAbbr(g.home.abbr)];
    const hit = playable.find((c) => c.nflTeams.some((t) => teams.includes(t)));
    if (hit) nflStills[g.id] = hit.still;
  }

  // Moments: did your win go final, are you the week's Shart.
  const won = Boolean(f && mySide && theirSide && f.status === 'final' && mySide.points > theirSide.points);
  const latestShart = trophies.latest.find((a) => a.kind === 'shart');
  const sharted = mine != null && latestShart?.rosterId === mine;
  // Sundays and Mondays, the league live leads the Home, ahead of the Rag.
  // The day is the league's, Central time. ?live=1 shows it on any day.
  const leagueDay = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'America/Chicago' }).format(new Date());
  const askedLive = (sp as { live?: string }).live;
  const liveDay = askedLive === '1' || (askedLive !== '0' && (leagueDay === 'Sunday' || leagueDay === 'Monday'));
  const liveGames = games.map((g) => {
    const lf = toFeature(g, '', models.get(g.matchupId));
    const side = (x: typeof lf.away) => ({ rosterId: x.rosterId, teamName: x.teamName, points: x.points, done: x.done, yetToPlay: x.yetToPlay, inPlay: x.inPlay, winProb: x.winProb });
    return { matchupId: g.matchupId, away: side(lf.away), home: side(lf.home) };
  });

  // The Rag's nameplate: the red top, Matt's pick. The others stay on the
  // bench behind ?mast=.
  const askedMast = (sp as { mast?: string }).mast;
  const MASTS = ['blackletter', 'redtop', 'period', 'tabloid', 'broadsheet', 'plain'] as const;
  const mast = (MASTS as readonly string[]).includes(askedMast ?? '') ? (askedMast as (typeof MASTS)[number]) : 'redtop';
  const askedHand = (sp as { hand?: string }).hand;
  const hand: HandKey = askedHand && askedHand in HANDS ? (askedHand as HandKey) : 'sharpie';
  const askedMoment = (sp as { moment?: string }).moment;
  const forceMoment = askedMoment === 'win' || askedMoment === 'flush' || askedMoment === 'pour' ? askedMoment : null;

  // Who rosters each of the week's top scorers, by first name.
  const owners = new Map<string, number>();
  for (const g of games) for (const side of [g.away, g.home]) for (const p of side.lineup) owners.set(p.id, side.rosterId);
  const ownerOf = (playerId: string) => {
    const r = owners.get(playerId);
    return r != null ? nameOf(r) : null;
  };

  return (
    <div
      className={`${bench.stage} ${styles.pool}`}
      data-stage
      style={{ '--hand': HANDS[hand].css, '--hand-scale': String(HANDS[hand].scale), '--hand-weight': String(HANDS[hand].weight) } as CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      {/* The hand: Rock Salt, Matt's pick, for Squirt's scribbles and nothing
          else. The other candidates stay on the bench behind ?hand=. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={handHref(hand)} precedence="default" />
      {/* The blackletter nameplate's face, only while that one is being judged. */}
      {mast === 'blackletter' ? (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&display=swap" precedence="default" />
      ) : null}
      {bg !== 'none' ? <Pattern mode={bg} /> : null}

      {/* The top: the app's name and the week, floating above the menu, and
          the menu itself. No band behind any of it. */}
      {/* The name and the week, as one line. Where it lives depends on the
          top bar treatment being judged. */}
      {top === 1 ? <TopLine week={week} live={onField > 0 || liveNow} inFlow /> : null}

      <div className={`${styles.top} ${top === 2 ? styles.topSoft : ''} ${top === 3 ? styles.topCapsule : ''}`}>
        {top === 2 ? <span className={styles.edge} aria-hidden /> : null}
        {top === 2 || top === 3 ? <TopLine week={week} live={onField > 0 || liveNow} /> : null}
        <div className={styles.menuDock}>
          <MenuNav active="home" />
        </div>
      </div>

      <main className={`${styles.page} ${t === 1 ? styles.clearBottom : ''}`}>
        {/* The home screen: the wallpaper behind, widgets on it. The Rag
            leads, then the week in Squirt's voice, then everything v2's Home
            carried, each in its own widget. */}
        <div className={w.grid}>
          {liveDay ? (
            <TheDrop
              games={liveGames}
              day={leagueDay === 'Sunday' || leagueDay === 'Monday' ? leagueDay : 'Game day'}
              live={liveNow || onField > 0}
              mine={mine}
              nameOf={nameOf}
              week={week}
            />
          ) : null}
          {articles.length && ragWeek ? (
            <RagHero
              week={ragWeek}
              articles={articles.filter((a) => a.id !== 'shart')}
              total={articles.length}
              art={art}
              mast={mast}
              publishedAt={issue?.publishedAt ?? null}
            />
          ) : null}

          <Media slides={slides} storyWeek={storyWeek} cover={cover} chug={chug} tiles />

          <ShartCitation />

          {/* Squirt says: the drop in the heading like every widget, Squirt
              himself on the left, his two lines in quoted bubbles beside him. */}
          {(V && voiceLine) || sayings.length ? (
            <Widget size="m" icon="drop" title="Squirt says" href={`/scoreboard/${week}`} more="Every lineup">
              <SquirtSays mood={mood} lead={V ? voiceLine : null} sayings={sayings} />
            </Widget>
          ) : null}

          {f ? (
            <Matchup f={f} href={`/scoreboard/${week}/${f.matchupId}`} nudge={!myGame} lore={L ? loreBy : undefined} annotate={V} theatre={T} lastMet={lastMet} topScorer={topScorer} />
          ) : null}

          {gameClips.length ? (
            <ClipRail title={myGame ? 'Your game, on tape' : 'This game, on tape'} icon="helmet" clips={gameClips} ownerOf={clipOwner} size="m" />
          ) : null}

          <Scoreboard games={games} week={week} mine={mine} chipOf={(r) => (L ? loreOf(r)[0] ?? null : null)} nameOf={nameOf} />

          {trophies.latest.length ? (
            <Widget size="m" icon="trophy" title="Hardware" href="/trophies" more="Trophy case">
              <div className={`${styles.rail} ${styles.chipRail} ${w.inRail}`}>
                {trophies.latest.map((award) => (
                  <div key={award.kind} className={styles.trophy}>
                    <AwardIcon kind={award.kind} />
                    <span className={styles.trophyText}>
                      <span className={styles.trophyName}>{TROPHIES[award.kind].name}</span>
                      <span className={styles.trophyWinner}>{nameOf(award.rosterId)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Widget>
          ) : null}

          <ChugMeter tallies={chugs} nameOf={nameOf} mine={mine} />
          <LatestTrade trade={trades[0]} />

          <TopScorers players={performers} ownerOf={ownerOf} statLineOf={statLineOf} />

          <ClipRail title="Plays that hit the league" icon="play" clips={leagueClips} ownerOf={clipOwner} />

          <NflScores games={nfl} week={week} stills={nflStills} />

          <FeedDigest items={buildFeed(posts, []).slice(0, 4)} />

          <StandingsWidget standings={standings} power={power} oddsCount={odds.length} mine={mine} />

          <QuickLinks />
        </div>
      </main>

      <Intro force={sp.intro === '1'} />
      <Guide />
      {/* The chug pops up itself now, so the pour toast stands down. */}
      <Moments week={week} won={won} sharted={sharted} chugWeek={null} name={you} force={forceMoment} />
      {chug ? (
        <ChugPop
          week={chug.week}
          src={chug.src}
          who={(() => {
            const shart = trophies.all.find((a) => a.kind === 'shart' && a.week === chug.week);
            return shart ? nameOf(shart.rosterId) : null;
          })()}
        />
      ) : null}

      {t === 1 ? <BottomLine league={league} nfl={nflLines} /> : null}
      {t === 3 ? <ScoreBug league={league} nfl={nflLines} bug={bug} /> : null}
    </div>
  );
}
