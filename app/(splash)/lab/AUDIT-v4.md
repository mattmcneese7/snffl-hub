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
