# Akọni & Dike: Architecture (Phase A0 design)

Status: A0 design for owner review. Nothing here is gameplay code. What A0 actually built (content
schemas and validators, release gate, size rules) is marked **[built]**. Everything else is a
proposal for A1 and is marked **[A1]**. Binding specs: `SCRIPT.md`, `LEARNING.md`, `ASSET_BIBLE.md`,
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
| D10 | Build tooling | The `content:*` scripts bundle the TypeScript gate in memory with `esbuild` (already installed as a Vite dependency, no new package) | avoids a second copy of the validators in `.mjs` |

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

`content/` does not exist yet, so `npm run content:check` prints "nothing to check" and passes.
The fixtures (Kiriji 1 skeleton, `packages/core/src/content/story/fixtures.ts`) are used by tests only.

### 2.2 Documents and schemas

| Schema file (`packages/core/content/schemas/`) | TypeScript validator (`@naija/core/content`) | Holds |
|---|---|---|
| `chapter-manifest.schema.json` | `validateChapter` | id, campaign (`kiriji` `ekumeku` `moremi-prologue`), order, title, tag, goals (1-4), environment, hero, companions, cast, battle objectives, hero-moment type, `dates` (+ optional `sourcesDisagree`), dependencies, `delivery` (`initial` or `pack`), `pack` + `packBudgetKb` (1-1024), `featureFlag`, content id lists, source/reviewedBy/reviewed |
| `dialogue-pack.schema.json` | `validateDialoguePack` | scenes (tag) -> lines: speaker, text (`en` required, `pcm` etc.), `langs`, `glossary` ids, `native_review`, `fictional`, tag |
| `learning-pack.schema.json` | `validateLearningPack` | `facts` (<= 140 chars per language, trigger, `sourceRef`), `sources` (author, when, why, citation, quote, codex shelf+slot), `twoSides` (2-3 sides), `pins` (timeline/map, date range, place 0..1), `checks` (knowledge-check items) |
| `glossary-pack.schema.json` | `validateGlossaryPack` | term, language, definition, `diacriticChecked` |
| (TypeScript only) | `validateFeatureConfig`, `validateGuardrailOverride` | `features.json`, `guardrails.json` |

- **Learning items** (facts, sources, twoSides, pins, checks, glossary terms, and the chapter manifest) ALL
  carry `source`, `reviewedBy`, `reviewed`. `reviewed:true` with a `TODO` reviewer is rejected.
- **Knowledge checks** are a structural superset of the existing `QuizQuestion` (4 distinct options, `answer`
  0-3, `source`, `reviewed`, `category`, `difficulty`) plus `explanation` (<= 200 chars, shown after a wrong
  answer, never blocking) and `reviewedBy`. The future `@naija/core/quiz` runs them without conversion.
- **Unknown fields are errors** (a typo like `sourceRf` cannot silently drop a field).
- **Agreement test:** `scripts/content-schemas.test.ts` runs the JSON Schemas (through a small checker,
  `scripts/json-schema-lite.ts`) and the TS validators over about 65 mutations of the fixture and requires the same
  verdict. Same pattern as `pack-check.test.ts`.
- **Run-time use:** the pack loader (section 5) imports only the four `validate*` functions: measured at
  about +2.6 KB gzip over the quiz baseline (3.9 KB vs 1.2 KB, esbuild minified). The linter, guardrails and
  release code are not imported at run time and tree-shake out (`import *` of the whole barrel is 11 KB, so
  games must import named functions).

### 2.3 Campaign checks (`lintBundle`, `content:check`)

Errors fail the check, warnings are advice (rule ids in `story/xref.ts`).
- **Errors:** `xref/duplicate-id` (ids unique across a campaign, shared glossary included); `xref/chapter`,
  `xref/chapter-item` (packs point at real chapters, one dialogue and one learning pack per chapter, every id a
  chapter lists exists); `xref/glossary`; `xref/speaker` (hero, companions, `cast`, `narrator`, `guide` only);
  `cameo/fictional` (real-person speaker without `fictional: true`); `xref/fact-source` (bad `sourceRef`);
  `xref/order`, `xref/pack-id`; `xref/dependency`, `xref/dependency-cycle`; `xref/feature-flag` (Moremi chapters
  must set `featureFlag: "moremiPrologue"`, any flag must be declared in `features.json`); `xref/packs-json`.
- **Warnings:** `xref/orphan-item`, `glossary/untagged`, fact without `sourceRef`, `chapter/checks|facts|sources`
  (target 3 checks, 2-3 facts, 1 source), `diacritics/no-marks` and `diacritics/not-nfc` (flag-only; Yoruba/Igbo
  term with no tone marks or underdots, or text not NFC; `diacriticChecked:true` silences the first).

### 2.4 Guardrail linter (configurable, flag-only except the clearest violations)

Scans every player-visible string in every language. Defaults live in
`packages/core/src/content/story/guardrails.ts`; `games/akoni-dike/content/guardrails.json` is MERGED over
them: same `id` replaces a rule, a new `id` adds one, `severity: "off"` disables, `ethnicGroups` and
`realPeople` are unioned, `allow: [{rule, at, reason}]` silences one rule at one location prefix (a reason is
mandatory, so exceptions are reviewable in the diff). Patterns are case-insensitive regex; `{ETHNIC}` expands
to `ethnicGroups`.

- **Errors:** `blood`, `skull`, `beheading`, `gore`, `tribe-of`, `colonial-ethnic-label` (an ethnic name beside
  soldier/constable/troops/police/force in either order, e.g. "Hausa soldiers"), `yoruba-igbo-enemies` (incl.
  "Igbo raiders"), `ugbo-villain`.
- **Warnings:** `villain-city`, `tribe-word`, `violence-words` (kill, murder, execute, torture, massacre),
  `trophy` (incl. head-taking), `enslavement`, `sacred-imagery` (shrine, sacrifice, masquerade, nsibidi, mbari,
  ofo, war charm), `people-in-flames`, `anachronism` (corrugated, searchlight, railway).

Limits: a regex linter cannot judge context. "Latoosa died in camp in 1885" trips `violence-words` only if
the word "killed" appears; deliberate codex sentences (slave-raiding, head-taking, the Ekumeku outcome) use
`allow` with a reason. It does not replace the cultural review.

### 2.5 Dev/preview builds vs release builds

| | Dev / preview (default) | Release |
|---|---|---|
| Switch | nothing set, or `NAIJA_RELEASE=0` | `NAIJA_RELEASE=1` (or `true`/`yes`), or `--release` |
| `reviewed:false` | allowed, counted and printed | any occurrence **fails** `content:check`, `content:release-check` and `npm run build` |
| Native-review / diacritics flags | printed | printed (not blocking, D5) |
| Any other `NAIJA_RELEASE` value | fails with "must be 1 or 0" | (a typo must never silently fall back to the permissive mode) |
| Where | `npm run check` runs `content:check` (no-op without content) | `npm run content:release-check` (always strict, NOT in `npm run check`); `scripts/build-all.mjs` runs `content-check.mjs` first, so `NAIJA_RELEASE=1 npm run build` is a release build |

The existing quiz-pack check (`packs:check`, `packs:release-check`) is untouched.

## 3. Size rules **[built]**

`scripts/size-lib.mjs` (pure, unit-tested) is used by `scripts/size-budget.mjs`. Limits live in code, not in the
manifest, so editing `packs.json` can never relax a budget.

| Case | Result |
|---|---|
| Any game except `akoni-dike` | total gzip <= 3 MB (1.5 MB warning), core <= 60 KB. A `packs/` folder is ordinary files and counts fully. A `packs.json` in another game FAILS the build |
| `akoni-dike`, initial = every file outside a declared pack | initial <= 3 MB |
| `akoni-dike`, each declared pack (`packs/chNN/**`) | <= 1 MB, or lower via `budgetKb` (1-1024; can only lower) |
| `akoni-dike`, files in `packs/` not declared in the manifest | count as INITIAL |
| Declared pack with no files | FAIL (the loader would 404) |
| `packs.json` missing | warning; everything counts as initial (3 MB, no allowance) |
| `packs.json` malformed (bad id/dir, `budgetKb` > 1024, duplicate id, unknown field) | FAIL with the message |
| Core chunks (`core-*.js/css`) | <= 60 KB for every game, `akoni-dike` included |

Manifest: `games/akoni-dike/packs.json` = `{ "version": 1, "packs": [{ "id": "ch02", "dir": "packs/ch02", "budgetKb": 900 }] }`;
`dir` must be exactly `packs/<id>`. Currently `packs: []`. **Note:** gzip does not shrink `.webp`/`.ogg`, so the
1 MB pack budget is effectively 1 MB of raw media + JSON. See risk R3.

## 4. Build pipeline for packs **[A1]** (design notes are also in `vite-naija-plugin.ts` and `ship-check.ts`)

1. A pack build step in `closeBundle` assembles per chapter: the three content documents (chapter, dialogue,
   learning, plus the glossary terms it uses) into one `pack.<hash>.json`, art (`.webp`), audio (`.ogg`),
   into `dist/akoni-dike/packs/chNN/` with `<name>.<sha256-8>.<ext>` names.
2. `pack.<hash>.json` = `{ version, engine: {min,max}, chapter, files: [{path, bytes, sha256}], content }`.
3. The catalogue `{ chNN: { url: "./packs/chNN/pack.<hash>.json", bytes, sha256 } }` is emitted as a generated
   module (decision D2), so the built JS names each pack by a literal relative path.
4. The SW precache list excludes `packs/**` and the SW version hash ignores pack bytes (otherwise install
   would download every chapter, and any pack edit would re-download the game).
5. Build failures: empty declared pack, undeclared file in `packs/`, manifest listing a missing file, hash
   mismatch, over-budget pack (shared `evaluateGame`), release mode with `reviewed:false`.
6. `ship-check` gets a sibling `checkPacks` with the same two-way rule: a file in `packs/chNN/` must be listed
   by its pack manifest, and every listed file must exist with the recorded size and hash.

## 5. `@naija/core/packs`: on-demand chapter packs **[A1]**

Builds on `loadPack` (`packages/core/src/content/loader.ts`: never throws, typed `PackLoadResult`, 6 s timeout,
`cache: 'no-cache'`). `loadPack` stays as is for quiz/word packs; `packs` adds a layer above it.

### 5.1 API sketch

```ts
interface PackCatalogue { [id: string]: { url: string; bytes: number; sha256: string; version: number } }
interface PackManager {
  state(id): PackState                                // 'absent'|'queued'|'downloading'|'verifying'|'ready'|'failed'
  ensure(id, opts?: { onProgress(p: { loaded: number; total: number }): void; signal?: AbortSignal }): Promise<PackResult<T>>
  has(id): Promise<boolean>                           // cached and verified, works offline
  remove(id): Promise<void>
  usage(): Promise<{ bytes: number; ids: string[] }>
  subscribe(fn): () => void
}
createPackManager({ catalogue, validate, cacheName, fetchImpl?, caches?, maxCached? })
```

### 5.2 Fetch rules (security and cost)

- URLs come ONLY from the embedded catalogue and must match `^\./packs/ch\d{2}/[\w.-]+$`. No string building from
  user input, no query string, so a `?token=` can never reach a pack request or a cache key (CLAUDE.md: no MSISDN/token in URLs).
- `Content-Length` (or catalogue `bytes`) feeds the progress bar. The body is read with `response.body.getReader()`
  so progress is real; if streaming is unavailable, progress is 0 then 100 %.
- Integrity: SHA-256 of the whole file via `crypto.subtle.digest`, compared to the catalogue before anything is
  stored or parsed. Mismatch = `integrity` error, bytes discarded. (`fetch({integrity})` is not used: browsers
  buffer the body before exposing it, which would kill the progress bar.) Where `crypto.subtle` is missing
  (insecure context, only local dev) the check is skipped with a dev-only warning.
- Then `JSON.parse` + the schema validator (`validateChapter` etc.), exactly like `loadPack`, with the same
  `network|timeout|http|parse|invalid` reasons plus `integrity`, `quota`, `cancelled`, `version`.
- Binary files listed in `pack.json` (art, audio) are fetched the same way, in parallel (max 3 in flight) and
  counted in the same progress bar.
- **Retry/timeout:** per-file timeout 15 s (a 1 MB pack on slow 3G is about 25 s total, so the timeout is per stall,
  not per pack), 3 attempts with 1 s / 3 s back-off, resumable at file level (verified files are kept). `loadPack`
  gets one backward-compatible option `cache?: RequestCache` so immutable hashed files can use the HTTP cache
  instead of `no-cache`.
- **Friendly error state:** every failure maps to a Pidgin/English message and two buttons, "Try again" and
  "Play a downloaded chapter". It never blocks the app, never shows a stack or a status code.

### 5.3 Where packs are stored: Cache API (D3) vs the existing service worker

Today `sw-template.js` is version-keyed: install precaches the whole build into `naija-<slug>-<hash>` and
activate DELETES every older `naija-<slug>-*` cache. Packs in that cache would be wiped on every game update, and
a re-download of up to 6 MB on a metered line is unacceptable. So:

- Packs go to their own cache, **`naija-packs-akoni-dike-v1`**, whose name does NOT start with `naija-akoni-dike-`
  (the SW's delete prefix; also `hub-lib` forbids slug-prefix collisions). The cache is bumped to `-v2` only
  when the pack format changes.
- The **page** writes and reads it through `window.caches` (the page already has the bytes and the hash check
  result; the SW does not have to run for a download to work). The SW only adds a read rule so offline replay
  works for sub-resources inside the game (art/audio referenced by URL):
  `if (pathname matches /\/packs\/ch\d{2}\//) -> caches.match(key, {ignoreSearch:true}) in the packs cache,
  fall back to network, never write`. Hashed names mean a hit is always correct: no revalidation needed.
- Existing rule `\/assets\/packs\/[^/]+\.json$` (network-first quiz/word packs) does not match `/packs/chNN/`
  and is unchanged.
- No SW support (private mode, some in-app browsers): packs still download and run for the session through the
  page cache API; with no `caches` at all they are held in memory for the session only (offline replay is lost,
  the game still works online).
- `navigator.storage.persist()` is requested after the first successful pack download (best effort), so the
  browser is less likely to evict chapters.

### 5.4 Immutable hashed names vs short revalidation

`index.html` and `sw.js` stay fixed-name `max-age=0, must-revalidate`; `chunks/*` stay hashed and immutable;
`packs/chNN/*` are `name.<sha256-8>.ext` with `public, max-age=31536000, immutable`.

The embedded catalogue means no revalidated file is needed. If D2 flips to the remote index, it lists
`{chNN: {url, sha256, bytes, engine}}` and the loader ignores entries whose `engine` range does not include the
running engine (shows "Update the game to play this chapter").

### 5.5 Eviction and "Download chapter" UX

- Budget: keep at most `maxCached` (default 6) packs. Eviction is by least recent `lastPlayedAt` (stored in
  `core.storage`, key `packs:meta`, never a token/MSISDN), never the chapter being played, never initial files.
  On `QuotaExceededError` the manager evicts the least recently played pack and retries once, then reports
  `quota` with "Free some space" copy.
- Old versions: when the catalogue hash for `chNN` changes, the previous files of that chapter are deleted after
  the new pack verifies.

Chapter-card states: `absent` online ("Download 0.9 MB"), `absent` offline (greyed, "Needs internet"),
`downloading` (progress bar, "Cancel": AbortController, verified files kept), `verifying`, `ready` ("Downloaded",
Play, "Remove" in settings), `failed` (friendly message, "Try again", play another chapter), `update` ("Updated
chapter", the old copy stays playable until the new one verifies).

Rules: starting a chapter auto-downloads the NEXT chapter in the background only on Wi-Fi where the Network
Information API says so and never when `saveData` is on (otherwise manual). Classroom mode adds "Download all
chapters" with a total size and a warning, for school Wi-Fi.

### 5.6 Offline replay of cached chapters (DoD)

`has(id)` answers from the cache without network. The chapter list shows "Downloaded" chapters playable
offline and everything else disabled. Playwright test: download ch02, set the context offline, reload, play ch02,
assert zero failed requests to `/packs/` and zero console errors; ch03 shows "Needs internet".

### 5.7 Reuse by Danfo Dash and Mama Put Match

`packs` is content-agnostic (catalogue + validator + cache name), so a later game could call
`createPackManager({ catalogue, validate: validateLevelPack, cacheName: 'naija-packs-danfo-dash-v1' })`. Danfo Dash
and Mama Put Match should normally fit the 3 MB and not need packs. The size exception stays per game and explicit
(`PACK_GAMES` in `size-lib.mjs`): another game gets it only by an owner-approved edit.

## 6. Hub, `_headers` and Netlify/Vercel **[A1 proposal]**

The hub (`scripts/build-hub.mjs`, `hub/games.json`) lists only `deploy:true` games; `akoni-dike` is deliberately
NOT in `games/registry.json` yet. Before it can be deployed:

1. `hub-lib.mjs` hard-codes `GAME_LIMIT = 3 MB` per game folder: use `evaluateGame` from `size-lib.mjs` (D6).
2. `renderHeaders`: add ONE disjoint rule `/<slug>/packs/*` -> `Cache-Control: public, max-age=31536000, immutable`
   (hosts merge overlapping rules). `index.html` and `sw.js` stay `max-age=0`. The existing
   `/<slug>/assets/packs/*` revalidate rule is a different folder. Mirror it in `vercel.json` (`/:slug/packs/(.*)`).
3. `CATEGORIES` (`board cards quiz words`) has no story/action value: add `story` and `hub.cat.story` (en, pcm).
4. `scanOutput` bans `.md` and `docs` in the output: teacher guides must be hosted separately or added deliberately.
5. DigitalOcean Spaces ignores `_headers`: the future `scripts/deploy.mjs` must upload `packs/**` with the
   immutable `Cache-Control` and HTML/`sw.js` with `max-age=0`. No deploy without owner approval (unchanged).
6. CSP (`connect-src 'self'`) already allows same-origin pack fetches. The hub test should also assert that
   `naija-packs-akoni-dike-v1` collides with no game cache prefix.

## 7. `@naija/core/quiz` extraction **[A1]** (from `games/sabi-quiz/src/rules`)

Sources read: `config.ts`, `scoring.ts`, `poll.ts`, `engine.ts` (340 lines), `daily.ts`, `progress.ts`.

| Moves to `@naija/core/quiz` (generic, pure) | Stays in Sabi Quiz |
|---|---|
| `multiplierFor`, `speedBonus`, a `ScoringModel` interface (`classicPoints` becomes the default model) | `PROFILES`, `CATEGORIES`, `DUEL_*`, `PASS_MARK`, `stars`, `won` |
| `toPercents`, `padiPoll` (crowd lifeline) | duel mode, `CpuSeat`, `answerCpu`, `duelOutcome`, `duelPoints` |
| a generic round machine from `engine.ts`: `createQuiz`, `tick`, `answer`, `next`, `canUse`, `useFifty`, `useSkip`, `usePadi`, `accuracy`, state + history | daily record/streak (`daily.ts`), `progress.ts` (stats keys are game-specific) |
| already in core: `pickQuestions`, `shuffleOptions`, `dailySeed`, `QuizQuestion` | all views, personas, i18n |

```ts
createQuiz<Q extends QuizQuestion>({ questions: Q[], spares?: Q[], seed: number,
  timer?: { limitMs: number },            // optional: Akọni checks have none
  lifelines?: LifelineId[],               // optional: Akọni uses none
  scoring?: ScoringModel,                 // optional: Akọni awards honours, not points
  onWrong?: 'reveal' | 'reveal-explanation' }): QuizState<Q>
```

State stays JSON-serialisable with the rng in state, as in Sabi. Akọni's knowledge check = `createQuiz` with 3
items, no timer, no lifelines, `reveal-explanation`, and `never blocks`: the engine has no "fail" state; the
caller decides honours from `correct`. `KnowledgeCheckItem` already extends `QuizQuestion`.

**Sabi migration without regressions (deferred to after the vertical slice, as its own PR):**
1. Copy `engine.test.ts`, `scoring.test.ts`, `poll.test.ts` (about 800 lines) into `packages/core/src/quiz` first; the
   new module must pass them unchanged with Sabi's config injected.
2. Make `sabi-quiz/src/rules/engine.ts` a thin wrapper over `createQuiz` that adds duel and daily. Public
   exports (`createRound`, `answer`, ...) keep their signatures so `app.ts` and views do not change.
3. Gates: all existing Sabi unit tests green with zero edits, seeded replay equality (same seed => same
   question ids and scores as the pre-migration build, recorded as a golden file), Sabi e2e green, Sabi size
   delta <= +1 KB, core delta counted against the 60 KB budget.

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
no `Math.random`, state serialisable. `src/ai/` decides, `src/view/` draws. Each file < 400 lines.

```
games/akoni-dike/src/
  rules/  state, step (one fixed step: input, orders, intents, movement, combat, morale, objectives),
          movement (accel, dodge i-frames, knockback, tile collision), spatial (uniform-grid hash: radius and cone queries),
          combat (strike chains, hit boxes, block/parry window + counter, stagger, hit-stop, flash + knockback, NEVER blood),
          weapons (data tables), morale (group bar; break -> flee/kneel/drop weapon), objectives (escort, defend, hold N of M,
          relay, protect, survive, choice; lowered-weapon attack fails), squad (orders ring, companion abilities),
          stealth (sight cones, hearing, alert states, hiding, vanish, double ambush damage), skills, difficulty,
          dialogue (scene runner state), learning (triggers, source unlocks, check via core/quiz, honours), progress
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
- One atlas per chapter (WebP, <= 1024x1024 so it fits a low-end GPU), sprite sheets, no per-frame allocations in
  the step: struct-of-arrays entity state, reused vectors, `pool.ts` for particles/text/projectiles.
- Spatial hash for collisions, targeting and sight; at most N=24 active AI per frame, farther ones tick at 1/4 rate.
- Canvas 2D: static tile layer pre-rendered to an offscreen canvas and scrolled; one draw per sprite; no
  shadows/filters; integer-aligned blits; DPR capped at 2.
- HUD in DOM with `transform`/`opacity` only; no layout animation. Audio: synthesized SFX, one music loop
  at a time (<= 300 KB), decoded lazily.
- Heap: pre-size pools, forbid growth after chapter start; the soak test watches the trend.

## 12. Vertical slice (A1 exit): Kiriji Chapter 1, "The Ajele's Due"

In: hub (Oke-Imesi, talk + one artefact that unlocks the source card), museum frame scene with Mr Adewale,
escort-6-villagers fight (guards pushed back, not defeated), the street-brawl hero moment (strike, dodge, parry,
counter), companion Akin with follow/hold, morale and the captain archetype, Story difficulty plus Warrior/Legend
parameters, 2-3 did-you-know cards, one source card in the codex, 3-item knowledge check with explanations,
glossary taps, results and honours, save through the portal bridge, en + pcm, accessibility basics, content
through the A0 pipeline with `reviewed:false` items (dev/preview build only).
Out (later phases): stealth, aiming, chase and rhythm set pieces, the squad ring beyond follow/hold, timeline and
map screens, skill tree depth, classroom mode, all other chapters, music (placeholder loop), voice barks.
Chapter 1 is `delivery: "initial"`, so the slice also proves the 3 MB initial budget. A throw-away second chapter
pack (any tiny `ch02`) proves download, verify, cache and offline replay before real chapters exist.

## 13. i18n, accessibility, feature flags

- **i18n:** `src/i18n/en.json` and `pcm.json` for UI from day one (core `t('key')`, `_review` flags, `npm run i18n:check`).
  Story text lives in content JSON with `text.en` required and `text.pcm` from day one; `yo`/`ig` arrive for the
  glossary and barks with `native_review:true` until a native speaker clears them. A line mixing languages lists
  them in `langs`; a missing `native_review` on a yo/ig/ha line is a validation error. Diacritics are checked
  (NFC, marks present) but only a native speaker can approve them. Strings never go in code.
- **Accessibility:** reading-level target JSS (short lines, <= 220 chars); text size setting; high-contrast
  toggle; reduced motion (no screen shake, no hit-stop flash); one-handed mode and auto-block on Story (from
  SCRIPT); all controls >= 44 px; keyboard and mouse on desktop; every cutscene panel has a text line (nothing is
  voice-only: "all story text is read on screen"); no colour-only signals (morale and alert states use icons and
  shapes); `aria-live` for did-you-know cards and the knowledge check; focus order and Esc/pause work in the DOM
  overlay; captions for barks.
- **Feature flags** (`games/akoni-dike/features.json`, validated, default off for the unfinished):
  `moremiPrologue: false`. A chapter ships only if it has no `featureFlag` or the flag is on
  (`chapterEnabled`). The build omits flagged-off chapters and their packs from `packs.json`, so a flag-off prologue
  costs zero bytes.

## 14. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Schedule: the A1 slice is far bigger than "weeks 2-5" (section 15 sums to about 11 weeks for one developer) | cut list in section 15; owner decides whether to extend A1 or trim the slice |
| R2 | Core budget 60 KB: `loop`, `quiz`, `packs` add to the shared `core` chunk of every game | named imports only (measured: validators +2.6 KB); measure core after each module; `packs` and `quiz` must tree-shake out of games that do not import them |
| R3 | 1 MB pack: art (<= 300 KB), music loop (<= 300 KB), SFX, barks, tiles and JSON are already compressed; gzip will not help | per-chapter art/audio budget table in the asset brief; shared assets in the initial download (D7); audio at 64 kbps mono; atlases quantised |
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
| A1.0 | Owner review of A0 (this doc, schemas, size rules) and answers to the questions below | 2 (owner) | owner approves D1-D10 |
| A1.1 | Perf spike: canvas scene with 24 sprites, spatial hash, atlas, fixed step on a 4x throttled profile | 2 | >= 55 fps; decides D9 |
| A1.2 | `core/loop` extensions (timeScale, simTime, setStep, onResume) + tests | 1 | existing loop and Penalty King tests unchanged |
| A1.3 | `core/quiz` (new module, copy of Sabi tests passing) | 3 | tests green; core size delta reported |
| A1.4 | `core/packs`: manager, integrity, retry, cache, eviction, state machine + tests | 5 | >= 90 % coverage; fault-injection tests (offline, 404, corrupt hash, quota) |
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
| | **Total** | **56 (about 11 weeks)** minus parallel asset work | |

Cut list if the window must stay at 4 weeks (about 20 days): defer A1.9, the codex screen, glossary taps beyond one
term, Warrior/Legend tuning, and the packs download UI polish; keep A1.1-A1.8, A1.10, A1.12 (check + DYK only), A1.14.

Stop for human review at the end of A1 (plan rule). QA agent report: `docs/qa/akoni-dike-A1-report.md`.

## 16. Questions and contradictions for the project owner

Contradictions and gaps found in the specs and the existing code:

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
