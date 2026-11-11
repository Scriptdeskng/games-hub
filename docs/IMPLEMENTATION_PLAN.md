# Implementation Plan

## Goal
Ship 10 **single-player** Nigerian-themed HTML5 games (one human vs the CPU or the game itself;
no pass-and-play, local or online multiplayer) (see `GAMES.md`) for the GameSplash portal in about
11–12 weeks. They share one core so that game #10 is far cheaper than game #1.

## Architecture

```
┌──────────────── GameSplash portal (Next.js) ────────────────┐
│  subscriber check → opens game URL with ?token=…&lang=…     │
│  listens to postMessage events (ready/start/score/end)      │
└──────────────────────────┬──────────────────────────────────┘
                           │ iframe / link
┌──────────────────────────▼──────────────────────────────────┐
│ games/<slug>  (static, on DO Spaces /games/html/<slug>/)     │
│   src/rules/   pure game logic (unit-tested)                 │
│   src/ai/      CPU opponents (seeded, Web Worker if heavy)   │
│   src/view/    DOM/Canvas rendering + animation              │
│   src/main.ts  wires engine + view + core                    │
├──────────────────────────────────────────────────────────────┤
│ @naija/core                                                  │
│   boot · loader/progress · audio (WebAudio, SFX synth)       │
│   i18n (en, pcm) · settings · storage · portal bridge        │
│   input (touch/mouse/keys, swipe) · rng (seeded) · analytics │
│   ui-kit: buttons, modal, toast, HUD, menu, how-to-play,     │
│           results screen, CPU-difficulty picker, theme tokens│
│   board-kit: dice, cards, pieces, turn manager (1 human+CPU) │
│   ai-kit: CPU opponent base, difficulty profiles, think delay│
└──────────────────────────────────────────────────────────────┘
```

**Build output:** `npm run build` writes `dist/<slug>/` for every game. Each folder is
self-contained (relative asset paths, no shared runtime CDN), so it can be uploaded on its own.
Shared core code is bundled into each game. That's acceptable because core must stay small:
**≤ 60 KB gzip**.

**Quality gates in CI (`npm run check`):**
1. Lint and typecheck.
2. Unit tests (Vitest). Rules engines need ≥ 90% line coverage.
3. Build all games.
4. `scripts/size-budget.mjs` fails if any game exceeds 3 MB total compressed or core exceeds 60 KB.
5. Playwright smoke tests at a 375×812 mobile viewport: game loads, reaches the menu, starts a
   match vs CPU, plays automatically to the end via a test hook (`window.__naijaTest`), shows
   the results screen, and logs zero console errors.

## Phases

> **Priority override (current): `akoni-dike` is the next game to build.** Finish only the
> game currently in progress to QA PASS, then start `akoni-dike` before any other queued
> game. The remaining Phase 1–3 games resume afterwards in their original order. See
> "Phase A" below.

### Phase A: Akọni & Dike (14–16 weeks, runs next)
Spec: `docs/games/akoni-dike/SCRIPT.md`, `LEARNING.md`, `ASSET_BIBLE.md`.
1. **A0 (week 1):** asset brief (from ASSET_BIBLE), content JSON schemas for chapters,
   dialogue, fact, source and quiz items, and the chapter-pack loader and size rules. **Stop
   for human review.**
2. **A1 (weeks 2–5):** core additions that the later games reuse:
   - `@naija/core/loop` (fixed timestep)
   - `@naija/core/quiz` (Sabi Quiz will reuse it)
   - `@naija/core/packs` (on-demand chapter packs and offline cache)

   Then the action engine: movement, combat and hit reactions, enemy AI with morale, squad
   orders, stealth and sight cones, and a set-piece toolkit for duels, aiming, chases and
   rhythm. **Vertical slice = Kiriji Chapter 1**, fully playable with its learning layer.
   **Stop for human review.**
3. **A2 (weeks 5–10):** Kiriji chapters 2–6, the codex, timeline and map, the cutscene system,
   and classroom mode. **Stop for human review:** historian and cultural review of Kiriji.
4. **A3 (weeks 10–16):** the Ekumeku prologue and chapters 1–6 (stealth, signals, crowds,
   branching objectives), skirmish mode, teacher guides and polish. The Moremi prologue gets
   built only if the client approves it. **Stop for human review:** historian, cultural and
   JSS-teacher review, plus the learning playtest.

### Phase 0: foundation (week 1)
- Monorepo, Vite, TS, ESLint/Prettier, Vitest, Playwright, size-budget script, GitHub Actions.
- `@naija/core` with every module listed above, plus a **demo game** (`games/_template`)
  that uses all of it. `npm run new-game <slug>` scaffolds a new game from the template.
- Portal bridge with a local **mock portal page** (`tools/mock-portal.html`) that embeds a
  game in an iframe and logs its events.
- Visual identity: design tokens (colours, type, radii, shadows), the shared menu, loader and
  results screens, a logo lockup template, the adire/aso-oke/akwete/Arewa SVG pattern library,
  the CPU persona avatars, and the Nigerian instrument SFX family (talking drum, agogo, ogene,
  shekere, udu, ekwe) mapped to tap, success, fail, coin, card and
  dice).
- **Exit criteria:** the template game passes every quality gate, and QA marks it PASS.
  **Stop for human review.**

### Phase 1: Wave 1 classics (weeks 2–5)
Order: **Snakes & Ladders** (proves board-kit and dice) → **Naija Ludo** (reuses dice and
board-kit) → **Ayo Olopon** (AI search) → **Naija Whot** (card system, biggest).
- Build `board-kit` (dice, piece movement, a turn manager for one human vs N CPU players) and
  `ai-kit` (CPU opponent interface, Easy/Medium/Hard profiles, a natural "thinking" delay of
  0.4–1.2 s, and named CPU personas with avatars) alongside the first two.
- Build the card system (deck, hand fan, drag/tap to play, draw pile) for Whot.
- **Exit criteria:** all 4 games pass QA. **Stop for human review**, including a rules check by
  a Nigerian player for Whot, Ludo and Ayo, and a **cultural review** (CULTURAL_GUIDE §8) of
  every game in the phase. Phases 2 and 3 have the same cultural review at their exits.

### Phase 2: Wave 2 (weeks 5–8)
Order: **Sabi Quiz** → **Sabi Words** → **Draughts Naija** → **Penalty King**.
- Quiz and Words share a content-pack loader and the JSON schemas in `packages/core/content`.
- Draughts introduces the Web Worker AI pattern (reuse it to move Ayo's Hard AI into a worker).
- Penalty King introduces the Canvas game loop (`core/loop`: fixed timestep, pause on hidden
  tab), which Wave 3 reuses.
- **Exit criteria:** all 4 games pass QA, and the quiz content has been reviewed by a human.
  **Stop for human review.**

### Phase 3: Wave 3 action/puzzle (weeks 8–11)
Order: **Danfo Dash** → **Mama Put Match**.
- Object pooling, sprite atlas tooling (`scripts/atlas.mjs`), and a performance HUD in dev builds.
- Match-3 level JSON plus a simple level editor page in `tools/`.
- **Exit criteria:** both games pass QA, including performance on a throttled CPU profile.
  **Stop for human review.**

### Phase 4: polish and launch (weeks 11–12)
- Real-device testing on at least 3 low/mid Android phones (human task), fixes, final art and
  music swaps (licensed or commissioned), Yoruba/Igbo/Hausa strings if the client wants them.
- Deploy script for DO Spaces (`scripts/deploy.mjs`, dry-run by default, uses env credentials,
  **never** run without human approval), plus portal catalogue entries (title, thumbnail
  512×512 and 1024×500, category, description).

## Definition of Done (per game)

`akoni-dike` adds four items to the list below:
- [ ] Every item in the SCRIPT.md guardrails and the ASSET_BIBLE anachronism checklist passes
- [ ] No learning content has `reviewed: false` in a release build (the build fails otherwise)
- [ ] The initial download is ≤ 3 MB and each chapter pack is ≤ 1 MB, with offline replay of cached chapters
- [ ] Each chapter is playable start to finish on Story difficulty via `__naijaTest.autoplay()`, including its hero moment and knowledge check


- [ ] Rules match `GAMES.md`, every rule toggle works, and the rules engine has unit tests for each rule and edge case.
- [ ] **Single-player only:** exactly one human seat, with every other seat CPU-controlled (or a solo mode vs the game). There's no pass-and-play, player-count picker for humans, hide-hand screen or multiplayer code path.
- [ ] Each CPU difficulty plays legally and is noticeably stronger than the one below it. Hard must beat Easy in ≥ 80% of 200 simulated games for skill games (Ayo, Draughts, Whot), ≥ 60% for Ludo, and ≥ 55% for Snakes & Ladders, where dice dominate. In solo games, difficulty must measurably raise the challenge (speed, timer, targets).
- [ ] Menu → how-to-play → play → pause/resume → results → replay all work with touch, mouse and keyboard.
- [ ] Portrait 360×640 through desktop, with no overflow, clipped UI or tiny tap targets (≥ 44 px).
- [ ] EN and Pidgin strings are complete, with no missing keys (the i18n check script passes).
- [ ] Sound and music toggles persist, and audio starts only after the first user gesture.
- [ ] Portal events fire in the right order, progress saves and loads through the bridge, and nothing contains an MSISDN.
- [ ] Size budget passes, the game is offline-capable after first load, and there are zero console errors.
- [ ] Every timer, listener, RAF loop and worker is removed on exit, and the heap is stable over 10 minutes (Playwright long-run test).
- [ ] Every asset is original, generated in-repo, or licensed, with the licence logged in `assets/CREDITS.md`.
- [ ] Assets follow `docs/assets/CULTURAL_GUIDE.md`: the game's row in the per-game map is fully delivered (visual world, signature SFX, music brief, personas and copy). Every interaction SFX references a Nigerian instrument or everyday sound, there are no generic stock sounds, and the "avoid" lists are respected.
- [ ] `docs/qa/<slug>-report.md` says **PASS**.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| House-rule disputes (Whot, Ludo, Ayo) | Make every variant a toggle, set Lagos-style defaults, get a human rules review at the phase exit |
| Art quality looks "programmer-made" | Asset designer works from one shared style guide. Hero art (logos, backgrounds, characters) is flagged for a human illustrator; SVG placeholders keep work unblocked |
| Music licensing | Commission or license loops. The designer leaves silent placeholder slots, never imports unlicensed tracks |
| Low-end phone performance | Budgets in CI, CPU-throttled Playwright runs, and real-device testing in Phase 4 |
| Trademark or name conflicts | Check names before launch. No real clubs or brands |
| Scope creep (multiplayer requests) | All games are single-player vs CPU. Any multiplayer request goes to the human, not into v1 |
| Games feel lonely or repetitive vs CPU | Named CPU personas with Pidgin banter, difficulty ramps, daily challenges, streaks and local stats |

## Out of scope for v1
Any multiplayer (pass-and-play, local 2-player, online), accounts beyond the portal token, payments, ads SDKs, and
native app builds.
