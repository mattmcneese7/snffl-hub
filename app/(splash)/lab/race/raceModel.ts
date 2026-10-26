/**
 * The playoff machine's math, kept free of React and of path aliases so the
 * page, the client and a plain node check all run the same code.
 *
 * Wins are counted in halves (a tie is half a win) so every comparison is
 * on integers. Points for decides ties in the real table, but points for
 * future games cannot be known, so a tie in wins at the playoff line is
 * treated as unsettled: never clinched, never eliminated.
 */

export type RaceTeam = {
  rosterId: number;
  first: string;
  teamName: string;
  avatar: string | null;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  /** Season points per game over finished games. */
  ppg: number;
  /** The app's Monte Carlo odds before any picks, in percent. */
  odds: { makePlayoffs: number; bye: number; tag: string } | null;
};

export type RaceGame = {
  /** `${week}-${matchupId}`, stable for the season. */
  key: string;
  week: number;
  matchupId: number;
  home: number;
  away: number;
  homePts: number;
  awayPts: number;
  status: 'pending' | 'live' | 'final';
  inPlay: boolean;
};

/** Game key to the picked winner's roster id. */
export type Picks = Record<string, number>;

export type Status = 'Clinched' | 'Eliminated' | 'In' | 'Out' | 'Bubble';

export type Row = RaceTeam & {
  seed: number;
  /** Record with the picks applied. */
  pWins: number;
  pLosses: number;
  status: Status;
};

type Board = {
  n: number;
  index: Map<number, number>;
  /** Half wins per team after the picks. */
  base: number[];
  /** Unpicked games as team index pairs. */
  open: [number, number][];
};

function board(teams: RaceTeam[], games: RaceGame[], picks: Picks): Board {
  const index = new Map(teams.map((t, i) => [t.rosterId, i]));
  const base = teams.map((t) => 2 * t.wins + t.ties);
  const open: [number, number][] = [];
  for (const g of games) {
    const h = index.get(g.home);
    const a = index.get(g.away);
    if (h == null || a == null) continue;
    const w = picks[g.key];
    if (w === g.home) base[h] += 2;
    else if (w === g.away) base[a] += 2;
    else open.push([h, a]);
  }
  return { n: teams.length, index, base, open };
}

/** Every k sized subset of `items`, in order, stopping when `visit` says so. */
function someSubset(items: number[], k: number, visit: (s: number[]) => boolean): boolean {
  const pick: number[] = [];
  const walk = (from: number): boolean => {
    if (pick.length === k) return visit(pick);
    for (let i = from; i <= items.length - (k - pick.length); i++) {
      pick.push(items[i]);
      if (walk(i + 1)) return true;
      pick.pop();
    }
    return false;
  };
  return walk(0);
}

/**
 * Hall's condition over the games inside a set: can every team in the set
 * be handed `need[i]` of those games (each game goes to one of its two
 * teams)? `games` are local index pairs.
 */
function canSupply(need: number[], games: [number, number][]): boolean {
  const k = need.length;
  let total = 0;
  for (const r of need) total += r;
  if (total === 0) return true;
  if (total > games.length) return false;
  for (let mask = 1; mask < 1 << k; mask++) {
    let want = 0;
    for (let i = 0; i < k; i++) if (mask & (1 << i)) want += need[i];
    if (!want) continue;
    let touch = 0;
    for (const [a, b] of games) if (mask & (1 << a) || mask & (1 << b)) touch++;
    if (want > touch) return false;
  }
  return true;
}

/** Hall's condition the other way: no subset holds more games than it can absorb. */
function canAbsorb(cap: number[], games: [number, number][]): boolean {
  const k = cap.length;
  for (let mask = 1; mask < 1 << k; mask++) {
    let room = 0;
    for (let i = 0; i < k; i++) if (mask & (1 << i)) room += cap[i];
    let inside = 0;
    for (const [a, b] of games) if (mask & (1 << a) && mask & (1 << b)) inside++;
    if (inside > room) return false;
  }
  return true;
}

/**
 * Clinched: even losing every open game, the team cannot finish below the
 * line. It is not clinched if some way the other games fall puts `line`
 * rivals level with it or ahead (level counts, points for being unknowable).
 */
function isClinched(b: Board, t: number, line: number): boolean {
  if (line >= b.n) return true;
  const mine = b.base[t];
  // Worst case: the team loses all its open games, so its opponents bank them.
  const start = b.base.slice();
  const rest: [number, number][] = [];
  for (const [x, y] of b.open) {
    if (x === t) start[y] += 2;
    else if (y === t) start[x] += 2;
    else rest.push([x, y]);
  }
  const openCount = new Array(b.n).fill(0);
  for (const [x, y] of rest) {
    openCount[x]++;
    openCount[y]++;
  }
  let level = 0;
  const need = new Array(b.n).fill(0);
  const candidates: number[] = [];
  for (let i = 0; i < b.n; i++) {
    if (i === t) continue;
    const gap = Math.max(0, Math.ceil((mine - start[i]) / 2));
    if (gap === 0) level++;
    else if (gap <= openCount[i]) {
      need[i] = gap;
      candidates.push(i);
    }
  }
  const k = line - level;
  if (k <= 0) return false;
  if (candidates.length < k) return true;
  candidates.sort((x, y) => need[x] - need[y]);

  const reachable = someSubset(candidates, k, (set) => {
    const local = new Map(set.map((v, i) => [v, i]));
    const free = new Array(set.length).fill(0);
    const inside: [number, number][] = [];
    for (const [x, y] of rest) {
      const lx = local.get(x);
      const ly = local.get(y);
      if (lx != null && ly != null) inside.push([lx, ly]);
      else if (lx != null) free[lx]++;
      else if (ly != null) free[ly]++;
    }
    const short = set.map((v, i) => Math.max(0, need[v] - free[i]));
    return canSupply(short, inside);
  });
  return !reachable;
}

/**
 * Eliminated: even winning every open game, the team cannot reach the line.
 * It survives if some way the other games fall leaves no more than
 * `line - 1` rivals strictly ahead of it.
 */
function isEliminated(b: Board, t: number, line: number): boolean {
  if (line >= b.n) return false;
  let best = b.base[t];
  const rest: [number, number][] = [];
  for (const [x, y] of b.open) {
    if (x === t || y === t) best += 2;
    else rest.push([x, y]);
  }
  const openCount = new Array(b.n).fill(0);
  for (const [x, y] of rest) {
    openCount[x]++;
    openCount[y]++;
  }
  // Rivals that must finish level or behind: everyone but line - 1 of them.
  const behind = b.n - line;
  const cap = new Array(b.n).fill(0);
  const candidates: number[] = [];
  let easy = 0;
  for (let i = 0; i < b.n; i++) {
    if (i === t) continue;
    const room = Math.floor((best - b.base[i]) / 2);
    if (room < 0) continue;
    cap[i] = room;
    candidates.push(i);
    if (room >= openCount[i]) easy++;
  }
  if (candidates.length < behind) return true;
  if (easy >= behind) return false;
  candidates.sort((x, y) => cap[y] - openCount[y] - (cap[x] - openCount[x]));

  const holds = someSubset(candidates, behind, (set) => {
    const local = new Map(set.map((v, i) => [v, i]));
    const inside: [number, number][] = [];
    for (const [x, y] of rest) {
      const lx = local.get(x);
      const ly = local.get(y);
      if (lx != null && ly != null) inside.push([lx, ly]);
    }
    return canAbsorb(
      set.map((v) => cap[v]),
      inside
    );
  });
  return !holds;
}

/** Projected order: half wins, then points for to date, then roster id. */
function order(teams: RaceTeam[], b: Board) {
  return teams
    .map((t, i) => ({ t, i, w: b.base[i] }))
    .sort((x, y) => y.w - x.w || y.t.pointsFor - x.t.pointsFor || x.t.rosterId - y.t.rosterId);
}

export function clinchedSet(teams: RaceTeam[], games: RaceGame[], picks: Picks, line: number) {
  const b = board(teams, games, picks);
  return new Set(teams.filter((_, i) => isClinched(b, i, line)).map((t) => t.rosterId));
}

/** The table with the picks applied, each team's seed and its status. */
export function project(teams: RaceTeam[], games: RaceGame[], picks: Picks, line: number): Row[] {
  const b = board(teams, games, picks);
  const sorted = order(teams, b);
  const lineWins = new Set<number>();
  const above = new Set(sorted.slice(0, line).map((x) => x.w));
  const below = new Set(sorted.slice(line).map((x) => x.w));
  for (const w of above) if (below.has(w)) lineWins.add(w);

  const played = teams.map((t) => t.wins + t.losses + t.ties);
  const pickedGames = new Array(teams.length).fill(0);
  for (const g of games) {
    if (picks[g.key] == null) continue;
    const h = b.index.get(g.home);
    const a = b.index.get(g.away);
    if (h != null) pickedGames[h]++;
    if (a != null) pickedGames[a]++;
  }

  return sorted.map(({ t, i, w }, at) => {
    const pWins = (w - t.ties) / 2;
    const pLosses = played[i] + pickedGames[i] - t.ties - pWins;
    let status: Status;
    if (isClinched(b, i, line)) status = 'Clinched';
    else if (isEliminated(b, i, line)) status = 'Eliminated';
    else if (lineWins.has(w)) status = 'Bubble';
    else status = at < line ? 'In' : 'Out';
    return { ...t, seed: at + 1, pWins, pLosses, status };
  });
}

/** The open games one team still has, picks applied. */
function openFor(games: RaceGame[], picks: Picks, rosterId: number) {
  return games.filter((g) => (g.home === rosterId || g.away === rosterId) && picks[g.key] == null);
}

/**
 * Magic number: the fewest wins of its own that clinch a spot for the team
 * whatever happens elsewhere, including which of its games it wins. 0 when
 * already in; null when winning out still leaves it needing help.
 */
export function magicNumber(teams: RaceTeam[], games: RaceGame[], picks: Picks, rosterId: number, line: number): number | null {
  const t = teams.findIndex((x) => x.rosterId === rosterId);
  if (t < 0) return null;
  if (isClinched(board(teams, games, picks), t, line)) return 0;
  const mine = openFor(games, picks, rosterId);
  const keys = mine.map((g) => g.key);
  for (let m = 1; m <= keys.length; m++) {
    const escape = someSubset(
      keys.map((_, i) => i),
      m,
      (set) => {
        const trial = { ...picks };
        for (const i of set) trial[keys[i]] = rosterId;
        return !isClinched(board(teams, games, trial), t, line);
      }
    );
    if (!escape) return m;
  }
  return null;
}

export type Outlook = {
  clinched: boolean;
  eliminated: boolean;
  magic: number | null;
  /** The team's next open game and what it does. */
  next: {
    game: RaceGame;
    opponent: number;
    winClinches: boolean;
    lossEliminates: boolean;
    magicAfterWin: number | null;
  } | null;
};

export function outlook(teams: RaceTeam[], games: RaceGame[], picks: Picks, rosterId: number, line: number): Outlook {
  const t = teams.findIndex((x) => x.rosterId === rosterId);
  const b = board(teams, games, picks);
  const clinched = t >= 0 && isClinched(b, t, line);
  const eliminated = t >= 0 && !clinched && isEliminated(b, t, line);
  const magic = magicNumber(teams, games, picks, rosterId, line);
  const first = openFor(games, picks, rosterId).sort((x, y) => x.week - y.week)[0];
  let next: Outlook['next'] = null;
  if (first && !clinched && !eliminated) {
    const opponent = first.home === rosterId ? first.away : first.home;
    const won = { ...picks, [first.key]: rosterId };
    const lost = { ...picks, [first.key]: opponent };
    next = {
      game: first,
      opponent,
      winClinches: isClinched(board(teams, games, won), t, line),
      lossEliminates: isEliminated(board(teams, games, lost), t, line),
      magicAfterWin: magicNumber(teams, games, won, rosterId, line),
    };
  }
  return { clinched, eliminated, magic, next };
}

/** Season points per game picks every open game it is asked to fill. */
export function favorites(teams: RaceTeam[], games: RaceGame[], picks: Picks): Picks {
  const ppg = new Map(teams.map((t) => [t.rosterId, t.ppg]));
  const out = { ...picks };
  for (const g of games) {
    if (out[g.key] != null) continue;
    out[g.key] = (ppg.get(g.home) ?? 0) >= (ppg.get(g.away) ?? 0) ? g.home : g.away;
  }
  return out;
}

/* Sharing: picks in the URL */

const ABC = 'abcdefghijklmnopqrstuvwxyz0';

/**
 * Three games to a character (each 0 open, 1 home, 2 away, so 27 values),
 * after the first open week, so a link made in week 7 still lines up in
 * week 8: "7.kq0ab".
 */
export function encodePicks(games: RaceGame[], picks: Picks): string {
  if (!games.length) return '';
  const digits = games.map((g) => (picks[g.key] === g.home ? 1 : picks[g.key] === g.away ? 2 : 0));
  while (digits.length % 3) digits.push(0);
  let body = '';
  for (let i = 0; i < digits.length; i += 3) body += ABC[digits[i] * 9 + digits[i + 1] * 3 + digits[i + 2]];
  return `${games[0].week}.${body.replace(/a+$/, '')}`;
}

export function decodePicks(code: string, games: RaceGame[], perWeek: number): Picks {
  const m = /^(\d{1,2})\.([a-z0]*)$/.exec(code.trim());
  if (!m || !games.length) return {};
  const from = Number(m[1]);
  const digits: number[] = [];
  for (const ch of m[2]) {
    const v = ABC.indexOf(ch);
    if (v < 0) return {};
    digits.push(Math.floor(v / 9), Math.floor(v / 3) % 3, v % 3);
  }
  // A link from an earlier week carries games that are final now: skip them.
  const skip = Math.max(0, games[0].week - from) * perWeek;
  if (from > games[0].week) return {};
  const out: Picks = {};
  games.forEach((g, i) => {
    const d = digits[skip + i] ?? 0;
    if (d === 1) out[g.key] = g.home;
    else if (d === 2) out[g.key] = g.away;
  });
  return out;
}

/** Only picks that name a side of a real open game survive a load. */
export function cleanPicks(raw: unknown, games: RaceGame[]): Picks {
  const out: Picks = {};
  if (!raw || typeof raw !== 'object') return out;
  const byKey = new Map(games.map((g) => [g.key, g]));
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const g = byKey.get(k);
    if (g && (v === g.home || v === g.away)) out[k] = v;
  }
  return out;
}
