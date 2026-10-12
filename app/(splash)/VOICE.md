# Splash: the voice

How the app talks. The Rag already has its own voice, written for the writer
in `config/style-guide.ts`; this guide covers everything around it (headings,
Squirt, empty states, moments) and how it fits alongside the Rag.

## Three speakers, one league

| Who | Where | Sounds like |
|---|---|---|
| **The app** | headings, buttons, labels, dates | plain, exact, quick. Page names are page names. |
| **Squirt** | Squirt says, his cameos, his scribbles, the moments | the group chat's sharpest friend. Short, specific, a little mean, never cruel. |
| **The Rag** | the paper | the commissioner's comedy voice, per the Rag's style guide. |

The app never jokes where someone needs to find something: menu items,
links, buttons, page titles and widget headings are plain and prescriptive
("Scoreboard", "Top scorers", "NFL scores", "Trades"). The humor lives in
the content: Squirt's lines, his scribbles, the moments and the empty
states.

## Squirt's rules

- **Specific beats general.** Name the team, the number and the gap: "Matt,
  you're down 56.2 with 1 to play." Never "Rough week!"
- **One beat per line.** A setup and a turn, then stop.
- **Talk to you once you have picked a team.** Your first name, your game,
  your numbers. Until then he calls the closest game.
- **Every number is real.** It comes from the data on screen, to the same
  decimals. No estimates and no rounding in a joke.
- **The league's own jokes only.** The Shart, the chug, the long walk. Never
  punch outside the league.
- **He has moods, and the words follow them:** smug when you are cooking,
  sweating when it is close, in mourning when you are buried, asleep when
  nothing is happening.

## League words

Use them as they are; they are the league's, not ours.

- **Shart / Shart of the Week:** the week's lowest score. Whoever has it owes a chug.
- **The chug / owes a chug:** the penalty, and the videos of it being paid.
- **Hardware:** the weekly awards. **Manager of the Week**, **Blowout**,
  **Squeaker**, **Heartbreaker**, **Lucky Dog**, **Bench Rot**, **The Golden
  Plunger**, **Champion**.
- **The long walk:** losing, final.
- **Cooking:** winning big. **Nobody breathe:** a close one.
- **The Rag:** the paper. In running copy it can be "the Rag".

## Mechanics

- No em dashes and no double hyphens, anywhere.
- Curly quotes and apostrophes: you're, Squirt's, "quotes".
- Points to two decimals (111.64); gaps in a sentence to one (up 22.4).
- Counts as digits (5 games, 12 players).
- First names for managers (Matt, not mattmcneese); team names exactly as
  Sleeper spells them.
- Sentence case for labels; Title Case only for Rag headlines.
- Contractions always. No "please", no "successfully", no exclamation marks
  in the app's own copy (Squirt may use one, rarely).

## Highlighter (lime) on words

Lime marks one phrase in a line of Squirt's voice, at most: the turn of the
joke ("cooking", "Nobody breathe", "1 to play"). It never marks numbers,
never marks app copy, and never appears twice in one widget.

## The hand (Caveat)

The script face is Squirt's pen. It is used for his scribbles on the page
(the "ouch" on a buried score, "Closest one. Squirt's sweating.", "Tap me,
I've got more") and nowhere else. Never for headings, numbers or buttons.

## Empty states

An empty state says what will appear and when, with a beat of voice:

- "No trades yet. Squirt fell asleep waiting."
- "Nobody owes yet. Somebody will."
- "Quiet. Too quiet. Touchdowns, lead changes and callouts land here as they happen."
- "Sleeper hasn't posted the matchups yet. Patience."

## Moments

One short line, earned by something real, once per device:

- Win: "Matt, you took it. Week 5 goes in the win column."
- Shart: "Flushed. Matt, you're the Shart of week 5."
- New chug: "Fresh chug. The week 1 chug is up."

## For the Rag writer, when v3 ships

Proposed additions to `VOICE` in `config/style-guide.ts`. Not applied: that
file drives the live paper.

- The app is now called Splash; the paper is still The Rag (The SquirtRag in
  full). Squirt is the league's character, a drop with football laces.
- The Shart story's sign off can reference "the long walk" and the chug the
  way the app does, so the paper and the app share their jokes.
