# QA report: _template + @naija/core (2026-11-07, commit 75a294c, branch core/foundation)

Verdict: **FAIL**

## Summary
- All automated gates pass (lint, typecheck, i18n, 112 unit tests, build, size, e2e 26/26 on mobile and 26/26 on landscape and desktop, perf, 3-minute soak). Core architecture is sound: portal bridge, storage, SW, lifecycle and audio all behave as specified under my independent probes.
- One major defect: the shared results screen overflows its stat tile ("Medium"/"Normal") at 360 and 375 px, in the default language and on the default difficulty. The e2e layout test does not detect text overflow.
- Several minor defects and doc inaccuracies (fonts lack Igbo U with dot below, voice manifest points to non-existent .ogg files, dead settings, no gate for the production test-hook strip, Pidgin lines needing review). Fix the major and re-run QA.

## Results table

| # | Item | Status | Evidence |
|---|---|---|---|
| 1a | lint (eslint + prettier) | PASS | `npm run lint` clean (my scratch files in tmp/qa tripped eslint during a run; removed, repo files clean) |
| 1b | typecheck | PASS | `tsc --noEmit` clean |
| 1c | i18n:check | PASS | OK; 5 `_review` lines listed |
| 1d | unit tests + coverage | PASS | 17 files / 112 tests. Statements 99.11, Branches 94.16, Funcs 97.46, Lines 99.11. `games/_template/src/rules` 100/100/100/100 (>= 90). Lowest: `sw/index.ts` 56% lines (registration body uncovered by unit tests; I covered it by browser probes, see 3) |
| 1e | build | PASS | `_template` built in production mode |
| 1f | size | PASS | game 75.8 KB gzip (72.9 br) vs 3072 KB; core code+css 18.1 KB vs 60 KB (fonts 50.3 KB counted in game total, not core; core+fonts = 68 KB would exceed 60 if fonts were counted: budget definition excludes them, see note W1) |
| 1g | e2e `_template` (375x812, 360x640) | PASS | 26 passed (18.2 s) |
| 1h | e2e:extra (landscape, desktop) | PASS | 26 passed (17.2 s) |
| 1i | e2e:perf | PASS | Fast-3G + 4x CPU: time to menu 1164 ms (<= 4000), fps avg 60, min 60, worst frame 16.8 ms, heap 1.8 MB |
| 1j | soak (SOAK_MINUTES=3) | WARN | 45 rounds, heap 0.0m 1.71 MB, 1.0m 1.92, 2.0m 1.95, 3.0m 1.98 MB; slope 28.8 KB/min (limit 100; developer's 10 min: 24 KB/min). Counters flat. A small constant positive slope persists; see D9 |
| 2 | Core audit | PASS (with minors) | See breakdown below |
| 3 | Service worker | PASS | Offline reload works (menu + lang kept); only 9 precached URLs, none contain `token`; refused registration (`register()` rejects), absent `navigator.serviceWorker`, and context with SW blocked all leave the game fully playable with 0 console errors; localStorage throwing also OK; planted `naija-_template-OLDVER` cache deleted on activate while `naija-other-game-v1` and unrelated caches were kept |
| 4 | Robustness | PASS (minor D8) | Hidden tab: loop frozen (timeLeft unchanged), pause dialog auto-opened, remains paused on show. Resize/orientation (375x812 -> 812x375 -> 360x640): screen/state intact, no new loops, no horizontal overflow. Real touch double-tap on Play: one round, one `start` event. Synchronous triple click on Play and double click on Pause: one round, one dialog. 5 replays through the UI with double clicks: counters constant at listeners 20 / timers 2 / rafs 1 every time. destroy() from play: 0/0/0. destroy() from menu/results within a second of load: listeners 0, rafs 0, timers 1 (loader fade timer; D8) |
| 5 | i18n | PASS (WARN on Pidgin quality) | Key parity enforced and proven (below). No hard-coded view strings (grep of textContent/aria-label/title/innerHTML: all go through `t()`, one dynamic `ui.${key}` / `difficulty.${d}` / `banter.*` family). `<noscript>` text in `games/_template/index.html:26` is hard-coded English (minor) |
| 6 | Test integrity | WARN | engine.test.ts change judged below; no other test/lint/budget weakening found (numstat since 1e4d388: engine.test.ts +4/-1, perf.test.ts +3/-1, ui-kit.test.ts +25/-1, rest additions; lint config, size budget, coverage thresholds unchanged; only `playwright.perf.config.ts` added to tsconfig) |
| 7 | Cultural/asset audit | WARN | See section below |
| 8 | UI screenshots | FAIL | D1 (results tile overflow). Other layout notes in D2, D10 |
| 9 | Single-player | PASS | Grep for pass-and-play, multiplayer, hide-hand, player count, invite, two-player: no hits in packages/games/tools/scripts. `_template` is a solo game (1 human vs timer/targets). No MSISDN anywhere (only the storage guard regex and its test) |
| 10 | Code health | PASS (minor D5, D6) | Largest source files: audio/engine.ts 335, instruments.ts 228, app.ts 218 lines (tests: e2e 348). No `any`, no ts-ignore, no ts-expect-error; one eslint-disable (no-console in a test, has a reason via env gate). Rollup constant-folding pitfall: production bundle verified directly (below) |
| 11 | CI workflows | PASS (minor D12) | check.yml and soak.yml read; correct node 22, `npm ci`, playwright install, artifacts on failure/always |
| 12 | Known gaps | see below | |

### Core module audit breakdown (item 2)
- **boot / loader / lifecycle**: `boot()` wires everything; `destroy()` verified (0 listeners/rafs; timers see D8). Loader tasks never block.
- **audio**: AudioContext count is 0 before any gesture and 1 (`running`) after the first tap (Chromium with `document-user-activation-required` policy). Sound/music persistence passes e2e. 20-voice polyphony cap, hidden-tab suspend. See W2 for master limiter.
- **i18n**: en + pcm bundles, fallback en then key. **Missing-key proof**: I copied scripts + i18n sources to a temp dir, deleted `game.bell` from `pcm.json`, ran the checker: `i18n check FAILED: _template: key "game.bell" missing in pcm.json`, exit 1 (temp copy deleted; repo untouched).
- **settings**: type-validated load, clamped volumes. `vibration` and `reducedMotion` are never read anywhere (D5).
- **storage**: `assertSafeKey` rejects digits >= 7, `token|msisdn|phone|mobile|auth|secret`; memory fallback verified with localStorage getter throwing.
- **portal bridge** (run in `tools/mock-portal.html` via `npm run mock-portal --dist dist-e2e`, cross-origin 4180 portal / 4181 game): event order panel shows `ready > start > score > level_complete > end  order OK`. Only one `postMessage` call exists (`portal/index.ts:81`) and it targets `p.portalOrigin`, never `*`. With `portal` param omitted: iframe src `?token=tok_demo&lang=en`, event list empty. Token only travels as `Authorization: Bearer` to `{portal}/api/games/_template/progress` (GET then PUT observed); it is not in any request URL I made, not in localStorage (only key `naija:_template:progress`), not in SW caches. Progress survived a reload via the API (best.medium 370). Note the token is of course in the game page URL as supplied by the portal (contract).
- **input, rng, loop, perf, test hook**: unit tests present and meaningful (rng determinism and state restore, loop fixed step, spiral cap, hidden auto-pause, input tap/swipe/keys). Test hook: `grep -r __naijaTest dist/` returns nothing; `dist-e2e` core chunk contains it. The game's own `autoplay` method does ship in the production index chunk (D5).
- **ui-kit**: radiogroup, dialog with Tab trap, Esc, focus restore all unit-tested; in the browser every interactive control measured >= 44x44 at 360x640, 375x812, 812x375 and 1280x800 (only the visually hidden native radio inputs are 1x1, by design).

### _template rules and difficulty (checklist items 2/3 adapted)
Engine tests: 100% coverage, determinism, serialisation, expiry, combo, stars. My probes (tmp/qa, deleted): 200 seeds x 3 difficulties with a perfect bot: always legal (no negative targets, never above `maxTargets`, positions in [0,1)), always wins. Difficulty measurably raises challenge. Serial-human model (one tap every `c` ms, +-30%), 200 seeds each, win rate:

| tap cost | easy | medium | hard |
|---|---|---|---|
| 850 ms | 100% | 100% | 88.5% |
| 950 ms | 100% | 100% | 1.5% |
| 1050 ms | 100% | 100% | 0% |
| 1500 ms | 100% | 46.5% | 0% |

Hard is clearly harder than Medium than Easy. Note a realistic 500-700 ms tapper wins every level, so Easy and Medium are effectively unlosable for an average player (design note, not a defect for a demo). Edge: `tick(s, -50)` raises `timeLeftMs` above the start value (negative dt is not clamped; the loop never produces it) (D13).

### Test integrity: engine.test.ts polyphony (item 6)
Diff: `expect(ctx.created.osc).toBeLessThanOrEqual(20)` became `<= 20 * oscPerVoice + oscPerVoice`, where `oscPerVoice` is measured from one real `agogo` play (FM bell = several oscillators per voice), after which that voice is ended. Judgement: the change is **justified, not a weakening of intent**. The old bound counted oscillators with a single-oscillator mock voice; with real instruments one voice creates many oscillators, so the old number was wrong. The `+ oscPerVoice` term accounts for the warm-up voice created before the 40-voice burst (total ever created = 1 warm-up + 20 allowed). It does, however, make the bound looser by one voice than necessary and it is derived from the implementation. A tighter correct assertion: snapshot `const base = ctx.created.osc` after the warm-up voice has ended, play 40 voices, then `expect(ctx.created.osc - base).toBeLessThanOrEqual(20 * oscPerVoice)`, and add `expect(active voices).toBe(20)` via a spy. WARN only.

### Cultural/asset audit (item 7)
- **Visual**: Rendered the 8 avatars, the 3 logos, icon sprite preview and 6 patterns (tmp/qa, deleted). Avatars: dignified, non-caricatured, varied skin tones (#3B2314 to #A8744C), kufi, hijab, gele and fila drawn as everyday dress; no masquerade/sacred/political symbols; no kente or kora; no generic pan-African savanna imagery. Patterns (adire, aso-oke, akwete, uli, arewa, ankara) are original and recognisable. Icons: 17 symbols present (the `coin` carries a naira sign, which Guide section 5 explicitly allows as cosmetic). The sprite file lists all 17.
- **Palettes**: 7 palettes; `contrast-check.mjs` reports `ALL PAIRS PASS` (text >= 4.5, non-text >= 3; lowest text pair 4.8+).
- **SFX** (`instruments.ts`, `core-sfx.ts`): every voice maps to a named Nigerian instrument or everyday sound: gangan talking drum (3 variants), agogo, ogene (+ring), shekere (3), udu, ekwe, danfo horn, crowd, referee whistle, kakaki/goje fanfare. No generic blip/coin/whoosh presets; "coin" cue is an agogo ting. Duration test: all SFX voices <= 0.3 s, long class (fanfare, ogeneRing, crowd) <= 1.5 s, `win` cue span ~1.43 s. Peaks (offline mirror renderer, not the real engine): single voices 0.28 to 0.41, cues up to 0.43, soft mix < 0.45; none clipped (W2 on overlap).
- **Music**: only a synthesised percussion pattern (ekwe/agogo/shekere, 96 bpm) is wired; the 11 `.mp3` files are 5 KB silent placeholders (honestly labelled "placeholder-silent"); `MUSIC_BRIEF.md` exists. Placeholder voice lines `vo-*.mp3` (29, silent).
- **Personas** (PERSONAS.md): 8 personas, regions Igbo x2, Yoruba x2, Hausa(-Fulani) x2, Ijaw, Urhobo; 4 women, 4 men; ages 20 to 60s. Banter is kind and everyday. Diacritics correct in the document: Ẹ kú iṣẹ́, Ẹ má bínú, Ọ dị mma, Ndo o, Madalla, Sannu, Haba, and all are flagged `_review` for native speakers. See Cultural review for judgement calls.
- **Fonts**: both OFL, licence texts present and logged. Real cmap coverage (I parsed the WOFF2 tables, 352 glyphs each): both fonts contain ẹ ọ ṣ ị ń à á è é ì í ò ó ù ú ā ē ī ō ū Ṣ Ẹ Ọ Ị ŋ ₦ and combining tone marks U+0300/0301/0304/0323. **Missing in Bungee**: Ɓ ɓ Ɗ ɗ Ƙ ƙ Ụ ụ Ǹ ǹ ʼ. **Missing in Nunito**: Ƙ ƙ Ụ ụ Ǹ ǹ ʼ. This is worse than STYLE_GUIDE states (it claims "full Yoruba and Igbo coverage" in Nunito and lists only ƙ Ƙ ǹ missing; Ụ ụ, the Igbo u-dot-below, is missing from both; Bungee also lacks the Hausa hooked letters). Impact on Hausa text: Ɓ Ɗ Ƙ and ʼ render in the system fallback font (Roboto-class on Android), which is visually inconsistent but legible; in Bungee headings (ALL CAPS) a fallback glyph will look noticeably off. Today's shipped content (en/pcm) is unaffected; the gap bites when `ig`/`ha` locales ship (D4).
- **CREDITS**: every file under `packages/core/assets` is non-empty and listed or covered by a row (fonts, patterns, avatars, icons, logos, tools, audio placeholders). `games/_template/assets/CREDITS.md` covers `agogo.svg`. No unknown licences. `ui-preview.html` and `patterns-preview.html` are dev-only; neither ships (dist contains 9 files).

### npm audit and known gaps (item 12)
- 13 advisories (11 moderate, 2 critical), **all dev-only transitive/dev tooling**: vitest (direct) and tinypool (critical: prototype pollution to RCE in worker options), @vitest/coverage-v8, @vitest/mocker, typescript-eslint (direct) with @typescript-eslint/eslint-plugin, parser, type-utils, typescript-estree, utils, plus glob, minimatch, test-exclude. `npm ls --omit=dev` shows the runtime has zero third-party dependencies (only `@naija/core`), so **none affects shipped code**. They matter for CI/dev machines only (do not run untrusted test code). Accepted as WARN.
- Portal API shape is an assumption: documented in code and README; mock implements it. Accepted, needs portal team confirmation (D7 note on 404).
- No real-device test: accepted for Phase 0, mandatory before release.
- `new-game`: ran `npm run new-game qa-probe` (created `games/qa-probe`, appended registry, copied e2e spec). `lint` (repo files), `typecheck`, `i18n:check`, 18 test files / 135 tests, `build` (2 games), `size` (each 75.8 KB) and `e2e -- qa-probe` (26 passed) all pass. The scaffold, `tests/e2e/qa-probe.spec.ts`, `dist/qa-probe` and `dist-e2e/qa-probe` were then deleted, `games/registry.json` restored byte-for-byte and `package-lock.json` confirmed unchanged (`cmp`). `git status --short` afterwards is empty. (The copied spec is template-specific, as known: acceptable, the scaffold prints a note to adapt it.)

## Defects

| ID | Severity | Steps to reproduce | Expected | Actual | Location |
|---|---|---|---|---|---|
| D1 | **major** | Open `_template` at 360x640 or 375x812, press Play, `__naijaTest.autoplay()` (or finish a Medium round) to reach Results (en or pcm) | Stat tile "Level" shows "Medium" (or "Normal") inside its tile with no overflow | Text is 98 px wide in a 77 px (360) / 82 px (375) tile (`scrollWidth 98 > clientWidth 77`), runs past the tile edge and is cut ("MEDIUN" in screenshot `tmp/qa/s-360x640-en-results-win.png`). Easy and Hard happen to wrap/fit. Default difficulty on the shared results component, reproduced in the default language, so it will hit every game. The e2e "layout" test only checks horizontal page overflow and tap size, not element overflow | `packages/core/src/styles/skin.css:137` (`.ng-stat__value`: Bungee at `--ng-fs-xl`, no `overflow-wrap`/shrink) and the 3-column grid in `ui-kit/results.ts` |
| D2 | minor | 360x640, open menu (en or pcm) | All controls reachable without scrolling or at least visible (Sound/Music/Language) | Page height 737 px (en) / 754 px (pcm) in a 640 px viewport; the settings bar starts at y = 641, entirely below the fold. In landscape 812x375 the results screen is 545 to 575 px high and how-to 446 px, so Play again and Got it need scrolling | `.ng-screen` layout in `skin.css:5` |
| D3 | minor | `npm run test -- --coverage` (the form in the QA checklist) | Runs | Fails: `Expected a single value for option "--coverage", received [true, true]` because the script is already `vitest run --coverage`. `npm test` alone works | `package.json` scripts.test |
| D4 | minor | Inspect STYLE_GUIDE section on fonts and CREDITS | Documentation matches the fonts | Claims "Full Yoruba and Igbo coverage" and only ƙ Ƙ ǹ missing in Nunito. Reality: Ụ ụ missing in both fonts; Bungee also lacks Ɓ ɓ Ɗ ɗ Ƙ ƙ; U+02BC missing in both. Needs a font subset update (add Ụ ụ Ǹ ǹ Ɓ ɓ Ɗ ɗ Ƙ ƙ ʼ, or choose a display face with Hausa support) before `ig`/`ha` locales ship | `docs/assets/STYLE_GUIDE.md:95-100`, `packages/core/assets/fonts/*.woff2`, CREDITS font row |
| D5 | minor | grep production bundle and settings | No test-only code in production; no unused settings | (a) The `__naijaTest` strip depends on Rollup folding `__NAIJA_TEST__` and nothing in `npm run check`/CI asserts it (the developer already hit this pitfall once); the game's `autoplay` function body also ships in `dist/_template/chunks/index-*.js`. (b) `settings.vibration` and `settings.reducedMotion` are stored and persisted but read by no code (dead; CSS uses the media query only) | `scripts/build-all.mjs` (no post-build grep), `packages/core/src/settings/index.ts:11-12,22-23`, `games/_template/src/app.ts` autoplay |
| D6 | minor | Read `packages/core/assets/audio/voice-manifest.json` | Every `files` path exists | All 29 entries list a `.ogg` sibling (`voice/vo-*.ogg`) that does not exist (only `.mp3` placeholders exist); CREDITS lists mp3 only. No `review` field marks the Yoruba/Igbo/Hausa lines (`vo-e-ku-ise`, `vo-o-di-mma`, `vo-madalla`) as needing native-speaker check (PERSONAS.md does) | `voice-manifest.json`, `CREDITS.md` |
| D7 | minor | Mock portal with a token that has no saved progress; open DevTools | No console errors on first load | First `GET .../progress` returns 404 and Chrome logs `Failed to load resource: ... 404` at error level, which counts against the "0 console errors" budget with a real portal following the documented contract (`GET -> 404`). Prefer 200/204 with `{data:null}`, or document it. Also the bridge sends the Bearer token to **any** `portal` origin given in the URL: consider an allow-list (e.g. `*.gamesplash.com.ng`) as hardening | `packages/core/src/portal/index.ts` load path; README contract |
| D8 | minor | Load the game, immediately (< 400 ms) call `destroy()` from menu | `counters()` = 0/0/0 | `{listeners:0, timers:1, rafs:0}`: the loader's 400 ms fade timer (`loader/index.ts:87`) is registered in a scope that destroy() does not own; it self-clears so there is no persistent leak. The e2e destroy assertion only passes because it destroys after 4 rounds | `packages/core/src/loader/index.ts:85-87` |
| D9 | minor | 3-minute soak | Flat heap | Slope +24 to +29 KB/min steady (inside the 100 KB/min limit). One identified unbounded growth: `portal.log` grows by every emitted event for the lifetime of the page in production too (~4 events per round); cap it or keep only in test builds | `packages/core/src/portal/index.ts:58-ish` (`log.push`) |
| D10 | minor | View pause modal and toasts | Secondary buttons and toast kinds clearly distinguishable | "Restart" in the Pause dialog is white on white with only a drop shadow (no border/contrast edge, unlike "Quit"); toast `good`/`bad` is differentiated only by a left colour stripe (no icon or text cue). HUD labels "TIME BELLS" sit with almost no gap at 360 px | `skin.css` modal/btn rules; `toast.ts` |
| D11 | minor | Read README | Accurate | README says core is "about 16 KB"; measured 18.1 KB. `<noscript>` message hard-coded English | `packages/core/README.md:5`, `games/_template/index.html` |
| D12 | minor | Read check.yml | CI runs every gate used here | `npm run check` (and so CI) runs `e2e` and `e2e:perf` but not `e2e:extra` (landscape/desktop), so those specs can regress unnoticed. `sw/index.ts` (registration, 56%) has no unit test for refusal paths; only my probes exercised it | `package.json` scripts.check, `.github/workflows/check.yml` |
| D13 | minor (trivial) | `tick(createGame('easy',1), -50)` | Reject or clamp negative dt | `timeLeftMs` becomes 30050 (time gained) | `games/_template/src/rules/engine.ts` `tick` |

### Warnings (not defects)
- W1: Core budget excludes the two fonts (50 KB gzip). If the 60 KB core target is meant to include fonts it is exceeded (68 KB); clarify the budget definition in the plan.
- W2: The master bus has no limiter/compressor and the "never clips" test uses an offline mirror model of the engine (not the real Web Audio graph). Single cues peak <= 0.43, but 3 to 4 overlapping cues (rapid coin hits with music) can sum above 0.9 on a device. Add a DynamicsCompressorNode on master or test against `OfflineAudioContext` in the e2e.
- W3: Cache-first SW with version-keyed cache: after a deploy, a returning player's first load can still serve the previous build (the new SW takes over after install). Acceptable, but confirm desired behaviour.
- W4: `.prettierignore` skips `instruments.ts`, `core-sfx.ts`, `styles/`, `assets/` and coverage excludes `instruments.ts`/`core-sfx.ts`; both were in the first core commit (not a later weakening) and the instrument files are covered by the offline-render test.
- W5: `npm audit`: 13 dev-only advisories (see item 12).

## Needs human review

### Pidgin lines (`_review: true`, plus unflagged ones I judge)
Flagged by the developer:
- `difficulty.hard` = "Hard Well Well": natural, fine.
- `results.stars` = "{n} star out of 3": grammatical but not idiomatic ("{n} star for 3"?), and "star" is singular for n > 1.
- `game.howto.4` = "If you dey use keyboard, press Space to hit di oldest bell, P na to pause.": "P na to pause" is not grammatical; should be "na P dey pause am".
- `banter.win.0` = "Your hand quick pass danfo conductor.": idiomatic and fine.
- `banter.lose.2` = "Calm down. Di bells no go run anywhere.": fine, but "Calm down" may read as dismissive.
Unflagged, my view:
- "Oya, Play" (ui.play), "Comot" (quit), "Run am again", "Easy Easy", "Normal": natural.
- "How e hard reach" (ui.difficulty): awkward; "Wetin be di level?" / "Level" reads more natural.
- `game.howto.1` "bells go dey show for screen": "go dey" mixes future and progressive; should be "dey show" / "go show".
- `game.howto.2` "...before time finish and you don win": "don win" is past perfect (already won); should be "you go win".
- `results.win` "You win! Chai!": "Chai" is usually dismay or awe; the voice manifest uses "Chai!" for "Oh no!". Using it on the win screen is ambiguous. Native review needed.
- Mixed "di" (Pidgin) with "the/they" and English UI nouns ("Combo", "Score") throughout: consistent enough but have a Pidgin speaker confirm register.
- `banter.lose.0` "Even NEPA dey bring light back": NEPA is dated (PHCN/DisCos) but universally understood.
- PERSONAS.md pcm lines flagged there (Haba, Sannu, Omo, Ndo, Madalla, Ẹ kú iṣẹ́, Ẹ má bínú, Ọ dị mma) need native-speaker sign-off including tone marks.

### Cultural review (human)
- Persona archetypes: Mama Nkechi (Igbo, mama-put canteen, food/hospitality banter) combines an Igbo-trader and "market mama" association and is also the default guide in `_template`; Funmi (Yoruba, banker, "interest on my seed"; money/competitive) and Efe (Urhobo danfo driver) are recognisable occupations. None is derogatory, but a human should confirm they do not read as ethnic tropes (PERSONAS.md says personalities are individual). Both northern personas (Malam Sani, Aisha) are Muslim-coded by dress while no southern persona carries any religious marker; confirm the balance is intended.
- Regional coverage: no persona from the Middle Belt (Tiv, Nupe, Idoma...), Edo, Efik/Ibibio, Kanuri. Igbo/Yoruba/Hausa dominate (6 of 8). Decide whether to rebalance.
- Synthesised "kakaki + goje" fanfare, ogene and gangan voices are FM/subtractive approximations; a Nigerian musician should listen. The talking-drum "rising = go, falling = no" semantic is a design convention, not a real tonal meaning; confirm it is not misleading.
- Logo: green dice-face mark, with Ludo and Whot in the catalogue; confirm with telco content rules that a dice mark does not read as gambling.
- Avatar and logo art are placeholders to be replaced by a human illustrator (HUMAN_ASSETS.md); music and voice are silent placeholders awaiting composers/voice actors.
- Adire/akwete/uli/arewa pattern fidelity needs an artist's eye (patterns are "inspired by", not copies).

### Other
- Real-device test (Tecno/Infinix/Itel, 2 to 3 GB RAM, real mobile data): not done, required before release. Throttled-Chromium numbers (60 fps, 1.16 s to menu) are an optimistic proxy.
- Listening test of every SFX on a phone speaker for loudness and timbre.
- Portal team must confirm API shape (`/api/games/{slug}/progress`, Bearer, 404 vs empty) and the allowed `portal` origin(s).
- Confirm the 10-minute soak with the corrected `portal.log` cap (D9) to see whether the residual 24 KB/min slope disappears.

## Evidence files
Scratch files and screenshots were created under `tmp/qa/` and then deleted; `games/registry.json`, `package-lock.json` and git status verified unchanged after the `new-game` probe.
