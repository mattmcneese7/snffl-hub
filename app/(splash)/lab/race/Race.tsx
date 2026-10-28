'use client';

import { AnimatePresence, LayoutGroup, motion, type PanInfo } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Export } from '@phosphor-icons/react';
import { WidgetHead } from '../../home/Widget';
import Press from '../kit/Press';
import Rolling from '../kit/Rolling';
import Sheet from '../kit/Sheet';
import { haptic } from '../kit/haptics';
import { SPRING } from '../kit/motion';
import { useToast } from '../kit/Toasts';
import h from '../../home/home.module.css';
import w from '../../home/widgets.module.css';
import s from './race.module.css';
import {
  cleanPicks,
  decodePicks,
  encodePicks,
  favorites,
  outlook,
  project,
  type Picks,
  type RaceGame,
  type RaceTeam,
  type Row,
  type Status,
} from './raceModel';

const CHIP: Record<Status, string> = {
  Clinched: s.chipClinched,
  In: s.chipIn,
  Bubble: s.chipBubble,
  Out: s.chipOut,
  Eliminated: s.chipEliminated,
};

const record = (wins: number, losses: number, ties: number) => `${wins}-${losses}${ties ? `-${ties}` : ''}`;

function Face({ src, size = 36 }: { src: string | null; size?: number }) {
  return (
    <span className={s.face} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" loading="lazy" /> : null}
    </span>
  );
}

/** One game as a two sided pick: tap a side to call it, tap it again to clear. */
function PickGame({
  game,
  teams,
  winner,
  onPick,
  showWeek,
}: {
  game: RaceGame;
  teams: Map<number, RaceTeam>;
  winner: number | undefined;
  onPick: (game: RaceGame, rosterId: number) => void;
  showWeek?: boolean;
}) {
  const scored = game.status === 'live';
  const lead = scored && game.homePts !== game.awayPts ? (game.homePts > game.awayPts ? game.home : game.away) : null;
  return (
    <div className={s.game}>
      {showWeek || game.inPlay ? (
        <div className={s.gameMeta}>
          {showWeek ? <span>Week {game.week}</span> : null}
          {game.inPlay ? (
            <span className={s.state}>
              <span className={s.liveDot} aria-hidden />
              Live
            </span>
          ) : null}
        </div>
      ) : null}
      <div className={s.sides}>
        {[game.home, game.away].map((id) => {
          const t = teams.get(id);
          const picked = winner === id;
          const dim = winner != null && !picked;
          const pts = id === game.home ? game.homePts : game.awayPts;
          return (
            <button
              key={id}
              type="button"
              className={`${s.side} ${dim ? s.sideDim : ''}`}
              aria-pressed={picked}
              aria-label={`${picked ? 'Clear pick' : 'Pick'} ${t?.first ?? ''}, ${t?.teamName ?? ''}`}
              onClick={() => onPick(game, id)}
            >
              {picked ? <motion.span layoutId={`pick-${game.key}`} className={s.sideFill} transition={SPRING.snap} /> : null}
              <span className={s.sideBody}>
                <Face src={t?.avatar ?? null} size={32} />
                <span className={s.sideText}>
                  <b>{t?.first}</b>
                  <span className={s.sideTeam}>{t?.teamName}</span>
                  {scored ? (
                    <span className={`${s.sideScore} ${lead === id ? s.sideLead : ''}`}>
                      <Rolling value={pts} />
                    </span>
                  ) : (
                    <span className={s.sideSub}>
                      {t ? `${record(t.wins, t.losses, t.ties)}, ${t.ppg.toFixed(2)} a game` : ''}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Race({
  teams,
  games,
  line,
  perWeek,
  season,
  shared,
}: {
  teams: RaceTeam[];
  games: RaceGame[];
  line: number;
  perWeek: number;
  season: string;
  shared: string | null;
}) {
  const toast = useToast();
  const storeKey = `splash-lab-race-${season}`;
  const byId = useMemo(() => new Map(teams.map((t) => [t.rosterId, t])), [teams]);
  const weeks = useMemo(() => [...new Set(games.map((g) => g.week))].sort((a, b) => a - b), [games]);

  const [picks, setPicks] = useState<Picks>({});
  const [week, setWeek] = useState(weeks[0] ?? 0);
  const [dir, setDir] = useState(1);
  const [focus, setFocus] = useState<number | null>(null);
  const loaded = useRef(false);
  const touched = useRef(false);
  const stripRef = useRef<HTMLDivElement>(null);

  // Load: a shared link wins over what this phone saved.
  useEffect(() => {
    let start: Picks = {};
    if (shared) start = decodePicks(shared, games, perWeek);
    else {
      try {
        const raw = window.localStorage.getItem(storeKey);
        if (raw) start = cleanPicks(JSON.parse(raw), games);
      } catch {
        start = {};
      }
    }
    setPicks(start);
    loaded.current = true;
  }, [shared, games, perWeek, storeKey]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(storeKey, JSON.stringify(picks));
    } catch {
      /* Private mode or storage off: picks live for this visit only. */
    }
  }, [picks, storeKey]);

  const rows = useMemo(() => project(teams, games, picks, line), [teams, games, picks, line]);
  const pickedCount = useMemo(() => games.filter((g) => picks[g.key] != null).length, [games, picks]);

  // A team that just clinched gets the news, but only from a pick, not a load.
  const prevClinched = useRef<Set<number> | null>(null);
  useEffect(() => {
    const now = new Set(rows.filter((r) => r.status === 'Clinched').map((r) => r.rosterId));
    const before = prevClinched.current;
    prevClinched.current = now;
    if (!before || !touched.current) return;
    const fresh = rows.filter((r) => now.has(r.rosterId) && !before.has(r.rosterId));
    if (!fresh.length) return;
    if (fresh.length <= 2) {
      for (const r of fresh) toast({ id: `clinch-${r.rosterId}`, image: r.avatar, title: `${r.first} clinched a playoff spot`, body: r.teamName, tone: 'good' });
    } else {
      const names = fresh.map((r) => r.first);
      toast({
        id: 'clinch-many',
        title: `${fresh.length} teams clinched playoff spots`,
        body: `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`,
        tone: 'good',
      });
    }
    haptic('success');
  }, [rows, toast]);

  const onPick = useCallback((game: RaceGame, rosterId: number) => {
    touched.current = true;
    haptic('tick');
    setPicks((p) => {
      const next = { ...p };
      if (next[game.key] === rosterId) delete next[game.key];
      else next[game.key] = rosterId;
      return next;
    });
  }, []);

  const goWeek = useCallback(
    (to: number) => {
      if (to === week || !weeks.includes(to)) return;
      setDir(to > week ? 1 : -1);
      setWeek(to);
      haptic('tick');
    },
    [week, weeks]
  );

  // Keep the chosen week chip in view as the weeks are swiped.
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-week="${week}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [week]);

  const swipe = (_: unknown, info: PanInfo) => {
    const i = weeks.indexOf(week);
    if ((info.offset.x < -60 || info.velocity.x < -400) && i < weeks.length - 1) goWeek(weeks[i + 1]);
    else if ((info.offset.x > 60 || info.velocity.x > 400) && i > 0) goWeek(weeks[i - 1]);
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?p=${encodePicks(games, picks)}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Playoff Race', text: 'My playoff picks', url });
        return;
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ id: 'race-share', title: 'Link copied', body: `${pickedCount} of ${games.length} games picked` });
    } catch {
      toast({ id: 'race-share', title: 'Could not copy the link', tone: 'bad' });
    }
  };

  const weekGames = games.filter((g) => g.week === week);
  const focusRow = focus != null ? rows.find((r) => r.rosterId === focus) : undefined;

  if (!games.length) {
    return (
      <section className={`${w.widget} ${w.l}`}>
        <WidgetHead icon="ranking" title="Playoff picture" />
        <p className={w.empty}>The regular season is done. The bracket lives on Standings.</p>
      </section>
    );
  }

  return (
    <>
      <section className={`${w.widget} ${w.l}`}>
        <WidgetHead icon="ranking" title="Playoff picture" aside={<span className={s.asOf}>{pickedCount ? 'With your picks' : 'As it stands'}</span>} />
        <ol className={s.table} style={{ ['--line' as string]: line }}>
          {rows.map((r) => (
            <motion.li key={r.rosterId} layout="position" transition={SPRING.glide} className={s.li}>
              <Press className={s.row} onClick={() => setFocus(r.rosterId)} aria-label={`${r.first}, ${r.teamName}, seed ${r.seed}. Open his race`}>
                <span className={s.seed}>
                  <Rolling value={r.seed} decimals={0} />
                </span>
                <Face src={r.avatar} />
                <span className={s.who}>
                  <b>{r.first}</b>
                  <span>{r.teamName}</span>
                </span>
                <span className={s.rec}>
                  <b>
                    <Rolling value={r.pWins} decimals={0} />
                    <span>-</span>
                    <Rolling value={r.pLosses} decimals={0} />
                    {r.ties ? <span>-{r.ties}</span> : null}
                  </b>
                  <span>{r.pointsFor.toFixed(2)} PF</span>
                </span>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={r.status}
                    className={`${s.chip} ${CHIP[r.status]}`}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={SPRING.snap}
                  >
                    {r.status}
                  </motion.span>
                </AnimatePresence>
              </Press>
            </motion.li>
          ))}
          <li className={s.line} aria-hidden>
            <span>Playoff line</span>
          </li>
        </ol>
        <p className={s.note}>
          Clinched and Eliminated hold whatever happens in the games you have not picked. Bubble means tied in wins across the line, where points for decides.
        </p>
      </section>

      <section className={`${w.widget} ${w.l}`}>
        <WidgetHead icon="calendar" title="Remaining schedule" />
        <div className={s.tools}>
          <button
            type="button"
            className={`${h.pillBtn} ${h.pillSmall}`}
            onClick={() => {
              touched.current = true;
              haptic('tick');
              setPicks((p) => favorites(teams, games, p));
            }}
          >
            Pick the favorites
          </button>
          <button
            type="button"
            className={`${h.pillBtn} ${h.pillSmall}`}
            disabled={!pickedCount}
            onClick={() => {
              haptic('thud');
              setPicks({});
            }}
          >
            Clear picks
          </button>
          <button type="button" className={`${h.pillBtn} ${h.pillSmall} ${s.share}`} onClick={share} aria-label="Share these picks">
            <Export weight="bold" aria-hidden />
            Share
          </button>
        </div>
        <p className={s.count}>
          <b>
            <Rolling value={pickedCount} decimals={0} />
          </b>{' '}
          of {games.length} picked
        </p>

        <div className={s.strip} ref={stripRef} role="tablist" aria-label="Week">
          {weeks.map((wk) => {
            const on = wk === week;
            const list = games.filter((g) => g.week === wk);
            const done = list.filter((g) => picks[g.key] != null).length;
            return (
              <button key={wk} type="button" role="tab" aria-selected={on} data-week={wk} className={`${s.chipWeek} ${on ? s.chipWeekOn : ''}`} onClick={() => goWeek(wk)}>
                {on ? <motion.span layoutId="race-week" className={s.weekPill} transition={SPRING.snap} /> : null}
                <span className={s.weekLabel}>Week {wk}</span>
                <span className={s.weekCount}>
                  {done}/{list.length}
                </span>
              </button>
            );
          })}
        </div>

        {weekGames.some((g) => g.status === 'live') ? (
          <p className={s.note}>Week {week} is under way. Scores so far are shown; every game is still yours to call.</p>
        ) : null}
        <div className={s.pager}>
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={week}
              className={s.week}
              custom={dir}
              variants={{
                enter: (d: number) => ({ x: d * 80, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d * -80, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SPRING.glide}
              drag="x"
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={swipe}
            >
              {weekGames.map((g) => (
                <PickGame key={g.key} game={g} teams={byId} winner={picks[g.key]} onPick={onPick} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
        <p className={s.note}>Favorites are the side with more season points per game. Swipe for the next week.</p>
      </section>

      <Sheet
        open={focusRow != null}
        onClose={() => setFocus(null)}
        title={
          focusRow ? (
            <span className={s.sheetHead}>
              <Face src={focusRow.avatar} size={40} />
              <span className={s.who}>
                <b>{focusRow.first}</b>
                <span>{focusRow.teamName}</span>
              </span>
            </span>
          ) : null
        }
      >
        {focusRow ? <TeamRace row={focusRow} teams={teams} games={games} picks={picks} line={line} byId={byId} onPick={onPick} /> : null}
      </Sheet>
    </>
  );
}

/** The focused team: where it sits, the model's odds, its magic number, its games. */
function TeamRace({
  row,
  teams,
  games,
  picks,
  line,
  byId,
  onPick,
}: {
  row: Row;
  teams: RaceTeam[];
  games: RaceGame[];
  picks: Picks;
  line: number;
  byId: Map<number, RaceTeam>;
  onPick: (game: RaceGame, rosterId: number) => void;
}) {
  const o = useMemo(() => outlook(teams, games, picks, row.rosterId, line), [teams, games, picks, row.rosterId, line]);
  const mine = games.filter((g) => g.home === row.rosterId || g.away === row.rosterId);
  const name = row.first;

  let big: string;
  let says: string;
  if (o.clinched) {
    big = 'In';
    says = `${name} has clinched a playoff spot.`;
  } else if (o.eliminated) {
    big = 'Out';
    says = `${name} cannot reach the top ${line}, even winning out.`;
  } else if (o.magic != null) {
    big = String(o.magic);
    says = `Wins ${name} needs to clinch, whatever else happens.`;
  } else {
    big = 'Help';
    says = `Winning out still leaves ${name} needing results elsewhere.`;
  }

  let week: string | null = null;
  if (o.next) {
    const opp = byId.get(o.next.opponent)?.first ?? '';
    const parts: string[] = [];
    if (o.next.winClinches) parts.push('a win clinches a spot');
    else if (o.next.magicAfterWin != null && o.magic != null) parts.push(`a win cuts the magic number to ${o.next.magicAfterWin}`);
    else if (o.next.magicAfterWin != null) parts.push(`a win puts a clinch in his own hands, magic number ${o.next.magicAfterWin}`);
    else parts.push('a win keeps him alive but still needing help');
    if (o.next.lossEliminates) parts.push('a loss eliminates him');
    week = `Week ${o.next.game.week} against ${opp}: ${parts.join(', and ')}.`;
  }

  return (
    <LayoutGroup id={`race-sheet-${row.rosterId}`}>
      <div className={s.tiles}>
        <div className={s.tile}>
          <span className={s.tileLabel}>Seed</span>
          <b className={s.tileBig}>
            <Rolling value={row.seed} decimals={0} />
          </b>
          <span className={s.tileSub}>{row.status}</span>
        </div>
        <div className={s.tile}>
          <span className={s.tileLabel}>Record</span>
          <b className={s.tileBig}>{record(row.pWins, row.pLosses, row.ties)}</b>
          <span className={s.tileSub}>Now {record(row.wins, row.losses, row.ties)}</span>
        </div>
        <div className={s.tile}>
          <span className={s.tileLabel}>Model odds</span>
          {row.odds ? (
            <>
              <b className={s.tileBig}>
                <Rolling value={row.odds.makePlayoffs} decimals={0} suffix="%" />
              </b>
              <span className={s.tileSub}>Bye {Math.round(row.odds.bye)}%</span>
            </>
          ) : (
            <span className={s.tileSub}>Not available</span>
          )}
        </div>
      </div>
      <p className={s.fine}>Model odds are the app&apos;s simulation of the season as it stands, before your picks.</p>

      <div className={s.magic}>
        <span className={s.magicNum}>{big}</span>
        <span className={s.magicText}>
          <b>Magic number</b>
          <span>{says}</span>
        </span>
      </div>
      {week ? <p className={s.thisWeek}>{week}</p> : null}

      <div className={s.sheetList}>
        <span className={s.tileLabel}>His remaining schedule</span>
        {mine.map((g) => (
          <PickGame key={g.key} game={g} teams={byId} winner={picks[g.key]} onPick={onPick} showWeek />
        ))}
      </div>
    </LayoutGroup>
  );
}
