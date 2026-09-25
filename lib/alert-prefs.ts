// What each manager wants to hear about, Checkpoint 12b.
//
// The first version sent every touchdown in the league to everyone who opted
// in, which is noise: most touchdowns have nothing to do with your week. Every
// alert now belongs to a type, each type can be turned off per device, and the
// ones that matter know whose players are involved.
//
// Pure and import free, so the settings screen and the watcher share it.

export type AlertKey =
  | 'my_td'
  | 'opponent_td'
  | 'league_td'
  | 'lead_change'
  | 'close_finish'
  | 'final'
  | 'lineup'
  | 'cmon'
  | 'chug'
  | 'rag';

export type AlertSpec = {
  key: AlertKey;
  label: string;
  note: string;
  /** On for a new device unless it is the noisy one. */
  fallback: boolean;
  /** Only reaches the manager it is about, so it needs a team picked. */
  needsTeam: boolean;
};

export const ALERTS: AlertSpec[] = [
  { key: 'my_td', label: 'My players score', note: 'A touchdown by somebody in your lineup.', fallback: true, needsTeam: true },
  { key: 'opponent_td', label: 'My opponent scores', note: 'A touchdown by the lineup you are playing this week.', fallback: true, needsTeam: true },
  { key: 'league_td', label: 'Every touchdown', note: 'Every touchdown in the league, whoever owns him. Loud by design.', fallback: false, needsTeam: false },
  { key: 'lead_change', label: 'Lead changes in my matchup', note: 'When the lead flips in the game you are playing.', fallback: true, needsTeam: true },
  { key: 'close_finish', label: 'Close finishes', note: 'Your matchup inside 10 points with almost nobody left to play.', fallback: true, needsTeam: true },
  { key: 'final', label: 'My final score', note: 'How your week ended, once every game is over.', fallback: true, needsTeam: true },
  { key: 'lineup', label: 'Lineup problems', note: 'A starter who is out, on bye, or an empty slot, before kickoff.', fallback: true, needsTeam: true },
  { key: 'cmon', label: "C'mon Man", note: 'When the site calls out one of your decisions. Brave.', fallback: true, needsTeam: true },
  { key: 'chug', label: 'Chug reminders', note: 'When you owe a chug, until you do it.', fallback: true, needsTeam: true },
  { key: 'rag', label: 'The Rag and trophies', note: "Tuesday's issue, and any hardware you win.", fallback: true, needsTeam: false },
];

export type AlertPrefs = Record<AlertKey, boolean>;

export const defaultPrefs = (): AlertPrefs =>
  Object.fromEntries(ALERTS.map((alert) => [alert.key, alert.fallback])) as AlertPrefs;

type StoredRow = {
  prefs?: Partial<AlertPrefs> | null;
  alert_touchdowns?: boolean | null;
  alert_lead_changes?: boolean | null;
};

/**
 * A device's settings, whatever shape its row is in.
 *
 * Rows written before this existed carry only the two original booleans, and
 * a database without the prefs column returns none at all, so both fall back
 * to the defaults with the old switches honoured where they exist.
 */
export function prefsFor(row: StoredRow): AlertPrefs {
  const out = defaultPrefs();
  if (row.alert_touchdowns === false) {
    out.my_td = false;
    out.opponent_td = false;
    out.league_td = false;
  }
  if (row.alert_lead_changes === false) out.lead_change = false;
  for (const [key, value] of Object.entries(row.prefs ?? {})) {
    if (key in out && typeof value === 'boolean') out[key as AlertKey] = value;
  }
  return out;
}
