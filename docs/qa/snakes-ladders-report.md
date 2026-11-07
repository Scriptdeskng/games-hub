# QA report: snakes-ladders (2026-11-07, commit b1a541b)

Verdict: **FAIL** (0 blockers, 3 majors, 10 minors; all automated gates pass)

## Summary
- Every automated gate is green: lint, typecheck, i18n, 267 unit tests (30 files), coverage (`src/rules` 100% statements and lines, 99.05% branches), prod build with prod-gate, size (game 112.6 KB gz, core 27.9 KB gz), e2e 32/32 (mobile), e2e:extra 32/32 (landscape and desktop), e2e:perf, 3-minute soak and 10-minute soak. The rules, AI and single-player design hold up under independent probes (Hard beats Easy 71.5% on a fresh seed range).
- Three majors block the verdict: the landscape results screen hides stat tiles behind the sticky action bar (en and pcm); the Pidgin spent re-roll button runs 4 px past a 360 px viewport in the two-dice pick state; a playthrough inside the portal iframe logs 5 permissions-policy console errors against a zero-error budget.
- The portal allow-list is still open (D14, confirmed: a crafted `?portal=https://evil.example` link sends the Bearer token there), the token reaches same-origin Referer headers, and 10 minors cover unused shipped assets, Pidgin naturalness, a "New record!" banner on lost games, and test gaps. Fix the majors, then re-run e2e:extra and the portal probe.

## Results table

| # | Item | Status | Evidence |
|---|---|---|---|
| 1a | `npm run lint` (eslint + prettier) | PASS | exit 0, "All matched files use Prettier code style!" |
| 1b | `npm run typecheck` | PASS | `tsc --noEmit` clean |
| 1c | `npm run i18n:check` | PASS | "i18n check OK"; 35 `_review` lines (27 snakes-ladders/pcm, 8 core and _template), listed under Needs human review |
| 1d | `npm test -- --coverage` | PASS | 30 files, 267 tests passed. All files 99.73% stmts. `games/snakes-ladders/src/rules`: 100% stmts, 99.05% branches, 100% funcs, 100% lines (threshold 90) |
| 1e | `npm run build` (prod-gate) | PASS | "prod-gate OK: 13 files scanned, no test hook or autoplay code in dist/". My grep of `dist/snakes-ladders` for `__naijaTest`, `autoplay`, `setBot` returned nothing. Production bundle smoke (real taps, no hook): 26 rolls to the results screen, `window.__naijaTest` undefined, 0 console or page errors |
| 1f | `npm run size` | PASS | snakes-ladders game 112.6 KB gz (105.4 br) of 3072 KB; core 27.9 KB gz of 60 KB. Matches the developer's claim exactly |
| 1g | `npm run e2e -- snakes-ladders` | PASS | 32 passed (375x812, 360x640), 2.6 min |
| 1h | `npm run e2e:extra -- snakes-ladders` | PASS | 32 passed (812x375 landscape, 1280x800 desktop). The layout test passes, but it misses SL-01 and SL-02 (see defects) |
| 1i | `npm run e2e:perf -- snakes-ladders` | PASS | 4x CPU + Fast 3G: time to menu 1475 ms (budget 4000); fps avg 59.9, min 59 (1 s window), worst frame 33.4 ms; heap after run 2.15 MB. The core `perf()` hook reports avgFps 0 (see WARN in item 6) |
| 1j | soak 3 min (`SOAK_MINUTES=3 e2e:soak`) | PASS | 28 rounds. Heap 0.1 min 2.09 MB, 1.0 min 2.35, 2.1 min 2.43, 3.0 min 2.44. Steady slope 38.9 KB/min (limit 100). Counters flat |
| 1k | soak 10 min (`SOAK_MINUTES=10`) | PASS | 86 rounds. Heap 1.0 min 2.35 MB, 5.0 min 2.45, 10.0 min 2.47 MB. Steady slope 3.2 KB/min (limit 100), plateau from about 2.5 min. Counters flat over all rounds |
| 2 | Rules vs GAMES.md section 4 | PASS | See rules table below. Every rule and toggle has a test. I ran 27 probes (tmp/qa, deleted). Four initial failures were my own expectation errors (checked against the code), not game defects |
| 3 | AI: Hard vs Easy, Medium, legality, dice | PASS | See AI table below. Hard vs Easy 71.5% (Wilson 95% lower bound 69.4%) with exact-roll ON; 71.4% with exact-roll OFF. Threshold 55%. Zero illegal moves (`apply` throws on any illegal action; no throw in about 19,000 seeded games across these probes, plus the 100-game legality tests in ai.test.ts) |
| 4 | Single-player: one human seat, no pass-and-play | PASS | `createTurns` takes one `human` object and a non-empty tuple of CPU seats (`board-kit/turns.ts:23-25`). Grep for pass-and-play, hide-hand, hot-seat, multiplayer, local 2-player, invite, online, player count: no hits in game or kit code. "Opponents 1 2 3" (`screens.ts:45-53`) selects CPU count only |
| 4b | Gambling and real money | PASS | Grep for bet, wager, prize, cash, naira, money, reward, buy, purchase, stake, loot, jackpot, slot: no hits in game source. Score is points only (`rules/progress.ts:55-58`) |
| 5 | Playthrough, 375x812 / 360x640 / 812x375 / 1280x800 | FAIL | Menu, rules, how-to, 1-CPU play, two-dice pick, re-roll, pause, results, replay all work by real taps, mouse and keys. Screens captured: menu, rules, how-to, play start, decision, two-dice pick, caption, pause, results (win and loss, 3 CPUs) x 4 viewports x 2 languages. Layout: landscape results (SL-01) and pcm re-roll at 360 (SL-02) fail. No horizontal overflow and no clipped text found elsewhere (DOM metrics on every capture). 3-CPU play is covered by the e2e spec and a 3-CPU results capture; I did not inspect a 3-CPU mid-game screenshot |
| 5b | Tap targets >= 44 px | PASS | Every button, switch, segmented option and link measured >= 44 px. Only the visually hidden native radio `<input>`s measure 1x1 (by design; the labels are the targets) |
| 5c | Contrast | PASS (WARN) | Play screen: status 16.8:1, caption 15.4:1, board numbers 15.4:1, Re-roll (accent) 5.0:1, Move 10.4:1. Spent re-roll is 60% opacity (`style.css:419-421`), about 3.5:1 effective (SL-09) |
| 5d | Keyboard and mouse | PASS | Space/Enter roll and move, 1/2 pick, R re-roll, P and Esc pause and resume, all verified in the browser. Pressing R with no re-roll left is a no-op (the decision prompt only exists while a re-roll is available, `engine.ts` `afterValue`), so no crash path |
| 6 | Performance (4x CPU + Fast 3G) | PASS (WARN) | Time to menu 1475 ms, fps avg 59.9, min 59. Core perf hook reports 0 fps because the game has no RAF loop (WARN, known gap). Full-game duration: see section "Game length" below |
| 6b | Hard planner worst-case time | PASS (WARN) | Solved on the main thread at the first Hard decision of each game (`ai/brains.ts:70`, `ai/planner.ts:49`). Native: 15 ms default (choiceEvery 5), 69 ms worst (choiceEvery 20), 2.5 ms without the two-dice rule. A 4x throttle gives roughly 60 to 280 ms, once per game (SL-13) |
| 7 | Robustness | PASS | Probed on the built test bundle (dist-e2e) by real taps and by RNG-draw counting (`rng` state advances by one mulberry32 step per die). Results: double-click and double-tap on Roll draw exactly one die; double-click on Move advances exactly one turn; pause freezes the game for 2 s and the dialog toggles correctly with P/Esc; a hidden tab (`visibilitychange`) pauses and stays paused on show; resize to 812x375 and back keeps the screen and pawns, no horizontal overflow; going offline after load keeps the turn playable (service worker); 5 replays through Play again: listeners 10, timers 2, rafs 0 on every results screen; e2e destroy mid-CPU-turn and from play: 0/0/0 |
| 7a | Production bundle (`dist/`, served separately) | PASS | Real taps through menu, Play, 26 rolls with pick and decision prompts, to the results screen; 0 errors; no test hook |
| 7b | Audio starts after first gesture | PASS | AudioContext constructions: 0 before the first user gesture, 1 after |
| 8 | i18n | PASS (WARN) | en/pcm key parity enforced by i18n:check. No hard-coded view strings (grep of view, app and main for quoted English and aria/title/alt/placeholder literals: no hits). The 16 dynamic caption keys `snakes.cap.<from>` exist in both locales. Pidgin naturalness notes under Defects (SL-07) and Needs human review |
| 9 | Portal event order | PASS | Mock portal (`npm run mock-portal -- --dist dist-e2e`): `ready > start > score (x18) > level_complete > end`, verdict "order OK". Second game (loss): `start > score... > end`, no `level_complete`. Quit from a running game emits `end` with `quit: true` (`app.ts` abandonRound) |
| 9b | Progress save and load | PASS | `naija:snakes-ladders:progress` in the game origin holds stats and rules only. API `GET /api/games/snakes-ladders/progress` returned the saved stats (plays 2, wins 1) with `Authorization: Bearer` |
| 9c | postMessage target | PASS | Single postMessage call site `packages/core/src/portal/index.ts:115` uses `p.portalOrigin`, never `*`. The mock portal receives only from the configured game origin |
| 9d | Token and MSISDN exposure | PASS (WARN) | Token never in storage keys or values, never in API URLs (Bearer header only), no 7+ digit run in any URL or key, no console logging in game source. WARN: the token is in the game document URL (`?token=`) and is sent as Referer on 18 same-origin subresource requests (SL-05) |
| 9e | Origin allow-list (D14) | FAIL (minor, open since Phase 0) | `?portal=https://evil.example&token=tok_probe_d14_secret` sent `GET https://evil.example/api/games/snakes-ladders/progress` with `Authorization: Bearer tok_probe_d14_secret` (SL-04) |
| 9f | Console errors in a portal playthrough | FAIL | 5 "Permissions policy violation: accelerometer is not allowed in this document" errors plus devicemotion warnings inside the mock-portal iframe. Top-level runs show 0 (SL-03) |
| 10 | Cultural authenticity | PASS (WARN) | Board: Lagos map tiles (danfo, ferry, market stalls, generator, suya, recharge stand, bread, football, canteen, NEPA pole, BRT stop, toll gate shape, bridge, keke), all original shapes; greyscale check keeps ladders (straight rails, up-arrow badge) and snakes (wavy line, down-arrow octagon) apart. No kente, kora, masks, shrine, sacred or political symbols. No stereotype or ethnic trope in copy (grep clean). Personas Tari (Ijaw, square pawn), Efe (Urhobo, triangle pawn), Aisha (Hausa, diamond pawn): banter is everyday and non-tropal. Per-game row: visual world delivered, SFX delivered, music synthesised only (WARN), personas and copy delivered. See Needs human review (Cultural review) for the review items |
| 10b | SFX mapping and durations | PASS (WARN) | Every game event maps to a named Nigerian instrument or everyday sound: talking drum, agogo, ekwe, udu, shekere, danfo horn, okada engine, keke put-put, engine stall, kakaki/goje fanfare, ogene. No generic blip or whoosh. Game interaction cues: longest 0.290 s (`ladderBrt`, `ladderOkada`, `snakeGoslow`, `snakeToll`). Core `win` 1.43 s (limit 1.5). Peak levels: not measured with the real Web Audio engine (no offline harness); core master limiter is a compressor at -6 dB threshold, ratio 20 (WARN) |
| 11 | Content and compliance | PASS (WARN) | No gambling, gore or real brands. "BRT", "NEPA", "danfo", "okada", "keke" are generic words; the bus and toll art has no livery or logo. CREDITS.md covers every file in `assets/` (board, pawns, dice, icons, thumbs, audio, voice manifest). Unused shipped assets: SL-06 |
| 12 | Code health | PASS (WARN) | No `any`, no `@ts-ignore` or `@ts-expect-error` in game or kit source. Largest source file `view/play.ts` 392 lines. `ai.test.ts` 333, `engine.test.ts` 421 (tests). `scripts/gen-snakes-ladders-art.mjs` 527 lines (generator). Dead exports and duplicated layout table: SL-12. Art regeneration: see 12b |
| 12b | Art regeneration (`scripts/gen-snakes-ladders-art.mjs`) | PASS | Regenerated into a scratch copy and rasterised at 512 px against the committed SVGs in Chromium. 13 of 21 files are pixel-identical. Two sprites (`landmarks.svg`, `connectors.svg`) have no intrinsic size and could not be compared this way. The other six differ only at anti-aliasing level from svgo: `board-bg` 9% of pixels differ, but only 3 exceed a channel delta of 40; `overlay-default` 0.5% (44 px over 40); `hands-cup` 4% (8 px over 40); `die-roll` 1.7% (0 px over 40); thumbs 0.2 to 0.3%. Shapes are the same. Sprites were checked in the board screenshots instead |
| 12c | Test integrity (`core/foundation..HEAD`) | PASS | No existing test deleted or weakened. Test diffs are additions, plus `tests/e2e/helpers.ts`: `layoutProblems` gained an opt-in `include` option, which checks more elements, not fewer. `eslint.config.js`, `vitest.config.ts` thresholds, `scripts/size-budget.mjs`, all `playwright*.config.ts`, `scripts/prod-gate.mjs`, `scripts/i18n-check.mjs`, `tsconfig.json`, `.prettierignore`: unchanged. Core change: `results.stars` in pcm became an un-flagged line ("{n} out of 3 stars") |
| 13 | Known gaps | see defects | Voice lines not wired (WARN). Hard planner on the main thread (SL-13). perf() 0 fps (WARN). D14 open (SL-04). Real-device test not done (human) |

### Rules table (item 2)

| Rule or toggle (GAMES.md 4) | Test that asserts it | Probe result |
|---|---|---|
| 10x10 boustrophedon numbering; 100 top-left | `board.test.ts` "numbers rows left to right then right to left"; "consecutive squares are neighbours" | squareToCell(11)=row 1 col 9; (20)=col 0; 100 at row 9 col 0 (top-left); round trip for 1..100 |
| Exact-roll finish ON: overshoot stays put, turn passes | `engine.test.ts` "overshoot with the exact-roll rule"; `board.test.ts` "exact finish: exact roll wins, overshoot stays" | 95+6 stays at 95 (overshoot); 99+2 stays at 99; 99+1 wins; 98+2 wins; 98+1 lands on 99 with no jump |
| Exact-roll finish OFF: any roll past 100 wins | `engine.test.ts` "overshoot without the rule"; `board.test.ts` "without exact finish" | 95+6 wins; 98+6 wins on 100 (not 104) |
| Ladder foot climbs; snake head slides; ladder top and snake tail do nothing | `engine.test.ts` "landing on a ladder base climbs" / "snake head" / "top or tail does nothing" | 97+1 to 98 slides to 78 (snake-98); 75+1 to 76 climbs to 95 (ladder-76); 94+1 to 95 nothing; 72+6 to 78 nothing |
| Ladder that ends on 100 wins | `board.test.ts` "a ladder that ends on 100 wins" | no ladder ends on 100 (validator rejects starts outside 2..99 and ends outside 1..100) |
| Pawns share squares, no capture or block | none explicit (absence of code) | WARN: no test asserts it (SL-10) |
| Re-roll once per player per game, CPU too | `engine.test.ts` "is available only once per player"; "CPU players follow the same rule"; toggle test | after a re-roll `rerollLeft` is false for that player; with the rule off, `legalActions` offers accept only and a reroll action throws "illegal" |
| Re-roll keeps the new roll (no second re-roll) | `engine.test.ts` "re-rolling throws the roll away, takes a new one" | rolledFrom recorded, new value applied |
| Re-roll can rescue a snake | `engine.test.ts` "a re-roll can rescue a snake" | 87+1 would land on pothole head 88; re-roll applied: `rolledFrom` 1, the new value is the one kept |
| Re-roll does not consume or repeat the 5th-turn choice | none explicit (WARN, SL-10) | Turn 5 (taken=4): pick, then re-roll: exactly one turn completed (taken 4 to 5), CPU next, the re-roll is a single die. Turn 10 is also a choice turn |
| Two dice every 5th own turn; CPU the same | `engine.test.ts` "turns 1-4 roll one die, turn 5 offers two"; "the CPU gets the same two-dice turn" | taken=9 (10th turn) offers two dice; choiceEvery 3 offers on turns 3 and 6; choiceDice off never offers |
| After picking, re-roll still available | `engine.test.ts` "after picking, the re-roll can still be used" | re-roll offered after a pick, single die drawn |
| Win detection; no moves after a win | `engine.test.ts` "exact roll wins"; "winner is the CPU when it gets there first" | a won game returns no legal actions and throws on any action |
| Serialization round trip mid-game | `engine.test.ts` "state survives a JSON round trip mid-game" | mid-pick state: serialize, deserialize, same next state |
| Seed determinism | `engine.test.ts` "the same seed gives the same game"; "different seeds give different games" | seed 42 reproduces; seed 42 vs 43 diverge |
| Layout validity: no chains, no overlaps, every square reachable | `layout.test.ts` (16 tests) | Straight-line segment check of all 16 connectors: 0 crossings. No two end squares touch orthogonally. Validator does not check crossings or landmark clearance (documented only, SL-10) |
| 1, 2 and 3 CPU games all terminate | `engine.test.ts` "every game finishes within a sane number of turns" (exact on and off) | 150 seeds x exact on/off x 1, 2, 3 CPUs, mixed Easy/Medium/Hard: 0 unfinished |

### AI table (item 3)

Seats: seat 0 is the first named brain; the others play the second brain. Seeds 900000 onward, alternating who starts. Wilson 95% intervals. My simulation: `tmp/qa/ai-probe.test.ts`, deleted.

| Matchup | Exact ON (2000) | Exact OFF (2000) |
|---|---|---|
| Hard vs Easy | 71.5% [69.4, 73.4] | 71.4% [69.4, 73.3] |
| Medium vs Easy | 64.2% [62.1, 66.3] | 63.9% [61.8, 66.0] |
| Hard vs Medium | 57.8% [55.6, 59.9] | 56.4% [54.2, 58.6] |
| Easy vs Easy (fairness) | 50.2% [48.1, 52.4] | not run |

Other: Hard vs Easy with choice dice and re-roll both OFF (1000 games): 48.1% [45.0, 51.2]. With no decisions to make, Hard and Easy play identically, so difficulty has no effect in that variant (informational). One Hard vs three Easy CPUs: 45.0% [41.9, 48.1] (chance 25%). One Hard vs three Medium: 29.7% [26.9, 32.6]. Average winner turns: 1 CPU about 24.5 own turns, 3 CPUs about 20.8 own turns.

Ordering Hard > Medium > Easy holds with the lower bounds above 50% in both rule settings, and the Definition of Done threshold of 55% is cleared with margin.

AI code review:
- Every decision is `brain.decide(state, rng)` on public state. Easy and Medium's random choices and their 20% mistake roll use the CPU's own seeded RNG (`ai-kit/cpu.ts:28`), not the dice stream. Hard reads only the board, its own position, its own re-roll flag and dice already revealed in the pick phase.
- No brain reads `state.rng` or any future roll. Dice are drawn only by the engine. The dice are not rigged: `rollDie` is `1 + floor(next() * 6)` on mulberry32.
- The human's dice come from the same stream as the CPUs' dice, so the same seed gives the human different rolls under different CPU difficulties. The distribution is still uniform and independent, so this is not rigging (informational).
- Medium's 20% slip (`PROFILES.medium.mistakeRate`, `ai/brains.ts:55-63`): judged legitimate difficulty design. It is seeded, documented, and leaves Medium clearly above Easy and below Hard. Not a defect.
- Hard's planner is exact for its objective (expected own turns). Pawns never interact, so this is the right objective for the CPU's own moves. The pick decision also holds with a re-roll available, because the choice is between kept values and the re-roll value is shared.

### Game length (item 6)

Measured by driving the real controls (taps for Roll, Move and dice choice) at normal speed (tempo 1, no test speed-ups), with a 1.5 s reaction before each human action and the CPU's own thinking delays. Both runs are on the test bundle, one game each.

| Setup | Human actions | Wall-clock to results | Notes |
|---|---|---|---|
| 1 CPU (Medium), seed 101 | 33 | 1.77 min | Expected about 49 total turns (sim) |
| 3 CPUs (Medium), seed 202 | 55 | 5.25 min | Expected about 83 total turns (sim, exact ON). 0 errors |

The developer's estimate (4 to 5 minutes for 1 CPU, about 8 minutes for 3 CPUs) is higher than this measurement. Adding 1.0 to 1.5 s per human action (a slower real player) gives about 2.3 to 2.6 min for 1 CPU and 6.2 to 6.6 min for 3 CPUs. Judgement: 1 CPU is acceptable for a casual portal game. 3 CPUs at 6 to 7 minutes is a long session for a casual game and is borderline. Shortening options if the portal wants a snappier game: cut the 840 ms dice shake and tumble to about 500 ms, shorten the CPU think range (400 to 1200 ms) to 300 to 800 ms, shorten the 550 ms CPU re-roll decision pause (`view/play.ts` decideStep) to about 300 ms, and offer exact-roll OFF as the default for the 3-CPU table (the sim shows about 15% fewer total turns).

## Defects

| ID | Severity | Steps to reproduce | Expected | Actual | File:line |
|---|---|---|---|---|---|
| SL-01 | major | Open the game at 812x375 (landscape). Menu, Play, then play to the end (or `__naijaTest.autoplay({win:true})`) and look at the results screen at its default scroll position. Repeat in pcm | The stat tiles (Score, Best, Your turns, Wins, Win streak) are fully visible above the action buttons, or the actions sit beside them | The sticky `.ng-sticky-actions` block is an opaque panel from about x 236 to 575 CSS px that covers the lower part of the tiles. "YOUR BEST", "YOUR TURNS" and "WINS" labels and the "850", "30", "1/1" values are hidden at first view (screenshots `tmp/qa/shots/land812x375-en-results-win.png`, `...-pcm-results-lose-3cpu.png`). Only a scroll reveals them | `packages/core/src/ui-kit/ui-kit.css:99-114` (`.ng-sticky-actions`, `.ng-results__actions`); the landscape block at `ui-kit.css:156-170` only tightens gaps. The results screen is built in `games/snakes-ladders/src/view/screens.ts:createResultsScreen` |
| SL-02 | major | 360x640, pcm. Play until the two-dice pick turn (turn 5) after the re-roll has been used. The pick banner and the two dice show | The Re-roll button (`Roll again don finish`) sits fully inside the 360 px viewport | Button right edge at 364 px (4 px past the viewport; rounded edge cut). It fits at 375 px. The e2e layout test does not catch it because it does not check this state in pcm | `games/snakes-ladders/src/style.css:400-410` (`.sl-actions`, `.sl-actions .ng-btn { white-space: nowrap }`), `games/snakes-ladders/src/i18n/pcm.json:50` (`play.rerollUsed`). Add a pick-state, re-roll-spent case to `tests/e2e/snakes-ladders.spec.ts` layout test |
| SL-03 | major | Load `tools/mock-portal.html` (`npm run mock-portal -- --dist dist-e2e`), load the game, play a full game in the iframe, read the browser console | 0 console errors (CLAUDE.md budget) | 5 `Permissions policy violation: accelerometer is not allowed in this document` errors and 5 `devicemotion events are blocked` warnings. The game registers a `devicemotion` listener without checking the feature policy. A real portal iframe without `allow="accelerometer"` will show the same | `packages/core/src/board-kit/shake.ts:86` (`scope.on(window, 'devicemotion', ...)`, no `document.featurePolicy` check). Also `tools/mock-portal.html:108` (iframe without an `allow` attribute). Fix: check `document.featurePolicy?.allowsFeature?.('accelerometer')` before attaching, and document `allow="accelerometer"` for the portal iframe |
| SL-04 | minor (open since Phase 0; should be fixed before release) | Open `https://<game>/snakes-ladders/?token=tok_x&portal=https://evil.example&lang=en` with a route to evil.example | No request to the attacker's origin, token stays local | `GET https://evil.example/api/games/snakes-ladders/progress` with `Authorization: Bearer tok_probe_d14_secret` | `games/snakes-ladders/src/main.ts:15` (`boot({ slug, root, locales })`). Pass `allowedPortalOrigins: ['https://m.gamesplash.com.ng', 'https://*.gamesplash.com.ng']` (the README already shows it) |
| SL-05 | minor | Play any game through the portal with a token; inspect Referer on the game's subresource requests | No token in Referer; the token appears only where the portal contract requires it | The document URL with `?token=` is the Referer of 18 same-origin subresource requests in one playthrough. Any host access log that records the document URL or Referer stores the token | `games/snakes-ladders/index.html` (no referrer policy). Add `<meta name="referrer" content="no-referrer">` (the game's fetches to the portal are cross-origin and do not need a Referer). The document-URL logging is a portal-contract question (see human review) |
| SL-06 | minor | Build, then list `dist/snakes-ladders` | Every shipped file is used at runtime or documented as a portal asset | Unused at runtime: `assets/board/overlay-default.svg` (14.6 KB raw), `assets/thumb/thumb-512x512.svg` and `thumb-1024x500.svg` (12.3 KB raw), `assets/audio/music/snakes-menu-fuji.mp3` and `snakes-play-fuji.mp3` (9.8 KB raw; `cues.ts` synthesises the music instead), eight `assets/audio/voice/vo-sl-*.mp3` (6.4 KB raw; no voice player). About 43 KB raw, about 5 KB gz. `assets/board/overlay-default.svg` is documented as unused in the README | `games/snakes-ladders/assets/` (the files); `games/snakes-ladders/src/audio/cues.ts` (music), `src/view/play.ts` (no voice). Either load them or exclude them from the game build, and fix the README statement that the mp3s "stand in" for the music |
| SL-07 | minor | Read the pcm strings (list below) | Natural Pidgin, idiomatic | English-leaning or ungrammatical lines (suggestions below) | `games/snakes-ladders/src/i18n/pcm.json` lines 52, 77, 82, 95, 109, 155, 160, plus `game.howto.5` at line 20 |
| SL-08 | minor | Lose a game (for example Hard CPU wins), read the results screen | No "New record!" on a loss unless the score is a record for a win | The results banner shows "E NEARLY BE! TRY AGAIN!" and "New record!" together. `newBest` is score-based and is shown whether or not the human won | `games/snakes-ladders/src/app.ts:172` and `:192`; `games/snakes-ladders/src/rules/progress.ts:68` (`newBest = score > p.best[...]`). Fix: `newBest: won && newBest` |
| SL-09 | minor | Reach a two-dice pick with the re-roll spent | The spent state is readable | `.sl-reroll.is-used { opacity: 0.6 }` makes white text on red about 3.5:1 (inactive control, so WCAG 4.5 does not strictly apply, but "Roll again don finish" is hard to read) | `games/snakes-ladders/src/style.css:419-421`. Use a grey fill with dark text, or a slash icon plus full-contrast label |
| SL-10 | minor (test gaps) | Read the rules tests | Each rule and the 5th-turn cycle has an explicit assertion. Layout docs match the validator | (a) no test that a re-roll on turn 4 or 5 leaves the choice cycle intact (probe passes); (b) no test that pawns share a square with no capture; (c) the brief (section 3) says "0 crossings" and "no two end squares touch", verified by a one-off script; the `layout.ts` validator does not check crossings, adjacent end squares or landmark clearance, so a future layout edit is not caught by the game; (d) the e2e layout test missed SL-02 | `games/snakes-ladders/src/rules/engine.test.ts`; `src/rules/layout.ts:36-95`; `tests/e2e/snakes-ladders.spec.ts:400-495` |
| SL-11 | minor (visual) | Start a game at 360x640, look at square 1 before the first move | Pawns read clearly as pawns | Both pawns sit on square 1 over the bus-stop start landmark, so the human circle reads like a target icon and the Efe triangle reads like a road-hazard sign. Pawn size 0.5 cell at 360 px is small | `games/snakes-ladders/src/view/board.ts:setPositions` (pawns at square 0 are drawn at square 1); `assets/pawns/pawn-efe.svg`. Consider an off-board tray for square 0, or a larger, labelled pawn halo |
| SL-12 | minor (code health) | Grep exports and layout copies | No dead exports; one source of truth for the layout | Exports used only by tests or not at all: `dieOutcomes`, `humanSeat`, `isHumanTurn`, `seatById` (`engine.ts`), `cellToSquare` (`board.ts`), `isDifficulty` (ai-kit). `LAYOUT` is duplicated in `scripts/gen-snakes-ladders-art.mjs:37-54` and `src/rules/layout.ts` (`LAYOUT_DATA`) | `packages/core/src/board-kit/dice.ts:46` (dieOutcomes), `turns.ts:66` (humanSeat), `packages/core/src/ai-kit/types.ts:46` (isDifficulty), `games/snakes-ladders/src/rules/board.ts:21` (cellToSquare), `engine.ts:118` (seatById); the duplicated table in the generator. Import the table into the generator or delete the unused exports |
| SL-13 | minor (performance, judgement) | Start a Hard game in Chromium with 4x CPU throttle | First Hard decision is not a visible hitch | Planner solve is synchronous on the main thread, once per game, not cached across games: about 15 ms native, 69 ms worst (choiceEvery 20), roughly 4x that under throttling | `games/snakes-ladders/src/ai/brains.ts:70` (`cache.planner ??=`), `src/ai/planner.ts:49` (6000 iterations). Cache the planner per layout and rules, or move it into a worker |

Pidgin suggestions for SL-07 (keys in `pcm.json`; `_review` lines still need a native speaker):
- `snakes.cap.8`: "Okada carry you! You pass the traffic." → "Okada go carry you! You pass di traffic."
- `snakes.cap.22`: "Keke carry you pass the back road." → "Keke go carry you pass di back road."
- `snakes.cap.64`: "Okada dey follow gap pass jam. Hold body!" → "Okada dey squeeze pass di jam. Hold body!"
- `snakes.cap.80`: "Go-slow for the junction. Calm down, e go clear." → "Go-slow for di junction. Calm down, e go clear."
- `snakes.banter.efe.lose`: "You win the road today! Who wan hear song?" → "You don win di road today! Who wan hear song?"
- `snakes.banter.aisha.snake`: "Haba! That one no lucky." → "Haba! Dat one no lucky."
- `game.howto.5`: "Tap one dice" → "Tap one of di dice".
- `play.pick` (line 52): "Pick one dice: tap am, or press 1 or 2." → "Pick di one wey you want: tap am, or press 1 or 2." (core `dice.pick` "Pick one dice" has the same issue)
- `persona.aisha.1`: "You ready for challenge?" → "You ready for wahala?" (or "You don ready for challenge?")
- `play.yourTurnTwo`, `persona.tari.2`, `persona.efe.3` read naturally enough; keep.

## Needs human review

### Cultural review
- **Aisha's dress and book (religious-marker balance).** Aisha's avatar (shared `packages/core/assets/avatars/aisha.svg`) wears a teal head wrap and holds a book. The Hausa-coded head wrap is the only religious-adjacent marker in the game, and Tari and Efe carry none. Judge whether the balance is intended (the round-2 core QA report already flagged Muslim-coded dress for the northern personas).
- **Regional balance.** The game is set in Lagos (allowed by the guide's exception), and the CPU personas are Ijaw (Tari), Urhobo (Efe) and Hausa (Aisha). There is no Yoruba or Igbo persona and no Yoruba or Igbo words beyond "Oya", "Omo", "Haba", "Madalla" and "Ehen", which are Pidgin usage or flagged. Lagos is a Yoruba-majority city, so a Yoruba persona would be the natural addition. Decide whether to rebalance.
- **Infrastructure jokes.** "NEPA took the light", "go-slow", "pothole" and "toll-gate queue" mock infrastructure, not people, which is the guide's test. A Lagos reviewer should confirm that "NEPA" (the former utility, widely used colloquially) and "BRT" are acceptable as generic words. No logos are used.
- **Synthesised instruments.** The `okadaRev`, `kekePutPut`, `engineStall` presets and the kakaki/goje fanfare are approximations. A Nigerian musician should check that they read as an okada, a keke, a stalled engine and a royal fanfare on a phone speaker (the asset brief asks for this).
- **Talking-drum semantics.** Rising pitch for ladders and falling for snakes is a design convention, not tonal meaning. Confirm it is not misleading.
- **Music.** The playing loops are synthesised percussion (`cues.ts`). The composed fuji-inspired loops in the brief are not delivered. The placeholders are unused (SL-06).
- **Pawn and landmark art.** Placeholder quality, original shapes (SL-11). A human illustrator should replace the hero art, the landmark set and the hands art (brief section 9).
- **Efe's jacket.** The yellow-and-black jacket on the Efe avatar echoes the danfo livery. It reads as a Lagos transport reference rather than a brand, but a reviewer should confirm.

### Pidgin and Yoruba/Igbo/Hausa words
- 27 `_review` lines in `snakes-ladders/pcm` (list from `npm run i18n:check`, see item 1c), plus the suggestions in SL-07.
- Words from Hausa: "Haba", "Madalla" (no diacritics needed; flagged `_review`). Yoruba-origin Pidgin: "Oya", "Omo", "Ehen" (no diacritics needed in common usage; "Omo" flagged). A native speaker should confirm the usage register. No Igbo words are used.

### Rules and game design
- Default toggles (exact finish on, re-roll on, two dice every 5th turn on) and the choice of 5th turn are a product decision. The measured Hard win rate of about 71% against Easy is the designed challenge.
- Medium's 20% slip is legitimate difficulty design (see AI section). Confirm the feel with a player.
- Game length (see section "Game length"): decide whether about 2.5 minutes for 1 CPU and about 6 to 7 minutes for 3 CPUs (at a realistic human pace) are acceptable for the portal's casual audience. Shortening options are listed there.
- The "New record!" banner on losses (SL-08) is a copy and logic decision once fixed.

### Portal and privacy
- The portal contract passes `?token=` in the page URL. That URL is logged by the static host's access log for the document request (not for the API). Decide whether the portal should use a fragment (`#token=`) or a postMessage handshake, and confirm that access logs on DO Spaces are retained only as needed. SL-05 covers the Referer half, which is fixable in the game.
- Confirm the portal API shape (GET 200 `{data: null}`, PUT 2xx) and the allowed `portal` origins (SL-04), and that the portal iframe is served with `allow="accelerometer"` if shake-to-roll is wanted (SL-03).

### Art, audio and platform
- Art placeholders: board background, landmarks, dice hands, pawns, thumbnails (SL-06 says thumbs are not runtime assets). Export the thumbnails to .webp for the portal (HUMAN_ASSETS).
- Silent placeholders: 2 music loops, 8 voice lines (no voice player is wired). Commission or license, and add creator, date and licence to CREDITS.md.
- Real-device test on a low-end Android (Tecno/Infinix/Itel, 2 to 3 GB RAM) and one iOS device for `devicemotion` permission. Not done in this round; required before release.
- Peak levels of the synth SFX on the real engine: not measured. Listen on a phone speaker and confirm nothing clips when two or three cues overlap.

### Other notes
- Core `perf()` reports 0 fps because the game has no RAF loop. The e2e fps numbers come from Playwright's frame sampler. Consider a core fps sampler that does not depend on the loop.
- Landscape results (SL-01) and the portrait Pidgin pick (SL-02) need a visual re-check after the fix on real hardware.

---

# Round 2 (2026-11-07, commit 02b77a7 on `game/snakes-ladders`, tree clean at HEAD)

Verdict: **PASS** (0 blockers, 0 majors; all gates green). Round 1 FAILED on SL-01, SL-02 and SL-03; all three are fixed and re-verified below. Remaining items are minors and human-review questions, listed at the end of this section.

## Summary
- Every gate is green, including the template e2e and e2e:extra that the portal and shared-code fixes touched. Numbers are higher than round 1: 279 unit tests (was 267), 42 mobile e2e (was 32), 42 landscape and desktop e2e (was 32), game 108.6 KB gz (was 112.6), core 28.5 KB gz (was 27.9). The coordinator's claimed numbers match exactly.
- Each of SL-01 to SL-13 was checked against the round 1 behaviour, not just the code. A side-by-side probe on the round 1 build (built from `git archive b1a541b` into tmp/qa) and the round 2 build gave: landscape tiles covered 3 to 0; spent pick button right edge 364 to 345 px; portal iframe console messages 5 to 0; token Referer on subresources 9 to 0; requests to a crafted `evil.example` portal 2 to 0. Six of the new e2e tests fail on the round 1 tree (see item 2).
- The remaining issues are minor: the art generator no longer reproduces the redrawn pawns, `ship.json` does not fail the build on unreferenced assets, pawns lost their shape distinction and still cover the square-1 landmark, plus unreachable test-API methods in the production bundle and a module-level planner memo. Cultural review items are listed at the end.

## Gates (re-run in round 2)

| Gate | Result | Numbers |
|---|---|---|
| lint (eslint + prettier) | PASS | exit 0 |
| typecheck | PASS | exit 0 |
| i18n:check | PASS | "i18n check OK"; 47 `_review` lines in total, 38 of them snakes-ladders/pcm |
| `npm test -- --coverage` | PASS | 30 files, 279 tests passed (was 267). All files 99.73% stmts. `games/snakes-ladders/src/rules`: 100% stmts, 99.11% branches, 100% funcs, 100% lines (threshold 90). `design.ts` and `layout.ts` 100% |
| build + prod-gate | PASS | "prod-gate OK: 12 files scanned, no test hook or autoplay code in dist/" |
| size | PASS | snakes-ladders game 108.6 KB gz (102.0 br) of 3072 KB; core 28.5 KB gz of 60 KB. Matches the claim |
| e2e snakes-ladders (375x812, 360x640) | PASS | 42 passed (was 32) |
| e2e:extra snakes-ladders (812x375, 1280x800) | PASS | 42 passed (was 32) |
| e2e:perf snakes-ladders | PASS | time to menu 1513 ms (budget 4000); fps avg 59.9, min 59; core `perf()` hook now reports avg 60, min 59 (round 1 reported 0, now fixed); heap 2.17 MB |
| e2e _template (375x812, 360x640) | PASS | 36 passed |
| e2e:extra _template (landscape, desktop) | PASS | 36 passed |
| soak 3 min | PASS | 33 rounds. Heap 0.1 min 2.11 MB, 1.0 min 2.42, 2.1 min 2.49, 3.0 min 2.48. Slope 24 KB/min (limit 100). Counters flat |

## Round 1 defects: fix verification

| ID | Status | Evidence |
|---|---|---|
| SL-01 landscape results hide tiles (major) | FIXED | Round 1 build: 3 stat tiles under the action bar. Round 2 build, 812x375, en and pcm, win and lose: 0 tiles covered, all five tiles and both actions visible at scroll top, no horizontal overflow. I read the screenshots `tmp/qa/r2/land-results-en-win.png` and `land-results-pcm-lose.png`: the banner and tiles sit side by side, the actions below them, nothing hidden. The new `stickyOverlaps` test was not run on the round 1 tree (the landscape project was not re-run there); the round 1 probe showed the overlap. Fix is the landscape grid in `ui-kit.css:168-206` |
| SL-02 pcm re-roll 4 px past 360 px (major) | FIXED | 360x640 pcm, two-dice pick, re-roll spent: button right edge 345 px (round 1: 364). Screenshot `tmp/qa/r2/pick-spent-360-pcm.png` read: "Re-roll don use" fits in the card, grey fill, dark text, slashed icon. The new test "play pick, re-roll spent" plus the spent-state contrast assertion fails on the round 1 tree. `.sl-actions` is now `flex-wrap: wrap` (`style.css:400-410`) |
| SL-03 five permissions-policy console errors in the portal iframe (major) | FIXED | Iframe with `allow="accelerometer; gyroscope"`: 0 console errors, order "ready > start > score... > level_complete > end, order OK". Iframe with the attribute removed (`?noallow=1`): 0 console errors, same event order. Round 1 build: 5 policy errors. `shake.ts` `motionAllowed()` attaches the `devicemotion` listener only when both sensors are allowed. Mock portal now sets the attribute by default (`tools/mock-portal.html:108-110`). Two new e2e tests (with and without the attribute) fail on the round 1 tree |
| SL-04 D14: crafted `?portal=` gets the token (minor) | FIXED | Round 2: `?portal=` values `https://evil.example`, `https://m.gamesplash.com.ng.evil.example`, `http://m.gamesplash.com.ng`, `https://localhost.evil.example`: 0 requests to any of them, 0 tokens sent. Round 1: 2 requests carrying `Bearer tok_probe_evil`. Default is now `DEFAULT_PORTAL_ORIGIN` only (`portal/index.ts:21`, `isAllowedOrigin` 36-58). See item 3 for the bypass audit |
| SL-05 token in Referer (minor) | FIXED | `<meta name="referrer" content="no-referrer">` in `index.html:11` (and in `_template`). Subresource requests in an iframe playthrough: round 1 9 of 12 carried `?token=` in Referer; round 2 0 of 12 (empty Referer). The document URL still contains the token by portal contract (see human review) |
| SL-06 unused assets shipped (minor) | FIXED | `assets/ship.json` include list. `dist/snakes-ladders/assets` now holds only: board-bg, connectors, landmarks; dice (9 SVGs: die-1 to die-6, die-roll, dice-pick-two, hands-cup); icons (2); pawns (5). Overlay, thumbs, music and voice placeholders are no longer shipped (round 1: about 43 KB raw). Verified by `find dist/snakes-ladders` |
| SL-07 Pidgin naturalness (minor) | FIXED | All 8 suggested fixes are applied in `pcm.json`: "Okada go carry you", "Keke go carry you", "squeeze pass di jam", "for di junction", "You don win di road today", "Dat one no lucky", "Tap one of di dice", "Pick di one wey you want". "Re-roll don use" and "You ready for wahala?" were also reworded. Remaining Pidgin notes are in the new round 2 review list below |
| SL-08 "New record!" on a loss (minor) | FIXED | Pcm loss and en loss: no record banner (`newRecord=false`). A win still shows "New best!" (en) or "New record!" (pcm). Round 1 showed "New record!" on the loss |
| SL-09 spent re-roll contrast (minor) | FIXED | `style.css:419-424`: opacity 1, grey fill `#c9c9cf`, text `#1d1d20`, computed contrast 10.2:1 (round 1: about 3.5:1 at 60% opacity) |
| SL-10 test gaps (minor) | MOSTLY FIXED | (a) re-roll on turn 4 and turn 5 now tested: `engine.test.ts:435` and `:448`; (b) pawns sharing a square tested: `engine.test.ts:473`; (c) layout checks added in `rules/design.ts` (6 to 10 entries, no crossings, no touching ends, gain/loss within 10%), run by `layout.test.ts:173-183`. Landmark clearance is still not checked |
| SL-11 pawns (minor) | NOT FIXED (new finding) | Pawns were redrawn (see item 5). Colour now distinguishes them, but the shape distinction the brief requires is gone, the four start pawns are hard to tell apart in greyscale, and they still sit over the square-1 bus-stop landmark. Filed again as SL-14 |
| SL-12 dead exports (minor) | FIXED | `dieOutcomes`, `humanSeat`, `isHumanTurn`, `seatById`, `cellToSquare`, `isDifficulty` removed. The generator now reads `src/rules/layout.json`, the same file as the game (`layout.ts:9`). Duplicate table gone |
| SL-13 planner on the main thread (minor) | FIXED (with a new minor) | `getPlanner` memoises per layout and rules (`ai/planner.ts:139`), and the menu warms Hard's planner (`app.ts:83`, `:92`). Test "is solved once per layout and rules and then shared (cached)" passes. The memo is a module-level `Map`, which CLAUDE.md forbids outside the game instance (SL-16) |
| Perf hook 0 fps (WARN, round 1) | FIXED | `corePerf` avg 60, min 59 in e2e:perf |
| Voice lines not wired (WARN) | NOT CHANGED | voice mp3 files are no longer shipped (SL-06). The voice player is still absent. Known gap, see human review |

## Round 2 new-test check on the round 1 tree
I copied the round 2 spec and helpers into `git archive b1a541b` (tmp/qa/old), built it, and ran the new layout, portal iframe, Referer, crafted-origin and perf tests on mobile 375x812. Results: 6 failed, 2 passed. The six failures: "layout on every screen [pcm]" (the spent-state overflow), "portal iframe with allow" and "portal iframe WITHOUT allow" (console noise), "token is never sent as a Referer", "crafted ?portal= origin", and "perf hook reports real frames". The two passes are the existing events and layout tests. So the new tests do discriminate the round 1 behaviour.

## Item 3: code audit

- **`motionAllowed()` (shake.ts:53-68).** Uses `permissionsPolicy`, falling back to `featurePolicy`. No policy API means allowed. Both accelerometer and gyroscope must be allowed, because either one being blocked logs an error. Behaviour: with motion allowed, six synthetic `devicemotion` jolts in a browser moved the human's turn from roll to decide (probe `tmp/qa/r2/shake.mjs`), so shake still works. Unit tests cover allowed, blocked (no listener attached), no devicemotion, and iOS-style permission grant and refusal (`shake.test.ts`, 8 tests). iOS `requestPermission` is still called from the first tap (`dice-view.ts`). I could not test a real iOS device.
- **Default portal origins (portal/index.ts:21, 36-58).** Bypasses checked by probe and reading: `https://m.gamesplash.com.ng.evil.example` rejected; userinfo `https://m.gamesplash.com.ng@evil.example` normalises to `evil.example` and is rejected; port tricks (`:8443` on the portal host) rejected, `:443` normalises to the same origin and is accepted, which is correct; http downgrade rejected; `localhost.evil.com` and `localhost.evil.example` rejected (hostname must equal `localhost`). Wildcard entries `https://*.domain` match only host suffixes with a leading dot. Minor (SL-17): the default also accepts `https://localhost:<any port>` and `https://127.0.0.1` in production builds. Risk is low (an attacker would need the victim's own machine), but dev-only origins should not ship in production.
- **`ship.json` and the build failure (vite-naija-plugin.ts:23-43, 105).** The plugin fails the build when the bundle references a literal `./assets/...` file that is not shipped. It does not fail on unreferenced shipped assets, so the behaviour described in the brief for this round ("build failure on unreferenced assets") is not implemented. Dynamic references (`pawn-${…}.svg`, `die-${n}.svg`) are not checked by the literal regex. Current includes cover every referenced family, so nothing is missing today. Minor (SL-15).
- **`design.ts` layout checks (design.ts, layout.test.ts:173-183).** Run by unit tests only, not by the game at load time. Shipped layout: 8 ladders, 8 snakes, no crossings, no touching ends, balanced. Probe in the unit test catches a crossing and touching ends. Not run at runtime, by design.
- **Test-build-only code in production.** The core loop and portal logging are behind `__NAIJA_TEST__` constants. prod-gate passes. Grep of `dist/snakes-ladders`: no `naijaTest`, `NAIJA_TEST`, `autoplay`, `setBot`, `fastForward`, `liveMoves`, `counters`, `tempo=`. One hit: `setSeed` appears in the shipped app object (`app.ts` return object, `getState`, `setSeed`, `screen`, `destroy` are not inside `__NAIJA_TEST__`). `window.__naijaTest` is undefined in the production smoke, so nothing is reachable from the page, but the methods ship. Minor (SL-16). prod-gate's literal list does not include `setSeed`, so it cannot catch this.
- **Funmi/Aisha rotation (ai/index.ts:19-23, progress.ts, app.ts:141).** Deterministic: the seat is `gameCounter % 2` (Funmi on even counts, Aisha on odd), and `games` increments on every `startRound`, so quits count. Stored as a plain number (`games`), sanitised to a non-negative integer. No token or phone number in it. Probe: first game with three CPUs seated Funmi, second game (after Quit) seated Aisha (HUD names read from the DOM, `tmp/qa/r2/pawns.mjs`).
- **`layout.json` shared by the generator.** Yes, the generator reads `games/snakes-ladders/src/rules/layout.json` (`gen-snakes-ladders-art.mjs:37`). Its output for the board, connectors, dice, icons and thumbs is pixel-identical to round 1 (same percentages: board-bg 9.01%, overlay 0.531%, die-roll 1.678%, hands-cup 3.972%, thumbs 0.2 to 0.3%; all anti-aliasing). The pawns do not regenerate (see SL-14). `pawn-funmi.svg` is not produced by the generator at all.
- **Planner cache (ai/planner.ts:139-158).** Key is `JSON.stringify` of layout and the four rule fields, so changing a rule gives a new planner (tested). Cache is capped at 16 entries and cleared when full. Module-level state (SL-16).

## Item 4: game length, real controls, tempo 1, one game each

| Setup | Human actions | Round 1 | Round 2 |
|---|---|---|---|
| 1 CPU (Medium), seed 101 | 33 | 1.77 min | 1.63 min |
| 3 CPUs (Medium), seed 202 | 55 | 5.25 min | 4.71 min |

The shorter dice tumble (360 to 210 ms, `board-kit.css`) accounts for most of the saving. Judgement: 1 CPU is fine for a casual portal game. 3 CPUs at about 4.7 minutes measured (about 6 to 7 minutes at a slower human pace) is still long but acceptable if the portal wants a longer session. Human review.

## Item 5: pawns, cultural recheck, Pidgin

- **Pawn SVGs.** `pawn-you`, `pawn-tari`, `pawn-efe`, `pawn-aisha`, `pawn-funmi` are now figure silhouettes (shoulders and head) with a detail each: You blue with a white figure mark, Tari teal with headphones, Efe red with a cap, Aisha plum with a head wrap, Funmi green with a hair bun. Colours are distinct (blue, teal, red, plum, green).
- **In-game at 360x640, 3 CPUs.** Game 1 seats Efe, Tari, Funmi; game 2 seats Efe, Tari, Aisha. Pawns are drawn as coloured figures with a white initial letter. All four start on square 1 in a 2x2 cluster that covers the bus-stop start landmark (`pawns-3cpu-game1-360.png`, `pawns-3cpu-game2-360.png`, read).
- **Greyscale (`pawns-3cpu-greyscale-360.png`, read).** The four figures look almost the same. Initials (Y, T, E, F) are about 4 px and not reliably readable. Shape and colour distinction fails in greyscale at this size. This is the brief's "pawns distinct by shape" requirement, now unmet (SL-14).
- **Funmi cultural recheck.** Funmi's avatar (`packages/core/assets/avatars/funmi.svg`, read): green top, hair bun, gold hoop earrings, a small white rectangle on the chest. No money symbol, no banker prop. The banter has no money or banking reference in en or pcm. Her lines are about not retreating and taking another road. Respectful. The white chest rectangle could read as a card; human review.
- **Efe's jacket.** Yellow body with a black stripe, music note icon (sings in banter). It echoes the danfo livery. I judge it a transport reference, not a brand or ethnic marker. Accepted; human review confirms.
- **Persona set.** Tari (Ijaw, headphones, student), Efe (Urhobo, danfo driver with music note), Aisha (Hausa, head wrap, red book), Funmi (Yoruba, bun, earrings, green top). Each has individual personality and everyday banter; none carries a group stereotype or a money trope. Regional balance is better (four regions) but still no Igbo or Middle Belt persona. Human review.
- **Pidgin lines changed this round (38 `_review` lines in snakes-ladders/pcm).** Naturalness judgement:
  - Natural: "Okada go carry you! You pass di traffic.", "Keke go carry you pass di back road.", "Okada dey squeeze pass di jam. Hold body!", "Go-slow for di junction. Calm down, e go clear.", "Re-roll don use", "Pick di one wey you want: tap am, or press 1 or 2.", "You ready for wahala? I don read the whole book.", "Ah ah, free ride! I no go complain.", "Pothole? I no dey retreat, I dey take another road.", "Abeg, roll again. I no fear.", "I no dey retreat. I no dey surrender.", "Hmm, you catch me! Well played." (acceptable).
  - Suggest changing: "Six! Come out, come out!" (snakes.banter.funmi.six, English idiom, not Pidgin) → "Six! E don come o!"; "Home sweet home! Smile na, na game only." → "Home sweet! Smile, na just game."; "Hmm, you catch me!" → "Hmm, you don catch me!"; "Dat one no lucky" (aisha.snake) is fine but "Haba!" is Hausa; keep for review.
  - Mixed English stays in: "Well played. Madalla!" (aisha.lose), "Okada shortcut, you no touch jam.", "Bridge clear, you fly pass!" are acceptable Pidgin-English.
  - Consistency: "Sabi na power, but speed na points" and "Sabi na power, but luck dey help too" repeat the same proverb in two personas. Fine, but a native speaker may want variety.

## Item 6: test integrity (`b1a541b..HEAD`)

- No lint rule, coverage threshold, size budget, or Playwright config changed (`eslint.config.js`, `vitest.config.ts` thresholds, `scripts/size-budget.mjs`, `playwright*.config.ts`, `scripts/prod-gate.mjs`, `scripts/i18n-check.mjs`, `tsconfig.json`, `.prettierignore`, `package.json`: no diff).
- Removed test assertions, all justified: `dieOutcomes`, `humanSeat`, `isHumanTurn`, `seatById`, `cellToSquare`, `isDifficulty` tests were deleted together with the dead functions. `pickPersonas(3, 3)[2] === 'aisha'` was replaced by an explicit counter test (`ai.test.ts:289`), which is stronger. The `shared` planner argument was removed from the Hard-vs-Easy turns test; the test still runs 400 games.
- AI thresholds unchanged: `GAMES = 2000`, `>= 0.55` Hard vs Easy (`ai.test.ts:239`), lower bounds `> 0.5` for Medium and Hard.
- Portal test assertions were tightened (the default list now rejects `http://` and any non-listed `https://` origin). Test strings `p.example` became the real portal host; no assertion was loosened.
- New e2e assertions strengthen the layout test (spent-state pick, `stickyOverlaps`, contrast), add the iframe policy tests, the Referer test, and the crafted-origin test. `helpers.ts` gained an opt-in `include` option (round 1) and the new `stickyOverlaps` and `contrastOf` helpers. Nothing removed.

## Item 7: git status
- Commits: none made by QA. Only file written: `docs/qa/snakes-ladders-report.md` (this section appended to round 1). `git status --short` after cleanup: `M docs/qa/snakes-ladders-report.md` (the appended round 2 section, uncommitted). Scratch `tmp/` deleted. No `git` state change (no add, commit, checkout, stash, worktree).

## Remaining defects (round 2)
- **Blocker:** none.
- **Major:** none.
- **Minor, new in round 2:**
  - SL-14 (pawn art, from SL-11): shape distinction lost; greyscale unreadable at 360 px; four start pawns cluster over the square-1 landmark. Fix: give each pawn a shape cue again (e.g. a distinct outline or base per persona), move the start cluster off the landmark or give square 0 an off-board tray.
  - SL-15 (build): `ship.json` has no check for unreferenced shipped assets, and dynamic `./assets/...` references are not verified. `scripts/vite-naija-plugin.ts:23-43, 105`. Fix: either fail on shipped-but-unreferenced files, or document the one-way check.
  - SL-16 (code health): module-level `solved` Map in `games/snakes-ladders/src/ai/planner.ts:139` (CLAUDE.md: no global state outside the game instance). Also `setSeed`, `getState`, `screen` ship in the production app object (`games/snakes-ladders/src/app.ts` return), unreachable but present. Fix: move the memo into the game instance, and gate the test-only methods with `__NAIJA_TEST__`.
  - SL-17 (portal default): production accepts `https://localhost:<any>` and `https://127.0.0.1` (`portal/index.ts:56-57`). Fix: allow loopback only when a dev flag is set, or only in test builds.
  - SL-18 (art pipeline): `scripts/gen-snakes-ladders-art.mjs:309-330` still writes the round 1 pawns (circle, square, triangle, diamond) and has no Funmi pawn. Running the generator would revert the redrawn pawns and drop Funmi's file from the output. Fix: move the pawn art into the generator or stop claiming it regenerates the pawns.
  - SL-10(c) partly open: landmark clearance is not checked by any test.
- **Carried minors:** voice player not wired (known gap). Peak levels of the synth SFX not measured on the real engine.

## Needs human review (round 2)
- Cultural: Aisha's head wrap and book (religious-marker balance); Funmi's chest tag (card-like); Efe's yellow-and-black jacket; no Igbo or Middle Belt persona; four persona regions are respectful and non-stereotyped.
- Pidgin: the 38 `_review` lines in snakes-ladders/pcm, plus my suggestions above ("Six! E don come o!", "Home sweet! Smile, na just game.", "Hmm, you don catch me!").
- Game length: 1.63 min (1 CPU) and 4.71 min (3 CPUs) at tempo 1 with a 1.5 s reaction per action. Decide whether the 3-CPU length is acceptable for a casual portal session.
- Pawns: colour and silhouette judgement on a phone screen and in greyscale (SL-14 unresolved).
- Portal: the token still appears in the page URL (contract). Decide hash or postMessage handoff. The Referer half is fixed.
- Real device: shake permission on iOS and the real portal iframe `allow` attribute, not tested here.
