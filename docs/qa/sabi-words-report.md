# QA report: sabi-words (2026-11-09, commit 7aefb72, QA round 2)
Verdict: FAIL

## Summary
- All automated gates pass: lint, typecheck, 844/844 tests (rules coverage 99.85% lines), build, size (117.9 KB gzip of 3072 KB), e2e 70/70 at 375x812 and 360x640, e2e:extra 70/70 at 812x375 and 1280x800, perf (time to menu 1.64 s, fps 59.7 average), and a 10.03-minute soak (212 rounds, 0 rescues).
- The round-1 filler-accident defect (SW-01) is fixed for the 14 strings it named: 0 hits in 16,200 generated grids. The generator guarantee holds (constructed cross-word and 5+ tests pass). But the blocklist still misses slurs, sexual terms and gambling words that appear in grids (SW-19, major), so the content gate stays open.
- Diacritics (SW-05) are partly fixed: 25 display forms carry marks, but several Yoruba and Igbo forms still have none (SW-05 reopened, major). The rotation fix (SW-04) is still not complete: after a pause-then-rotate the round resumes at 23 px with no notice (SW-04 reopened, major). Ten round-1 items are fixed, and two are partial.

## Results table

| # | Item | Status | Evidence |
|---|---|---|---|
| 1a | `npm run lint` | PASS | Clean after scratch files were removed from the repo |
| 1b | `npm run typecheck` | PASS | `tsc --noEmit` clean |
| 1c | `npm run test:cov` | PASS | 71 files, 844/844 tests. `games/sabi-words/src/rules`: lines 99.85%, branches 97.42%, functions 98.36% |
| 1d | `npm run build` | PASS | 7 games built. prod-gate OK: 49 files, no test hook or autoplay |
| 1e | `npm run size` | PASS | sabi-words 117.9 KB gzip (109.6 KB brotli) against 3072 KB. Core 24.0 KB against 60 KB |
| 1f | `npm run e2e -- sabi-words` | PASS | 70/70 at 375x812 and 360x640 |
| 1g | `npm run e2e:extra -- sabi-words` | PASS | 70/70 at 812x375 and 1280x800 |
| 1h | `npm run e2e:perf -- sabi-words` | PASS | Time to menu 1640 ms (limit 4000). fps average 59.7, minimum 58 over 1 s windows. Core hook avg 60, min 60. Heap after run 2.11 MB |
| 1i | `npm run e2e:soak -- sabi-words` (10 min, run alone) | PASS, with WARN-5 | 10.03 min, 212 rounds, slowest round 3.5 s, 0 rescues, 0 host sleep. Heap 1.94 MB at start, 2.50 MB at 10 min. Harness slope 13.9 KB/min (limit 100) |
| 2 | Rules against GAMES.md and the brief | PASS, with defects | Profiles 8x8/6/3 min, 10x10/8/4 min, 12x12/10/5 min (`src/rules/config.ts:43-71`). Engine tests cover stars, hints and coins. Rotation defect: DEF-02 |
| 3 | AI and legal moves | N/A | Solo game, no CPU opponents. Legal-move probe from round 1 not repeated. Generator legality covered in item W1 |
| 4 | Playthrough and screenshots | PASS, with defects | Screenshots at 360x640, 375x812, 812x375 and 1280x800 (en and pcm for menu, how-to, packs). 360x640 Hard play screen inspected: word slip, Osas bubble below the slip, readable coin plate. Defects: DEF-02, DEF-07 |
| 5 | Performance (4x CPU, Fast 3G) | PASS | See 1h and 1i |
| 6 | Robustness | FAIL (DEF-02) | Rotation mid-round keeps the puzzle, found words and clock (tested). Pause-then-rotate: no notice after Resume (DEF-02). Earlier round-1 probes for pause, tab hide, double tap and offline were not repeated; the e2e suite covers them and passed |
| 7 | i18n | PASS, with defects | en 85 keys = pcm 85 keys. No hard-coded UI strings in `src/view` and `src/app.ts`. 81 `_review` lines. Unflagged Pidgin: DEF-11. Core Pidgin labels: DEF-10 |
| 8 | Portal and privacy | PASS (not re-run this round) | Portal e2e tests passed in both e2e runs. Diff since round 1 touches no portal code |
| 9 | Single-player | PASS | Solo round, one human seat. No pass-and-play or multiplayer code (round-1 grep unchanged in diff) |
| 10 | Cultural authenticity | FAIL (DEF-03) | SFX: every cue maps to a core Nigerian voice (ekwe, agogo, ogene, udu, shekere, talking drum, kakaki-goje fanfare). Diacritics partly fixed: DEF-03 |
| 11 | Content and compliance | FAIL (DEF-01) | Blocklist gaps in grids: DEF-01 |
| 12 | Code health | PASS | `words-art.css` now 323 lines (was 558). `gen-sabi-words-art.mjs` 390 lines (was 421). `app.ts` 392. No `any` or ts-ignore in sabi-words source. No eslint-disable |
| W1 | Generator, 6 packs x 3 levels x 300 seeds (5,400), step-down (1,800), generateWithFallback at own and step-down sizes (9,000): 16,200 grids | PASS, with WARN-3 resolved | 0 filler-made hits for the 14 round-1 strings. 0 cross-word hits. 0 duplicate words. 0 nondeterministic repeats. 1 failure in 16,200: football-terms Hard 8x8 seed 54 via `generatePuzzle` (the app path uses `generateWithFallback`, which gave 0 failures in 9,000 grids) |
| W2 | Constructed generator probes | PASS | Cross-word: QZX formed only across two placed words, 300 seeds, 0 emitted (max 2 attempts). Embedded: QZX inside word AQZXY, 300 seeds, 213 grids with it inside the word, 0 outside. 5+ rule: a word holding a 5-letter blocked string, 100 seeds, never placed |
| W3 | Packs | PASS, with WARN-4 | `packs:check` passes. `check-sabi-words-pack.mjs` passes (see the judgement under DEF-01). Pack words containing a shipped-list string: 6 embedded words (BRASS, PASS, ASSIST, CASSAVA, STITCH, SUBSTITUTE), listed under WARN-4. No pack word holds a 5+ blocked string |
| W4 | Controls, levels, clock, Daily, bundle, pack failure | PASS (see round-1 record) | Unchanged in this round's diff except as listed in the table |

## Defects

**DEF-01 · major · content and compliance (blocklist gaps; reopens round-1 SW-01)**
- Steps: generate every shipped pack at easy, medium and hard, seeds 1 to 300 (probe: 5,400 grids). Scan all 8 directions for these strings, counting occurrences that use a filler cell.
- Expected: no sexual, slur, gambling or drug term appears in a grid. The brief section 5 scope includes sexual and body terms, slurs (racial, ethnic, religious, sexuality), drug and gambling words.
- Actual, filler hits in 16,200 grids: ANAL in 182 puzzles, JEW 205, WOP 296, GYP 128, DAGO 80, CLIT 17, MILF 4, SEMEN 2, BOOTY 2, ORAL 120 (judgement: sexual sense), GAY 741 (judgement: sexuality term, mostly neutral), BET 881 (gambling-adjacent, judgement), SLOT 34, DICE 32, ODDS 24, STAKE 7, WAGER 2, POKER 1, GUN 585 (violence, judgement), COKE 32, DRUG 13, HEMP 10, AKATA 21, OLODO 5, SHEGE 3. Each is absent from the 168-entry list. None is embedded in a shipped pack word except BALOGUN, ENUGU, OGBETE, AJEGUNLE, OREGUN, OGUN (GUN), OGBETE (BET), KEEPER and GOALKEEPER (PEE), TRAFFIC (FART reversed). Those are safe to block because a 3-4 letter string may sit inside a word.
- Required: add at least ANAL, CLIT, MILF, JEW, WOP, DAGO, GYP to every pack `blocklist` and to `MIN_BLOCKLIST`. Native and cultural reviewers decide GAY, ORAL, BET, GUN, COKE, DRUG, AKATA, OLODO, SHEGE. Add a regression test that asserts this extended list never appears outside a placed word.
- File: `games/sabi-words/src/rules/blocklist.ts:8-57` (MIN_BLOCKLIST); each `games/sabi-words/assets/packs/*.json` `blocklist` array (168 entries, identical in all six packs).
- Judgement on the relaxed rule (`scripts/check-sabi-words-pack.mjs:91-101`, `games/sabi-words/src/rules/generator.ts:130-136`): the relaxation is justified and does not weaken the filler guarantee. The brief section 5 already says short strings inside real pack words are left out on purpose, and the generator's filler scan is the guard. The guard holds: 0 filler hits over 16,200 grids with the original 14 strings, 0 cross-word hits, and the constructed QZX probes pass. The embedded cases are real words where a 3-4 letter string sits inside the word: PASS and BRASS (ASS), ASSIST (ASS), CASSAVA (ASS, shipped in naija-food), STITCH (TIT, TITS), SUBSTITUTE (TIT, TITS). A player sees only the whole word. The relaxation does weaken one thing: a future reviewed pack word can embed a 4-letter string such as PEDO. This is acceptable with a human check on each embedded word, which the checker already lists (`--uncertain`). I recommend keeping the relaxation.
- Also: the built-in floor (`MIN_BLOCKLIST`) is not checked against pack words by the checker. See DEF-09.

**DEF-02 · major · layout and rotation (reopens round-1 SW-04)**
- Steps: 375x812 portrait, Hard, start a round, swipe one word. Rotate to 812x375: the Tight-fit notice appears (correct). Press Resume: the round continues with cells of 23 px (measured). Rotate back to portrait: cells return to 27 px and the notice does not appear (correct).
- Second path: 375x812 Hard, tap pause, rotate to 812x375. The pause dialog stays and no Tight-fit notice is raised (the code skips it because a modal is open). Press Resume. The round continues at 23 px with no notice and no step-down.
- Expected: a 12x12 grid that cannot reach 26 px cells is never drawn silently. Round-1 expected either a step-down to 10x10 or a locked orientation. The brief section 2 sets 25 px as the recommended cap for 12x12.
- Actual: as above. The Continue path (DEF-02a) is a player's explicit choice with the notice, so it is a minor policy point (WARN-2). The pause path (DEF-02b) is a silent tight grid.
- File: `games/sabi-words/src/view/play.ts:243-263` (resize handler: `if (tight && !modal && !over)` skips the notice when a modal is open), `play.ts:210-216` (`thaw()` resumes without re-checking the fit). Fix: when a pause or tight modal closes, re-run `fitsBox` and raise the notice if it still does not fit, or step the grid down (`fitGrid`) on the next round, or lock the orientation.

**DEF-03 · major · cultural (diacritics; reopens round-1 SW-05, partly fixed)**
- Steps: list every `display:` tag and every Yoruba, Igbo and Hausa word in the six packs.
- Expected: Yoruba, Igbo and Hausa words carry correct diacritics (cultural guide: "always with correct diacritics").
- Actual, fixed: 25 display forms now carry marks, for example Àsáró, Ẹ̀gúsí, Àmàlà, Èbà, Ògì, Ọ̀dọ̀gwù, Lagbájá, Adìrẹ, Gèlè, Ìró, Ìrókò. Most are plausible; tone marks are missing on some (Efọ riro, Adìrẹ for Àdìrẹ), which needs native review.
- Actual, still unfixed, Yoruba or Igbo forms with no marks: Akamu (àkàmù), Garri (gàrí), Agidi (àgídí), Adalu (àdàlù), Tatashe (tátáṣé), Ponmo (pọ̀nmọ̀), Rodo, Okpa (ọkpa, Igbo), Ofada rice (ófádà), Omo (ọmọ, in the Pidgin pack). Hausa: Danwake should be Ɗanwake. The hooked letter is not added because the checker strips non-A-Z characters (`scripts/check-sabi-words-pack.mjs:82-89`) so Ɗ fails the "display starts with the word" test. Fix the checker to fold hooked letters to their base letter (Ɗ to D, Ƙ to K, Ɓ to B), then add the marks.
- File: the `tags` arrays in `games/sabi-words/assets/packs/naija-food.json`, `pidgin-words.json`, `cloth-markets.json`, `lagos-places.json`. The checker at `scripts/check-sabi-words-pack.mjs:82-89`.
- Place names in English spelling (Ojuelegba, Idumota, Iyana Paja) are a policy call: human review.

**DEF-04 · minor · layout (not re-verified, round-1 SW-07)**
- Status: code adds `padding-top: max(92px, env(safe-area-inset-top))` to `.sw-error` (`games/sabi-words/src/style.css:396-398`). The screenshot probe of the error screen failed on a script error (test.use inside a test), so the visual check is outstanding. Mark WARN until a screenshot confirms the heading clears the awning.

**DEF-05 · minor · test quality (new)**
- The test named "two placed words crossing so that they spell a blocked string is rejected, not shipped" (`games/sabi-words/src/rules/generator.test.ts:230-237`) runs with the built-in floor only and never builds a crossing. It proves nothing about crossings. Replace with a constructed pack (for example blocklist QZX, words AQZ and XBC) that asserts no QZX in 300 seeds.

**DEF-06 · minor · checker gap (new)**
- `scripts/check-sabi-words-pack.mjs` validates only the pack's own blocklist. A pack word containing a 5+ letter built-in string (for example DILDO, HITLER, TERRORIST) is silently dropped by `unsafeWord` at runtime, which can later cause "too few words". No shipped word is affected today (probe: no 5+ built-in hits). Add the built-in list to the checker.

**DEF-07 · minor · layout (round-1 SW-03, fixed; new note)**
- Fixed: the bubble now sits in its own row below the word slip (`games/sabi-words/src/view/play.ts:115-116`, `style.css:219-260`). Measured at 360x640 Hard en and pcm, 375x812 and 1280x800: 0 words overlapped by the bubble.

**DEF-08 · minor · coins contrast (round-1 SW-02, fixed)**
- Fixed: `.sw-coins` has a dark plate (`games/sabi-words/assets/words-art-ui.css:53-59`). Measured digit colour rgb(255, 241, 220) on plate rgb(58, 14, 6) at 360x640, 375x812, 812x375 and 1280x800.

**DEF-09 · minor · core copy (round-1 SW-13, still open)**
- `packages/core/src/i18n/pcm.json:28` "Easy Easy", `:30-31` "Hard Well Well", `:29` "Normal", `:38` "E nearly be! Try again!". These show on the menu picker and results in Pidgin. Fix in core.

**DEF-10 · minor · i18n (round-1 SW-12, mostly fixed)**
- The 10 round-1 keys are now flagged `_review`. Still unflagged in `games/sabi-words/src/i18n/pcm.json`: `menu.howto` ("How to play", identical to en). Flag it or write Pidgin.

**DEF-11 · minor · fact (round-1 SW-14, fixed)**
- FLEX hint now reads "To show off, or to act with style" (`games/sabi-words/assets/packs/pidgin-words.json`). Native review still required.

**DEF-12 · minor · SFX (round-1 SW-10, fixed)**
- `star`, `coinEarn` and `scoreTick` are now played (`games/sabi-words/src/view/resultcues.ts:22-31`, called from `app.ts:324`). The SFX test checks that every cue appears in game code (`src/audio/sfx.test.ts:67-80`).

**DEF-13 · minor · hint double tap (round-1 SW-16, fixed)**
- 400 ms guard (`games/sabi-words/src/view/play.ts:166-170`). The e2e "double tap spends once" test passes.

**DEF-14 · minor · results (round-1 SW-08 fixed, SW-09 fixed)**
- At 375x812 on a won round, SCORE and BEST tiles end at y=449. The sticky actions start at y=668. At 812x375 the layout is unchanged from round 1 (not re-measured). SW-09: accuracy returns 0 when nothing was swiped (`games/sabi-words/src/rules/engine.ts:148-149`).

**DEF-15 · minor · credits and first paint (round-1 SW-15, fixed)**
- The `agogo.svg` row is gone from `games/sabi-words/assets/CREDITS.md`. `index.html` theme colour is `#430e07` (the market wall colour) at lines 6 and 17.

**DEF-16 · minor · dead code and length (round-1 SW-11 and SW-17, fixed)**
- `clearHint`, `selectionLength` and `solveAll` have no references. `words-art.css` is 323 lines.

**DEF-17 · minor · error console (round-1 SW-06, documented)**
- The browser logs one "Failed to load resource: 404" line when a pack is missing. `games/sabi-words/README.md:106-115` documents it as a browser-only exception. The e2e spec filters only that text (`tests/e2e/sabi-words.packs.ts:55`). Accepted as a documented exception.

**DEF-18 · minor · brief drift (new)**
- `docs/assets/sabi-words-brief.md` section 5 says the blocklist has 149 entries. The packs carry 168. Update the brief.

## WARN (not defects)
- WARN-1: portal token in the game URL (`?token=`), as in round 1. Portal team to confirm.
- WARN-2: Continue at a tight fit draws 12x12 at 23 px (DEF-02a). The notice says so. Tiles below 44 px were accepted in round 1 with real-device check.
- WARN-3: resolved in practice. `generateWithFallback` gave 9,000 of 9,000 grids with no failure. The raw `generatePuzzle` still fails once in 16,200 (football-terms Hard 8x8 seed 54).
- WARN-4: pack words containing a blocked string (embedded, allowed): BRASS (ASS), PASS (ASS), ASSIST (ASS), CASSAVA (ASS), STITCH (TIT, TITS), SUBSTITUTE (TIT, TITS). Human review, see DEF-01.
- WARN-5: heap rose from 1.94 MB to 2.50 MB over 10 minutes (slope 13.9 KB/min). The harness limit is 100 KB/min, so it passes, but a flat tail is the goal. Re-run a 30-minute soak before release.
- WARN-6: the 'Hausa hooked letters' decision is in DEF-03.
- WARN-7: `packs:release-check` fails on 417 unreviewed words. Expected: human task.

## Needs human review
- Blocklist decisions in DEF-01 (GAY, ORAL, BET, GUN, COKE, DRUG, AKATA, OLODO, SHEGE, OYINBO).
- Embedded words in WARN-4.
- Diacritic tone marks and the Yoruba and Igbo forms in DEF-03. Place names in English spelling.
- Pidgin: all `_review` lines, plus `menu.howto`, FLEX, DASH ("To give something freely, or the thing given"), SHARP.
- Cultural review: the greeting "Kóyo!" (Yoruba-looking, Edo persona), the adire head tie on Osas (an Edo persona wears a Yoruba textile), LAGBAJA (a real performer's stage name), food hints with animal parts (goat-head, cow-foot), 81 `uncertain` pack words.
- Music: the brief's three Afrobeats loops are not delivered. Synth stand-ins play. The per-game row asks for light Afrobeats. A composer is needed.
- Voice: 11 voice lines are silent placeholders. Osas avatar is a placeholder.
- Real device: 360x640 tile sizes and the tight-fit flow on Tecno, Infinix or Itel; audio on phone speakers; the settings bar contrast (round-1 SW-18, not re-verified this round).
