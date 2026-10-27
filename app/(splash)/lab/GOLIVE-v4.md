# Splash 4.0 go-live plan

Nothing here runs until Matt approves the swap. Until then v4 stays on
`lab/v4` at `/lab/app`, and main and the live site are untouched.

## The approach: swap first, clean up after

Two phases, so the swap is small and easy to undo.

**Phase A, the swap (one commit, undone by reverting it).** v4 files stay
where they are. `next.config.ts` rewrites the public paths onto them, so `/`
serves `/lab/app`, `/scores` serves `/lab/app/scores`, and so on. The address
bar shows the clean path. v3's pages stay in the repo, unreachable, so going
back is a revert or a Vercel Instant Rollback, not a rebuild.

**Phase B, the cleanup (about a week after, once v4 has run a real game
week).** Move the v4 files to their real paths, delete the v3 pages, drop the
rewrites, and drop v3's global CSS and fonts from the root layout. This is
the step that can shift visuals, so it gets the full Step 1 gate again.

## Phase A in detail

### 1. Public paths for v4

| Public path | Serves | Notes |
|---|---|---|
| `/` | `/lab/app` | Home |
| `/scores`, `/scores/:week` | `/lab/app/scores...` | |
| `/matchup` | `/lab/app/matchup` | `?id=&week=` as now |
| `/nfl`, `/nfl/:gameId` | `/lab/app/nfl...` | v3 used `/nfl/:gameId` too: same links keep working |
| `/rag`, `/rag/:week`, `/rag/:week/:slug` | `/lab/app/rag...` | Same paths as v3 |
| `/league`, `/league/bracket` | `/lab/app/league...` | |
| `/swami` | `/lab/app/swami` | Same path as v3 |
| `/players`, `/players/:id` | `/lab/app/players...` | Same paths as v3 |
| `/managers`, `/managers/:id` | `/lab/app/managers...` | Same paths as v3 |
| `/chug`, `/feed`, `/insights`, `/trades`, `/trophies`, `/rules`, `/my-team` | `/lab/app/...` | Same paths as v3 |
| `/account` | `/lab/app/account` | New in v4 |

The rewrites go in `beforeFiles`, so they win over the v3 page files at the
same paths.

### 2. Links inside v4

v4 hard-codes `/lab/app` in 133 places. One codemod in the swap commit turns
`/lab/app/x` into `/x` and `/lab/app` into `/`. Nothing else in the code
changes.

### 3. Redirects for old links

People have v3 links saved, and push alerts already sent point at v3 paths.
All temporary (302), so paths can still change.

| Old path | Goes to |
|---|---|
| `/scoreboard` | `/scores` |
| `/scoreboard/:week` | `/scores/:week` |
| `/scoreboard/:week/:matchupId` | `/matchup?id=:matchupId&week=:week` (same Sleeper matchup ID; checked) |
| `/matchups`, `/matchups/:week`, `/matchups/:week/:id` | Same as the three above, in one hop instead of two |
| `/standings`, `/power-rankings`, `/playoffs` | `/league` (playoffs to `/league/bracket`) |
| `/settings` | `/account` |
| `/more` | `/league` |
| `/home`, `/testing/...` | Unchanged: `/` and the matching path |
| `/lab/app/:path*` | `/:path*`, so preview links Matt has land on the real page |

### 4. Links sent from outside the app

Push alerts and scripts build their own URLs. These change in the swap
commit so new alerts skip the redirect:

- `lib/lineup-alerts.ts`, `lib/score-alerts.ts`, `lib/watcher.ts`,
  `lib/reel-clips.ts`: `/matchups/:week/:id` becomes
  `/matchup?id=:id&week=:week`; `/matchups/:week` becomes `/scores/:week`.
- `lib/watcher.ts` and `public/sw.js` default to `/feed`, which v4 has.
- `scripts/publish.ts` (`/managers/:id`, `/rag/:week`) and
  `scripts/chug-reminders.ts` (`/chug`) already match v4.

### 5. Kept as they are

- `/api/push`, `/api/watch`, `public/sw.js`: v4's Alerts uses the same calls
  and the same service worker, so existing subscriptions keep working.
- `/share/:week/:kind` and `/api/share`: the share images v4's stories use.
- `manifest.webmanifest`, the icons, the root layout's name "Splash".
- The site-wide noindex header.
- `/join`, `/versions`, `/_bench`: see the decisions below.

### 6. Copy

The 29 page titles that say "Splash 4.0" become plain page names under the
root layout's "%s, Splash" template.

### 7. Before the swap goes out

- Merge main into `lab/v4` first. Main has moved since the lab branched
  (nightly data commits only).
- The full Step 1 gate on every route at its public path: the checker,
  lint, contrast in both themes, screenshots by eye, rules 5, 9 and 10.
- A production build, plus a curl check of every redirect in the table
  above (each old path to its expected place).
- A headless check that a notification click on an old alert URL lands on
  the right v4 page.
- The dev-only hooks (`splash_dev_state` cookie, `window.__splashLive`) are
  off in production; recheck on the production build.

### 8. When

A Wednesday or Thursday before kickoff: after the week flips from Final to
Preview, before Thursday night's game. Never during a game window.

### 9. Undo

Revert the swap commit, or use Vercel's Instant Rollback to the previous
production deployment. v3's files are still in place, so either one brings
v3 back as it was.

## Phase B in detail

- Move `app/(splash)/lab/app/*` to `app/(splash)/*`, replacing v3's pages.
- Shared helpers v4 still imports from v3 route folders move to `lib/`
  first: `swami/moves-query`, `swami/week-lines`, `swami/CopyMove`,
  `rules/scoring`, `kit/nflTeams`, `kit/weekParam`, and the `app/(splash)/lib`
  and `lab/home/Pattern` modules.
- Delete the v3 pages, their CSS, and v3's global CSS files and fonts
  (Archivo, Martian Mono, Source Serif 4, Permanent Marker) from
  `app/layout.tsx`.
- Delete the rewrites; keep the redirects.
- Retire the old lab experiences (`/lab`, `lab/home`, `lab/race`,
  `lab/rivals`, `lab/story`, `lab/live`) per Matt's call below.
- Full Step 1 gate, since dropping global CSS can shift what pages look like.

## Parity

`PARITY-v4.md` has 35 of 36 lines done. The open one is the Sleeper write
research, which waits on Matt and Sleeper and does not block the swap.

Three v3 pieces the checklist never listed, now added below as decisions:
the invite page (`/join`), the versions easter egg (`/versions`), and the
share images (kept, and v4 already uses them).

## Decisions for Matt

1. **The invite page (`/join`).** It is the one page people pass around, and
   it is still v3's look. The cohesion rule says no past-version pieces at
   go-live. Recommendation: rebuild it from the kit before the swap.
2. **The versions easter egg (`/versions`).** v3 hides it behind seven taps
   on "Splash 3.0" at the foot of More, and v4 has no More page.
   Recommendation: move the trigger to the version line at the foot of
   Account.
3. **The home screen icon.** It is the blue drop on paper you picked for
   Splash. Recommendation: keep it. Also add a dark theme color, so the
   phone's status bar matches dark mode.
4. **The old lab pages and the design bench.** `/lab` (the five
   experiences), `/lab/app/kit` and `/_bench` stay reachable but unlinked
   until Phase B. Recommendation: keep the kit (it is the reference for
   future work) and retire the rest in Phase B.
5. **The day.** Recommendation: the Wednesday after you sign off.

## Estimate

Phase A: about 80 to 120k tokens, including the gate. Phase B: about 150k,
most of it the gate.
