# Naija Whot: asset brief

Slug `naija-whot`. Palette: **Aso-oke Gold** (`theme-aso-oke`: wine `#4A1020`, gold `#E8AE32`, burnt orange `#E4702A`, cream `#FFF3DA`). The scaffold's `gameConfig.theme` is `theme-naija-green`; the developer should set it to `theme-aso-oke` (see section 11). Generator `scripts/gen-naija-whot-art.mjs`, checker `scripts/check-naija-whot-art.mjs`. Art lives in `games/naija-whot/assets/`.

## 1. Cultural concept
A Whot hand on a plastic-or-wooden table at a Lagos veranda or a family sitting room, the cards slapped down with a flourish, the loser groaning kindly. The art keeps that table: **iroko-style wood** inside a gold and wine band, in front of an **original ankara wax-print cloth** (wine ground, gold rings, orange bloom, teal petals). Card backs are a woven **aso-oke** strip (gold, wine, orange, cream bands) with an **akwete** diamond row across the middle. Card faces carry thin aso-oke edge strips in the shape's colour (all five colours on the Whot 20), and an adire-style dotted ring behind the big shape.

Regions and traditions: Yoruba (aso-oke, adire dots, Lagos veranda, agogo), Igbo (akwete diamonds, ekwe, ogene, udu), Hausa (talking-drum sibling instruments and goje feel only through music; Aisha, Kaduna), South-South (Tari, Ijaw, Port Harcourt), with Pidgin as the shared language of the table. The three CPUs span Igbo, Ijaw and Hausa so that, together with Ludo and Ayo (Yoruba x2, Hausa x1) and Snakes & Ladders (Ijaw, Urhobo), no region dominates. Music is highlife (guitar, warm).

Original-work statement: shapes (circle, triangle, cross, square, star) and the 1/2/5/8/14/20 rules are traditional game conventions. Everything else is new: layout (corner index with a stroke-drawn number and small shape, edge strips, dotted ring, icon-and-count ribbon), numerals, colours, backs, table and fx. Nothing was traced from or modelled on a commercial Whot deck or app.

## 2. Card design contract (colour-blind and 360x640 legibility)
Deck (docs/GAMES.md): circle 1 2 3 4 5 7 8 10 11 12 13 14 (12), triangle same (12), cross 1 2 3 5 7 10 11 13 14 (9), square same (9), star 1 2 3 4 5 7 8 (7), Whot 20 x5 = **54 cards**. The sprite holds 49 shape symbols plus one `c-whot-20` (the game draws five copies).

| Shape | Fill | Greyscale luminance |
|---|---|---|
| circle | Pepper red `#D91F26` | 16% |
| triangle | Adire indigo `#2548B8` | 8% |
| cross | Ugu green `#14703A` | 12% |
| square | Palm-oil orange `#E4702A` | 28% |
| star | Plantain gold `#F2B21A` | 51% |

- **Shape plus number always.** The number is ink `#1D1D20` on cream `#FFF3DA` (15.3:1), the shape has a 1.7-unit ink outline, and shapes are different silhouettes (checker: worst pairwise silhouette IoU < 0.85 at 16 and 24 px, circle and square being the closest pair). Colour is a third cue, never the only one.
- **Corner index** (top-left, repeated rotated 180 degrees bottom-right): number about 25 units tall on a 140-unit card (16 px tall on a 64 px card) with a small shape under it. In a **fan of 7 cards at 360 px** (card 64 px wide, step 46 px) the left strip of each card shows number and shape completely. The checker renders `whot-360.png` and a greyscale twin to confirm.
- **Special markers** (a gold ribbon in the card centre, icons and counts only, no words, so they work in `en` and `pcm`): 1 Hold On = loop arrow; 2 = two mini card backs and "+2"; 5 = three mini backs and "+3"; 8 Suspension = pause ring with slash; 14 General Market = a stall awning and "+1"; 20 = a gold rosette with a "W" and all five shapes in the ribbon.
- **Whot 20**: gold 12-point rosette on a wine disc with a "W" drawn from strokes. The "W" is a letter shape, not a brand mark.
- **Back**: aso-oke strips, akwete diamond band, gold frame, a small rosette. No letters, no logo.
- Touch affordance (`whot-art.css`): a playable card is raised 14 px **and** has a 3 px focus outline **and** a diamond pointer; blocked cards drop to 50% opacity (not colour alone).

## 3. Assets (all under `games/naija-whot/assets/`)
Sizes are the SVG viewBox (units); output is one sprite and small SVGs, total under 25 KB gzip (budget 800 KB).

| Path | Size | Purpose | Cultural reference | Maker |
|---|---|---|---|---|
| `cards/deck.svg` | sprite, 100x140 per card | 5 `s-<shape>` symbols (24x24), 49 `c-<shape>-<n>`, `c-whot-20`, `c-back`. Inline once, `<use href="#c-star-7">` per card | edge strips = aso-oke; dotted ring = adire; rosette = ogene/gele gold | in-repo |
| `cards/back.svg` | 100x140 | stand-alone back for CPU hands and `<img>` use | aso-oke stripe, akwete diamonds, Aso-oke Gold | in-repo |
| `cards/pile-draw.svg` | 120x170 | draw pile (3 stacked backs, offset) | as back | in-repo |
| `cards/pile-discard.svg` | 120x170 | empty discard slot (dashed wine slot with adire dot ring) | adire dots | in-repo |
| `table/table-portrait.svg`, `table/table-landscape.svg` | 360x640, 640x360 (`slice`) | table backdrop, use as full-bleed background | iroko wood grain, gold band, **original ankara** cloth | in-repo |
| `ui/call-circle.svg` ... `call-star.svg` (5) | 96x104 | called-shape indicator after a Whot 20: gold dashed ring, wine disc, shape, pointer | agogo-gold ring | in-repo |
| `ui/last-card-btn.svg` | 260x76 | Last card button plate, no text (overlay `t('whot.lastCard')`) | agogo bells, wine and gold | in-repo |
| `ui/last-card-banner.svg` | 340x104 | "LAST CARD" banner plate, no text | aso-oke bands, agogo | in-repo |
| `fx/flick.svg` | 160x64 | card flick motion streaks | n/a | in-repo |
| `fx/slam.svg` | 192x192 | slam shockwave and star | n/a | in-repo |
| `fx/market-burst.svg` | 220x220 | General Market burst: stall awning, rays, five shapes flying out. **No coins or notes** | Balogun-style market stall (generic) | in-repo |
| `fx/pick-penalty.svg` | 160x160 | pick-two/three penalty: orange burst, three card backs, down arrow | n/a | in-repo |
| `fx/skip-ring.svg` | 128x128 | Suspension marker over a CPU or the player | n/a | in-repo |
| `fx/whot-glow.svg` | 192x192 | Whot 20 call rosette burst | gold gele-style rosette | in-repo |
| `whot-art.css` | n/a | `.whot-*` classes and keyframes (section 4) | n/a | in-repo |
| `thumb/thumb-512x512.svg`, `thumb-1024x500.svg` | 512x512, 1024x500 | **placeholder** hero art (card fan on a table, no text) | table, ankara | in-repo placeholder, human `.webp` |
| `audio/music/whot-menu-highlife.mp3`, `whot-play-highlife.mp3` | silent | music placeholders | highlife | human composer |
| `audio/voice/vo-wh-*.mp3` (8), `audio/voice-manifest.json` | silent | voice placeholders | Pidgin table talk | human voice actors |
| `ship.json` | n/a | include, dynamic (`ui/call-*.svg`, `fx/*.svg`), keep (none) | n/a | in-repo |
| `../src/audio/sfx.ts`, `sfx.test.ts` | n/a | `whotSfx` | section 5 | in-repo |

Not shipped (like Ludo): thumbs, music and voice files stay out of `ship.json` until something loads them.

## 4. Developer API (card composition)
```html
<!-- once per page, hidden -->
<div class="whot-sprite" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">{deck.svg markup}</div>

<button class="whot-card is-playable" aria-label="{t('whot.card', {n:14, shape:t('whot.shape.circle')})}">
  <svg class="whot-card__art" viewBox="0 0 100 140"><use href="#c-circle-14"/></svg>
</button>
```
Import with `import deckSvg from '../assets/cards/deck.svg?raw'` (Vite) or fetch and insert once. **Id rule:** `c-<shape>-<n>`; Whot is `c-whot-20`; back is `c-back`; the shape symbol alone is `s-<shape>` (24x24, for the called-shape or HUD chips). `aria-label` must name number and shape (never colour only).
CSS classes in `assets/whot-art.css`: `.whot-card` (size by `--whot-w`, default 64 px, discard top card 96 px), states `.is-playable`, `.is-blocked`, `.is-selected`; animation classes `.is-flick`, `.is-slam`, `.is-draw` (set `--fx`, `--fy`, `--rot`); `.whot-fan` (`--whot-step` 46 px), `.whot-cpu-hand` plus `.whot-count` badge; `.whot-table` (`.is-thump` for the slam shake), `.whot-pile--draw` (`.is-take` when the player must draw), `.whot-pile--discard`; `.whot-called` (img of `ui/call-<shape>.svg`); `.whot-lastcard` (button, add `.is-due` when the player is on one card and has not called), `.whot-lastbanner`; `.whot-fx` with `--slam`, `--market`, `--penalty`, `--skip`, `--whot` (remove on `animationend`). Transform and opacity only; reduced-motion collapses durations.
Special-card event mapping: 1 -> `holdOn` sfx, no fx; 2 -> `slam` then `pickTwo`, `fx/pick-penalty.svg` over the victim; 5 -> `slam` then `pickThree`, same fx; 8 -> `suspension`, `fx/skip-ring.svg`; 14 -> `market`, `fx/market-burst.svg` and `table is-thump`; 20 -> `whotPlay`, `fx/whot-glow.svg`, then the shape picker (`shapePick` per tap, `whotCall` on confirm), then show `ui/call-<shape>.svg` beside the discard until the next play.

## 5. SFX list: event to instrument to preset (`src/audio/sfx.ts`, `whotSfx`)
All cues are 0.3 s or shorter except `market` (crowd, 1.2 s, celebration class). Core voices only. A unit test (`sfx.test.ts`) checks the 300 ms rule. Soft mix via `softSfx({ ...coreSfx, ...whotSfx })`.

| Event | Instrument or everyday sound | Preset |
|---|---|---|
| play a card | ekwe wood slap plus shekere flick | `cardPlay` |
| draw a card | shekere swish plus light ekwe | `cardDraw` |
| deal (raise pitch 2% per card) | ekwe plus shekere tick | `deal` |
| shuffle | shekere | `shuffle` |
| special card slam (1, 2, 5, 8, 14) | talking drum plus agogo ting | `slam` |
| 2 Pick Two | falling talking drum, two ekwe hits | `pickTwo` |
| 5 Pick Three | falling talking drum, three ekwe hits | `pickThree` |
| penalty card taken (one per card) | falling talking drum plus low udu | `pickPenalty` |
| 1 Hold On | rising talking drum plus agogo ting | `holdOn` |
| 8 Suspension | squeezed talking drum plus low ekwe | `suspension` |
| 14 General Market | crowd murmur plus agogo | `market` |
| Whot 20 played | ogene plus talking drum | `whotPlay` |
| name a shape | talking drum plus ekwe | `whotCall` |
| tap a shape in the picker | ekwe | `shapePick` |
| Last card called | agogo double bell plus ting | `lastCard` |
| Semi-last card (toggle) | agogo ting | `semiLast` |
| caught without calling | low ekwe knocks, falling drum | `lastCardCaught` |
| CPU turn | soft low ekwe | `cpuTurn` |
| illegal card tapped | two low ekwe | `illegal` |
| win, lose, unlock | core `win`, `lose`, `unlock` | core |

## 6. Music brief (human composer)
Loops are silent placeholders now; the shared synth highlife loop (`menuMusic` in the scaffold, same style as Ludo's `music.ts`) can stand in at runtime.
| File | Style | BPM | Loop | Instruments | Mood |
|---|---|---|---|---|---|
| `whot-menu-highlife.mp3` (+ `.ogg`) | highlife, guitar-led | 104 | 45 s, seamless | two clean interlocking guitars (palm-wine picking), bass, claves, shekere, brushed kit | warm veranda, welcoming |
| `whot-play-highlife.mp3` (+ `.ogg`) | highlife, a touch more drive | 112 | 60 s, seamless | as above, light horn stabs (optional), no melody over the ekwe card-slap range (about 600 Hz to 1.2 kHz) so SFX stay clear | relaxed but competitive, family card table |
Each file at most 300 KB, original composition, written licence, no sample of an existing song, no artist sound-alike.

## 7. Voice lines (silent placeholders; Nigerian voice actors)
Shared lines already exist in `VOICE_SCRIPT.md` (`last-card`, `semi-last-card`, `pick-two`, `pick-three`, `hold-on`, `suspension`, `market-don-open`, `whot`, `oya`, `your-turn`, `you-don-win`). Game-specific, files `vo-<id>.mp3`, all Pidgin lines `_review`:
| ID | Pidgin | English | Emotion / direction | Voice | Used for |
|---|---|---|---|---|---|
| `wh-shuffle` | Make I shuffle well well. | Let me shuffle properly. | Relaxed, a little show-off. | F, 40s | game start |
| `wh-call` | Na this shape I need! | This is the shape I need! | Confident, then a beat before the shape is named. | M, 30s | Whot 20 call |
| `wh-caught` | You no talk o! Pick two! | You did not call it! Pick two! | Gleeful, teasing, kind. | F, 20s | last card forgotten |
| `wh-defend` | Ehen! Pick two for you too! | Ha! Pick two right back at you! | Triumphant, quick. | M, 20s | defended with a 2 |
| `wh-market-empty` | Market don finish. Shuffle again! | The market is empty. Reshuffling! | Matter-of-fact, brisk. | F, 40s | draw pile rebuilt |
| `wh-safe` | Hold am! Card still plenty. | Easy! Plenty of cards left. | Reassuring. | M, 40s | coach tip |
| `wh-close` | Ah ah! Na one card remain! | Oh! Only one card left! | Surprised, impressed. | M, 30s | CPU on one card |
| `wh-win` | Hand don empty! You win! | Hand empty! You win! | Warm cheer. | F, 30s | player wins |

## 8. Personas for the 3-CPU table
Single-player: the human plays 1 to 3 CPUs. Shared avatars exist in `packages/core/assets/avatars` (`mama-nkechi`, `tari`, `aisha`). Personalities are play styles, never ethnic traits.
| Seat | Persona | Region | Play style (for the developer's `src/ai`) | Difficulty |
|---|---|---|---|---|
| 1 | **Mama Nkechi** (scaffold default) | Igbo, Enugu | **Cautious.** Plays safe numbers first, avoids leading with 2, 5, 14, keeps one Whot 20 in reserve, coaches kindly. Think delay 0.8 s | Easy |
| 2 | **Tari** | Ijaw, Port Harcourt | **Aggressive.** Attacks with 2, 5, 14 and 8 as early as possible, calls the shape the player just played, plays fast. Think delay 0.4 s | Medium |
| 3 | **Aisha** | Hausa, Kaduna | **Hoards Whot.** Keeps every Whot 20 until she has 3 or fewer cards, counts cards played, calls the shape the player has least. Think delay 0.7 s | Hard |
With one CPU use Mama Nkechi; with two, Mama Nkechi and Tari; with three, all. (Aisha lists Sabi Quiz, Draughts and Sabi Words in `PERSONAS.md`; Whot is added by this brief.)

Banter keys `whot.banter.<persona>.<event>`; events: `play`, `pickTwo` (they play 2), `gotPickTwo`, `market` (they play 14), `suspension`, `holdOn`, `whotCall`, `lastCard`, `win`, `lose`. `_review` marks Pidgin or foreign words needing a native check; Igbo, Yoruba and Hausa words always do. No money, bargaining or gambling words.

**Mama Nkechi (coach, kind)**
| Event | en | pcm | flags |
|---|---|---|---|
| play | Good card, my dear. | Correct card, my dear. | |
| pickTwo | Small pick two for you, take it gently. | Na small pick two for you, take am easy. | `_review` |
| gotPickTwo | Ah ah, you got me. Well done. | Ah ah, you catch me. Well done. | `_review` |
| market | Everybody picks one. Nobody is hungry here. | Everybody pick one. Nobody go hungry for here. | `_review` |
| suspension | Sit down small, it is not your turn. | Sit down small, no be your turn. | `_review` |
| holdOn | Hold on, I go again. | Hold on, I go again. | |
| whotCall | I need star, please. | Na star I need, abeg. | `_review` |
| lastCard | Last card! Don't tell the others. | Last card! No tell anybody. | `_review` |
| win | Ọ dị mma! Well played, everyone. | Ọ dị mma! Well played, everybody. | Igbo `Ọ dị mma`: `_review` (native speaker) |
| lose | You earned it. Sit down and take water. | You don earn am. Sit down, drink water. | `_review` |

**Tari (fast, cheeky, never mean)**
| Event | en | pcm | flags |
|---|---|---|---|
| play | Omo, watch this. | Omo, see this one. | `Omo` slang: `_review` |
| pickTwo | Oya, pick two! | Oya, pick two! | |
| gotPickTwo | Wait, you did that to me? Respect. | Wait, you do me so? Respect. | `_review` |
| market | Market don open! Everybody pick! | Market don open! Everybody pick! | `_review` |
| suspension | Suspension! Sorry, relax small. | Suspension! Sorry, relax small. | `_review` |
| holdOn | Hold on, one more from me! | Hold on, one more from me! | |
| whotCall | I need triangle, abeg! | Na triangle I need, abeg! | `_review` |
| lastCard | Last card! Catch me if you can. | Last card! Catch me if you fit. | `_review` |
| win | Not today, you can't beat me. | You no fit beat me today. | |
| lose | Haba, that one sweet me. Again? | That one sweet me. We go again? | `Haba` (Hausa, used as a Nigerian interjection): `_review` |

**Aisha (precise, patient, a card counter)**
| Event | en | pcm | flags |
|---|---|---|---|
| play | I have been counting these. | I dey count these ones. | `_review` |
| pickTwo | Pick two. Please do not panic. | Pick two. No panic o. | `_review` |
| gotPickTwo | Haba! You got me there. | Haba! You catch me there. | Hausa `Haba`: `_review` |
| market | The market is open. Pick one each. | Market don open. Everybody pick one. | `_review` |
| suspension | Suspended. That is only fair. | Suspension. Na fair play. | `_review` |
| holdOn | Hold on, I am not finished. | Hold on, I never finish. | `_review` |
| whotCall | I will take square. | Make I take square. | `_review` |
| lastCard | Last card. I counted. | Last card. I don count am. | `_review` |
| win | Madalla! A tidy game. | Madalla! Clean game. | Hausa `Madalla`: `_review` |
| lose | Well played. I will recount. | Well played. I go count again. | `_review` |

## 9. Make versus human
| Item | Status |
|---|---|
| Card sprite, back, piles, table, ui, fx, CSS, SFX, generator, checker, ship.json, CREDITS | Made in-repo |
| Hero art `thumb/*` | SVG placeholder: human `.webp` 512x512 and 1024x500 (<= 60 KB each): a Whot hand fanned on a wooden table, ankara cloth, Mama Nkechi, Tari and Aisha seated, no text, no logos, no chips or cash |
| Music (2 loops) | Human composer, section 6 |
| Voice (8 lines plus shared) | Human Nigerian actors, section 7, native review |
| Optional painted card and back art | Human illustrator: same ids, 100x140 unit masters, original design only (no copy of a commercial deck) |
| Cultural review | A Nigerian reviewer checks the ankara tile (not a copy of a real print), banter, regional mix, Pidgin and Igbo/Hausa words |
| SFX listening check | A musician checks `slam`, `market` and `lastCard` on a phone speaker |

## 10. Self-check against the guide
- **Principle 1 Nigerian, not pan-African:** wood table and ankara wax print, aso-oke and akwete, adire dots, ekwe, shekere, talking drum, agogo, ogene, udu, highlife, Pidgin. No kente, kora, safari, masks. Pass.
- **Principle 2 contemporary and urban, with roots:** a Lagos veranda card game, market call, Pidgin banter on a mobile layout. Pass.
- **Principle 3 whole country:** Igbo (Mama Nkechi), Ijaw (Tari), Hausa (Aisha), with Yoruba textiles; across the catalogue Yoruba x2, Hausa-Fulani x2, Igbo, Ijaw, Urhobo. Middle Belt, Edo, Efik/Ibibio still absent (HUMAN_ASSETS item 12). Partial pass.
- **Principle 4 celebrate, never mock:** teasing is about the game ("Pick two!"), not people; no ethnicity, accent or poverty jokes; Mama Nkechi is a coach, with no trader lines. Pass.
- **Principle 5 original work:** own layout, numerals, palette and patterns; no deck, app or logo traced; ankara tile is invented. Pass.
- **Avoid lists:** no sacred, shrine or religious symbols, no masquerade regalia, no nsibidi, no party colour pairing as dominant theme (wine, gold, cream; no flat green-white-green), no real brands or clubs, **no gambling imagery** (no chips, cash, bets, coins or notes anywhere; market burst uses shapes and a stall), no generic blip sounds (core instruments only).
- **Telco note:** cards are a family game; HUMAN_ASSETS item 11 already asks the telco owner to confirm playing cards are acceptable.
- **Colour-blind and 360x640:** shape plus number always; greyscale sheets checked; fan of 7 at 360 px verified; tap states use lift, outline and pointer.

## 11. Requests to the senior-developer
1. Use `scripts/gen-naija-whot-art.mjs` only to regenerate; do not hand-edit SVGs. Run `node scripts/check-naija-whot-art.mjs` (needs Playwright Chromium; `CHECK_OUT=<dir>` writes contact sheets).
2. Set `gameConfig.theme` to `theme-aso-oke`.
3. Register `{ ...coreSfx, ...whotSfx }` from `src/audio/sfx.ts`; delete the scaffold `src/sfx.ts` and `assets/agogo.svg` when the template UI is replaced (`ship.json` does not include `agogo.svg`).
4. Inline `cards/deck.svg` once; use the id rule and classes in section 4. i18n keys needed: `whot.lastCard`, `whot.shape.<circle|triangle|cross|square|star>`, `whot.card`, and the banter keys in section 8.
5. Wire the CPU styles from section 8 (cautious, aggressive, hoards Whot) in `src/ai` (not touched here).
6. Add Aisha's Whot role to `PERSONAS.md` Games column if accepted.
