// Repairs the highlight rows written while the thumbnail column was missing.
//
// The write path retried without thumbnail and side together, so every clip
// stored this season lost its unit tag, and ESPN clips stored no still at all
// and had to be fetched from ESPN on every cold render. This fills both in.
//
//   thumbnail   refetched from ESPN for espn: clips. YouTube clips need none:
//               their still is derived from the video id.
//   side        read back off the play type, conservatively. A play type that
//               says nothing about the unit is left null rather than guessed.
//   owner       a defensive or special teams clip with no owner is offered to
//               whoever rosters that team's defense, the same rule the pull
//               uses, since nobody in this league rosters a cornerback.
//
// Reports and changes nothing with --dry. Run with Node 24.
//   node --env-file=.env.local scripts/highlight-backfill.ts --dry

import { getEspnClip } from '../lib/espn-video.ts';
import { allPlayers } from '../lib/league.ts';
import { isEspnClip } from '../lib/highlights.ts';
import { getRosters } from '../lib/sleeper.ts';
import { writeClient } from '../lib/supabase.ts';

const DRY = process.argv.includes('--dry');

/** Play types that name their unit. Anything else stays null. */
const SPECIAL = /punt return|kick(off)? return|punt|kickoff|field goal|extra point|blocked/i;
const DEFENSE = /interception|pick ?six|sack|safety|defensive|fumble recovery|forced fumble|strip/i;
const OFFENSE = /passing|rushing|receiving|touchdown catch|reception|run|carry|pass/i;

function sideFor(playType: string | null): string | null {
  const text = playType ?? '';
  if (!text) return null;
  if (SPECIAL.test(text)) return 'special_teams';
  if (DEFENSE.test(text)) return 'defense';
  if (OFFENSE.test(text)) return 'offense';
  return null;
}

const client = writeClient();
if (!client) {
  console.error('no Supabase service credentials');
  process.exit(1);
}

// Whether the still column exists yet. Without it the run still fixes unit
// tags and attribution, and stills are filled in on a later run.
const probe = await client.from('highlights').select('thumbnail').limit(1);
const hasThumbnail = !probe.error;
if (!hasThumbnail) console.log('  no thumbnail column yet, so stills are skipped this run');

const { data, error } = await client
  .from('highlights')
  .select('id, week, title, play_type, side, owner_team_id, player_ids')
  .limit(2000);
if (error) {
  console.error(`could not read highlights: ${error.message}`);
  process.exit(1);
}
const rows = data ?? [];
console.log(`${rows.length} clips stored`);

// Who owns each team defense, so a defensive clip can find its manager.
const ownerOfDefense = new Map<string, number>();
try {
  for (const roster of await getRosters()) {
    for (const playerId of roster.players ?? []) {
      // A team defense is stored under its own code: KC, SF, WAS.
      if (/^[A-Z]{2,3}$/.test(playerId)) ownerOfDefense.set(playerId, roster.roster_id);
    }
  }
  console.log(`  ${ownerOfDefense.size} team defenses rostered`);
} catch {
  console.warn('  Sleeper rosters unavailable, leaving attribution alone');
}

// Sleeper keys a team defense by its code. ESPN spells four of them its own way.
const DEF_CODE: Record<string, string> = { WSH: 'WAS', JAC: 'JAX', LA: 'LAR', LVR: 'LV' };
const teamOfPlayer = new Map<string, string>();
for (const player of allPlayers()) {
  if (player?.id && player.team) teamOfPlayer.set(player.id, DEF_CODE[player.team] ?? player.team);
}

type Patch = {
  id: string;
  side?: string | null;
  thumbnail?: string | null;
  owner_team_id?: string | null;
  player_ids?: string[] | null;
};
const patches: Patch[] = [];
let stills = 0;
let tagged = 0;
let credited = 0;

for (const row of rows) {
  const patch: Patch = { id: row.id };

  const side = row.side ?? sideFor(row.play_type);
  if (side && side !== row.side) {
    patch.side = side;
    tagged++;
  }

  if (hasThumbnail && isEspnClip(row.id)) {
    const clip = await getEspnClip(String(row.id).slice('espn:'.length));
    if (clip?.thumbnail) {
      patch.thumbnail = clip.thumbnail;
      stills++;
    }
  }

  // Only a clip nobody owns is reassigned. An existing attribution stands.
  //
  // A defensive clip names the player who made the play, and nobody in this
  // league rosters a cornerback. So the tackler is resolved to his NFL team and
  // the clip is credited to whoever rosters that defense, which is the asset
  // the play actually belongs to. The clip then reads as the D/ST rather than
  // as the individual.
  if (!row.owner_team_id && (side === 'defense' || side === 'special_teams')) {
    const codes = (row.player_ids ?? []).map((id: string) =>
      ownerOfDefense.has(id) ? id : teamOfPlayer.get(id)
    );
    const unit = codes.find((code: string | undefined) => code && ownerOfDefense.has(code));
    if (unit) {
      patch.owner_team_id = String(ownerOfDefense.get(unit));
      patch.player_ids = [unit];
      credited++;
    }
  }

  if (Object.keys(patch).length > 1) patches.push(patch);
}

console.log(`  ${patches.length} clips to change: ${stills} stills, ${tagged} unit tags, ${credited} newly credited`);
for (const patch of patches.slice(0, 12)) {
  const bits = [patch.side && `side ${patch.side}`, patch.thumbnail && 'still', patch.owner_team_id && `owner ${patch.owner_team_id}`];
  console.log(`   ${patch.id}: ${bits.filter(Boolean).join(', ')}`);
}
if (DRY) {
  console.log('dry run, nothing written.');
  process.exit(0);
}

let written = 0;
for (const patch of patches) {
  const { id, ...fields } = patch;
  const update = await client.from('highlights').update(fields).eq('id', id);
  if (update.error) {
    console.warn(`  ${id} failed: ${update.error.message}`);
    // A missing column stops the run rather than repeating the warning 82 times.
    if (/column/.test(update.error.message)) break;
    continue;
  }
  written++;
}
console.log(`updated ${written} of ${patches.length}`);
