# @naija/core

Shared shell for every Naija Games title. One package, subpath exports, zero runtime dependencies,
tree-shakeable. Budget: **core <= 60 KB gzip** including ui-kit, i18n runtime and the audio synth
(measured by `npm run size`: 22.5 KB gzip of JS+CSS for a game that uses only the shell, 27.9 KB for one that also pulls in board-kit and ai-kit; fonts excluded; see "Size" below).

```ts
import { boot } from '@naija/core/boot'; // or: import { boot } from '@naija/core'
```

| Subpath      | What it gives you                                                                                                                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/boot`      | `boot({ slug, root, locales })` wires everything below and returns a `Core` (`t`, `i18n`, `storage`, `settings`, `audio`, `portal`, `perf`, `scope`, `exposeTestHook`, `destroy`). Also reports uncaught errors to the portal (`error` event, max 5). |
| `/loader`    | `runLoader({ root, t, tasks })` progress screen (`.ng-loader`); `imageTask(url)`. Failing tasks never block the game.                                                                                                                                 |
| `/audio`     | Web Audio synth engine, see "Audio API".                                                                                                                                                                                                              |
| `/i18n`      | `createI18n`, `t('key', { n })`, `{param}` interpolation, en + pcm, fallback to en then key.                                                                                                                                                          |
| `/settings`  | Persisted sound / music / volumes / lang. `settings.subscribe(fn)`.                                                                                                                                                                                   |
| `/storage`   | Namespaced localStorage (`naija:<slug>:<key>`) with in-memory fallback. Rejects keys that look like phone numbers or tokens.                                                                                                                          |
| `/portal`    | Bridge, see "Portal bridge".                                                                                                                                                                                                                          |
| `/input`     | `createInput(el, { onTap, onSwipe, keys })`: tap, 4-way swipe, keyboard map. `destroy()` removes everything.                                                                                                                                          |
| `/rng`       | `createRng(seed)` (mulberry32, `getState()/setState()` serializable), `seedFromString`.                                                                                                                                                               |
| `/loop`      | `createLoop({ update, render, step })` fixed timestep, spiral-of-death cap, auto-pause on hidden tab (`onHidden`), `advance(n)` for tests.                                                                                                            |
| `/perf`      | `createPerf()` fps / min fps / heap samples; the loop feeds it.                                                                                                                                                                                       |
| `/test-hook` | `window.__naijaTest` (non-production builds only).                                                                                                                                                                                                    |
| `/lifecycle` | `createScope()`: `on / timeout / interval / raf / add / destroy`. Use it for EVERY listener, timer and RAF so `destroy()` cleans up and the leak counters are accurate.                                                                               |
| `/sw`        | `registerServiceWorker()`. The worker file itself is generated at build time.                                                                                                                                                                         |
| `/board-kit` | Seeded dice, a one-human-plus-N-CPU turn manager, transform-only piece movement, the dice view (cupped-hands shake, shake-to-roll, pick one of two). See "board-kit and ai-kit".                                                                      |
| `/ai-kit`    | CPU opponent plumbing: difficulty profiles, natural thinking delay, personas, banter triggers and the bubble view. See "board-kit and ai-kit".                                                                                                        |
| `/ui-kit`    | DOM + CSS components, see "UI kit". Importing it pulls in `styles/tokens.css`, `styles/skin.css` and `ui-kit.css`.                                                                                                                                    |

## Conventions

- No global state. Everything you create has `destroy()`.
- Never touch `localStorage` directly (an ESLint rule enforces it): use `core.storage`.
- All UI strings go through `t('key')`. Locale files are flat JSON. A line a human should check:
  `"key": { "text": "...", "_review": true }`. `npm run i18n:check` (part of `npm run check`) fails
  on missing keys, empty values, mismatched `{params}` and `t('literal')` keys with no entry; it
  lists every `_review` line.
- Animate `transform` and `opacity` only.

## Portal bridge

URL in: `?token=<opaque>&lang=en|pcm&portal=<origin>`. Out (`window.parent.postMessage`, **only** to
the validated `portal` origin and **only** when that param is present, never `*`):
`{ source: 'naija-games', game: <slug>, type, data }` with `type` in
`ready | start | level_complete | score | end | error`.

```ts
core.portal.emit('start', { level: 'hard' });
await core.portal.saveProgress({ best: 120 }); // always writes localStorage; PUTs to the portal API if a token exists
const p = await core.portal.loadProgress({ best: 0 });
```

The token lives in memory only (never in a URL, storage key or log). **Portal API contract (assumed;
confirm with the portal team)**, every call with `Authorization: Bearer <token>`:

| Call                                                               | Response                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET {portal}/api/games/{slug}/progress`                           | `200 { "data": <json> }`, or `200 { "data": null }` when the player has no progress yet. Return 200, not 404: browsers log each 404 as a console error, which breaks the "0 console errors" budget. A 404 is still tolerated and means "no progress". |
| `PUT {portal}/api/games/{slug}/progress` body `{ "data": <json> }` | any 2xx                                                                                                                                                                                                                                               |

If a call fails the local copy is used. The portal must send CORS headers allowing the game origin,
the `Authorization` and `Content-Type` headers, and `GET, PUT, OPTIONS`.

**Origin allow-list.** Events and the Bearer token only go to an allowed portal origin. Default:
`https:` origins, plus `http://localhost`, `127.0.0.1` and `[::1]` for development. Restrict it with
`boot({ allowedPortalOrigins: ['https://m.gamesplash.com.ng', 'https://*.gamesplash.com.ng'] })`
(exact origins or `https://*.domain` patterns; a list replaces the default). A disallowed `?portal=`
is ignored: no events, no token, local storage only.

`tools/mock-portal.html` (`npm run mock-portal`) implements the same contract on a second origin.

## Audio API (for sound designers)

Instruments are **data**. The engine (`audio/engine.ts`) turns presets into Web Audio nodes; the
types are in `audio/types.ts`.

```ts
// audio/instruments.ts  (asset-designer owns this file)
export const instruments: Record<string, InstrumentPreset> = { agogo: { id: 'agogo', description, duration, layers: [...] }, ... };
// audio/core-sfx.ts     (asset-designer owns this file)
export const coreSfx: SfxMap = { tap: { voice: 'ekwe' }, success: [{ voice: 'agogo' }, { voice: 'agogo', pitch: 1.5, when: 0.1 }], ... };
```

A preset has `layers`, played together. Layer kinds: `osc` (wave, freq, optional glide `freqEnd` +
`glide`, optional `lfo` on pitch or gain), `fm` (carrier `freq`, `ratio`, `index`, optional
`indexDecay`; bells), `noise` (`filter` bandpass | lowpass | highpass, `freq`, `freqEnd`, `q`;
shekere, crowd, wood clicks). Every layer has `env: { attack?, decay }`, optional `gain` and `delay`
(strikes, flams). `duration` is a hard stop (SFX <= 0.3 s, fanfares <= 1.5 s).

Ids the code expects: `talkingDrum agogo ogene shekere udu ekwe danfoHorn crowd fanfare`.
Core events every `SfxMap` must cover are listed in `CORE_SFX_EVENTS`: `tap select back success fail
coin card dice move drop turn tick start win lose unlock`. A cue is one step or an array of steps
`{ voice, pitch?, gain?, when?, key? }` (`key` retriggers instead of stacking).

```ts
core.audio.playSfx('success');                      // named event
core.audio.playSfx('coin', { pitch: 1.2 });         // pitch multiplies every frequency
core.audio.playVoice('ogene', { gain: 0.8 });       // raw instrument
core.audio.registerSfx({ goal: [{ voice: 'crowd' }, { voice: 'fanfare', when: 0.2 }] }); // game cues
core.audio.registerInstruments({ myBell: preset });                                       // game voices
core.audio.playMusic({ kind: 'pattern', bpm: 96, steps: [{ voice: 'ekwe' }, null, ...] }); // synth loop
core.audio.playMusic({ kind: 'file', url: './assets/menu.ogg' });                          // <= 300 KB loop
core.audio.stopMusic();
```

Rules the engine enforces: audio starts only after the first user gesture (the AudioContext is not
even created before it); `settings.sound` mutes SFX, `settings.music` mutes music, both persisted;
master/sfx/music volumes; max 20 simultaneous voices; suspended while the tab is hidden; unknown
voice or event names are silent no-ops (never throw); a missing music file is ignored.

## UI kit

All components return `{ el, destroy() }` (or a richer object), take a `UiContext` (`core` satisfies
it) and use the designer's `.ng-*` classes (see `docs/assets/STYLE_GUIDE.md` section 6): `createMenu`,
`createHowToPlay`, `createDifficultyPicker` (native radios, Easy / Medium / Hard), `createPause`,
`createModal` (dialog role, focus trap, Esc, focus restore), `createHud` (writes the DOM only when a
value changes), `createResults`, `toast`, `createSettingsBar` (sound, music, language),
`createScreenHost` (swap screens, destroy the old one, move focus), `createSegmented` (generic radio-based choice, e.g. number of opponents), `button`, `h`.
Tap targets are >= 44 px (skin.css), everything works with keyboard, strings come from `t()`.
Language switches fire `i18n.onChange`; re-render the current screen there (the template does).

## board-kit and ai-kit

Built with Snakes & Ladders and reused by Ludo, Ayo and Whot. Everything is pure data plus small DOM
helpers, tree-shakeable, and cleaned up through a core `Scope`.

```ts
import { createRng } from '@naija/core/rng';
import {
  rollDie,
  rollTwoDice,
  rollSum,
  rollChoice,
  takeChoice,
  dieOutcomes, // seeded dice
  createTurns,
  advanceTurn,
  currentSeat,
  isHumanTurn,
  isEveryNth, // 1 human + N CPUs
  createMover,
  trackSteps, // transform-only movement
  createDiceView,
  createShakeDetector,
  bindShake, // dice UI
} from '@naija/core/board-kit';
import {
  createCpu,
  withMistakes,
  PROFILES,
  thinkDelayMs,
  createThinker, // CPU opponents
  createBanter,
  createBubbleView, // personas and banter
} from '@naija/core/ai-kit';
```

**Dice** take an `Rng` (`rng.getState()` goes into your saved state, so games replay exactly).
`rollChoice(rng)` returns plain data `{ options: [a, b] }` for "pick one of two"; `takeChoice(choice, i)`.

**Turns.** `createTurns({ human, cpus: [first, ...more], firstSeat? })`: `human` is one object and
`cpus` a non-empty tuple, so a second human seat does not type-check (no pass-and-play, no player
count). State is plain JSON; `advanceTurn(state, { again?, skip? })` returns a new state and counts
each seat's own turns (`turnsTaken`, `isEveryNth(state, 5)`, `turnsUntilNth`).

**Movement.** `createMover(el, { scope, format?, reducedMotion?, hopMs?, slideMs?, lift? })` moves a
positioned element with the Web Animations API (`transform` only). `run(steps, { onStep })` hops
through `PathStep[]` (`kind: 'hop' | 'slide'`) and resolves at the end; `place`, `finish`, `busy`.
Coordinates are board units; `format(x, y)` returns the CSS transform, so cell fractions with
`translate(x*100%, y*100%)` need no measuring and survive resizes. `trackSteps(from, to, cellOf)`
builds the hops along a linear track. No `animate` support or reduced motion means it jumps.

**Dice view.** `createDiceView(ctx, { reducedMotion?, shakeMs?, rollMs?, handsSrc?, art?, shake? })`:
a >= 44 px die button (`el`), `roll(value | null)` (cupped-hands shake, then a tumble; `null` = shake
only), `show`, `setEnabled`, `onRequest(cb)` (tap, or a shake via `devicemotion` where it exists; iOS
permission is asked on the first tap), `choose([a, b])` (resolves 0 or 1; tap or keys 1/2),
`showChoice` for a CPU's pick, `skip()`. `art: { src(n), blank? }` swaps the CSS pips for your die
images. Strings `dice.roll`, `dice.pick`, `dice.option` live in core i18n.

**CPU opponents.** A `Persona` is `{ id, nameKey, avatar, think?, banter: { [event]: i18nKeys[] } }`.
`createCpu({ id, persona, difficulty, brains: { easy, medium, hard }, seed })` returns
`{ decide(ctx), thinkMs(), profile, ... }`; each `Brain` is `{ decide(ctx, rng) }`, pure and seeded
(the CPU owns its own rng so the dice sequence is never disturbed). `PROFILES` give every level a
shared `skill`, `mistakeRate` (Medium slips 20 % of the time with `withMistakes`) and `thinkScale`.
`thinkDelayMs(rng, persona, profile)` is always 0.4 to 1.2 s; `createThinker(scope, instant)` schedules
the move through the scope (and runs it at once when `instant()` is true, for test autoplay).
`createBanter({ t, rng, show })` picks a seeded line per event with a cooldown, per-event chance and a
per-game cap; `createBubbleView(scope, { name })` shows one avatar bubble at a time (`.ng-banter`).

## Test hook

In dev and in the e2e build (`__NAIJA_TEST__` is true; the production build removes it):

```ts
window.__naijaTest = {
  game, autoplay(opts), getState(), setSeed(n),
  counters(),   // live listeners / timers / RAF loops registered through scopes: leak checks
  perf(),       // { fps, minFps, frames, heapMB, heapSamples }
  events(),     // portal events emitted so far
  screen(),     // 'menu' | 'howto' | 'play' | 'results' ...
  destroy(),    // tears the whole game down; counters() should then read 0
};
```

## Performance tests

`npm run e2e:perf -- <slug>` (in `npm run check`, about 12 s): CDP 4x CPU throttle plus Fast 3G;
asserts time to menu <= 4 s and average fps >= 50 during real-time play, prints heap after GC.
`npm run e2e:soak -- <slug>` (nightly, `.github/workflows/soak.yml`; `SOAK_MINUTES`, `SOAK_SAMPLE_S`):
repeated real-time rounds, post-GC heap sampled every 30 s, fails if the heap slope after a
warm-up exceeds 100 KB/min or if listener/timer/RAF counters drift. A game opts in by supporting
`__naijaTest.autoplay({ realtime: true, difficulty })`, which must play through the real render loop
and resolve when the round ends, plus `screen() === 'menu'` once interactive.
Icons: the ui-kit inlines only the designer icons it uses (`ui-kit/icons.ts`, about 1.2 KB) because
`assets/icons/icons.svg` is currently an empty file.

## Service worker

`vite.config.ts` generates `dist/<slug>/sw.js` from `src/sw/sw-template.js`: precaches every built
file (hash-versioned cache `naija-<slug>-<hash>`), cache-first, ignores the query string (so
`?token=` still hits the cache and is never stored), deletes older caches of the same game on
activate. `registerServiceWorker()` never throws: if registration is refused the game just loads
online. The worker is registered from the game's own origin and folder, so it also works inside an
iframe on another origin. Host `sw.js` with a JavaScript content type and short cache lifetime.

## Size

`npm run size` gzips and brotli-compresses every file in `dist/<slug>`. "Core" is the `core-*.js` and
`core-*.css` chunks: `vite.config.ts` puts everything under `packages/core` in a chunk named `core`.
Fonts and images pulled in by core CSS count toward the game total, not the core code budget.

## Gotcha found while building the template

Rollup (via Vite 7) constant-folded `slot.id` to `0` and deleted a pointer handler when the objects
were created inside an `Array.from(n, () => ({ id: 0 }))` callback and mutated later. Build such
pools with a plain `for` loop and `push`. The e2e tests exist partly to catch this class of bug:
always test the production bundle, not only the dev server.
