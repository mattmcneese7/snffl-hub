// Chug reminders, docs/DECISIONS.md: Tuesday morning, Thursday evening,
// Saturday evening and Sunday morning, Central time, to whoever owes a chug.
//
// Fires regardless of whether the chug has happened. Videos go through
// Instagram and are archived in Google Drive, so the site never learns that a
// chug was done, and a reminder that stopped early would be guessing.
//
// Only reaches a manager who installed the app, turned alerts on, and picked
// their team in Settings, because targeting reads push_subscriptions.team_id.
//
// Run with Node 24, which strips TypeScript types natively.

import { CHUG_REMINDERS } from '../config/league-rules.ts';
import { getWeeklyExtremes } from '../lib/awards.ts';
import { getWeekGames, teamByRoster } from '../lib/league.ts';
import { pushConfigured, sendAlert } from '../lib/push.ts';

// Cron runs in UTC, so the reminder is chosen by the day it is in Central
// rather than trusted from the schedule: a Thursday 7 PM reminder fires at
// midnight UTC on Friday.
const today = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  timeZone: 'America/Chicago',
}).format(new Date());

const reminder = CHUG_REMINDERS.find((entry) => entry.day === today);
if (!reminder) {
  console.log(`no chug reminder scheduled for ${today}. Nothing to do.`);
  process.exit(0);
}

if (!pushConfigured()) {
  console.error('no VAPID keys, nothing can be sent');
  process.exit(1);
}

/**
 * The chug owed is the lowest score of the most recent week that is fully
 * final. Taking the latest low without that check would name somebody who is
 * merely losing a week still in progress.
 */
const { lows } = await getWeeklyExtremes();
let owed: (typeof lows)[number] | null = null;
for (const low of [...lows].reverse()) {
  const games = await getWeekGames(low.week);
  if (games.length && games.every((game) => game.status === 'final')) {
    owed = low;
    break;
  }
}

if (!owed) {
  console.log('no finished week yet, so nobody owes a chug.');
  process.exit(0);
}

const team = teamByRoster(owed.rosterId);
const delivered = await sendAlert(
  { kind: 'chug', teamId: String(owed.rosterId) },
  {
    title: `Chug owed, Week ${owed.week}`,
    body: reminder.note,
    url: '/chug',
    // One per week, so each reminder replaces the last rather than stacking.
    tag: `chug-${owed.week}`,
  }
);

console.log(
  `${today} ${reminder.time} reminder for ${team?.manager ?? owed.rosterId} (Week ${owed.week}, ${owed.points.toFixed(2)}): delivered to ${delivered} devices`
);
