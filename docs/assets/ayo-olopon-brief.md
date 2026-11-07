# Ayo Olopon (`ayo-olopon`) asset brief

Binding sources: `CULTURAL_GUIDE.md` (section 7 row "Ayo Olopon"; sections 2 and 3), `STYLE_GUIDE.md` (palettes, patterns, SFX family), `PERSONAS.md`, `docs/GAMES.md` section 3. Structure follows `naija-ludo-brief.md`.
Palette: **Adire Indigo** (`theme-adire`: `#122055` bg, `#0A1233` bg-2, `#F4F1E8` cream, `#1D3A9E` / `#6F93E8` stripes) plus **iroko wood** (`#B07A45`, `#8A5A2B`, `#6A4220`, shadow `#2A1308`) and **brass** (`#F6DB8A` to `#8A5E14`). Note: `game.config.ts` still says `theme-naija-green` (scaffold default); **request to the developer: set `theme: 'theme-adire'`.**
Status: all art is **made in-repo** (original SVG from shapes; generator `scripts/gen-ayo-olopon-art.mjs`, checker `scripts/check-ayo-olopon-art.mjs`). Hero art, music and voice need humans (section 10).

## 1. Cultural concept
A carved **iroko** game board on an **adire indigo** cloth, as in an Ibadan or Ogbomoso game room (a veranda, a stool, two players and a lot of counting aloud). Twelve round pits are carved into warm iroko with a visible grain; each pit has a thin indigo inlay ring with cream resist-dye dots. The board frame is an **adire/aso-oke** band (indigo with a cream dot line and a gold keyline). Each player has a **brass-rimmed seed tray** lined with indigo adire cloth (ring-and-dot resist motif) for captured seeds. Seeds are small, matte, nut-like shapes in four tints (tan-brown, grey-green, terracotta, ivory with indigo speck), the way real ayo seeds come in mixed colours. Sound: seeds clatter in one by one (udu bloop plus ekwe wood click), the sow starts with a shekere rattle, a capture rings an agogo, the turn is announced by a talking drum.

Regions and traditions: **Yoruba** (Ayo/Ayo Olopon, adire, aso-oke band, Ibadan/Ogbomoso setting, Baba Ade), **Igbo** (udu pot drum, ogene gong for big captures), **Hausa-Fulani** (Malam Sani, Hard opponent, as the guide's map names him), **South-South** (Efe, Urhobo, Easy opponent), with the **iroko** craft tradition (carved wood boards, as the guide lists under materials). Ayo is played across Nigeria; the Yoruba setting is because this is the Yoruba form of the game.

**Secular on purpose.** The board is a plain game board: no carved face, no central figure, no divination marks, no circular tray with a border composition. It is **not** an opon Ifa and uses none of its layout or marks (a rectangular slab, 2x6 round pits, two trays). No religious, shrine or masquerade symbols, no cowrie arrangements, no nsibidi, no kente or kora.

## 2. Persona choice (regional balance)
Three CPU opponents, one per difficulty, spanning four regions with the human's board shown as Yoruba:
| Difficulty | Persona | Region | Play style (PERSONAS.md) |
|---|---|---|---|
| Easy | **Efe** (new for Ayo) | Urhobo, Warri (South-South) | quick, talkative, optimistic; sings while he plays. Easy suits "random legal move" and his chatty nature. |
| Medium | **Baba Ade** | Yoruba, Ibadan | retired teacher who loves Ayo; counts seeds aloud, patient, kind (the guide's primary Ayo persona). |
| Hard | **Malam Sani** | Hausa-Fulani, Kano | calm strategist, plans ahead (the guide's map names him for Ayo). |

**Decision:** I add **Efe** rather than Chidi. Efe is already listed for Easy-to-Medium difficulty, gives the South-South voice that PERSONAS.md says is missing, and Chidi's personality is tied to Penalty King (football). Igbo presence comes through the udu and ogene sounds, not a persona. Avatars are the shared placeholders in `packages/core/assets/avatars` (`efe.svg`, `baba-ade.svg`, `malam-sani.svg`). No personality is an ethnic trope.

## 3. Board geometry contract (for the developer)
Machine-readable twin: `games/ayo-olopon/assets/board/layout.json` (import it as a module; it is not in `ship.json`).

**Pit indices (12 pits, `0..11`).** Sowing is `i -> (i + 1) % 12` and runs **counter-clockwise on screen**. Pits `0..5` are the human's, `6..11` the CPU's.
| | pit 0 | pit 5 | pit 6 | pit 11 |
|---|---|---|---|---|
| **Landscape** (1400x520) | bottom row, far left | bottom row, far right | top row, far right (above pit 5) | top row, far left |
| **Portrait** (520x1400) | right column, bottom | right column, top | left column, top (left of pit 5) | left column, bottom |
Landscape: human row at the bottom reads left to right, CPU row at the top reads right to left. Portrait: the human's column is on the right (thumb side), seeds go up the right column, left along the top and down the left column. Chevrons engraved in the middle channel show the direction.

**Trays.** Landscape: CPU tray at the left end, human tray at the right end (each 132x464). Portrait: CPU tray at the top, human tray at the bottom (each 464x132). Each tray has a 48-slot seed grid in `layout.json` (`trays.<who>.slots`, fill in order; seed size 24 units). For more than 24 captured seeds show 24 seeds plus a number, or use the counters (below).

**Pit field.** Pit radius 66 units, pitch 170. The 200x200 state overlays are centred on the pit centre (`overlaySizePct` of board width). Count chips (DOM text, 22 px minimum) sit outside the pit: below the human's pits and above the CPU's in landscape, to the right of the human's and left of the CPU's in portrait (`pits[i].chip`).

**Placing seeds by pit index.** For `k` in `0..n-1`: radius `r = 66 * 0.72 * sqrt((k + 0.5) / n)`, angle `a = k * 2.39996 + jitter(pit, k)`, position = pit centre + `r (cos a, sin a)`. Seed size by count (board units): up to 6 -> 30, 12 -> 26, 24 -> 20, 48 -> 15. Seed variant: `(pit * 7 + k) % 6` -> 0,1,2 `seed-a`; 3 `seed-b`; 4 `seed-c`; 5 `seed-d` (cosmetic only, no gameplay meaning). Use `transform` for positions so sowing animations are cheap.

**Tap targets.** A pit button is 132 units: 91 px on a 360 px wide portrait board, 60 px on a 640 px wide landscape board, always >= 44 px (checked by `check-ayo-olopon-art.mjs`).
Use `assets/ayo-fx.css` (classes `.ayo-board`, `.ayo-pit`, `.ayo-state`, `.ayo-seed`, `.ayo-chip`, keyframes) via `import '../assets/ayo-fx.css'`.

## 4. Assets (all under `games/ayo-olopon/assets/`)
| Path | Size | Format | Purpose | Cultural reference |
|---|---|---|---|---|
| `board/board-landscape.svg` | 1400x520 | SVG | board, wide screens | iroko slab with grain, adire/aso-oke frame band, adire-cloth trays with brass rims, 12 carved pits, engraved direction chevrons |
| `board/board-portrait.svg` | 520x1400 | SVG | board, phones in portrait | same, rotated layout; human column on the right |
| `board/layout.json` | n/a | JSON | pit centres in units and percent, chip anchors, tray slot grids, seed placement formula | contract, section 3 |
| `seeds/seed-a.svg` .. `seed-d.svg` | 32x32 | SVG | four seed shapes and tints: round tan-brown, oval grey-green with a ridge, bean terracotta, teardrop ivory with indigo speck | ayo seeds come in mixed natural tints; silhouettes differ, so variety does not depend on colour |
| `seeds/seed-lift.svg` | 44x44 | SVG | the seed currently "in hand" during a sow (gold halo, drop shadow) | |
| `seeds/seed-ghost.svg` | 32x32 | SVG | dashed outline preview of the landing slot | |
| `counters/counter-1.svg`, `counter-5.svg`, `counter-10.svg` | 64x64 | SVG | brass capture tally counters: round with 1 pip, diamond with 5 pips, hexagon with "10". Shape plus pips plus number; never colour alone | brass (Benin-inspired gleam, guide materials) |
| `states/pit-select.svg` | 200x200 | SVG | pit the player may play (gold ring with four ticks) | |
| `states/pit-hint.svg` | 200x200 | SVG | persona hint (dashed ring and a pointing chevron) | |
| `states/pit-last.svg` | 200x200 | SVG | where the last seed landed (double ring) | |
| `states/pit-danger.svg` | 200x200 | SVG | pit that can be captured next turn (clay ring and "!") | |
| `states/pit-capture.svg` | 200x200 | SVG | pit about to be captured (clay ring and a cross) | |
| `states/pit-disabled.svg` | 200x200 | SVG | pit that cannot be chosen (dark hatch) | |
| `states/pit-skip.svg` | 200x200 | SVG | the origin pit is skipped on a 12+ sow (curved arrow) | |
| `fx/capture-burst.svg` | 240x240 | SVG | agogo-gold starburst with seed chips on capture | |
| `fx/sow-ripple.svg` | 120x120 | SVG | cream rings as a seed lands (scale and fade) | |
| `fx/tray-glow.svg` | 160x160 | SVG | glow in a tray when seeds arrive | |
| `fx/chain-link.svg` | 96x48 | SVG | marks a capture chain (consecutive pits) | |
| `fx/turn-drum.svg` | 64x64 | SVG | gangan talking drum, turn badge (rock with `.ayo-turn-drum`) | talking drum |
| `icon/menu-mark.svg` | 96x96 | SVG | menu mark, replaces the template's `agogo.svg` | |
| `bg/table-cloth.svg` | 160x160 | SVG tile | indigo adire cloth with tie-dye sunburst and ring motifs, seamless; table background (optional) | adire (original design) |
| `thumb/thumb-512x512.svg`, `thumb-1024x500.svg` | 512x512, 1024x500 | SVG | portal thumbnails (SVG sources, no text) | **placeholder hero art** |
| `audio/music/ayo-menu-juju.mp3`, `ayo-play-juju.mp3` | n/a | silent mp3 | music slots | section 8 |
| `audio/voice/vo-ay-*.mp3` (8), `audio/voice-manifest.json` | n/a | silent mp3 + JSON | voice slots | section 9 |
| `ayo-fx.css` | n/a | CSS | layout classes and keyframes (transform and opacity only, reduced-motion safe) | |
| `ship.json` | n/a | JSON | include list with `dynamic` (seed, counter and state families) | |
| `../src/audio/sfx.ts` (+ `sfx.test.ts`) | n/a | TS | `ayoSfx` cue map | section 6 |

Total art about 115 KB raw (about 20 KB gzipped tar); budget 800 KB. The leftover template `agogo.svg` still ships (it is in `ship.json`) until the developer's rewrite stops referencing it; then remove it from `ship.json` and delete it.

## 5. Accessibility notes
Every state overlay has a dark underlay stroke so it reads on both the dark bowl and the light wood. Overlays differ by **shape** (solid ring with ticks, dashed ring with arrow, double ring, ring with "!", ring with cross, hatch, arc arrow), not colour. Counters differ by silhouette and pips. Pit counts are DOM text in a high-contrast chip. Pits are real `<button>`s (keyboard focus ring in `ayo-fx.css`).

## 6. SFX list: event to instrument to preset
Cues are in `games/ayo-olopon/src/audio/sfx.ts` as `ayoSfx` (core voices only). Register with `registerSfx({ ...coreSfx, ...ayoSfx })`; soft mix with `softSfx(...)`. Each interaction cue is <= 300 ms (`sfx.test.ts` enforces it).
| Event | Instrument | Preset |
|---|---|---|
| lift seeds from a pit | ekwe tap + shekere tick | `pickUp` |
| sow starts | shekere shuffle (seeds in the hand) | `sowRattle` |
| each seed into a pit | udu bloop + ekwe click (caller raises pitch 2 percent per seed, cap +12, 110 to 140 ms apart) | `seedDrop` |
| capture | agogo double bell + ting + three-step ekwe sweep | `capture` |
| each extra pit in a chain | rising agogo ting | `chain` |
| capture of 8+ seeds | ogene gong + agogo | `bigCapture` (celebration class) |
| captured seed lands in tray | low udu + soft ekwe | `trayDrop` |
| your turn | talking drum up-glide | `yourTurn` |
| CPU turn | talking drum squeeze, quiet | `cpuTurn` |
| tap a playable pit | ekwe | `pitSelect` |
| hint | single high agogo | `hint` |
| origin skipped (12+) | two rising ekwe ticks | `skipOrigin` |
| illegal tap | two low ekwe clicks | `noMove` |
| must-feed rule | talking drum squeeze + ekwe | `mustFeed` |
| game end, seeds swept | shekere + low udu | `sweep` |
| your seeds captured | talking drum down + low udu, gentle | `seedsLost` |
Win, lose and menu use the shared core cues (`win`, `lose`, `select`).

## 7. Persona banter (text-only in v1; keys `ayo.banter.<persona>.<event>`; new lines `_review`)
| Persona | Event | en | pcm | flags |
|---|---|---|---|---|
| Baba Ade | start | My child, let me teach you a lesson in patience. | My pikin, make I teach you lesson for patience. | (PERSONAS 1) |
| Baba Ade | capture | Ehen. Count your seeds carefully. | Ehen. Count your seed well well. | (PERSONAS 5) |
| Baba Ade | captured | Hmm. Interesting move. Very interesting. | Hmm. Interesting move. Very interesting. | (PERSONAS 3) |
| Baba Ade | win | In my school days, I never lost at Ayo. | For my school time, I never lose Ayo before. | `_review` (PERSONAS 2) |
| Baba Ade | lose | Ẹ kú iṣẹ́! Well done on your work. | Ẹ kú iṣẹ́! You don try. | Yoruba `_review` (PERSONAS 4) |
| Efe | start | Oya, let us play! I will sing while I sow. | Oya, make we play! I go sing as I dey sow. | `_review` |
| Efe | capture | Sorry o, I took your seeds! | Sorry o, I don carry your seeds! | `_review` |
| Efe | captured | Ehen! You have a good hand o! | Ehen! You get hand o! | `_review` |
| Efe | chain | Look at that chain! Ah ah! | See chain o! Ah ah! | `_review` |
| Efe | lose | You win! I will sing for you. | You don win! I go sing for you. | `_review` |
| Malam Sani | start | Sannu, my friend. Let us begin. | Sannu o, my padi. Make we start. | Hausa `_review` (PERSONAS 7) |
| Malam Sani | capture | Patience is also a move. | Patience na move too. | (PERSONAS 1) |
| Malam Sani | captured | Madalla! A good move. | Madalla! Correct move. | Hausa `_review` (PERSONAS 4) |
| Malam Sani | lose | No problem. We learn from every game. | No wahala. We dey learn from every game. | (PERSONAS 6) |
Capture lines are about the seeds, never the player. No money or ethnic jokes.

## 8. Music brief (human composer)
| File | Use | Length | Tempo and feel | Instruments | Mood |
|---|---|---|---|---|---|
| `ayo-menu-juju.mp3` (+ `.ogg`) | menu | 45 s loop, <= 300 KB | 104 BPM, juju-inspired, call-and-response, light | talking drum (lead, soft), shekere, agogo, clean guitar arpeggio, soft bass | veranda game room, welcoming |
| `ayo-play-juju.mp3` (+ `.ogg`) | play | 60 s loop, <= 300 KB | 116 BPM, polyrhythmic percussion, Mixolydian drone | talking drum fills (**sparse, must not mask udu seed drops at 150 to 400 Hz**), shekere on the off-beats, guitar pad, bass | focused, calm, never tense; stays interesting for 10 minutes |
Fallback slot while silent: `ng-play-juju` (`MUSIC_BRIEF.md`). Rules: -16 LUFS, -1 dBTP, seamless, original, no samples, no artist sound-alikes, instrumental only.

## 9. Voice lines (human Nigerian voice actors, silent placeholders now)
Files `assets/audio/voice/vo-<id>.mp3`; manifest `audio/voice-manifest.json`. Shared lines reused: `oya`, `your-turn`, `you-don-win`, `no-shaking`, `e-ku-ise`, `e-don-do`.
| ID | Pidgin (pcm) | English (en) | Emotion / direction | Voice | Used for | Flags |
|---|---|---|---|---|---|---|
| `ay-start` | Oya, make we play Ayo! | Come on, let's play Ayo! | warm, inviting, a stool pulled up | M, 60s | game start | |
| `ay-capture` | Ehen! Those seeds don enter my tray. | Ehen! Those seeds are in my tray now. | pleased, calm, never gloating | M, 60s | CPU captures | `_review` |
| `ay-chain` | Chain o! E dey go, e dey go! | A chain! It keeps going! | excited, rising, sing-song | M or F, 30s | chain of 3+ pits | `_review` |
| `ay-lost` | Ah ah, you carry my seeds! | Oh, you took my seeds! | playful surprise, a laugh, never bitter | M, 30s to 60s | player captures | `_review` |
| `ay-feed` | Give am seed, abeg. Rule be rule. | Give them seeds, please. The rule is the rule. | patient teacher | M, 60s | must-feed prompt | `_review` |
| `ay-count` | Count your seeds well well. | Count your seeds carefully. | slow, measured | M, 60s | idle hint | |
| `ay-skip` | We no dey drop for the same house. | We skip the house we started from. | gentle explanation | M, 60s | origin-skip tooltip | `_review` |
| `ay-close` | E don almost do. Count your tray! | It's almost over. Count your tray! | friendly, building | F or M, 30s | few seeds left | `_review` |
Voice rules (VOICE_SCRIPT.md): real Nigerian actors, no text-to-speech, no faked accent.

## 10. Make versus human
| Asset | Made now | Needs a human | Spec |
|---|---|---|---|
| Board, seeds, counters, states, fx, icon, cloth tile | yes, original SVG | optional polish | A carved-wood illustration of an iroko ayo board and hand-drawn adire tile, same sizes, units and ids (layout.json must keep working) |
| Hero art | SVG placeholder (`thumb/*`) | **yes** | 1024x500 and 512x512 `.webp` (<= 60 KB each): an iroko board in an Ibadan-style game room, hands sowing seeds, adire cloth, Baba Ade, no text, no sacred marks |
| Persona portraits | shared placeholders | yes (HUMAN_ASSETS #2) | |
| Music, 2 loops | silent mp3 | **yes** | section 8 |
| Voice, 8 lines | silent mp3 | **yes** | section 9 |
| Synth SFX | yes (core voices) | musician check | confirm `seedDrop` reads as udu plus wood clicks and `capture` as an agogo on a phone speaker |
| Pidgin banter and captions | drafted | yes | native review of every `_review` |
| Cultural review | n/a | yes | section 11; ideally a Yoruba reviewer who plays Ayo checks the board, plus a second-region reviewer |

## 11. Self-check against the guide
Principles: **1 Nigerian, not pan-African:** iroko, adire, aso-oke band, brass tray, udu, ekwe, shekere, agogo, ogene, talking drum; no kente, kora, savanna, masks. Pass. **2 Contemporary and urban, with roots:** a game room setting, Pidgin banter, sharp mobile layout over heritage craft. Pass. **3 Whole country:** Yoruba (setting, Baba Ade, adire), Igbo (udu, ogene), Hausa-Fulani (Malam Sani), South-South (Efe). Gap: Middle Belt and Edo (HUMAN_ASSETS #12). Pass with a note. **4 Celebrate, never mock:** banter is about seeds and patience. Pass. **5 Original work only:** all shapes from the generator; the textile motifs are original rings and dots, not copied from a named design; no brand or likeness. Pass.
Avoid list: no sacred or shrine symbols (the board is explicitly not an opon Ifa: no face, no central mark, no divination layout), no masquerade regalia, no nsibidi, no party-colour theme (indigo, wood and gold), no real banknotes, no generic blip sounds. Colour-blind: states and counters differ by shape; seeds are cosmetic. Legible at 360x640: portrait board 360 px wide, pits 91 px.
