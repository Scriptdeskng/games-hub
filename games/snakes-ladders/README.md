# Snakes & Ladders: Lagos Edition (`snakes-ladders`)

One human against 1 to 3 CPU opponents (Tari, Efe and, for three opponents, Funmi (Yoruba, Lagos) or Aisha (Hausa) on alternate games). A 10 x 10
board, ladders are the lucky rides (BRT, okada, keke, the clear bridge) and snakes are the
everyday Lagos hold-ups (potholes, go-slow, NEPA, the toll-gate queue). Dice are a board-game
mechanic only: there are no wagers, prizes or real money anywhere.

## Rules

- Squares are numbered boustrophedon: 1 is bottom-left, row 1 runs left to right, row 2 right to
  left, and 100 is top-left. Everybody starts off the board (square 0) and the human goes first.
- On your turn roll one die and hop that many squares.
- Land on the foot of a ladder and ride up. Land on a snake's head and slide down. Landing on a
  ladder's top or a snake's tail does nothing.
- First pawn on 100 wins. Pawns never block or capture each other (they share squares).
- The CPU players follow exactly the same rules as the human.

### Toggles (Rules screen, saved in the progress)

| Setting       | Default | What it does                                                                                                                                     |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `exactFinish` | on      | You must land on 100 exactly. A roll that is too big leaves you where you are (the pawn shakes in place). Off: any roll past 100 wins.           |
| `reroll`      | on      | Once per game each player may throw away the roll they just saw and roll again (the new roll must be kept). The human sees "Move 4" / "Re-roll". |
| `choiceDice`  | on      | On every 5th turn of a player's own (`choiceEvery`, default 5) roll two dice and keep one. Tap a die, or press 1 / 2.                            |

### Controls

Touch, mouse and keyboard: tap the die (or Space / Enter) to roll; "Move" (Space / Enter) or
"Re-roll" (R) after a roll if you still have your re-roll; tap a die or press 1 / 2 on a two-dice
turn; the pause button, P or Esc pauses. Shake-to-roll works on phones that report
`devicemotion`; the tap always works.

## Code map

```
src/rules/      pure, serializable, seeded rules (no DOM, no timers)
  config.ts       Rules + defaults + sanitizeRules, Jump / BoardLayout types
  layout.json     the ladder and snake table (the single source of truth)
  layout.ts       validateLayout, loadLayout (hard rules, checked at load)
  design.ts       designProblems: crossings, touching ends, counts, balance (checked by tests)
  board.ts        squareToCell (boustrophedon) and resolveLanding (one move, pure)
  engine.ts       GameState, apply(state, action), legalActions, serialize/deserialize
  progress.ts     local stats (wins, best per level, streak, fastest win) and score
src/ai/         CPU opponents on @naija/core/ai-kit
  planner.ts      exact expected-turns tables (value iteration) for Hard
  brains.ts       Easy, Medium and Hard brains
  personas.ts     Tari, Efe, Aisha: avatars, thinking range and banter keys
  sim.ts          headless games and win-rate statistics (used by the tests)
src/view/       DOM + CSS (transform and opacity only)
  board.ts, connectors.ts, geometry.ts   board art, numbers, pawns, ladders and snakes
  play.ts, play-ui.ts, flow.ts           one game: turn flow, animation, pacing and pause, banter
  screens.ts                             menu, how to play, rules, results
src/audio/      sfx.ts (synth voices and cues from the asset brief), cues.ts (theme to cue, music)
src/app.ts      screens, progress, portal events, the test hook
```

## How the layout config works

The whole board lives in one JSON table, `src/rules/layout.json` (the art generator
`scripts/gen-snakes-ladders-art.mjs` reads the same file):

```ts
{ id: 'ladder-8', from: 8, to: 36, theme: 'okada' }   // up
{ id: 'snake-98', from: 98, to: 78, theme: 'tollqueue' } // down
```

- `id` is any unique string; `theme` picks the badge, the sound and (with `from`) the caption key
  `snakes.cap.<from>` in `en.json` / `pcm.json`.
- `loadLayout` validates the table **when the module loads** and throws a `LayoutError` that lists
  every problem, so a broken board cannot ship. It rejects: a ladder that goes down or a snake that
  goes up, ends outside 1..100, starts outside 2..99, jumps shorter than 3 squares, two entries on
  one square (overlap), an end square that is another entry's start (a chain), a start no die roll
  can reach, a board whose last square cannot be reached, and squares from which no pawn can ever
  finish.
- The ladders and snakes are **drawn from the table** (`view/connectors.ts`: rails and rungs, wavy
  snakes, badges from `assets/board/connectors.svg`). `assets/board/overlay-default.svg` is the
  designer's static version of the same layout; it is not shipped.
- The board background (`board-bg.svg`) carries the landmark tiles. If you move ladders or snakes,
  re-run `scripts/gen-snakes-ladders-art.mjs` so no landmark sits under a connector, and add or
  update the caption keys for the new `from` squares.
- **Landmark clearance is not machine-checked (QA SL-10c, documented instead of tested).** The
  landmark tiles are baked into `board-bg.svg` by `scripts/gen-snakes-ladders-art.mjs`, which owns
  their positions; there is no data file with those positions for a test to read, and moving them
  into one means changing the art pipeline. The crossing, touching-end and balance rules are
  tested (`rules/design.ts`); after editing the layout, re-run the generator and look at the board.
- Hard's planner (`ai/planner.ts`) is solved from the table at the start of the game, so the CPU
  adapts to any valid layout with no further change. Solved tables live in a `PlannerCache`
  created by the app instance (and by each simulation), never in a module-level variable.

## CPU opponents

| Level  | Choices it makes                                                                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Easy   | Random: either die, and spends the re-roll 20 % of the time it is offered.                                                                                                     |
| Medium | Rules of thumb: keep the die that ends highest (ladders good, snakes bad); re-roll to dodge a snake or an overshoot near the finish. Slips at the profile mistake rate (20 %). |
| Hard   | Exact. Value iteration over (square, turn in the two-dice cycle, re-roll left) gives the expected turns to finish; it keeps the die and spends the re-roll to minimise that.   |

Every CPU "thinks" for 0.4 to 1.2 s (seeded, each persona has its own range) and has Pidgin and
English banter bubbles. See `ai.test.ts` for the seeded simulations: Hard vs Easy, Medium vs Easy
and Hard vs Medium over 2000 games each with Wilson 95 % intervals.

## Test hook (non-production builds)

`window.__naijaTest.autoplay({ difficulty, cpus, win, realtime })` (the test members are built
only inside `__NAIJA_TEST__` branches and live in the app's optional `test` property, so the
production app object has none): instant by default (it searches
from the current seed for a game the human wins, or loses with `win: false`, then shows the
results); `realtime: true` plays the first 10 moves through the real UI and animations (compressed
4x in time, the human seat played by the Hard brain), then finishes the game instantly, so a perf or
soak round is bounded at a few seconds. `?tempo=0.15` on the
URL (test builds only) compresses animations and CPU pauses for specs that tap the real controls.
`getState()` returns `{ screen, difficulty, seed, progress, round }` where `round` is the engine
state; `setSeed(n)` fixes the seed of the next game.

## Assets

Everything is listed with its licence in `assets/CREDITS.md`. The synthesized music loops in
`src/audio/cues.ts` are the music. `assets/audio/music/snakes-*.mp3` and the `vo-sl-*` voice files are
silent placeholders that do NOT ship: `assets/ship.json` lists what goes into the build (board,
sprites, dice, icons, pawns), so overlay-default.svg, `thumb/*` and the placeholder audio stay out of
`dist`. When a composer delivers loops, load them with `playMusic({ kind: 'file' })` and add their
path to `ship.json`.

The third CPU alternates by the stored game counter (`progress.games`): Funmi on even counts,
Aisha on odd ones, never random per round. Both use the same AI profile; Funmi's banter never
mentions money.
