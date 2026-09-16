# Decisions

Scope decisions agreed in conversation that are not in `docs/BRIEF.md`. The
brief stays the source of truth for everything it already covers. This file
exists so later checkpoints do not have to re-litigate what was settled.

## Chug rules and the Chug Meter

- The chug rules themselves live in `config/league-rules.ts`, in Matt's wording.
- **The Chug Meter counts weekly lowest-score finishes, not beers.** Videos are
  submitted through Instagram and archived in Google Drive, so the site never
  learns whether a chug actually happened.
- A late 2 beer penalty therefore does not show as two beers. Forfeits do show,
  because Matt applies them in Sleeper and every downstream number reads Sleeper.
- Manager of the Week, Sharts and chug counts are all derived from weekly high
  and low scores, so none of them wait on the writing pipeline.

## Chug reminders, Checkpoint 9

Push reminders to whoever owes a chug, in Central time:

- Tuesday morning, Thursday evening, Saturday evening, Sunday morning.

Targeting uses `push_subscriptions.team_id`, set when someone picks My Team in
Settings, so it only reaches managers who installed the app and enabled alerts.
This is scope beyond the brief, which specifies push only for touchdowns and
lead changes.

## Stories, Checkpoint 10

- **Team highlight reels**, YouTube Shorts in feel, built from clips tagged to
  that team's players. Depends on Checkpoint 8, which is where clips get tagged
  to players and marked owned or free agent.
- **Recap slides stay alongside reels**, not replaced.
- **When a manager has no clips that week, fall back to the recap slides** and
  lead with the exciting scores.
- **This week only**, refreshed every week.

Known constraints, agreed up front: official NFL uploads are 16:9 so a vertical
frame either letterboxes or crops, autoplay must start muted, playback is a
YouTube embed and never re-hosted video, an unplayable embed must be skipped
rather than shown dead, and per-player coverage depends on tagging accuracy
within the uploads-only quota budget.

## Trades

Trades render from Sleeper transactions as soon as they complete. Letter grades
come from the Trade Desk in Checkpoint 6, so a trade shows ungraded until then.

## Player research, Checkpoint 5c

Requested in conversation. The brief covers player pages with stat tiles and a
game log, but it describes neither NFL season stats nor list controls, so this
is scope beyond it.

- **Season stats come from Sleeper's stats endpoint** and are committed nightly
  as raw stat lines. Trimming is by player, not by field: only players already
  in the trimmed database, and only those who have played. Curating the field
  list saved 1KB of 230KB, so a field mapping layer would buy nothing and add
  chances to mislabel a number on screen.
- The committed file is **292KB**, against 234KB for the player database.
- **An empty response never overwrites the file.** A broken endpoint would
  otherwise wipe data the player pages read.
- **Stat blocks answer to league scoring**, not Sleeper defaults: full PPR, 25
  yards per passing point, field goals scored in distance bands from 3 up to 6,
  and a defense scored on takeaways plus banded points and yards allowed. An
  empty block is dropped rather than rendered blank.
- **Upcoming week projections use the existing projections call at request
  time** and are never committed. Only about 475 of 3,305 rows carry a
  projection, so a player without one reads as unavailable, never as zero.
- **The Players list gets sort and filter controls.** Free agents sit behind a
  toggle, since showing all 876 at once would need virtualization.

## Live layer, Checkpoint 7

Decisions taken while building the watcher that the brief does not specify.

- **Touchdowns come from ESPN scoring plays, not from fantasy point jumps.** A
  six point jump is equally six receiving yards' worth of points in this league,
  so inference would post wrong things confidently. Sleeper is used only to
  attribute a play to a manager.
- **Scorer names are matched after normalising suffixes.** ESPN writes "Deebo
  Samuel Sr." where the player database has "Deebo Samuel", and no name in the
  database carries a suffix, so the normalisation only runs one way. Measured on
  real Week 1 plays it took matching from 28 of 30 to 29. The remaining miss is
  a defensive player correctly absent from a fantasy database.
- **An unmatched touchdown still posts**, without a manager attached. The Feed
  is a football feed before it is a fantasy feed.
- **The watcher keeps no state of its own.** Dedupe reads the play ids earlier
  runs wrote into `feed_posts.payload`, and the hourly cap counts recent rows.
  A snapshot file would mean hundreds of commits a weekend, and a missed run
  cannot desynchronise anything this way.
- **Ownership comes from the live Sleeper rosters**, not the nightly starters.
  `teams.json` stores 126 starters rather than full rosters, and built from that
  only 18 of 30 real touchdowns attributed to a manager.
- **Only the service role writes.** The anon key ships in a public bundle, and
  was checked against the live project: it reads `feed_posts` and is refused on
  insert by row level security.
- **Live polling is a dedicated component, not part of the chrome.** The chrome
  renders on every route, so a timer there would poll all week. It also stops
  while the tab is hidden.
- **Motion inventory.** Six keyframes ship: the wordmark wave, drip and slosh,
  the ticker scroll, the LIVE badge pulse, and the page transition. Checkpoint 7
  adds the TOUCHDOWN wipe and the lead change banner. All of them are covered by
  the single `prefers-reduced-motion` block in `globals.css`, which collapses
  animation duration, iteration count and transition duration across every
  element, so none carries a guard of its own.

## Presentation

- All 14 managers appear on every surface. No truncated lists.
- The league ticker uses team names, not manager names, with scores styled
  distinctly from names and a divider between matchups.
- Completed matchups read as a fantasy boxscore: the winner is marked and every
  player's score sits in its own box.
