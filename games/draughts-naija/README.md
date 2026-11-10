# Draughts Naija (`draughts-naija`)

Draughts, one human (light, ivory) against one CPU: Doosuur (Tiv, Makurdi: Easy), Falmata (Kanuri, Maiduguri:
Medium) or Damola (Yoruba, Abeokuta: Hard). No pass-and-play, no second human, no wagers.

## Rules

- **10x10 international (default):** 20 men each, men capture forwards and backwards, capture is compulsory, the
  **maximum capture** must be taken (a king counts as one piece), flying kings, captured pieces leave after the whole
  sequence, a piece may not be jumped twice but the same empty square may be passed twice, a man that reaches the
  back row mid-capture and can keep capturing is not crowned (it is crowned only if it ends its move there). A king
  that lands with a choice of squares must pick one from which it can keep capturing.
- **8x8 short game:** 12 men each, men capture backwards, capture compulsory. Toggles (Rules screen, saved): the
  majority rule (default on) and **flying kings** (`flyingKingsShort`, default off: a king steps one square).
  **Open rule question for a Nigerian player: is the short game played with flying kings, and with the majority rule?**
- **Who starts:** the human (light) by default; the toggle "Computer moves first" makes dark open.
- **Draws:** the same position (same side to move) three times; 50 consecutive plies in which only kings moved and
  nothing was captured (25 moves each, the FMJD 25-move rule; a man move or a capture resets it). A side with no
  legal move loses. (A 1000-ply safety cap exists; no seeded game reaches it.)
- Perft counts from the start position are tested: 10x10 `9, 81, 658, 4265, 27117`; 8x8 with backward capture and
  the majority rule `7, 49, 302, 1469, 7473` (`7482` without it).

## Code map

- `src/rules/`: pure, serialisable engine. `config.ts` (rules as data), `board.ts` (cells, diagrams), `movegen.ts`
  (captures, majority, flying kings), `engine.ts` (state, `applyMove`, end of game), `progress.ts` (score, saved stats).
  Tests: `movegen.test.ts`, `engine.test.ts` (220 random seeded games per size and rule set, invariants every few
  plies), `progress.test.ts`.
- `src/ai/`: see `docs/WORKER_AI_PATTERN.md`. `search.ts` (alpha-beta, iterative deepening, per-search transposition
  table, move ordering, quiescence), `eval.ts`, `profiles.ts` (budgets and blunder rates), `decide.ts`, `protocol.ts`,
  `worker.ts`, `client.ts`, `sim.ts`, `personas.ts`.
- `src/view/`: `board.ts` (DOM: dark squares only, marks, path legs and numbered stones), `entry.ts` (pure move-entry
  model: select, destinations, telling paths apart), `board-input.ts` (tap, drag, keys, hit-slop 22 px),
  `play-human.ts`, `play.ts` (turn flow), `animate.ts`, `seats.ts`, `play-ui.ts`, `screens.ts`.
- `src/testkit.ts`: test builds only. `window.__naijaTest`: `autoplay({ difficulty, size, win, realtime })` (plays the
  human seat through the engine; `realtime` goes through the real UI and worker), `getState()` (round, legal moves, AI
  stats and think times), `setSeed(n)`; `?tempo=0.15` speeds up animations and CPU pauses.

## AI levels

| Level            | depth cap | node cap | slip (random move) | think pause  |
| ---------------- | --------- | -------- | ------------------ | ------------ |
| Easy (Doosuur)   | 2         | 400      | 30%                | 0.5 to 0.9 s |
| Medium (Falmata) | 5         | 4 000    | 6%                 | 0.7 to 1.1 s |
| Hard (Damola)    | 14        | 40 000   | 0%                 | 0.8 to 1.2 s |

The search runs in a Web Worker while the persona "thinks"; the move is shown after the longer of the two. Main-thread
fallback: 1 500 nodes. The measured numbers (win rates, think times) are in the hand-off report; regenerate the
full-budget rates with `DN_RATES=1 npx vitest run games/draughts-naija/src/ai/sim.test.ts`.

## Not shipped

No undo (the `undo` cue was deleted), no coins. Hint is free and cosmetic (it costs 15 score points).
Placeholders still needed: music loops, voice lines, hero art (see `docs/assets/draughts-naija-brief.md`).
