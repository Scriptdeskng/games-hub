# QA report: naija-whot (2026-11-08, commit b6d804a)

Verdict: FAIL

## Summary
- Gates: lint, typecheck, i18n, build (prod-gate), size (114.2 KB gzip vs 3072 KB), e2e 58/58, e2e:extra 58/58 and e2e:perf all PASS. `npm run test:cov` FAILS on this machine (2 of 2 runs, default 5 s timeouts in other games' tests; every Whot test passes; Whot `src/rules` 100% statements, lines and functions, 98.7% branches). One of two 10-minute soaks stalled for 15.7 min (unexplained); the other passed with a flat heap.
- Rules: every rule and toggle matches docs/GAMES.md section 1 and is covered by probes and unit tests. Three major defects: the 600-action safety net ends about 1 in 6 three-CPU games (17% at Medium) without the rules' "empty your hand" win; the how-to text misstates the 2/5 defence rule; persona play styles are not implemented at Easy or Medium.
- AI and privacy: zero illegal moves in 21,600 seeded games (7,200 per CPU count); Hard beats one Easy CPU 84.9% (n=1000) and 85.0% (n=2000); the AI reads only the public view (0 of 211,236 decisions changed when hidden cards were shuffled); CPU cards are never in the DOM, test hooks are absent from the production bundle, and the portal bridge posts only to the validated origin. Minor: the game seed is sent to the portal and fully determines every hand.

## Results table

| # | Item | Status | Evidence |
|---|---|---|---|
| 1a | `npm run lint` | PASS | exit 0 (eslint + prettier) |
| 1b | `npm run typecheck` | PASS | exit 0 |
| 1c | `npm run i18n:check` | PASS | "i18n check OK", exit 0 |
| 1d | `npm run test -- --coverage` (`test:cov`) | FAIL | Run 1 exit 1: 7 of 559 failed, all `Test timed out in 5000ms` (games/ayo-olopon/src/ai/ai.test.ts x3, games/snakes-ladders/src/ai/ai.test.ts "evicts old entries" 16.7 s, games/naija-ludo/src/ai/ai.test.ts, packages/core/src/audio/instruments.test.ts x1, plus an unhandled RPC timeout). Run 2 exit 1: 1 of 559 failed (snakes-ladders "evicts old entries" 5.8 s). No Whot test failed. Coverage table not printed on failure. See W-05 |
| 1e | Whot `src/rules` coverage | PASS | Whot-only run with coverage restricted to `games/naija-whot/src/rules/**`: 89/89 Whot tests pass; statements 100% (429/429), lines 100%, functions 100% (50/50), branches 98.7% (228/231). Threshold 90 met |
| 1f | `npm run build` | PASS | 5 games built; "prod-gate OK: 30 files scanned, no test hook or autoplay code in dist/" |
| 1g | `npm run size` | PASS | naija-whot 114.2 KB gzip / 106.1 KB brotli vs 3072 KB budget (target 1.5 MB) |
| 1h | `npm run e2e -- naija-whot` | PASS | 58 passed (3.8 min): 29 tests at 375x812 and 360x640. Covers menu, how-to, rules, 1/2/3 CPU games, pause, results, replay, quit, portal order, Whot picker, refused card, keyboard, flick, last card, persistence, pcm, token-free storage, crafted portal origin, Referer, offline SW, 5 replays |
| 1i | `npm run e2e:extra -- naija-whot` | PASS | 58 passed (4.1 min): landscape 812x375 and desktop 1280x800 |
| 1j | `npm run e2e:perf -- naija-whot` | PASS | Fast 3G + 4x CPU: time to menu 2309 ms (budget 4000). fps 1 s min 57, average 59.7; core perf hook average 58, minimum 42 (one sampling window). Worst frame 66.7 ms. Heap after run 2.34 MB |
| 1k | `npm run e2e:soak -- naija-whot` | FAIL then PASS | Run 1: FAIL. 125 rounds; heap 2.25 MB (0.1 min) to 2.69 MB (7.5 min); then one `autoplay` round did not return for about 15.7 min and the test hit its 780 s timeout (test ran 23.4 min). Run 2: PASS. 151 rounds in 10.01 min; heap 2.70 MB at 1.0 min, 2.74 MB at 10.0 min; steady slope 3.8 KB/min (limit 100); counter assertions passed. See W-04 |
| 2 | Rules vs GAMES.md section 1 | PASS with defects | Probes P1 to P10 (run from tmp/qa, deleted) plus unit tests; see the rules table below. Defects W-01, W-02 |
| 3 | AI legality (200 seeded games per CPU count) | PASS | 7,200 games per CPU count (3 difficulties x 12 rule variants x 200 seeds, every toggle flipped): 0 illegal moves, 0 unfinished at 1, 2 and 3 CPUs. Games ending by the 600-action cap: 107, 143 and 967 respectively (W-01) |
| 3b | Hard vs Easy (DoD >= 80%) | PASS | 1 Easy: 84.9% (849/1000, Wilson 95% lower 82.5%); 85.0% over 2,000 games; 83.2 to 85.0% with each persona style on the Hard seat. 2 Easy: 71.6%; 3 Easy: 60.0% (fair share 25%) |
| 3c | Ordering | PASS | Medium vs Easy 72.2%; Hard vs Medium 64.8% (500 games each) |
| 3d | Last-card forgetfulness fairness | WARN | Easy moves to one card without calling in 50.8% of such moves (Medium 10.1%, Hard 0%). Ablation: Hard vs Easy 85.7% as configured, 79.8% if Easy calls perfectly (n=1000 each). So about 6 points of the margin come from forgetting and the DoD 80% holds only with it. Visible to the player via the Catch button, and symmetric (Hard catches the human 95%). Judged fair; not explained in text. See human review |
| 3e | Public information only | PASS | Scrambling every hidden card (other hands and the market order) in 100 seeded 4-seat games: 211,236 decisions compared across seats, 3 difficulties and 4 styles; 0 differed. `viewFor` has no hidden fields (rules/view.ts) |
| 3f | Persona play styles | FAIL | Medium lead-with-2/5/14 rate is 73.8% for all four styles (n=4,038 identical states); Easy 32.9% for all four. Hard hoarder plays a Whot while another card fits in 1.2% of turns vs 0.6% balanced. See W-03 |
| 3g | Cap ending by table size | FAIL | 500 seeded games each: 1 CPU 0.2 to 0.8%; 2 CPU 0.2 to 0.4%; 3 CPU all-Medium 17.4%, all-Hard 18.6%, Hard + 3 Easy 2.6%. See W-01 |
| 4 | Playthrough and layouts (375x812, 360x640, 812x375, 1280x800) | PASS with W-07 | Menu, how-to, rules, play, results and replay captured and read. No horizontal overflow (scrollWidth <= clientWidth) on any screen; the only clip hit is the intentionally hidden `.wh-sr` live region. Console and page errors: 0. The 7-card fan at 360 is W-07 |
| 4b | Tap targets (44 px) | PASS with W-07 | Fan strip 46 px portrait and 56 px at 640+ wide, card 64x90 px; Last card 112 to 124 x 48 px; market pile 72 to 110 px wide; Pause 44x44; menu controls all >= 44 px. Hidden CPU card backs are not tap targets. The CPU Catch button is min-height 44 px (style.css:329). The 7-card case: strips stay 46 px, but the last card is clipped at 360 (W-07) |
| 4c | Greyscale shape distinguishability | PASS (visual) | Greyscale play screen at 360 with 7 cards: triangle, square, circle and star silhouettes and the numbers stay distinct; blocked cards fade and the playable Whot lifts. Numeric IoU not re-measured |
| 4d | Contrast | PASS (visual) | Status chips, card numbers and menu text legible on wood and wine; no numeric contrast measurement taken |
| 4e | Keyboard | PASS | e2e keyboard test: 1 to 9 pick, Enter plays, D draws, P pauses, Esc resumes. Catch is a native button reachable by Tab |
| 4f | Time a full human-paced game vs 3 CPUs (fastPlay off) | WARN | Real-speed runs (tempo 1, Medium, 3 CPUs, bot in the human seat, 180 ms per human turn): 1.0 min (51 actions), 0.5 min (15 actions), 1.3 min (60 actions). Expect about 2 to 3 min with a real human (estimate: 2 to 3 s per human decision, about 25 human actions; not measured on a device). A capped game takes about 10 to 13 min (W-01) |
| 5 | Performance | PASS with WARN | See 1j and 1k. Average fps passes (59.7 and 58); minimum core-hook window 42 fps (below the 50 fps line for one window). Heap flat in run 2 |
| 6 | Robustness | PASS | Counters from `__naijaTest.counters()`. Menu: listeners 22, timers 2, rafs 1. In a round: 30 to 35 listeners (pause overlay adds 5 and removes them on resume), timers 3 to 5, rafs 1. Tab hidden: rafs 0 and back to 1 on show; orientation change and 20 rapid resizes: counters unchanged, no page error. Double tap on a playable card: exactly one card played (hand 5 to 4). Double tap on the market when no draw is needed: no change. Offline after load: a full game finished, 0 errors. 5 replays: counters 11/2/1 on results at every replay (no growth), back to 22/2/1 on the menu |
| 7 | i18n en and pcm | PASS with W-09 | en 121 keys, pcm 121 keys, no missing or extra keys, no empty values. 84 `_review` flags in pcm (60 UI, 24 banter), none in en. No hard-coded UI strings in `src/view`, `src/app.ts`, `src/main.ts` (grep). Diacritics: "Ọ dị mma!" correct. See W-09 and human review |
| 8 | Portal and privacy | PASS with W-10 | Event order asserted as `ready > start > score (> score)* > level_complete > end` (e2e portal test passes). postMessage target is the validated `portal` origin only (portal/index.ts:145); crafted origin gets no request, event or token (e2e). Token only as `Authorization: Bearer` (portal/index.ts:156, 168), never in a URL, log or localStorage; storage guard rejects token, msisdn, phone, digit runs (storage/index.ts:14). No console output in game or core source. Seed in `start` event: W-10 |
| 8b | Prod bundle free of test members | PASS | `grep` of dist/naija-whot for `__naijaTest`, `autoplay`, `fastForward`, `setSeed`, `snapshot`: no hits. "getState" hits are the RNG accessor |
| 9 | Single-player | PASS | One human seat (`createTurns`); menu offers 1, 2 or 3 CPUs only; grep of `src`, `index.html`, `assets` for pass-and-play, hide-hand, hot seat, multiplayer, player-count: no hits in game code |
| 9b | CPU hands hidden in the DOM | PASS | Live check at round start on a 1-CPU table (browser, test build): no `c-*` or `s-*` symbol reference, no card aria label and no card identifier inside `.wh-seats`. CPU seats show only `c-back` card backs and a count. `data-card` only on the human fan; `data-shape` only on the picker |
| 10 | Cultural authenticity | PASS with WARN | Brief and CULTURAL_GUIDE row for Whot delivered: table in iroko-style wood with an ankara-style cloth; aso-oke stripe and akwete diamond card backs; adire dots; ogene for Whot 20, ekwe card place, shekere shuffle, talking drum slam; personas Mama Nkechi (Igbo), Tari (Ijaw), Aisha (Hausa). SFX: every `whotSfx` and core cue uses a Nigerian voice (agogo, talking drum, ekwe, udu, ogene, shekere, goje/kakaki fanfare, crowd); sfx.test passes. No kente, kora, safari, masks, sacred or political symbols seen. WARN: music is a synthesized stand-in (no guitar; brief asks highlife guitar loops), voice lines are not wired, persona play styles missing (W-03) |
| 11 | Content and compliance | PASS | No gambling mechanics or imagery (market burst is shapes and a stall; no coins, notes, chips; no betting words in locales); no gore; no real brands, clubs or players; CREDITS.md lists every shipped asset with a licence, placeholders flagged; no runtime external URLs. Quiz packs: not applicable |
| 12 | Code health | PASS with minor notes | No `any`, no ts-ignore in Whot source. Files: `engine.test.ts` 709 lines, `style.css` 642, `play.ts` 409. Dead exports and vacuous assertions (W-12, W-13) |
| 13 | Coverage-flaky fixes did not weaken assertions | FAIL | Whot `ai.test.ts` (new file in this branch, so there is no earlier version to diff): its simulation tests use a 120 s timeout and the strict Wilson lower-bound assertions. Ludo `engine.test.ts`: timeout 5 s to 60 s, assertions unchanged. Snakes-ladders planner: a 100 ms solve-time guard was replaced by a sweep count plus a 10 s ceiling (W-06). Planner `sweeps` counter: production-safe (diff adds only a local integer counter, solve loop unchanged), but adds a test-only field to the production interface (W-13) |

### Rules table (item 2)

| Rule or toggle | Result | Evidence |
|---|---|---|
| 54-card deck (GAMES.md) | PASS | P1: circle 12, triangle 12, cross 9, square 9, star 7, Whot 5 x 20; ids 0..53 unique; numbers exactly as spec; 300 dealt games conserve 54 cards, 5 per hand |
| Starter is never a power card | PASS | P2: 1000 seeds, face-up starter never 1, 2, 5, 8, 14 or 20 (engine.ts:113-116) |
| Match by shape or number; Whot anywhere; called shape after Whot | PASS | engine.test.ts 102-118; P6 |
| 1 Hold On | PASS | P3: same seat plays again at 2 and 4 seats |
| 2 Pick Two (draw 2) | PASS | P3: next seat owes 2; draw leaves them 4 cards and passes the turn |
| 5 Pick Three (draw 3) | PASS | P3: owes 3 |
| 8 Suspension | PASS | P3: 2 seats: the human plays again; 4 seats: exactly one seat skipped |
| 14 General Market, 1 / 2 / 3 CPUs | PASS | P3/P4: each other seat draws exactly 1; the player plays again; draw pile shrinks by the CPU count; total conserved |
| Reshuffle when the draw pile empties, top card kept | PASS | P5: top card stays on the pile; discard becomes the new market; total conserved; penalty spanning a reshuffle gives the full count |
| Whot called shape, then pick penalty (whotOnPending on/off) | PASS | P6: on: Whot cancels the 2-pick and the named shape binds the next seat; off: Whot not playable on a pick, CPU must draw 2 |
| Last card: out-of-turn call | PASS | P7: `announce` accepted on another seat's turn; turn does not move |
| Last card: catch penalty 2 cards, does not end the catcher's turn | PASS | P7; engine.test.ts 503-523 |
| finishOnSpecial on: finish on 1, 2, 5, 8, 14 or Whot | PASS | engine.test.ts 420-447; P8 (Whot called and won; lone 2 defends and wins) |
| finishOnSpecial off: lone power card cannot go out | PASS | engine.test.ts 437-447; P8 (lone Whot blocked, lone 5 must draw). The two-card case in P8 is a probe bug, corrected, not a defect |
| stackTwo (2 on a 2 grows the penalty) and defendFive (5 on a 5) | PASS | engine.test.ts 246-302; a 2 cannot answer a 5 and a 5 cannot answer a 2 (engine.test.ts 262-289; legal.ts:51-52) |
| marketAgain on / off | PASS | engine.test.ts 398-406; P3 |
| lastCard, semiLast | PASS | engine.test.ts 464-566 |
| marketEnds (count-up) | PASS | engine.test.ts 602-662; P9 |
| 600-action safety net | FAIL | Unit test passes (engine.test.ts ~654). In real play the cap fires in about 1 of 6 three-CPU games: W-01 |

## Defects

Severity: blocker / major / minor. Verdict is FAIL because of the failed test:cov gate and the majors below.

**W-01 (major): the 600-action safety net ends about 1 in 6 three-CPU games**
- Steps: Start a game with 3 CPUs at Medium (default rules) and play to the end, or run `simulate` on a 4-seat all-Medium table over seeds 1 to 500.
- Expected: the game ends when a hand is emptied ("Win: first to empty their hand", GAMES.md section 1). The count-up end is an opt-in variant (`marketEnds`).
- Actual: 17.4% of all-Medium 4-seat games and 18.6% of all-Hard games reach `MAX_TURNS` (600 actions) and end as `endedBy: 'cap'`, with the lowest total winning. Hands grow to 15 to 21 cards and the market is empty. The 1-CPU rate is 0.2 to 0.8%, 2-CPU 0.2 to 0.4%. Traces: about 120 single-card General Market draws and 77 reshuffles per capped game; one pick penalty of 15 cards. The player gets no explanation: `present.ts:255` (`case 'end': break;`) and the results screen do not say the game ended by count-up.
- Files: `games/naija-whot/src/rules/engine.ts:344`; `src/rules/config.ts:58` (MAX_TURNS); AI driver of the free-turn chains: `src/ai/brains.ts:99-131` (Medium scores 14 at 90 and 1 at 80) and `brains.ts:214-216` (Hard General Market bonus).
- Fix: find the stall cause (repeated free turns from 1 and 14 and stacked picks), rebalance the AI's use of 14, and/or cap consecutive free turns; show a message when a game ends by the cap; re-measure (target at most 1% of 3-CPU tables).

**W-02 (major): how-to step 4 misstates the 2/5 defence rule**
- Steps: Open "How to Play" (en or pcm), read step 4.
- Expected: a 2 defends only a 2 and a 5 only a 5 (engine rule `legal.ts:51-52`; Rules screen reads "Defend Pick Two with a 2" and "Defend Pick Three with a 5").
- Actual: en "...unless they answer with another 2 or 5"; pcm "...except e answer with another 2 or 5".
- Files: `games/naija-whot/src/i18n/en.json:7` (`game.howto.4`), `src/i18n/pcm.json` `game.howto.4.text`.
- Fix: rewrite the step in both locales (for example "...unless they answer with another 2 (or another 5 for a Pick Three)"), then re-flag the Pidgin line for review.

**W-03 (major): persona play styles are not implemented at Easy or Medium, and the Hard hoarder does not hoard**
- Steps: Run the same states (seeded, 4,038 decisions) through `brainsFor(style)[difficulty]` for balanced, cautious, aggressive and hoarder.
- Expected: GAMES.md section 1 gives each CPU a personality (cautious, aggressive, hoards Whot). Brief section 8: Mama Nkechi avoids leading with 2, 5, 14 and keeps a Whot back; Tari attacks with 2, 5, 14, 8 early and calls the shape the player just played; Aisha keeps every Whot 20 until she has 3 or fewer cards.
- Actual: Medium lead-with-2/5/14 rate 73.8% for all four styles; Easy 32.9% for all four. Hard hoarder plays a Whot while another card fits in 1.2% of turns, versus 0.6% balanced and 0.3% cautious (the opposite of "hoards"). The style only tilts announce and catch rates by plus or minus 5 points (`brains.ts:27-35`); `easyBrain` (`brains.ts:76`) and `sensible` (`brains.ts:99`) take no style; Medium calls `bestShape(rest)` (`brains.ts:127`), not the shape the player just played.
- Fix: give Easy and Medium a style input for lead choice and implement Tari's call rule and Aisha's Whot hold; add a test asserting that styles produce different decision rates.

**W-04 (major): a soak round stalled for about 15.7 minutes (run 1), not reproduced**
- Steps: `npm run e2e:soak -- naija-whot` (run 1). Heap and counters were fine until the stall.
- Expected: each realtime round ends within seconds (rounds fast-forward after 14 live steps: `play.ts:354-356`, `fastForward` at `play.ts:371-391`).
- Actual: 125 rounds, then one `autoplay` promise did not resolve for about 15.7 minutes; the test hit its 780 s timeout and the page later showed a normal "You win!" screen. Run 2 passed with 151 rounds. A 6-minute debug loop at the same settings (102 rounds, 4x CPU) had a maximum round of 4.7 s. Cause unknown.
- Files to check: `play.ts:348-368` (`run`: a round can exit without `onEnd` when `flow.dead` or `!isOver`), `play.ts:371-391` (`fastForward`: the 20000-step guard), and the flow gate and pause (`board-kit/flow.ts`, auto-pause on hidden).
- Fix: instrument `autoplay` round completion, reproduce with a longer run, and add a guard that resolves or rejects after a bounded time.

**W-05 (major): `npm run test:cov` is red on this machine**
- Steps: `npm run test:cov` (run 1 and run 2, sequential, nothing else running).
- Expected: exit 0, as the lead's `npm run check` reports.
- Actual: run 1 exit 1 (7 failures, default 5 s timeouts, one unhandled RPC timeout); run 2 exit 1 (1 failure). Failing tests: `games/ayo-olopon/src/ai/ai.test.ts` (3), `games/snakes-ladders/src/ai/ai.test.ts` "evicts old entries instead of growing without bound" (16.7 s and 5.8 s), `games/naija-ludo/src/ai/ai.test.ts` (1), `packages/core/src/audio/instruments.test.ts` (1). No Whot test fails. Coverage summary not written when the run errors.
- Fix: raise the timeouts for the simulation and planner-cache tests, as the Whot and Ludo fixes did, or exclude coverage instrumentation from the slow suites; re-run until green twice in a row.

**W-06 (major): a snakes-ladders timing guard was weakened (branch commit b6d804a)**
- Steps: Read `games/snakes-ladders/src/ai/ai.test.ts` around lines 107 to 115.
- Expected: the planner solve stays inside the main-thread budget (the old assertion was `solve * 4 < 400`, that is a solve under about 100 ms, the 50 ms limit at 4x slower).
- Actual: replaced by `expect(a.sweeps).toBeLessThan(400)` and `expect(solve).toBeLessThan(10000)`. A 100x slowdown per solve now passes.
- Fix: keep a wall-clock guard for normal runs (skip it only when coverage is on, for example via `process.env.NODE_V8_COVERAGE`) and use a bound near the original budget; keep the sweep check as an extra.

**W-07 (minor): the 7-card fan overflows at 360 px**
- Steps: 360x640, play with a hand of 7 cards (after a pick penalty or catches).
- Expected: all 7 cards visible without scrolling, as the brief section 2 says ("7 cards x 46 px + 64 px = 340 px", "fan of 7 at 360 px verified").
- Actual: `.wh-fan` scrollWidth 356 vs clientWidth 344; the last card is clipped by about 12 px and the fan scrolls with no scroll cue. At 375 it fits exactly (359 vs 359). Tap targets stay at 46 px.
- Files: `games/naija-whot/src/style.css:441-449` (`.wh-fan` padding), `games/naija-whot/assets/whot-art.css:51-53` (`--whot-step: 46px`).
- Fix: a 44 px step below 380 px width (6 x 44 + 64 = 328 px fits 344), or less padding; add a 7-card layout test (the e2e tap test only covers 5 cards, `naija-whot.spec.ts:293-311`).

**W-08 (minor): results tile "Caught" is ambiguous**
- Steps: Win a game against CPUs that forgot to call; read the results screen.
- Expected: a label that says the player caught CPUs.
- Actual: "Caught" (value = CPUs the player caught; `play.ts:31`), which reads as "you were caught".
- Files: `games/naija-whot/src/i18n/en.json:44` (`results.catches`), `src/i18n/pcm.json:137`.
- Fix: "CPUs caught" (en) and an equivalent Pidgin line, flagged for review.

**W-09 (minor): review flags are incomplete**
- Steps: Read `pcm.json` banter lines and the brief section 8.
- Expected: brief flags `whot.banter.tari.suspension` as `_review`; every Igbo, Hausa or Yoruba word needs a native check (brief section 8).
- Actual: `tari.suspension` has no flag. Unflagged Pidgin banter: `mama-nkechi.play`, `mama-nkechi.holdOn`, `tari.pickTwo`, `tari.holdOn`, `tari.win` (brief leaves most of these unflagged, so only `tari.suspension` is a clear mismatch). `en.json:101` carries the Igbo "Ọ dị mma!" with no review marking, and the en file has no review mechanism at all.
- Fix: flag `tari.suspension`; add a review marker for the Igbo phrase in en.

**W-10 (minor): the game seed is exposed and fully determines every hand**
- Steps: Open devtools during a game; the portal receives the `start` event.
- Expected: CPU hands are not derivable by the player.
- Actual: `start` posts `{level, cpus, seed}` (`app.ts:147-151`). `seed = Date.now() & 0x7fffffff` (`app.ts:66`) and `createGame` shuffles the whole deck from it (`engine.ts:108-109`). Anyone with the seed (or a narrow timestamp window) can recompute every hidden hand. The DOM itself leaks nothing (checked live).
- Fix: seed from `crypto.getRandomValues`; do not send the seed to the portal (or send a hash); keep seeds for tests only.

**W-11 (minor): difficulty per persona deviates from the brief**
- Expected: brief section 8 table: Mama Nkechi Easy, Tari Medium, Aisha Hard.
- Actual: the player's chosen difficulty applies to every CPU (`personas.ts` header comment says so intentionally).
- Fix: decide which is intended and update the brief or the code (design decision; human review).

**W-12 (minor): weak or vacuous test assertions**
- `games/naija-whot/src/rules/engine.test.ts:277` (`expect(s).toBeTruthy()`: the position built there is never asserted) and `:535` (`expect(big).toBeTruthy()`, `big` is unused).
- The e2e tap-target test covers only a 5-card hand (`tests/e2e/naija-whot.spec.ts:293-311`), which is how W-07 escaped.
- Fix: replace with real assertions and add a 7-card case.

**W-13 (minor): dead code and test-only fields in production**
- `games/naija-whot/src/ai/knowledge.ts:94` (`topCardOf`, unused), `knowledge.ts:95` (`export { SHAPES }`, unused), `games/naija-whot/src/ai/index.ts:37` (`export { createRng }`, unused).
- `games/snakes-ladders/src/ai/planner.ts:28-29, 51-53, 116`: the `sweeps` counter is test-only instrumentation in the production interface. The solve is unchanged (diff: +5 lines, a local counter), so behaviour is unchanged (checked; production-safe).
- Fix: remove the unused exports; keep `sweeps` if desired, but mark it as test-only in the type.

**W-14 (minor): file length**
- `games/naija-whot/src/rules/engine.test.ts` 709 lines (split by rule group), `src/style.css` 642 lines, `src/view/play.ts` 409 lines. No dead logic found in these beyond W-12 and W-13.

## Needs human review

**Rules variants**
- Confirm the Lagos house-rule defaults: stackTwo and defendFive on, whotOnPending off, finishOnSpecial on, marketAgain on, lastCard on, semiLast off, marketEnds off.
- Stacked penalties can reach 15 cards in one game (observed in simulation). Decide whether a stack cap is wanted.
- The 600-action cap (W-01) must be replaced or made visible before the rules can be signed off.
- Last-card forgetfulness (judged fair and visible: the Catch button appears for an exposed CPU, the human has the same catch right, and the Hard CPU catches the human 95% of the time with the Last card button highlighted). Not explained in text; about 6 points of the Hard-vs-Easy margin come from it. Recommend a short cue ("X forgot to call: tap Catch").

**Pidgin lines (`_review` in pcm.json, 84 keys)**
- UI (60): `game.tagline`, `game.howto.1` to `game.howto.6`, `menu.opponents`, `legend.whot`, `rules.note`, `rules.{stackTwo,defendFive,whotOnPending,finishOnSpecial,marketAgain,lastCard,semiLast,marketEnds,autoDraw,fastPlay}` (each with `.help`), `results.cardsLeft`, `results.catches`, `whot.seat.cards`, `whot.market`, `whot.pick.title`, `whot.called`, `whot.called.by`, `whot.called.you`, `whot.played`, `whot.played.you`, `whot.hold`, `whot.hold.you`, `whot.defend`, `whot.suspend`, `whot.market.open`, `whot.took`, `whot.took.you`, `whot.drew`, `whot.drew.you`, `whot.reshuffle`, `whot.caught`, `whot.catch.status`, `whot.noFit`, `whot.mustPlay`, `whot.confirm`, `whot.pending`, `whot.mustDraw`, `whot.yourTurn`, `whot.nudge`, `whot.cpuTurn`.
- Banter (24): `whot.banter.mama-nkechi.{pickTwo,gotPickTwo,market,suspension,whotCall,lastCard,win,lose}`, `whot.banter.tari.{play,gotPickTwo,market,whotCall,lastCard,lose}`, `whot.banter.aisha.{play,pickTwo,gotPickTwo,market,suspension,holdOn,whotCall,lastCard,win,lose}`.
- Unflagged (W-09): `whot.banter.mama-nkechi.play`, `mama-nkechi.holdOn`, `tari.pickTwo`, `tari.suspension`, `tari.holdOn`, `tari.win`.
- Words to check natively: "Ọ dị mma!" (Igbo, diacritics correct), "Madalla" and "Haba" (Hausa), "Omo" (Yoruba-origin slang; confirm spelling and whether it should be "ọmọ"), "Oya" (Pidgin).
- Mama Nkechi's food-and-market framing ("Nobody go hungry for here", "Everybody pick one") plus the "mama" coach role: confirm it reads as warm, not as a stereotype.

**Art placeholders and missing media**
- Music: the in-game loops are a synthesized stand-in (ekwe, shekere, agogo, no guitar). The brief asks for composed highlife guitar loops; the two mp3 files are 834-byte silent placeholders that the build does not ship.
- Voice: 8 `vo-wh-*.mp3` silent placeholders, not wired to any event (the brief's lines for game start, Whot call, last card forgotten, defend, market empty, safe, close, win are not played).
- Avatars: shared placeholder portraits from `packages/core/assets/avatars`.
- Thumbnails: SVG placeholders; `.webp` export needed.
- Card art: original by construction, but a human illustrator should confirm no resemblance to a commercial Whot deck (brief section 9).

**Cultural review**
- Visual world, SFX and copy mostly follow the guide. Check the ankara-style cloth tile is not a copy of a real print and the card backs read as aso-oke and akwete, not kente.
- Regional mix for Whot: Igbo (Mama Nkechi), Ijaw (Tari), Hausa (Aisha), with Yoruba textiles and words; balanced. Catalogue level: Edo, Middle Belt and Efik/Ibibio remain absent (brief section 10).
- Persona difficulty (W-11) and play-style gaps (W-03) are design decisions for the team.

**Real device (not possible here)**
- Test on 3 low or mid Android phones (Tecno, Infinix, Itel or Samsung A-series): the 7-card fan at 360 px (W-07), tap feel of the flick, the Catch button, audio start after the first gesture, thermal throttling on a 10-minute session, and the actual human game length (estimate in item 4f).
- Telco content: confirm playing-card content is acceptable (HUMAN_ASSETS item 11, referenced in the brief).
