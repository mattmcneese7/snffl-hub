# v4 navigation map

Five tabs, always visible. The header avatar opens Account on every screen. A
sub page highlights the tab of the hub that lists it and shows a back link
under its head ("‹ League"). The score bar on every screen opens your
matchup.

| Tab | Hub | Sub pages (back link) | How you reach each |
| --- | --- | --- | --- |
| Home | `/lab/app` | Feed `/feed` (‹ Home) | Feed: Home's Feed card ("Everything"), League chips |
| Scores | `/lab/app/scores`, `/scores/[week]` | Matchup `/matchup?id=&week=` (‹ Week N Scores); NFL slate `/nfl?week=` (‹ Week N Scores); NFL game `/nfl/[gameId]` (‹ NFL Week N) | Matchup: score bar, game cards on Scores and Home, Feed story cards. NFL slate: "Full slate" on Scores and the matchup. NFL game: slate tiles, Next Game, player profile game row |
| The Rag | `/lab/app/rag` (latest issue), `/rag/[week]` | Story `/rag/[week]/[slug]` (Week N issue) | Home's Rag card, issue lists, the Shart citation |
| League | `/lab/app/league` | Bracket, Feed, Managers, Trades, Trophy Case, Chug Meter, Insights, Players, Rules (all ‹ League); Manager `/managers/[id]` (‹ Managers); Player `/players/[id]` (‹ Players) | League chips; standings and power rows open managers; any player name opens the sheet, whose Full profile opens the player page |
| Swami | `/lab/app/swami` | none | Tab; My Team's Roster link |
| (header) | Account `/lab/app/account` | My Team `/my-team` (‹ Account) | Avatar top right; Account's My Team chip; "Pick your team" bar when no team is set |

Highlights: Feed lights Home; Matchup and NFL light Scores; Players, the
player page, Managers and every League page light League; Account and My
Team light no tab (they belong to the avatar).

States every route has:
- Loading: `loading.tsx` per segment, the real frame (head, score bar slot,
  tab bar) with placeholders in the page's shapes.
- Error: `error.tsx`, the frame with "Try again" and Home.
- Not found: `not-found.tsx`, the frame with Home, Scores and League. With a
  loading boundary in place a streamed not-found answers HTTP 200 with a
  noindex tag, which is how Next streams it.

Not linked on purpose: `/lab/app/modules/preview`, the module bench (noindex).
