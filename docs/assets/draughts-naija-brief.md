# Draughts Naija: asset brief

Slug `draughts-naija`. Palette: **Adire Indigo** (`theme-adire`: bg `#122055`/`#0A1233`, surface `#F4F1E8`, ink-s `#0F1B4A`) as the guide's per-game map and the style guide say, with **Northern Earth** terracotta (`#9A4A27`, `#7A3A20`, `#552716`, ochre `#E0A030`) for the Arewa wall and the board frame. The scaffold's `gameConfig.theme` is `theme-naija-green`; the developer should set it to `theme-adire` (section 11). Generators `scripts/gen-draughts-naija-art.mjs` (+ `draughts-naija-common.mjs`, `draughts-naija-people.mjs`), checker `scripts/check-draughts-naija-art.mjs`. Art lives in `games/draughts-naija/assets/`; synth audio in `games/draughts-naija/src/audio/`.

## 1. Cultural concept
A **game-room table in the north of Nigeria, played after sundown**: behind the board, a terracotta **Zaria / Kano-style wall** with raised star-in-square relief, a row of **pointed arches** and a **crenellated top** (the guide's "Arewa-relief board frame"); under it, a thin **aso-oke stripe seam** and a night-indigo **adire resist cloth** table. The board itself sits in a terracotta **relief frame** with a cream dashed **aso-oke band** on the inside edge and four small **akwete diamonds** at the corners. Squares are **sand** (light, with a faint akwete diamond) and **adire indigo** (dark, with a faint ring-and-dot resist pattern); pieces sit on the dark squares. Ivory pieces carry an **adire ring**, carved-iroko pieces carry an **akwete diamond**, kings are **stacked and crowned** in plantain gold. The capture effect is an **agogo-style ripple** plus a **gele-ribbon burst** (celebratory, no gore); the turn icon is a **gangan (talking drum)** hourglass; the capture path is a **dashed gold rope** with an arrow head and numbered **landing stones**.

Regions and traditions drawn on: Hausa-Fulani (Arewa wall relief, pointed arches, goje-and-calabash music direction), Yoruba (adire cloth, aso-oke bands, agogo, Abeokuta persona), Igbo (akwete diamonds, ekwe, udu, ogene), Middle Belt (**Doosuur, Tiv, Makurdi**), North-East (**Falmata, Kanuri, Maiduguri**). Draughts is a street, campus and hospital-canteen game across the country, so the three CPU opponents deliberately come from three **different zones that the catalogue under-uses** (Principle 3): Middle Belt and North-East are named gaps in `STYLE_GUIDE.md` section 11, and the guide's default Draughts pair (Malam Sani, Aisha) are both Hausa, a region the catalogue already covers twice. Contemporary and urban (Principle 2): a university student with an ID lanyard, a nurse on her break, a campus rival in a varsity-style jacket, beside heritage cloth, wall relief and instruments.

## 2. Legibility and colour-blind contract (360x640)
Geometry: board = 344 px wide at 360 (8 px margin), frame 14/340 of the width, dark squares at `(row + col)` odd with **row 0 on top** (the bottom-left square is dark for both sizes). **10x10 cell = 31.6 px, piece = 86 percent = 27 px; 8x8 cell = 39.5 px** (measured by the checker).

- **Two sides are separable by body lightness, shape and pattern, never colour alone.** Ivory body `#FFF3DA` with an indigo **ring** emblem versus iroko body `#4A1D0E` with a gold **diamond** emblem: 12.9:1 between the two bodies, ink-ring on ivory, cream rim on iroko (10.2:1 against the indigo square `#22347F`). Verified in greyscale (`draughts-10-grey.png`, `draughts-8-grey.png`).
- **Man versus flying king is shape**: a king is two stacked discs (visible lip), a gold inner rim and a **three-point crown** in plantain gold with a 3.4-unit ink outline (readable at 27 px); a man is a single disc. The crown replaces the man's emblem, so the pair reads even in greyscale.
- Light square versus dark square 8.7:1 (sand versus indigo). Ink digits on the gold landing stone 11.3:1; gold digits on the ink chain badge 11.3:1; all text over art sits on a solid `.dn-plate`/badge, never on a pattern.
- **Every state has its own shape** (eight distinct overlays, checked as distinct files):

| State (class) | Shape cue | Colour cue | Plus |
|---|---|---|---|
| selected piece (`is-select`) | solid double ring + four L corner brackets, piece lifts and scales 1.06 | gold | `pieceSelect` sound |
| legal move (`is-move`) | dashed ring around a solid dot | plantain | |
| capture path landing (`is-path`) | solid diamond (stone) with a step number | plantain | `.dn-leg` dashed rope with arrow head |
| piece that can be taken (`is-capturable`) | big **X** over the piece (ink outline) | plantain | |
| piece jumped on the previewed path (`is-jumped`) | X plus dashed ring, piece dims to 72 percent | plantain / cream | |
| must-capture piece (`is-must`) | warning **triangle with exclamation** on the piece corner, pulsing | plantain | `mustCapture` sound, text toast |
| last move, from (`is-last-from`) | dotted diamond outline | cream | |
| last move, to (`is-last-to`) | four solid corner triangles | cream | |
| hint (`is-hint`) | dashed double ring + four ticks, pulsing | plantain | `hint` sound |
| illegal tap (`is-illegal`) | dashed outline + horizontal shake | cream | `illegal` sound |

- **Whose turn**: talking-drum icon next to the name plus a double ring on the avatar plus text; the CPU "thinking" state is three bouncing beads on a plate.
- **Tap size, stated honestly:** a 10x10 cell at 360 px is 31.6 px, below the 44 px guide. Mitigations in the art: highlight shapes fill the whole cell, there are no gaps between squares, the move model is select then tap a marked square, and the destination stone is large. The view should also add hit-slop (section 11 item 6). QA should test this on a 360 px phone.
- Motion uses transform and opacity only; `prefers-reduced-motion` collapses everything to 1 ms and hides the one-shot effects.

## 3. Assets (all under `games/draughts-naija/assets/`)
Sizes are the SVG viewBox in units. Total art 20 KB gzip (about 80 KB raw) including CSS, manifest and the 12 silent mp3s (budget 800 KB).

| Path | Size | Purpose | Cultural reference | Maker |
|---|---|---|---|---|
| `bg/stage-portrait.svg`, `bg/stage-landscape.svg` | 360x640, 640x360 (`cover`) | full-bleed backdrop | Zaria/Kano wall relief, pointed arches, crenellated top, aso-oke seam, indigo adire cloth table | in-repo |
| `board/board-10.svg`, `board/board-8.svg` | 340x340 (`100% 100%`, square) | board art: frame, squares, corners | terracotta Arewa relief frame, aso-oke dashed band, akwete corner diamonds, adire indigo dark squares | in-repo |
| `pieces/man-light.svg`, `man-dark.svg`, `king-light.svg`, `king-dark.svg` | 64x64 each | the four pieces (baked shadow) | ivory with adire ring; iroko with akwete diamond; crowned stacked kings | in-repo |
| `states/sq-select.svg`, `sq-move.svg`, `sq-path.svg`, `sq-capture.svg`, `sq-jumped.svg`, `sq-last-from.svg`, `sq-last-to.svg`, `sq-hint.svg` | 64x64 (`100% 100%` over the square) | square-state overlays (section 2) | n/a, plain geometry in indigo ink and gold | in-repo |
| `states/piece-must.svg` | 24x24 | must-capture corner badge | n/a | in-repo |
| `fx/capture-ring.svg` | 200x200 | agogo-style ripple at a captured square | agogo bell ring | in-repo |
| `fx/capture-ribbons.svg` | 200x200 | gele-ribbon burst on capture (no gore) | gele ribbons, owambe confetti | in-repo |
| `fx/crown-burst.svg` | 200x200 | sparkle when a piece is crowned | n/a | in-repo |
| `hud/turn-drum.svg` | 32x32 | whose-turn icon | gangan talking drum (hourglass) | in-repo |
| `icon/menu-mark.svg` | 128x128 | menu mark: gold rosette, 2x2 board corner, a man and a king | gele rosette | in-repo |
| `avatars/doosuur.svg`, `falmata.svg`, `damola.svg` | 128x128 | CPU persona busts (section 5) | striped shawl; engineering lanyard; adire-indigo varsity jacket | in-repo placeholder |
| `thumb/thumb-512x512.svg`, `thumb-1024x500.svg` | 512x512, 1024x500 | **placeholder** hero art (board, capture path, two kings, no text) | Arewa wall + board | in-repo placeholder, human `.webp` |
| `draughts-art.css`, `draughts-art-fx.css` | n/a | `.dn-*` hooks; DOM sketch in the header of `draughts-art.css` | n/a | in-repo |
| `audio/music/draughts-menu-hausa.mp3`, `draughts-play-hausa.mp3` | silent | music placeholders (section 7) | Hausa-inspired | human composer |
| `audio/voice/vo-dn-*.mp3` (10), `audio/voice-manifest.json` | silent | voice placeholders (section 8) | table umpire | human voice actor |
| `ship.json` | n/a | include list (menu mark, 3 avatars, plus the scaffold `agogo.svg` until the real UI replaces it) | n/a | in-repo |
| `CREDITS.md` | n/a | provenance | n/a | in-repo |
| `../src/audio/sfx.ts`, `sfx.test.ts`, `music.ts` | n/a | `draughtsSfx` (21 cues) with tests; synth stand-in music | section 6 | in-repo |

Not shipped as files (like Whot and Words): the CSS is imported by the code so Vite bundles it with its `url()` assets; thumbs, music and voice stay out of `ship.json` until something loads them. Piece, board, state and fx files are referenced only from the CSS.

## 4. Developer API (CSS)
Import once: `import '../assets/draughts-art.css'` (it `@import`s `draughts-art-fx.css`). The header comment has the full DOM sketch. Summary:
- Stage `.dn-stage`; board `.dn-board[data-n="10|8"]` with inline `--dn-n`; inside it `.dn-grid` (inset 4.1176 percent) holds **dark squares only** as `button.dn-sq` with inline `grid-row` and `grid-column` (1-based), `data-r`, `data-c`; `.dn-lines` holds path legs and the chain badge.
- Pieces `<i class="dn-piece dn-piece--light|dark [dn-piece--king]">` inside the square. Which side is light is the view's choice (ivory = the player by convention).
- Square states: `is-select`, `is-move`, `is-path` (+ `<b class="dn-step">1</b>`), `is-capturable`, `is-jumped`, `is-last-from`, `is-last-to`, `is-hint`, `is-illegal`. Piece states: `is-must`, `is-sliding` (set `--dx`, `--dy` in px = old position minus new), `is-crowned`, `is-taken`.
- Path legs: `<i class="dn-leg" style="--x;--y;--len;--a">` (centre of the first square in px inside `.dn-lines`, length to the next centre, angle in degrees); one per hop. Chain badge `<b class="dn-chain">x3</b>`.
- Effects: `<i class="dn-fx dn-fx--ring|ribbons|crown" style="--x;--y">` (px inside `.dn-board`), remove on `animationend`.
- Seats: `.dn-seat[.dn-seat--cpu][.is-turn]` with `.ng-avatar`, `.dn-plate` (name), `.dn-turn`, `.dn-think` (`hidden` toggles), `.dn-tray > .dn-mini--light|dark`.
- Re-run `node scripts/check-draughts-naija-art.mjs` after any art or CSS change (it renders the real CSS in colour and greyscale at 360x640 for both board sizes).

## 5. Personas (CPU roster) and difficulty
The player is always the only human. Difficulty is a pick on the menu (`ng-seg`, word + pips + tick); each level has **one named opponent** so banter, avatar and strength line up. Personalities are individual, never ethnic tropes. Names, regions and Pidgin all need native confirmation (section 9). Full banter sets (8 lines, en + pcm, all `_review`) are in `PERSONAS.md` under "Added with Draughts Naija".

| Level | Persona | Region and role | Play style (suggestion for the AI brain; the developer owns the engine) | Colour world |
|---|---|---|---|---|
| Easy | **Doosuur** (`doosuur`) | Tiv, Makurdi (Benue, Middle Belt). 40s. A nurse who plays on her break. | friendly and chatty; plays loose, forgets about long diagonals; tells you why a move was good | Northern Earth terracotta |
| Medium | **Falmata** (`falmata`) | Kanuri, Maiduguri (Borno, North-East). 20s. Final-year engineering student. | counts exchanges: loves two-for-one trades and quick combinations; sometimes over-trades | Adire Indigo (sky) |
| Hard | **Damola** (`damola`) | Yoruba, Abeokuta (Ogun). 20s. The campus games-society rival. | solid structure, controls the centre and long diagonals, plays for the endgame king; sporting, never smug | Aso-oke Gold ground, indigo jacket |

Why these three: Middle Belt, North-East and a Yoruba campus rival fill the gaps and balance the cast (existing personas: Mama Nkechi and Chidi Igbo; Tari South-South; Aisha and Malam Sani Hausa; Efe Urhobo; Baba Ade Yoruba; Dung Berom/Jos; Etim Efik; Osas Edo). Two of the three are women, ages 20s to 40s. Abeokuta is the home of Adire Eleko, which ties the Yoruba persona to the board's adire squares. Malam Sani and Aisha remain in the catalogue but are not Draughts CPUs (an instruction for this game; the guide's per-game map names them, so the human should confirm the change). No vernacular greetings are written for Doosuur and Falmata: I am not certain of correct Tiv or Kanuri, so those are listed for a native speaker to supply (HUMAN_ASSETS). Damola has one Yoruba line (`Ó dára`) tagged for review.
Art notes (all placeholders): Doosuur wears plain black-and-white stripes as a shawl, the everyday striped cloth associated with Tiv dress, drawn as simple stripes and **not copied from any weaver's design**: a Tiv reviewer should confirm it is respectful. Falmata: low bun with a pencil, grid-lined shirt, blank ID lanyard (no institution). Damola: fade haircut, indigo varsity-style jacket with cream collar stripes and no logo. Skin tones `#4F2E1B`, `#855536`, `#5B3A25` (the guide's full dark-to-brown range; never recoloured).

## 6. SFX list: event to instrument to preset (`src/audio/sfx.ts`, `draughtsSfx`)
Core voices only (ekwe, agogo, ogene, udu, shekere, talking drum, kakaki-goje fanfare). No `coin`, `blip` or `whoosh`. Interaction cues <= 300 ms; celebration class (`chainEnd`, `crown`, `matchWin`, `matchLose`, `matchDraw`) <= 1.5 s. Names do not shadow core events. Register with `core.audio.registerSfx({ ...coreSfx, ...draughtsSfx })`, soft mix `softSfx({ ...coreSfx, ...draughtsSfx })`. Tested in `sfx.test.ts` (9 tests; the "every cue is played from game code" test activates as soon as game code names `draughtsSfx`).

| Event | Instrument or everyday sound | Preset (`draughtsSfx.<name>`) | Notes |
|---|---|---|---|
| New game, board laid out | shekere shuffle, low ekwe knock | `boardIn` | |
| Lift a piece | bright ekwe click, tiny agogo ting | `pieceSelect` | |
| Put it back | soft low ekwe, bead tick | `pieceDeselect` | |
| Player slide | ekwe (guide: piece move) and a soft udu set-down | `pieceMove` | |
| CPU slide | the same, a little lower | `cpuMove` | player hears who moved |
| Single capture | ekwe click, agogo double bell, high ting | `capture` | |
| Each hop in a multi-capture | ekwe and an agogo ting | `captureHop` | caller raises `pitch` 6 percent per hop, cap +36 percent |
| Multi-capture of 3 or more | talking-drum rise, agogo, ogene ring | `chainEnd` | celebration class |
| King crowned | ogene gong strike, talking-drum lift, two rising agogo tings | `crown` | celebration class (guide: ogene king) |
| Illegal move | low double ekwe, soft falling talking drum | `illegal` | gentle, never mocking |
| Mandatory capture reminder | two ekwe knocks and an agogo ting | `mustCapture` | |
| A side has one piece left | talking-drum squeeze up and a high ting | `lastPiece` | |
| Control returns to the player | talking-drum up glide | `yourTurn` | guide: talking drum for turn start |
| Hint | high udu bloop and agogo ting | `hint` | |
| ~~Undo~~ | (removed: the game ships no undo, so the `undo` cue was deleted from `sfx.ts` and its tests) | n/a | n/a |
| CPU thinking (about every 600 ms, max 6) | low shekere bead tick | `thinkTick` | very quiet |
| Board size, level or persona chosen | ekwe click and a low agogo ting | `modePick` | |
| Persona banter bubble | ekwe and a high agogo ting | `personaIn` | |
| Player wins | talking-drum fill, kakaki-goje fanfare, ogene ring | `matchWin` | celebration class |
| Player loses | falling talking-drum squeeze, low udu | `matchLose` | gentle |
| Draw | even agogo pair, soft shekere shuffle | `matchDraw` | "level" feeling |

## 7. Music brief (human composer; synth stand-ins in `src/audio/music.ts`)
Two loops, `.ogg` + `.mp3`, each <= 300 KB, seamless, -16 LUFS, no existing songs or artist sound-alikes (guide section 4: Hausa-inspired, calabash percussion, goje-style melody).
| File | Style | Tempo | Length | Instruments and mood |
|---|---|---|---|---|
| `audio/music/draughts-menu-hausa.mp3` | Hausa-inspired, unhurried | 96 BPM | 45 s | calabash (gourd) percussion in a rolling 12/8 feel, a goje-style bowed-lute melody on a D F G A pentatonic, soft hand-drum bass; a dignified evening-in-the-game-room feel. No real kakaki or royal ceremonial fanfare (the kakaki sound is kept for the win cue) |
| `audio/music/draughts-play-hausa.mp3` | thinking bed | 104 BPM | 60 s | the same calabash pulse, thinner; goje melody sparse and low-level, **nothing between 800 Hz and 2.5 kHz on the beats where the ekwe move and agogo capture cues land**; supports concentration over 10 to 20 minutes, never tiring |
Duck music 6 dB for voice lines. Provide creator, date and licence for CREDITS. A musician from northern Nigeria should check the goje and calabash direction. Synth stand-ins: a rolling shekere pulse, soft udu, hollow ekwe and a sparse agogo melody (`menuMusic`, `playMusic`).

## 8. Voice script (silent placeholders; Nigerian voice actors)
Speaker: **the table umpire** (a neutral voice, M or F, 30s to 50s; warm and quick, never sarcastic; no exaggerated accent), so the three personas need no voice. Files `audio/voice/vo-<id>.mp3`, manifest `audio/voice-manifest.json`, direction in `VOICE_SCRIPT.md` "Game-specific lines: Draughts Naija". Every Pidgin line is `_review`. Shared lines also used: `oya`, `e-don-do`, `you-don-win`, `madalla`.
| ID | Pidgin (pcm) | English (en) | Used for |
|---|---|---|---|
| `dn-start` | Oya, make we play! | Come on, let's play! | game start |
| `dn-capture` | Chop am! | Taken! | capture (sparingly) |
| `dn-must` | Capture first o! | You must capture first! | non-capturing move attempted |
| `dn-chain` | Ehen! Jump, jump, jump! | Jump after jump! | multi-capture of 3 or more |
| `dn-king` | King don show! | A king is crowned! | crowning |
| `dn-illegal` | No be that way o. | Not that way. | illegal move (sparingly) |
| `dn-last` | Last piece o! | One piece left! | a side down to one piece |
| `dn-win` | You be correct player! You don win! | Well played! You win! | player wins |
| `dn-lose` | Small small, you go catch am next time. | Little by little, you'll get it next time. | player loses |
| `dn-draw` | E be like say we level o. | Looks like we are level. | draw |

## 9. Make versus human
| Item | Made in repo | Needs a human |
|---|---|---|
| Board, pieces, states, fx, stage, icon, CSS, ship.json | yes (about 20 KB gzip) | optional hand-drawn board and piece set at the same units |
| SFX | yes (`draughtsSfx`, 21 cues) | musician listening check on a phone speaker |
| Music | synth stand-ins, silent mp3 placeholders | composer (2 loops, section 7) |
| Voice | silent placeholders and manifest | voice actor (10 lines, section 8); native review of the Pidgin |
| Persona art | shape-built busts | illustrator (3 expressions each); native confirmation of the names, regions, banter, the Tiv striped shawl and the one Yoruba line; a Tiv and a Kanuri greeting to be supplied |
| Hero art | SVG placeholders at 512x512 and 1024x500 | illustrator for `.webp` |

## 10. Self-check against the guide
| Principle | Check |
|---|---|
| 1. Nigerian, not pan-African | Arewa relief and pointed arches, aso-oke seam, adire resist cloth, akwete diamonds, gele-ribbon burst; instruments gangan, agogo, ogene, ekwe, udu, shekere, kakaki-goje (calabash direction for music). No kente, kora, safari or savanna. Pass |
| 2. Contemporary and urban, with roots | a nurse, an engineering student with an ID lanyard and a varsity-jacket rival play a mobile draughts game against heritage cloth and wall relief. Pass |
| 3. Whole country | Middle Belt (Tiv), North-East (Kanuri), Yoruba (Abeokuta) personas; Hausa architecture and music direction; Igbo akwete; the catalogue's Middle Belt gap is filled a second time. Gap: no South-East or South-South persona in this game (they have several elsewhere). Pass with note |
| 4. Celebrate, never mock | wrong or illegal moves are a soft falling drum and "Not that way"; the rival is sporting; no jokes about ethnicity, religion, accent, poverty or body type; "chop" is draughts slang for capture, not a food joke. Pass |
| 5. Original work only | every shape is generated in this repo; the striped shawl is plain stripes; no copied textile, brand, club or person; no university or hospital name. Pass |
Avoid list: no sacred or shrine symbols, no religious symbols (Doosuur wears a shawl, Falmata and Damola no headwear; no hijab or kufi, which also avoids Muslim-coding a third persona), no masquerade regalia, no nsibidi, no party colours as a dominant theme (indigo and terracotta), no real banknotes (no coins in this game's art), no gambling visuals (no stakes, odds or prizes; draughts is skill only). Edge notes for the reviewer: the Arewa star-in-square relief (shared with the core pattern library), the crown (a plain game-piece crown, not regalia), the pointed arches (generic).

## 11. Requests to the senior-developer
1. `gameConfig.theme` to `theme-adire`; import `../assets/draughts-art.css`; keep `./assets/ship.json` (the build checks it). Delete the scaffold `src/sfx.ts`, `assets/agogo.svg` and the `agogo.svg` entry in `ship.json` when the real UI replaces the scaffold.
2. Register `draughtsSfx` (and `softSfx` for the quiet mix); play every cue (the unit test enforces it once wired). Use `captureHop` with a pitch ramp (+6 percent per hop, cap +36 percent), `thinkTick` at about 600 ms while the CPU thinks, `pieceMove` versus `cpuMove` by side. Done: the game has no undo, so `undo` and `DRAUGHTS_OPTIONAL_CUES` were deleted. Music: import `menuMusic` and `playMusic` from `src/audio/music.ts`.
3. Render only dark squares as buttons (`(r + c)` odd, row 0 on top); inline `grid-row` and `grid-column`; set `data-n` and `--dn-n`. Draw state classes from the engine's legal-move data; never use only a colour change.
4. Board sizing: `width: min(100%, var(--dn-max))` is square; on short landscape screens also cap it by height (for example `min(100%, calc(100dvh - 220px))`).
5. Mandatory capture: add `is-must` to pieces that must capture and show a text toast (`t('...')`) with `mustCapture`; show the maximum-capture path with `is-path` + `.dn-step` + `.dn-leg` and `is-jumped`.
6. Tap targets: add hit-slop in the view (for example pointer-down picks the nearest legal square within 22 px of the touch), and auto-select a piece when only one can move.
7. Personas: add `persona.<id>.1..8` keys (en and pcm) from `PERSONAS.md`, each Pidgin line carrying `_review`; the avatars are `./assets/avatars/<id>.svg`. Map Easy to Doosuur, Medium to Falmata, Hard to Damola. Show the avatar with `.ng-avatar` and the turn icon.
8. Results screen: reuse core `.ng-results`; play `matchWin`, `matchLose` or `matchDraw`.
9. Optional: add `check-draughts-naija-art.mjs` to the `check` script next to the other art checkers.
