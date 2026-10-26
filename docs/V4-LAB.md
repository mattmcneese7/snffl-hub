# Splash 4.0 lab: research and what was built

Branch `lab/v4` only. The lab lives at `/lab`, linked from nowhere, noindex like the rest of the site. Main and production are untouched.

## The problem
Splash 3.0 looks right, but it behaves like a document. Pages swap instead of moving. Numbers snap. Every detail opens by pushing the page down. Nothing tells you something happened while you were looking. Pro apps (Apple Sports, ESPN's 2026 gamecast, Sleeper, Robinhood) do the same things with three extra layers:

1. **Motion with physics.** Things move like objects, on springs, from where they come from.
2. **Depth.** Surfaces rise over the page (sheets, toasts, the island) instead of the page reflowing.
3. **Liveness.** The app notices change and shows it: scores roll, rows reorder, news drops in.

## The v4 system (one throughline)
Pool is unchanged: paper, white cards, powder, deep blue, lime for the one thing to notice, Switzer. v4 adds:

| Layer | Rule | Where it lives |
|---|---|---|
| Motion | Three springs only: snap (controls), glide (surfaces), roll (numbers). CSS gets the glide curve as `linear()`. | `lab/kit/motion.ts` |
| Depth | One sheet, one toast stack, one island. Anything opened over a page uses the sheet; the page behind eases back. | `Sheet.tsx`, `Toasts.tsx`, `Island.tsx` |
| Press | Everything tappable gives under the finger (0.97) and springs back. | `Press.tsx` |
| Numbers | Every changing number rolls (NumberFlow). | `Rolling.tsx` |
| Live | One polled feed; every client diffs it for scoring events. | `api/lab/live`, `useLive.ts` |
| Navigation | View Transitions: pages cross fade; shared elements morph. | `LabShell.tsx` |

## What's in the lab
- **/lab**: index, shell features, research summary.
- **/lab/live** and **/lab/live/[id]**: Gameday Live. Every game live, then a gamecast: win chance across the week (rebuilt per kickoff window from final scores with the app's own model), what it takes, lineups, a sheet per player, a scoring feed.
- **/lab/story**: the week as tap-through stories, with hold to pause, swipe down to close, and sharing.
- **/lab/race**: the playoff machine. Pick the remaining games, and the standings reorder, with clinch and elimination worked out and magic numbers.
- **/lab/rivals**: any two managers. Tale of the tape, all play, weekly chart, their games.
- **/lab/modules**: each piece on its own. Rolling numbers, sheet, toasts, streaming with skeletons, animated folds, the scroll-driven rail, swipe actions, a native popover, a native switch, confetti, image sharing, pull to refresh.
- **On every lab page**:
  - the island (your game over the ticker);
  - scoring toasts;
  - search (press "/" on a keyboard);
  - a top that condenses on scroll;
  - page transitions.

## Research findings

### Motion and feel
- **View Transitions.** React 19.3 (September 2026) made `<ViewTransition>` stable, and Next 16 runs it with no config. Give two elements the same `name` and the card morphs into the page. Safari supports it from 18.2. Back swipes on iOS carry no transition type, so you don't get a double animation.
- **Motion 14** (`motion/react`) handles drag, layout and presence. To keep the bundle small in production, use `m` with `LazyMotion` (4.6 KB, plus a feature set loaded on demand).
- **Rolling numbers.** `@number-flow/react` is about 6 KB. It keeps width stable and respects reduced motion.
- **Free CSS techniques:**
  - scroll snap for rails and swipe actions (native momentum);
  - scroll-driven animations for the condensing top (Safari 26);
  - `@starting-style` with the Popover API for menus;
  - grid rows `0fr` to `1fr` for animated folds.
  - `calc-size` and `interpolate-size` are not in Safari yet.
- **Bottom sheets.** vaul is unmaintained. Hand-roll the sheet on Motion drag, as the lab does, or use Base UI Drawer.

### Speed
- **Instant navigation.** Next 16.3's `cacheComponents` plus `partialPrefetching` paints a prerendered shell at once, then streams the data behind skeletons shaped like it. Don't use `prefetch={true}`: under cache components it's the slow, legacy full prefetch.
- **Load on demand.** Pull in heavy pieces only when used (confetti loads on the tap).
- **Live updates by polling.** Poll every 20 seconds while a game is on and the tab is visible. Long-lived SSE on Vercel bills function time. Supabase Broadcast from Database is the upgrade if you want push.

### What the phone allows
- **Haptics:**
  - Android: `navigator.vibrate`.
  - iOS has no web haptic API, and the hidden `<input switch>` trick was closed in iOS 26.5.
  - The only real iOS haptic is a user flipping a visible native switch, so v4 uses those for on/off settings.
- **Theme color.** iOS 26 ignores `theme-color`. The toolbar tint comes from the page background, which is already paper.
- **Badges and push.** App badging (`navigator.setAppBadge`) and push work on iPhone only for Home Screen installs. Declarative Web Push arrived in iOS 18.4.
- **Image sharing.** Sharing a file into a chat (`navigator.share({ files })`) works if the image is fetched before the tap.

### Features worth building (ranked by value for the cost)
1. **Win chance chart per matchup.** ESPN shipped this in 2026. Save the model's number every few minutes on game days to make it play by play. The lab's version is rebuilt per kickoff window.
2. **Matchup moments.** For example: "Bijan 12 yd TD, +8.20 for Matt, 41% to 63%".
   - The ESPN core API `.../events/{id}/competitions/{id}/plays` carries athlete ids, and `.../probabilities` carries the NFL win probability.
   - Map those ids to Sleeper through `espn_id`, plus the nflverse id crosswalk.
3. **The island.** The web's answer to Live Activities.
4. **Rivals and head to head.** In the lab.
5. **A record book.** Earlier seasons were on ESPN (league 1282346463), which now returns private. This needs a one-time import.
6. **Season Wrapped.** Story format, per manager.
7. **Weekly story recap.** In the lab.
8. **More weekly awards.** Biggest letdown (actual minus projection), and most forgotten (bench high scorer).
9. **Points left on the bench**, and a max-PF efficiency ladder.
10. **A start/sit read before lock.**
11. **Playoff machine.** In the lab.
12. **Power rankings with real movement.** See the bug below.
13. **Pick'em among the league,** on device tokens.
14. **Reactions on stories and moments,** on device tokens.

### Found along the way (3.0)
- **Power ranking movement reads "Held" for everyone mid-week.** `getPowerRankings` builds "last week" as results before `scoredWeek()`. Mid-week that is the same set of finals as this week, so every movement is 0. It should compare against the order before the last *final* week.

## Endpoints confirmed (Oct 26, 2026)
- **Sleeper:**
  - `/league/{id}/matchups/{week}`: future weeks are already paired, so the full schedule is known.
  - `winners_bracket`, `losers_bracket`, `transactions/{week}`, `traded_picks`, `drafts`.
  - `api.sleeper.app/projections/nfl/2026/{wk}`, `api.sleeper.app/stats/nfl/2026/{wk}` (live), `schedule/nfl/regular/2026`, `scores/nfl/regular/2026/{wk}`.
- **ESPN:**
  - `site.api.espn.com/.../summary?event={id}` has `winprobability`, `drives`, `scoringPlays` and `boxscore`.
  - `sports.core.api.espn.com/.../plays` has participants with athlete ids.

## Sources
- React 19.3: https://react.dev/blog/2026/09/09/react-19-3
- Next view transitions: https://nextjs.org/docs/app/guides/view-transitions
- Next instant navigation: https://nextjs.org/docs/app/guides/instant-navigation.md
- Next 16.3 app-like experiences: https://nextjs.org/blog/building-app-like-experiences-with-nextjs-16-3
- Motion bundle size: https://motion.dev/docs/react-reduce-bundle-size
- vaul notice: https://github.com/emilkowalski/vaul
- WebKit, Safari 26: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- iOS haptics patch report: https://discuss.flarum.org/d/39406/17
- theme-color in Safari 26: https://developer.apple.com/forums/thread/801239
- Supabase Broadcast from Database: https://supabase.com/blog/realtime-broadcast-from-database
- Declarative Web Push: https://webkit.org/?p=16535
- ESPN 2026 fantasy features: https://espnpressroom.com/press-release/espn-fantasy-football-celebrates-being-named-official-fantasy-game-of-the-nfl-with-new-features-games-campaigns-and-more/
- Yahoo weekly recaps: https://help.yahoo.com/kb/SLN37123.html
- Sleeper API: https://docs.sleeper.com
