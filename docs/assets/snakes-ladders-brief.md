# Snakes & Ladders: Lagos Edition (`snakes-ladders`) asset brief

Binding sources: `CULTURAL_GUIDE.md` (section 7 row "Snakes & Ladders"), `STYLE_GUIDE.md`, `PERSONAS.md`, `docs/GAMES.md` section 4.
Palette: **Danfo Yellow** (`theme-danfo`: danfo yellow `#FFC20E`, asphalt `#1D1D20` / `#2C2C31`, signage red `#D91F26`, cream `#FFF5CC`). Signature SFX: danfo horn, shekere dice. Music: fujitic (fuji-inspired) percussion with talking drum. Characters: Tari and Efe (plus Aisha as optional 3rd CPU).
Status: all art below is **made in-repo** (original SVG from shapes). Final hero art, music and voice need humans (section 9).

## 1. Cultural concept
A "Lagos on a board" game: the 10x10 board is a cream-and-yellow street map where every tenth-of-a-journey passes a small hand-drawn Lagos landmark (suya spot, Balogun-style market stalls, a generator, a NEPA pole, a danfo, a bridge silhouette, a toll-gate shape). **Ladders are the lucky rides** (BRT lane, okada lift, keke shortcut, the clear bridge) and **snakes are the everyday Lagos hold-ups** (potholes, go-slow, NEPA taking the traffic lights, the toll-gate queue). The humour is only about traffic and infrastructure, never about people or groups. Players race 1 to 3 CPU opponents: Tari (Ijaw, Port Harcourt student), Efe (Urhobo, Warri; cheerful Lagos danfo driver) and optionally Aisha (Hausa, Kaduna) so the table is not all South-South.

Regions and traditions: **Lagos / Yoruba urban life** (danfo, okada, BRT, keke, Balogun-style market, mama-put canteen, Agege bread, lagoon ferry); **Hausa** (Aisha as 3rd CPU; aso-oke/adire details are in the shared frame, not here); **Ijaw and Urhobo** (Tari, Efe); **Igbo** (udu and ekwe in the SFX, the aso-oke / akwete stripe trims). Music is **fuji / juju-inspired** (Yoruba pop percussion) with talking drum, agogo and shekere. Textile trim: aso-oke stripe frame and an akwete-diamond finish tile in the shared patterns.

## 2. Board and numbering (contract for the developer)
- Grid 10 x 10, **boustrophedon**: square 1 bottom-left, row 1 runs left to right (1..10), row 2 right to left (11..20 with 11 at the right edge), and so on. Square 100 is **top-left** (row 10 runs right to left).
- Board art is a square 1000 x 1000 viewBox: each cell is exactly 100 x 100 units, origin top-left. Cell (col, row) with `row` counted from the bottom: `r = floor((n-1)/10)`, `c = r even ? (n-1)%10 : 9-(n-1)%10`; centre x = `c*100+50`, y = `(9-r)*100+50`.
- **Numbers are DOM text, not baked into the SVG and drawn ABOVE the overlay (z-index), because ladders cross cells** (crisp, i18n, accessible). Put the number in the **top-left** of the cell: `font: 800 clamp(10.5px, 3.2cqw, 16px) Nunito` (about 11 px on a 360 px phone, board about 340 px wide, cell about 34 px), colour `#1D1D20`, with a cream halo `paint-order:stroke; -webkit-text-stroke:2.5px #FFF5CC` (15.4:1 on the light cell, 13:1 on the darker cell, both pass AA). Never smaller than 10.5 px. Tabular numerals.
- **Landmark icons sit in the bottom-right 65 percent of the cell** and the connector badges sit at the cell centre-low (a 72-unit badge centred at 54,62), so the number box (top-left about 44 x 30 units) is never covered.
- Wrap the board in a 6 to 8 px CSS frame using `--ng-stripe-1..3` (aso-oke stripe). Board is square: `aspect-ratio:1; width:min(100%, 92dvh*0.62)`.

## 3. Recommended ladder and snake layout (DATA the developer owns)
Fair and classic: 8 ladders, 8 snakes, no chains (no end square is the start of another), no overlap, no two end squares touch orthogonally, **no ladder crosses a ladder, no snake crosses a snake, and no line crosses any other line** (verified by script: 0 crossings). Total ladder gain 169, total snake loss 164 (balanced). No ends on squares 1, 2, 99 or 100. Landmark tiles never sit on an end square.

```ts
// theme -> sprite symbol in assets/board/connectors.svg: badge-<theme>
export const LAYOUT = [
  // ladders (from < to)
  { from: 8,  to: 36, kind: 'ladder', theme: 'okada',     caption: { en: 'Okada lift! Straight through the traffic.',          pcm: 'Okada carry you! You pass the traffic.', _review: true } },
  { from: 12, to: 34, kind: 'ladder', theme: 'brt',       caption: { en: 'BRT lane is free. Hop on and ride!',                  pcm: 'BRT lane clear. Enter, make we go!' } },
  { from: 22, to: 42, kind: 'ladder', theme: 'keke',      caption: { en: 'Keke zips you through the back streets.',             pcm: 'Keke carry you pass the back road.', _review: true } },
  { from: 32, to: 54, kind: 'ladder', theme: 'brt',       caption: { en: 'Express BRT! No go-slow today.',                      pcm: 'BRT express! No go-slow today.' } },
  { from: 50, to: 70, kind: 'ladder', theme: 'okada',     caption: { en: 'Okada shortcut up the ramp.',                         pcm: 'Okada shortcut, you no touch jam.', _review: true } },
  { from: 56, to: 74, kind: 'ladder', theme: 'brt',       caption: { en: 'Next stop is way up the board!',                      pcm: 'Next stop dey far front o!', _review: true } },
  { from: 64, to: 84, kind: 'ladder', theme: 'okada',     caption: { en: 'Okada weaves past the jam. Hold tight!',              pcm: 'Okada dey follow gap pass jam. Hold body!', _review: true } },
  { from: 76, to: 95, kind: 'ladder', theme: 'bridge',    caption: { en: 'The bridge is clear. Fly across!',                    pcm: 'Bridge clear, you fly pass!', _review: true } },
  // snakes (from > to)
  { from: 98, to: 78, kind: 'snake',  theme: 'tollqueue', caption: { en: 'Toll-gate queue! Everybody is waiting.',              pcm: 'Toll-gate queue! Everybody dey wait.' } },
  { from: 92, to: 72, kind: 'snake',  theme: 'goslow',    caption: { en: 'Go-slow! Nothing is moving.',                         pcm: 'Go-slow! Nothing dey move.' } },
  { from: 88, to: 68, kind: 'snake',  theme: 'pothole',   caption: { en: 'Pothole! Bounce, bounce, back you go.',               pcm: 'Pothole! Bounce, bounce, you don slide back.', _review: true } },
  { from: 80, to: 60, kind: 'snake',  theme: 'goslow',    caption: { en: 'Go-slow at the junction. Be patient.',                pcm: 'Go-slow for the junction. Calm down, e go clear.', _review: true } },
  { from: 62, to: 40, kind: 'snake',  theme: 'nepa',      caption: { en: 'NEPA took the light. Traffic lights are off!',        pcm: 'NEPA take light. Traffic light don off!' } },
  { from: 58, to: 38, kind: 'snake',  theme: 'pothole',   caption: { en: 'Big pothole! Slow down.',                             pcm: 'Big pothole! Slow down small.' } },
  { from: 52, to: 30, kind: 'snake',  theme: 'goslow',    caption: { en: 'Market-day go-slow! Everyone is honking.',            pcm: 'Market day go-slow! Everybody dey horn.', _review: true } },
  { from: 44, to: 24, kind: 'snake',  theme: 'pothole',   caption: { en: 'Pothole on the service lane!',                        pcm: 'Pothole for service lane!' } },
] as const;
```
Themes: ladders `brt` x3, `okada` x3, `keke` x1, `bridge` x1; snakes `pothole` x3, `goslow` x3, `nepa` x1, `tollqueue` x1. Captions go in `t('snakes.cap.<from>')`; show them as a toast with the up or down arrow icon (never colour only). `_review: true` Pidgin lines need a native check.

## 4. Assets: exact filenames (all under `games/snakes-ladders/assets/`)
Total of all 22 SVGs: **60.8 KB raw, about 7.6 KB gzipped** (svgo-optimised, ids kept), plus about 12 KB of silent mp3 placeholders (limit 800 KB, target 150 KB). Largest: `overlay-default.svg` 14.9 KB (1.8 KB gzip), `board-bg.svg` 11.0 KB (2.2 KB gzip). Every SVG is original, shape-built, and uses only the Danfo Yellow palette plus the pawn colours.

| # | Path | Size / viewBox | Format | Purpose | Cultural reference |
|---|---|---|---|---|---|
| 1 | `board/board-bg.svg` | 1000x1000 | SVG | Board background: 100 cells in two cream tones with thin ink grid lines, start cell (green with a bus-stop pole) on 1, finish cell (chequered with a flag) on 100, and 14 landmark tiles on the squares in section 5. **No numbers, no ladders or snakes baked in.** | Danfo Yellow palette, Lagos map tiles |
| 2 | `board/landmarks.svg` | sprite, 16 `<symbol>`s of viewBox 0 0 64 64 (`lm-danfo`, `lm-ferry`, `lm-stalls`, `lm-generator`, `lm-suya`, `lm-recharge`, `lm-bread`, `lm-football`, `lm-canteen`, `lm-pole`, `lm-brtstop`, `lm-tollgate`, `lm-bridge`, `lm-keke`, `lm-start`, `lm-finish`) | SVG sprite | Reusable landmark icons for the menu, how-to and any custom board squares | see section 5 |
| 3 | `board/connectors.svg` | sprite, 8 theme badges (viewBox 0 0 64 64: `badge-brt`, `badge-okada`, `badge-keke`, `badge-bridge`, `badge-pothole`, `badge-goslow`, `badge-nepa`, `badge-tollqueue`) plus `end-up`, `end-down` (viewBox 0 0 40 40) | SVG sprite | Badges at the "from" end (theme icon and arrow chip) and small "arrival" end caps. Used to build a connector for **any** layout. Ladder badges are **rounded squares with an up-arrow chip**; snake badges are **octagons (stop-sign shape) with a down-arrow chip** | Lagos transport and hold-ups |
| 4 | `board/overlay-default.svg` | 1000x1000, transparent | SVG | Ready-made overlay for the layout in section 3: straight yellow ladders with rails and rungs, wavy red snakes with a white centre dash, badges and end caps. Drop it on top of `board-bg.svg` (same box) until the developer renders connectors dynamically | Generic danfo yellow and black, signage red |
| 5 | `pawns/pawn-you.svg` | 48x48 (viewBox -2 -2 52 52) | SVG | Human pawn: **circle** silhouette, adire indigo `#1D3A9E`, white ring and dot mark; white halo plus 2.5 px ink outline (SL-14 fix: distinct silhouettes, greyscale-checked at 16 px) | Adire indigo |
| 6 | `pawns/pawn-tari.svg` | 48x48 | SVG | Tari: **square** silhouette, teal `#0B7F8A`, white nested-square mark | Creek & Coral (Niger Delta) |
| 7 | `pawns/pawn-efe.svg` | 48x48 | SVG | Efe: **triangle** silhouette, signage red `#D91F26`, white bar (danfo stripe); red, not yellow, so it never melts into the yellow board | Danfo signage red |
| 8 | `pawns/pawn-aisha.svg` | 48x48 | SVG | 3rd CPU (Aisha): **diamond** silhouette, plum `#7B2D8E`, white nested-diamond mark | Ankara plum |
| 8b | `pawns/pawn-funmi.svg` | 48x48 | SVG | Funmi (3rd CPU alternative): **hexagon** silhouette, Naija green `#0E7A3B`, three white dots | Naija Green |
| 8c | `pawns/start-tray.svg` | 160x48 | SVG | Small off-board start tray with four dashed pits (SL-14: place it beside the board, e.g. under the HUD, so the start cluster does not cover the square-1 bus-stop landmark; the developer decides placement) | aso-oke stripe edges |
| 9 | `dice/die-1.svg` ... `dice/die-6.svg` | 64x64 each | SVG | Die faces: cream face, ink pips r=7 (readable at 40 px), 3 px ink edge. The pip count is the number (never colour) | Plain wooden-table die (no brand) |
| 10 | `dice/die-roll.svg` | 64x64 | SVG | Blank blurred "in the air" die with motion ticks, for the roll animation frame | Shekere shake cue |
| 11 | `dice/dice-pick-two.svg` | 144x64 | SVG | "Pick one of two dice" prompt icon: two dice and a fork arrow (shape cue, no text). Use on the 5th-turn banner; the real choice UI uses two `die-<n>.svg` buttons (each >= 56 px) | Choice cue |
| 12 | `dice/hands-cup.svg` | 128x128 | SVG | Cupped-hands dice-throw cue with shake lines (the shekere shake animates it left-right) | Guide section 6: "cupped-hands shake" |
| 13 | `icons/reroll.svg` | 64x64 | SVG | Re-roll power-up: two curved arrows around a die. `currentColor`-free, ink and yellow | Power-up |
| 14 | `icons/reroll-used.svg` | 64x64 | SVG | Used state: same icon greyed with a **diagonal slash** (shape, not colour) | Power-up used |
| 15 | `thumb/thumb-512x512.svg` | 512x512 | SVG source | Portal thumbnail source (export to `.webp` 512x512 at human pass; `sharp` is not installed in this environment) | Hero art placeholder |
| 16 | `thumb/thumb-1024x500.svg` | 1024x500 | SVG source | Portal banner source (export to `.webp` 1024x500) | Hero art placeholder |
| 17 | `audio/music/snakes-menu-fuji.mp3` | silent placeholder | mp3 | Menu loop (human composer, section 7) | Fuji-inspired |
| 18 | `audio/music/snakes-play-fuji.mp3` | silent placeholder | mp3 | Play loop | Fuji-inspired |
| 19 | `audio/voice/vo-sl-*.mp3` (8 files, section 8) and `audio/voice-manifest.json` | silent placeholders | mp3, json | Voice lines | Pidgin and English exclamations |
| 20 | `CREDITS.md` | | md | Licence log | |

Generator: `scripts/gen-snakes-ladders-art.mjs` (re-creates every SVG from shapes, **including the five pawns, `start-tray.svg` and the thumbnails (SL-18 fixed)**; `ART_OUT=<dir>` renders into a scratch dir for diffing, the layout is read from `src/rules/layout.json`; run svgo afterwards with ids kept: `cleanupIds:false`). Dev-only (not shipped): `docs/assets/snakes-ladders-preview.html` renders board, numbers, overlay, pawns, dice and landmarks at 360 px for review.

Wiring notes for the developer:
- Pawn size on the board: **0.5 x cell** (about 17 px at 360 px). When several pawns share a square, nudge them to the four quadrants (offsets +-0.2 cell). Each pawn file has a built-in white halo (outer) and ink outline (inner), so it separates from both cell tones, from the green start tile and from ladder and snake art; silhouettes and letters differ, so shape plus mark never rely on colour. Verified in headless Chromium at 360 px width (pawns at 17 px, 2x DPR) over the start tile, ladders, snakes and landmarks, and in greyscale (QA SL-11).
- Connector for a custom layout (if you do not use `overlay-default.svg`): ladder = two rails offset +-14 units from the centre line, rungs every 28 units (stroke 5, `#1D1D20` under a `#FFC20E` stroke 3); snake = a sine path (amplitude 14 units, wavelength 60 units) from head to tail, stroke 12 `#1D1D20` under stroke 8 `#D91F26` with a `#FFFFFF` dashed centre line (`stroke-dasharray:6 10`). Put the theme badge at the **from** cell centre `(cx+6, cy+12)` and the `end-up` or `end-down` cap at the **to** cell. Keep the overlay `pointer-events:none`.
- Colours in greyscale: ladder yellow is about 75 percent luminance, snake red about 35 percent, so lines still differ even without hue; shape (straight rails with rungs versus wavy line) and the arrow chips are the primary cues.
- Selection and tap: the pawn token itself has no tap target; the **Roll button** (>= 56 px, `ng-btn--lg`) and the two dice choice buttons (>= 56 px each, with a die icon plus a number label) are the tap targets.
- Animate only `transform` and `opacity`: pawn hops (`translate`), die tumble (`rotate`), hands shake (`translateX`).

## 5. Landmark tiles (original illustrations, no logos or brands)
Placed in `board-bg.svg` on these squares (none is a ladder or snake end, and none sits under a connector line of the default layout, verified by script; if you change the layout, re-run `node scripts/gen-snakes-ladders-art.mjs` after editing `LAYOUT` and `LANDMARKS` there):

| Square | Symbol | What it is | Reference |
|---|---|---|---|
| 1 | `lm-start` | bus-stop pole with an arrow sign, green cell | motor park start |
| 3 | `lm-danfo` | yellow minibus with the black stripe, no text or numbers | Lagos danfo |
| 6 | `lm-ferry` | lagoon ferry boat on waves | Lagos water transport |
| 16 | `lm-stalls` | two striped-awning market stalls | Balogun-style market |
| 18 | `lm-generator` | box generator with exhaust puff | "I better pass my neighbour" |
| 21 | `lm-suya` | suya grill with skewers and smoke | suya spot |
| 23 | `lm-recharge` | recharge-card stand with umbrella (generic cards, no network colours) | recharge stand |
| 46 | `lm-football` | football on a dusty patch with goal posts | street pitch |
| 57 | `lm-canteen` | canteen pot on a table with a blank signboard | mama-put |
| 63 | `lm-pole` | NEPA pole with crossbars and wires | NEPA pole |
| 69 | `lm-bread` | long loaf (Agege-style bread) on a tray | Agege bread |
| 79 | `lm-brtstop` | bus shelter, no agency livery | BRT stop |
| 82 | `lm-tollgate` | toll booth and barrier arm (no logo) | Lekki toll-gate **shape** |
| 90 | `lm-bridge` | long girder bridge on piers over water | Third Mainland-style bridge |
| 97 | `lm-keke` | keke napep, yellow with a black stripe | Lagos keke |
| 100 | `lm-finish` | chequered flag and a small house roof ("home") | finish |

(Palette discipline: landmarks use ink, yellow, red, cream, grey, green and blue only; no party-colour pairings as a dominant theme. The green is only the start square tint and small details, never green plus white blocks.)

## 6. SFX list: event to instrument to preset name
Core presets (`coreSfx`) are reused where they fit; game presets are defined below and **belong in `games/snakes-ladders/src/audio/sfx.ts`** (**already written by the asset-designer** at that path because `src/audio/` did not exist; the code below is the same; type-checked against `@naija/core/audio`). Register once: `core.audio.registerInstruments(snakesInstruments); core.audio.registerSfx(snakesSfx);`. All cues are <= 0.3 s except `win`/`lose` (core) and `finishBounce`.

| Event | Instrument / everyday sound | Preset name |
|---|---|---|
| Menu / button tap | Ekwe click | `tap` (core) |
| Start game | Talking drum, two rising hits | `start` (core) |
| Your turn | Talking drum up glide | `turn` (core) |
| CPU turn begins | Soft ekwe (pitch 0.77) | `cpuTurn` |
| Dice shake (cupped hands) | Shekere swung rattle | `roll` (shekere + ekwe thud, = core `dice`) |
| Dice lands on a number | Ekwe thud + udu bloop | `diceLand` |
| Rolled a six | Agogo double bell | `six` |
| Pawn hops one square | Ekwe (piece-move pitch 1.22), pitch rises each hop via `pitch` option | `step` |
| Pawn lands | Udu bloop | `drop` (core) |
| Ladder, BRT | Danfo horn "poom-poom" | `ladderBrt` |
| Ladder, okada | Okada engine pull-away (saw glide) | `ladderOkada` |
| Ladder, keke | Keke "put-put-put" three-wheeler | `ladderKeke` |
| Ladder, bridge | Talking drum up glide + agogo ting | `ladderBridge` |
| Snake, pothole | Udu low bloop + talking drum down glide | `snakePothole` |
| Snake, go-slow | Engine stall + low horn | `snakeGoslow` |
| Snake, NEPA | Talking drum down + descending agogo ting ("light off") | `snakeNepa` |
| Snake, toll queue | Low danfo horn (pitch 0.8) + talking drum down | `snakeToll` |
| Dice choice appears (every 5th turn) | Agogo, fourth apart | `diceChoice` |
| Re-roll power-up used | Shekere shuffle + talking drum squeeze | `reroll` |
| Overshoot, bounce back (exact finish) | Ekwe double low click | `finishBounce` |
| Win | Fanfare, ogene, talking-drum fill | `win` (core) |
| Lose (gentle) | Talking drum 3-step down + udu | `lose` (core) |

```ts
// games/snakes-ladders/src/audio/sfx.ts  (paste; types from @naija/core/audio)
import type { InstrumentPreset, SfxMap } from '@naija/core/audio';

/** Game-specific everyday-sound voices, same preset format as core instruments.ts. Each <= 0.3 s. */
export const snakesInstruments: Record<string, InstrumentPreset> = {
  okadaRev: {
    id: 'okadaRev',
    description: 'Okada engine pulling away: sawtooth 70 to 150 Hz, 26 Hz flutter, low engine noise.',
    duration: 0.3,
    layers: [
      { kind: 'osc', wave: 'sawtooth', freq: 70, freqEnd: 150, glide: 0.26, gain: 0.3,
        lfo: { rate: 26, depth: 0.12, target: 'gain' }, env: { attack: 0.01, decay: 0.28 } },
      { kind: 'noise', filter: 'lowpass', freq: 420, q: 0.7, gain: 0.25, env: { attack: 0.01, decay: 0.22 } },
    ],
  },
  kekePutPut: {
    id: 'kekePutPut',
    description: 'Keke napep three-wheeler: three quick low square pulses ("put-put-put"), 120 Hz.',
    duration: 0.3,
    layers: [0, 0.09, 0.18].map((delay, i) => ({
      kind: 'osc' as const, wave: 'square' as const, freq: 120 + i * 8, gain: 0.3, delay,
      env: { attack: 0.004, decay: 0.07 },
    })),
  },
  engineStall: {
    id: 'engineStall',
    description: 'Engine dying in a go-slow: sawtooth falling 130 to 45 Hz with a slowing stutter.',
    duration: 0.3,
    layers: [
      { kind: 'osc', wave: 'sawtooth', freq: 130, freqEnd: 45, glide: 0.28, gain: 0.3,
        lfo: { rate: 14, depth: 0.12, target: 'gain' }, env: { attack: 0.008, decay: 0.28 } },
      { kind: 'noise', filter: 'lowpass', freq: 300, q: 0.7, gain: 0.2, env: { attack: 0.008, decay: 0.2 } },
    ],
  },
};

/** Event name -> cue. Core cues (tap, start, turn, drop, win, lose) come from coreSfx. */
export const snakesSfx: SfxMap = {
  roll: [{ voice: 'shekere', gain: 0.9 }, { voice: 'ekwe', pitch: 0.6, when: 0.2, gain: 0.8 }],
  diceLand: [{ voice: 'ekwe', pitch: 0.77 }, { voice: 'udu', pitch: 1.2, when: 0.02, gain: 0.6 }],
  six: { voice: 'agogo', pitch: 1.2 },
  step: { voice: 'ekwe', pitch: 1.22, gain: 0.7 },
  cpuTurn: { voice: 'ekwe', pitch: 0.77, gain: 0.6 },
  ladderBrt: { voice: 'danfoHorn', gain: 0.9 },
  ladderOkada: { voice: 'okadaRev', gain: 0.9 },
  ladderKeke: { voice: 'kekePutPut', gain: 0.9 },
  ladderBridge: [{ voice: 'talkingDrum', pitch: 1.1 }, { voice: 'agogoTing', pitch: 1.5, when: 0.12, gain: 0.6 }],
  snakePothole: [{ voice: 'udu', pitch: 0.55 }, { voice: 'talkingDrumDown', when: 0.04, gain: 0.7 }],
  snakeGoslow: [{ voice: 'engineStall' }, { voice: 'danfoHorn', pitch: 0.8, gain: 0.5 }],
  snakeNepa: [
    { voice: 'talkingDrumDown', gain: 0.8 },
    { voice: 'agogoTing', pitch: 1.2, when: 0.04, gain: 0.5 },
    { voice: 'agogoTing', pitch: 0.9, when: 0.14, gain: 0.4 },
  ],
  snakeToll: [{ voice: 'danfoHorn', pitch: 0.8, gain: 0.7 }, { voice: 'talkingDrumDown', when: 0.04, gain: 0.7 }],
  diceChoice: [{ voice: 'agogoTing' }, { voice: 'agogoTing', pitch: 4 / 3, when: 0.08, gain: 0.8 }],
  reroll: [{ voice: 'shekereShuffle', gain: 0.7 }, { voice: 'talkingDrumSqueeze', gain: 0.8 }],
  finishBounce: [{ voice: 'ekwe', pitch: 0.77 }, { voice: 'ekwe', pitch: 0.6, when: 0.11, gain: 0.8 }],
};
```
Soft mix: `registerSfx(softSfx({ ...coreSfx, ...snakesSfx }))` for quiet mode. Honour the Sound toggle; trigger `step` once per hop with `{ pitch: 1 + 0.02 * i }` capped at +12 percent so runs do not machine-gun.

## 7. Music brief (human composer)
Two loops, both **fuji / juju-inspired percussion with talking drum**, original, instrumental only, family-friendly. Fall back to the shared slot `ng-play-juju` until delivered.
| File | Use | Length | Tempo and feel | Instruments | Mood |
|---|---|---|---|---|---|
| `snakes-menu-fuji.mp3` (+ `.ogg`) | menu | 45 s loop, <= 300 KB | 112 BPM, lighter density | agidigbo-style bass lamellophone or round bass, shekere, agogo, soft dundun and omele-style drums, sparse talking-drum phrases, light slide-guitar sweeps | friendly, Lagos Saturday morning, "Oya, let's ride" |
| `snakes-play-fuji.mp3` (+ `.ogg`) | play | 60 s loop, <= 300 KB | 120 BPM, polyrhythmic but spacious | talking drum lead in short fills **with space for the udu and ekwe SFX** (no fills on beats 1 and 3 of the last two bars), agogo, shekere, bass, Mixolydian drone with a simple call-and-response guitar line | festive, driving, never aggressive; must not tire over 10 minutes |
Rules (shared `MUSIC_BRIEF.md`): -16 LUFS, true peak -1 dBTP, seamless, no samples of existing songs, no artist sound-alikes. Avoid ritual **bata** drum use; use dundun, omele, shekere, agogo. The danfo-horn SFX is in the 300 to 450 Hz band: leave that band thin in the music. Licence, composer and date go in `CREDITS.md`.

## 8. Voice lines (human Nigerian voice actors; silent placeholders now)
Files `assets/audio/voice/vo-<id>.mp3` and `assets/audio/voice-manifest.json` (same shape as core). Shared lines reused: `oya`, `your-turn`, `you-don-win`, `no-shaking`, `no-wahala`, `e-choke`, `sweet`. Game lines (every line also exists as on-screen text via `t('voice.sl.<id>')`):
| ID | Pidgin (pcm) | English (en) | Emotion / direction | Voice | Used for | Flags |
|---|---|---|---|---|---|---|
| `sl-roll` | Oya, roll am! | Come on, roll it! | bright, quick, a smile | F or M, 20s to 30s | prompt to roll after idle | `_review` (Pidgin "roll am") |
| `sl-ladder` | Enter, enter! Up we go! | Hop on, up we go! | cheerful, rhythmic, friendly (never mocking conductors) | M, 20s to 40s, Lagos | ladder climbed | |
| `sl-pothole` | Ah ah! Pothole! | Oh no, a pothole! | comic dismay, short, never mocking | F, 30-50 | pothole snake | |
| `sl-goslow` | Go-slow don catch you! | You're stuck in traffic! | playful, sympathetic | M, 30s | go-slow, toll and NEPA snakes | |
| `sl-six` | Six! Roll again! | Six! Roll again! | bright, punchy | F, 30s | rolled a six | |
| `sl-reroll` | Roll am again! | Roll it again! | upbeat, a wink | M or F, 20s | re-roll power-up used | `_review` |
| `sl-exact` | Exact number, abeg! | You need the exact number! | friendly reminder, a smile | F, 30s | overshoot on 94 to 99 | `_review` |
| `sl-almost` | Almost there! E don near! | Almost there! | encouraging, rising | M, 30s | within 6 of the finish | `_review` |

Persona banter for this game (text only in v1, keys `snakes.banter.<persona>.<event>`; reuse existing persona lines for consistency):
| Persona | ladder | snake | six | win | lose |
|---|---|---|---|---|---|
| Tari | "Omo, free ride! Respect." (pcm same; slang `Omo` `_review`) | "Pothole? Abeg, na small thing." | "Six! Relax, let me cook." | "Lectures are over. Game time belongs to me." / "Lecture don end. Game time na my own." `_review` | "Wait, you actually beat me? Respect." / "Wait, you sabi like this? Respect." |
| Efe | "Yellow bus, yellow luck!" | "Just a small pothole. We move on." / "Na small pothole. We move on." | "Oya, hop in, we are moving!" / "Oya, enter, we dey go!" | "Last stop! Everybody enjoyed the ride." / "Last stop! Everybody don enjoy." | "You won the road today! Who wants a song?" / "You win the road today! Who wan hear song?" `_review` |
| Aisha (3rd CPU) | "Efficient route. I approve." / "Correct route. I like am." | "Haba! That one was unlucky." (Hausa `Haba` `_review`) | "Six. Rare, but nice." / "Six. E no easy to get, but e sweet." `_review` | "Knowledge is power, but luck also helps." / "Sabi na power, but luck dey help too." `_review` | "Well played. Madalla!" (Hausa `Madalla` `_review`) |

### Regional balance proposal (QA note: all three CPU personas are non-Yoruba in a Lagos game)
Problem: Tari (Ijaw), Efe (Urhobo) and the optional Aisha (Hausa) mean no Yoruba character at a Lagos table.
Proposal (needs a developer decision; no code changed here):
1. **Make Funmi (Yoruba, Lagos) the default 3rd CPU in place of Aisha.** She is Lagos-based, bubbly and competitive, which suits a race, and her art already exists (`packages/core/assets/avatars/funmi.svg`). Her banker job is background only (no money banter, per the QA persona review).
2. **Rotate the 3rd seat for variety:** odd-numbered games Funmi, even-numbered Aisha (seeded by a stored game counter, never random per round), so Hausa representation stays in the game without a fixed all-non-Yoruba table. A second Yoruba option for later: Baba Ade as an elder CPU "Slow and steady" (his Ayo skills do not suit a dice game, so he is the weaker fit; not recommended as default).
3. Result at a 4-seat table: you + Tari (Ijaw) + Efe (Urhobo) + Funmi (Yoruba) or Aisha (Hausa).
Files needed: `pawns/pawn-funmi.svg` (**already made**, spare in `assets/pawns/`); avatar `packages/core/assets/avatars/funmi.svg` (exists); i18n keys `snakes.banter.funmi.<event>` (en and pcm, text below); the persona table in `play.ts`/`flow.ts` gets an entry `funmi` with the same AI profile as Aisha. Voice files: none (banter is text only in v1).

| Persona | ladder | snake | six | win | lose |
|---|---|---|---|---|---|
| Funmi (3rd CPU, proposed) | "Ah ah, free ride! I am not complaining." / "Ah ah, free ride! I no go complain." | "Pothole? I never retreat, I just take another road." / "Pothole? I no dey retreat, I dey take another road." | "Six! Come out, come out!" / "Six! Come out, come out!" | "Home sweet home! Smile, it is only a game." / "Home sweet home! Smile na, na game only." `_review` | "Hmm, you got me! Well played." / "Hmm, you catch me! Well played." |

### Efe's yellow-and-black jacket (decision: keep the avatar, change only his pawn)
The danfo yellow-and-black livery is the generic Lagos transport look named in the cultural guide's Danfo Yellow palette, not a company, agency or brand mark, and Efe is a danfo driver, so the jacket is a character detail rather than an imitation of anyone's identity; I keep `avatars/efe.svg` and the persona sheet unchanged. The one real problem was on the board: a yellow-and-black token disappeared into the cream and yellow cells, so his pawn is now signage red with a cap silhouette and a white "E".

## 9. Make-versus-human table
| Asset | Made now (in-repo) | Needs a human | Spec for the human |
|---|---|---|---|
| Board, connectors, pawns, dice, power-up icon, landmark tiles | yes, original SVG | optional polish | Hand-drawn landmark set, 192x192 px masters for 64-unit symbols, same ids, single flat style, native Lagos reviewer checks BRT, danfo, toll-gate and keke drawings are generic (no agency or brand livery) |
| Hero art (menu key art) | clean SVG placeholder (`thumb/*`) | **yes** | 1024x500 and 512x512 `.webp` (<= 60 KB each): danfo, a clear bridge, a pothole, Tari and Efe in the foreground, Danfo Yellow palette, no logos |
| Persona portraits Tari, Efe, Aisha (and Funmi if adopted) | shared placeholders (`packages/core/assets/avatars`) | **yes** (shared HUMAN_ASSETS #2) | |
| Music: 2 loops | silent placeholders | **yes** | section 7 |
| Voice: 8 lines | silent placeholders | **yes** | section 8, native review of `_review` lines |
| Synth SFX | yes (core voices plus 3 new) | **musician listening check** | Confirm `okadaRev`, `kekePutPut`, `engineStall` read as an okada, a keke and a stalled engine on a phone speaker |
| Pidgin captions and banter | drafted | **yes** | Native review of every `_review: true` line |
| Cultural review | n/a | **yes** | Check section 10 |

## 10. Self-check
Principles
1. **Nigerian, not pan-African:** Lagos transport and street life (danfo, okada, BRT, keke, suya, generator, NEPA, Agege bread, Balogun-style stalls), Yoruba, Igbo and Hausa words only where flagged for review. No kente, kora, savanna, safari or masks. Pass.
2. **Contemporary and urban, with roots:** BRT, toll-gate, generators and recharge cards beside aso-oke and akwete trims in the shared frame. Pass.
3. **Whole country:** the game is explicitly "Lagos Edition" (guide allows an all-Lagos game when the game is about the place). To keep balance the CPU table is Ijaw (Tari), Urhobo (Efe) and, optionally, Hausa (Aisha, Kaduna); the Aisha pawn has a draped-head silhouette. Gap: no Middle Belt, Edo or Efik reference (shared issue, HUMAN_ASSETS #12). Pass with a note.
4. **Celebrate, never mock:** every snake is a traffic or infrastructure hold-up, never a person or group; the voice lines and captions laugh at the go-slow, not at anyone; lose sound is gentle. Pass.
5. **Original work only:** all drawings from basic shapes; no real brand marks, BRT or agency logos, no real person, no screenshot or trace; `Third Mainland` is not named in art or UI text (a generic bridge). Pass.

Avoid-list: no sacred or shrine symbols, no masquerade regalia, no nsibidi, no party-colour pairing as a dominant theme (the danfo yellow and black stripe and signage red are the Lagos transport palette; no green-white-green blocks), no real banknotes, no gambling visuals (a plain board-game die only; compliance question is in HUMAN_ASSETS #11), no generic blip or whoosh sounds. Accessibility: numbers at least 10.5 px with a 13:1 or better contrast; ladders versus snakes differ by shape (straight rails versus wavy line), badge shape (rounded square versus octagon), arrow (up versus down) and luminance; pawns differ by silhouette (plain head, ear-cups, cap brim, draped head), a letter mark (Y, T, E, A) and colour; die pips are counted dots; the power-up used state is a slash.
