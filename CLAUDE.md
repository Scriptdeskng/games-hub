# Naija Games — Project Memory

This repo builds a catalogue of lightweight, Nigerian-themed HTML5 games for the GameSplash
subscription portal (m.gamesplash.com.ng). Every game ships as a static folder
(`dist/<slug>/index.html` + assets) uploaded to DigitalOcean Spaces at
`/games/html/<slug>/` and opened from the portal by link or iframe.

Read these before doing any work:
- `docs/GAMES.md` — the 10 games, their rules and scope
- `docs/IMPLEMENTATION_PLAN.md` — phases, architecture, Definition of Done
- `docs/assets/CULTURAL_GUIDE.md` — the Nigerian visual, sound, music, language and character
  direction. **All assets and effects must follow it.**
- `.claude/agents/` — the three subagents (senior-developer, asset-designer, qa-reviewer)

## Audience and hard constraints

**Every game is single-player: one human against the system.** Board and card games pit the
player against CPU opponents. Solo games (quiz, words, runner, match-3) pit the player against
the game's levels, timers and score targets. Never build pass-and-play, local 2-player, online
multiplayer, "invite a friend", or any player-count picker for humans.

Players are Nigerian mobile subscribers on mid/low-end Android phones (2–3 GB RAM, Tecno /
Infinix / Itel / Samsung A-series), often on metered or patchy mobile data.

| Budget | Limit |
|---|---|
| Initial download per game (gzip/brotli, all files) | **≤ 3 MB**, target 1.5 MB |
| Time to first interactive screen on simulated "Fast 3G" | ≤ 4 s |
| Frame rate on a 4× CPU-throttled mobile profile | ≥ 50 fps during play |
| JS heap after 10 minutes of play | no growth trend (no leaks) |
| Console errors during a full playthrough | 0 |

- Portrait-first, 360×640 minimum viewport; must also work in landscape and on desktop.
- Touch-first input; mouse and keyboard also supported.
- Works offline after first load (service worker optional, but no runtime CDN dependencies).
- No real-money mechanics, no gambling (no crash/Aviator, no slots, no cash prizes, no loot
  boxes). Coins and rewards are cosmetic and stored locally or via the portal API.
- No gore. Keep everything family-friendly (telco content rules).
- **Nigerian-made feel throughout:** art, patterns, colours, SFX, music, characters and copy all
  come from the cultural guide (adire, aso-oke, akwete, Arewa architecture; talking drum,
  agogo, ogene, shekere, udu, ekwe; highlife, jùjú, fújì and Afrobeats; Pidgin). No generic
  stock "game" sounds, no pan-African clichés, no stereotypes, no sacred or political symbols.
- Never put a phone number (MSISDN) in a URL, log, or localStorage key. The portal passes an
  opaque `token` only.

## Tech stack (do not change without asking the human)

- **Vite + TypeScript**, npm workspaces monorepo.
- Rendering: **DOM + CSS** for card/board/menu UI, **Canvas 2D** for action games. No game
  engines (no Unity, Phaser, Pixi, Three) unless the human approves. Small focused libs are OK
  if they keep the size budget (justify each one in the PR description).
- Audio: Web Audio API via the shared `@naija/core` audio module. Prefer synthesized SFX;
  music as short `.ogg`/`.mp3` loops ≤ 300 KB each.
- Images: SVG first; raster as `.webp` only, sized for 2× DPR max.
- Fonts: at most 2 self-hosted `.woff2` subsets.
- Tests: **Vitest** for game logic, **Playwright** (mobile Chrome emulation) for smoke tests.

## Repo layout

```
packages/core/        shared shell: boot, loader, audio, i18n, settings, storage,
                      portal bridge, input, RNG, analytics, UI kit (buttons, modals, HUD)
packages/ui-kit/      shared CSS tokens + components (optional split from core)
games/<slug>/         one folder per game: src/, assets/, index.html, game.config.ts
scripts/              size-budget check, build-all, deploy helper, new-game scaffolder
tests/e2e/            Playwright smoke tests, one spec per game
docs/                 GAMES.md, IMPLEMENTATION_PLAN.md, qa/<slug>-report.md, assets/<slug>-brief.md
```

## Code conventions

- Pure, deterministic rules engines (`src/rules/`) with no DOM access, fully unit-tested.
  UI layers only call into the engine. CPU opponents live in `src/ai/` and use the seeded RNG.
- No global state outside the game instance. Every listener, timer and RAF loop is cleaned up
  on `destroy()`.
- Strings never hard-coded in UI: use `t('key')`. Ship `en` and `pcm` (Nigerian Pidgin)
  locale files from day one; `yo`, `ig`, `ha` later.
- Keep each file focused (< ~400 lines). Prefer composition over inheritance.
- Run `npm run lint && npm run test && npm run build && npm run size` before declaring work done.

## Portal bridge contract (implemented in `@naija/core/portal`)

URL params in: `?token=<opaque>&lang=en|pcm&portal=<origin>`.
`window.parent.postMessage` events out (only to the `portal` origin), payload
`{ source: 'naija-games', game: <slug>, type, data }`:
`ready`, `start`, `level_complete`, `score`, `end`, `error`.
Progress save/load goes through `core.portal.saveProgress()/loadProgress()`. These call the
portal API when a token is present and fall back to localStorage otherwise (local dev).

## Workflow with subagents

1. **senior-developer** builds the feature or game and its tests.
2. **asset-designer** writes the asset brief and produces SVG/CSS art and synthesized SFX
   (or clearly labeled placeholders for anything needing a human artist or licensed music).
3. **qa-reviewer** independently checks against the Definition of Done and writes
   `docs/qa/<slug>-report.md` with PASS / FAIL. QA never edits source code.
4. Loop until QA passes, then stop for human review at the end of each phase.

Commit on a feature branch per game (`game/<slug>`), small commits, conventional messages.
Never push to `main` or deploy without explicit human approval.
