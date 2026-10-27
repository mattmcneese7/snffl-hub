# Step 1 rules (binding)

From Matt's Step 1 research, the Splash 3.0 UX Audit (measured on the live
site, Monday of week 7). These sit alongside the Step 2 decisions; every v4
screen is checked against both before anyone sees it. Where Matt later
decided something more specific, his decision is noted.

| # | Rule | Target | Checked by |
|---|---|---|---|
| 1 | One focal point per screen. On a game day, Home opens on your game. | One hero per screen; your game first on game day (the score bar carries it on every screen) | Look: what does the eye land on first? |
| 2 | Each fact once. One place for each game; everywhere else links to it. | No score, name or fact repeated on a screen | Count repeats on each screen |
| 3 | One highlight per screen, for the one thing to notice. Emphasis only works when it is rare. | At most one accent emphasis per screen (brand blue fill, gold award, red live) beyond the hero | Count accent fills per screen |
| 4 | Five places, always visible, within thumb reach. The ticker joins the menu as one bar. | 5 tabs at the bottom, never hidden; the score bar attached to the tab bar | Look |
| 5 | Fixed bars small. | Step 1 said about 10%; Matt later set the score bar plus tab bar at or under 20% | Measure |
| 6 | Seven type sizes, three weights, one typeface for data. Handwriting only for Squirt, the italic only for the Rag. | Sizes 38/24/18/15/13/11 (plus Switzer titles); UI weights 400, 600, 800; Switzer 900 only for the lockup and branded titles | Measure computed styles |
| 7 | Lists for lists, cards for things you tap. Three surface levels (the page; content grouped by spacing and hairlines; floating controls). Two or three corner shapes. One shadow. White surfaces only for things you tap. | Corners 20 (containers), 10 (everything inside or small, buttons included), round (faces). No capsules. Static content on the page, not in a card. One shadow, on tappable cards only | Grep radii and shadows; look for static cards |
| 8 | Summary first, detail on tap. A player is one line until you ask for more. | Rows show the answer (who, points, still to play); detail in a sheet or page | Look at every list |
| 9 | Paint at once, fill in behind. | Something on screen under 1 s; last known scores immediately | Time cold and warm loads |
| 10 | Say what changed. A score that moves shows that it moved. | Score change highlights once, announced to screen readers | Check live ticking |
| 11 | Taps 44. | No tap target under 44 px | Measure every link and button |
| 12 | Home short. | 2 to 3 screens (74% of attention is the first two) | Measure each Home moment |
