import Link from 'next/link';
import { MarkDropRefined } from '../../marks';
import Icon from '../../home/Icons';
import Squirt, { type Mood } from '../../home/Squirt';
import type { DropData, DropSide } from './data';
import d from './drop.module.css';

/**
 * The Drop, three ideas from Splash itself, each finished on the same real
 * data: the league as seven drops, the latest moment framed in a drop, and
 * Squirt hosting with his pen. Each carries games live, players to play, the
 * top score, the Shart watch, the closest game and your game.
 */

const pts = (n: number) => n.toFixed(2);
const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';
/** A water surface, two periods wider than the drop so it can roll. */
const WAVE = 'M-64 0 Q -56 -3 -48 0 T -32 0 T -16 0 T 0 0 T 16 0 T 32 0 T 48 0 T 64 0 T 80 0 T 96 0 T 112 0 T 128 0 V 70 H -64 Z';
/** The drop on a 0 to 1 box, for clipping a photo to its shape. */
const DROP_BOX = 'M 0.5 0 C 0.6974 0.2054 1 0.4018 1 0.6607 A 0.5 0.3393 0 0 1 0 0.6607 C 0 0.4018 0.3026 0.2054 0.5 0 Z';

function Avatar({ side, size = 22 }: { side: DropSide; size?: number }) {
  return (
    <span className={d.avatar} style={{ width: size, height: size }}>
      {side.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={side.avatar} alt="" />
      ) : null}
    </span>
  );
}

/** The head every treatment shares: the mark, the name, live or not. */
function Head({ data }: { data: DropData }) {
  return (
    <div className={d.head}>
      <span className={d.mark}>
        <MarkDropRefined />
      </span>
      <span className={d.name}>The Drop</span>
      <span className={`${d.state} ${data.live ? d.stateLive : ''}`}>
        {data.live ? (
          <>
            <svg viewBox="0 0 64 64" className={d.drip} aria-hidden>
              <path d={DROP} />
            </svg>
            Live
          </>
        ) : (
          data.day
        )}
      </span>
    </div>
  );
}

/** The three facts as rows, each with its icon. */
function Facts({ data, notes = false }: { data: DropData; notes?: boolean }) {
  return (
    <ul className={d.facts}>
      <li>
        <Link href={`/scoreboard/${data.week}`} className={d.fact}>
          <Icon name="crown" className={d.factIcon} />
          <span className={d.factText}>
            <span className={d.label}>Top score</span>
            <span>{data.top.team}</span>
          </span>
          <b className={d.factNum}>
            {pts(data.top.points)}
            {notes ? <span className={`${d.note} ${d.noteTop}`}>show off</span> : null}
          </b>
        </Link>
      </li>
      <li>
        <Link href={`/scoreboard/${data.week}`} className={`${d.fact} ${d.factLime}`}>
          <Icon name="toiletPaper" className={d.factIcon} />
          <span className={d.factText}>
            <span className={d.label}>Shart watch</span>
            <span>{data.low.team}</span>
          </span>
          <b className={d.factNum}>
            {notes ? (
              <svg className={d.ring} viewBox="0 0 120 50" preserveAspectRatio="none" aria-hidden>
                <path d="M8 26 C 6 10, 40 3, 66 4 C 96 5, 116 13, 113 27 C 110 42, 76 48, 50 46 C 22 44, 4 38, 9 22 C 11 15, 20 10, 30 8" />
              </svg>
            ) : null}
            {pts(data.low.points)}
            {notes ? <span className={`${d.note} ${d.noteLow}`}>yikes</span> : null}
          </b>
        </Link>
      </li>
      <li>
        <Link href={`/scoreboard/${data.week}/${data.closest.matchupId}`} className={d.fact}>
          <Icon name="timer" className={d.factIcon} />
          <span className={d.factText}>
            <span className={d.label}>Closest</span>
            <span>
              {data.closest.away.manager} v {data.closest.home.manager}
            </span>
          </span>
          <b className={d.factNum}>
            {pts(data.closest.gap)}
            {notes ? <span className={`${d.note} ${d.noteClose}`}>{closeNote(data.closest.gap)}</span> : null}
          </b>
        </Link>
      </li>
    </ul>
  );
}

/** Squirt's read on the closest game, by how close it really is. */
const closeNote = (gap: number) => (gap < 3 ? 'nobody breathe' : gap < 10 ? 'sweaty' : 'not that close');

function Counts({ data }: { data: DropData }) {
  return (
    <div className={d.counts}>
      <span>
        <b>{data.gamesLive}</b> live
      </span>
      <span>
        <b>{data.toPlay}</b> players to play
      </span>
      <span>
        <b>{Math.round(data.played * 100)}%</b> played
      </span>
    </div>
  );
}

// ---------- 1. Seven drops ----------

/** One matchup as a drop, filled to the leader's live win chance. */
function MatchDrop({ game, mine, week }: { game: DropData['games'][number]; mine: boolean; week: number }) {
  const awayLeads = game.away.points >= game.home.points;
  const lead = awayLeads ? game.away : game.home;
  const trail = awayLeads ? game.home : game.away;
  const chance = game.final ? 1 : lead.winProb ?? 0.5;
  // Never call a live game certain: 99% until it is final.
  const shown = game.final ? 'Final' : `${Math.min(99, Math.round(chance * 100))}%`;
  // The liquid's top edge on the drop's 64 grid (the drop spans 4 to 60).
  // A live game stops just short of the tip so the surface always shows.
  const top = 60 - Math.min(game.final ? 1 : 0.9, chance) * 56;
  const id = `drop-${game.matchupId}`;
  return (
    <Link href={`/scoreboard/${week}/${game.matchupId}`} className={`${d.match} ${mine ? d.matchMine : ''}`}>
      <span className={d.cupWrap}>
        <svg viewBox="0 0 64 64" className={`${d.cup} ${game.inPlay ? d.cupLive : ''}`} aria-hidden>
          <defs>
            <clipPath id={id}>
              <path d={DROP} />
            </clipPath>
          </defs>
          <path d={DROP} className={d.cupGlass} />
          <g clipPath={`url(#${id})`}>
            <g className={d.liquid} style={{ transform: `translateY(${top}px)` }}>
              <path className={d.surfaceBack} d={WAVE} />
              <path className={d.surface} d={WAVE} />
            </g>
          </g>
          <path d={DROP} className={d.cupLine} />
          <path d="M21.5 31 C 22.5 26 25 21.5 28.5 17" className={d.gloss} />
        </svg>
        <span className={`${d.chance} ${top < 40 ? d.chanceIn : ''}`}>{shown}</span>
      </span>
      <span className={d.mLead}>
        <Avatar side={lead} size={18} />
        <span>{lead.manager}</span>
        <b>{pts(lead.points)}</b>
      </span>
      <span className={d.mTrail}>
        <span>{trail.manager}</span>
        <span>{pts(trail.points)}</span>
      </span>
    </Link>
  );
}

export function DropSeven({ data }: { data: DropData }) {
  const mineId = data.yours?.matchupId;
  // Your game first, then the live ones, then the rest.
  const games = [...data.games].sort((a, b) => Number(b.matchupId === mineId) - Number(a.matchupId === mineId) || Number(b.inPlay) - Number(a.inPlay));
  return (
    <section className={d.card}>
      <Head data={data} />
      <Counts data={data} />
      <div className={d.rail}>
        {games.map((g) => (
          <MatchDrop key={g.matchupId} game={g} mine={g.matchupId === mineId} week={data.week} />
        ))}
      </div>
      <Facts data={data} />
    </section>
  );
}

// ---------- 2. The moment ----------

export function DropMoment({ data }: { data: DropData }) {
  const m = data.moment;
  return (
    <section className={d.card}>
      <Head data={data} />
      {m ? (
        <a href={`https://www.youtube.com/watch?v=${m.videoId}`} target="_blank" rel="noopener noreferrer" className={d.moment}>
          <svg className={d.frame} viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
            <defs>
              <clipPath id="moment-drop" clipPathUnits="objectBoundingBox">
                <path d={DROP_BOX} />
              </clipPath>
            </defs>
          </svg>
          <span className={d.window}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.still} alt="" />
            <span className={d.playBtn} aria-hidden>
              <svg viewBox="0 0 24 24">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </span>
          </span>
          <span className={d.mText}>
            <span className={d.label}>Latest play</span>
            <b className={d.mName}>{m.player}</b>
            <span className={d.mMeta}>
              {m.position}, {m.team}
            </span>
            <span className={d.mPts}>
              {pts(m.points)}
              <i>points</i>
            </span>
            <span className={d.mOwner}>
              {m.owner} | {m.ownerTeam}
            </span>
          </span>
        </a>
      ) : null}
      <Counts data={data} />
      <Facts data={data} />
    </section>
  );
}

// ---------- 3. Squirt hosts ----------

export function DropSquirt({ data }: { data: DropData }) {
  // How Squirt is taking it: your game if you have one, else the closest.
  let mood: Mood = data.live ? 'sweat' : 'calm';
  if (data.yours) {
    const lead = data.yours.you.points - data.yours.them.points;
    mood = lead >= 15 ? 'smug' : lead <= -15 ? 'gloom' : data.live ? 'sweat' : 'calm';
  }
  return (
    <section className={d.card}>
      <Head data={data} />
      <div className={d.host}>
        <Squirt mood={mood} size={104} />
        <div className={d.hostSide}>
          <Counts data={data} />
          {data.yours ? (
            <Link href={`/scoreboard/${data.week}/${data.yours.matchupId}`} className={d.hostGame}>
              <span className={d.label}>Your game</span>
              <span className={d.hostScore}>
                <b>{pts(data.yours.you.points)}</b>
                <span>to</span>
                <b>{pts(data.yours.them.points)}</b>
              </span>
              <span className={d.hostTeams}>
                {data.yours.you.team} v {data.yours.them.team}
              </span>
            </Link>
          ) : null}
        </div>
      </div>
      <Facts data={data} notes />
    </section>
  );
}
