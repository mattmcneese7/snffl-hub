# Splash 4.0 design contract

The rules every v4 screen is built and reviewed against. Source of truth is
Matt's Step 2 design system (https://claude.ai/artifact/LA1XJg2kmt5GnC4RJo2SxM)
and the decisions recorded with it. Nothing ships to the lab preview without
passing the checklist at the bottom. Where this file and older v3 rules
disagree, this file wins.

## Type
- One family: the system font (SF Pro on iPhone, Roboto on Android). Switzer
  only for the lowercase splash lockup and the section header wordmarks.
  Rock Salt is Squirt's hand and nothing else.
- Seven sizes, four weights, nothing else:

| Role | Size | Weight | Use |
|---|---|---|---|
| Hero score | 38 | 800 | The one focal number on a hero |
| Display | 24 | 900 | Rag headline, page lead |
| Section title | 18 | 900 (Switzer header) or 800 | Title Case section names, list scores |
| Primary | 15 | 600 or 800 | Names, team names, row titles |
| Body | 15 | 400 | Sentences |
| Secondary | 13 | 400 or 600 | Manager subheads, meta, detail |
| Label | 11 | 600, caps, +0.05em | Labels, chips, column heads |

- 11 px is the floor. Numbers are 800, tabular, normal tracking. Tight
  tracking is for words only.
- A module uses at most three levels: label, primary, secondary. A fourth
  size inside one card is a bug.

## Color
- Deep blue #2d4c9c: tappable, selected, the hero, your game. White on it.
- Powder: selection, icon faces, meters. Never a logo or a text fill.
- Gold: awards only (the award chip, the Rag's flash).
- Pastel performance colors for win, loss, Q, live and positions, always with
  a letter or sign, never color alone. Live is the red #c42034 pill.
- Team colors only on player cards and team tiles, darkened until white text
  clears 4.5:1.
- Text 4.5:1, controls 3:1, in light and dark. Dark follows the phone.

## Space, corners, surfaces
- 4 px grid: 4, 8, 12, 16, 24, 32, 48.
- Edges: 16 from the screen; 14 inside a card. Every card, list and floating
  bar lines up on the same 14 px inner edge.
- Rows 52 px minimum; tap targets 44 px minimum.
- Corners: 10 chips, 20 cards and bars, full for pills and faces.
- One shadow (two layers), only on things you tap.
- Three surfaces: paper (page and wallpaper), card (white, tappable), hero
  (brand blue, one per screen).
- Lists, not boxes: a set of like items is one card with divided rows, not a
  grid of separate tiles. A rail of tiles is allowed only when each tile is
  sized to its content with equal padding and no dead space.
- Size to content. No fixed heights that leave empty space; no boxes taller
  or wider than what they hold.

## Icons and art
- Material Symbols Rounded, filled, weight 600, from `app/icons.tsx` only.
- Generic icons are a fallback, not a finish. Awards, the chug and Squirt use
  the league's own art (the photoreal Squirt kit). A plain icon where a custom
  visual belongs fails review.

## Copy
- Sleeper's terse style, but every module keeps a short label.
- Team names lead; the manager's first name is the subhead.
- K. Cousins in rows, full names on the player sheet, profile and the Rag.
- Box score stats as Sleeper prints them (6 REC, 148 YD); result lines like
  "L 21-35 vs LAR".
- Title Case section titles. No "tap a" copy, no filler, no story counts, no
  em dashes or double hyphens, US English.
- Every module states its key fact plainly: who owes the chug, who won the
  award, what you should do.

## Modules earn their space
- Each module answers a question someone in the league actually has right
  now. If it only fills space, cut it or make it useful.
- Rich media where the subject is media: clips play inline (muted, tap for
  sound, one at a time, start on view). Feeds have a type toggle.
- Each fact appears once per screen.

## Motion
- Under 300 ms for most, ease-out, transform and opacity only.
- Press 60 in, 220 out. Toggle, chip, tab 160. Sheets and card to page 320 to
  340 on a spring. Leaving 200. A score change rolls 650 and highlights once.
- Reduced motion: 150 ms fades only.

## Budgets
- Home on a game day: about 2.5 screens. Your game first.
- Fixed chrome (score bar plus tab bar) at or under 20% of the viewport.
- Something on screen under 1 s.

## Review checklist (every screen, light and dark, 360 and 390 and 430)
1. Every text size and weight is in the type table; no more than three levels
   per module.
2. Every card edge and inner edge lands on the 14 px line; padding equal on
   all sides of a tile.
3. No dead space: boxes sized to content; no stretched tiles, no lone tile in
   a row.
4. Lists, not boxes, for sets of like items.
5. Color roles correct; contrast 4.5:1 text and 3:1 controls in both themes.
6. No generic icon where league art belongs.
7. Every module has a label and states its key fact.
8. The module earns its space; media plays inline where it should.
9. Copy rules: terse, team names first, K. Cousins, box scores, Title Case, no
   em dashes, US English.
10. Tap targets 44 px; rows 52 px.
