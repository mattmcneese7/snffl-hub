# Splash 4.0 lab: rules every lab page follows

The lab lives at /lab (unlinked, noindex, branch lab/v4 only; never main or prod).
It shows what v4 could be. It is built on Splash 3.0's system, with motion and
depth added. One throughline: one material, one light, one corner family, one
color rule, one rhythm, one motion.

## Hard rules (Matt's)
- No em dashes and no double hyphens anywhere: copy, comments, aria labels. Use commas, colons, periods.
- US English only (defense, color, center).
- Nothing fake. Every number is real league data (Sleeper via lib/league.ts and
  the app's own models) or plainly labeled ("Reconstructed from final scores").
  If data is missing, show nothing or a plain empty state, never a placeholder
  number. No lorem, no mock names.
- Players by full name. Managers by first name (firstNameOf from
  config/managers) and team name. Teams by full name or nickname, never initials alone.
- No filler copy. Titles are prescriptive ("Win chance", "Playoff picture"), not jokes.
  Humor only in Squirt's lines and empty states.
- LIGHT only. Paper ground #f7f6f2, white cards. The one exception is the ink
  island pill (live layer).
- Phone first (390px wide), nothing depends on hover. Tap targets 44px.
- No brand color fills on controls; logos carry brand color.
- One button style: the white pill (home/Glass.tsx PillLink, or class
  styles.pillBtn from home/home.module.css). Never invent a new button.
- Icons: Phosphor (`@phosphor-icons/react`, duotone/bold/fill) or the set in
  home/Icons.tsx (Icon name=...). Never hand-draw icon paths.

## Tokens (Pool)
paper #f7f6f2, white #fff, powder #c9dcfa, deep #2d4c9c, lime #ecf88a (one
thing to notice, e.g. the leading score), ink #141518, ink-2 #3d434e,
ink-3 #5a616d, hair rgba(20,21,24,0.08), live red only for errors.
Type: Switzer (already loaded by the shell). Sizes 11, 12, 13, 15, 17, 20, 28, 34.
Weights 600 for labels, 700 for titles, 800 for big numbers. Numbers tabular-nums.
Card: home/widgets.module.css `w.widget` + size `w.l`/`w.m`/`w.s` inside a
`w.grid`, with `WidgetHead` from home/Widget.tsx (icon + title). Radius 20 on
cards, 999 on pills, 12 to 14 on inner tiles.

## The v4 kit (app/(splash)/lab/kit), use these, do not re-invent
- LabShell: wrap every lab page: `<LabShell>{content}</LabShell>`. It brings
  the menu, ticker, search, the live island, the Toaster and the page View Transition.
- motion.ts: SPRING.snap (controls), SPRING.glide (surfaces), SPRING.roll (numbers). Only these.
- `motion/react` (v14) for drag, layout and presence. `import { motion, AnimatePresence, LayoutGroup } from 'motion/react'`.
- Rolling.tsx: every changing number (scores, odds, percentages) rolls.
- Segmented.tsx: tabs and toggles (powder pill sliding).
- Sheet.tsx: anything opened over the page (player detail, filters).
- Press.tsx: tappable cards and rows that are buttons.
- Toasts.tsx: `useToast()` for news.
- Skeleton.tsx: loading shapes (pair with Suspense).
- haptics.ts: `haptic('tick')` on meaningful taps (Android only; iOS has no API).
- useLive.ts: `useLive(week, onEvents)` polls /api/lab/live (real Sleeper
  scores, the app's win model) and diffs for scoring events; `gameFor()`.
- View transitions: `import { ViewTransition } from 'react'`; give shared
  elements the same `name` on both pages (e.g. `matchup-${id}`).

## Motion principles
- Things move like objects: spring, never linear fades for surfaces.
- Enter from where they come from (sheets up, toasts down, details out of their card).
- Respect prefers-reduced-motion (motion's MotionConfig reducedMotion="user" is fine).
- Nothing animates on its own forever except a live indicator.

## Verify before you're done
- `npx tsc --noEmit -p .` (from the repo root, takes 3s) has no errors in your files.
- curl http://localhost:3100/<your route> returns 200 (dev server is already running on 3100; do NOT start or kill servers).
- grep your files for an em dash or a double hyphen in copy and fix any.
