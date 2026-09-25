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

## Highlights, Checkpoint 8

- **Uploads, never search.** `search.list` costs 100 units of the 10,000 unit
  daily YouTube quota and `playlistItems.list` costs 1, so search would allow
  about a hundred calls a day against roughly ten thousand. Resolving the NFL
  uploads playlist and paging it is the whole read path.
- **Haiku classifies, code attributes.** The NFL channel is a mixed feed: a real
  page of 50 uploads held 27 social posts, 6 studio shows, 4 compilations, 2
  full games and 11 actual play clips. A title regex passed 51% of a 150 upload
  sample including "FULL GAME" replays and "Every Touchdown of Week 1", so
  judgment goes to the model. Matching a name to a player id and deciding owned
  versus free agent stays in code, where it can be checked.
- **The video id is the primary key**, so a clip cannot be stored twice and the
  stored ids tell the tagger what it has already seen.
- **Only unseen uploads are classified.** Classifying a full page costs about
  two cents; re-reading everything hourly would run to real money over a
  weekend for no new information.
- **Hourly rather than the brief's every 30 minutes**, Matt's call, to halve the
  tagging spend.
- **Name matching on titles runs near 60%**, lower than the 29 of 30 the same
  normalisation achieves on ESPN play text, because titles often name nobody:
  "WALKER WALKS IN THE ENDZONE", "The No. 6 overall pick gets the INT". An
  unmatched clip still stores, without an owner, the same way an unattributed
  touchdown still posts.

## Night Glass and the live board, Checkpoint 12a

Scope beyond the brief, approved by Matt in order 12a (Night Glass site wide,
matchup redo, lines), 12b (speed), 12c (Squirt Says rankings), 12d (Rag
2.0).

- **Night Glass replaces the Checkpoint 2 frame.** Token names are unchanged, so
  every page took the new palette without being rewritten; structure lives in
  `app/glass.css` and the new components in `app/gameday.css`. Day Game is the
  light theme, Night Game the dark one, and both pass the contrast gate.
- **The contrast gate composites over the glows.** Panels are frosted glass over
  three stadium glows, so every pair is measured over the plain ground and over
  each glow at its peak, cards composited onto that ground and inner fills onto
  the card, and the worst reading must pass. The small reds and the link color
  were deepened for Day Game and lightened for Night Game to hold 4.5:1.
- **Chrome is one pinned, full width bar plus two ticker bands.** Floating
  capsules were built and rejected as reading like bubbles; the separate
  section strip was folded into the header (section left, wordmark center,
  week right), which shrinks on scroll. The ticker tags are pills now rather
  than the brief's single slanted shape, and the crawl runs in its own clipped
  window so no score shows beside a tag.
- **The ticker crawls at a fixed 32 pixels a second.** The old fixed 42 second
  loop meant speed scaled with content; sixteen NFL games ran several times too
  fast. The rail is measured and the duration derived from it.
- **Win probability is our own model**, credited as "SNFFL model". Each starter
  finishes on points so far plus his projection scaled by the share of his
  game left; uncertainty comes from DraftSharks' weekly floor and ceiling
  (read as 20th and 80th percentiles) or 45 percent of the projection, shrinking
  with the square root of game time left. Team totals are independent normals.
- **Lines come from ESPN's game summaries**, which carry DraftKings' spread,
  total and moneylines and ESPN's live win probability, for free. Pregame win
  probability is the moneyline with the vig removed. DraftKings is credited,
  never linked: a link into a sportsbook is an ad nobody asked to run. Player
  props need The Odds API and a key Matt has to create; not built until then.
- **Sources carry their own marks, worded "via", not "powered by".** The league
  uses ESPN, Sleeper, DraftSharks, DraftKings and YouTube; it is not partnered
  with them. Marks are each source's published asset, stored in
  `public/sources` so no visitor hotlinks a third party.
- **DraftSharks, pulled not copied.** Their public rankings pages load every row
  from a plain HTML endpoint with no login, and the PPR board matches this
  league's scoring exactly (checked row for row against Matt's custom export).
  `scripts/draftsharks-pull.ts` takes rest of season and the current week from
  GitHub Actions four times a week with a named user agent, matches every row
  to a Sleeper id (240 of 240 and 248 of 248 on the first run, nicknames
  matched on surname, team and position), and refuses to overwrite the last
  good file if a pull comes back short. Their interface and brand are not
  reproduced; their numbers are credited and linked wherever they appear.
- **Final means final.** Season results, streaks, awards and the Chug Meter
  now count only final games. Counting live ones gave a manager trailing on a
  Thursday night an L1 streak, and WIN and LOSE badges on games still in
  progress. Playoff odds simulate the week in progress instead of dropping it.
- **The theme script moved into head** as a plain inline script. next/script
  with beforeInteractive in body was the source of the production hydration
  error (React 418).

## Speed, lineup alerts and Sleeper links, Checkpoint 12b

- **The watcher runs every minute, triggered by Supabase.** pg_cron and pg_net
  call `/api/watch` on the site each minute Thursday through Tuesday, UTC. The
  route is guarded by `WATCH_SECRET`, held in Vercel and in Supabase Vault.
  An idle minute costs one cached ESPN request and returns in about 15ms. The
  five minute GitHub job stays on as a backup running the same code.
- **Every post carries a dedupe key** with a unique index behind it
  (`td:<play>`, `lead:<week>:<matchup>:<n>`, `shart:<week>:<roster>:<n>`), and
  the insert skips an existing key. Two runners mean two runs can overlap;
  without the key, both could read the feed before either wrote and post the
  same touchdown twice. Pushes go only for rows the insert actually wrote.
- **Scores refresh every 15 seconds while a game is live**, down from 30, and
  the Sleeper matchups, Sleeper stats and ESPN scoreboard caches match it so
  each refresh can bring something new. Idle pages do not poll at all.
- **Lineup alerts push to one manager only**, for a starter who is Out,
  Doubtful, on IR, suspended, PUP, not active, on bye, or an empty slot, while
  his game has not locked. Once when it first appears, and once as a final
  call inside 100 minutes of kickoff. Questionable does not alert: most of them
  play, and a Friday of Questionable pings would train people to ignore it.
  Each alert is claimed in `lineup_alerts` before it is sent, so it goes out
  once however many runs see it. Sleeper's injury status comes from the
  projections feed, which carries it even for players it no longer projects.
- **Lineup changes in the app are not possible, so the site links to them.**
  Sleeper's public API is read only, and acting on a manager's behalf would
  mean holding his Sleeper login. Buttons open the right Sleeper screen
  instead, from routes read out of Sleeper's own web app: `/team` (lineup),
  `/matchup`, `/players` (add or drop), `/trades`. On Android sleeper.com
  opens the app; on iPhone the app claims only its chat paths, so these open
  Sleeper's site in Safari until a link is confirmed on a real phone from the
  unlisted `/sleeper-links` test page and added to `APP_LINKS`.

## The Roast Pit, scoped September 2026, built after 12b

Matt's call on each point.

- **Name: The Roast Pit.** A casual roasting section beside the Rag, in the
  same house voice, on Home and in the Rag.
- **Two parts.** A weekly feature that roasts one manager and then hands him a
  real way out, and a Roast Board of 14 one line jabs refreshed each Tuesday.
- **Profanity allowed in the Roast Pit only.** The Rag stays clean.
- **Who gets featured: the managers who did not do well.** Not simply the low
  score. A rough week is ranked from the lowest score, the points left on the
  bench, and starters who were ruled out or inactive before their game and
  still started. The worst of it gets the feature; everyone else is fair game
  on the board.
- **Facts, not vibes.** The writer gets a dossier: roster with DraftSharks rest
  of season ranks, Sleeper injury status and notes, counted bench construction,
  draft slots against current value, and trade logic computed in code (where a
  team is thin, what it has spare, who has the opposite). Every number and
  player must come from the dossier, same validation as the Rag.
- **League lore lives in `config/lore.md`**, written by Matt in plain
  sentences. The writer may use what is in it and nothing it would have to
  invent, such as history from other leagues.

## The app mark and the opening animation, September 2026

- **Matt's logo is the official icon everywhere.** The manifest pair, the Apple
  touch icon, the favicon png and the .ico, which is written as a wrapped 32
  pixel png because sips cannot author one.
- **The intro plays once a session, muted, at 2.5x**, and its logo drifts and
  shrinks into a mark in the header. The flight is a FLIP measured against that
  mark, so it lands on it exactly.
- **The header mark keeps the icon's own rounded black ground.** The image that
  flies is the image that lands, so nothing has to be cut out of a background.
- **It is escapable and never blocking.** A tap, a key or Skip ends it, reduced
  motion never sees it, and the app renders behind it rather than after it. An
  app opened into a background tab waits for somebody to be looking before it
  plays and before it marks itself seen, because video autoplay is refused
  outright while a document is hidden.
- **3.2MB at 720p** through avconvert, down from 8MB, running 4 seconds at speed.

## Chug videos, to be featured

Matt keeps the league's chug videos in a Google Drive folder and wants them in
the app. The Chug Meter and the Shartzone carry only numbers and names today,
and footage of somebody paying his debt is the payoff both are missing. It is
also league made, so unlike the NFL's clips nobody can block it. Not built:
reading Drive needs an authorized connector, and serving them needs a hosting
decision, most likely pulling each one once rather than linking to Drive.

## A v2 visual overhaul, to be researched

Matt's direction: **drop light mode entirely** and make this a dark, mobile
first, app first experience. Desktop must still look good but is explicitly
secondary, and his call on it is phone first, widening gracefully: a wide
screen gets more columns of the same design, never a second design.

His call on sequencing: **research and mock first, no code in the live app**.

The first attempt, Blacklight, was rejected and removed. It is in the history
at 0ea9446 if it is ever wanted. It deserved rejecting: near black ground, one
cyan accent, every container the same rounded card, pill chips, mono micro
labels, a glowing active tab. Swap the words and it is a crypto dashboard. It
was a theme rather than a world, and it borrowed nothing from a league that
already owns a distinctive visual language in the Rag's print identity.

**The rule that comes out of it: the direction has to be grounded in a
reference, not derived from adjectives.** "Dark, sleek, app first" describes
the safest version of every dark app ever made. Matt is supplying the
reference. Until then, Day Game stays and both themes keep passing the contrast
gate.

## Squirt Says, Checkpoint 12c

The week read forwards. C'mon Man judges a lineup once it cannot change; this
is the same arithmetic run before kickoff, while the manager can still act.

- **Six verdicts, ranked by whether he can still do something about it.** A
  starter listed OUT, a bench player projected above the starter in a slot he
  is eligible for, a starting slot that is a hole, the quietest game on the
  board, the widest gap between ceiling and projection, and the steadiest floor
  in the lineup. A seventh, his biggest number, exists only so all fourteen
  managers appear.
- **The voice is written in code, not by Claude.** It has to be true every
  time and it is built entirely from the numbers, so a writer plus a
  validation pass would cost money to reach the same sentence. Three phrasings
  per verdict, chosen by hashing the player and the week, so the board is
  stable across renders and does not read as one template fourteen times.
- **Every saying carries its number.** Nobody has to take the oracle's word.
- **Quarterbacks are excluded from the safe verdict.** They hold the highest
  floor in every lineup, so allowing them meant telling fourteen managers about
  their quarterback.
- **No claim the data cannot support.** A first pass said a player "has not had
  a bad day in months", which no column knows. Sayings assert the number and
  nothing else.
- **Sources:** projections from Sleeper, floors and ceilings from DraftSharks,
  game totals from the book through ESPN, each credited where it is used.

## Notifications, rebuilt September 2026

The first version sent every touchdown in the league to every device, plus lead
changes, which read as random score updates. Ten alert types now exist and each
one is addressed to the people it is about.

- **The rule: an alert should be about you.** Your players scoring, your
  opponent scoring, your lead changing, your close finish, your final score,
  your lineup problem, your C'mon Man, your chug.
- **Every touchdown in the league is still available and off by default.** It is
  the one loud setting, and it was the old behaviour, so it is kept as a choice
  rather than removed.
- **One touchdown, one alert.** The owner hears "your guy just scored", the
  manager across from him hears whose it was, and the league wide version
  excludes both so nobody is told twice.
- **Types, in `lib/alert-prefs.ts`:** my_td, opponent_td, league_td,
  lead_change, close_finish, final, lineup, cmon, chug, rag. Each has its own
  switch in Settings, per device.
- **Settings live in a `prefs` jsonb column** on push_subscriptions, so adding
  a type later is a code change and not a migration. Rows written before this
  carry the two original booleans and are still honoured.
- **A close finish is inside eight points with at most two and a half player
  games left**, counted from how much clock each starter's NFL game has
  remaining. Both managers hear it, worded from their own side.
- **Alerts that are not feed posts are claimed in `alert_claims` before they are
  sent**, because the watcher runs every minute. Without the claim a close
  finish would arrive sixty times an hour. A database without the table claims
  nothing and so sends nothing: silence is the safe failure.
- **The Rag pushes when it publishes**, once, and every manager who won hardware
  hears what he won.
- One time SQL: `docs/sql/12b-alerts.sql`.

## C'mon Man, made real, September 2026

It was previously a generic callout. It now names an actual decision, judged
only once the player in question can no longer score.

- **Three calls.** A bench player who outscored a starter at his own slot by ten
  or more, a starter who finished under two points, and a loss by less than the
  best bench swap would have gained.
- **The optimal lineup fills fixed slots before FLEX**, so a FLEX call is a real
  alternative and not double counting a player already used.
- **One call of each kind per manager per week**, the worst one, so a bad Sunday
  is one post and not nine.

## Presentation

- All 14 managers appear on every surface. No truncated lists.
- The league ticker uses team names, not manager names, with scores styled
  distinctly from names and a divider between matchups.
- Completed matchups read as a fantasy boxscore: the winner is marked and every
  player's score sits in its own box.

## Write access to Sleeper and DraftKings, filed September 2026

Matt asked whether OAuth could let the app do the things it currently only
links out to: set a lineup, propose a trade, make a claim.

**It cannot, through any route open to us.** Sleeper's API documentation is
explicit: "We do not perform authentication as our API is read-only and only
contains league information", and "No API Token is necessary, as you cannot
modify contents via this API." There is no OAuth flow, no token, and no write
endpoint to authorise against. Sleeper does invite enquiries about licensing
for commercial use, which is the only door to anything beyond reads, and this
is a private fourteen person league rather than a commercial product.

DraftKings is the same answer for a different reason. There is no public
consumer API, and we do not talk to DraftKings at all: the lines on the
Scoreboard come from ESPN's own odds feed, which names DraftKings as the
book. Placing a bet from here was never on the table and is not something
this app should do.

**So the workaround stays, and it is the right one.** Every action lives as a
deep link into the Sleeper app, on the screen where the thing can actually be
done, marked with Sleeper's own logo so it is obvious you are leaving. Sleeper
knows who is logged in; this site does not need to, which also means it never
holds a credential for anyone's account.

**Revisit if** Sleeper ships a public OAuth or write API, or if the league
ever wants this badly enough to ask Sleeper about a licence. Until one of
those changes, treat the deep links as the finished feature and not as a
placeholder.
