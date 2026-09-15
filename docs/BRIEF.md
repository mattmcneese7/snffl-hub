# Squirtnite FFL Hub: Execution Brief

Version 1.1, September 15, 2026. Owner: Matt. Status: approved with final answers. Build usage (about 300K to 450K tokens) approved.

---

## 1. What We're Building

A fully automated, live hub website for the Squirtnite FFL Sleeper league. It looks and behaves like a professional sports media site (Barstool energy, pro broadcast polish) with a goofy league identity. No manual updates after launch.

| Item | Decision |
|---|---|
| League | Sleeper league ID `1394336593518546944`, 14 teams, current season only |
| Audience | 14 league members, 18+, roasting has no limits |
| Access | Public URL, no password, fully hidden from search engines |
| Devices | Phone first, desktop equally polished. One site, best in class on both |
| Launch | As fast as checkpoints complete. No time gates between checkpoints |
| Budget | $10 Claude API credit, optional domain. Everything else on free tiers |
| Ownership | Matt owns every account and key |

---

## 2. Pages and Features

### Navigation (every page)
- **Header, pinned:** SNFFL wordmark centered (about 160px wide, shrinks to about 92px on scroll). Alerts button left, theme button right, both centered in 48px slots, same Phosphor icon family.
- **Section strip, pinned:** Current section name plus sub-page, with a week tag on the right.
- **Stacked tickers, pinned:** League ticker over NFL ticker. Tag block on the left is one continuous slanted shape: LEAGUE in water blue, NFL in logo red.
- **Bottom tab bar, pinned (phone):** Home, Matchups, Feed, The Rag, More. Active tab switches icon from Duotone to Fill with a slanted bar above it.
- **Desktop:** Wordmark left in a top nav with all sections, current one underlined. Tickers pinned under it. Tab bar hidden.

### Home
1. Weekly Stories rail (gold ring when unwatched)
2. Matchup of the Week live card (diagonal split in both managers' colors, avatars, odometer scores, win probability bar, players left)
3. Your Matchup (team picked once, remembered on the device, no login)
4. Latest SquirtRag story (lead image is a real highlight still)
5. Feed preview (two newest posts)
6. Top Performers (headshots)
7. Standings snapshot with playoff line
- **Desktop game-day command center:** During live windows, Home becomes three columns: all matchups, the live Feed, and NFL scores.

### Matchups
- Week selector, Weeks 1 to 17
- All 7 matchups as result bugs: angled status flag (W, L, live dot, pending clock), both teams with avatars, scores, margin chip with arrow, live progress line
- Matchup detail: split-color header, win probability, side-by-side lineups (headshot, name, NFL team, game status, points) with position tags in the center, totals, collapsible bench

### The Feed
- Pinned jump buttons: Live Alerts, C'mon Man, Shart Watch, Highlights. Active button follows scroll.
- **Live Alerts:** touchdowns, lead changes, big plays. Touchdowns trigger the full-width TOUCHDOWN wipe.
- **C'mon Man:** separate Fantasy and NFL posts
- **Shart Watch:** lowest projected or current score callouts
- **Highlights:** Owned and Free Agents tabs, real YouTube clips, tags (play type, started or benched, fantasy points), free agent clips get a "Grab Him on Waivers" button
- Hard cap: 4 posts per hour

### The SquirtRag
A weekly sports news section, not an email.
- Masthead (tabloid box), "New stories every Tuesday at 9:00 AM Central"
- Week selector, Weeks 1 to 17. Future weeks show their publish date.
- Status line: Published date, plus Updated date when a correction lands
- Lead story (large image), then Top Stories list (thumbnail, category label, headline, read time)
- Article page: back link, category label, headline, deck, byline and dates, lead image, body, More From This Week
- **Weekly articles:**
  1. Shart of the Week (lead). Ends with the escalating "Chug, bitch" sign-off.
  2. Manager of the Week (highest score)
  3. Game of the Week (closest or most dramatic)
  4. Around the League (every matchup recapped)
  5. Waiver Wire (adds that outscored who they replaced, or showed promise)
  6. Big Performances (top individual scores, owned and free agents)
  7. Power Rankings (1 through 14 with blurbs)
  8. Trade Desk (letter grades for every trade)
  9. Next Week Preview (projections, favorites, the Shart Bowl of the week)
  10. Corrections and Retractions (only when stat corrections change results; if the Shart changes, the next issue runs a formal apology and retraction)
- Byline: The SquirtRag Desk. Tone: raunchy, 18+, roast freely.
- Sign-off escalation: every past sign-off is stored and fed to the writer so each one tops the last.

### More menu
Power Rankings, Standings, Playoff Tracker (Postseason Breakdown from Week 15), Chug Meter, Trade Tracker, Managers, Players, Rules, Settings.

- **Power Rankings:** all 14, rank numbers (top 3 solid, rest outlined), movement chip in a fixed right column, one-line roast
- **Standings:** 14 rows, manager color bar, W-L, PF, streak, dashed playoff line, long names truncate
- **Playoff Tracker header schedule:**
  - Weeks 1 to 7: "THE ^ PLAYOFF TRACKER" with "way too early" scribbled in marker, written on with animation
  - Weeks 8 to 11: same, scribble reads "just in time"
  - Weeks 12 to 14: no scribble
  - Week 15 on: page becomes Postseason Breakdown
- **Playoff odds:** our own Monte Carlo simulation using Sleeper projections, labeled as SNFFL odds. Falls back to season scoring averages if projections break. Tags: Clinch Watch, Bubble, In Trouble, later Clinched and Eliminated.
- **Postseason Breakdown:** swipeable bracket with round tabs, seeds, byes, live and final flags, champion trophy card. Below it, the Shart Bowl built from Sleeper's losers bracket; the loser takes the season's final chug.
- **Chug Meter:** stacked beer bar graph. The x-axis lists every manager by name, and the y-axis counts beers. Each chug adds one beer icon (foam on top, rising bubbles) stacked in that manager's column, and a new chug drops onto the stack with an animation. Columns sort from most beers to fewest. On phones the names sit at an angle so all 14 fit; on desktop they sit flat.
- **Trade Tracker:** every trade from Sleeper transactions, linked to its Trade Desk grade.
- **Manager pages:** color hero, avatar, team name, manager name, badges, stat tiles (record, standing, points, playoff odds), trophy case (Manager of the Week count, Sharts, chugs), points-by-week chart with playoffs shaded, starters and bench, results.
- **Player pages:** ESPN cutout over the owning manager's color, team logo watermark, live status, stat tiles, rostered-by row, points-by-week chart, live scoring breakdown, real highlight clips, game log.
- **Rules:** generated from Sleeper league settings (scoring, roster, playoffs) plus league custom rules from a config file (the chug rule lives here).
- **Settings:** My Team, theme, alert toggles, iPhone install instructions.

### Stories and Share Images
- Weekly "Week in 90 Seconds" Stories: full-screen viewer, progress bars, auto-advance about 4.5 seconds, tap right to skip, left to go back, close button.
- Slides: Intro, Manager of the Week, Shart of the Week (with stamp), Top Play (real highlight still), Standings Shake-Up.
- Every slide has Share (native share sheet) and Save Image (1080 by 1920).
- Auto-generated share images each week: 1080 by 1080 square, 1200 by 630 link preview.

### Alerts and Install
- Installable to the home screen. Push alerts for touchdowns and lead changes, toggled per device.
- iPhone only delivers web push after the site is added to the home screen. Settings explains this.
- Live scores on screen update every 30 seconds during games. Push alerts can lag a few minutes because the watcher runs every 5 minutes.

---

## 3. Data, Images, and Automation

### Data sources
| Source | Use | Status |
|---|---|---|
| Sleeper API (`api.sleeper.app/v1`) | League, users, rosters, matchups, transactions, brackets, NFL state, player database (pulled once daily) | Official, read-only, no key. Stay under 1,000 calls per minute |
| Sleeper projections (`api.sleeper.com/projections/nfl/...`) | Win probability, playoff odds, previews | Unofficial, public, no login |
| ESPN public JSON | NFL scoreboard, game summaries, play-by-play | Unofficial, can change without notice |
| YouTube Data API v3 | NFL channel uploads, thumbnails, embeds | Official, free key, 10,000 units per day, 1 unit per uploads call |
| nflverse player ID list | Sleeper ID to ESPN ID mapping for cutouts | Public, free |
| Claude API | All writing and highlight tagging | $10 prepaid credit |

### Images
| Image | Source | Where |
|---|---|---|
| Player headshots | Sleeper CDN, keyed by Sleeper player ID | Player rows, lineups, player pages, feed |
| Player cutouts | ESPN full headshots, matched via nflverse IDs | Story graphics, player page hero, Stories |
| Team logos | Sleeper or ESPN CDN | Player rows, NFL ticker, team defenses |
| Manager avatars | Sleeper avatar CDN, full and thumbnail | Everywhere a manager appears |
| Highlight stills | YouTube API thumbnails from the week's official NFL videos | Lead images for every story, highlight cards |
| Backgrounds and texture | Unsplash (free license, skip Unsplash+) | Non-player backgrounds |
| Fallbacks | Initials on the manager's color, number-and-cutout graphic | Anything that fails to load |

Rights note: headshots, logos, and cutouts belong to the NFL and partners. Using them on a hidden, non-commercial league site is common fan-site practice but not formally licensed. Everything degrades to fallbacks if a source blocks us. No Getty, no AP, no copying photos from ESPN or team sites.

### Manager identity
- Team names, manager names (Sleeper display names), and avatars all come from Sleeper. No real names, no manual config.
- Each manager gets a two-color palette pulled automatically from their avatar, darkened as needed so white text stays readable, and nudged away from the good green and bad red.

### Architecture
- **Site:** Next.js on Vercel Hobby (free, personal non-commercial use)
- **Code:** public GitHub repo. No keys ever committed.
- **Schedules:** GitHub Actions (free for public repos). Vercel Hobby cron only runs once a day, so it is not used for live work.
- **Live scores:** each visitor's browser polls Sleeper and ESPN directly (30 seconds while games are live)
- **Frequently changing data** (feed posts, highlights, push subscriptions): Supabase free tier
- **Weekly content** (SquirtRag articles, Stories, share images): generated by Actions and committed to the repo, which triggers a Vercel deploy
- **Search engines blocked:** `noindex` meta and header on every page, plus `robots.txt` disallowing all crawlers
- **Fonts:** self-hosted through Next.js font loading

### Schedules (Central time; GitHub cron runs in UTC, and Daylight Saving Time ends November 1, 2026)
| Job | When | What it does |
|---|---|---|
| Nightly refresh | 3:00 AM daily | Sleeper player database, nflverse IDs, league settings, manager colors |
| Live watcher | Every 5 minutes, Thursday to Monday, exits instantly if no NFL game is live | Detects touchdowns, lead changes, big plays, C'mon Man moments, Shart Watch. Writes feed posts (max 4 per hour), sends push alerts |
| Highlights pull | Every 30 minutes during game windows, plus once after the last game | Pulls new NFL uploads, tags them to games, players, and managers (Claude Haiku), marks owned vs free agent |
| Week close | Monday night after the final game, retried at 3:00 AM Tuesday | Finalizes scores, computes every award and stat, builds article fact packets, submits one Claude batch |
| Publish | Runs hourly Tuesday morning; publishes once Central time reaches 9:00 AM | Collects the batch, validates, commits the week's articles, Stories, and share images |
| Correction check | Wednesday and Thursday | Compares final stats to published results. Any change posts a correction, stamps the article Updated, and queues a retraction for the next issue if the Shart changed |

GitHub scheduled jobs can start late, which is why publishing is time-gated inside the job instead of relying on an exact start time.

### Writing pipeline (Claude API)
- **Models:** `claude-sonnet-5` for the Tuesday package (batched), `claude-haiku-4-5-20251001` for highlight tagging (batched) and live feed posts
- **Fact packets:** code computes every number first. The writer receives facts as structured data and may not invent stats.
- **Validation:** every number in generated text is checked against the fact packet. Mismatches trigger one retry, then a template fallback.
- **Style guide file:** voice, roast rules, Title Case headlines, sign-off history
- **Cost estimate:** about $8 to $9 for the season including testing. The prepaid $10 means the worst case is writing pauses, never a surprise bill. Feed posts switch to templates if credit runs low.

---

## 4. Design System

### Themes
| Token | Light | Dark |
|---|---|---|
| Background | `#F7F7F5` | `#121110` |
| Card | `#FFFFFF` | `#1C1A18` |
| Surface | `#ECECE8` | `#2A2724` |
| Ink (main text) | `#141210` | `#F3EFE6` |
| Secondary text | Ink at 64% | Ink at 64% |
| Lines | Ink at 12% | Ink at 14% |

### Status colors (same hex in both themes)
| Meaning | Large text and bars | Chip fill (white text) |
|---|---|---|
| Good | `#1F9460` | `#157A4E` |
| Bad | `#E54B5A` | `#C8323F` |
| Live | `#3584D2` | `#2B6CB0` |
| Pending | `#7C8496` | `#5E6573` |
| Gold (fills only, dark text) | `#E3B341` | `#E3B341` |
| Muted | `#72809F` | `#72809F` |

**Theme-aware exceptions**
- **Shart:** `#7A4F31` with white text in light, `#C4946E` with dark text in dark
- **Marker red** (scribbles, circled stats): `#E3182D` in light, `#FF5A66` in dark

**Brand colors, never used for status**
- **Logo red** `#E3182D`: wordmark stripe, masthead THE tag, NFL ticker tag
- **Water:** `#C9EEFF`, `#5BB6F2`, `#1F74C9`
- **Beer:** `#F7C04A` to `#B85F10`, foam `#FFF3D6`
- **Tickers:** bands `#1C1A18` and `#141210`, LEAGUE tag `#5BB6F2` with `#141210` text, NFL tag `#E3182D` with white text

**Color rules**
1. Red means bad. The only exceptions are the brand uses listed above.
2. Color never works alone: every result also gets an arrow, a +/− sign, or W/L.
3. No navy or blue interface chrome. Blue appears only for live status, links, and water.
4. Texture (halftone, grain) only on photos and stamps, never on backgrounds.
5. Contrast: at least 4.5:1 for small text, 3:1 for large text and UI shapes, checked automatically in both themes.
6. Never put CSS variables inside SVG presentation attributes. Use classes.
7. Class names must be unique and descriptive. A short class name once turned every tab icon red.

### Type (all free)
| Role | Font | Style |
|---|---|---|
| Headlines | Archivo | Black 900, italic, narrowest width, Title Case |
| Scores and stats | Archivo | Condensed, 800 to 900, tabular numbers |
| Buttons, menus, labels | Archivo | 600 to 800 |
| Tickers | Archivo | Upright, 600 to 700. Sans serif only, font set explicitly |
| Articles | Source Serif 4 | Regular and italic |
| Scribbles and marker notes | Permanent Marker | Only these uses |

- **Title Case:** Capitalize every word except short connecting words (the, in, of, and).
- **All caps:** Only for short tags, stamps, and logos.

### Shapes and components
- **Angles:** 12-degree slant on buttons, tabs, chips, flags, and bars. No pill buttons.
- **Tap targets:** at least 44px.
- **Primary button:** ink fill.
- **Toggle:** slim slanted slab, 18px visible with a 44px tap area, green when on.
- **Links:** blue.
- **Result flags:** W (good), L (bad), live dot (blue), pending clock (gray).
- **Stamps:** muddy brown SHART WATCH, red RETRACTED.
- **Award badges:** gold with a sweeping foil shine.

### Brand marks
- **Wordmark:** SNFFL, Archivo Black italic, red speed stripe, water filling the letters with a sloshing waterline, drips, and a falling drop. The waterline sloshes on every score update.
- **App icon and favicon:** wet "SN" mark with waterline, stripe, and drips.
- **SquirtRag masthead:** ink tabloid box, knocked-out SQUIRTRAG, red THE tag. No drips, no subheadline.
- **Original shield logo:** kept for the Rules page and credits. Not in the header.

### Icons
- **Phosphor Icons** (MIT): Duotone when inactive, Fill when active.
  - Tabs: football (Home), football-helmet (Matchups), monitor-play (Feed), newspaper-clipping (The Rag), strategy (More)
  - Header: siren (alerts), moon and sun (theme)
  - More menu: trophy, ranking, t-shirt, beer-stein
- **Game-icons.net** (CC BY 3.0): award badges only (trophy-cup, beer-stein). Credited on a credits page.

### Motion inventory (all respect the reduced-motion setting)
- **Scores and live data:**
  - Odometer score rolls, row flash, and "+points" pop
  - Moving ball on the mini field, animated win probability bar
  - Lead-change banner and full-width TOUCHDOWN wipe
  - Continuous ticker scroll
- **Brand and awards:**
  - Wordmark slosh and falling drop, tab icon pop
  - Stamp slam, gold foil shine, Chug Meter fill with bubbles, scribble write-on
- **Navigation and loading:**
  - Story progress bars, angled page transitions
  - Skeleton loaders with a water shimmer, water-fill pull to refresh
  - Short vibration on alerts (Android only)

---

## 5. Build Checkpoints

Rules for every checkpoint:
1. Claude states scope and a token estimate, then stops for Matt's approval.
2. Work stays inside this brief. Anything new gets raised as a question, not built.
3. The next checkpoint starts as soon as the last is approved.

| # | Checkpoint | Output | Est. tokens |
|---|---|---|---|
| 0 | Brief approval | This document, approved | Done |
| 1 | Accounts and data check | Matt completes Section 7. Claude confirms league settings (teams, playoff format, scoring), browser access to Sleeper and ESPN, image URLs, YouTube key | 3K to 5K |
| 2 | Style frame | Home and Matchups at full fidelity with real league data, phone and desktop, both themes | 12K to 18K |
| 3 | Foundation | Repo, design tokens, components, header, strip, tickers, tab bar, theme, install setup, noindex, fonts, icons, contrast test suite | 25K to 35K |
| 4 | Data pipeline | Sleeper, ESPN, projections, nflverse IDs, manager names and colors, odds simulation | 20K to 30K |
| 5 | Core pages | Home, Matchups, Standings, Power Rankings, Playoff Tracker, Chug Meter, Trade Tracker, Managers, Players, Rules, Settings. **Site is launchable here** | 40K to 55K |
| 6 | The SquirtRag | Writing pipeline, validation, Week 1 articles (Matt approves before publish), corrections flow, week selector | 25K to 35K |
| 7 | Live layer | Live scoring, live watcher, Feed with cap, motion inventory | 25K to 35K |
| 8 | Highlights | YouTube pull, tagging, Owned and Free Agents, C'mon Man, image sourcing and fallbacks | 15K to 25K |
| 9 | Alerts and postseason | Push alerts through Supabase, Postseason Breakdown, Shart Bowl | 15K to 25K |
| 10 | Stories and share images | Stories viewer, weekly image generation | 15K to 25K |
| 11 | Final check | Contrast in both themes, phone speed, reduced motion, noindex, broken-source fallbacks, API cost check | 8K to 12K |

**Estimated total:** about 210K to 300K output tokens. Fixes and revisions usually add about half again, so plan on 300K to 450K. This usage comes from Matt's Claude plan, not the $10 API credit. **Approved by Matt.**

---

## 6. Where to Run the Build

**Recommendation: Claude Code in the Claude desktop app (Code tab).**

Why:
- It works directly in a real project folder, runs the site locally, runs the contrast and layout checks, and pushes to GitHub.
- It can read this brief from the repo every session, so every checkpoint stays anchored to it.
- Progress can be checked from the Claude mobile app.

Chat is the wrong place for this: a multi-file app with scheduled jobs needs a real project folder, a terminal, and tests.

### Setup for Claude Code
1. Install the Claude desktop app and open the Code tab.
2. Create an empty folder named `snffl-hub` and open it in Claude Code.
3. Save this brief into that folder as `docs/BRIEF.md`.
4. Paste the kickoff prompt below.

### Kickoff prompt
```
You are building the Squirtnite FFL hub site. The approved execution brief is docs/BRIEF.md and it is the single source of truth.

Rules:
1. Read docs/BRIEF.md fully before doing anything.
2. Work one checkpoint at a time from Section 5. Before each checkpoint, reply with the scope, the files you will touch, and a token estimate, then stop and wait for my approval.
3. Do not build anything not described in the brief. If something is unclear or missing, ask me instead of guessing.
4. Never commit API keys or secrets. The repo is public.
5. Never use em dashes or double hyphens in any site copy or generated text.
6. Run the contrast checks in both themes before showing any screen.
7. Create a short CLAUDE.md summarizing these rules so every session follows them.

Start with Checkpoint 1: confirm the accounts and keys from Section 7 are in place, pull the league settings for league 1394336593518546944, and report the team count, playoff format, playoff start week, and scoring format. Then stop.
```

---

## 7. Account Setup, Step by Step

Menu names occasionally move. If a label doesn't match exactly, look for the closest match. Keep every key in a password manager, never in a message or a file in the repo.

### A. GitHub (code and scheduled jobs)
1. Create or sign in to a GitHub account.
2. Click **New repository**. Name it `snffl-hub`, set it to **Public**, and create it with a README.
3. Claude Code will connect the local folder to this repo during Checkpoint 1.
4. Secrets get added later in step F.

### B. Vercel (hosting)
1. Sign up at vercel.com using **Continue with GitHub**. Choose the free **Hobby** plan.
2. Click **Add New**, then **Project**, then import `snffl-hub`.
3. Leave the default Next.js settings and deploy. It's fine if the first deploy is a blank page.
4. Environment variables get added later in step F.
5. **Optional domain:** register one through Vercel, or elsewhere, then add it under the project's **Settings**, then **Domains**, and follow the DNS instructions shown.

### C. Supabase (feed posts, highlights, push alerts)
1. Sign up at supabase.com and create a **New project** on the Free plan. Name it `snffl`, set a database password, and pick a US Central or East region.
2. When it finishes, open **Project Settings**, then **API**. Copy the **Project URL**, the **anon public** key, and the **service_role** key. The service_role key is secret.
3. Open the **SQL Editor**, paste the block below, and click **Run**.

```sql
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  team_id text,
  alert_touchdowns boolean default true,
  alert_lead_changes boolean default true,
  created_at timestamptz default now()
);

create table feed_posts (
  id uuid primary key default gen_random_uuid(),
  week int not null,
  kind text not null,
  title text not null,
  body text,
  team_ids text[],
  player_ids text[],
  payload jsonb,
  created_at timestamptz default now()
);

create table highlights (
  id text primary key,
  week int not null,
  title text not null,
  published_at timestamptz,
  play_type text,
  player_ids text[],
  owner_team_id text,
  started boolean,
  fantasy_points numeric,
  is_cmon_man boolean default false,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;
alter table feed_posts enable row level security;
alter table highlights enable row level security;

create policy "public read feed" on feed_posts for select using (true);
create policy "public read highlights" on highlights for select using (true);
create policy "anyone can subscribe" on push_subscriptions for insert with check (true);
```

Note: free Supabase projects can pause after about a week with no activity. Game-day jobs keep it active during the season.

### D. Anthropic Console (Claude API, $10)
1. Sign in at console.anthropic.com.
2. Go to **Billing** and add **$10** of prepaid credit. If a monthly spend limit option is offered, set it to $10.
3. Go to **API Keys**, click **Create Key**, and name it `snffl-hub`. Copy it immediately, since it's only shown once.

### E. Google Cloud (YouTube Data API)
1. Sign in at console.cloud.google.com and create a new project named `snffl-hub`.
2. Open **APIs & Services**, then **Library**. Search **YouTube Data API v3** and click **Enable**.
3. Open **APIs & Services**, then **Credentials**. Click **Create Credentials**, then **API key**.
4. Click the new key, and under **API restrictions** choose **Restrict key** and select only **YouTube Data API v3**. Save and copy the key.

### F. Secrets and environment variables
Claude Code generates the push alert keys (VAPID) in Checkpoint 1 and tells you where to paste them.

**GitHub:** repo **Settings**, then **Secrets and variables**, then **Actions**, then **New repository secret**. Add each:

| Secret | Value |
|---|---|
| `ANTHROPIC_API_KEY` | From step D |
| `YOUTUBE_API_KEY` | From step E |
| `SUPABASE_URL` | Project URL from step C |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key from step C |
| `VAPID_PUBLIC_KEY` | Generated in Checkpoint 1 |
| `VAPID_PRIVATE_KEY` | Generated in Checkpoint 1 |
| `SLEEPER_LEAGUE_ID` | `1394336593518546944` |

**Vercel:** project **Settings**, then **Environment Variables**. Add each:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step C |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key from step C |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Generated in Checkpoint 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key from step C |
| `VAPID_PRIVATE_KEY` | Generated in Checkpoint 1 |
| `SLEEPER_LEAGUE_ID` | `1394336593518546944` |

### G. League members, after launch
1. Open the site link on your phone.
2. **iPhone:** tap **Share**, then **Add to Home Screen**. Open it from the home screen icon, then turn on alerts in Settings.
3. **Android:** use the browser menu's **Install** or **Add to Home screen** option, then turn on alerts.
4. Pick **My Team** in Settings.

---

## 8. What Matt Provides

| Needed | When |
|---|---|
| Accounts and keys from Section 7 | Before Checkpoint 1 finishes |
| Any custom league rules beyond Sleeper settings, including the chug rule wording | Before Checkpoint 5 |
| Approval of the Week 1 SquirtRag articles | Checkpoint 6 |
| Domain name, if any | Anytime |

---

## 9. Risks and Fallbacks

| Risk | Fallback |
|---|---|
| Unofficial Sleeper or ESPN endpoints change | Fail gracefully, show last good data, projections fall back to averages |
| Image sources block or move | Initials on manager color, number-and-cutout graphics |
| Scheduled jobs start late | Time-gated publish, retries, idempotent jobs |
| Claude credit runs out | Template writing for feed posts, Tuesday package preserved |
| YouTube quota | Uploads endpoint only (1 unit), search avoided |
| Supabase pauses in the offseason | Only affects alerts and feed, which aren't needed then |
| iPhone push limits | Clear install instructions in Settings |
| Stat corrections after publishing | Wednesday and Thursday check, Updated stamp, retraction flow |

---

## 10. Open Items

1. **Playoff format, playoff start week, and team count:** confirmed from Sleeper in Checkpoint 1.
2. **Domain:** optional, Matt's call.

---

## 11. Approval

Approved. Complete the Section 7 setup, then run the kickoff prompt in Claude Code to begin Checkpoint 1.
