# v4 audit against DESIGN-v4.md

Every route measured against the contract's 10 point checklist at 360, 390
and 430 px in light and dark. Measured by script (type sizes and weights,
card padding, tap targets, row heights, page overflow, console errors, text
contrast) and reviewed by eye from full page screenshots (dead space, lists
versus boxes, hierarchy, module value, copy).

Key: Pass, Fixed (changed in this pass), Open (named below, not fixable in code
alone).

## Checklist by route

| Route | 1 Type | 2 Edges | 3 No dead space | 4 Lists | 5 Color | 6 Art | 7 Label and fact | 8 Earns space | 9 Copy | 10 Targets |
|---|---|---|---|---|---|---|---|---|---|---|
| Home (all moments) | Fixed | Fixed | Fixed | Pass | Pass | Open | Fixed | Fixed | Open | Fixed |
| Scores | Pass | Fixed | Pass | Fixed | Pass | Pass | Pass | Pass | Fixed | Fixed |
| Matchup | Pass | Fixed | Pass | Pass | Pass | Pass | Pass | Pass | Fixed | Fixed |
| NFL slate | Pass | Fixed | Pass | Fixed | Pass | Pass | Fixed | Pass | Pass | Fixed |
| NFL game | Fixed | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Fixed | Fixed |
| The Rag, issue, story | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Fixed |
| League | Pass | Fixed | Pass | Pass | Pass | Open | Pass | Pass | Pass | Fixed |
| Bracket | Pass | Fixed | Pass | Fixed | Fixed | Pass | Pass | Pass | Pass | Fixed |
| Rules | Pass | Fixed | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Fixed |
| Swami | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Fixed | Fixed |
| Account | Fixed | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Fixed |
| Players browser | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Fixed | Fixed |
| Player profile | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Fixed | Fixed |
| Managers | Pass | Pass | Pass | Pass | Pass | Open | Pass | Pass | Pass | Fixed |
| Manager | Pass | Pass | Pass | Pass | Pass | Open | Pass | Pass | Fixed | Fixed |
| Feed | Pass | Fixed | Pass | Pass | Pass | Pass | Pass | Fixed | Open | Fixed |
| Trophy Case | Pass | Fixed | Fixed | Fixed | Pass | Open | Fixed | Pass | Pass | Fixed |
| Chug Meter | Fixed | Fixed | Fixed | Pass | Fixed | Open | Fixed | Fixed | Fixed | Fixed |
| Trades | Pass | Fixed | Pass | Pass | Pass | Pass | Pass | Fixed | Fixed | Fixed |
| Insights | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Fixed |
| My Team | Fixed | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Fixed | Fixed |
| Error, not found | Pass | Pass | Pass | Pass | Pass | Pass | Fixed | Pass | Fixed | Fixed |

Measured after the fixes: every text element is in the type table, every card
pads 14 px, no tap target under 44 px (one rounding case at 43.99 px), no page
level horizontal scroll, no console errors, and no text under 4.5:1 in either
theme at 360, 390 or 430 px.

## Fixes

### Matt's three
- Home, Trophy Case: award tiles. Rebuilt as one `AwardTile`: a square art slot (takes Squirt's transparent PNG or WebP through `AWARD_ART` or an `art` prop; the gold icon disc is only the fallback), then three lines and nothing else: award name 11/600 caps gold, team 15/800, manager and the winning number 13/400. Padding 14 on all sides, width set by the rail, opens the winner's page. Trophy Case shows the week's awards as one list card with divided rows, not a grid of boxes.
- Home, Feed: the Feed now has a segmented All, NFL Clips, League toggle (44 px, remembered per device). Home's module plays the newest league clip in place (muted, tap for sound, one at a time, starts on view) above three league updates; NFL Clips shows three clips, League five updates. The Feed page gets the same toggle; clips play inline in a full width stack instead of a side rail.
- Home, Chug Meter: the chug states who owes this week in one card: team, manager, the week, the deadline from the league's rules, and the status (Owes a chug, Paid with the film, Two-beer penalty, Two beers overdue). Home's Film tile no longer repeats the chug. The Chug page leads with This Week; the season tally is now titled Chug Meter, not Who Owes.
- Chug pop: sized to the film. The card wraps the clip with 14 px on every side, fits inside the safe areas, keeps the clip's shape in portrait and landscape, and refits on rotate (measured at 390x844, 844x390 and 360x640). Close and sound buttons are 44 px.

### System
- Icons: four sets merged into `icons.tsx`; duplicates deleted.
- One section head (`SectionHead`); `modules/Head` deleted.
- Tokens for every pastel and on-fill color, also on `html:has(.root)` so portaled sheets and pops get them; per-file dark overrides removed.
- Shared `.tag`, `.filter`, `.filterRow`, `.rail`, `.seg`, `.inj` replace four tag styles, three filter styles and three rails.
- Edges: page gutter 16 px; section titles, day heads, round labels and notes sit on the 14 px inner line; every card pads 14 (starters, bench, chug film, NFL score cards fixed).
- Spacing: every gap on the 4 px grid (164 values snapped).
- Corners: chips, tags, inputs and small tiles 10; cards, bars, sheets and standalone media 20.
- Bold is 800 everywhere (no browser 700).
- Tap targets: every link, button, tab and summary gets a 44 px hit area without changing its look; selects are 44 px.
- Shadows: empty states and the bracket lists no longer carry a shadow (not tappable).
- Dead CSS removed (about 45 rules), including a scores rule that never matched.

### By route
- Scores: matchups were one card each; now one list card with divided rows.
- NFL slate: games were one card each; now one list card per day, labeled Live, Final or the day.
- Bracket: games were one card each; now one card per round with divided games.
- Home Film: one film alone sat half width beside empty space; it now spans the width at 16:9.
- Matchup, Scores: "Set Lineup" promised a Sleeper screen its links cannot open; now "Open Sleeper", one button.
- My Team: "Make the swap in Sleeper" is now Copy swaps plus Open Sleeper; injury tag wrapped as a wide pill, now the compact `.inj` after the position.
- Player profile: "Propose a trade" and "Claim on waivers" are now Copy trade ask or Copy claim plus Open Sleeper.
- Players, Manager: injuries read "Questionable" in a long pill; now Q, D, OUT or IR.
- Swami: rows used full names and manager names; now K. Cousins and team names. All filters share one style.
- Trades: "0 trades · 0 yours" on an empty page; the empty state now points to Swami's Trade Checker.
- NFL game: the visually hidden title used inline styles at 30 px; now the shared screen reader class.
- Error, not found, NFL game: Title Case fixes ("Nothing Here", "This Page Didn't Load", "This Game, on Tape").

## Open
- Item 6, league art: awards, the chug and Squirt still show the Material fallback icons and the 3.0 Squirt drawing. The art slot is built (`AWARD_ART` in `modules/AwardIcon.tsx`); it fills as the Squirt kit's cutouts land.
- Item 9, Feed copy: the watcher's stored posts name managers first ("C'mon Man, Matt", "Andrew takes the lead"). The fix belongs in the watcher that writes them (`lib/feed`), outside the lab.
- Shadows on read-only lists (Rules scoring, Season grids) remain from the shared `.list` card; splitting a non-tappable list style is a follow-up.
- Switzer also sets the italic seed and week numerals and the `.title` section titles. Step 2 approved these in screenshots; flagging only.

## Relics replaced (kit rebuild, 2026-10-27)

| Page | Relic | Replaced by |
|---|---|---|
| NFL Scores | Score-bug slate tiles (win bar, implied totals, spread pairs, league-starters pill in one card) | Kit `Pair` rows in one `List` per group (Live, each kickoff day, Final); starters as the foot label; odds moved to the game page |
| NFL Scores | Old week chips | Kit `Chip` in a kit `Rail` |
| NFL game | Photo board header with venue art and win bar | One `Card` with a big `Pair`, a `Meter` and venue `Tag`s |
| NFL game | Custom weather facts | Kit `Stats` |
| NFL game | Custom season grid | Kit `Versus` |
| NFL game | Line card with stacked pairs and BookTable (deleted) | One Odds `List` of kit `Row`s, every book as a row |
| NFL game | Custom skin-in-the-game groups | One `List` per team: `Avatar` team row, then `Face` player rows |
| The Rag | Capsule week chips, static white issue card, custom story list | Kit `Chip`s in a `Rail`, `RagCard`, one tappable `List` of `Row`s with `thumb` art |
| Rag story | Reading card (static white card) and its own back link | Flat reading column from ui roles (`label`, `display`, `bodyText`, `Media`); back is the top bar's |
| League | Capsule page chips, custom standings table with header row and heavy cut line | Kit `Chip`s in a `Rail`; one tappable `List` of `Row`s (`Rank` and `Avatar` lead, record and playoff odds on the right), a "Playoff line" label at the cut |
| League | Gold award discs in standings | Award symbol on a neutral kit `Tag` (one gold per screen) |
| Bracket | Custom bracket sides and gold champion banner | Kit `Pair` per game in a flat `List` per round; champion as one `Row` with a gold `Label` |
| Rules | Static white rule cards, custom numbered lists and point tables | Flat `Section`s; numbered `Row`s with `Rank`; scoring as `Row`s with the value on the right; lineup as `Pos` tags |
| Trophy Case | Custom award rows, capsule history chips, gold award chips on every shelf | `AwardTile` as a kit `Row`; Every Award as flat `Row`s with the full history in one `Drawer`; shelves as tappable `Row`s with the pieces in the sub line |
| Chug Meter | Static white film card, red week numbers and scores, steins beside the count, custom archive card | Flat `Section`s and `Row`s; count once on the right; chug film once (This Week no longer repeats it); archive in a kit `Drawer` |
| Shart citation | Static white ticket with red labels and a 38/900 score | Flat `Row`s: who and the score, numbered charges, the sentence with a `Pill` to the Chug Meter |
| Trades | Static white list, capsule player chips | Flat `List`, one row per trade; players as kit `chip` buttons with a `Face` that open the sheet; picks and FAAB as `Tag`s |
| Insights | Static white lists, custom luck table, quiet mark chips | Tappable player `Row`s (`Face` lead); groups under `Label`s; luck as `Row`s; source lines as notes |
| Feed | Old segment toggle, gradient story rings, static white lists, colored mark chips, blue "Show all" bar | Kit `seg` buttons; `Avatar` with a first-name `Label` (brand when it has clips); kit `row` and `Tag` marks; `pill` for History and YouTube; filter chips as kit `chip` buttons in a `Rail` |
| Feed and the week in 90 seconds | Two story players with capsule buttons, round close buttons and 900 weight | One `StoryStage` block for both: 10 corners on controls, 20 on panels, weights 400/600/800 |
| Clips | Shadowed stills and a round white play button | Kit `media` and a `pillWhite` play button |
| Swami | Two expanding panels (trade, waivers) above a 50 row wall under two rows of filter chips | Kit `Seg` (Players, Waivers, Trade); each view one row of `Chip`s in a `Rail`, the rest in a `FilterSheet`; Players adds a `SearchField` and 25 rows with Show more |
| Swami | Labeled figure pills (Tag label plus value) and the weekly cells grid | Kit `Stats` (via `StatGrid`) and kit `Tag` |
| Swami | Pickups and traded players as custom details rows | `ExpandRow` block in a kit `List` |
| Swami | Trade sides as two boxed columns | One kit `Versus`; week by week as a `Versus` in a `Drawer` |
| Swami, player, My Team | Copy move and Open Sleeper as custom buttons | Kit `pill` (primary and secondary) |
| Players | Search box, two chip rows, two selects and a capsule toggle in a static card | `SearchField`, one chip row, the rest (sort, show, NFL team, league team) in a `FilterSheet` |
| Player | Team color hero card with cutout, owner strip, chips | `ProfileHead` block (cutout, 24/800 name, tags) and a kit `Row` to the owner |
| Player | Custom cells, tiles, dl pairs and a usage table | Kit `Stats` (via `StatGrid`) and kit `Row`s |
| Player, Manager | PointsBars with 2 px bars and capsule legend | `WeekBars` block: square bars, scrub across the chart (the whole chart is the tap target) |
| Player | Clip tiles with a round dark play button and capsule sound button | Kit `media` with a `Tag` play label and a kit `chip` sound button |
| Managers | Rows with seed, ring and award pills | Kit `Row`: `Rank` and `Avatar` lead, awards in the sub line |
| Manager | Hero card, award tiles on gold, custom game card | `ProfileHead`, Trophy Case as kit `Row`s, the game as a kit `Pair`; bench, IR and taxi in `Drawer`s |

## Copy (kit rebuild)

| Was | Now |
|---|---|
| NFL Slate | NFL Scores (page keeps the branded word "nfl") |
| NFL Game | The game itself in the header; branded word "nfl" |
| NFL Week N (section) | Live, each kickoff day, Final |
| Full slate | All games |
| At Kickoff | Weather |
| Season So Far | Season Stats |
| The Line / Lines Across Books | Odds (books as rows inside it) |
| Who Has Skin in This | League Players |
| This Game, on Tape | Highlights |
| "‹ NFL Week N" back label | "‹ NFL Scores" |
| Rag story "Week N issue" link | Removed; the top bar goes back to the week |
| If the Season Ended Today (bracket section) | Note: "If the season ended today. Top 7 make it; playoffs start week 15." |
| W-L / Playoffs (standings header) | Record on the right, "NN% playoffs" under it |
| Shart Bowl note "Losers bracket. The loser chugs" | Kept, under the section title The Shart Bowl |
| Every Trade count "N trades · N yours" | "N trades this season, N yours" |
| Steals / Busts / Rising / Falling | Kept as group labels |
| Usage chips "SNAPS 40% TO 62%" | "Snaps 40% to 62% · Targets 10% to 18%" in the row |
| Luck table headers Team / Record / All-play / Luck | Row: "Jack · 4-2, all-play 5-1", luck on the right with "Wins" |
| Stories (Feed) with "Week N" beside it | "Week N Stories" |
| NFL Clips "League players · via YouTube" beside the title | Same words as the note under the clips |
| Chug Meter "Chug Meter" link on the Chug Meter's own citation | Removed there; elsewhere a `Pill` |
| Chug Meter (Home module) link "Chug Meter" | "All teams" |
| Award "Not handed out yet" | "Not yet" |
| Swami: Trade Checker / Waiver Pickups panels, research list | Views: Players, Waivers, Trade |
| Ownership chips Everyone / Rostered / Free agents | Same words, in the sheet; "Free Agents" |
| Pickups For · The Whole League | Sheet "Pickups For", chip "League" |
| Best Adds · Lineup Points Added | Best Adds (value labeled "Lineup gain") |
| Best Available · Added to the Average Lineup | Best Available (value labeled "Avg gain") |
| Measured Against · A Typical Week | "{Team} Lineup", "Per game" |
| First Team Sends / Second Team Sends | "{Team} Sends" |
| Choose both teams to start. / Now pick at least one player from either roster. | Pick two teams. / Pick a player from either roster. |
| How It's Worked Out | How It Works |
| Rest of season / Raw in / Raw out tags | Versus rows: Verdict, Lineup, Per week, Lineup now, After, Raw in, Raw out |
| Players: Include free agents (toggle) | Show: Rostered, Everyone, Free Agents |
| Players: NFL team / League team selects, Sort by chips | Same, in the "More" sheet titled Sort and Filter |
| Player: owner strip "Rostered" pill | Section "On Sleeper" |
| Sleeper Props | Props |
| Coming up | Schedule |
| Game (link beside Week N) | Removed; the game row is the link |
| Season tiles' sub lines (Avg, % of it) | Stats: Points, Per game, Best, Games, Pts started, Starts, Rostered, Started, Snaps |
| Shaded: playoffs (legend) | Playoffs |
| Manager: Full matchup (link) | Removed; the game row is the link |
| Moves · Latest 10 | Recent Activity |
| ADD / DROP / START / BENCH marks | Add / Drop / Start / Bench tags |
| Bench · N / Injured reserve · N / Taxi · N | Drawers Bench, Injured Reserve, Taxi with the count |
