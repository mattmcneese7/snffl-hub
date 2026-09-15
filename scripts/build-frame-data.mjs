// Builds design/style-frame/data.json from real Sleeper data.
// Checkpoint 2 only. The full pipeline lands in Checkpoint 4.
import fs from 'node:fs';
import path from 'node:path';

const LEAGUE = process.env.SLEEPER_LEAGUE_ID || '1394336593518546944';
const API = 'https://api.sleeper.app/v1';
const CACHE = '.cache';

const get = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};

// The player database is about 5MB, so it is cached on disk and pulled once a day.
async function players() {
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, 'players.json');
  const fresh = fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < 864e5;
  if (fresh) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const data = await get(`${API}/players/nfl`);
  fs.writeFileSync(file, JSON.stringify(data));
  return data;
}

const [league, users, rosters, state, pdb] = await Promise.all([
  get(`${API}/league/${LEAGUE}`),
  get(`${API}/league/${LEAGUE}/users`),
  get(`${API}/league/${LEAGUE}/rosters`),
  get(`${API}/state/nfl`),
  players(),
]);

const scoredWeek = league.settings.last_scored_leg || 1;
const matchups = await get(`${API}/league/${LEAGUE}/matchups/${scoredWeek}`);

const byUser = Object.fromEntries(users.map((u) => [u.user_id, u]));

const teams = rosters.map((r) => {
  const u = byUser[r.owner_id] || {};
  return {
    rosterId: r.roster_id,
    userId: r.owner_id,
    // Team name is optional in Sleeper. Fall back to the manager's display name.
    teamName: u.metadata?.team_name || u.display_name || `Team ${r.roster_id}`,
    manager: u.display_name || 'Unknown',
    avatar: u.avatar || null,
    avatarUrl: u.avatar ? `https://sleepercdn.com/avatars/thumbs/${u.avatar}` : null,
    wins: r.settings.wins,
    losses: r.settings.losses,
    ties: r.settings.ties,
    pointsFor: Number(`${r.settings.fpts}.${r.settings.fpts_decimal ?? 0}`),
    pointsAgainst: Number(`${r.settings.fpts_against}.${r.settings.fpts_against_decimal ?? 0}`),
    starters: r.starters || [],
  };
});

const slots = league.roster_positions.filter((p) => p !== 'BN');

const player = (id) => {
  const p = pdb[id];
  if (!p) return { id, name: id, position: 'DEF', team: null, headshot: null };
  const isTeam = p.position === 'DEF' || !/^\d+$/.test(id);
  return {
    id,
    name: isTeam ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : `${p.first_name} ${p.last_name}`,
    short: isTeam ? p.last_name || id : `${p.first_name?.[0]}. ${p.last_name}`,
    position: p.position,
    team: p.team,
    headshot: isTeam
      ? `https://sleepercdn.com/images/team_logos/nfl/${String(id).toLowerCase()}.png`
      : `https://sleepercdn.com/content/nfl/players/${id}.jpg`,
    logo: p.team ? `https://sleepercdn.com/images/team_logos/nfl/${p.team.toLowerCase()}.png` : null,
  };
};

// Pair rosters into matchups and attach every starter with real points.
const pairs = {};
for (const m of matchups) (pairs[m.matchup_id] ||= []).push(m);

const games = Object.entries(pairs).map(([id, [a, b]]) => {
  const side = (m) => {
    const team = teams.find((t) => t.rosterId === m.roster_id);
    const lineup = (m.starters || []).map((pid, i) => ({
      slot: slots[i] || 'FLEX',
      ...player(pid),
      points: Number((m.players_points?.[pid] ?? 0).toFixed(2)),
    }));
    return { rosterId: m.roster_id, team: team.teamName, manager: team.manager, points: Number((m.points ?? 0).toFixed(2)), lineup };
  };
  const home = side(a);
  const away = side(b);
  return {
    matchupId: Number(id),
    home,
    away,
    margin: Number(Math.abs(home.points - away.points).toFixed(2)),
    winner: home.points > away.points ? home.rosterId : away.rosterId,
  };
});

// Standings: wins first, then points for. The playoff line sits after seed 7.
const standings = [...teams]
  .sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)
  .map((t, i) => ({ seed: i + 1, ...t, inPlayoffs: i < league.settings.playoff_teams }));

const topPerformers = games
  .flatMap((g) => [...g.home.lineup, ...g.away.lineup])
  .sort((a, b) => b.points - a.points)
  .slice(0, 5);

const out = {
  generatedAt: new Date().toISOString(),
  league: {
    name: league.name,
    season: league.season,
    teamCount: league.total_rosters,
    playoffTeams: league.settings.playoff_teams,
    playoffWeekStart: league.settings.playoff_week_start,
    rosterPositions: league.roster_positions,
  },
  state: { currentWeek: state.week, displayWeek: state.display_week, scoredWeek },
  teams,
  games,
  standings,
  topPerformers,
};

fs.mkdirSync('design/style-frame', { recursive: true });
fs.writeFileSync('design/style-frame/data.json', JSON.stringify(out, null, 1));
console.log(`wrote design/style-frame/data.json: ${teams.length} teams, ${games.length} games, week ${scoredWeek}`);
