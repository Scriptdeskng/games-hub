# QA report: sabi-words (2026-11-09, commit e31c5b4)
Verdict: FAIL

## Summary
- Every automated gate passes: lint, typecheck, 836/836 unit tests (rules coverage 99.4% lines), build, size (116 KB gzip against 3 MB), e2e 64/64 on mobile, 64/64 on landscape and desktop, perf, and a 10-minute soak (211 rounds, heap slope 8.5 KB/min). The rules engine, generator (7,199 of 7,200 shipped puzzles built, and every one clean; 5,400 more clean with an extra-nasty list), portal bridge, Daily Puzzle and single-player scope hold under my independent probes.
- Five major defects block a PASS: the shipped blocklist misses common vulgar strings (filler-made "ASS" in 10% of grids), the HUD coin count is unreadable on portrait phones, the Osas bubble covers the word list at 360x640, a mid-round rotation leaves a 12x12 grid at 18 px tiles, and Yoruba, Igbo and Hausa display forms carry no diacritics.
- Thirteen minor defects and a human-review list remain (Pidgin copy, cultural review, placeholder art and music, a real-device pass). The packs stay `reviewed: false` by design, so `packs:release-check` fails as expected and is not a defect.

## Results table

| # | Item | Status | Evidence |
|---|---|---|---|
| 1a | `npm run lint` (eslint + prettier) | PASS | Clean on the repo at e31c5b4 |
| 1b | `npm run typecheck` | PASS | `tsc --noEmit` clean |
| 1c | `npm run i18n:check` | PASS | OK; sabi-words pcm has 48 `_review` lines |
| 1d | `npm run test:cov` | PASS | 71 files, 836/836 tests. sabi-words `src/rules`: lines 629/633 (99.4%), functions 55/57 (96.5%), branches 306/314 (97.5%). Threshold 90% met |
| 1e | `npm run build` | PASS | Built 7 games; prod-gate OK (49 files, no test hook or autoplay) |
| 1f | `npm run size` | PASS | sabi-words 116.1 KB gzip (108.2 KB brotli) against 3072 KB. Core 24.0 KB against 60 KB. Packs total about 15 KB gzip (65 KB raw) |
| 1g | `npm run e2e -- sabi-words` | PASS | 64/64 (375x812 and 360x640) |
| 1h | `npm run e2e:extra -- sabi-words` | PASS | 64/64 (812x375 and 1280x800) |
| 1i | `npm run e2e:perf -- sabi-words` | PASS | Time to menu 1581 ms (limit 4 s). fps average 59.5, minimum 58 over 1 s windows. Core hook avg 60, min 60. Heap after run 2.09 MB |
| 1j | `npm run e2e:soak -- sabi-words` (10 min, run alone) | PASS | 10.01 min, 211 rounds, slowest round 3.6 s, 0 rescues, 0 host sleep. Heap 2.33 MB at 1 min, 2.45 MB at 10 min, slope 8.5 KB/min (limit 100). Listener, timer and RAF counts identical at every results screen |
| 2 | Rules against GAMES.md and the brief | PASS, with defects | Profiles match: 8x8/6 words/3 min, 10x10/8/4, 12x12/10/5 (`rules/config.ts:43-71`). Stars exact at 50%, 20% and ±1 ms. Hints cost 10 and are refused below 10 coins. Coins start at 20. A Daily replay changes no progress. Each rule has a unit test (engine, progress, grid, generator) |
| 3 | Simulation and legal moves | PASS | Searcher model: Easy < Medium < Hard in clock share, Hard > 1.4x Easy, win-rate ordering holds (`ai/searcher.test.ts`). My probe, 200 seeded games: 30,000 random swipes gave 0 illegal accepts. All 200 solver-driven rounds were won. Repeat swipes were harmless (`closed` after the win only). The 80/60/55% thresholds are for skill games and do not apply to this solo game |
| 4 | Playthrough (menu, how-to, pack, real swipe, hint, pause, tab hide, results, replay x5, stats, quit) | PASS, with defects | Test build: 375x812 (en), 360x640 (pcm), 812x375 (en), 1280x800 (en). Zero console and page errors. The production-build layout audit covered all four viewports in en and pcm. Screenshots in my scratch folder, deleted after the run. Layout defects are in SW-02 to SW-04, SW-07 and SW-08 |
| 5 | Performance (4x CPU, Fast 3G) | PASS | See 1i and 1j |
| 6 | Robustness | FAIL (SW-04) | Pause freezes the clock (1.5 s check). Tab hidden pauses and does not resume by itself. Double tap on a tile is harmless. Going offline after load keeps the round running. Loops: menu/how-to/packs/stats x5 each, P-pause x10, pause button x5, replays x5, hidden tab x5. Counters at the menu stayed at 20 listeners, 2 timers, 0 RAF; in play 23/4/1; no growth. Rotation mid-round fails (SW-04). A double tap on the hint spends 20 coins (SW-16) |
| 7 | i18n | PASS, with defects | en 83 keys = pcm 83 keys. No placeholder mismatches. No hard-coded UI strings in `view/` or `app.ts` (grep). 48 `_review` lines (listed by i18n:check). Unflagged Pidgin and English leftovers: SW-12 |
| 8 | Portal and privacy (mock-portal) | PASS, with WARN-1 | Event order: ready, start, score per word, level_complete, end; lost round: start, end. Start payload `{level, pack, mode}`, no seed. API: 3 requests, each `Authorization: Bearer tok_...` exactly. Storage keys: `naija:sabi-words:progress` only, no token. Progress (45 coins) survived a reload through the API. postMessage targets only the portal origin (`packages/core/src/portal/index.ts:145`). Zero game console calls |
| 9 | Single-player | PASS | Grep for pass-and-play, hide-hand, player count, multiplayer, invite, hot seat: no hits in `games/sabi-words`. One human seat, all opponents none (solo) |
| 10 | Cultural authenticity | FAIL (SW-05) | Osas (Edo, Benin City) with no ethnic tropes; her wrong-swipe line never mocks. Market Spice palette, adire, aso-oke and akwete motifs; no kente, kora, masks or sacred symbols. SFX map uses core Nigerian voices only (ekwe, agogo, ogene, udu, shekere, talking drum, kakaki/goje). Diacritics missing (SW-05). Three SFX cues never played (SW-10). 59 uncertain tags, matching the brief |
| 11 | Content and compliance | FAIL (SW-01) | No gambling (coins cosmetic; the word "jackpot" appears only in a code comment). No gore. No real clubs, players or brands in the football pack. CREDITS covers every shipped asset (stale `agogo.svg` row, SW-15). Vulgar-word blocklist incomplete (SW-01) |
| 12 | Code health | PASS, with defects | Largest source file `app.ts` 390 lines. `words-art.css` 558 lines and `gen-sabi-words-art.mjs` 421 lines (SW-17). No `any`, no `ts-ignore` in `src` (grep). Dead members and cues (SW-11, SW-10). Listener, timer and RAF counts flat (item 6) |
| W1 | Generator: 6 packs x 3 levels x 300 seeds, plus 18 step-down cases x 100 seeds (7,200 puzzles) | PASS, with WARN-3 | My own brute-force solver and blocklist scanner over all 8 directions: 7,199 built. 0 multiplicity errors (every word found exactly once), 0 blocklist hits, 0 non-deterministic repeats, 0 wrong word counts, lengths, directions, placements or overlapping pairs. 1 failure: football-terms, Hard, 8x8, seed in the 100 (`no valid grid within the attempt cap`) |
| W1b | Extra-nasty list in the pack blocklist (40 strings), 5,400 puzzles | PASS | 0 hits in any row, column or diagonal, either direction. Determinism holds. The generator honours any list it is given |
| W1c | Accidental vulgar strings under the shipped list (filler only) | FAIL (SW-01) | `ASS` in 554/5,400 grids (10.3%), `POO` 353, `HOE` 316, `TIT` 200, `SLAG` 30, `THOT` 14, `NIGG` 14, `TITS` 16, `KNOB` 13, `SHAG` 13, `BOOB` 10, `BUTT` 10, `AKATA` 9, `HOMO` 8, `PIMP` 2 |
| W1d | Attempt cap | PASS, with WARN-3 | The 40-attempt cap returns `ok:false` and does not throw (seen once). Pack too small returns `pack has too few usable words`. A 12-word pack at Hard built in 3 attempts |
| W2 | Packs | PASS | `npm run packs:check` OK. `node scripts/check-sabi-words-pack.mjs` OK: 6 packs, 417 words, 149 blocklist entries each, 59 `uncertain`. `packs:release-check` FAILS on 717 unreviewed items (expected, human task). The game never filters on `reviewed` (grep) |
| W3 | Controls | PASS | e2e input suite: swipes in all 8 directions both ways; 0.4-cell hit circle (a corner pass does not pick the neighbour); tap-tap fallback; keyboard arrows, Space/Enter, Escape, H, P; Tab reaches the grid. Touch targets: HUD pause 48 px, hint 48 px, pause-dialog buttons 295x56, menu buttons 56 px, pack cards at least 44 px. Grid tiles: WARN-2 |
| W4 | Levels and clock | PASS | Time-low state at 5 s (e2e). Clock runs out and the round is lost (e2e, real clock). Pause stops the clock. Tab hidden pauses. Star thresholds exact (3 at 50%, 2 at 20%, else 1) |
| W5 | Hints and coins | PASS, with WARN-4 | Hint 10 coins, refused under 10, one hint per word (unit and e2e). Coins start at 20. Earned: win 10/15/20 (easy/medium/hard) plus 5 per star; loss 1 per word. No purchase, ad or cash path |
| W6 | Daily Puzzle | PASS | First start is scored. Quit, restart and replay are practice. Practice emits no score or level_complete and pays no coins (e2e and probe). Seed = hash of "naija-daily|sabi-words|local date" (no user id). Pack chosen from the date |
| W7 | Bundle and test hooks | PASS | `dist/sabi-words`: no `__naijaTest`, no `autoplay`, no `tempo`, `clock` or `pack` URL params. The `msisdn` string appears only in the storage forbidden-key regex. Service worker ignores the query string when caching |
| W8 | Pack-load failure | PASS, with defects | Friendly screen, Retry button (340x56) and Main menu; Retry recovers (e2e). Console: 2 browser "Failed to load resource: 404" errors (SW-06). Heading clipped by the awning (SW-07) |
| W9 | Layout: 360x640, 375x812, 812x375, 1280x800, en and pcm | FAIL (SW-02, SW-03, SW-04, SW-07, SW-08) | No document overflow or offscreen element in any screen. Clipping and overlap: see defects. Font minimum 15 px for letters; hint cost label 11 px (minor) |
| W10 | Greyscale legibility of found lanes | PASS | Greyscale render of the found-word slip: six distinct swatch patterns, strike-through and a check disc on every found word. The grid's underline is covered by the e2e assertion |
| W11 | Results in landscape (812x375) | PASS | The word slip fits without its own scroll (160 of 160 px). The page scrolls (507 of 375 px) to reach the buttons |
| W12 | Osas bubble over the word list | FAIL (SW-03) | At 360x640 on Medium and Hard the bubble (y 564-633) covers the bottom two word rows (the word list spans y 424-626 on Hard). At 375x812 it does not overlap |
| W13 | Grid size on a 360x640 phone | PASS, with WARN-2 | Hard: 12x12, cell 26 px, tile face 22 px, letters 15 px. Medium: 10x10, cell 31 px, face 27 px. Easy: 8x8, face 35 px |

## Defects

Major (5). Each one blocks the verdict.

**SW-01 · major · content and compliance**
- Steps: generate with any shipped pack at easy, medium and hard, seeds 1 to 300. Search every row, column and diagonal in both directions for these strings, counting only occurrences that use at least one filler cell: ASS, POO, HOE, TIT, TITS, SLAG, THOT, NIGG, KNOB, SHAG, BOOB, BUTT, AKATA, HOMO, PIMP.
- Expected: none appear. The brief requires "no offensive accidental words (keep a blocklist)", and the telco rules require family-friendly content.
- Actual: ASS in 554 of 5,400 grids (10.3%), POO 353 (6.5%), HOE 316 (5.9%), TIT 200 (3.7%), TITS 16, SLAG 30, THOT 14, NIGG 14, KNOB 13, SHAG 13, BOOB 10, BUTT 10, AKATA 9, HOMO 8, PIMP 2.
- File: `games/sabi-words/src/rules/blocklist.ts:8-33` (MIN_BLOCKLIST) and the `blocklist` array in each of the six `games/sabi-words/assets/packs/*.json` (lines 7-157, identical). Add a native-reviewed set of vulgar strings to both. Add a regression test that generates 200 seeds per pack and asserts a fixed list is absent. AKATA may be derogatory: a cultural reviewer decides before it is added.

**SW-02 · major · legibility (contrast)**
- Steps: open Play at 360x640 or 375x812 (Easy, Medium or Hard). Look at the coin count in the top HUD.
- Expected: the coin balance is readable against the awning.
- Actual: the digits are #FFF1DC (cream) and sit on the cream awning stripe. At 360x640 only the coin icon is visible. At 375x812 the digits are partly lost. Measured `numberColor` rgb(255, 241, 220), contrast about 1:1 against the stripe.
- File: `games/sabi-words/assets/words-art.css:371-377` (`.sw-coins`, colour `var(--ng-ink, var(--sw-cream))`). Give the balance a dark ink or a dark plate.

**SW-03 · major · layout (clipped UI)**
- Steps: 360x640 portrait, Medium or Hard. Start a round. Osas speaks: the greeting on start, about 40% of found words, 35% of wrong swipes, the hint and the last 5 s.
- Expected: the word list is never covered in portrait (DoD: no clipped UI at 360x640). A bubble is 3 s.
- Actual: the bubble (y 564-633) covers the bottom two rows of the word list (the list spans y 424-626 on Hard), for example the GBEGIRI and MANGO entries.
- File: `games/sabi-words/src/view/play.ts:73` (`createBubbleView` with `ms: 3000`) and `games/sabi-words/src/style.css:205-211` (`.sw-banter` fixed at the bottom). Reserve a bubble row above the list, or have the list scroll under a bubble that does not cover it.

**SW-04 · major · layout (grid contract)**
- Steps: 375x812, Hard. Once the round is running, change the viewport to 812x375.
- Expected: the grid steps down to 10x10 with cells of at least 26 px (brief section 2, `fitGrid`).
- Actual: it stays 12x12 with 144 tiles, face 18 px (cell about 22 px), letters 15 px. 
- File: `games/sabi-words/src/view/play.ts:235-238` (the resize handler calls `board.setCell` with the old `n`). `games/sabi-words/src/app.ts:163` runs `fitGrid` only when a round is built. On resize, re-run `fitGrid` and rebuild the board, or keep the round's size and lock orientation.

**SW-05 · major · cultural (diacritics)**
- Steps: list every `display:` tag and every `uncertain` word in the six packs. Check for diacritics.
- Expected: Yoruba, Igbo and Hausa words carry correct diacritics. The cultural guide says "always with correct diacritics". Only the grid letters are A-Z; the `display:` tag is where the marks belong.
- Actual: none of the display forms carries a diacritic. Examples: `naija-food.json:221` "Efo riro" (Efọ riro), `:468` "Ogi" (Ògi), `:280` "Tuwo shinkafa", `:291` "Miyan kuka", `:578` "Akamu", `:372` "Ekuru", `:378` "Okpa", `:384` "Oha soup", `:545` "Agbalumo", `cloth-markets.json:167` "Aso-oke" (Aṣọ òkè), `:213` "Aso ebi" (Aṣọ ẹbí), `pidgin-words.json:277` ODOGWU (Ọ̀dọ̀gwù).
- File: the `tags` arrays at those lines. Add the marks with a native reviewer's check. Place names in English spelling (Ojuelegba, Idumota) are a separate policy call (human review).

Minor (13).

**SW-06 · minor · console (DoD zero console errors)**
- Steps: open with `?pack=/no-such.json` (test build), press Play.
- Expected: no console errors on the expected retry state, or a documented exception.
- Actual: two browser errors, "Failed to load resource: 404". The e2e spec filters them out (`tests/e2e/sabi-words.packs.ts:55`).
- File: `games/sabi-words/src/app.ts:93-94` (pack fetch via `loadPack`).

**SW-07 · minor · layout (clipped heading)**
- Steps: 375x812 portrait, pack fails (as SW-06).
- Expected: "THE WORDS DID NOT LOAD" is fully visible.
- Actual: the top of the heading is covered by the awning scallops.
- File: `games/sabi-words/src/style.css:110-116` (`.sw-error`) and the stage/awning layer in `games/sabi-words/src/view/menu.ts:18` (`stage()`). Add top padding or move the awning behind the content.

**SW-08 · minor · layout (results)**
- Steps: win or lose a round at 375x812 or 360x640.
- Expected: the SCORE and BEST tiles are visible above the sticky actions.
- Actual: their labels are cut off by the sticky "Play again" and "Main menu" bar until the page is scrolled.
- File: `games/sabi-words/src/view/screens.ts:118-141` (wraps core `createResults`). Add bottom padding equal to the sticky bar height.

**SW-09 · minor · logic and copy**
- Steps: lose a round with no swipes (for example, the clock runs out).
- Expected: accuracy shows 0% or a dash.
- Actual: "100% ACCURACY".
- File: `games/sabi-words/src/rules/engine.ts:148-149` (`found + wrongs === 0 ? 1`).

**SW-10 · minor · audio (brief section 7)**
- Steps: earn stars, earn coins, or count the score up on the results screen.
- Expected: each plays its cue (`star` for each star, `coinEarn` for coins, `scoreTick` on the count-up).
- Actual: none plays. `star`, `coinEarn` and `scoreTick` are defined (`games/sabi-words/src/audio/sfx.ts:65-68, 70-73, 95`) and no call site exists. `sfx.test.ts` checks only that they exist.
- File: wire them in `app.ts` (around line 289) and `view/hud.ts` (`setStars`); make the test assert use.

**SW-11 · minor · dead code**
- `Board.clearHint` (`games/sabi-words/src/view/board.ts:29, 334`), `Board.focus` (`view/board.ts:342`), `Board.selectionLength` (`view/board.ts:34, 284`): no callers.
- `solveAll` (`games/sabi-words/src/rules/solver.ts:37-38`): unused.
- `verifyPuzzle` (`games/sabi-words/src/rules/generator.ts:184-185`): its comment says it checks loaded saves, but no save check exists and only tests call it.

**SW-12 · minor · i18n (Pidgin)**
- Unflagged Pidgin (no `_review`), against the brief's "every Pidgin line is `_review`": `menu.dirs.easy`, `menu.dailyNew`, `play.timeLeft`, `play.sr.found`, `play.sr.wrong` (pcm.json:121), `stats.none` (:180), `error.pack.title` (:184), `persona.osas.4`, `.6`, `.7`.
- English left in the pcm file: `stats.best`, `stats.packs`, `stats.coins`, `results.accuracy`, `error.retry`, and `error.pack.body` (close to English).
- File: `games/sabi-words/src/i18n/pcm.json`.

**SW-13 · minor · shared copy (core, visible in this game)**
- Pidgin labels from core: `difficulty.easy` "Easy Easy" (`packages/core/src/i18n/pcm.json:28`), `difficulty.medium` "Normal" (:29), `difficulty.hard` "Hard Well Well" (:30), `results.lose` "E nearly be! Try again!" (:38). They show on the menu picker, the results and the stats in Pidgin. Fix in core. The game has no `difficulty.*` keys of its own.

**SW-14 · minor · copy and fact**
- "FLEX" hint "Relax and enjoy yourself" (`games/sabi-words/assets/packs/pidgin-words.json:300-302`). Pidgin "flex" means to show off. Replace the gloss, then native review.

**SW-15 · minor · credits and first paint**
- `games/sabi-words/assets/CREDITS.md:7` lists `agogo.svg`, which no longer exists. Remove the row.
- `games/sabi-words/index.html:6` and `:17` keep the scaffold green `#0b3d22` for the theme colour and first-paint background; the game theme is `theme-market`.

**SW-16 · minor · UX (hint)**
- Steps: double-tap the hint button quickly.
- Expected: one tap, one hint, or a short debounce.
- Actual: two hints are lit and 20 coins are spent. The brief's "never charged twice for one word" holds, because each tap targets a different word.
- File: `games/sabi-words/src/view/play.ts:164-187` (`hintAction`), `games/sabi-words/src/rules/engine.ts:103-121`.

**SW-17 · minor · code health (length)**
- `games/sabi-words/assets/words-art.css` is 558 lines and `scripts/gen-sabi-words-art.mjs` (421 lines). Both are over the ~400-line guideline.

**SW-18 · minor · contrast (settings bar)**
- At 360x640 on the menu, "Sound: on", "Music: on" and "Pidgin" sit over the yellow and red table stripe, with reduced contrast. File: the core settings bar (`createSettingsBar`) over the table background in `words-art.css`. Give the bar a solid plate.

WARN (not defects, shown for the record):
- WARN-1 · The portal token is in the game page URL (`?token=`). This is the portal contract, and the game sends it only as a Bearer header. The page sets `referrer: no-referrer`. The portal team should confirm the URL form.
- WARN-2 · Grid tiles are below 44 px. Face sizes at 360x640 are Easy 35 px, Medium 27 px, Hard 22 px (cells 39, 31 and 26 px). Swipes use the 0.4-cell hit circle, so tile size is not the swipe target. The tap-tap fallback does use the tile. I judge this acceptable with a real-device check. Medium and Hard are the riskiest.
- WARN-3 · The generator fails for football-terms at Hard 8x8 on about 1 seed in 100 (`no valid grid within the attempt cap`). The app retries six seeds, so the chance a player sees the error is negligible. The error screen then reads "words did not load" for a valid pack. Consider a size fallback instead.
- WARN-4 · The coin economy (win 10/15/20 plus 5 per star; loss 1 per word) is not in GAMES.md or the brief. It is a product decision and needs a written spec.

Verdict basis: FAIL (SW-01 to SW-05 are major).

## Needs human review

Rules and product:
- Coin economy values (WARN-4). Whether a double-tap on the hint should cost twice (SW-16).
- The Daily Puzzle always uses the medium profile (10x10, 8 words, 4 minutes), whatever difficulty the player chose. Confirm that is intended.
- The brief (section 12, item 3) asks to refuse unreviewed words outside dev mode. The task instruction says the game must not filter on `reviewed`. I followed the task. The product owner must pick one.

Pidgin (native speaker):
- All 48 `_review` lines in `games/sabi-words/src/i18n/pcm.json`, plus the unflagged lines in SW-12.
- "DASH" hint, "To give a little gift, or the gift itself" (`pidgin-words.json:255-257`): can read as an invitation to bribery. Reword or confirm.
- "FLEX" (SW-14). "SHARP" hint "Quick, or an agreement" (`:260-262`). "Every letter dey him place" (persona.osas.8).
- Core copy (SW-13).

Cultural review (Edo, Yoruba, Igbo, Hausa):
- The greeting "Kóyo!" in Osas's first line. The brief itself flags it for native confirmation. Also confirm the name "Osas" and the Edo region label.
- The indigo adire head-tie on the Edo persona's avatar (`games/sabi-words/assets/avatars/osas.svg`). Adire is a Yoruba textile. An Edo reviewer decides whether it reads as a stereotype or a mismatch.
- "LAGBAJA" (`pidgin-words.json:323`): a common word that is also the stage name of a real performer. Decide whether it stays.
- AKATA and OYINBO: some readers find these derogatory. Decide before any blocklist change (SW-01).
- Food hints with animal parts ("goat-head", "cow-foot" in ISIEWU and NKWOBI): food, not gore. Confirm the family-friendly reading.
- Fact checks: SOMOLU "known for its printing presses" (`lagos-places.json:287`) and IDUMOTA "famous for cloth" (`:391`). NEPA "old name people still use for the light company" (pidgin-words.json:468). The 59 `uncertain` words and all 417 unreviewed words (fact and language review, `packs:release-check`).
- Regional balance: adequate. Cloth and Markets is Yoruba-leaning (8 of 59, adire and aso-oke are Yoruba textiles) with Igbo, Hausa and Abuja markets present. Lagos Places is all-Lagos by design. The food pack is pan-Nigerian. The states pack covers all 36 states and the FCT.
- Place names in English spelling (Ojuelegba, Idumota, Onitsha) versus diacritics: a policy call.

Art and audio (placeholders by design):
- Osas avatar is a placeholder, and a human illustrator replaces it. Hero thumbnails are SVG placeholders (.webp export pending).
- Music: three synth stand-ins play in the game. The three mp3 placeholders are silent and unreferenced. A composer is needed.
- Voice: 11 placeholder mp3 files are not wired (no voice playback in code). Voice actors are needed.
- The large green "Daily Puzzle" button is a big accent, where the brief asks for green as a small accent. Art direction call.

Real device (not run here):
- 360x640 portrait tile sizes and tap-tap on Medium and Hard (WARN-2). Bubble overlap timing (SW-03). HUD legibility on Tecno, Infinix and Itel screens (SW-02). Audio on phone speakers.

Scratch probes (run, then deleted from `tmp/qa/`): generator probe for shipped, nasty and accident modes; rules edge probe; 200-game legal-move probe; Playwright layout audit on the production build (four viewports, two languages); playthrough and leak-loop scripts on the test build; mock-portal probe; HUD measurement; extras (pack failure and greyscale). Each can be recreated from the item list above.
