# v3 parity checklist

Matt's rule (2026-10-11): v3 cannot lose a single v2 feature, and every one is
updated and improved. This is the v2 inventory, read from code. Tick a line
when its v3 version exists under /testing and is better than v2.

## Global shell
- [ ] Nav: Scoreboard, Feed, Home, The Rag, More (v3 menu: Home, Scores, Standings, Rag, Swami, Feed, More)
- [ ] League ticker (every matchup, avatars, live/final) and NFL ticker (logos, status), empty states
- [ ] Intro animation (once per session, tap to skip, reduced motion skip)
- [ ] Chug splash modal (latest chug video, muted, once per week per device)
- [ ] Install guide overlay after /join handoff
- [ ] PWA manifest and push service worker
- [ ] Live polling: page refresh while live, Sleeper score ticking with up/down flash
- [ ] Page source footer (ESPN, Sleeper, DraftSharks, DraftKings, YouTube, SQUIRT modeling)
- [ ] Team pick cookie, no account

## Home
- [x] Week in 90 seconds (WeekStory: intro, MOTW, Shart, Top Play, Standings Shake-up; share, save image)
- [x] Chug replay ribbon
- [x] The Rag carousel (art, category, headline, deck, read time, retracted)
- [x] Featured closest game (proj, pace, win bar, to play)
- [x] Hardware strip (all nine awards)
- [ ] Shartzone (current Shart, wall of shame of every past week, Chug Meter link). Partly: the citation covers the current Shart; the wall of past weeks is still missing
- [ ] Your Game (picker, Set Lineup, Add or Drop, change team). Partly: the game shows, with a pick-your-team link; no Sleeper buttons yet
- [ ] Scoreboard of every matchup (WIN/LOSE, LIVE, proj, margin, CLOSE). Partly: scores, leader and live drop; no projections, margin or CLOSE yet
- [x] Top Scorers (top 5 with headshots)
- [x] Feed digest (5 newest posts)
- [x] Squirt says (up to 4 verdicts). v3: up to six, yours first; tap Squirt for the next
- [x] Standings widget (top 4, power top 3, playoff odds link)
- [ ] Chug counts (top 5). Partly: the square shows the top 2
- [x] NFL scores
- [x] Latest trade
- [x] Quick links (Managers, Players, Trades, Rules, Feed, Settings). Feed lives in the menu; the sixth tile is the Chug Meter

## Scoreboard
- [ ] Week selector 1 to 17
- [ ] Your game, Squirt says for every manager, every matchup
- [ ] NFL slate (live, odds, spread, O/U, implied totals, win bar, league starters per game)
- [ ] Matchup detail: Carrying X, The Swami panel, side by side lineups with expandable rows and DraftSharks ranges, bench, Their Games
- [ ] NFL game page: board, weather, season so far, the line, who has skin in this

## Feed
- [ ] Manager stories rail with ReelPlayer and week in numbers card
- [ ] Movement (start, bench, add, drop)
- [ ] Your week, Replays, What mattered, full record with What/Who/When filters, clip replays
- [ ] Watcher posts: TD, lead change, Shart Watch, C'mon Man

## The Rag
- [ ] Latest issue redirect, week selector, publish schedule note, unpublished week state
- [ ] Lead story, top stories, article page, byline, retracted stamp, linked manager names, more from this week

## More
- [ ] My Team: Fix This, Worth A Swap (with Sleeper swap), lineup, Sleeper connect, your moves
- [ ] Standings: table with trophy badges and streaks, power rankings, playoff odds, bracket, If The Season Ended Today, Shart Bowl
- [ ] The Swami: position and ownership filters, projections, defenses vs position
- [ ] Chug Meter: beer columns for all 14, chugging rules
- [ ] Trades: every trade with sides, picks, FAAB
- [ ] Managers grid and manager page (hero, this week, stat tiles, trophy case, points by week, moves, roster)
- [ ] Players browser (search, six sorts, filters, paging) and player page (hero, outlook, news, week card, rest of season, highlights, rostered by, game log)
- [ ] Rules (setup, scoring tables, chugging rules)
- [ ] Settings (team, alerts with 10 toggles, install steps)
- [ ] /join invite page and its share card

## Known v2 gaps to fix while we are here
- Trade grades are a hardcoded "Grade pending"
- Settings note promises a theme that does not exist
- Only week 1 has a chug video
- Clips come from ESPN, which prunes them in days (v3 moves off ESPN)
