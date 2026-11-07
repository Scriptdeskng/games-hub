# Naija Ludo (`naija-ludo`) asset brief

Binding sources: `CULTURAL_GUIDE.md` (section 7 row "Naija Ludo"), `STYLE_GUIDE.md` (2.2 colour-blind rules, 5 patterns, 9 SFX), `PERSONAS.md`, `docs/GAMES.md` section 2. Structure follows `snakes-ladders-brief.md`.
Palette: **Naija Green** (`theme-naija-green`: `#0B3D22` bg, `#06281A` bg-2, `#F3FAF4` cream surface, `#DCEFE1` surface-2, `#FFC933` gold accent) with four seat colours. Signature SFX: shekere dice, agogo capture, talking-drum turn. Music: highlife (juju as fallback). Characters: Funmi, Baba Ade and a third CPU, **Malam Sani**.
Status: all art is **made in-repo** (original SVG from shapes, generator `scripts/gen-naija-ludo-art.mjs`). Hero art, music and voice need humans (section 9).

## 1. Cultural concept
A Ludo table on a "Naija Green" cloth: a 15x15 cross board whose cream track runs between four seat yards, each woven in a different Nigerian textile. Safe squares carry a gold star over an **adire** resist-dye fill (indigo rings and dots on cream). Each yard has its own pattern: **adire rings** (Pepper Red), **aso-oke stripes** (Danfo Yellow), **akwete zigzag** (Adire Indigo), **uli leaf-and-wave line** (Ugu Green). Home arrival is celebrated with an aso-oke stripe sweep and gele-ribbon confetti. Opponents are Funmi (bubbly, never retreats), Baba Ade (proud retired teacher) and Malam Sani (calm strategist).

Regions and traditions: **Yoruba** (adire, aso-oke, gele, Funmi from Lagos, Baba Ade from Ibadan), **Igbo** (akwete diamonds, uli line, udu and ekwe in the SFX), **Hausa-Fulani** (Malam Sani from Kano; highlife music is pan-Nigerian, West-African coastal in origin, born in Ghana and Nigeria, so we brief it with Nigerian highlife players), **urban Lagos** (shekere/talking-drum street feel). Third CPU reason: two Yoruba personas already sit at the table, so the third seat goes to the **North (Hausa-Fulani)** for regional balance (Principle 3). Rotation alternative for a later game counter: Chidi (Igbo, Owerri).

## 2. Seats, colours, shapes (colour-blind contract)
Seat order is **clockwise** and fixed to board positions (art is baked). Colour is never the only cue: each seat has its own **seed silhouette**, **inner mark**, **yard pattern**, **yard letter tag** and **centre-triangle mini shape**.

| Seat | Position (yard) | Name | Hex | Silhouette | Inner mark | Yard pattern | Tag | Default occupant |
|---|---|---|---|---|---|---|---|---|
| 0 | bottom-left | Pepper Red | `#D91F26` | circle | white ring + dot (adire ring) | adire rings | P | you |
| 1 | top-left | Ugu Green | `#6DBA3F` | diamond (akwete) | ink diamond outline + dot | uli leaf/wave line | U | Funmi |
| 2 | top-right | Danfo Yellow | `#FFC20E` | square | two ink bars (aso-oke stripe) | aso-oke stripes | D | Malam Sani |
| 3 | bottom-right | Adire Indigo | `#1D3A9E` | triangle | nested white triangle outline | akwete zigzag | A | Baba Ade |

- Turn order 0 -> 1 -> 2 -> 3 (clockwise). 1 CPU: you at seat 0 and the CPU at the opposite seat 2. 3 CPUs: all four seats. The player may choose any colour; CPU personas take the remaining seats preferring their affinity (Funmi Ugu Green, Baba Ade Adire Indigo, Malam Sani Danfo Yellow). Optional: rotate the board container in 90 degree steps so the human yard is bottom-left (nearest the thumb) and counter-rotate seeds.
- Seat colours are tokens: Pepper Red = signage red (`--ng-accent` in Danfo Yellow), Danfo Yellow = `--ng-primary` of `theme-danfo`, Adire Indigo = `--ng-stripe-1` of `theme-adire`, Ugu Green = `--ng-accent` of `theme-market`. None is the Naija Green board; the board uses `--ng-bg`, `--ng-surface`, `--ng-surface-2`, `--ng-stripe-*`. Not a party colour block (green appears only as board field, never green-white-green).
- Contrast (WCAG luminance, computed by `scripts/check-naija-ludo-art.mjs`, section 8): every seed has a 4 unit ink outline and a white halo, so piece versus any square is at least 3:1 (ink `#1D1D20` on cream is 15.8:1, white halo on the dark yard inset `#06281A` is 15.8:1). Marks: white on red 5.0:1, white on indigo 9.8:1, ink on yellow 10.4:1, ink on green 7.0:1. Greyscale luminance of the fills: indigo 6%, red 16%, green 39%, yellow 60% (four separate steps), and the silhouettes differ anyway.

## 3. Board geometry (contract for the developer)
- Board art `board/board.svg`: viewBox 1500x1500, **15x15 cells of exactly 100 units**, origin top-left, `(col,row)` 0-based. No text baked except the four yard tags (P U D A, vector paths). At 360 px width with a 6 px CSS frame (aso-oke stripe from `--ng-stripe-1..3`) the cell is **23.2 px**; never below 22 px. Board `aspect-ratio:1; width:min(100%, 92dvh*0.62)`.
- Yards are 6x6 blocks at (0,0) TL, (9,0) TR, (0,9) BL, (9,9) BR. Seed slots in yard-local units: `(200,200) (400,200) (200,400) (400,400)` (add yard origin x100). Quick mode (2 seeds) uses slots 0 and 3 (diagonal); empty pits just stay as outlines.
- **Track: 52 cells, clockwise**, index 0 = (0,6): row 6 cols 0..5; col 6 rows 5..0; (7,0); col 8 rows 0..5; row 6 cols 9..14 ... in order: left arm top row (0,6)-(5,6), up col 6 (6,5)-(6,0), (7,0), down col 8 (8,0)-(8,5), right arm top row (9,6)-(14,6), (14,7), back along row 8 (14,8)-(9,8), down col 8 (8,9)-(8,14), (7,14), up col 6 (6,14)-(6,9), left arm bottom row (5,8)-(0,8), (0,7). The four inner corners of the cross ((5,6)->(6,5), (8,5)->(9,6), (9,8)->(8,9), (6,9)->(5,8)) are diagonal steps, as on a standard Ludo board. Machine-checked: `node scripts/check-naija-ludo-art.mjs` (needs Playwright Chromium) asserts 52 unique closed neighbouring cells, 4 diagonals, stars 8 squares after each start, home-column mouths, contrast, and the greyscale silhouette test.
- **Start squares** (seat colour fill, gold star): seat 1 (1,6), seat 2 (8,1), seat 3 (13,8), seat 0 (6,13). **Star squares** (adire fill, gold star), 8 squares after each start: (6,2), (12,6), (8,12), (2,8). All 8 are safe; the star shape (not colour) marks safety.
- **Home columns** (5 cells, seat colour, white chevron toward the centre): seat 1 row 7 cols 1..5; seat 2 col 7 rows 1..5; seat 3 row 7 cols 9..13; seat 0 col 7 rows 9..13. A seed leaves the track after 50 steps from its start (cell just before its home column mouth: seat 1 (0,7), seat 2 (7,0), seat 3 (14,7), seat 0 (7,14)), then 5 column steps, then centre (56 steps total from start).
- **Centre** 3x3 at (6,6): four triangles, left = seat 1, top = seat 2, right = seat 3, bottom = seat 0, each with a small white copy of the seat's silhouette.
- Seed sizes: on track **0.72 cell** (about 17 px), in yard **0.9 cell**. Stacking: same-seat seeds on one cell render the top seed plus up to two copies offset (+0.08, -0.08 cell) and a `badge-N` (N = 2..4) at the bottom-right, badge 0.62 cell (about 14 px, digit about 10 px tall). Different seats on one safe square: groups in the four quadrants at 0.5 cell, each with its badge if N >= 2. The star's tips stay visible around a circle seed; the adire fill identifies the square too.
- Animate only `transform` and `opacity`. Tap target for a movable seed: wrap in a 44 px hit area (`fx/move-ring.svg` dashed ring shows which seeds can move; `fx/target-marker.svg` shows the landing square).

## 4. Assets (all under `games/naija-ludo/assets/`)
| # | Path | Size / viewBox | Format | Purpose | Cultural reference |
|---|---|---|---|---|---|
| 1 | `board/board.svg` | 1500x1500 | SVG | Whole static board: track, adire safe squares with stars, seat start squares, home columns, centre triangles, four patterned yards with letter tags and seed-shaped pits | Naija Green, adire, aso-oke, akwete, uli |
| 2 | `board/yards.svg` | sprite, 4 symbols 600x600 (`yard-red`, `yard-green`, `yard-yellow`, `yard-indigo`) | SVG sprite | Seat picker and how-to art | same patterns |
| 3 | `board/legend.svg` | sprite, 4 symbols 100x100 (`lg-safe`, `lg-start`, `lg-homecol`, `lg-centre`) | SVG sprite | How-to legend: what a safe square, start square, home column and centre look like | adire, star |
| 4 | `seeds/seed-red.svg` `seed-green.svg` `seed-yellow.svg` `seed-indigo.svg` | 48x48 (viewBox -2 -2 52 52, so the halo is never clipped) | SVG | The four seeds: circle, diamond, square, triangle; ink outline, white halo, inner mark | ayo-seed feel; adire ring, akwete diamond, aso-oke stripe |
| 5 | `seeds/badge-2.svg` `badge-3.svg` `badge-4.svg` | 32x32 | SVG | Stack count badges (digits drawn as paths, no font needed) | |
| 6 | `dice/die-1.svg` ... `die-6.svg`, `die-roll.svg`, `hands-cup.svg` | 64, 64, 128 | SVG | Copied from Snakes & Ladders (plain wooden-table die, ink pips, pip count is the number); hands-cup is the shekere shake cue | cupped-hands shake |
| 7 | `fx/capture-burst.svg` | 128x128 | SVG | Capture burst: gold 12-point star with ink outline and dashed ring, scale and fade | agogo strike |
| 8 | `fx/six-burst.svg` | 128x128 | SVG | "Six" highlight: ring of six dots with rays (six dots = shape cue) | |
| 9 | `fx/move-ring.svg` | 64x64 | SVG | Movable-seed dashed ring (white over ink, readable on every cell) | |
| 10 | `fx/target-marker.svg` | 48x48 | SVG | Landing-square pin | |
| 11 | `fx/home-rosette.svg` | 128x128 | SVG | Home reached: aso-oke stripes bent into a rosette, pops at the centre | aso-oke |
| 12 | `fx/confetti.svg` | sprite, 5 ribbon symbols 16x44 (`rb-gold`, `rb-wine`, `rb-orange`, `rb-green`, `rb-cream`) | SVG sprite | Gele-ribbon confetti, tiny | gele |
| 13 | `fx/stripe-sweep.svg` | 256x48 tile | SVG | Aso-oke stripe band swept across the screen on a win | aso-oke |
| 14 | `thumb/thumb-512x512.svg`, `thumb/thumb-1024x500.svg` | | SVG sources | Portal thumbnails, no text (export to `.webp` at the human pass) | hero art placeholder |
| 15 | `audio/music/ludo-menu-highlife.mp3`, `ludo-play-highlife.mp3` | silent | mp3 | Music placeholders (section 7) | |
| 16 | `audio/voice/vo-ld-*.mp3` (8) and `audio/voice-manifest.json` | silent | mp3, json | Voice placeholders (section 8) | |
| 17 | `ship.json`, `CREDITS.md` | | json, md | include-list (runtime art only) and licence log | |

Dev-only preview (not shipped): `docs/assets/naija-ludo-preview.html` shows the board at 360 px in colour and greyscale, a 3-seed stack with badge, seeds, effects and thumbs. Total art: see the final report (about 75 KB raw SVG, target 150 KB).

Personas: avatars come from the shared `packages/core/assets/avatars/{funmi,baba-ade,malam-sani}.svg`; no per-game copy.

## 5. SFX list: event to instrument to preset
Written in `games/naija-ludo/src/audio/sfx.ts` (export `ludoSfx`; core voices only, no new instrument, so it is one family with the other games). Register `core.audio.registerSfx({ ...coreSfx, ...ludoSfx })`; soft mix `softSfx(...)`. All short cues are <= 0.3 s; `homeReached` is celebration class (0.95 s).

| Event | Instrument / sound | Preset |
|---|---|---|
| Button tap | Ekwe | `tap` (core) |
| Your turn | Talking drum up glide | `turn` (core) |
| CPU turn | Soft low ekwe | `cpuTurn` |
| Dice shake and roll | Shekere + ekwe thud | `roll` |
| Dice lands | Ekwe + udu | `diceLand` |
| Six | Agogo + high agogo ting | `six` |
| Bonus roll | Agogo ting a fourth apart | `bonusRoll` |
| Seed released from the yard | Talking drum up + udu | `release` |
| Seed hop | Ekwe (piece-move pitch, rise per hop) | `step` |
| Seed picked | Ekwe high | `pick` |
| Seeds stack | Udu + ekwe | `stack` |
| Landing on a star | Agogo ting + soft ekwe | `safe` |
| Capture (any) | Agogo double bell + low udu | `capture` |
| Your seed captured | Talking drum down + low udu (gentle) | `seedLost` |
| Enter home column | Talking drum squeeze | `homeColumn` |
| Seed reaches home | Rising agogo run + ogene ring | `homeReached` |
| Three sixes, turn forfeited | Squeeze + low ekwe | `tripleSix` |
| No legal move / exact roll needed | Ekwe double low click | `noMove` |
| Win / lose | Fanfare, ogene, drum fill / gentle drum steps | `win`, `lose` (core) |

## 6. Personas for the 3-CPU table
| Persona | Region | Seat default | Suggested AI flavour (developer decides) | Banter keys `ludo.banter.<persona>.<event>` |
|---|---|---|---|---|
| Funmi | Yoruba, Lagos | seat 1 Ugu Green | Hard: captures whenever she can, bold (PERSONAS.md) | capture, captured, six, home, win, lose |
| Baba Ade | Yoruba, Ibadan | seat 3 Adire Indigo | Medium: steady progress, teaches | same |
| Malam Sani | Hausa-Fulani, Kano | seat 2 Danfo Yellow | Medium to Hard: safe squares first, patient; keep think delay <= 0.6 s in Ludo | same |

Text-only banter (en / pcm; new lines marked `_review`): Funmi capture "Captured! Back to the start you go, my friend." (PERSONAS 4); Funmi captured "I no dey retreat. I no dey surrender." (3); Funmi six "Six! E don come o!" `_review`; Funmi home "Home sweet! One don reach, three remain." (7); Funmi win "Smile, na just Ludo!" `_review`; Funmi lose "Hmm, you don catch me! Well played." Baba Ade capture "A small lesson in patience, my child." / "Small lesson for patience, my pikin." `_review`; captured "Hmm. Interesting move. Very interesting." (3); six "Even luck must be counted." / "Even luck, you must count am." `_review`; home "One seed is home. Patience pays." ; win "Ẹ kú iṣẹ́! Well done on your work." (4, Yoruba `_review`); lose "Ah! You have caught me. Well played." (7). Malam Sani capture "Sorry, my friend. Patience is also a move." / "Sorry, my friend. Patience na move too."; captured "No problem. We learn from every game." (6); six "Six. I waited, and it came." / "Six. I wait, e come." `_review`; home "One is home." ; win "Madalla! A good move." (4, Hausa `_review`); lose "A calm mind wins. Well played." No money, interest or bargain banter (Funmi's banker job is background only).

## 7. Music brief (human composer)
| File | Use | Length | Tempo and feel | Instruments | Mood |
|---|---|---|---|---|---|
| `ludo-menu-highlife.mp3` (+ `.ogg`) | menu | 45 s loop, <= 300 KB | 108 BPM, relaxed two-beat swing | two clean electric guitars with palm-wine-style picking, bass, claves, shekere, brushed kit | warm veranda, welcoming |
| `ludo-play-highlife.mp3` (+ `.ogg`) | play | 60 s loop, <= 300 KB | 112 BPM, I-IV-V, walking bass, sparse | same, plus optional soft horn stabs; leave space for dice and agogo SFX; keep 3 to 8 kHz thin (shekere SFX) | friendly competition, never tiring over 10 minutes |
Fallback slot `ng-play-highlife` / `ng-play-juju`. Rules from `MUSIC_BRIEF.md`: -16 LUFS, -1 dBTP, seamless, no samples of existing songs, no artist sound-alikes.

## 8. Voice lines (human Nigerian voice actors, silent placeholders now)
Files `assets/audio/voice/vo-<id>.mp3`; shared lines reused: `oya`, `your-turn`, `you-don-win`, `no-shaking`, `e-don-do`, `sweet`.
| ID | Pidgin (pcm) | English (en) | Emotion / direction | Voice | Used for | Flags |
|---|---|---|---|---|---|---|
| `ld-six` | Six! Oya, comot! | Six! Out you come! | punchy, bright | F, 30s | rolled a six | `_review` |
| `ld-capture` | Ah ah, captured! | Oh, captured! | playful surprise, never mocking | M, 30s | a capture | |
| `ld-home` | E don reach house! | One seed home! | warm, pleased | F, 40s | seed reaches home | `_review` |
| `ld-again` | Roll again o! | Roll again! | friendly nudge | M or F, 20s | bonus roll | |
| `ld-triple` | Three sixes o! Turn don pass. | Three sixes! Turn passes. | gentle comic sympathy | M, 30s | triple six | `_review` |
| `ld-exact` | Exact number, abeg! | You need the exact number! | friendly reminder | F, 30s | exact-roll rule | `_review` |
| `ld-safe` | You safe for here! | Safe on the star! | reassuring | F, 30s | landing on a star | `_review` |
| `ld-last` | Last one! Carry am go home! | Last seed! Take it home! | encouraging, rising | M, 30s | final seed | `_review` |

## 9. Make versus human
| Asset | Made now | Needs a human | Spec |
|---|---|---|---|
| Board, seeds, badges, effects, dice, thumbs | yes, original SVG | optional polish | Hand-drawn adire, aso-oke, akwete and uli tiles by a textile-aware illustrator, same ids and sizes |
| Hero art | SVG placeholder (`thumb/*`) | **yes** | 1024x500 and 512x512 `.webp` (<= 60 KB each): board corner, four seeds, Funmi and Baba Ade in front, Naija Green with gold, no logos |
| Persona portraits | shared placeholders | yes (HUMAN_ASSETS #2) | |
| Music, 2 loops | silent mp3 | **yes** | section 7 |
| Voice, 8 lines | silent mp3 | **yes** | section 8, native review of `_review` |
| Synth SFX | yes (core voices) | musician check | confirm `capture` reads as an agogo and `homeReached` as an ogene on a phone speaker |
| Pidgin banter and captions | drafted | yes | native review of every `_review` |
| Cultural review | n/a | yes | section 10 |

## 10. Self-check
1. **Nigerian, not pan-African:** adire, aso-oke, akwete, uli, gele; shekere, agogo, talking drum, ogene, udu, ekwe. No kente, kora, savanna or masks. Pass.
2. **Contemporary and urban, with roots:** phone-sized crisp board, Pidgin banter, highlife, with textile heritage. Pass.
3. **Whole country:** Yoruba (two personas, adire, aso-oke), Igbo (akwete, uli, udu), Hausa-Fulani (Malam Sani). Gap: Middle Belt, South-South (HUMAN_ASSETS #12). Pass with a note.
4. **Celebrate, never mock:** banter is about the game only; capture lines are kind; no money jokes. Pass.
5. **Original work only:** all shapes drawn in the generator; no traced textile, brand or logo; nsibidi and ceremonial uli compositions not used (uli is an abstract leaf and wave line). Pass.
Avoid-list: no sacred, shrine, masquerade or party-colour symbols; stars are plain game safety marks; no real banknotes; plain board-game die only (HUMAN_ASSETS #11); no generic blips. Accessibility: seats differ by silhouette, inner mark, yard pattern, letter tag and centre mini shape, checked in greyscale at 16 and 24 px (`scripts/check-naija-ludo-art.mjs`).
