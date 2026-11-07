# QA report: naija-ludo (2026-11-07, commit 63e4002)

Verdict: PASS (no blocker or major defect; 7 minor defects to fix; human review items listed at the end before any release)

## Summary
- Every re-run gate is green: lint, test (376/376, ludo `src/rules` 100% statements and lines, 99.44% branches, 94.73% functions), build with prod-gate, size (106.1 KB gzip vs 3 MB budget), e2e 54/54 at 375x812 and 360x640, e2e:extra 54/54 at landscape and 1280x800 desktop. The 4x CPU + Fast 3G perf run passes (time to menu 1.58 s, 60 fps average), and the 10-minute soak heap slope is 1.2 KB/min against a 100 KB/min limit.
- Rules match docs/GAMES.md in every toggle except one: with stacks `off`, capturing a two-seed stack still grants a bonus roll, which contradicts the "lone opponent seed" rule text (D-02). The AI made 0 illegal moves in 3,311,982 CPU decisions over 7,200 seeded games. Hard beats Easy 93.1% (1000 games, Wilson 95% lower bound 91.4%), above the 60% Ludo threshold. Quick mode is 71.7%.
- Single-player holds (1 or 3 CPUs only). The production build sends events to no origin except the default portal, and no test hook ships. The carried fixes SL-15, SL-16 and SL-17 are verified (SL-17 leaves dev-only strings in the bundle, D-06). No blocker or major defect was found, so the verdict is PASS. The defects and human items below must be closed before release.

## Results table

| # | Item | Status | Evidence |
|---|---|---|---|
| 1a | `npm run lint` (eslint + prettier) | PASS | exit 0, "All matched files use Prettier code style" |
| 1b | `npm run typecheck` | PASS (not re-run) | Not in the re-run list; lead reports `npm run check` green |
| 1c | `npm run test -- --coverage` | PASS | 36 files, 376 tests passed. ludo `src/rules`: config 100/100/100/100, engine 100/99.18/95.45/100 (uncovered branch line 207 is an unreachable `roll === null` guard), progress 100/100/100/100, board 100/100/87.5/100 (87.5% = unused `startIndex`, D-03). Threshold 90 met |
| 1d | `npm run build` (incl. prod-gate) | PASS | "prod-gate OK: 18 files scanned, no test hook or autoplay code in dist/" |
| 1e | `npm run size` | PASS | naija-ludo 106.1 KB gzip / 99.8 KB brotli vs 3072 KB budget. Core 28.3 KB gzip / 60 KB. Well under the 1.5 MB target |
| 1f | `npm run e2e -- naija-ludo` | PASS | 54 passed (1.9 min): 27 tests x 375x812 and 360x640. Covers menu, how-to, rules, full game, pause, results, replay, portal order, keyboard, auto-move, persistence, lang=pcm, token-free storage, crafted portal origins, Referer, offline SW, 5 replays |
| 1g | `npm run e2e:extra -- naija-ludo` | PASS | 54 passed: landscape 812x375 and desktop 1280x800 |
| 1h | `npm run e2e:perf -- naija-ludo` (4x CPU, Fast 3G) | PASS | time to menu 1582 ms (budget 4000). fps avg 60, 1 s min 60, worst frame 16.8 ms. Core hook avg 60, min 57. Heap after run 2.21 MB |
| 1i | `npm run e2e:soak -- naija-ludo` (10 min, 4x CPU) | PASS (WARN on the tool result) | 10.09 min, 124 rounds. Heap 0.1 min 2.12 MB, 1.0 min 2.42 MB, 10.1 min 2.49 MB, 18 steady samples, slope 1.2 KB/min (limit 100). Counters identical every round (the soak's counter and error expectations completed with no reported failure). The test was marked failed by a Playwright artifact ENOENT at context close, caused by my concurrent scratch run clearing the shared `test-results/` folder. Not an app defect. Re-run for a clean status before release |
| 2 | Rules vs GAMES.md (section 2) | PASS with D-02 | See the rules table below |
| 3 | AI legality, 200 seeded games per cell | PASS | Probe `tmp/qa` (deleted): 3 difficulties x 6 rule sets x 1 and 3 CPUs x 200 seeds = 7,200 games; every decision checked against `legalMoves`. 0 illegal of 3,311,982 decisions. Each game terminated with a winner |
| 3b | Hard vs Easy (threshold 60% for Ludo) | PASS | 1 CPU default 1000 games: 931 wins, 93.1% (Wilson 95% [91.4, 94.5]). 1 CPU quick 1000 games: 71.7% [68.8, 74.4]. Fresh 200 seeds: 93.5%. Hard vs 3 Easy: 77.4% (fair share 25%). Hard vs Medium: 75.0%. Medium vs Easy: 82.2%. The strength order Hard > Medium > Easy holds |
| 4 | Playthrough and layout, 4 viewports (375x812, 360x640, 812x375, 1280x800) | PASS | Menu, how-to, rules, play start, seed choice, greyscale seed choice, results, replay captured and read. No horizontal overflow on any screen, no clipped text, and the results and rules layout holds. Every visible interactive control is at least 44 px (native radio inputs are 1x1 and visually hidden, their labels are at least 44 px). Seed targets 44x44 at 360, 375 and landscape, 45x45 desktop. The sticky "Got it" button covers scrolled rules copy by design |
| 4b | Pause, tab hide, orientation, resize, double tap, offline, 5 replays (robustness, item 6) | PASS | See the robustness table below |
| 5 | Performance (item 5) | PASS | See 1h and 1i above |
| 6 | Robustness (item 6) | PASS | Pause: listeners 30 to 35 (overlay), back to 30 on resume. Tab hidden: auto-pauses by design (`packages/core/src/board-kit/flow.ts:67-68`), overlay stays until the player presses Resume, then 30. Orientation and resize churn: L30 T3 R1, unchanged, no overflow. Rapid double tap on the die: one roll (one `lastRoll`, phase moves to `move`), no page error. Offline after load: three turns played offline, 0 errors. Five replays: play screen L30 T5 R1 on every cycle, results L11 T2 R1, no growth. Back at menu after five replays: L23 T2 R1 (the menu holds 1 to 2 boot timers, constant, not per cycle). Console and page errors: 0 |
| 7 | i18n en and pcm | PASS (WARN) | en and pcm: 94 keys each, identical key sets, no empty values. Every literal `t('...')` key (54) and every dynamic family (`ludo.banter.<persona>.<event>`, `persona.<id>.short`, `game.howto.<n>`, `rules.stacks.*`) resolves in both locales. No hard-coded UI strings in `src/view`, `src/app.ts` or `src/main.ts` (matches are comments, keys and IDs). 45 pcm lines flagged `_review` (listed below). `i18n:check` not re-run (lead's check) |
| 7b | Yoruba and Hausa words | WARN | "Ẹ kú iṣẹ́" is correct (Ẹ U+1EB8, ú, ṣ U+1E63, ẹ with combining acute U+0301, NFC). Both en lines carrying Yoruba and Hausa words are unflagged (D-04) |
| 8 | Portal and privacy (item 8) | PASS (WARN on SL-17 residue) | Event order `ready > start > score ... > level_complete > end` asserted by the e2e mock-portal test (order OK, progress `plays` = 1 via the API). `postMessage` target is `p.portalOrigin`, never `*` (`packages/core/src/portal/index.ts`). Production probes (`tmp/qa`, served from `dist/`, parent on a third origin): portal `http://127.0.0.1:5598` (http, not default), `http://localhost:5598` and `https://evil.example` each gave 0 game events and 0 requests. Test build with `http://127.0.0.1` gave `ready` to the parent origin only. The token never appears in any message, and the only outgoing request is `GET {portal}/api/games/naija-ludo/progress` with `Authorization: Bearer`. Storage keys are `naija:naija-ludo:<key>` (progress and settings only). The default portal is `https://m.gamesplash.com.ng` (one occurrence in the prod bundle). No MSISDN or token in logs, storage or URLs. No `console.*` in shipped source |
| 8b | Test members in prod bundle | PASS | prod-gate passes. Grep of `dist/naija-ludo` for `autoplay`, `naijaTest`, `NAIJA_TEST`, `setSeed`, `fastForward`, `liveMoves`, `headToHead`, `simulate`: 0 hits. `getState` appears only in core rng |
| 9 | Single-player (item 9) | PASS | Menu offers CPU counts 1 or 3 only (e2e "no way to add a second human"). `createGame` throws `RangeError` for any other count (`engine.ts`, engine test). Grep for pass-and-play, hide-hand, hot seat, multiplayer, invite, 2 players, co-op, online: no feature hits (the only "friend" hits are banter copy). README states the rule |
| 10 | Cultural authenticity (item 10) | PASS (WARN) | See the cultural table below |
| 11 | Content and compliance (item 11) | PASS | No stakes, coins, prizes or money mechanics in `src` or copy (Funmi's banker job is explicitly kept out of the banter). No gore words in i18n. No brand, club or player names in `src`, index.html, README, CREDITS or any SVG `<text>` (grep: none). CREDITS covers every asset family: board, yards, legend, seeds, badges, dice, fx (incl. unused confetti and stripe-sweep), thumb, audio placeholders and voice manifest, ship.json, agogo.svg, sfx.ts and synth music.ts. Core fonts (Nunito, Bungee, OFL) and shared persona placeholder avatars are logged in core CREDITS. No unknown licences. Quiz-pack review: N/A |
| 12 | Code health (item 12) | WARN | No `any` in `src`, no `@ts-ignore`, `@ts-expect-error` or `eslint-disable`. Largest files: `view/play.ts` 410 lines (slightly over the 400 guideline, acceptable), `view/board.ts` 335, `app.ts` 309, `engine.test.ts` 512 (test). Dead code: D-03 |
| CF-15 | Carried fix SL-15 (ship.json two-way check) | PASS | `scripts/ship-check.ts` (two-way rule) wired in `scripts/vite-naija-plugin.ts:45`, unit tests in `scripts/ship-check.test.ts` (pass in `npm test`). Ludo build passes it. `ship.json` `dynamic` covers `seeds/seed-*`, `seeds/badge-*`, `dice/die-*` |
| CF-16 | Carried fix SL-16 (module-level state, prod test API) | PASS | No module-level mutable state in `games/naija-ludo/src` (only readonly tables). Test members are behind `__NAIJA_TEST__` (`app.ts`, `play.ts`), and the prod bundle has none of the forbidden names. `ai/sim.ts` is not shipped |
| CF-17 | Carried fix SL-17 (dev origins in production) | PASS (behaviour), WARN (code) | Runtime: production build rejects `http://localhost`, `http://127.0.0.1` and `https://evil.example` (0 events, 0 requests). The `['localhost','127.0.0.1','[::1]']` branch is still compiled into the prod bundle (D-06) |
| CF-10c | SL-10(c) landmark clearance | documented only | Snakes & Ladders landmark-clearance check is still not machine-tested (`games/snakes-ladders/README.md`). Not applicable to Ludo. Recorded, not re-tested here |

### Rules table (item 2, GAMES.md section 2 vs `games/naija-ludo/src/rules`)

| Rule or toggle | Implementation | Tests and probes | Result |
|---|---|---|---|
| A 6 releases a seed and earns an extra roll | `engine.ts` `movesOfSeed` (release to track 0), `execute` (`again: 'six'`) | `engine.test` "a 6 releases a seed onto the start square and earns an extra roll" | PASS |
| Capture sends the opponent home and earns a bonus roll (`captureBonus`) | `engine.ts:285-286` `again` | "lands on a lone opponent seed ... you roll again"; "capture bonus can be switched off"; "the bonus roll only follows a real capture" | PASS for lone seeds. FAIL for stacks `off` (D-02) |
| Capture on a safe square is impossible (start and star squares) | `board.ts` `isSafeSquare` (0, 8, 13, 21, 26, 34, 39, 47); `execute` skips captures there | "has 8 safe squares"; "cannot capture on a star square or on any start square"; probe: lone 3-CPU seed on star 21 and on opponent start 39 not captured, no bonus | PASS (note: the loop's square-0 case is vacuous, D-07) |
| Exact roll to reach home (`exactHome`) | `movesOfSeed` returns null on overshoot | "an exact roll gets home; an overshoot is not a legal move"; "with the rule off ..."; probe: 54 + 3 illegal, 50 + 6 to home, 55 needs 1 | PASS |
| A turn with no legal move passes; after a 6 the same player rolls again | `roll()` `pass(..., value === MAX_ROLL)` | "a roll with every seed in the yard and no 6 passes the turn"; "a stuck 6 still gives the roll back"; probe: all home, rolls 6, same player, sixes 1 | PASS |
| Three 6s in a row forfeit the turn (`threeSixes`) | `roll()` forfeit before any move | "the third 6 forfeits the turn"; "a non-6 breaks the run"; "the rule can be switched off"; probe: third 6 forfeits with a legal move available, the moved seed stays at 22, nothing carries over | PASS |
| Stacks `safe` (default): stack uncapturable, shareable | `movesOfSeed` `here.length >= 2` | "safe (default): a stack cannot be captured" | PASS |
| Stacks `block`: nobody lands on or passes; blocks release onto start | `movesOfSeed` blockade loop, `blockadeAt` | "block: nobody may land on or pass a blockade"; "your own stack does not block you"; "release is refused while an opponent blockade sits on your start square"; "a roll with only blocked moves passes the turn" | PASS |
| Stacks `off`: a landing captures every seed on the square | `movesOfSeed` | "off: the whole stack is captured" | PASS for capture; bonus gap D-02 |
| Quick mode: 2 seeds each; first home wins (`quickFirstHome` on), or both home (off) | `createGame` (`seedsPer`), `homeTarget` | "homeTarget: 4 classic, 1 quick, 2 quick"; "quick, first home wins"; "quick, both home wins when the toggle is off"; probe: first home wins with the other seed in the yard | PASS |
| One human, 1 or 3 CPUs (never 2) | `CPU_COUNTS`, `createGame` throws | "refuses any CPU count other than 1 or 3" | PASS |
| Easy and Medium and Hard are as documented | `ai/brains.ts`, `ai/eval.ts` | AI suite (23) and probes above | PASS |
| Rolls are seeded and deterministic | `rng` in state, serialisation round trip | "same seed, same game"; "round-trips through JSON mid-game" | PASS |
| Shake-to-roll on `devicemotion` | not reviewed in this run (device) | README says tap always works, e2e covers tap and keys | Needs real device (human) |

### Robustness table (item 6)

| Action | Listeners / timers / RAF (before, after) | Errors |
|---|---|---|
| Menu first load | 23 / 1 to 2 / 1 | 0 |
| Play, human die live | 30 / 5 / 1 | 0 |
| Pause (P), resume (Esc) | 30 to 35 to 30 / 5 / 1 | 0 |
| Tab hidden, shown, Resume | 30 to 35 to 30 / 3 / 1 | 0 |
| Orientation 375 to 812 to 375, resize 360/400/340/375 | 30 / 3 / 1 | 0 |
| Offline, three turns | 30 / 3 / 1 | 0 |
| Five replays (results, then play, each cycle) | results 11 / 2 / 1; play 30 / 5 / 1 on every cycle | 0 |
| Back to menu after five replays | 23 / 2 / 1 | 0 |

### Cultural table (item 10, CULTURAL_GUIDE section 7 and the Naija Ludo brief)

| Per-game map item | Delivered | Evidence |
|---|---|---|
| Visual world: board in Naija Green with adire safe squares | Yes | `assets/board/board.svg`; screenshot: green cloth, adire-patterned star squares, adire rings in the red yard, aso-oke stripes in the yellow yard, akwete zigzag in the indigo yard, uli wave in the green yard |
| Signature SFX: shekere dice | Yes | `ludoSfx.roll` and core `dice` both use the shekere (duplicated, D-01) |
| Signature SFX: agogo capture | Yes | `ludoSfx.capture`: agogo double bell, agogoTing, udu |
| Signature SFX: talking-drum turn | Yes | core `turn` = `talkingDrum` |
| Music: highlife or juju | Not delivered as audio | Brief section 7 mp3 loops are silent placeholders and are not referenced. `src/audio/music.ts` synth patterns (ekwe, shekere, agogo) run instead (D-05, human item) |
| Characters: Funmi, Baba Ade (plus Malam Sani for the third seat) | Yes | `ai/personas.ts`: Funmi (Yoruba, Lagos), Baba Ade (Yoruba, Ibadan), Malam Sani (Hausa-Fulani, Kano). Avatars are shared placeholders |
| `sfx.ts`: every interaction sound maps to a Nigerian instrument or everyday sound | Yes | Every name used by `playSfx` exists in `ludoSfx` or core. Instruments used: shekere, ekwe, udu, agogo, agogoTing, talkingDrum, talkingDrumDown, talkingDrumSqueeze, ogeneRing (all present in `packages/core/src/audio/instruments.ts`). Core `tap`, `select`, `back`, `pick` are ekwe or agogoTing. No generic blip or beep preset. `homeReached` runs 0.95 s (brief-approved celebration class) |
| Pan-African clichés, kente or kora stand-ins, sacred or political symbols, stereotyped characters | None found | Screenshots, art and copy reviewed. Stars are game safety marks. Banter is about the game only. No masks, savanna, nsibidi or regalia |
| Regional balance | Partial | Yoruba (2 personas, adire, aso-oke, gele), Hausa-Fulani (1 persona, Madalla, Kano), Igbo (akwete, uli, udu, ekwe). No Igbo or South-South persona. Brief documents the gap (HUMAN_ASSETS #12). Human review |

## Defects

| ID | Severity | Steps to reproduce | Expected | Actual | file:line |
|---|---|---|---|---|---|
| D-01 | minor | Roll the die on any turn, then trace the calls: `diceView.roll()` runs first, then `showRoll` | One shekere and ekwe roll cue per roll | Two identical cues fire in the same tick: core `dice` (shekere 0.9, ekwe 0.6 at 0.2 s) and ludo `roll` (same voices and gains). The roll doubles, audibly | `packages/core/src/board-kit/dice-view.ts:189` (`playSfx('dice')`); `games/naija-ludo/src/view/play.ts:215` (`playSfx('roll')`); `games/naija-ludo/src/audio/sfx.ts` (`roll`). Fix: drop the `playSfx('roll')` call at play.ts:215, or delete `ludoSfx.roll` |
| D-02 | minor (rule decision needed) | `make({stacks:'off'})`. Human seed on square 6, roll 4, c1 has two seeds on square 10. Apply the human move | Per README ("capture: landing on a lone opponent seed ... roll again") and `config.ts:15` ("Capturing a lone opponent seed earns another roll"): no bonus for a stack capture | Two seeds captured, `lastMove.again === 'capture'`, bonus roll granted. No test covers it. Probe failed: expected null, got 'capture' | `games/naija-ludo/src/rules/engine.ts:285-286` (`m.captures.length && s.rules.captureBonus`). Fix: require one victim (`m.captures.length === 1`), or change the wording in `rules/config.ts:15`, `README.md` and `en.json` `rules.capture.help`. Add an engine test either way |
| D-03 | minor | Grep for usage | No dead exports or unused assets | `startIndex` (`rules/board.ts:8`, never called, the cause of 87.5% funcs), `MAX_SLOTS` (`rules/config.ts:70`), `rulesKey` (`ai/eval.ts:89`), `BoardView.finish()` (`view/board.ts:63`, `:327`, never called by play.ts). Unused assets: `assets/agogo.svg` (template art), `assets/fx/confetti.svg`, `assets/fx/stripe-sweep.svg` (not in ship.json, unreferenced) | Delete, or wire up | As listed | as listed |
| D-04 | minor | Open `src/i18n/en.json` | Per brief sections 6 and 8, every Yoruba or Hausa line is flagged `_review` for a native speaker | `ludo.banter.baba-ade.win` ("Ẹ kú iṣẹ́! ...", en.json:82) and `ludo.banter.malam-sani.win` ("Madalla! ...", en.json:89) are plain strings. Their pcm lines are flagged | `games/naija-ludo/src/i18n/en.json:82, 89`. Fix: `{ "text": "...", "_review": true }` |
| D-05 | minor | Read the brief (sections 4, 7, 8) against the code | Brief deliverables used: home celebration (aso-oke stripe sweep and gele-ribbon confetti), 8 voice lines, music loops | The home rosette does pop (wired, `play.ts:250`). The aso-oke stripe sweep (`fx/stripe-sweep.svg`) and gele confetti (`fx/confetti.svg`) are never used and not shipped. The 8 voice mp3s are not referenced, and no voice is played. Music is the synth stand-in (documented in music.ts) | `games/naija-ludo/src/view/play.ts:250` (home pop, rosette only), `games/naija-ludo/assets/ship.json`, `games/naija-ludo/assets/audio/voice-manifest.json`. Fix: wire the stripe sweep and confetti on home or on a win, or record the deferral in the brief |
| D-06 | minor (SL-17 residue) | `grep -o '"localhost","127.0.0.1"' dist/naija-ludo/chunks/core-*.js` | No dev-only origin code in production | The `['localhost','127.0.0.1','[::1]']` branch is compiled in. It is inert at runtime (probes: 0 events), but it ships | `packages/core/src/portal/index.ts:44-67` (`devDefault()` is not constant-folded). Fix: wrap the local branch in a compile-time `__NAIJA_TEST__` guard so the literals are removed |
| D-07 | minor (test gap) | Read the loop in "cannot capture on a star square or on any start square" for idx 0: `from = (0-3+52)%52 = 49`, so the move goes 49 to 52 (home column) and never touches square 0 | The test checks square 0 (human and opponent start) | Square 0 passes vacuously. Fix: release from the yard with a 6 onto square 0 with an opponent lone seed there (the release lands on the start square and must not capture) | `games/naija-ludo/src/rules/engine.test.ts:209-222` |

## Needs human review

### Rules variants (decisions, not defects)
- Stacks default is `safe` (house rule). Brief the Lagos-style defaults at the phase exit.
- A 6 with no legal move still gives another roll (house choice; README says so).
- Exact roll to get home is on by default; three 6s forfeit is on by default; Quick mode ends at the first seed home by default.
- Capture bonus on a stack capture under `stacks: off` (D-02): choose the rule.

### Pidgin, Yoruba and Hausa copy (native review)
- 45 pcm lines flagged `_review: true` in `games/naija-ludo/src/i18n/pcm.json`: game.tagline; game.howto.1-6; legend.safe; legend.start; rules.note; rules.capture; rules.capture.help; rules.exact.help; rules.three; rules.three.help; rules.stacks; rules.stacks.help.safe; rules.stacks.help.block; rules.stacks.help.off; rules.quickFirst; rules.quickFirst.help; rules.autoMove; rules.autoMove.help; board.label; play.autoMove; play.forfeit; play.forfeitYou; results.home; persona.baba-ade.6; ludo.banter.funmi.{six, capture, home, forfeit, win}; ludo.banter.baba-ade.{six, capture, home, forfeit, win}; ludo.banter.malam-sani.{six, forfeit, win, lose}; rules.fast; rules.fast.help.
- 49 further pcm strings are unflagged drafts (rules, menu, results, and the pcm banter lines without a flag). They need the same native pass.
- Yoruba "Ẹ kú iṣẹ́" and Hausa "Madalla!" in en (D-04).

### Art and placeholders
- Hero art: `assets/thumb/*` are SVG placeholders. Portal thumbnails need `.webp` 512x512 and 1024x500 (60 KB each) from a human illustrator. They are not shipped yet.
- Persona portraits: shared placeholders (Funmi, Baba Ade, Malam Sani).
- Dice hands-cup is a placeholder.
- Greyscale and contrast check passes (`scripts/check-naija-ludo-art.mjs`: seed silhouettes distinct at 16 and 24 px, worst IoU 0.81 against a 0.85 threshold, grey difference at least 39/255). The shapes differ in the yards too (circle, diamond, square, triangle). Musician check still needed on a phone speaker: agogo `capture`, ogene `homeReached`.

### Music and voice
- Highlife (or juju) loops not composed. The silent `ludo-*.mp3` files are placeholders. The shipped synth loops are a stand-in (`src/audio/music.ts`). Composer delivery, at -16 LUFS, is required before release (MUSIC_BRIEF).
- The 8 voice lines (`vo-ld-*.mp3`) are not recorded and not wired (D-05).

### Cultural review (CULTURAL_GUIDE section 8)
- Regional balance: two Yoruba personas, one Hausa-Fulani persona, no Igbo or South-South persona in the cast. Igbo is present only in palette, pattern and SFX.
- Confirm that Funmi's banker background stays out of the copy (it does at present).
- Confirm the Yoruba and Hausa words (D-04) with native speakers.

### Real device
- Performance was measured in headless Chromium with CPU and network throttling only. A low-end Android (Tecno, Infinix, Itel, 2 to 3 GB) is needed for the 50 fps and touch checks.
- Shake-to-roll (`devicemotion`) is not verified on a device. The tap path works.
- Audio on a phone speaker (see the SFX note above).

### Test-run caveat
- The 10-minute soak reported PASS on heap and counters, but the test was marked failed by an artifact ENOENT at context close, caused by a concurrent scratch Playwright run clearing `test-results/`. Re-run `npm run e2e:soak -- naija-ludo` alone before release for a clean record.
