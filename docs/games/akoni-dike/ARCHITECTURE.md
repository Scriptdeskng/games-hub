# Akọni & Dike: Architecture (Phase A0 design)

Status: A0 design for owner review. Nothing here is gameplay code. What A0 actually built (content
schemas and validators, release gate, size rules) is marked **[built]**. Everything else is a
proposal for A1 and is marked **[A1]**.

Split to stay under 400 lines: `PACKS.md` holds sections 3 to 6 and `QUIZ.md` section 7 (numbers unchanged).
Binding specs: `SCRIPT.md`, `LEARNING.md`, `ASSET_BIBLE.md`,
`CLAUDE.md`, `docs/IMPLEMENTATION_PLAN.md` ("Priority override", "Phase A", the four added DoD items).

## 1. Decisions that need the owner's call

| # | Decision | Recommendation | Why |
|---|---|---|---|
| D1 | Pack ids and folders | `packs/chNN/`, NN fixed per chapter: Moremi `ch00`, Kiriji `ch01`-`ch06`, Ekumeku prologue `ch10`, Ekumeku `ch11`-`ch16`. `ch01` is NOT a pack (first chapter ships in the initial download) | stable ids survive re-ordering; leaves room for skirmish packs |
| D2 | Pack catalogue | Embed the catalogue (id, hashed file names, sha-256, sizes) in the built JS. A content-only fix needs a game redeploy | atomic with the engine version: a pack can never meet an engine that cannot read it. A remote revalidated `packs-index.json` is a later option (section 5.7) |
| D3 | Offline store | Cache API (`caches`), one version-independent cache `naija-packs-akoni-dike-v1`, driven from the page, with the SW serving from it. No IndexedDB | one store, works the same with or without SW control, needs no schema migrations |
| D4 | Release gate scope | Strict: ANY `reviewed:false` under `games/akoni-dike/content` fails a release build, including chapters whose feature flag is off | matches the DoD wording. Moremi drafts that are not reviewed must live outside `content/` (e.g. `content-drafts/`) |
| D5 | Native-review flags in release | Reported, not blocking (`native_review:true`, `diacriticChecked:false`) | the DoD gates `reviewed`; native review is a separate human sign-off. Easy to make blocking |
| D6 | Hub | Apply the same size exception to `scripts/hub-lib.mjs` (it hard-codes 3 MB per game folder) by importing `size-lib.mjs`; keep `deploy:false` for `akoni-dike` until the owner approves | otherwise `build:hub` would reject the game the moment it is deployable |
| D7 | Shared art/audio | Anything used by 2+ chapters (hero sprites, UI frames, common SFX, shared enemy sets) lives in the initial download, never in a pack. Packs never import from other packs | keeps packs independently cacheable and evictable |
| D8 | Difficulty names | Story = easy, Warrior = medium, Legend = hard, mapped onto core `ai-kit` profiles | one vocabulary for sim tests and the DoD "difficulty must raise the challenge" rule |
| D9 | Simulation rate | 60 Hz fixed step by default; allow 30 Hz sim with interpolated render on devices that miss 50 fps (auto-detected by `perf`) | protects the 50 fps DoD on 2 GB phones |
| D10 | Build tooling | The `content:*` scripts bundle the TypeScript gate in memory with `esbuild`, now a declared devDependency (it was only a transitive Vite dependency; same version 0.28.2, no new package installed, lockfile +1 line) | avoids a second copy of the validators in `.mjs` |
| D11 | `content:release-check` with no `content/` folder | It PASSES with the message "games/akoni-dike/content not found, nothing to check" (exit 0), in release mode too | A0 ships no content, and `npm run check` must stay green. Risk: a mistyped path or a deleted folder passes a release check silently. Mitigation **[A1]**: once `packs.json` declares a pack, or the registry entry becomes `deploy:true`, a missing `content/` must FAIL (a 2-line change in `scripts/content-gate.ts`, with a test). Owner may prefer to make it fail from day one |
| D12 | Size model for shared and audio assets | **Open, owner decides** (`PACKS.md` section 3.1): options A, B, C | the asset brief and D7 disagree; the A1 slice is not affected, A2 asset production is |

## 2. Content layer **[built]**

### 2.1 Layout

```
games/akoni-dike/
  packs.json                      declared chapter packs (size rules, section 3). Empty until A1
  features.json                   { "features": { "moremiPrologue": false } }
  content/
    chapters/<chapter-id>.json    ChapterManifest   (one per chapter)
    dialogue/<chapter-id>.json    DialoguePack      (scenes -> lines)
    learning/<chapter-id>.json    LearningPack      (facts, sources, twoSides, pins, checks)
    glossary/<campaign>.json      GlossaryPack      (campaign or "shared")
    guardrails.json               optional override merged over the built-in guardrail defaults
```

`content/` does not exist yet, so `npm run content:check` and `content:release-check` print "nothing to check" and pass (decision D11).
The fixtures (Kiriji 1 skeleton, `packages/core/src/content/story/fixtures.ts`) are used by tests only.

### 2.2 Documents and schemas

| Schema file (`packages/core/content/schemas/`) | TypeScript validator (`@naija/core/content`) | Holds |
|---|---|---|
| `chapter-manifest.schema.json` | `validateChapter` | id, campaign (`kiriji` `ekumeku` `moremi-prologue`), order, title, tag, goals (1-4), environment, hero, companions, cast, battle objectives, hero-moment type, `dates` (+ optional `sourcesDisagree`), dependencies, `delivery` (`initial` or `pack`), `pack` + `packBudgetKb` (1-1024), `featureFlag`, content id lists, source/reviewedBy/reviewed |
| `dialogue-pack.schema.json` | `validateDialoguePack` | scenes (tag) -> lines: speaker, text (`en` required, `pcm` etc.), `langs`, `glossary` ids, `native_review` (required when the text or `langs` has yo, ig or ha), `pcm_review` (required when the text or `langs` has Pidgin), `fictional`, tag |
| `learning-pack.schema.json` | `validateLearningPack` | `facts` (<= 140 chars per language, trigger, `sourceRef`), `sources` (author, when, why, citation, quote, codex shelf+slot), `twoSides` (2-3 sides), `pins` (timeline/map, date range, place 0..1), `checks` (knowledge-check items) |
| `glossary-pack.schema.json` | `validateGlossaryPack` | term, language, definition, `diacriticChecked` |
| (TypeScript only) | `validateFeatureConfig`, `validateGuardrailOverride` | `features.json`, `guardrails.json` |

- **Learning items** (facts, sources, twoSides, pins, checks, glossary terms, and the chapter manifest) ALL
  carry `source`, `reviewedBy`, `reviewed`. `reviewed:true` with a placeholder reviewer is rejected: a
  `reviewedBy` that starts with `TODO`, `TBD`, `pending`, `n/a` or `none` (whole word, any case). The same rule
  is in the TypeScript validators and, case-expanded, in the JSON Schemas (`placeholderPattern()` generates the
  schema text and a test checks the files contain it).
- **Knowledge checks** are a structural superset of the existing `QuizQuestion` (4 distinct options, `answer`
  0-3, `source`, `reviewed`, `category`, `difficulty`) plus `explanation` (<= 200 chars, shown after a wrong
  answer, never blocking) and `reviewedBy`. The future `@naija/core/quiz` runs them without conversion.
- **Unknown fields are errors** (a typo like `sourceRf` cannot silently drop a field).
- **Schema versus TypeScript:** the schemas express everything JSON Schema can: required fields, lengths,
  enums, ids, `reviewed:true` needs a real reviewer, a date `day` needs a `month`, `native_review` for yo/ig/ha
  text, `pcm_review` for Pidgin text, non-blank strings. Rules JSON Schema cannot express are **TypeScript-only**
  and the TypeScript validator is authoritative: ids unique inside an array of objects, check options distinct
  ignoring case and spaces, a date range ending before it starts, a chapter depending on itself. Each schema
  states this in its `$comment` header. Lengths are Unicode code points in both (2020-12 `maxLength` counts code
  points; TypeScript uses `cpLen`).
- **Agreement test:** `scripts/content-schemas.test.ts` runs the JSON Schemas (through a small 2020-12 subset
  checker, `scripts/json-schema-lite.ts`, which counts code points and does not trim) and the TS validators over
  157 mutations of the fixture. Each mutation is `reject` (both must reject), `accept` (both must accept) or
  `ts-only` (TypeScript must reject; the schema cannot). Any divergence on a mutation not marked `ts-only`
  fails the test. Same pattern as `pack-check.test.ts`.
- **Run-time use:** the pack loader (section 5, `PACKS.md`) imports only the four `validate*` functions.
  Measured with esbuild minified and gzipped: the story validators are 3.9 KB, `validateQuizPack` alone 0.85 KB,
  so the real delta over the quiz baseline is about 3.1 KB (an earlier figure of 2.6 KB used a 1.2 KB quiz
  baseline; QA measured 0.85 KB). The linter, guardrails and release code are not imported at run time and tree-shake out
  (`import *` of the whole barrel is 11 KB, so games must import named functions).

### 2.3 Campaign checks (`lintBundle`, `content:check`)

Errors fail the check, warnings are advice (rule ids in `story/xref.ts`).
- **Errors:** `xref/duplicate-id` (ids unique across a campaign, shared glossary included); `xref/chapter`,
  `xref/chapter-item` (packs point at real chapters, one dialogue and one learning pack per chapter, every id a
  chapter lists exists); `xref/glossary`; `xref/speaker` (hero, companions, `cast`, `narrator`, `guide` only);
  `cameo/fictional` (real-person speaker without `fictional: true`); `xref/fact-source` (bad `sourceRef`);
  `xref/order`, `xref/pack-id`; `xref/dependency`, `xref/dependency-cycle`; `xref/feature-flag` (a Moremi
  chapter must set `featureFlag: "moremiPrologue"`: campaign `moremi-prologue`, a chapter id or pack `ch00*`, or a
  `Legend` chapter dated before 1200, whatever its `campaign` says; any flag must be declared in
  `features.json`); `xref/packs-json`; `text/not-nfc` (every player-visible string must be NFC);
  chapter ids are unique across the whole bundle (`xref/duplicate-id`).
- **Warnings:** `xref/orphan-item`, `glossary/untagged`, fact without `sourceRef`, `chapter/checks|facts|sources`
  (target 3 checks, 2-3 facts, 1 source), `diacritics/no-marks` (flag-only; a Yoruba/Igbo
  term with no tone marks or underdots; `diacriticChecked:true` silences it).

### 2.4 Guardrail linter (configurable, flag-only except the clearest violations)

Scans every player-visible string in every language, including source `author` and `citation`. Defaults live in
`packages/core/src/content/story/guardrails.ts`; `games/akoni-dike/content/guardrails.json` is MERGED over
them: same `id` replaces a rule (with a mandatory `reason`), a new `id` adds one, `severity: "off"` disables
(with a reason), `ethnicGroups` and `realPeople` are unioned, `allow: [{rule, at, reason}]` silences one rule
at one location (a reason is mandatory, so exceptions are reviewable in the diff; `at` matches on a segment
boundary, so `kiriji-1` does not silence `kiriji-10`). **The eight SCRIPT guardrail rules cannot be weakened by
the project file**: `blood`, `skull`, `beheading`, `gore`, `tribe-of`, `colonial-ethnic-label`,
`yoruba-igbo-enemies`, `ugbo-villain` may not be switched off, downgraded or have their patterns replaced
(validation rejects it and `mergeGuardrails` ignores it); use a new rule id or an `allow` entry with a reason.
Patterns are case-insensitive regex; `{ETHNIC}` expands to `ethnicGroups` (now also Ijesa, Ekiti, Anioma, Ugbo,
Ilaje, Ebira).

- **Errors:** `blood`, `skull`, `beheading`, `gore`, `tribe-of`; `colonial-ethnic-label` (an ethnic name beside
  a force that is colonial by name, constable/constabulary/police/askari/riflemen/mercenary, in either order,
  or beside soldiers/troops/forces in the same clause as Company, colonial, Crown, Royal Niger, constabulary or
  police: "Hausa constables", "The Company sent Hausa soldiers"); `yoruba-igbo-enemies` ("Igbo raiders",
  "Yoruba enemies", "The Yoruba were our enemies"; a clause with a negation such as never, not or no is not
  flagged, so the required sentence "The raffia raiders of the forest are never called Igbo." passes);
  `ugbo-villain`.
- **Warnings:** `ethnic-army-label` (an ethnic name beside soldiers/troops/forces with no colonial word: usually
  an indigenous army such as "Yoruba troops of Oyo", a human reviews it), `villain-city`, `tribe-word`, `violence-words` (kill, murder, execute, torture, massacre),
  `trophy` (incl. head-taking), `enslavement`, `sacred-imagery` (shrine, sacrifice, masquerade, nsibidi, mbari,
  ofo, war charm), `people-in-flames` (also "burns his cloak", "burned the raider chief": the firebrand duel is an open owner question, question 3), `anachronism` (corrugated, searchlight, railway).

Limits: a regex linter cannot judge context. "Latoosa died in camp in 1885" trips `violence-words` only if
the word "killed" appears; deliberate codex sentences (slave-raiding, head-taking, the Ekumeku outcome) use
`allow` with a reason. Negation is handled per clause, not by meaning. It does not replace the cultural review.

### 2.5 Dev/preview builds vs release builds

| | Dev / preview (default) | Release |
|---|---|---|
| Switch | nothing set, or `NAIJA_RELEASE=0` | `NAIJA_RELEASE=1` (or `true`/`yes`), or `--release` |
| `reviewed:false` | allowed, counted and printed | any occurrence **fails** `content:check`, `content:release-check` and `npm run build` |
| Native-review / diacritics flags | printed | printed (not blocking, D5) |
| Any other `NAIJA_RELEASE` value | fails with "must be 1 or 0" | (a typo must never silently fall back to the permissive mode) |
| Where | `npm run check` runs `content:check` (no-op without content) | `npm run content:release-check` (always strict, NOT in `npm run check`); `scripts/build-all.mjs` runs `content-check.mjs` first, so `NAIJA_RELEASE=1 npm run build` is a release build |

The existing quiz-pack check (`packs:check`, `packs:release-check`) is untouched.

## 3 to 7. Size rules, packs, hub, quiz extraction

Moved to keep each file under 400 lines, numbers unchanged. `PACKS.md`: 3 size rules **[built]** and 3.1 the
pack-id options for the owner (D12), 4 pack build, 5 `@naija/core/packs`, 6 hub and headers. `QUIZ.md`: 7 the
`@naija/core/quiz` extraction.

## 8. `@naija/core/loop` extensions **[A1]**

`createLoop` (fixed step 1/60, spiral cap, auto-pause on hidden tab, `advance(n)`) already covers the base
need. Needed additions, all optional and backward compatible (Penalty King and later games unchanged):

| Addition | Why |
|---|---|
| `timeScale` setter (0..2): scales the accumulator, the step size stays fixed | squad-order ring slows time while open; Hunter's Eye slow-time. Simulation stays deterministic because only the number of steps per frame changes |
| `simTime` and `stepCount` getters | replays, cooldowns, hit-stop and the rhythm set piece count steps, not wall-clock |
| `step` change at run time (`setStep`) for the 30 Hz fallback (D9) | low-end devices; render interpolation (`alpha`) already exists |
| keep `onHidden` pause; add `onResume` callback | resume the audio context and music after a tab switch |

Hit-stop (a few frozen frames on impact) is an engine concern (a `freezeSteps` counter in combat state), not a loop one.

## 9. Action engine module map **[A1]**

Rules are pure and live in `src/rules/` (this is the folder the 90 % coverage gate checks); no DOM, no timers,
no `Math.random`, state serialisable. `src/ai/` decides, `src/view/` draws. Each file < 400 lines. `step.ts` is
only the ordered phase calls, so each concern is tested alone; the determinism golden test covers the sequence.

```
games/akoni-dike/src/
  rules/  state.ts      serialisable game state and constructors
          step.ts       ONLY sequences the phases below in a fixed order, one call per fixed step; no game logic
          phases (each its own file, pure `(state, dt) -> state`, <= ~300 lines):
            input         raw input -> player intents (move, strike, dodge, block, order)
            orders        squad orders ring, companion commands
            intents       AI brain output -> per-entity intents
            movement      accel, dodge i-frames, knockback, tile collision
            combat        strike chains, hit boxes, block/parry window + counter, stagger, hit-stop, flash + knockback, NEVER blood
            morale        group bar; break -> flee/kneel/drop weapon
            objectives    escort, defend, hold N of M, relay, protect, survive, choice; lowered-weapon attack fails
            stealth       sight cones, hearing, alert states, hiding, vanish, double ambush damage
          support (called by phases, not phases themselves): spatial (uniform-grid hash: radius and cone queries),
            weapons (data tables), squad (companion abilities), skills, difficulty
          story: dialogue (scene runner state), learning (triggers, source unlocks, check via core/quiz, honours), progress
    setpieces/  brawl, duel (phased, disarm finish), aim, chase, rhythm, escape
  ai/     brains (spearman, archer/musketeer, captain, constable pairs, rival boss), squadai, pathing (grid A*, flow field), bot (autoplay)
  view/   renderer (interpolated), atlas, pool, hud (DOM overlay), cutscene, codex, timeline, map, learning-ui
  main.ts  i18n/en.json  i18n/pcm.json  game.config.ts
```

Collision and sight use `spatial.ts`; sight cones are circle-sector tests against hash cells, so the cost scales
with nearby entities, not with the map.

## 10. Testing strategy

- **Rules (Vitest, >= 90 % lines):** pure functions over serialisable state, seeded `core/rng`. Table tests per
  rule and edge case in `docs/GAMES.md` section 11 and the SCRIPT guardrails: disarm-never-kill, attacking a
  lowered weapon fails Chapter 6, "pushed back not defeated" in Chapter 1, flame-free hit reactions.
- **Determinism:** golden test: the same seed and the same scripted inputs for N steps produce the same
  serialised state hash on every run (guards against `Math.random`, `Date.now`, iteration-order bugs).
- **Difficulty simulation:** squad-vs-enemy sims over 200 seeded fights per chapter archetype: Warrior
  clears less often than Story, Legend less than Warrior (thresholds fixed in the test, DoD "difficulty must raise
  the challenge").
- **Content:** the A0 gate (`content:check`) plus a test that every chapter in `content/` has a hero moment, a
  3-item knowledge check and a source card, and that every `trigger` id a fact uses is emitted by the engine.
- **Playwright:** one spec per chapter calls `__naijaTest.autoplay()` on Story difficulty, which plays the
  fight, the hero moment and the knowledge check, then asserts: results screen, portal `end` event, zero console
  errors, no listener/timer leaks (`leakCounters`). `getState()` is serialisable; `setSeed(n)` pins the run.
  Offline replay and pack-download tests per section 5.6. The test hook is stripped from production by the
  `__NAIJA_TEST__` define (prod gate).
- **Perf:** `playwright.perf.config.ts` 4x CPU throttle, >= 50 fps over a Chapter 1 fight and the 20-enemy stress
  fight; 10-minute soak for heap trend.

## 11. Performance plan (mid-range Android, 60 fps target, 50 fps floor)

- Fixed step (60 Hz, 30 Hz fallback D9), render with interpolation; `maxSteps` cap already in `loop`.
- **Atlases follow the asset brief** (`docs/assets/akoni-dike-brief/04-assets-and-atlas.md` sections 3.4 and 4):
  shared SVG sprite sheets with a twin `*.json` frame map (`name, x, y, w, h, ax, ay, ms`), fetched when a pack
  starts and rasterised ONCE into an `OffscreenCanvas` (or `createImageBitmap`) at `min(devicePixelRatio, 2)`,
  cached per sheet, never rasterised per frame. Pre-baked WebP only if rasterising takes more than 600 ms per
  campaign on a throttled low-end device; that is decided after the A1 slice (brief open question 6), and
  the A1.1 spike must measure it. Decoded atlas memory <= 24 MB; the previous chapter's tiles, props and fx
  are unloaded when a pack starts, `shared-<campaign>` stays resident. Hit flash draws into a pooled scratch
  canvas with `source-atop` (no `ctx.filter`); rival accents tint a white `*-accent.svg` mask once. No
  per-frame allocations in the step: struct-of-arrays entity state, reused vectors, `pool.ts` for particles/text/projectiles (cap 48 live fx).
- Spatial hash for collisions, targeting and sight; at most N=24 active AI per frame, farther ones tick at 1/4 rate.
- Canvas 2D: static tile layer pre-rendered to an offscreen canvas and scrolled; one draw per sprite; no
  shadows/filters; integer-aligned blits; DPR capped at 2.
- HUD in DOM with `transform`/`opacity` only; no layout animation. Audio: synthesized SFX, one music loop
  at a time (<= 300 KB), decoded lazily.
- Heap: pre-size pools, forbid growth after chapter start; the soak test watches the trend.

## 12. Vertical slice (A1 exit): Kiriji Chapter 1, "The Ajele's Due"

In: hub (Oke-Imesi, talk + one artefact that unlocks the source card), museum frame scene with Mr Adewale,
escort-6-villagers fight (guards pushed back, not defeated), the street-brawl hero moment (strike, dodge, parry,
counter), morale and the captain archetype (no companion: Akin joins in Chapter 3 per SCRIPT, see question 19), Story difficulty plus Warrior/Legend
parameters, 2-3 did-you-know cards, one source card in the codex, 3-item knowledge check with explanations,
glossary taps, results and honours, save through the portal bridge, en + pcm, accessibility basics, content
through the A0 pipeline with `reviewed:false` items (dev/preview build only).
Out (later phases): stealth, aiming, chase and rhythm set pieces, the squad ring and companions (Akin, A1.9 moves to A2), timeline and
map screens, skill tree depth, classroom mode, all other chapters, music (placeholder loop), voice barks.
Chapter 1 is `delivery: "initial"`, so the slice also proves the 3 MB initial budget. A throw-away second chapter
pack (any tiny `ch02`) proves download, verify, cache and offline replay before real chapters exist.

## 13. i18n, accessibility, feature flags

- **i18n:** `src/i18n/en.json` and `pcm.json` for UI from day one (core `t('key')`, `_review` flags, `npm run i18n:check`).
  Story text lives in content JSON with `text.en` required and `text.pcm` from day one; `yo`/`ig` arrive for the
  glossary and barks with `native_review:true` until a native speaker clears them. A line mixing languages lists
  them in `langs`, but the text keys are the truth: a line with yo/ig/ha text without `native_review`, or with
  Pidgin text without `pcm_review`, is a validation error even if `langs` says `["en"]`. Pidgin lines the writer
  is unsure of carry `pcm_review: true` (reported by the release report, not blocking). Diacritics are checked
  (NFC, marks present) but only a native speaker can approve them. Strings never go in code.
- **Accessibility:** reading-level target JSS (short lines, <= 220 chars); text size setting; high-contrast
  toggle; reduced motion (no screen shake, no hit-stop flash); one-handed mode and auto-block on Story (from
  SCRIPT); all controls >= 44 px; keyboard and mouse on desktop; every cutscene panel has a text line (nothing is
  voice-only: "all story text is read on screen"); no colour-only signals (morale and alert states use icons and
  shapes); `aria-live` for did-you-know cards and the knowledge check; focus order and Esc/pause work in the DOM
  overlay; captions for barks.
- **Feature flags** (`games/akoni-dike/features.json`, validated, default off for the unfinished):
  `moremiPrologue: false`. A chapter ships only if it has no `featureFlag` or the flag is on
  (a `chapterEnabled(chapter, features)` helper is added WITH the A1 build step that uses it; A0 removed the unused one). The build omits flagged-off chapters and their packs from `packs.json`, so a flag-off prologue
  costs zero bytes.

## 14. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Schedule: the A1 slice is far bigger than "weeks 2-5" (section 15: minimum viable A1 is about 47 working days, about 10 weeks, not 4) | section 15 options; owner decides whether to extend Phase A, cut the campaign scope or add a second stream |
| R2 | Core budget 60 KB: `loop`, `quiz`, `packs` add to the shared `core` chunk of every game | named imports only (measured: validators +3.1 KB gzip); measure core after each module; `packs` and `quiz` must tree-shake out of games that do not import them |
| R3 | 1 MB pack: art (<= 300 KB), music loop (<= 300 KB), SFX, barks, tiles and JSON are already compressed; gzip will not help | per-chapter art/audio budget table in the asset brief; shared assets per D7 or the `PACKS.md` 3.1 option the owner picks; audio at 64 kbps mono; atlases quantised |
| R4 | Historical accuracy and cultural sensitivity (Ugbo/Moremi, Ekumeku outcome, living heritage bodies) | historian sign-off is a release gate (`reviewed`); no invented facts; every unknown is `TODO historian` + `reviewed:false` |
| R5 | Mid-range phones: canvas action game at 50 fps | section 11 plus a spike in A1.1 on a throttled profile before the engine grows |
| R6 | Offline and storage quotas in in-app browsers / Android WebView | Cache API with graceful degradation, eviction, persist request, a visible "Downloaded" state |
| R7 | Guardrail linter false positives/negatives | warning-only for context-dependent words; `allow` with a reason; human cultural review stays mandatory |
| R8 | SW update drops downloaded chapters | packs cache is version-independent (5.3); a test asserts a new SW version keeps `naija-packs-*` |
| R9 | Hub deploy rules diverge from the size exception | section 6, one shared `size-lib.mjs` |
| R10 | Sabi Quiz regression during extraction | section 7 migration gates; done after the slice |

## 15. A1 task breakdown (one developer, agent-assisted; estimates in working days)

| # | Task | Days | Gate |
|---|---|---|---|
| A1.0 | Owner review of A0 (this doc, schemas, size rules) and answers to the questions below | 2 (owner) | owner approves D1-D12 |
| A1.1 | Perf spike: canvas scene with 24 sprites, spatial hash, SVG atlas rasterised at load, fixed step on a 4x throttled profile | 2 | >= 55 fps; decides D9 and the SVG-or-WebP question |
| A1.2 | `core/loop` extensions (timeScale, simTime, setStep, onResume) + tests | 1 | existing loop and Penalty King tests unchanged |
| A1.3 | `core/quiz` (new module, copy of Sabi tests passing) | 3 | tests green; core size delta reported |
| A1.4 | `core/packs`: manager, integrity, retry, cache, eviction, state machine + tests | 5 | >= 90 % coverage; fault-injection tests (offline, 404, corrupt hash, quota, no `crypto.subtle`) |
| A1.5 | Build: pack step in plugin, catalogue module, SW exclusion + packs cache read rule, `checkPacks`, `loadPack` cache option | 4 | build tests; size script on a real throw-away pack |
| A1.6 | Engine core: state, step, movement, spatial, collision | 4 | unit + determinism golden |
| A1.7 | Combat, weapons, hit reactions, parry/counter | 4 | table tests, flame/blood-free asserts |
| A1.8 | Morale, enemy archetypes, difficulty, Chapter 1 objectives | 5 | difficulty sims (Story > Warrior > Legend) |
| A1.9 | Squad follow/hold, Akin | 2 | tests |
| A1.10 | Renderer, atlas, pools, HUD, joystick/buttons | 5 | 50 fps at 4x throttle |
| A1.11 | Hub, dialogue/cutscene panels, glossary taps | 4 | e2e smoke |
| A1.12 | Learning layer UI: did-you-know, source card/codex entry, knowledge check, honours | 4 | tests + content:check green |
| A1.13 | Kiriji 1 content (TODO historian, `reviewed:false`), en + pcm strings, assets from the brief | 3 | content gate, i18n check |
| A1.14 | Autoplay bot, `__naijaTest`, Playwright chapter + offline + pack-download specs | 4 | e2e green, zero console errors |
| A1.15 | Perf and soak pass, QA round fixes | 4 | DoD items for the slice |
| | **Total** | **56 (11.2 weeks at 5 days)**, of which 2 are the owner's review: 54 developer days | |

### 15.1 Honest minimum viable A1 (cut list recomputed)

The earlier cut list ("about 20 days") was wrong. Its keep-list (A1.1 to A1.8, A1.10, A1.12 check and
did-you-know only, A1.14) is 28 + 5 + 4 = **37 days, or 41 with A1.12**, and it still omits the Chapter 1
content (A1.13), dialogue and the perf and QA pass. The minimum that meets the A1 exit (Chapter 1 playable,
learning layer, 50 fps, e2e green):

| Task | Days kept | Moves to A2 |
|---|---|---|
| A1.1 to A1.8 (spike, loop, quiz, packs, build, engine, combat, morale and difficulty) | 28 | 0 (difficulty sims are a DoD item, so A1.8 keeps its 5 days) |
| A1.10 renderer, atlas, pools, HUD | 5 | 0 |
| A1.11 dialogue box and one glossary tap only | 2 | 2 (hub scene, cutscene panels) |
| A1.12 did-you-know, one source card, 3-item check, honours; no codex screen | 3 | 1 (codex) |
| A1.13 Kiriji 1 content, en + pcm, assets | 3 | 0 |
| A1.14 bot, `__naijaTest`, chapter, offline and pack-download specs | 4 | 0 |
| A1.15 one QA round and the perf pass; the 10-minute soak waits | 2 | 2 (soak, second QA round) |
| A1.9 Akin and squad follow/hold (Akin is Chapter 3, question 19) | 0 | 2 |
| **Total** | **47 days** (about 9.5 weeks) plus the owner's 2 days of review | **7 days** |

So the minimum viable A1 is about **47 developer days, 49 with the owner's review: roughly 10 weeks, against
the 4 weeks (weeks 2 to 5) in `docs/IMPLEMENTATION_PLAN.md`**. The 7 days moved out land in A2.

### 15.2 Revised Phase A total (estimate)

The plan's A2 (weeks 5 to 10, 5 weeks) and A3 (weeks 10 to 16, 6 weeks) are the owner's figures and are not
re-estimated here. Taking them as given: A0 1 + A1 10 + A2 (5 + 1.4 for the moved days) 6.4 + A3 6 = about
**23 to 24 weeks, against 14 to 16**.

| Option | Phase A total | What it costs |
|---|---|---|
| 1. Accept the real number, keep the scope | about 23-24 weeks | one more owner review slot; every chapter and both campaigns ship |
| 2. Hold about 16 weeks by cutting scope: ship Kiriji only (A0, A1, A2) and make Ekumeku a second release | Kiriji about 17-18 weeks, Ekumeku about 6 more | half the catalogue at the first release; `core/packs`, quiz and engine are paid once, so the Ekumeku release is cheaper than A3 as planned |
| 3. Keep the scope, add a second stream after A1.5: stream 1 engine and combat (A1.6 to A1.8, 14 days), stream 2 renderer, hub, learning UI and content (A1.10 to A1.13, about 13 days) against an agreed state contract, then merge for A1.14 and A1.15 | about 20 weeks (A1 about 7 weeks on the critical path of about 34 days) | needs a second developer or a second agent run in parallel; merge risk on the `rules` state shape, so the state types are frozen first |

Recommendation: option 3 if a second stream is available, otherwise option 1; option 2 if the date cannot move.

Stop for human review at the end of A1 (plan rule); QA report: `docs/qa/akoni-dike-A1-report.md`.

## 16. Questions and contradictions for the project owner

Contradictions and gaps found in the specs and the existing code. The asset-designer keeps a second list in
`docs/assets/akoni-dike-brief/07-human-assets-and-open-questions.md` section 4 (its item 24 points here). The
two lists overlap; **answer each topic once**, using this map (this list is the canonical one):

| Topic | This list | Brief 07 section 4 |
|---|---|---|
| Chapter count | 1 | 2 |
| Moremi prologue kept, and where it sits | 2, 8 | 1 |
| Firebrand duel / fire on people | 3 | 4 |
| Cameos (Phillips, Latoosa) | 4 | 16 |
| Etymology of "Kiriji" | 7 | 23 |
| Initial 3 MB, pack budget reading, shared and audio packs, music size | 9, 20 | 5, 7 |
| SVG at runtime or pre-baked WebP | 21 | 6 |
| Masquerade, shrine, sacrifice severity; raffia cape | 17 | 3 |
| Reviewers and heritage-body sign-off; teacher guides | 16, 18 | 10, 20 |
| Akin's first appearance | 19 | 12 |

Contradictions and gaps:

1. **Chapter count:** GAMES.md says "a prologue and 6 chapters... 14 chapters". With `moremiPrologue` OFF Kiriji has
   6, so 13 ship. Is the target 13 or 14?
2. **Moremi in the Kiriji campaign:** a 12th-century legend sits in the 1877-1893 campaign. Should it be its own
   "Legends" tab? (The schema already treats `moremi-prologue` as a separate campaign value.)
3. **Fire on people:** the Moremi hero moment "burns his cloak"; ASSET_BIBLE and Ekumeku 4 say "no flames on
   people". Acceptable if the raider flees unharmed? (`people-in-flames` warns.)
4. **Charles Phillips:** named in LEARNING (Kiriji 6) and ASSET_BIBLE (outfit) but absent from the SCRIPT cameo list
   (guardrail 4). I added `charles-phillips`/`phillips` to `realPeople` (lines need `fictional:true`). Confirm.
5. **Undated chapters:** Ekumeku 2 and 3 have no year in SCRIPT, the prologue only "1890s". `dates` is required:
   the historian supplies a year or `circa`, or `dates` becomes optional.
6. **Corrugated iron** is banned in Kiriji 1-3 only. Allowed in 4-6, and why that boundary? (Linter warns everywhere.)
7. **"ki-ri-ji" etymology** (the rifle's sound) is stated as fact in Kiriji 3; the historian should confirm before it
   lands in a History-tagged scene.
8. **First playable chapter:** if Moremi is approved, is it the initial-download chapter or does Kiriji 1 stay first?
9. **Initial 3 MB:** is it enough for 3 heroes, UI, engine, music, barks and Chapter 1 once shared assets sit there (D7)?
10. **Difficulty names** Story/Warrior/Legend vs Easy/Medium/Hard (DoD, `ai-kit`): D8 maps them.
11. **Release switch:** `NAIJA_RELEASE` env (built) vs the flag style of `packs:release-check`. Keep both?
12. **Knowledge-check authoring:** `category`/`difficulty` stay required so items drop into the quiz module. Default them instead?
13. **Naming style:** `native_review` (snake) beside `reviewedBy`/`sourcesDisagree` (camel), kept as specified.
14. **Registry/hub:** add a `deploy:false` registry entry and a `story` hub category now, or at A1?
15. **Schedule:** A1 "weeks 2-5" vs about 11 working weeks (section 15). Extend, or accept the cut list?
16. **Reviewers:** who is named in `reviewedBy` (historian per campaign, JSS teacher, native speakers)? The gate checks
    only the boolean and rejects a `TODO` reviewer on a reviewed item.
17. **Severity:** should `masquerade`, `shrine`, `sacrifice` become errors rather than warnings?
18. **Teacher PDFs and the class quiz:** ship inside the game (counts toward size) or host separately?
19. **Akin's first chapter:** SCRIPT introduces Akin in Chapter 3 (brief 07 item 12 agrees: his sheet is in
    `shared-kiriji`). The earlier slice plan had him in Chapter 1. A0 now keeps him OUT of the Chapter 1 slice
    (A1.9 moves to A2). Does he join earlier? If so SCRIPT must say so first.
20. **Shared and audio asset packs (D12, `PACKS.md` section 3.1):** options A, B, C. Recommendation B. Also: do the
    1 MB chapter pack and the 3 MB initial download count audio and JSON (brief item 5)? One audio format
    (`.ogg`), or also `.mp3` for old WebViews (doubles music bytes)?
21. **SVG sheets at runtime or pre-baked WebP:** the brief rasterises SVG at load and switches to WebP only if
    that takes more than 600 ms per campaign on a low-end phone. A1.1 measures it on a real Tecno, Infinix or
    Itel device. Can the owner provide one?
22. **Early Legend chapters:** the Moremi rule treats a `Legend` chapter dated before 1200 as the prologue even
    if its campaign says `kiriji` (the validator's minimum year is 1000, so "before 1000" cannot fire).
    Confirm 1200 or give the historian's date.
23. **Pidgin review flag:** `pcm_review` is now required on every dialogue line that has Pidgin text. Who is the
    Pidgin reviewer, and should unresolved Pidgin lines block a release (D5)?
