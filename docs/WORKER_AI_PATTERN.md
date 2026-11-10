# Web Worker AI pattern (reference: `games/draughts-naija/src/ai/`)

Use this when a CPU search can take more than a few milliseconds (Ayo Olopon Hard should move onto it).
The UI thread never searches; it asks, waits for an answer and keeps animating.

## Four layers

| File | Role | Rules |
|---|---|---|
| `search.ts` (+ `decide.ts`) | the pure search core | no DOM, no timers, no worker globals, no module-level state (the transposition table, Zobrist keys and history are made inside each call). Capped by a NODE budget, never a clock, so a game replays identically on every phone |
| `protocol.ts` | `AiRequest` / `AiResponse` and `handleRequest(req)` | plain structured-cloneable data, every message carries the request `id`; `handleRequest` never throws (errors come back as `{type:'error'}`) and is what the worker, the fallback and the Node tests all call |
| `worker.ts` | thin wrapper: `onmessage -> postMessage(handleRequest(...))` | stateless, no imports besides the protocol, so killing it loses nothing. Do not add `/// <reference lib="webworker" />` (it breaks the `dom` types for the whole repo); type the scope locally |
| `client.ts` | main-thread client | request ids, `cancel(id)`, a timeout, a main-thread fallback with a small node budget, `warm()`, `destroy()` |

`worker-factory.ts` holds the one line Vite must see literally:
`new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`. Vite bundles worker.ts as its own file
(`chunks/worker-<hash>.js`, classic IIFE in the production build, so old Android browsers that lack module
workers still run it). Nothing else needs configuring: the build plugin precaches every built file, so the worker
script is in the service-worker cache and works offline; ship-check and prod-gate scan it like any other chunk
(keep test-only words out of the AI code).

## Client contract

- `request(state, difficulty)` returns `{ id, result, cancel }`; `result` resolves with the move, or with `null`
  when the request was cancelled or the client destroyed (never a rejection: no unhandled-rejection noise).
- The seed of a decision is a pure function of the game seed and the ply, so the worker, the fallback and a test give the same move.
- A worker cannot be interrupted mid-search, so `cancel` of an in-flight request terminates the worker and the next
  request starts a fresh one (still-pending requests are re-sent).
- Worker construction throws, `Worker` is undefined, `onerror`, a bad `postMessage`, or no answer within `timeoutMs`
  (6 s): terminate it, switch to `mode: 'main'` for good, and answer every pending request on this thread within
  `FALLBACK_NODES` (1 500 nodes, a few milliseconds), after a `setTimeout(0)` so the UI paints first.
- Every timer goes through the game's core `Scope`; `destroy()` terminates the worker and settles everything, so
  `window.__naijaTest.counters()` reads zero after a quit.
- The play controller still checks the answer with the rules (`findMove`) before applying it.

## Tests to copy

`client.test.ts` (fake worker class: ids, stale answers, cancel, fallback, error, timeout with fake timers, destroy,
`worker.ts` wiring), `search.test.ts` (node budget never exceeded, determinism, no shared state), `sim.test.ts`
(legality and difficulty ordering over seeded games) and the e2e `draughts-naija.system.ts` (real worker file
requested, no-Worker fallback, silent worker, terminate on quit, offline).

## Moving Ayo's Hard AI

`searchBest(pits, store, side, rules, plies, opts)` is already a pure function of plain data: wrap it in a
`protocol.ts` (`state` + `difficulty` + `seed`), add `worker.ts` and `worker-factory.ts`, pass `createWorker` to
`createPlay`, and replace the synchronous `cpu.decide(state)` in `takeTurn` with `await client.request(...).result`
(race it with the persona's think delay, as `play.ts` does here). The node cap can then be raised past 24 000.
