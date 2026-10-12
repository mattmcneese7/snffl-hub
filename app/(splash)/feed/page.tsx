import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { firstNameOf } from '@/config/managers';
import { getFeedPosts } from '@/lib/feed';
import { biggest, buildFeed, facetsOf, forManager, type FeedItem } from '@/lib/feed-view';
import { getHighlights, isEspnClip, isRelevantClip, type Highlight } from '@/lib/highlights';
import { allPlayers, getWeekGames, playerOf, scoredWeek, teamByRoster, teams } from '@/lib/league';
import { managerNames } from '@/lib/manager-names';
import { recentMovement, timing, type MovementEvent, type MovementKind } from '@/lib/movement';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { weekCardClip } from '@/lib/reel-clips';
import type { Game, GameSide } from '@/lib/types';
import Shell from '../kit/Shell';
import PageHead from '../kit/PageHead';
import Widget, { WidgetHead } from '../home/Widget';
import { embedClipsForWeek, type EmbedClip } from '../lib/embed-clips';
import { isPhone } from '../lib/device';
import ClipPlayerRail, { type RailClip } from '../home/ClipPlayer';
import Record from './Record';
import Stories, { type Slide, type StoryManager } from './Stories';
import { LinkedText, markClass, MARK, MomentRow } from './Rows';
import w from '../home/widgets.module.css';
import f from './feed.module.css';

export const metadata: Metadata = { title: { absolute: 'The Feed, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const FANTASY_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K']);
const MOVE_MARK: Record<MovementKind, string> = { start: 'START', bench: 'BENCH', add: 'ADD', drop: 'DROP' };

/**
 * A movement line with every player named in full. The lib's sentence uses
 * the short "A. Jeanty" form; this is the same sentence, same rules (a paired
 * swap reads as one decision), with the full names Splash uses everywhere.
 */
function sayingOf(e: MovementEvent, pts: (id: string) => string): string {
  const player = (playerOf(e.playerId).name || e.player) + pts(e.playerId);
  const other = e.otherId ? (playerOf(e.otherId).name || e.other) + pts(e.otherId) : null;
  switch (e.kind) {
    case 'start':
      return other ? `${e.manager} started ${player} over ${other}.` : `${e.manager} started ${player}.`;
    case 'bench':
      return `${e.manager} benched ${player}.`;
    case 'add':
      return `${e.manager} added ${player}.`;
    case 'drop':
      return `${e.manager} dropped ${player}.`;
  }
}

/** Who held a player in a given week: his roster, started or not, his points. */
type Hold = { rosterId: number; started: boolean; points: number; name: string };

function holdings(games: Game[]): Map<string, Hold> {
  const out = new Map<string, Hold>();
  for (const g of games)
    for (const side of [g.away, g.home]) {
      for (const p of side.lineup) out.set(p.id, { rosterId: side.rosterId, started: true, points: p.points, name: p.name });
      for (const p of side.bench ?? []) if (!out.has(p.id)) out.set(p.id, { rosterId: side.rosterId, started: false, points: p.points, name: p.name });
    }
  return out;
}

type CardSide = { side: GameSide; opponent: GameSide; status: Game['status']; week: number; matchupId: number };

function sidesOf(list: Game[], week: number): Map<number, CardSide> {
  const out = new Map<number, CardSide>();
  for (const g of list) {
    out.set(g.home.rosterId, { side: g.home, opponent: g.away, status: g.status, week, matchupId: g.matchupId });
    out.set(g.away.rosterId, { side: g.away, opponent: g.home, status: g.status, week, matchupId: g.matchupId });
  }
  return out;
}

/**
 * The Feed, in Splash. Everything v2's Feed has, in widgets: the manager
 * stories, the week's movement, your week, the replays, what mattered and
 * the full record with its filters.
 *
 * Clips come from the broadcasters' YouTube channels (lib/embed-clips.ts),
 * never the NFL's own, whose embeds refuse to play off YouTube, so the
 * Replays rail plays them in place the way the Home rails do. The tagger's
 * stored rows are the NFL's own clips: they stay in the record as links out
 * and never reach the rail. Moments are the live
 * watcher's posts, read from Supabase the same way v2 reads them, and any
 * read that fails comes back empty rather than taking the page down.
 */
export default async function FeedPage() {
  const week = await scoredWeek();
  const prevWeek = week > 1 ? week - 1 : null;
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);

  const [posts, stored, movement, games, prevGames, clipsNow, clipsPrev, phone] = await Promise.all([
    getFeedPosts().catch(() => []),
    getHighlights(undefined, 200).catch((): Highlight[] => []),
    recentMovement(week).catch(() => []),
    getWeekGames(week).catch((): Game[] => []),
    prevWeek ? getWeekGames(prevWeek).catch((): Game[] => []) : Promise.resolve([] as Game[]),
    embedClipsForWeek(week).catch((): EmbedClip[] => []),
    prevWeek ? embedClipsForWeek(prevWeek).catch((): EmbedClip[] => []) : Promise.resolve([] as EmbedClip[]),
    isPhone(),
  ]);

  const nameOf = (rosterId: number) => firstNameOf(rosterId) ?? teamByRoster(rosterId)?.manager ?? '';
  const holdNow = holdings(games);
  const holdPrev = holdings(prevGames);
  const playTypeOf = new Map(stored.map((h) => [h.id, h.playType]));

  // The stories

  // This week leads once a clip of somebody on a league roster is up; until
  // then the week before, the same rule v2's rail follows.
  const hasLeagueClip = (clips: EmbedClip[], hold: Map<string, Hold>) => clips.some((c) => c.playerIds.some((id) => hold.has(id)));
  const storyWeek = hasLeagueClip(clipsNow, holdNow) || !prevWeek ? week : prevWeek;
  const storyClips = storyWeek === week ? clipsNow : clipsPrev;
  const storyHold = storyWeek === week ? holdNow : holdPrev;
  const storyGames = storyWeek === week ? games : prevGames;
  const beforeGames =
    storyWeek === week ? prevGames : storyWeek > 1 ? await getWeekGames(storyWeek - 1).catch((): Game[] => []) : [];

  // The card that closes a story prefers his last finished matchup, because
  // a week in progress is a scoreboard, not a result. As v2 does it.
  const current = sidesOf(storyGames, storyWeek);
  const prior = sidesOf(beforeGames, storyWeek - 1);
  const cardFor = (rosterId: number): CardSide | null => {
    const now = current.get(rosterId) ?? null;
    const before = prior.get(rosterId) ?? null;
    if (now?.status === 'final') return now;
    if (before?.status === 'final') return before;
    if (now && (now.side.points > 0 || now.opponent.points > 0)) return now;
    return before ?? now;
  };

  // Oldest first, so a story plays the week in the order it happened.
  const storyOrder = [...storyClips].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  const stories: StoryManager[] = teams
    .map((team) => {
      const first = nameOf(team.rosterId);
      const slides: Slide[] = [];
      for (const clip of storyOrder) {
        const his = clip.playerIds.map((id) => storyHold.get(id)).filter((h): h is Hold => h?.rosterId === team.rosterId);
        if (!his.length) continue;
        const lead = his[0];
        // His name only when the title does not already say it.
        const named = clip.title.toLowerCase().includes(lead.name.toLowerCase());
        const tags = [...(named ? [] : [lead.name]), lead.started ? 'Started' : 'Benched', `${lead.points.toFixed(2)} pts`];
        const playType = playTypeOf.get(clip.videoId);
        if (playType) tags.unshift(playType);
        slides.push({ kind: 'clip', id: clip.videoId, title: clip.title, still: clip.still, url: `https://www.youtube.com/watch?v=${clip.videoId}`, tags });
      }
      const clipCount = slides.length;
      const own = cardFor(team.rosterId);
      if (own) {
        // v2's week card, its data as it builds it: the result, his best
        // start and what sat on his bench.
        const card = weekCardClip(own.side, own.opponent, first, nameOf(own.opponent.rosterId), own.week, own.status).card;
        // Splash names players in full, so the best start the card picked
        // (the same sort weekCardClip runs) carries his full name.
        const best = [...own.side.lineup].sort((a, b) => b.points - a.points)[0];
        if (card)
          slides.push({
            kind: 'card',
            id: `card:${own.week}:${team.rosterId}`,
            week: own.week,
            headline: card.headline,
            score: card.score,
            // Only the bench: v2's other two lines repeat the score above.
            lines: [{ label: own.status === 'final' ? 'Bench' : 'Bench so far', value: card.lines[2]?.value ?? '0.00' }],
            player: card.player && best ? { ...card.player, name: best.name } : card.player,
            href: `/scoreboard/${own.week}/${own.matchupId}`,
          });
      }
      return { rosterId: team.rosterId, firstName: first, avatarUrl: team.avatarUrl, clips: clipCount, slides };
    })
    // Lit rings first, most clips first; the rest keep the league's order.
    .sort((a, b) => Number(b.clips > 0) - Number(a.clips > 0) || b.clips - a.clips);

  // The stream

  // Every YouTube clip worth seeing, as the Highlight rows buildFeed takes:
  // the tagger's stored YouTube rows (ESPN's are dropped), and this week's
  // and last week's uploads read live, tagged to the rosters of their week.
  // A clip naming players on two rosters belongs to both managers.
  const fantasy = new Set(allPlayers().filter((p) => FANTASY_POSITIONS.has(p.position)).map((p) => p.id));
  const byId = new Map<string, Highlight>();
  for (const h of stored) if (!isEspnClip(h.id)) byId.set(h.id, h);
  const owners = new Map<string, string[]>();
  // The clips that play here, and who held their players that week, for the rail.
  const playable = new Map<string, EmbedClip>();
  const railOwners = new Map<string, { name: string; started: boolean }[]>();
  const live: [number, EmbedClip[], Map<string, Hold>][] = [[week, clipsNow, holdNow]];
  if (prevWeek) live.push([prevWeek, clipsPrev, holdPrev]);
  for (const [wk, clips, hold] of live) {
    for (const clip of clips) {
      const held = clip.playerIds.map((id) => hold.get(id)).filter((h): h is Hold => Boolean(h));
      if (held.length) owners.set(clip.videoId, [...new Set(held.map((h) => String(h.rosterId)))]);
      if (!playable.has(clip.videoId)) {
        playable.set(clip.videoId, clip);
        const byRoster = new Map<number, Hold>();
        for (const h of held) if (!byRoster.has(h.rosterId)) byRoster.set(h.rosterId, h);
        railOwners.set(
          clip.videoId,
          [...byRoster.values()].slice(0, 2).map((h) => ({ name: nameOf(h.rosterId), started: h.started }))
        );
      }
      const known = byId.get(clip.videoId);
      if (known) {
        byId.set(clip.videoId, { ...known, thumbnail: clip.still });
        continue;
      }
      const lead = held[0];
      byId.set(clip.videoId, {
        id: clip.videoId,
        week: wk,
        title: clip.title,
        publishedAt: clip.publishedAt,
        playType: null,
        playerIds: clip.playerIds,
        ownerTeamId: lead ? String(lead.rosterId) : null,
        started: lead ? lead.started : null,
        fantasyPoints: lead ? lead.points : null,
        isCmonMan: false,
        side: null,
        thumbnail: clip.still,
      });
    }
  }
  const highlights = [...byId.values()].filter((h) => isRelevantClip(h, (id) => fantasy.has(id)));
  const items: FeedItem[] = buildFeed(posts, highlights).map((item) =>
    item.kind === 'clip' && owners.has(item.id) ? { ...item, managerIds: owners.get(item.id)! } : item
  );

  const managers: Record<string, string> = Object.fromEntries(teams.map((t) => [String(t.rosterId), nameOf(t.rosterId)]));
  const raw = facetsOf(items, (id) => managers[id] ?? `Roster ${id}`);
  // The lib's label for C'mon Man has a straight apostrophe; Splash's copy is curly.
  const facets = { ...raw, kinds: raw.kinds.map((k) => ({ ...k, label: k.label.replace(/'/g, '’') })) };
  const names = managerNames();
  const now = Date.now();

  const mineId = mine != null ? String(mine) : null;
  // Your week means this week: an old clip is not news about your team.
  const yours = forManager(items, mineId).filter((i) => i.week === week);
  // Replays: only clips that play here, league players first, then the
  // biggest scores, then the newest. One clip per player before any player
  // gets a second, or a five touchdown game fills the rail with the same
  // quarterback.
  const ranked = items
    .filter((i) => i.kind === 'clip' && playable.has(i.id))
    .sort(
      (a, b) =>
        Number(b.managerIds.length > 0) - Number(a.managerIds.length > 0) ||
        (b.clip?.points ?? 0) - (a.clip?.points ?? 0) ||
        b.at.localeCompare(a.at)
    );
  const subjectOf = (i: FeedItem) => byId.get(i.id)?.playerIds[0] ?? i.id;
  const seen = new Set<string>();
  const firsts = ranked.filter((i) => (seen.has(subjectOf(i)) ? false : (seen.add(subjectOf(i)), true)));
  const replays = [...firsts, ...ranked.filter((i) => !firsts.includes(i))].slice(0, 12);
  // Phones get vertical clips first, wide screens wide ones, as the Home rails
  // order them; within each shape the ranking stands.
  const replayRail: RailClip[] = replays
    .map((item) => {
      const clip = playable.get(item.id)!;
      const tags: string[] = [];
      if (item.clip?.playType) tags.push(item.clip.playType);
      if (item.clip?.points != null) tags.push(`${item.clip.points.toFixed(2)} pts`);
      return {
        videoId: clip.videoId,
        title: clip.title,
        still: clip.still,
        stillTall: clip.stillTall,
        vertical: clip.vertical,
        channel: clip.channel,
        owners: railOwners.get(clip.videoId) ?? [],
        tags,
      };
    })
    .sort((a, b) => (phone ? Number(b.vertical) - Number(a.vertical) : Number(a.vertical) - Number(b.vertical)));
  // What mattered ranks the league's own moments; clips already have the
  // Replays rail, so they are not listed twice.
  const top = biggest(items.filter((i) => i.kind !== 'clip'), 6);

  // A lineup call carries each player's points this week, from Sleeper,
  // beside his name, so the call can be judged. Only for players on a
  // roster this week who have scored.
  const ptsOf = (id: string) => {
    const h = holdNow.get(id);
    return h && h.points !== 0 ? ` (${h.points.toFixed(2)})` : '';
  };

  return (
    <Shell active="feed">
      <PageHead title="The Feed" />
      <div className={w.grid}>
        <section className={`${w.widget} ${w.m}`}>
          <WidgetHead icon="play" title="Stories" aside={storyWeek !== week ? <span className={f.asideNote}>Week {storyWeek}</span> : undefined} />
          <Stories managers={stories} week={storyWeek} />
        </section>

        {/* Nothing at all on a quiet week, as v2: a quiet Wednesday is not
            something the app needs to remark on. */}
        {movement.length ? (
          <section className={`${w.widget} ${w.m}`}>
            <WidgetHead icon="swap" title="Movement" />
            <ul className={w.list}>
              {movement.slice(0, 8).map((e) => (
                <li key={e.id} className={`${w.post} ${e.rosterId === mine ? w.mineRow : ''}`}>
                  <span className={w.mark}>{MOVE_MARK[e.kind]}</span>
                  <span className={f.rowHead}>
                    <Link href={`/players/${e.playerId}`} className={f.moveLine}>
                      {sayingOf(e, ptsOf)}
                    </Link>
                    <span className={f.when}>{timing(e.at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={`${w.widget} ${w.m}`}>
          <WidgetHead
            icon="person"
            title="Your week"
            aside={yours.length > 5 ? <span className={f.asideNote}>{yours.length} {yours.length === 1 ? 'moment' : 'moments'}</span> : undefined}
            href={mine == null ? '/settings' : undefined}
            more={mine == null ? 'Pick your team' : undefined}
          />
          {mine == null ? null : yours.length ? (
            <ol className={w.list}>
              {yours.slice(0, 5).map((item) => (
                <MomentRow key={`mine-${item.kind}-${item.id}`} item={item} names={names} now={now} />
              ))}
            </ol>
          ) : (
            <p className={w.empty}>Nothing yet</p>
          )}
        </section>

        <section className={`${w.widget} ${w.l}`}>
          <WidgetHead icon="play" title="Replays" />
          {replayRail.length ? (
            <>
              <ClipPlayerRail clips={replayRail} phone={phone} />
              <span className={w.via}>Clips via YouTube | Tap a clip for sound</span>
            </>
          ) : (
            <p className={w.empty}>No league clips yet</p>
          )}
        </section>

        <section className={`${w.widget} ${w.m}`}>
          <WidgetHead icon="fire" title="What mattered" />
          {top.length ? (
            <ol className={w.list}>
              {top.map((item, i) => (
                <li key={`top-${item.kind}-${item.id}`} className={`${f.ranked} ${mineId && item.managerIds.includes(mineId) ? w.mineRow : ''}`}>
                  <span className={f.rank}>{i + 1}</span>
                  <span className={f.rowMain}>
                    <span className={w.postTitle}>
                      <LinkedText text={item.title} names={names} />
                    </span>
                    {item.body ? (
                      <span className={w.postBody}>
                        <LinkedText text={item.body} names={names} />
                      </span>
                    ) : null}
                    {item.clip ? (
                      <a className={f.out} href={`https://www.youtube.com/watch?v=${item.id}`} target="_blank" rel="noopener noreferrer">
                        Watch on YouTube
                      </a>
                    ) : null}
                  </span>
                  <span className={markClass(item.kind)}>{MARK[item.kind]}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={w.empty}>Nothing yet</p>
          )}
        </section>

        <Widget size="m" icon="history" title="History">
          {items.length ? (
            <Record items={items} facets={facets} names={names} now={now} mine={mineId} />
          ) : (
            <p className={w.empty}>Nothing yet</p>
          )}
          <span className={w.via}>Plays via ESPN | Clips via YouTube</span>
        </Widget>
      </div>
    </Shell>
  );
}
