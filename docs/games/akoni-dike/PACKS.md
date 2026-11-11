# Akọni & Dike: chapter packs, build pipeline and hub (A1 design)

Split out of `ARCHITECTURE.md` (sections 3 to 6 keep their numbers, so older references still resolve).
Everything here is a proposal for A1 except section 3 (the size rules, **[built]**) and where marked. Decisions
D1 to D12 and the owner questions live in `ARCHITECTURE.md`; the quiz extraction is in `QUIZ.md`.

Related: `ARCHITECTURE.md` section 15 (tasks
A1.4 and A1.5 build this).

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

### 3.1 Size model for shared and audio assets: options for the owner **[open, D12]**

The size tool is NOT changed by this document. It understands only `chNN` packs (`PACK_ID_RE = /^ch\d{2}$/`,
`dir` exactly `packs/<id>`, one 1 MB cap). The asset brief (`docs/assets/akoni-dike-brief/04-assets-and-atlas.md`
sections 1 and 2) wants more pack ids, and D7 says the opposite for shared art. The numbers, from the brief:

| Item | Size |
|---|---|
| Initial plan, Kiriji only | shared UI 250 + `shared-kiriji` art 500 + barks 150 + `ch01` 750 + `audio-kiriji` camp and war loops 600 + fonts 55 = about 2.3 MB, plus HTML and JS (core <= 60 KB gz, engine by dev), target 2.4 MB, hard 3 MB |
| `shared-ekumeku` + `audio-ekumeku` | about 1.2 MB (art 500 + barks 150 caps, the rest its music loops) |
| Music double counting (m14) | gzip does not shrink `.ogg` or `.mp3`. If each loop ships in both formats the music doubles: 600 KB becomes 1.2 MB and the Kiriji initial plan goes to about 2.9 MB before any JS. Ship ONE format per loop (brief part 5 already says so; the voice-bark rows still name `.mp3`, which should be `.ogg` or one format) |

| | What changes | Initial download | Verdict |
|---|---|---|---|
| **A** fold `shared-*` into the initial download (D7), allow only `chNN` and `audio-<campaign>` pack ids | `PACK_ID_RE` becomes `^(?:ch\d{2}\|audio-[a-z]+)$` in `size-lib.mjs`, `chapter.ts` (chapter packs only) and the catalogue URL pattern; audio packs get the 1 MB cap | UI 250 + both shared (650 each) + `ch01` 750 + fonts 55 = 2.36 MB + JS, so about 2.6 to 2.8 MB: fits, but over the 2.4 MB target, and every Kiriji player downloads 650 KB of Ekumeku sprites they may never use | smallest change; wasteful on metered data |
| **B** allow `shared-<campaign>` and `audio-<campaign>` pack ids with their own caps | `PACK_ID_RE` becomes `^(?:ch\d{2}\|shared-(?:kiriji\|ekumeku)\|audio-(?:kiriji\|ekumeku))$`; the manifest gets a `kind` (`chapter`, `shared`, `audio`) with caps (chapter 1 MB, shared 700 KB, audio 1 MB; `budgetKb` can still only lower); `dir` stays `packs/<id>`; the pack manifest gains `requires` (`ch11` requires `shared-ekumeku`) and the manager downloads requirements first; the catalogue URL pattern becomes `^\./packs/[a-z0-9-]+/[\w.-]+$`; `shared-kiriji` stays in the initial download because `ch01` needs it | Kiriji only: the brief's 2.3 MB. Ekumeku (`shared-ekumeku` 650 KB, `audio-ekumeku`) is fetched with `ch11`, so a first Ekumeku chapter costs about 1.9 MB | matches the brief and keeps the first download small; about 1 extra day in A1.5 and a rule that packs may depend on shared packs (a refinement of D7, not a reversal: still never on another chapter pack) |
| **C** fold the shared assets into each `chNN` pack | no tool change | initial is small, but each Kiriji chapter pack = 750 KB art + 650 KB shared = 1.4 MB, over the 1 MB cap; six chapters repeat the same 650 KB (about 3.9 MB of duplicate bytes per campaign, because hashed per-pack folders do not de-duplicate) | not viable unless shared art shrinks below about 250 KB per pack |

**Recommendation: B**, with `shared-kiriji` and `audio-kiriji` in the initial download and everything Ekumeku as
packs, and one audio format. A wastes data and misses the 2.4 MB target, C breaks the 1 MB cap. The decision is
needed before A2 asset production; the A1 slice (Kiriji 1 in the initial download plus one throw-away `ch02`)
needs no change to the size tool. Open asset question 5 (does a chapter pack include its audio and JSON) is the
same budget and is answered together with this one.

## 4. Build pipeline for packs **[A1]** (design notes are also in `scripts/vite-naija-plugin.ts` and `scripts/ship-check.ts`)

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

- URLs come ONLY from the embedded catalogue and must match `^\./packs/ch\d{2}/[\w.-]+$` (the pattern widens if the owner picks size option B, section 3.1 above). No string building from
  user input, no query string, so a `?token=` can never reach a pack request or a cache key (CLAUDE.md: no MSISDN/token in URLs).
- `Content-Length` (or catalogue `bytes`) feeds the progress bar. The body is read with `response.body.getReader()`
  so progress is real; if streaming is unavailable, progress is 0 then 100 %.
- Integrity: SHA-256 of the whole file via `crypto.subtle.digest`, compared to the catalogue before anything is
  stored or parsed. Mismatch = `integrity` error, bytes discarded. (`fetch({integrity})` is not used: browsers
  buffer the body before exposing it, which would kill the progress bar.) **Fail closed:** when `crypto.subtle`
  is missing (an insecure context such as plain `http://` on a LAN address, or an old WebView) the pack is
  NOT trusted: `ensure` returns an `integrity` error ("cannot verify this download") and nothing is stored or
  parsed. The only exception is a development build served from `localhost`, `127.0.0.1` or `[::1]`
  (`import.meta.env.DEV` AND that hostname), where the check is skipped with a console warning so local work
  is possible. There is no silent skip anywhere else. Playwright asserts both: with `crypto.subtle` deleted
  on a non-localhost origin the pack fails with `integrity`; on localhost dev it loads with the warning.
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
(`PACK_GAMES` in `scripts/size-lib.mjs`): another game gets it only by an owner-approved edit.

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
