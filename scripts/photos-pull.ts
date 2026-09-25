// Collects the week's real game photographs for Rag lead art.
//
// Runs with the nightly refresh and again after the last game of the week, and
// writes data/photos.json, which the site reads directly. A file rather than a
// table: it is small, it is worth seeing in a diff, and the art has to be
// there at build time.
//
//   node --env-file=.env.local scripts/photos-pull.ts --week=2
//
// Run with Node 24, which strips TypeScript types natively.

import fs from 'node:fs';
import path from 'node:path';
import { collectPhotos, rankPhotos, type GamePhoto, type PhotoContext } from '../lib/game-photos.ts';
import { getNflGames } from '../lib/gameday.ts';
import { allPlayers, league, scoredWeek } from '../lib/league.ts';
import { getMatchups } from '../lib/sleeper.ts';

const FILE = path.join('data', 'photos.json');
/** Enough for a whole issue several times over, without bloating the file. */
const KEEP = 24;

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const week = Number(arg('week')) || (await scoredWeek());

const games = await getNflGames(week, league.season);
const started = games.filter((game) => game.state !== 'pre');
console.log(`photos pull, week ${week}: ${started.length} of ${games.length} games started`);
if (!started.length) {
  console.log('nothing has kicked off, so there are no photographs yet.');
  process.exit(0);
}

// Who is worth recognising in a caption: everybody who played this week for a
// team in this league, and what he scored, which is how impact is weighted.
const pointsOf = new Map<string, number>();
try {
  for (const matchup of await getMatchups(week)) {
    for (const [playerId, points] of Object.entries(matchup.players_points ?? {})) {
      pointsOf.set(playerId, Number(points));
    }
  }
} catch {
  console.warn('  Sleeper matchups unavailable, so photos rank on the caption alone');
}
const nameOf = new Map<string, string>();
for (const player of allPlayers()) {
  if (!player?.name || player.position === 'DEF') continue;
  // Only players who actually played: the caption match is a substring test,
  // and 2000 names is 2000 chances to match the wrong one.
  if (pointsOf.has(player.id)) nameOf.set(player.id, player.name);
}
console.log(`  ${nameOf.size} players to recognise in captions`);

const context: PhotoContext = { pointsOf, nameOf, season: league.season };
const raw = await collectPhotos(started.map((game) => game.id));
const ranked = rankPhotos(raw, week, context).slice(0, KEEP);
console.log(`  ${raw.length} photographs found, ${ranked.length} worth keeping`);
for (const photo of ranked.slice(0, 8)) {
  const who = photo.playerIds.map((id) => nameOf.get(id)).filter(Boolean).join(', ');
  console.log(`   ${photo.score.toFixed(2)}  ${photo.width}x${photo.height}  ${who || 'nobody named'}  ::  ${photo.caption.slice(0, 64)}`);
}

const existing: Record<string, GamePhoto[]> = fs.existsSync(FILE)
  ? JSON.parse(fs.readFileSync(FILE, 'utf8'))
  : {};
existing[String(week)] = ranked;
fs.mkdirSync(path.dirname(FILE), { recursive: true });
fs.writeFileSync(FILE, `${JSON.stringify(existing, null, 2)}\n`);
console.log(`wrote ${FILE}: week ${week} now has ${ranked.length} photographs`);
