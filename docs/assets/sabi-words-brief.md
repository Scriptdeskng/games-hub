# Sabi Words: asset brief

Slug `sabi-words`. Palette: **Market Spice** (`theme-market`: wall `#6B1A0E`/`#430E07`, pepper red `#D63A1F`, palm-oil orange `#F58A24`, plantain yellow `#F7D348`, ugu green `#6DBA3F`) with cream sign tiles `#FFF1DC` and ink `#3A0E06` (15.2:1). Per-pack accents rotate through the other palettes (section 3). The scaffold's `gameConfig.theme` is `theme-naija-green`; the developer should set it to `theme-market` (section 12). Generator `scripts/gen-sabi-words-art.mjs`, art checker `scripts/check-sabi-words-art.mjs`, pack checker `scripts/check-sabi-words-pack.mjs` (plus the shared `npm run packs:check`). Art lives in `games/sabi-words/assets/`.

## 1. Cultural concept
A **Lagos market stall at closing time**: a red-and-cream **striped tarpaulin awning** (the market-tarp the guide lists) scalloped across the top, a wine-red wall with faint **adire ring-and-dot** resist patterning, a wooden table along the bottom with an **aso-oke runner**, and in the middle a dark **notice board** in a wood frame with aso-oke edging and **akwete diamonds** at the corners. The letters sit on **cream sign-painter tiles** in the Bungee display face (the "hand-painted signage letters" the guide asks for), so the grid reads like a row of painted market signs. The word list is a **pinned paper slip**. Found words are marked with **patterned cloth lanes** (stripes, dots, zigzag, akwete diamonds, grid, adire waves), the swipe is a **gold thread** ribbon with a bead on the fingertip, the hint is a **hurricane lantern** (everyday NEPA-time object), and the time bar is an **aso-oke strip** that drains.

Regions and traditions drawn on: Yoruba (adire, aso-oke, agogo, Lagos market and places), Igbo (akwete, ekwe, udu, ogene, Ogbete, Onitsha, Aba), Hausa-Fulani (Kano and Kurmi, Abuja Wuse, northern foods, goje and kakaki fanfare), South-South (**Edo guide Osas**, Efik soups, Niger Delta banga, Port Harcourt bole) and Middle Belt (Plateau, Benue, Nasarawa, Kogi in the states pack). The six packs rotate palettes and icons so no pack is one region: food is pan-Nigerian by design (Yoruba, Igbo, Hausa, Efik, Urhobo and more), Lagos Places is deliberately Lagos (the guide allows an all-Lagos pack when the pack is about the place), States and Capitals spans every zone, and Cloth and Markets spans Lagos, Kano, Abuja, Enugu, Aba and Onitsha. Contemporary and urban with roots (Principle 2): mobile-era word search, danfo, BRT-style Lagos names, market haggling, beside heritage cloth.

## 2. Legibility and colour-blind contract (360x640)
- **Letters are real text** in `--ng-font-display` (Bungee), ink `#3A0E06` on cream `#FFF1DC` (15.2:1), with a cream halo (`text-shadow`) so a letter stays readable over a lane pattern. Minimum font size 15 px; `font-size: max(15px, 0.52 x cell)`. Letters never sit on the awning or wall.
- **Grid sizes for a 360 px wide phone** (board = 328 px wide, 14 px frame each side, so 300 px of cells): 8x8 = 37 px cells (easy), 10x10 = 30 px (medium), 12x12 = 25 px (hard, **recommended cap**; letters 15 px). Selection is by swipe with a hit circle of radius 0.4 x cell around each tile centre (the diagonal gaps are ambiguous otherwise), so cells under 44 px are fine; every button around the grid (hint, pack card, pause) is at least 44 px. Do not exceed 12x12 on portrait phones.
- **Found-word lanes never rely on colour.** Each of the six lanes has its own **pattern** (1 diagonal stripes, 2 dots, 3 zigzag, 4 diamonds, 5 grid, 6 waves), a dark outline, a flat (not raised) tile, **and an underline bar** under every found letter. The same pattern swatch sits in the word list next to the word, the word is **struck through** and gets a **check disc**. Verified in greyscale (`sabi-words-sheet1-grey.png`). Lane order cycles 1..6 in the order words are found, so adjacent finds always differ by pattern.
- **Selected tiles** (live swipe) are shown by a thick dark ring, a raise and scale (1.06), an underline bar, **and** a gold ribbon (the trail) behind the letters with light diagonal stripes; the finger bead follows the pointer. The trail sits **under** the letters (selected tiles are see-through) so it never dims a letter.
- **Wrong swipe** = shake (motion) + dashed red outline (shape) + the soft falling-drum cue (sound), not only a red tint.
- **Hint** = a dashed double ring with four ticks around the tile (shape and pulse) plus the udu bloop; the hint button is a 48 px lantern, disabled state is greyscale and 45 percent opacity.
- **Time**: a draining aso-oke strip. The last 5 s add a dashed gold outline, a pulse and a warning triangle at the bar end, plus shekere ticks: shape, motion and sound, not only colour.
- **Stars**: filled gold with ink outline (earned) versus a dashed hollow outline with a cross (not earned); readable in greyscale and by shape.

## 3. Assets (all under `games/sabi-words/assets/`)
Sizes are the SVG viewBox in units. Total art 33 KB gzip including the packs (budget 800 KB).

| Path | Size | Purpose | Cultural reference | Maker |
|---|---|---|---|---|
| `bg/board-portrait.svg`, `bg/board-landscape.svg` | 360x640, 640x360 (`cover`) | full-bleed market-stall backdrop (landscape adds pinned notice papers at the sides) | striped market tarpaulin awning, adire wall rings, wooden stall table, aso-oke runner | in-repo |
| `ui/board-frame.svg` | 340x340 (`100% 100%`, square board) | grid board frame with dark adire inner field | carved wood, aso-oke edge bands, akwete diamond corners | in-repo |
| `ui/pack-card.svg` | 320x84 (`100% 100%`) | pack picker card, 56 px icon slot at the left | cloth card, aso-oke top strip, akwete diamond foot | in-repo |
| `ui/banner.svg` | 340x120 | level-complete banner (stars are DOM `.sw-star` over it) | adire indigo cloth, aso-oke bands, ribbon tails | in-repo |
| `ui/pin.svg` | 24x24 | pin on the word slip | market notice board | in-repo |
| `hud/star-on.svg`, `hud/star-off.svg` | 64x64 | earned and empty star (shape differs: solid vs dashed with a cross) | n/a | in-repo |
| `hud/hint-lantern.svg` | 64x64 | hint button face | hurricane lamp (NEPA-time light) | in-repo |
| `hud/time-low.svg` | 48x48 | last-5-seconds warning triangle | n/a | in-repo |
| `hud/check-disc.svg` | 32x32 | "found" check in the word list | n/a | in-repo |
| `hud/time-strip.svg` | 48x16 (`repeat-x`) | time bar fill, clipped with `clip-path` so the pattern never stretches | aso-oke strip | in-repo |
| `lanes/pat-1.svg` ... `pat-6.svg` | 24x24 tiles (`repeat`) | the six found-word patterns, ink at 42 percent alpha, transparent background | adire ripple and rings, akwete diamonds, zigzag | in-repo |
| `icons/packs.svg` | 7 symbols, 48x48 | **one sprite**: `pack-food` (steaming bowl), `pack-lagos` (danfo), `pack-football` (ball), `pack-pidgin` (speech bubbles), `pack-states` (map pin with star), `pack-cloth` (striped cloth roll and needle), `pack-lock` | strokes use `currentColor` | in-repo |
| `fx/found-burst.svg` | 200x200 | one-shot burst at the end of a found word | gele-ribbon burst | in-repo |
| `fx/hint-ring.svg` | 96x96 | hint ring around a tile | n/a | in-repo |
| `fx/trail-bead.svg` | 32x32 | finger bead that follows the pointer during a swipe | brass or coral bead | in-repo |
| `icon/menu-mark.svg` | 128x128 | menu mark: gold rosette, two tiles "S" and "W", a thread through them | gele rosette, sign tiles | in-repo |
| `avatars/osas.svg` | 128x128 | **new** persona portrait for the guide (section 9) | adire head tie, paintbrush, apron | in-repo placeholder |
| `packs/naija-food.json` | 79 words | Naija Food | Market Spice (`theme-market`) | in-repo, **human review pending** |
| `packs/lagos-places.json` | 64 words | Lagos Places | Danfo Yellow (`theme-danfo`) | in-repo, **human review pending** |
| `packs/football-terms.json` | 72 words | Football Terms (generic only) | Naija Green (`theme-naija-green`) | in-repo, **human review pending** |
| `packs/pidgin-words.json` | 76 words | Pidgin Words (`lang: pcm`) | Aso-oke Gold (`theme-aso-oke`) | in-repo, **human review pending** |
| `packs/states-capitals.json` | 67 words | 36 states, FCT, Abuja and 29 more capitals | Adire Indigo (`theme-adire`) | in-repo, **human review pending** |
| `packs/cloth-markets.json` | 59 words | Cloth and Markets (the sixth theme) | Northern Earth (`theme-northern`) | in-repo, **human review pending** |
| `words-art.css` | n/a | `.sw-*` classes and keyframes (section 4) | n/a | in-repo |
| `thumb/thumb-512x512.svg`, `thumb-1024x500.svg` | 512x512, 1024x500 | **placeholder** hero art (stall, board, a found lane and a swipe trail; no text) | stall | in-repo placeholder, human `.webp` |
| `audio/music/words-menu-afrobeats.mp3`, `words-play-afrobeats.mp3`, `words-tense-afrobeats.mp3` | silent | music placeholders (section 8) | light Afrobeats | human composer |
| `audio/voice/vo-sw-*.mp3` (11), `audio/voice-manifest.json` | silent | voice placeholders (section 9) | Osas | human voice actor |
| `ship.json` | n/a | include list | n/a | in-repo |
| `../src/audio/sfx.ts`, `sfx.test.ts`, `music.ts` | n/a | `wordsSfx` cue map and tests; synth stand-in music (`menuMusic`, `playMusic`, `tenseMusic`) | section 7 | in-repo |

Not shipped as files (like Quiz and Whot): `words-art.css` is imported by the code so Vite bundles it with its `url()` assets; thumbs, music and voice stay out of `ship.json` until something loads them. The scaffold's `agogo.svg` is listed in `include` only so today's scaffold still builds; delete the file and the entry once the real UI replaces it (section 12).

## 4. Developer API (CSS and sprite)
Import once: `import '../assets/words-art.css'`. Inline `icons/packs.svg` once (`?raw`) and use `<svg class="sw-pack__i"><use href="#pack-food"/></svg>`. The header comment of `words-art.css` has the full DOM sketch. Summary:
- Stage: `<div class="sw-stage">`. Board: `.sw-board` with `--sw-n` (grid size) and `--sw-cell` (px per cell) set inline; inside it `.sw-grid` (CSS grid of `button.sw-tile > span.sw-tile__l`) and `.sw-lanes` (absolutely positioned lane and trail elements).
- Tile states: `is-sel`, `is-found` (+ `data-lane="1..6"`), `is-hint`, `is-wrong`.
- Lane and trail: `<i class="sw-lane sw-lane--N" style="--x;--y;--len;--a">`; `--x/--y` = centre of the first tile in px inside `.sw-grid`, `--len` = distance first centre to last centre in px (diagonal: x1.414 per step), `--a` = angle in degrees (0, 45, 90 ... 315). The live swipe is `<i class="sw-trail" ...>` inside `.sw-lanes`; add `is-wrong` for a bad swipe. `<i class="sw-bead" style="--px;--py">` follows the pointer.
- Word list: `ul.sw-words > li.sw-word[data-lane][.is-found] > i.sw-word__sw + span`.
- HUD: `.sw-hud`, `.sw-time[.is-low] > i.sw-time__fill` with `--sw-p` (0..1 remaining, set about every 250 ms), `.sw-stars > .sw-star[.is-on]`, `.sw-coins`, `button.sw-hint` (set `disabled` and `aria-label`).
- Packs: `button.sw-pack.sw-pack--food|lagos|football|pidgin|states|cloth` with `.sw-pack__i` and `.sw-pack__t`. Locked packs: `[disabled]` plus `<use href="#pack-lock"/>`.
- Level complete: `.sw-banner` containing `.sw-stars`. Fx: `.sw-fx.sw-fx--found` (at the last tile of the word) and `.sw-fx--hint`; remove on `animationend`.
- Motion: transform and opacity everywhere except one `clip-path` on the time bar. `prefers-reduced-motion` collapses all durations.

## 5. Word packs (the data contract)
Shape: the repo `WordPack` schema (`{version:1, id, title, lang, theme, blocklist?, words:[{word, hint?, tags?, reviewed?}]}`), validated by `scripts/pack-check.mjs` (`npm run packs:check`) and, on top of it, `scripts/check-sabi-words-pack.mjs`.

| Pack id | Title | lang | Words | Notes |
|---|---|---|---|---|
| `naija-food` | Naija Food | en | 79 | soups, swallows, snacks, drinks, peppers, fruit; Yoruba, Igbo, Hausa, Efik, Niger Delta |
| `lagos-places` | Lagos Places | en | 64 | districts, markets, beaches, bridge and lagoon; generic descriptions, no brands |
| `football-terms` | Football Terms | en | 72 | **generic game words only**: no clubs, players, leagues by brand, sponsors or kit makers |
| `pidgin-words` | Pidgin Words | pcm | 76 | everyday Pidgin and Lagos street-life words; all family-friendly; hints are plain English |
| `states-capitals` | States and Capitals | en | 67 | all 36 states, `FCT`, `ABUJA`, and 29 capitals as separate words (the 7 capitals that share a state's name are not repeated: Bauchi, Enugu, Gombe, Kaduna, Kano, Katsina, Sokoto) |
| `cloth-markets` | Cloth and Markets | en | 59 | textiles, tailoring tools, market words and famous markets |

**Word form (documented):** `word` is **uppercase A-Z only, 3 to 12 letters**: spaces, hyphens, apostrophes and diacritics are stripped (`Jollof rice` -> `JOLLOF`, `Ado-Ekiti` -> `ADOEKITI`, `Port Harcourt` -> `PORTHARCOURT`). When the pretty form differs, it is stored as the tag `display:<text>` (for example `display:Port Harcourt`); the check requires its letters, uppercased, to **start with** `word` (qualifiers such as "rice" or "Market" may follow, and the game should show the `display` form in the word list where it fits). The developer can use `display` in the list and `word` in the grid. Every word has a plain-English `hint` (<= 90 characters) that never contains the word itself (checked). `reviewed: false` on **every** word (a human flips it); `node scripts/pack-check.mjs --release` and `check-sabi-words-pack.mjs --release` fail until then. 59 words carry the tag `uncertain` (spelling, region or detail to confirm): the first things for the reviewer (list in the asset-designer report; `node scripts/check-sabi-words-pack.mjs --uncertain` prints them).

**Blocklist (identical in all six packs, 149 entries, uppercase A-Z, 3 to 20 letters):** English and Pidgin vulgar words, sexual and body terms, violent and gore terms, slurs (racial, ethnic, religious, disability, sexuality), drug, gambling and scam words, insults, and political or conflict terms (party names, separatist and extremist labels, `ENDSARS`). The check guarantees that **no pack word contains a blocklisted string, forwards or backwards** (so the puzzle can always be generated). It deliberately leaves out short strings that sit inside real pack words (`ASS` in `PASS`, `TITS` in `STITCH` and `SUBSTITUTE`, `OKO` in `OKOTA`, `BET`, `DEAD` in a dead ball); the longer forms are listed instead (`ASSHOLE`, `BADASS`, `TITTY`, `BETTING`...). The generator's filler scan is what catches short strings in the grid, so the reviewer should read the list for gaps.

**Grid generator contract (for the developer, `src/rules`):** place the words (all 8 directions on the harder levels; right and down only for easy), then choose filler letters **blocklist-aware**: after filling, scan every row, column and diagonal in **both directions** for any blocklisted string; when one appears, **redraw the filler letters** involved (never move a placed word) and rescan; a string that lies wholly inside a placed pack word is impossible by the check above. Also reject a grid where a **placed word appears twice** (for example filler spelling a second copy), so a found word is unambiguous, and keep a hard cap on redraw attempts with a seeded RNG so generation stays deterministic.

## 6. Level, stars and hints (visual contract for the developer)
GAMES.md: solo against the clock, three stars by finish time, hints cost cosmetic coins. The art assumes: stars by the fraction of time left (suggested: 3 stars at 50 percent or more left, 2 at 20 percent or more, 1 for finishing); coins and stars are cosmetic. Hint (lantern) reveals the first letter of a not-yet-found word with a pulsing `is-hint` ring, costs a small coin amount shown with the core coin icon and never any real money. Never show a "buy coins" or ad-for-coins prompt that implies purchase.

## 7. SFX list: event to instrument to preset (`src/audio/sfx.ts`, `wordsSfx`)
All cues are core voices (ekwe, agogo, ogene, udu, shekere, talking drum, kakaki-goje fanfare). No `coin`, `blip` or `whoosh`. Every interaction cue <= 300 ms; celebration class (`wordFoundLong`, `levelComplete`, `levelFail`) <= 1.5 s. Names do not shadow core events (`tap`, `select`, `coin`, `fail`, `win`, `lose`, `tick`). Tested in `sfx.test.ts` (6 tests).

| Event | Instrument or everyday sound | Preset name (`wordsSfx.<name>`) | Notes |
|---|---|---|---|
| Board laid on the table | shekere shuffle, low ekwe knock | `gridIn` | new puzzle |
| Press the first letter | bright ekwe slit-drum click | `letterTap` | select tick |
| Each new letter in the swipe | ekwe click with a shekere bead tick | `letterSwipe` | caller raises `pitch` 4 percent per letter, cap +40 percent |
| Word found | agogo double bell, high agogo ting, soft ogene ring | `wordFound` | under 8 letters |
| Long word found (8+ letters) | talking-drum rise, agogo, ogene ring | `wordFoundLong` | celebration class |
| Not a word (wrong swipe) | low ekwe knock and a soft falling talking drum | `wordWrong` | gentle, never mocking |
| Selection cleared or cancelled | shekere tick and a low ekwe | `selectionClear` | |
| Hint used | high udu bloop and an agogo ting | `hint` | lantern lit |
| Coins paid for a hint | low agogo ting and an ekwe click | `coinSpend` | a small spend |
| Cosmetic coins earned | two rising agogo tings | `coinEarn` | (core `coin` also works) |
| Star lands | agogo ting and a bead tick | `star` | caller pitch 1, 1.25, 1.5 for stars 1 to 3 |
| Last 5 s, each second | shekere tick over a high ekwe | `timerLow` | |
| Final second | the same, pitched up | `timerLast` | |
| Pack chosen | ekwe click and a low agogo ting | `packPick` | |
| Guide banter bubble | ekwe and a high agogo ting | `hostIn` | |
| Results score count | single agogo ting | `scoreTick` | |
| Every word found | talking-drum fill, kakaki-goje fanfare, ogene ring | `levelComplete` | celebration class |
| Time ran out | falling talking-drum squeeze and a low udu | `levelFail` | gentle; the "fail" cue |

Register with `core.audio.registerSfx({ ...coreSfx, ...wordsSfx })`; soft mix `softSfx({ ...coreSfx, ...wordsSfx })`.

## 8. Music brief (human composer; synth stand-ins in `src/audio/music.ts`)
Three loops, `.ogg` + `.mp3`, each <= 300 KB, seamless, -16 LUFS, no existing songs or artist sound-alikes (guide section 4: light Afrobeats).
| File | Style | Tempo | Length | Instruments and mood |
|---|---|---|---|---|
| `audio/music/words-menu-afrobeats.mp3` | light Afrobeats, log-drum-free | 104 BPM | 45 s | clean muted guitar riff, shekere on the off-beats, soft bass, a small agogo answer; relaxed market-morning feel |
| `audio/music/words-play-afrobeats.mp3` | thinking bed | 108 BPM | 60 s | the same guitar and shekere, thinner; **nothing between 800 Hz and 2.5 kHz that fights the ekwe letter taps and the agogo "found" cue**, no melody on the beat the cues land on; supports concentration, not distraction |
| `audio/music/words-tense-afrobeats.mp3` | tense variant for the last 5 seconds | 136 BPM | 8 s loop | the play bed doubled in speed, shekere on every step, rising agogo, muted guitar; crossfade from the play bed at 5 s left |
Duck music 6 dB for voice lines. Provide the creator, date and licence for CREDITS. Synth stand-ins (`menuMusic`, `playMusic`, `tenseMusic`) use a 3-3-2 ekwe pattern, shekere and a sparse agogo.

## 9. Personas and voice

### Guide: Osas (`osas`), new
**Edo, Benin City.** 30s, a sign-painter and letterer who still paints shop boards by hand, which is where the game's painted-letter tiles come from. She is the game's guide and coach (she announces, praises and nudges; she is not an opponent, because Sabi Words is player against the clock). Meticulous, warm, a little playful about tidy lettering; never mocks a wrong swipe. Skin `#6A4430`; adire-indigo head tie with a small knot, a paintbrush behind the ear, a cream apron with paint dots; plantain-yellow top on a palm-oil-orange ground (Market Spice).
**Why Edo:** the style guide and `HUMAN_ASSETS.md` row 12 list the **Edo** voice as a gap in the cast (the other South-South voices are Tari (Ijaw), Efe (Urhobo, Warri) and Uncle Etim (Efik)); a Yoruba guide would be a third Yoruba character (Baba Ade, Funmi) and the sign-painter trade is not region-specific. The cultural guide (section 1, Principle 3) names Edo as a region to rotate in, and the Benin-brass gleam is already a guide-approved material; Osas wears **no royal or ceremonial regalia** (no coral-bead regalia) and no sacred symbol, only everyday trade dress. The name `Osas` and the Edo greeting `Kóyo` need native confirmation (HUMAN_ASSETS).
**Regional rotation:** the guide row says "rotating regional packs": each pack has its own palette accent and icon (Market Spice food, Danfo Yellow Lagos, Naija Green football, Aso-oke Gold Pidgin, Adire Indigo states, Northern Earth cloth), so the screen leans on a different region as the player changes pack, while Osas stays the constant guide.

Banter (key `persona.osas.<n>`; `_review: true` where marked; Edo, Yoruba, Igbo and Hausa words always need a native speaker):
| # | en | pcm | flags |
|---|---|---|---|
| 1 | Kóyo! Welcome to my stall. Let us find some words. | Kóyo! Welcome to my stall. Make we find some words. | `_review: true` |
| 2 | Take your time and look in every direction. | Take your time, look for every side. | `_review: true` |
| 3 | There it is! You found it! | E dey there! You see am! | `_review: true` |
| 4 | That one is long. Well done! | That one long o. Well done! | |
| 5 | Not a word, but nice try. Swipe again. | No be word, but you try. Swipe again. | `_review: true` |
| 6 | Let me light the lantern for you. | Make I light lantern for you. | |
| 7 | The clock is moving o. Five seconds! | Time dey run o. Five seconds! | |
| 8 | Three stars! Every letter in its place. | Three stars! Every letter dey him place. | `_review: true` |

### Voice lines (silent placeholders; Nigerian voice actor)
Speaker **Osas** (F, 30s; an Edo or Benin-flavoured voice is welcome, no exaggerated accent). Files `audio/voice/vo-<id>.mp3`, manifest `audio/voice-manifest.json`. Same rules as `VOICE_SCRIPT.md`; every Pidgin line is `_review`. Full table with directions in `VOICE_SCRIPT.md` ("Game-specific lines: Sabi Words"). Ids: `sw-koyo`, `sw-start`, `sw-found`, `sw-long`, `sw-wrong`, `sw-hint`, `sw-last5`, `sw-star3`, `sw-win`, `sw-lose`, `sw-pack`. Shared lines also used: `oya`, `madalla`, `e-ku-ise`, `you-don-win`, `e-don-do`.

## 10. Make versus human
| Item | Made in repo | Needs a human |
|---|---|---|
| All SVG art, CSS, sprite, fx, ship.json | yes (about 10 KB gzip SVG and CSS) | optional final illustration of the stall, board and thumbs |
| SFX | yes (`wordsSfx`, 18 cues) | musician listening check on a phone speaker |
| Word packs | 417 words written in-house, 149-entry blocklist | **fact and language review of every word, flip `reviewed`**; native reviewers for 59 `uncertain` words; reviewer reads the blocklist for gaps |
| Music | synth stand-ins, silent mp3 placeholders | composer (3 loops, section 8) |
| Voice | silent placeholders and manifest | voice actor (11 lines, section 9) |
| Hero art | SVG placeholders at 512x512 and 1024x500 | illustrator for `.webp` |
| Persona art for Osas | shape-built SVG bust | illustrator (same 128 viewBox, 3 expressions); an Edo reviewer confirms the name, region label and greeting |

## 11. Self-check against the guide
| Principle | Check |
|---|---|
| 1. Nigerian, not pan-African | market tarpaulin awning, adire rings, aso-oke bands, akwete diamonds, hurricane lantern, danfo icon, Balogun, Wuse, Ogbete, Kurmi, Ariaria; instruments are ekwe, agogo, ogene, udu, talking drum, shekere, kakaki and goje. No kente, kora, safari, savanna or masks. Pass |
| 2. Contemporary and urban, with roots | a mobile word-search with Pidgin packs, Lagos districts, football and food, beside heritage cloth and a sign-painter guide. Pass |
| 3. Whole country | guide Edo (Benin City, fills the Edo gap); packs span Yoruba, Igbo, Hausa-Fulani, South-South and Middle Belt content; the States pack covers all 36 states and the FCT; Lagos Places is an all-Lagos pack by design (the pack is about the place). Pass |
| 4. Celebrate, never mock | wrong swipe is a soft falling drum, a shake and "nice try"; no joke about ethnicity, religion, accent, poverty or body type; Pidgin words are neutral and family-friendly; the blocklist removes insults. Pass |
| 5. Original work only | all art generated from shapes in-repo; every word and hint written in-house; football pack has no real club, player, league brand, kit maker or sponsor; no brand names in any pack (no Gala, no named sodas or banks). Pass |
Avoid list: no kente, kora, safari, masks, masquerade regalia, shrine or religious symbols, no nsibidi (the lane patterns are plain geometry), no party colour pairing as the dominant theme (red, cream and wood-brown; green is a small accent), no real banknotes, no real brands. Edge notes for the cultural reviewer: `OWAMBE` and `ASOEBI` are celebrations, not religious; `ABOKI` was considered and left out because some readers find it condescending; `GAMBARI`, `YAMYAM` and `BUSHMAN` are in the blocklist; `NIGER` (a state) is a legitimate pack word and the blocklist covers the slur forms (`NIGGER`, `NIGGA`) so a filler cannot spell them. Gambling check: no stakes, odds or prizes; hint coins are cosmetic; `BETTING`, `CASINO`, `LOTTO` are blocklisted.

## 12. Requests to the senior-developer
1. `gameConfig.theme` to `theme-market`; import `words-art.css`; read `./assets/ship.json` (the build checks it).
2. Use `src/audio/sfx.ts` (`wordsSfx`, tests included) and `src/audio/music.ts`; delete the scaffold `src/sfx.ts` and its imports in `main.ts` and `app.ts`, and delete `assets/agogo.svg` plus its `include` entry when the UI is replaced.
3. Load packs with `fetch('./assets/packs/<id>.json')`; the six filenames are listed in `ship.json` `include` (stale entries fail the build). Refuse to start a round on a word with `reviewed: false` outside dev mode (a `?unreviewed=1` flag in dev is fine); respect the release rule in GAMES.md.
4. Grid generator and blocklist: follow the contract in section 5 (blocklist-aware filler, both directions, all rows, columns and diagonals, seeded RNG, no duplicate placed word). Unit-test it against the real blocklist of each pack.
5. Show the `display:` tag form in the word list when present; hint text is the `hint` field.
6. Lane index cycles 1..6 in finding order; set `data-lane` on every tile of the word and on its list item; add the underline and strike-through via the classes, never by colour alone.
7. Persona keys: add `persona.osas.1..8` (PERSONAS.md); the new avatar lives in this game's `assets/avatars/osas.svg` (core was not edited).
8. Keep `.sw-board` at `touch-action: none` (the CSS does this) and use pointer events with the hit-circle rule in section 2.
9. Optional wiring request: add `check-sabi-words-art.mjs` and `check-sabi-words-pack.mjs` to the `check` npm script next to the others if the quiz checkers are ever wired in (neither quiz checker is today).
