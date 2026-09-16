// Nightly refresh, 3:00 AM Central. Brief Section 3.
// Pulls the Sleeper player database, nflverse ids, league settings and manager
// colors, then writes the trimmed results to data/ for the app to read.
//
// Run with Node 24, which strips TypeScript types natively.

import fs from 'node:fs';
import path from 'node:path';
import {
  AVATAR,
  HEADSHOT,
  TEAM_LOGO,
  getAllPlayers,
  getLeague,
  getRosters,
  getState,
  getUsers,
  type RawPlayer,
} from '../lib/sleeper.ts';
import { getSleeperToEspn } from '../lib/nflverse.ts';
import { buildManagerColors, type AvatarInput } from '../lib/managers.ts';
import type { LeagueInfo, PlayerLite, Team } from '../lib/types.ts';

const DATA = 'data';
const CACHE = '.cache';
// Keeping every fantasy relevant position, not just rostered players, means a
// waiver add or a free agent highlight still resolves to a real player without
// re-pulling the 14.6MB database mid-week.
const KEEP_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']);

/**
 * Canonical JSON with keys sorted at every level.
 *
 * Sleeper does not guarantee key order between responses: two runs three
 * minutes apart returned state/nfl with "season" and "season_type" swapped,
 * which rewrote the file and forced a commit from identical data. Sorting also
 * pre-empts the same churn in players.json, where integer-like player ids
 * iterate numerically but team defense keys like KC and SF do not.
 */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(source)
        .sort()
        .map((key) => [key, canonical(source[key])])
    );
  }
  return value;
}

function write(file: string, value: unknown) {
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(canonical(value), null, 1));
  const kb = (fs.statSync(path.join(DATA, file)).size / 1024).toFixed(0);
  console.log(`  wrote ${DATA}/${file} (${kb}KB)`);
}

/**
 * Thumbnails, not full size. The full size endpoint serves mostly WebP, which
 * needs a decoder we do not carry, while thumbs are JPEG and PNG. They are also
 * about 3KB instead of 86KB, and color sampling downsamples anyway.
 */
async function avatarBuffer(avatarId: string | null): Promise<Buffer | null> {
  if (!avatarId) return null;
  fs.mkdirSync(`${CACHE}/avatars`, { recursive: true });
  const file = `${CACHE}/avatars/${avatarId}-thumb`;
  if (fs.existsSync(file)) return fs.readFileSync(file);
  try {
    const res = await fetch(AVATAR(avatarId));
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(file, buf);
    return buf;
  } catch {
    return null;
  }
}

console.log('nightly refresh starting');

const [league, users, rosters, state] = await Promise.all([
  getLeague(),
  getUsers(),
  getRosters(),
  getState(),
]);
console.log(`  league: ${league.name}, ${league.total_rosters} teams, week ${state.week}`);

const leagueInfo: LeagueInfo = {
  name: league.name,
  season: league.season,
  teamCount: league.total_rosters,
  playoffTeams: league.settings.playoff_teams,
  playoffWeekStart: league.settings.playoff_week_start,
  rosterPositions: league.roster_positions,
  scoring: league.scoring_settings,
};
// No timestamp here on purpose: it would differ on every run and force a commit
// even when nothing about the league actually changed. Git records when data
// landed, and state.week says how current it is.
write('league.json', { ...leagueInfo, state });

// Manager colors, rebuilt from avatars with the portable decoder.
const avatarInputs: AvatarInput[] = [];
for (const user of users) {
  avatarInputs.push({
    userId: user.user_id,
    manager: user.display_name,
    image: await avatarBuffer(user.avatar),
  });
}
const colors = buildManagerColors(avatarInputs);
const failing = Object.values(colors).filter((c) => c.contrast < 4.5);
console.log(
  `  colors: ${Object.keys(colors).length} managers, ${failing.length} below 4.5:1`
);

const byUser = Object.fromEntries(users.map((u) => [u.user_id, u]));
const teams: Team[] = rosters.map((roster) => {
  const user = byUser[roster.owner_id];
  return {
    rosterId: roster.roster_id,
    userId: roster.owner_id,
    // Team name is optional in Sleeper. Fall back to the manager's display name.
    teamName: user?.metadata?.team_name || user?.display_name || `Team ${roster.roster_id}`,
    manager: user?.display_name ?? 'Unknown',
    avatar: user?.avatar ?? null,
    avatarUrl: user?.avatar ? AVATAR(user.avatar) : null,
    wins: roster.settings.wins,
    losses: roster.settings.losses,
    ties: roster.settings.ties ?? 0,
    pointsFor: Number(`${roster.settings.fpts}.${roster.settings.fpts_decimal ?? 0}`),
    pointsAgainst: Number(
      `${roster.settings.fpts_against}.${roster.settings.fpts_against_decimal ?? 0}`
    ),
    starters: roster.starters ?? [],
    colors: colors[roster.owner_id],
  };
});
// Sorted explicitly rather than trusting the order Sleeper returns rosters in.
teams.sort((a, b) => a.rosterId - b.rosterId);
write('teams.json', teams);

// Markup consumes palettes as classes: <article class="mgr-123"> then
// var(--mgr-primary). Keeps hex values out of components entirely.
const css = [
  '/* Generated by scripts/nightly-refresh.ts. Do not edit by hand. */',
  // Sorted: this object is built from the /users response, whose order can move.
  ...Object.entries(colors)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
    ([id, c]) =>
      `.mgr-${id} {\n  --mgr-primary: ${c.primary};\n  --mgr-secondary: ${c.secondary};\n  --mgr-on: ${c.onPrimary};\n}`
  ),
].join('\n');
fs.mkdirSync('app', { recursive: true });
fs.writeFileSync('app/manager-colors.css', css + '\n');
console.log('  wrote app/manager-colors.css');

// Player database: pulled once daily, then trimmed hard before it touches git.
const espnIds = await getSleeperToEspn();
console.log(`  nflverse: ${Object.keys(espnIds).length} sleeper to espn ids`);

const all = await getAllPlayers();
const players: Record<string, PlayerLite> = {};
let skipped = 0;

for (const [id, raw] of Object.entries(all) as [string, RawPlayer][]) {
  const position = raw.position ?? '';
  if (!KEEP_POSITIONS.has(position)) {
    skipped++;
    continue;
  }
  const isTeamDefense = position === 'DEF' || !/^\d+$/.test(id);
  // Inactive, or not on an NFL roster at all, means they cannot score, so they
  // cannot appear in a lineup, a waiver add or a highlight.
  if (!isTeamDefense && (raw.active === false || !raw.team)) {
    skipped++;
    continue;
  }
  const first = raw.first_name ?? '';
  const last = raw.last_name ?? '';
  const entry: PlayerLite = {
    id,
    name: `${first} ${last}`.trim() || id,
    short: isTeamDefense ? last || id : `${first.slice(0, 1)}. ${last}`,
    position,
    headshot: isTeamDefense ? TEAM_LOGO(id) : HEADSHOT(id),
  };
  // Null fields are dropped rather than written, since this ships to a public
  // repo every night.
  if (raw.team) {
    entry.team = raw.team;
    entry.logo = TEAM_LOGO(raw.team);
  } else if (isTeamDefense) {
    entry.team = id;
    entry.logo = TEAM_LOGO(id);
  }
  if (espnIds[id]) entry.espnId = espnIds[id];
  players[id] = entry;
}

console.log(`  players: kept ${Object.keys(players).length}, skipped ${skipped}`);
write('players.json', players);

console.log('nightly refresh complete');
