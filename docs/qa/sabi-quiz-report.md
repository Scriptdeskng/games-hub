# QA report: sabi-quiz (2026-11-08, commit 1d91d77, round 2)
Verdict: FAIL

## Summary
- Round-1 D2 (duel e2e flake) is fixed: `-g "real duel"` passed 10 of 10 on the two mobile projects and 10 of 10 on landscape and desktop. The full `e2e` (58 passed, 2 skipped) and `e2e:extra` (59 passed, 1 skipped) pass. Lint, typecheck, 758 unit tests, build, size, perf (4x CPU + Fast 3G) and the 10-minute soak (run alone) all pass.
- Round-1 D1 is fixed for the saved record: the first Daily start is the only scored attempt, and Restart, Quit and re-entry are Practice. But a practice win now sends `level_complete` (and `score`) to the portal with no practice flag, which is a new major (D13). That alone fails the round.
- D3 to D8, D10 and D11 are fixed and verified. D9 (file length) and D12 (core Pidgin labels) are still open. D15 (copy after an abandoned first start) and D14 (lifeline labels clipped at 375x812 in English) are new minors, along with three other minors (D16 to D18). The 58 `uncertain` tags match the README list exactly.

## Results table

| # | Item | Status | Evidence |
|---|---|---|---|
| 1a | `npm run lint` | PASS | eslint and prettier clean |
| 1b | `npm run typecheck` | PASS | `tsc --noEmit` clean |
| 1c | `npm run test -- --coverage` | PASS | 63 files, 758 tests pass. `games/sabi-quiz/src/rules`: 100% statements, 99.22% branches, 100% functions, 100% lines (threshold 90). `daily.ts` 100/100/100/100 |
| 1d | `npm run build` | PASS | `prod-gate OK: 37 files scanned, no test hook or autoplay code in dist/` |
| 1e | `npm run size` | PASS | sabi-quiz 124.4 KB gzip (357.1 KB raw) vs 3072 KB budget; core 25.7 KB of 60 KB |
| 1f | `npm run e2e -- sabi-quiz` | PASS | 58 passed, 2 skipped. The skips are the desktop-only keyboard test on the two touch mobile projects, by design |
| 1g | `npm run e2e:extra -- sabi-quiz` | PASS | 59 passed, 1 skipped (the keyboard test on the touch landscape project, by design) |
| 1h | `npm run e2e:perf -- sabi-quiz` | PASS | Fast 3G + 4x CPU: time to menu 1778 ms (budget 4000). fps avg 60, min 59 over 1 s, worst frame 33.3 ms. Core perf hook avg 60, min 60. Heap after run 2.08 MB |
| 1i | `npm run e2e:soak -- sabi-quiz` (alone, 10 min) | PASS | 10.16 min, 54 rounds at 4x CPU, slowest round 11.7 s, 0 rescues, host did not sleep. Heap 2.03 MB at 0.2 min, then 2.23 to 2.28 MB from 2.1 min to 10.2 min (flat, no trend). Slope -1.1 KB/min (limit 100). Spec asserts listener, timer and RAF counters unchanged: passed |
| 1j | `npm run i18n:check` | PASS | sabi-quiz: 122 keys in en and pcm, no gaps, no extras, no empty values. 60 pcm `_review` lines (was 59, plus `duel.leadYou`) |
| 1k | `npm run packs:check` | PASS | 1 file checked (`sabi-core-en.json`), 300 items, all `reviewed:false` (human task). `daily-seed.json` no longer counted |
| 2 | Rules vs GAMES.md | PASS | Unchanged rules paths: lifelines, streak tiers, pass mark, stars, Classic clocks and mixes pass the round-1 probes; `ai.test` and `engine.test` pass in the 758 |
| 3a | Daily determinism | PASS | Daily picks through `createRound` with `dailySeedFor()`; test asserts the same ten for the same date, a different set for the next day, and the 4/4/2 mix. Verified in the rollover probe (day 2 starts scored with a new date) |
| 3b | Daily: one scored attempt (D1) | PASS (saved record) / FAIL (portal) | Saved-record rule holds; the portal events for practice fail, see D13. Probe (375x812, en): first start marks the day at once (`{score:0, correct:0}` stored, no practice badge). Pause, Quit, Daily: practice badge on. Pause, Restart: practice. Reload, Daily: practice. Finished practice win: saved record stays `{score:0, correct:0}`, `best.daily` 0, `wins` 0, `plays` 1 |
| 3c | Replays are Practice | PASS (state) / FAIL (portal) | Saved state untouched by practice. Portal `end` carries `practice:true`, but `level_complete` and `score` do not (D13) |
| 3d | Day rollover | PASS | Day 1 scored finish saved `{date:"2026-11-08", score:7640, correct:10}`. With the clock at 2026-11-09, the first start has no practice badge and the record becomes `{date:"2026-11-09", score:0}` |
| 4 | Duel difficulty ordering | PASS | `ai.test` (Chidi < Dung < Aisha by CPU score, with SE gaps). Unchanged by round 2 |
| 4b | Classic difficulty raises challenge | PASS | Clocks 20/15/10 s unchanged; mixes unchanged |
| 4c | Duel lead label (D4) | PASS | Probe: after a correct tap, `[aria-label="You are in the lead"]` count 1, visible. `"You is in the lead"` count 0 |
| 5 | Pack-load failure, Retry | PASS | e2e "questions that do not load" pass in both suites |
| 6 | Seed and token privacy | PASS | e2e `expectNoSeedInStart` and "storage never holds a token" pass. Storage keys: `naija:sabi-quiz:progress`, `naija:sabi-quiz:daily`; no token or phone-like keys. Daily record holds only `date`, `score`, `correct` (tested) |
| 7a | 360x640 portrait | PASS | 0 px horizontal overflow on every screen. Screens reviewed: menu, topic picker, how-to, stats, duel intro and play, play, pause, results (win, lose), menu after daily |
| 7b | 375x812, landscape 812x375, 1280x800 | PASS (see D14) | 0 px overflow on every screen; 0 undersized tap targets (only native radio inputs excluded, labels are the targets). Lifeline labels clipped at 375x812 in en (D14) |
| 7c | Tap targets >= 44 px | PASS | Measured on 11 screens x 4 projects, en and pcm: 0 visible button, link, label, plate or topic chip under 44 px |
| 7d | Contrast and legibility (D10, D11) | PASS | Footer hint on a dark pill, readable at 375, 360, 1280, en and pcm. HUD counters on a dark pill, readable at 375, 360, 1280. Screenshots in `tmp/qa/shots` (deleted) reviewed |
| 8 | Keyboard A-D, 1-4, F, S, H, L, P, Esc | PASS | `keys.ts` refactor: extra e2e keyboard test passes on desktop-1280x800. e2e keyboard test covers F, B, H, P and Escape (desktop). Modal blocking (`blocked: () => modal !== null`) was not probed separately this round |
| 9 | i18n: keys and hard-coded strings | PASS (see D12) | Key parity 122/122. Grep of `src/view/*.ts` and `app.ts`: no hard-coded UI text. `duel.leadYou` added to both locales |
| 10a | Portal event order and origin | PASS (see D13) | Order for a scored daily: ready, start, score..., level_complete, end. Abandon: end with `quit:true`. Target origin unchanged (`portal/index.ts`) |
| 10b | Progress save and load | PASS | e2e progress test passes in both suites |
| 11 | Single-player only | PASS | Grep for pass-and-play, hide-hand, player count, multiplayer, invite: no hits in quiz source. One human seat |
| 12a | Per-game map: visual world | PASS | buka-bar stage, aso-oke spotlights, adire wall, ankara bunting, akwete diamonds (screenshots) |
| 12b | Signature SFX | PASS | `sfx.ts` unchanged in round 2. Each cue uses a named core voice (ekwe, agogo, ogene, udu, shekere, talking drum) |
| 12c | Music | WARN | Unchanged from round 1: calm quiz bed is a synth stand-in; composed loops are silent placeholders |
| 12d | Personas | WARN | Unchanged: Uncle Etim (host), Dung (Medium duel), Aisha (Hard rival). Guide row says "Aisha as host/rival" (see Human review) |
| 12e | Stereotypes, symbols, copy | PASS | No kente, kora, masquerade, religious or political symbols in screenshots |
| 12f | Regional balance | WARN | Unchanged from round 1 (Lagos and Kano most used) |
| 12g | Diacritics (Yoruba, Igbo, Hausa) | PASS | D3 fixed: `sq-afb-031` now reads "ìyá ìlù" (`sabi-core-en.json:743`). Other `native-review` items checked: correct |
| 12h | The 58 `uncertain` tags | PASS | 58 tagged `uncertain` in the pack; the README list (`games/sabi-quiz/README.md`, "Uncertain questions") matches the 58 exactly, no missing and no extra. Tag has no runtime effect (grep). The asset designer's original U: list is still not in the repo, so the match is to the pack only |
| 13a | Gambling, gore, brands | PASS | No stakes, prizes or payments. Real clubs and players appear only as trivia (see Human review) |
| 13b | CREDITS.md covers all assets | PASS | 56 asset files under `games/sabi-quiz/assets`, all covered by a row (D7 fixed: stale `agogo.svg` row removed) |
| 13c | `reviewed` flags | PASS | Game does not read `reviewed`. Release gate blocks as intended |
| 14 | Question quality | PASS | Not re-sampled this round; pack changes are removal of `daily-seed.json` only |
| 15a | Code health: any, ts-ignore, console | PASS | None in quiz source or quiz e2e helpers |
| 15b | Code health: dead code (D6) | PASS | `isOver`, `nextTierAt`, `Category`, `dailyQuestions` removed from app code. Test-only `dailyQuestions` copy kept in `progress.test.ts:139`, asserted against the real `createRound` path. `daily-seed.json` removed |
| 15c | Code health: file length (D9) | FAIL (minor) | `play.ts` 407 lines, `app.ts` 405 lines (app.ts crossed 400 in the fix). Soft limit about 400 |
| 16 | Stats, results, how-to | PASS | Stats and results render at all sizes and both locales. Results note "Practice replay. Today's score is already saved." on a practice finish |
| R-robust | Topic picker, replays, pause, double tap, orientation, offline, tab hide (D8 and regressions) | PASS | Topic picker opened and closed 25 times: counters 21 listeners, 2 timers, 0 RAFs before and after. Five replays and ten pause/resume cycles: menu counters equal a fresh menu. Rapid double-tap on a plate: 1 answer recorded. Orientation change mid-question: same index and questions, no overflow. Offline after load: a round plays, no errors. Tab hidden: pause menu opens, clock frozen (2.5 s held at 13800 ms) |

## Defects

Round-1 IDs carried forward with their round-2 status. New round-2 defects are D13 to D18.

| ID | Severity | Status | Steps to reproduce | Expected | Actual | File:line |
|---|---|---|---|---|---|---|
| D1 | major | FIXED for the saved record; see D13 | Menu, Daily. Pause, Quit. Daily. Pause, Restart. Reload. Daily. Finish the round. | Only the first start is scored. Every later start is Practice and changes nothing saved | Verified: record marked at first start, restarts and re-entry are practice, saved record stays from the first attempt. Portal side still wrong (D13) | `games/sabi-quiz/src/app.ts:199-208` (startDaily, marked at start), `:260-264` (finish) |
| D2 | major | FIXED | `npm run e2e -- sabi-quiz --grep=...real duel` and `e2e:extra`, five repeats each | Passes on all four projects | Mobile 375x812 and 360x640: 10 of 10 executions pass. Landscape 812x375 and desktop 1280x800: 10 of 10 pass. Test now answers whichever question is open and uses a 0.7 clock (`tempo=0.7`) | `tests/e2e/sabi-quiz.spec.ts:321-355`, `tests/e2e/sabi-quiz.helpers.ts:97-127` |
| D3 | minor | FIXED | Read `sq-afb-031` | Yoruba "ìyá ìlù" with tone marks | Now "ìyá ìlù" | `games/sabi-quiz/assets/packs/sabi-core-en.json:743` |
| D4 | minor | FIXED | Duel with player ahead, read the chip label | "You are in the lead" | Probe: correct label, count 1; "You is" count 0 | `games/sabi-quiz/src/i18n/en.json:62`, `src/view/playui.ts:303-306` |
| D5 | minor | FIXED | Look for the 58 `uncertain` ids | Recorded in the repo | README lists exactly the 58 tagged ids. Designer's source list still absent (cannot check against it) | `games/sabi-quiz/README.md` ("Uncertain questions"), `sabi-core-en.json` tags |
| D6 | minor | FIXED | Static dead-code check; daily-seed file | Only used code exported; no unused pack | Removed. `daily-seed.json` gone and not in `check-sabi-quiz-pack.mjs`. Stale doc reference left (see D16) | `games/sabi-quiz/src/rules/` |
| D7 | minor | FIXED | Read CREDITS | Rows match files | `agogo.svg` row removed. 56 files all covered | `games/sabi-quiz/assets/CREDITS.md` |
| D8 | minor | FIXED | Open and close topic picker 25 times | Counters flat | Flat: 21 listeners, 2 timers, 0 RAFs before and after. `destroy()` closes the open picker (`openTopic` is closed on destroy; the modal `close` is idempotent) | `games/sabi-quiz/src/view/screens.ts:52, 121-126, 155` |
| D9 | minor | OPEN | Count lines | About 400 lines per file | `play.ts` 407 (was 419), `app.ts` 405 (grew past 400 in the fix) | `games/sabi-quiz/src/view/play.ts`, `games/sabi-quiz/src/app.ts` |
| D10 | minor | FIXED | Open the menu at 375x812, 360x640, 1280x800, en or pcm | Hint readable on its background | Dark pill: readable at every size and both locales | `games/sabi-quiz/src/style.css:40-47` |
| D11 | minor | FIXED | Play at 375x812 or 360x640 | HUD counters read cleanly | Dark HUD pill: "QUESTION 1/10" and score read cleanly at 375, 360, 1280 | `games/sabi-quiz/src/style.css:112-115` |
| D12 | minor | OPEN (core-owned) | Choose Pidgin, open menu | Natural Pidgin difficulty labels | "Easy Easy" and "Hard Well Well" still shipped. Not changed in core | `packages/core/src/i18n/pcm.json:28`, `:30-31` |
| D13 | major (new) | OPEN | Menu, Daily. Pause, Quit. Daily again (practice). Finish with a win (e.g. `autoplay({mode:'daily', win:true})`). Read the portal event log | A practice run must not look like a completed or scored level to the portal. Either no `level_complete` and no `score` events, or each one carries `practice: true` | Practice win emits `level_complete` with `score: 7640`, `mode: 'daily'`, `stars`, and no `practice` flag. Practice rounds also emit `score` events. Only `end` carries `practice:true`. Event order seen: `... score x10 > level_complete > end(practice:true)` | `games/sabi-quiz/src/app.ts:267-273` (level_complete without practice), `:218` (score for every round) |
| D14 | minor (new) | OPEN | 375x812, en. Start Classic. Wait for the first question (the host line wraps to three lines) | Lifeline labels 50/50, Skip and Padi fully readable | The label row sits on the floor stripe. The lower half of "Skip" and "Padi" is white text on cream and is clipped. The same screen in Pidgin and at 360x640 is clean. Layout depends on the host line length | `games/sabi-quiz/src/style.css:240-244` (`.sq-llbar`), the bottom layout of the play screen |
| D15 | minor (new) | OPEN | Menu, Daily. Quit at once. Return to menu | Copy says the attempt was not finished (the day is used, the score is not known) | "Today's score: 0. Replays are practice." A reader sees a finished score of 0. The results note after a practice finish also says "Today's score is already saved", which is misleading for a 0 | `games/sabi-quiz/src/i18n/en.json:12`, `games/sabi-quiz/src/i18n/pcm.json:27-29` (`menu.dailyDone`); `src/app.ts:199-208` writes the 0 at start |
| D16 | minor (new) | OPEN | Read `docs/assets/HUMAN_ASSETS.md` item 38 | Fact-checker instructions match the repo | Still says to set `reviewed: true` in both `sabi-core-en.json` and `daily-seed.json` (removed) | `docs/assets/HUMAN_ASSETS.md:44` |
| D17 | minor (new) | OPEN | Read the production bundle (`dist/sabi-quiz/chunks/index-*.js`) | No test-only code or reads in production | `fastForward` and `__naijaTest` are absent (good). The test options are still read in prod: `o.test?.tempo` and `o.test?.bot?.delayMs` appear in the minified bundle as inert reads. The reads are ungated. No hook is exposed | `games/sabi-quiz/src/view/play.ts:68`, `:87`, `:175-176` (wrap in `__NAIJA_TEST__` or remove) |
| D18 | minor (new) | OPEN | Count plays after a practice replay | Practice does not change the stats that matter (best and wins) | `progress.plays` +1 on every finish, practice included. Best and wins are unchanged. A rules decision as much as a defect | `games/sabi-quiz/src/rules/progress.ts` (`recordRound`, `plays: p.plays + 1`) |

## Warnings (not defects)
- **W1 (new)** Daily record is device-local (`naija:sabi-quiz:daily`, core storage), not part of the portal progress. Clearing site data or using another browser or phone gives a second scored attempt that day. Acceptable for a non-prize quiz, but the one-attempt rule is per device.
- **W2 (new)** A Restart from the pause menu on a scored Daily burns it: the restart is practice and the first attempt stays at 0. This follows the brief but is a player-visible rule.
- **W3** 320x568 (below the 360x640 minimum) not re-measured this round.
- **W4** Test code: `tests/e2e/sabi-quiz.spec.ts` is 944 lines.
- **W5** Pidgin menu hint "10 question, 15 s each." lacks the plural. Pidgin is acceptable, but list it for the native reviewer.

## Needs human review
- **Release gate (blocking for release):** all 300 core questions are `reviewed:false` (`npm run packs:release-check` must pass before go-live). The 58 `uncertain` questions are listed in the README and are the first to check, but the asset designer's original list is not in the repo.
- **Rules: Daily.** Confirm that the first start burns the day (quit, restart and reload all make the day practice), and that Restart on a scored Daily is practice. Decide the copy for an abandoned day (D15). Decide whether practice replays count in `plays` (D18). Confirm that the daily record may stay device-local (W1).
- **Portal events.** Confirm with the portal team what `level_complete` and `score` mean for a practice run (D13) before the fix is chosen.
- **Pidgin:** 60 `_review` lines in `games/sabi-quiz/src/i18n/pcm.json` (list from `npm run i18n:check`, sabi-quiz section). Core labels "Easy Easy" and "Hard Well Well" (D12, core owner). "10 question" (W5). `sq-pcm-029` ambiguous.
- **Diacritics:** native speaker check of the 15 `native-review` items (greetings, "Kedu", "Daalụ", "Ndo", "Nnọọ", "Na gode", "Barka da zuwa", "Sai gobe", "Ẹ ṣé", "Ẹ kú àárọ̀", "ìyá ìlù").
- **Cultural: host versus guide.** The guide's row says "Aisha as host/rival"; the build uses Uncle Etim (Efik, Calabar) as host. Guide owner decision (unchanged from round 1).
- **Cultural: persona names and regions.** Etim (Efik, Calabar) and Dung (Berom, Jos) need native confirmation of names, regions and banter. Portraits are placeholders.
- **Cultural: politics.** Historical items that touch the state (sq-his-010, sq-his-018, sq-his-020, sq-his-028). Factual; the reviewer decides.
- **Compliance: real names.** Trivia names real clubs and players (Enyimba F.C., Shooting Stars, Rangers, Kano Pillars, Heartland; Yekini, Okocha, Keshi and others). Factual, not forbidden by GAMES.md. Compliance owner to confirm.
- **Compliance: buzzer and streak multiplier** (HUMAN_ASSETS 45). Game-show buzzer, score multiplier and free lifelines, no stakes or prizes.
- **Regional balance:** Lagos and Kano are the most-used places (unchanged).
- **Layout decision (D14):** choose between moving the lifeline row above the stripe at 375x812 or shortening the host line.
- **Art and audio placeholders:** Etim and Dung portraits, hero thumbs (.webp), three silent music loops, ten silent voice lines, SFX listening check on a phone speaker.
- **Real-device test:** all results are from emulated Pixel 7 and Chromium, with CPU throttling. A real low-end Android (Tecno, Infinix, Itel) is still required before release.
