# Naija Ludo (`naija-ludo`)

One human against 1 or 3 CPU opponents on the standard 15 x 15 cross board (52-square track, four
yards, four home columns). The CPUs are Funmi (Yoruba, Lagos), Baba Ade (Yoruba, Ibadan) and
Malam Sani (Hausa-Fulani, Kano). Dice are a board-game mechanic only: there are no wagers, prizes or
real money anywhere. There is no pass-and-play, no second human and no human player-count picker.

## Rules

- You sit bottom-left (Pepper Red, circle seeds). One CPU sits opposite (top-right); three CPUs fill
  the other corners. Turn order is clockwise and the human rolls first.
- Roll one die. A **6 brings a seed out of the yard** onto your start square, and every 6 earns
  another roll. A seed moves clockwise round the shared track (51 squares from its start), then
  into its own **home column** (5 coloured squares and the home triangle: 6 squares, progress
  51..56). Home columns are private, so nothing in them can be captured.
- **Capture:** landing on a lone opponent seed on a normal square sends it back to its yard, and you
  roll again (toggle).
- **Safe squares** (nothing can be captured there): every colour's start square and the star square
  8 steps after it (8 squares in all).
- **Exact roll to get home** (toggle). A seed that would overshoot cannot move; a turn with no legal
  move simply passes (after a 6 you still roll again).
- **Three 6s in a row** forfeit the turn: the third roll does not count. A seed that moved on the
  second 6 stays where it moved (toggle).
- **Stacks** (two or more same-colour seeds on one square). One rule, three settings, default the
  casual house rule:
  - `safe` (default): a stack cannot be captured, and everyone may share the square;
  - `block`: a stack is a blockade nobody else may land on or pass (it also stops a release onto a
    start square it sits on);
  - `off`: no protection, a landing captures every opponent seed on the square.
    A lone seed left behind when a stack splits is capturable again.
- **Winning:** classic = all four seeds home. **Quick mode** = two seeds each, and by default the
  first seed home wins; the `quickFirstHome` toggle off makes both seeds have to get home.
- Forced moves: with one legal seed it moves by itself (setting, default on; off = tap it).

### Toggles (menu and Rules screen, saved in the progress)

| Setting          | Default | What it does                                                           |
| ---------------- | ------- | ---------------------------------------------------------------------- |
| `captureBonus`   | on      | A capture earns another roll                                           |
| `exactHome`      | on      | Exact number needed to reach home (off: reaching or passing is fine)   |
| `threeSixes`     | on      | Three 6s in a row forfeit the turn                                     |
| `stacks`         | `safe`  | `safe` / `block` / `off`, see above                                    |
| `quick`          | off     | Menu "Mode": Classic (4 seeds) or Quick (2 seeds)                      |
| `quickFirstHome` | on      | Quick mode: first seed home wins (off: both must get home)             |
| `autoMove`       | on      | Move a lone legal seed without asking                                  |
| `fastPlay`       | off     | Animations and CPU pauses take 0.6 of their time (long 4-player games) |

### Controls

Touch, mouse and keyboard. Tap the die (or Space / Enter) to roll; tap a glowing seed (it wears a
dashed ring, so it is not just a colour) to move it. Keyboard: `1`..`4` pick a seed, arrow keys move
the selection and Space / Enter confirms, `P` / Esc pauses. Hover, focus or the arrow keys show the
landing square with a pin. Shake-to-roll works on phones that report `devicemotion` (and when the
embedding page allows it); the tap always works.

## Code map

```
src/rules/      pure, serializable, seeded rules (no DOM, no timers)
  config.ts       Rules + defaults + sanitizeRules, board constants and the 1/3 CPU rule
  board.ts        track index maths, safe squares, zones
  engine.ts       GameState, legalMoves, apply(state, action), serialize/deserialize
  progress.ts     local stats (wins, best per level, streak, best captures) and the score
src/ai/         CPU opponents on @naija/core/ai-kit
  eval.ts         danger / exposure / prey: public-state evaluation used by Hard
  brains.ts       Easy, Medium and Hard brains (Hard keeps no state)
  personas.ts     Funmi, Baba Ade, Malam Sani: avatars, thinking range, banter keys
  sim.ts          headless games and win-rate statistics (Wilson intervals) for the tests
src/view/       DOM + CSS (transform and opacity only)
  geometry.ts     track / column / yard / home cells from the asset brief (pure, tested)
  stacks.ts       how seeds sharing a cell are drawn (pure, tested)
  board.ts        seeds, hop and capture animation, glowing seeds, effects (pooled)
  play.ts, play-ui.ts   one game: turn flow, input, banter; and its DOM (shared createFlow from core)
  screens.ts      menu, how to play, rules, results
src/audio/      sfx.ts (asset designer: the cues), music.ts (synth highlife loops)
src/app.ts      screens, progress, portal events, the test hook (test members only in `test`)
```

## Geometry

Cell units, `(col, row)` from the top-left of the 15 x 15 grid (the same grid as
`assets/board/board.svg`). Slot 0 (you) starts at (6,13), slots 1..3 follow clockwise at (1,6),
(8,1), (13,8). A seed element is exactly one cell, so `translate(x*100%, y*100%)` is resolution
independent and the board resizes without measuring. Cells are 22.7 px on a 360 px phone.

## CPU opponents

| Level  | How it chooses a seed                                                                                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Easy   | A random legal move.                                                                                                                                                             |
| Medium | Captures first (the biggest victim), then gets a seed home, comes out on a 6, lands on a safe square or into the home column, else runs the front seed. Slips 20 % of the time.  |
| Hard   | Scores every legal move: captures (and the bonus roll), release, home, progress, how much less exposed its seeds are afterwards (opponents 1..6 behind), and chances to capture. |

Every CPU reads only the public state (seed positions and the die already rolled), never the dice
rng, and the dice are the same whatever the difficulty. CPUs "think" for 0.4 to 1.2 s before a real
choice (Malam Sani at most 0.6 s) and skip the thought for a forced move. The seeded simulations in
`ai.test.ts` give the win rates quoted in the QA notes.

## Test hook (non-production builds)

`window.__naijaTest.autoplay({ difficulty, cpus, quick, win, realtime, liveMoves })`: instant by
default (it searches from the current seed for a game the human wins, or loses with `win: false`);
`realtime: true` plays 14 steps (or `liveMoves`) through the real UI and animations, the human seat
played by the Hard brain, then finishes the game instantly. `?tempo=0.12` on the URL compresses
animations and CPU pauses for specs that tap the real controls. `getState()` returns
`{ screen, difficulty, seed, progress, round }`; `setSeed(n)` fixes the seed of the next game. These
members exist only inside `__NAIJA_TEST__` branches and `scripts/prod-gate.mjs` fails the build if
`autoplay`, `setSeed`, `fastForward` or `liveMoves` appear in a production bundle.

## Assets

Listed with their licences in `assets/CREDITS.md`. `assets/ship.json` is the ship list and is
checked both ways: every shipped file must be referenced by the built code, `dynamic` (names built at
run time) or `keep`. `fx/confetti.svg`, `fx/stripe-sweep.svg`, the thumbnails and the placeholder
audio are not shipped: the shared results screen already celebrates a win, and nothing in the game
references them. The music is synthesised by `src/audio/music.ts` until a composer delivers the
highlife loops (`assets/audio/music/*.mp3` are silent placeholders and do not ship). The voice
player is not wired yet (the same known gap as Snakes & Ladders).
