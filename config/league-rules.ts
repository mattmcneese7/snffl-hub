// Custom league rules, the ones Sleeper cannot tell us.
//
// Scoring, roster and playoff rules are generated from Sleeper settings on the
// Rules page, per Brief Section 2. Only the rules that live outside Sleeper
// belong here, and this is the single place to edit them.

export type RuleSection = {
  title: string;
  intro?: string;
  rules: string[];
};

export const CHUG_RULES: RuleSection = {
  title: 'The Chugging Rules',
  intro: 'Lowest score of the week pays up. The site tracks who owes, and the videos go to the group.',
  rules: [
    'Lowest scorer of the week chugs AT LEAST a single 12oz beer. Brownie points for doing funny stuff.',
    'Chug must be recorded by the start of the first NOON game on the following Sunday of games.',
    'If a chug is not submitted in time, they have until 11:59p Sunday to submit a 2 BEER CHUG.',
    'If the 2 beer chug (both chugs) are not submitted by 11:59p Monday, the manager forfeits their game in the current week and must chug with the lowest score in the next week.',
  ],
};

/**
 * Reminder schedule for whoever owes a chug. Push alerts arrive in Checkpoint
 * 9; this is the schedule they will run on, in Central time.
 */
export const CHUG_REMINDERS = [
  { day: 'Tuesday', time: 'morning', note: 'You had the lowest score. You owe a chug.' },
  { day: 'Thursday', time: 'evening', note: 'Chug still outstanding.' },
  { day: 'Saturday', time: 'evening', note: 'Last full day before the deadline.' },
  { day: 'Sunday', time: 'morning', note: 'Due at the first noon kickoff, or it becomes 2 beers.' },
];

/** Where the videos live, so the Rules page can say so plainly. */
export const CHUG_SUBMISSION =
  'Record it and send it through Instagram. Videos are archived in Google Drive, not on this site.';

export const CUSTOM_RULES: RuleSection[] = [CHUG_RULES];
