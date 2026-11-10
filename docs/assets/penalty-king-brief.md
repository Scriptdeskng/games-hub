# Penalty King: asset brief

Slug `penalty-king`. Palette: **Naija Green** (`theme-naija-green`, already the scaffold's `gameConfig.theme`; no change needed) with gold and cream, as the guide and style guide assign. Deliberately **not** a flat green-white-green block (no party colours as a dominant theme): deep forest green UI, gold accents, cream plates, and pitch art in grass, dust and night-indigo. Generators `scripts/gen-penalty-king-art.mjs` (+ `penalty-king-common|figures|scenes|props|hud|crests|people.mjs`), checker `scripts/check-penalty-king-art.mjs`. Art in `games/penalty-king/assets/` (about 88 KB gzip, budget 800 KB); synth audio in `games/penalty-king/src/audio/`.

## 1. Cultural concept
**Evening football in Nigeria, from the estate pitch to the floodlit stadium.** The cup starts on a **dusty community pitch at dusk** (laterite ground with chalk lines, timber goalposts, a painted breeze-block wall with an adire resist band, zinc-roofed houses, a mango tree, a parked keke napep, neighbours watching over the wall, wooden floodlight poles) and climbs to a **floodlit stadium** (tiered generic crowd, floodlight towers, ad boards that carry only **adire, akwete, aso-oke and ankara-style patterns, never lettering or brands**). Goal nets are an **akwete diamond lattice**; the goal-celebration burst is **gele ribbons**; the post hit is an **ogene clang**; the trophy is a two-handled brass cup with an akwete diamond (the guide's Benin-inspired brass gleam, original shape). The commentary is a warm Pidgin and English pitch-side voice.

Regions and traditions drawn on: Yoruba (adire, aso-oke, gele, Lagos lagoon team), Igbo (akwete, ogene, udu, ekwe, the Eastern forge team), Hausa-Fulani and Sahel (Arewa pointed arch and star relief in two crests, the Sahel team), Edo (brass and the agogo bell crest, the Benin brass team), Niger Delta (creek canoe crest), Middle Belt and Plateau (highland crest), North-East (Lake Chad basin), Abuja (monolith-skyline team). Contemporary urban layer (Principle 2): a keke, floodlights, phones-era supporters, training bibs, a groundsman, a physiotherapist. Football is the most widely shared street game in the country, so the three rivals come from **North-Central (Ebira, Nupe) and North-East (Fulani)**, regions the catalogue under-uses, and none repeats the existing roster (Mama Nkechi, Chidi, Aisha, Malam Sani, Tari, Efe, Baba Ade, Funmi, Etim, Dung, Osas, Doosuur, Falmata, Damola).

## 2. Visual contract (360x640 and 640x360)
Camera behind the ball looking at the goal. All lines converge on a vanishing point on the horizon. Geometry lives in `assets/geometry.json` (scene units): portrait horizon 230, goal line 316, goal 180 wide x 60 high (the real 3:1), spot (180, 510); landscape horizon 108, goal line 180, goal 200 wide, spot (320, 292). `scale(y) = (y - horizon) / (goalLine - horizon)`; a 5.4 unit ball at the goal grows to about 17.6 units at the spot. The six-yard and penalty-area lines are **stylised (boxes narrower than real) so they read at 360 px**; say so if a QA reviewer measures them.

- **Readability:** every figure, icon and pitch element has an ink outline; chalk lines are 3.8:1 (dust) and 3.2:1 (light grass) or better (checker). Cream ball with ink seams on dust or grass; a gold diamond centre. Shape plus number never rely on colour alone.
- **States (each its own shape; checker verifies they are distinct files):**

| State | Shape cue | Colour cue | Words / sound |
|---|---|---|---|
| aim free / locked | dashed ring + diamond centre / solid ring + four corner brackets + gold diamond | cream / gold | `aimTick` / `aimLock` |
| aim direction | dashed shaft + arrowhead + two chevrons | gold | |
| power zone 1 to 5 | glyph per zone: 1 dot, 2 dots, **diamond (sweet, with gold corner brackets)**, 2 chevrons, **warning triangle (over)**; striped fill rises | green/gold stripes | DOM label (Soft, Good, Sweet, Hard, Over), `powerTick` pitch climbing |
| curve left / none / right | hooked arrow bending left / straight arrow / hooked arrow bending right (dotted trail on the bending ones) | gold | DOM label |
| dive zone (tap) | arrow glyph in each of 6 plates: up-left, up, up-right, down-left, down, down-right | gold on dark plate | `dive` |
| kick goal | circle with tick | green | `netIn`, `crowdGoal` |
| kick saved | hexagon with three finger bars | sky | `saveStop` |
| kick miss | square with cross | cream | `crowdGroan` |
| kick post | diamond with vertical bar | plantain | `postHit` |
| kick pending / next | dashed ring / ring + dot + four brackets, pulsing | cream / gold | |
| result banners | medallion: ball in net / hexagon glove / ball with dashed curve away / post with clang lines; ribbon plate colour differs and the **word is always printed** | green, indigo, wine, terracotta | commentator line |
| cup bracket slot | badge: star (you) / tick circle (won) / X square (out) / arrow (next); out also strikes through | gold | |
| whose role | boot-and-ball icon (shoot) / glove icon (keep) plus the word | | |

- **Greyscale:** every team has a unique kit pattern (sash, hoops, chevron, halves, yoke, band, quarters, pin) and a unique crest outline (circle, hexagon, vesica, octagon, arch, rounded square, rosette, diamond). Keeper wears a neutral cyan top with ink yoke and gold gloves, never a team colour.
- **Text over art** sits on `.pk-plate` (ink on pale green 14:1) or the banner plate (cream on plate, 7:1 or better, checked). Banner words are DOM text, never baked into art.
- **Tap targets:** the six dive zones are 44 px or larger buttons (60x30 units of a 3:1 grid that is at least 310 px wide on a phone, so about 100x50 px each). Aim, power and curve are drag gestures with on-screen readouts and plates; provide a keyboard fallback (arrow keys, Space) in the view.
- Motion uses transform and opacity only (power fill is a `clip-path` inset driven by `--p`; no width or height animation). `prefers-reduced-motion` collapses effects.

## 3. Assets (all under `games/penalty-king/assets/`)
Sizes are SVG units. Total about 88 KB gzip across 116 files including CSS and the silent mp3s.

| Path | Size | Purpose | Cultural reference | Maker |
|---|---|---|---|---|
| `scene/community-portrait.svg`, `community-landscape.svg` | 360x640, 640x360 | full scene: sky, skyline, wall, floodlights, dusty pitch with chalk lines | zinc roofs, adire wall band, keke, mango tree, laterite dust | in-repo |
| `scene/stadium-portrait.svg`, `stadium-landscape.svg` | same | floodlit stadium, generic crowd, mow-striped grass, ad boards | adire, akwete, aso-oke and ankara-style boards (no lettering) | in-repo |
| `scene/crowd-cheer.svg` | 360x96 tileable | raised-arm crowd overlay for a goal | generic supporters | in-repo |
| `goal/goal-back.svg`, `goal-front.svg`, `goal-front-wood.svg` | 240x96 | net behind the keeper; posts and bar (painted for the stadium, timber for the community pitch) | akwete diamond net | in-repo |
| `ball/ball.svg`, `ball-shadow.svg` | 64x64, 64x24 | plain ball with gold akwete diamond centre | no brand pattern | in-repo |
| `keeper/keeper-dark.svg`, `keeper-mid.svg`, `keeper-light.svg` | 384x384 (3x3 cells of 128) | keeper poses, front view | skin tones from the guide's range | in-repo |
| `striker/striker-<team>.svg` (8) | 384x384 | striker poses, back view, in each team's kit | invented kits | in-repo |
| `teams/crest-<team>.svg` (8), `teams/kit-<team>.svg` (8) | 96x96, 64x76 | crests and kit swatches | adire rings, Arewa star and arch, akwete diamonds, aso-oke stripes, agogo | in-repo |
| `hud/` 31 icons (aim, power, curve, dive grid, phases, roles, kick results, sudden badge, round chips, bracket badges) | 20 to 200 units | HUD art, section 2 | n/a | in-repo |
| `banners/result-goal|saved|miss|post.svg`, `banner-sudden.svg`, `banner-round.svg` | 320x96 | result and round banners | aso-oke gold bands | in-repo |
| `scoreboard/board-frame.svg` | 340x92 | 5-kick shootout board (slot geometry in `geometry.json`) | aso-oke stripe top | in-repo |
| `cup/bracket-8.svg`, `cup/trophy.svg` | 360x420, 96x128 | 8-team bracket (QF 8, SF 4, final 2, winner well), trophy | Benin-inspired brass | in-repo |
| `fx/net-bulge`, `goal-ribbons`, `save-ring`, `post-clang`, `dust`, `floodlight-glow` | 96 to 256 | one-shot effects | gele ribbons, ogene, agogo ring | in-repo |
| `icon/menu-mark.svg` | 128x128 | gold rosette, akwete-net goal, crown, ball | gele rosette | in-repo |
| `avatars/ozavize.svg`, `ndako.svg`, `hamman.svg` | 128x128 | CPU rival busts | section 6 | in-repo placeholder |
| `thumb/thumb-512x512.svg`, `thumb-1024x500.svg` | 512x512, 1024x500 | **placeholder** hero art, no text | stadium, goal, diving keeper | in-repo placeholder, human `.webp` |
| `geometry.json` | n/a | scene geometry, cell order, slot and bracket coordinates, team kit data | n/a | in-repo |
| `penalty-art.css`, `penalty-art-hud.css`, `penalty-art-fx.css` | n/a | `.pk-*` hooks, DOM sketch in the header of `penalty-art.css` | n/a | in-repo |
| `audio/music/penalty-menu-chant.mp3`, `penalty-play-chant.mp3` | silent | music placeholders | football chant | human composer |
| `audio/voice/vo-pk-*.mp3` (17), `audio/voice-manifest.json` | silent | commentator placeholders | pitch commentator | human voice actor |
| `ship.json`, `CREDITS.md` | n/a | include list, provenance | n/a | in-repo |
| `../src/audio/sfx.ts`, `sfx.test.ts`, `music.ts` | n/a | `penaltySfx` (16 cues), tests, synth stand-in music | section 7 | in-repo |

**Sprite and atlas plan (Canvas 2D).** Sheets are 3x3 grids, 128-unit cells, anchor bottom centre (64, 120). Keeper order: ready, stand, dive-low-l, dive-high-l, dive-low-r, dive-high-r, dive-centre, save, beaten. Striker order: idle, run1, run2, plant, strike, follow, celebrate, dejected, salute. Load only the sheets in play (one striker sheet per team on court, one keeper sheet), `drawImage` each once into an `OffscreenCanvas`/`<canvas>` cache at the target size (keeper about 0.46 x goalW/180 at the goal line; striker and ball scaled by `scale(y)`). Layer order: scene (CSS background or drawn), `goal-back`, keeper, ball shadow and ball, striker, `goal-front`, fx. Never rasterise per frame. **Ball flight:** interpolate from the spot to the target in scene units, scale by `scale(y)`; for a curve shot offset x with a sine that returns to the aim line.

## 4. Invented teams, kits and the name check (binding rules)
Names are invented from Nigerian landscape and city flavour. No animal mascots, and none of the words that dominate real Nigerian club names (United, Stars, Warriors, Pillars, Tornadoes, Rangers). Every kit pairing avoids red/white, blue/white, green/white and other familiar pairs, and Nigeria's green-and-white. **Honest scope of the check:** it was made from memory of the Nigerian league lists (NPFL, NNL, NWFL, current and historic) and well-known foreign clubs; the asset designer has no live lookup. A human must repeat it against the current lists and a trade-mark search (HUMAN_ASSETS row 63).

| # | Team (id) | Short | City and region flavour | Crest (outline + motif) | Kit: shirt / trim / shorts, pattern | Checked against | Result |
|---|---|---|---|---|---|---|---|
| 1 | Lagoon Lanterns (`lanterns`, **you**) | LAG | Lagos lagoon, evening lights; South-West | circle, adire dot ring, lantern | teal `#0E7C86` / marigold `#FFC933` / `#08454E`, sash | Lagos clubs (Sporting Lagos, MFM, Ikorodu City, Stationery Stores, ACB), "Lagoon Lions" avoided on purpose | no match |
| 2 | Sahel Sparks (`sparks`) | SAH | Sokoto and Katsina, Sahel edge; North-West | hexagon, hoops, Arewa star-in-square | ochre `#E8AE32` / plum `#4B1A55` / plum, hoops | Katsina United, Kano Pillars, Sokoto clubs; "Stars" avoided (Shooting, Sunshine, Lobi, Remo Stars) | no match; confirm "Sparks" |
| 3 | Delta Drifters (`drifters`) | DEL | Yenagoa and Port Harcourt creeks; South-South | vesica, canoe, adire waves | coral `#FF7A63` / navy `#14264F` / navy, chevron | Bayelsa United, Rivers United, Warri Wolves, Dolphins, Sharks | no match |
| 4 | Capital Comets (`comets`) | CAP | Abuja, wide roads, monolith skyline; FCT | octagon, comet and three stripes | charcoal `#2C2C31` / lime `#B6E04A` / ink, halves | Abuja clubs (Nasarawa United, Doma United, Gwarinpa-area sides) | no match |
| 5 | Highland Harriers (`harriers`) | HIG | Jos and the Plateau highlands; North-Central | Arewa pointed arch, stepped highlands, sun | terracotta `#B4532A` / cream `#FFF3DA` / `#7A3A20`, yoke | Plateau United, Jos clubs | no match |
| 6 | Eastern Embers (`embers`) | EAS | Enugu, Owerri, Aba forge and market; South-East | rounded square, three akwete diamonds | wine `#8C1D3D` / peach `#F8B6A0` / `#5E1228`, band | Enyimba, Rangers, Heartland, Abia Warriors, Akwa United, "Coal City" avoided | no match |
| 7 | Basin Blazers (`blazers`) | BAS | Maiduguri, Lake Chad basin; North-East | scalloped rosette, flame | magenta `#C2185B` / pale pink `#FFD1E3` / `#7A0F3B`, quarters | El-Kanemi Warriors, Gombe United, Adamawa United | no match |
| 8 | Brass City Bells (`bells`) | BRA | Benin City brass casting; Edo, South-South | diamond, agogo double bell | violet `#3B2A78` / orange `#E4702A` / `#241A4D`, pin stripes | Bendel Insurance, Edo clubs | no match |

Also checked: none of the eight names or crests uses the Super Eagles, Falcons, Eaglets or any NFF mark; no crest uses a shield, an eagle, a lion or an elephant (all common on real badges); no kit uses a familiar foreign club pairing as far as I know. Edge notes for the reviewer: the **Brass City Bells** name touches Benin heritage (brass casting is a craft, not a sacred symbol; no royal or ceremonial Benin regalia is drawn); "Sparks", "Blazers" and "Comets" are common English words and may exist as small clubs somewhere. If any name clashes, rename in `scripts/penalty-king-common.mjs` (`TEAMS`) and re-run the generator.

**Bracket order** (`geometry.json` `bracket.order`): QF pairs are Lanterns v Sparks, Comets v Drifters, Harriers v Embers, Blazers v Bells; the player is always `lanterns` in slot 1. Suggested venue: quarter-finals on the community pitch, semi-final and final in the stadium.

## 5. Developer API (CSS)
Import `import '../assets/penalty-art.css'` (it `@import`s the hud and fx files). The header comment holds the DOM sketch (HUD, power, curve, dive grid, banners, bracket, persona). Key hooks: `.pk-app.pk-venue--community|stadium`, `.pk-stage`, `.pk-canvas`, `.pk-scoreboard` + `.pk-slot.is-goal|saved|miss|post|pending|next` (with inline `--i` 0..4 and `--row` 0|1) + `.pk-total`, `.pk-team`, `.pk-crest[data-team]`, `.pk-kit[data-team]`, `.pk-role--shoot|keep`, `.pk-phase[data-phase].is-on`, `.pk-aim__reticle.is-locked`, `.pk-aim__arrow` (`--a`, `--len`), `.pk-power` (`--p` 0..1), `.pk-curve[data-curve="-1|0|1"]`, `.pk-dive__zone[data-zone]`, `.pk-banner--goal|saved|miss|post|sudden|round` with `.pk-banner__word`, `.pk-bracket` + `.pk-bslot.is-you|won|out|next` (`--x`, `--y` from `geometry.json`), `.pk-fx--ribbons|save|post|net|dust|glow` (`--x`, `--y` px; remove on `animationend`), `.pk-cheer`. Re-run `node scripts/check-penalty-king-art.mjs` after any change.

## 6. Personas: CPU rivals and difficulty
Single player only. One named rival per difficulty (menu `ng-seg`: word + pips + tick); the rival is the CPU keeper and striker whose banter and avatar line up with the engine's strength. Personalities are individual, never ethnic tropes. Names, regions, occupations and every Pidgin line need native confirmation (HUMAN_ASSETS row 66). Full banter (8 lines each, en + pcm, all `_review`) is in `PERSONAS.md` under "Added with Penalty King".

| Level | Persona | Region and role | Play style (suggestion for the AI; the developer owns the engine) |
|---|---|---|---|
| Easy | **Ozavize** (`ozavize`) | Ebira, Okene (Kogi, North-Central). 40s. A physiotherapist who keeps goal in a community league. | chatty and kind; as keeper dives early and is fooled by a pause; as striker places safely, rarely at the corners |
| Medium | **Ndako** (`ndako`) | Nupe, Bida (Niger State, North-Central). 20s. A junior surveyor who plays Saturday leagues. | counts your last three shots and favours that side; as striker varies between two zones |
| Hard | **Hamman** (`hamman`) | Fulani, Yola (Adamawa, North-East). 30s. A stadium groundsman who knows every bounce. | reads your run-up and shoulders (late dive, full range); as striker mixes power and placement; sporting, never gloats |

Why these three: the guide's map names Chidi (Igbo) for Penalty King, but he and Mama Nkechi already make two Igbo personas, Hausa has two, Yoruba three; North-Central (Ebira, Nupe) and a Fulani voice from Adamawa were unrepresented. Two men and one woman, ages 20s to 40s. **Chidi stays in the catalogue; I did not use him as a CPU here (an instruction for this game), so the human should confirm.** No Ebira, Nupe or Fulani words are written (correct spelling and tone are not certain); they are listed for native speakers to supply. Art notes: Ozavize in the neutral keeper top with gold gloves and an aso-oke strip headband; Ndako in an orange training bib with an akwete diamond, short beard (not a trope: a groomed look); Hamman in a cream pitch-side coat with lawn-stripe shoulders, no headwear (this avoids a "Fulani herder" cliche). Skin `#7A4A2D`, `#A06A44`, `#47291A`.

## 7. SFX list: event to instrument to preset (`src/audio/sfx.ts`, `penaltySfx`)
Core voices only. No `whistle`, `coin`, `blip` or generic whoosh (`dive` uses a talking-drum glide and a shekere rattle). Interaction cues <= 300 ms; the six celebration-class cues <= 1.5 s. Register with `core.audio.registerSfx({ ...coreSfx, ...penaltySfx })`, soft mix `softSfx({ ...coreSfx, ...penaltySfx })`. Tested in `sfx.test.ts` (9 tests; **two fail until the view registers `penaltySfx` and plays every cue by name**, by design, as in Draughts).

| Event | Instrument or everyday sound | Preset (`penaltySfx.<name>`) | Notes |
|---|---|---|---|
| Aim crosses a target zone | shekere bead tick, soft ekwe | `aimTick` | max 8 per second |
| Aim locked | ekwe click, high agogo ting | `aimLock` | |
| Power bar charging (loop tick) | low ekwe knock, bead | `powerTick` | caller raises `pitch` 4 percent per tick, cap +40 percent |
| Kick signal (referee-whistle substitute) | two high agogo tings, ekwe knock | `whistleSub` | bell-and-wood call, not the core whistle |
| Shot strike | ekwe crack, udu thump | `shotStrike` | |
| Ball into the net | udu bloop, shekere rustle (net beads) | `netIn` | |
| Post or bar | ogene clang | `postHit` | |
| Save | talking-drum thud, udu | `saveStop` | |
| Keeper dive | talking-drum glide, shekere rattle | `dive` | |
| Round or kick start | two ekwe knocks, agogo ting, drum rise | `roundStart` | |
| Goal | crowd swell, shekere rattle, rising drum, agogo | `crowdGoal` | celebration class; guide: crowd cheer |
| Miss, post or CPU goal | low crowd groan, falling drum | `crowdGroan` | celebration class, gentle |
| Sudden death | ogene strike, drum squeeze, low udu, high ting | `suddenDeath` | celebration class |
| Bracket advance | drum fill, agogo, goje-kakaki phrase | `bracketAdvance` | celebration class |
| Shootout won | drum fill, kakaki-goje fanfare, ogene ring, crowd | `shootoutWin` | celebration class |
| Shootout lost | falling drum squeeze, low udu | `shootoutLose` | celebration class, gentle |

## 8. Music brief (human composer; synth stand-ins in `src/audio/music.ts`)
Guide: football-chant energy (drums, hand claps). No samples of existing songs, chants or artist sound-alikes; no recorded fan chants. `.ogg` + `.mp3`, each <= 300 KB, seamless, -16 LUFS.
| File | Style | Tempo | Length | Instruments and mood |
|---|---|---|---|---|
| `audio/music/penalty-menu-chant.mp3` | football-chant march | 120 BPM | 45 s | snare and tom ensemble, bass drum, hand claps, a talking-drum accent, original whistle-like flute accents (not a referee whistle); a Saturday-evening-at-the-pitch feel |
| `audio/music/penalty-play-chant.mp3` | tension bed | 124 BPM | 60 s | thinner: pulse and claps, 4 to 8 s quieter bars before each kick, **nothing between 800 Hz and 2.5 kHz on the beats where strike, post and save cues land** |
Duck music 6 dB under voice lines. Synth stand-ins: `menuMusic`, `playMusic` (shekere pulse, ekwe clap, talking-drum accent, sparse agogo).

## 9. Voice script (silent placeholders; Nigerian voice actors)
Speaker: **the pitch commentator**, an invented generic voice (M or F, 30s to 50s; warm, quick, family friendly; **not modelled on any real commentator**, no exaggerated accent). Files `audio/voice/vo-<id>.mp3`, manifest `audio/voice-manifest.json`, direction in `VOICE_SCRIPT.md` "Game-specific lines: Penalty King". Every Pidgin line is `_review`. Shared lines also used: `goal`, `saved`, `ready-go`, `chai`, `madalla`, `e-ku-ise`, `you-don-win`, `e-don-do`.
| ID | Pidgin (pcm) | English (en) | Used for |
|---|---|---|---|
| `pk-start` | Oya, penalty time! | Come on, penalty time! | shootout start |
| `pk-goal` | Goal! E don enter! | Goal! It's in! | goal |
| `pk-rocket` | Chai! Na rocket be that! | Wow! What a rocket! | hard, sweet-spot goal |
| `pk-saved` | Keeper don save am! Wetin be that! | The keeper saves it! What a stop! | save |
| `pk-post` | E knock the post! So close! | Off the post! So close! | post or bar |
| `pk-over` | E fly pass the bar o! | Over the bar! | over |
| `pk-wide` | Wide! E miss the goal! | Wide of the goal! | wide |
| `pk-level` | Score don level o! | The score is level! | level after five |
| `pk-sudden` | Sudden death! No room for mistake! | Sudden death! No room for error! | sudden death |
| `pk-qf` | Quarter-final! Make we go! | Quarter-final! Here we go! | QF |
| `pk-sf` | Semi-final! Only four teams remain! | Semi-final! Only four teams remain! | SF |
| `pk-final` | Na the final be this! | This is the final! | final |
| `pk-advance` | You don waka enter next round! | You are through to the next round! | bracket advance |
| `pk-win` | You don win! Penalty King! | You win! Penalty King! | shootout won |
| `pk-champion` | Champion! Na your own cup! | Champions! The cup is yours! | cup won |
| `pk-lose` | No vex. Next time go better. | Tough one. Next time will be better. | shootout lost |
| `pk-knockout` | Cup run don end. You go try again. | Your cup run ends here. Try again. | knocked out |

## 10. Make versus human
| Item | Made in repo | Needs a human |
|---|---|---|
| Scenes, goal, ball, sprites, HUD, banners, bracket, crests, kits, fx, menu mark, CSS, geometry, ship.json | yes | optional hand-drawn character sprites and crests at the same units; a Nigerian reviewer for the crests |
| SFX | yes (`penaltySfx`, 16 cues) | musician listening check on a phone speaker |
| Music | synth stand-ins, silent mp3 | composer (2 loops) |
| Voice | silent placeholders and manifest | commentator voice actor (17 lines); native review |
| Persona art | shape-built busts | illustrator (3 expressions each); native confirmation of names and banter |
| Hero art | SVG placeholders | illustrator for `.webp` |
| Team names | invented, checked from memory | live check against current NPFL, NNL, NWFL lists and trade marks |

## 11. Self-check against the guide
| Principle | Check |
|---|---|
| 1. Nigerian, not pan-African | Adire, akwete, aso-oke, Arewa arch and star, ankara-style boards; zinc roofs, keke, laterite pitch; ekwe, udu, ogene, agogo, shekere, talking drum, goje-kakaki. No kente, kora, safari animals or savanna sunsets (no animal crests; the dusk sky is a Lagos-style evening, not a savanna one). Pass |
| 2. Contemporary and urban, with roots | floodlights, stadium, keke, bibs, groundsman, physiotherapist, surveyor, beside heritage cloth and wall relief. Pass |
| 3. Whole country | teams from SW, NW, SS (twice), FCT, North-Central, SE, NE; rivals Ebira, Nupe, Fulani. Gap: no Igbo or Yoruba persona in this game (they have many elsewhere). Pass with note |
| 4. Celebrate, never mock | misses are a gentle groan and "No vex"; rivals are sporting; no jokes on ethnicity, religion, accent, poverty or body type. Pass |
| 5. Original work only | all shapes generated here; invented names, crests and kits; ball has no brand pattern; no real badge, kit, club, player, stadium or commentator. Pass, subject to the human name check |
Avoid list: no sacred or shrine symbols, no masquerade regalia, no nsibidi, no party colours as dominant theme (kits avoid red/white/green; UI is forest green, gold and cream), no real banknotes (no coins at all), no gambling visuals (no stakes, odds or prizes; the trophy is cosmetic), no real brands (ad boards carry patterns only). Edge notes: the Arewa star and pointed arch (shared with the core pattern library), the brass bell crest, the groundsman (an occupation, with no headwear on purpose).

## 12. Requests to the senior-developer
1. Keep `theme-naija-green`; import `../assets/penalty-art.css`; keep `./assets/ship.json` (the build checks it). When the canvas loads sprites by name, extend `ship.json` with `include` and `dynamic`: `scene/*.svg`, `goal/*.svg`, `ball/*.svg`, `keeper/keeper-*.svg`, `striker/striker-*.svg`, `fx/*.svg`, `teams/*.svg`, `hud/*.svg`, `banners/*.svg`, `scoreboard/*.svg`, `cup/*.svg` (a stale pattern fails the build, so add only what is loaded). Delete the scaffold `src/sfx.ts`, `assets/agogo.svg` and its `ship.json` entry when the real UI replaces the scaffold.
2. Register `penaltySfx` (`registerSfx(penaltySfx)` must appear in game code; the test looks for it) and play every cue by name. Music: `menuMusic`, `playMusic` from `src/audio/music.ts`.
3. Canvas layer plan and geometry: section 3 and `geometry.json`. Use the 8 `TEAMS` data in `geometry.json` (name, short code, colours) for `t()` keys: team names are proper nouns and may stay untranslated, but crest `aria-label`s need `t()`.
4. Personas: add `persona.<id>.1..8` keys (en and pcm) from `PERSONAS.md`, each Pidgin line `_review`; avatars `./assets/avatars/<id>.svg`. Map Easy to Ozavize, Medium to Ndako, Hard to Hamman.
5. Never encode result by colour only: use the `.pk-slot` states and banner words. Add keyboard play (arrow keys, Space) and 44 px dive buttons.
6. Results screen: reuse `.ng-results`; play `shootoutWin` or `shootoutLose`; cup win shows `cup/trophy.svg`.
7. Optional: add `check-penalty-king-art.mjs` to the `check` script.
