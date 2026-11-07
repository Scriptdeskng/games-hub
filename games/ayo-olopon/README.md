# Ayo Olopon (`ayo-olopon`)

The Yoruba mancala game: one human against one CPU on a carved iroko board, 2 x 6 pits, 4 seeds
each, a brass tray per side. The CPUs are Efe (Urhobo, Warri: Easy), Baba Ade (Yoruba, Ibadan:
Medium) and Malam Sani (Hausa-Fulani, Kano: Hard). No wagers, prizes or real money. There is no
pass-and-play, no second human and no player-count picker.

## Rules (defaults = docs/GAMES.md section 3)

Pits are indexed 0..11. Sowing is `i -> (i + 1) % 12`, counter-clockwise on screen. Pits 0..5 are
yours (numbered 1..6 in the UI and on the 1-6 keys), 6..11 are the CPU's.

- Lift every seed from one of your pits and sow them one by one into the following pits.
- **Skip origin** (toggle, on): a sow of 12 or more seeds skips the pit it started from.
- **Capture** (toggle `2 or 3`, or `3 only`): if the last seed lands in an opponent pit and makes it
  2 or 3, you take that pit.
- **Chain** (toggle, on): the pits just before it (still on the opponent side) that also hold 2 or
  3 are taken too, stopping at the first that does not.
- **Must feed** (toggle, on): when the opponent side is empty you must play a pit that reaches it.
  If no move can, the game ends.
- **Seeds left at the end** (toggle `owners` or `other player`): when the game ends because the
  player to move cannot move or feed, `owners` leaves each side's seeds to its owner; `other player`
  gives everything left to the player who starved the mover.
- **Winning:** the first to 25 of the 48 seeds wins at once. When the game ends early the leftover
  seeds are swept first, then the totals decide.
- **Tie rule (documented, not a toggle):** 24 each is a **draw**; the results screen says "A draw!".
- **Move cap:** after 400 moves (both players together) the game ends and every side keeps its own
  seeds. Real games take about 35 (Hard v Easy), 50 (Medium v Easy) to 120 (Hard v Hard) moves; the cap only guards
  against seeds circling forever.

The exact variant must still be confirmed by a Nigerian player; change a toggle on the Rules screen
(saved with the progress) to match the way it is played.

## Code map

- `src/rules/`: pure, seeded, serialisable engine (`config.ts` rules as data, `board.ts` sow and
  capture, `engine.ts`, `progress.ts`). Tests: `engine.test.ts`.
- `src/ai/`: `brains.ts` (Easy random legal, Medium greedy 1-ply with the profile's mistake rate,
  Hard alpha-beta), `search.ts` (negamax, iterative deepening to 8 plies, node-capped at 24 000 and
  deterministic), `personas.ts`, `sim.ts` (head-to-head simulations), `ai.test.ts`.
- `src/view/`: `geometry.ts` (reads `assets/board/layout.json`), `board.ts` (DOM board with a pool of
  48 seeds), `animate.ts` (the sow and capture movie), `play.ts` (turn flow), `play-ui.ts`,
  `screens.ts`.
- Test hook: `window.__naijaTest` (test builds only): `autoplay({ difficulty, win, realtime, liveMoves })`,
  `getState()`, `setSeed(n)`. `?tempo=0.2` speeds animations up in test builds.

## Why no Web Worker for Hard

A Hard decision visits at most 24 000 nodes: about 3 to 7 ms on a laptop; no browser long task (> 50 ms)
appeared over a whole game against Hard on a 4x CPU-throttled profile. The cap is a node count, not a
clock, so games replay identically on every phone. If the cap is ever raised past about 100 000 nodes,
move `searchBest` into a Worker (it is a pure function of plain data, so that is a small change).
