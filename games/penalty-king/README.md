# Penalty King (`penalty-king`)

A five-kick penalty shootout, one human against the CPU. You are Lagoon Lanterns; you kick (swipe to aim, curve and
power) and you keep (tap a dive button). Rivals: Ozavize (Easy), Ndako (Medium), Hamman (Hard). No pass-and-play,
no second human, no stakes.

## Modes

- **Cup:** an 8-team knockout (quarter-final, semi-final, final). You are always slot 0; the other matches of each
  round are simulated with the seeded RNG and the same shootout rules (`rules/bracket.ts`). Quarter-finals are on the
  community pitch, later rounds in the stadium. A loss ends the run; the bracket is still played out.
- **Quick match:** one shootout against the rival you pick with the difficulty control; the opposing team is seeded.
- **Practice:** striker only, unlimited, unscored. It reports `start` and `end` to the portal and records nothing.

## Rules (`src/rules/shootout.ts`)

- Five kicks each, alternating; a seeded coin toss decides who kicks first.
- A side wins early as soon as the other cannot catch up with the kicks it has left (`goals > other goals + other's
remaining kicks`), for either side.
- Level after five each: sudden death, one more kick each; it ends after the first round that is not level. The scoreboard
  shows the first five kicks of each side plus the total.
- The state is plain JSON (`seed`, `rng`, `kicks`, `goals`, `taken`, `quota`, `turn`, `status`, `winner`, `early`).

## Physics (`src/physics/`, pure, metres)

- The goal plane is x in [-3.66, 3.66], y in [0, 2.44]. A shot has an aim, a power 0..1 and a curve -1..1.
- Power zones: 1 Soft (< 0.25), 2 Good, 3 Sweet (0.5 to 0.75, the most accurate), 4 Hard, 5 Over (>= 0.92, it flies high).
  Flight time is 11 m over 13 + 17 x power m/s (0.85 s down to 0.37 s). Scatter grows with a harder hit and with curve.
- A curve bows the ball sideways mid-flight (`sin`) and brings it back to the aim line at the goal plane.
- Wood is a no-goal: within 0.17 m (post radius + ball radius) of a post or the bar it is a `post` outcome; further out is wide
  or over. A save needs the ball inside the keeper's elliptical reach where his hands are when it arrives; the dive takes
  0.30 to 0.46 s, so a late dive reaches less.

## Input (`src/input/`)

- **Swipe** (`swipe.ts`): the end of the swipe, scaled by a per-layout gain, is the aim point; the speed of the last 120 ms is
  the power (0.3 to 3.2 px/ms); a path that bulges left curls the ball right and the other way round. Swipes under 36 px,
  not upward enough or older than 2.5 s are cancelled with a hint.
- **Dive:** six real buttons (>= 44 px) over a 3 x 2 grid, or a swipe across the grid (`dive.ts`).
- **Keyboard:** arrows aim, Z and X curl, Space starts the power meter and Space kicks; as keeper arrows pick a button and
  Enter dives; P or Escape pauses.

## AI (`src/ai/`)

The CPU keeper does not know where the shot will end up, but it is not blind. Each kick it either GUESSES before the strike (the zone
is drawn from the human's saved habit plus this match; `bias` blends it with a uniform guess) or READS: it uses the ball's TRUE
position at its reaction time (`react` seconds after the strike, via the same flight function the view draws) and extrapolates a
straight line, so a curved shot fools it. Nothing later in the flight, and not the scatter-free aim, is used. The CPU striker draws a
zone from a weighted table with an anti-repeat penalty, then power, curve and jitter. Both are pure functions of the shootout so far
(`aiRng(seed, kick, salt)`).

| Level          | react | read | bias | guess start | stay | striker corner x | repeat penalty |
| -------------- | ----- | ---- | ---- | ----------- | ---- | ---------------- | -------------- |
| Easy (Ozavize) | 0.30  | 0.20 | 0    | +0.10 s     | 20%  | 2.5 m            | none           |
| Medium (Ndako) | 0.20  | 0.30 | 0.6  | +0.07 s     | 4%   | 2.75 m           | x0.5           |
| Hard (Hamman)  | 0.12  | 0.33 | 0.7  | +0.04 s     | 0%   | 3.25 m           | x0.35          |

Simulation numbers (1000 seeded shootouts each, `src/ai/ai.test.ts`) are in the hand-off report. The side zones' hands end at x = +-2.45 m
(reach 1.05 m), so a ball at the post is coverable. A regression test runs eight single-placement probes (outer low posts, inner posts, top
corners, centre) against a quick human keeper: the best one wins at most 22% of matches against Hard fresh and 25% after 300 matches of learned habit.

## Code map

- `src/rules/`: `shootout.ts` (state machine), `bracket.ts` (cup), `progress.ts` (stats, score, stars), `teams.ts`, `config.ts`.
- `src/physics/`: `shot.ts`, `keeper.ts`, `resolve.ts`, `after.ts` (after-impact ball motion), `constants.ts`.
- `src/ai/`: `keeper.ts`, `striker.ts`, `profiles.ts`, `personas.ts`, `sim.ts` (controllers, scripted human, simulations).
- `src/play/flow.ts`: the match as a `dt`-driven state machine (intro, ready, runup, flight, result, done) with no DOM and no timers.
- `src/view/`: `play.ts` (loop, pause, watchdog, banter, sound), `stage.ts`, `renderer.ts` (Canvas 2D, layers: goal-back, keeper, ball and
  shadow, striker, goal-front), `sprites.ts` (sheets drawn once per layout), `geometry.ts` (perspective), `hud.ts`, `controls.ts`,
  `screens.ts`, `cup-screen.ts`, `sounds.ts` (every `penaltySfx` cue is played here by name).
- `src/testkit.ts`: test builds only. `window.__naijaTest.autoplay({ mode, difficulty, win, realtime })`, `getState()`, `setSeed(n)`.
  `?tempo=0.2` runs a match five times faster; `?tempo=1` keeps real time (needed for taps inside the keeper window).

## Safety nets

- **Watchdog** (`view/play.ts`, 8 s wall clock, paused while the dialog is open or the tab is hidden): a CPU or animation phase that
  has not moved on is forced on by `flow.skip()`. It never forces a human to shoot.
- **Resize and rotation** re-layout the canvas and the swipe frame only; the match state lives in the flow.
- **Art that fails to load** is drawn as plain shapes; the match still plays.
- The pixel ratio is capped at 2; sprites are rasterised once per layout; effects use a pool of six elements.

## Not shipped

Music loops and voice lines are silent placeholders (see `docs/assets/penalty-king-brief.md`); the game uses the synth stand-ins in
`src/audio/music.ts`. Hero art is an SVG placeholder.
