# Naija Games Style Guide

Built from `docs/assets/CULTURAL_GUIDE.md` (binding). Everything here is original work made in-repo. Files:

| What | Path |
|---|---|
| Design tokens (7 palettes + base) | `packages/core/src/styles/tokens.css` |
| UI skin (`.ng-*` components) | `packages/core/src/styles/skin.css` (tokens + skin = about 6 KB gzip) |
| Pattern library | `packages/core/assets/patterns/*.svg` and `patterns-preview.html` |
| Persona avatars and sheet | `packages/core/assets/avatars/*.svg` |
| Logo lockups | `packages/core/assets/logo/*.svg` |
| Icons | `packages/core/assets/icons/icons.svg` (sprite) and `icons/<name>.svg` |
| Fonts | `packages/core/assets/fonts/*.woff2` |
| Palette source and WCAG checker | `packages/core/assets/tools/palettes.json`, `contrast-check.mjs` |
| Live preview of every component | `packages/core/assets/ui-preview.html` (open in a browser; add `?theme=adire` etc.) |
| Voice and music briefs | `docs/assets/VOICE_SCRIPT.md`, `docs/assets/MUSIC_BRIEF.md` |
| Persona sheet, lines | `docs/assets/PERSONAS.md` |
| Human-made assets needed | `docs/assets/HUMAN_ASSETS.md` |

## 1. Cultural concept
The shell feels like a **Lagos hand-painted sign meets a woven aso-oke strip**: bold chunky lettering, warm deep backgrounds, light "cloth" cards, narrow woven stripe bands for borders and progress, with adire, akwete, uli, Arewa relief and ankara repeats as quiet textures. Colour is rotated across the **seven named palettes** so no game looks like a generic template and no single region dominates (Principle 3): Yoruba (adire, aso-oke, fila, gele), Igbo (akwete, uli, udu, ogene, ekwe), Hausa-Fulani (Arewa relief, kufi, goje, kakaki, Kano dye pits), South-South (Creek & Coral for Ijaw/Niger Delta; Edo-inspired brass for trophies), and urban Lagos (danfo, market, Afrobeats).

## 2. Palettes (exact tokens)
Every palette is a deep, rich background (`bg`, `bg-2` gradient end), a light cloth surface for cards and modals (`surface`, `surface-2`), a primary action colour and an accent, with text pairs that pass WCAG AA. Theme classes go on `<html>` or the game root: `theme-naija-green` (also the default on `:root`), `theme-adire`, `theme-danfo`, `theme-aso-oke`, `theme-market`, `theme-northern`, `theme-creek`.

| Palette | Inspiration (guide) | Feel | Default for |
|---|---|---|---|
| Naija Green (`theme-naija-green`) | national green and white, forest green | proud, fresh | shared portal UI, Penalty King |
| Adire Indigo (`theme-adire`) | Yoruba indigo resist cloth | calm, crafted | Ayo, Draughts, menus |
| Danfo Yellow (`theme-danfo`) | danfo yellow, black stripe, asphalt, signage red | loud, energetic | Danfo Dash, Snakes & Ladders |
| Aso-oke Gold (`theme-aso-oke`) | aso-oke and gele: gold, wine, burnt orange | festive, premium | Whot, results, rewards |
| Market Spice (`theme-market`) | pepper red, palm-oil orange, plantain yellow, ugu green | warm, appetising | Mama Put Match, Sabi Words food pack |
| Northern Earth (`theme-northern`) | Kano dye pits, Zaria terracotta, ochre, indigo | rich, earthy | northern levels and packs |
| Creek & Coral (`theme-creek`) | Niger Delta creeks, coral beads | lively | South-South levels and packs |

Token values (CSS name `--ng-<token>`; names in this table are the JSON keys, CSS uses kebab-case: `bg2` is `--ng-bg-2`, `inkS2` is `--ng-ink-s-2`, `s1` is `--ng-stripe-1`):

| Token | Naija Green | Adire Indigo | Danfo Yellow | Aso-oke Gold | Market Spice | Northern Earth | Creek & Coral |
|---|---|---|---|---|---|---|---|
| --ng-bg | `#0B3D22` | `#122055` | `#1D1D20` | `#4A1020` | `#6B1A0E` | `#552716` | `#08454E` |
| --ng-bg-2 | `#06281A` | `#0A1233` | `#2C2C31` | `#2C0813` | `#430E07` | `#341409` | `#042B31` |
| --ng-surface | `#F3FAF4` | `#F4F1E8` | `#FFF5CC` | `#FFF3DA` | `#FFF1DC` | `#F7E8D0` | `#EEFAF6` |
| --ng-surface-2 | `#DCEFE1` | `#DCE2F2` | `#F2E3A0` | `#F5DEB0` | `#F7D9AE` | `#E9CFA5` | `#CDEBE3` |
| --ng-ink | `#FFFFFF` | `#F4F1E8` | `#FFFFFF` | `#FFF3DA` | `#FFF1DC` | `#F7E8D0` | `#FFFFFF` |
| --ng-ink-2 | `#BFE3CB` | `#B9C6EE` | `#D2D2D8` | `#E8C9A4` | `#F0C9A8` | `#E2C3A0` | `#B5E3DA` |
| --ng-ink-s | `#0A2A18` | `#0F1B4A` | `#1D1D20` | `#35091A` | `#3A0E06` | `#2E1509` | `#053137` |
| --ng-ink-s-2 | `#3B5A47` | `#434F7D` | `#55503A` | `#6B4448` | `#6E4636` | `#684B38` | `#3A6168` |
| --ng-primary | `#3DD680` | `#8FB4FF` | `#FFC20E` | `#E8AE32` | `#F58A24` | `#E0A030` | `#FF7A63` |
| --ng-on-primary | `#04210F` | `#0B1640` | `#1D1D20` | `#2C0813` | `#2A1000` | `#2B1608` | `#2A0A05` |
| --ng-accent | `#FFC933` | `#F4F1E8` | `#D91F26` | `#E4702A` | `#6DBA3F` | `#2D4F94` | `#46B982` |
| --ng-on-accent | `#2A1A00` | `#0F1B4A` | `#FFFFFF` | `#1F0A00` | `#0F2A06` | `#FFFFFF` | `#04210F` |
| --ng-good | `#0E7A3B` | `#0E6B52` | `#0E6B3A` | `#0E6B3A` | `#2C6E12` | `#1F6B2E` | `#0E6F47` |
| --ng-bad | `#B3261E` | `#B3261E` | `#B3161E` | `#B3261E` | `#B3261E` | `#A82018` | `#B3261E` |
| --ng-focus | `#FFD84D` | `#FFD84D` | `#FFFFFF` | `#FFE082` | `#F7D348` | `#FFD87A` | `#FFE082` |
| --ng-stripe-1 | `#0E7A3B` | `#1D3A9E` | `#FFC20E` | `#E8AE32` | `#D63A1F` | `#B4532A` | `#FF7A63` |
| --ng-stripe-2 | `#FFFFFF` | `#F4F1E8` | `#1D1D20` | `#8C1D3D` | `#F58A24` | `#E0A030` | `#46B982` |
| --ng-stripe-3 | `#FFC933` | `#6F93E8` | `#D91F26` | `#E4702A` | `#F7D348` | `#2D4F94` | `#F4FFFB` |


Token meaning: `ink`/`ink-2` = text on `bg`; `ink-s`/`ink-s-2` = text on `surface` cards, modals and inputs; `primary`+`on-primary` = main button; `accent`+`on-accent` = secondary highlight, chips, step numbers; `good`/`bad` = success/error text on cards; `focus` = focus ring; `stripe-1..3` = aso-oke band colours.

Avoid: a major political party's colour pairing as the dominant theme. Naija Green is deliberately used with deep forest green, gold and cream, not as a flat green-white-green block. The results screen uses fixed Aso-oke Gold colours regardless of theme.

### 2.1 Contrast (WCAG 2.1, computed by `node packages/core/assets/tools/contrast-check.mjs`)
All pairs pass; interactive and body text need 4.5:1, non-text UI (button edge, focus ring) needs 3:1. The checker exits 1 on any failure; run it after editing `palettes.json`, then regenerate the theme blocks in `tokens.css` (they are a literal transcription of `palettes.json`).

| Pair (foreground on background) | Need | Naija Green | Adire Indigo | Danfo Yellow | Aso-oke Gold | Market Spice | Northern Earth | Creek & Coral |
|---|---|---|---|---|---|---|---|---|
| Body text on background (`ink` on `bg`) | 4.5:1 | 12.32 | 13.64 | 16.82 | 13.77 | 10.60 | 10.31 | 10.65 |
| Body text on gradient end (`ink` on `bg2`) | 4.5:1 | 15.83 | 16.21 | 13.89 | 16.58 | 14.46 | 13.93 | 15.05 |
| Secondary text on background (`ink2` on `bg`) | 4.5:1 | 8.84 | 9.08 | 11.17 | 9.61 | 7.66 | 7.43 | 7.59 |
| Secondary text, gradient end (`ink2` on `bg2`) | 4.5:1 | 11.36 | 10.79 | 9.23 | 11.57 | 10.44 | 10.04 | 10.73 |
| Text on card/modal (`inkS` on `surface`) | 4.5:1 | 14.58 | 14.57 | 15.36 | 15.83 | 15.15 | 14.18 | 13.09 |
| Text on inset surface (`inkS` on `surface2`) | 4.5:1 | 12.88 | 12.70 | 13.03 | 13.24 | 12.44 | 11.35 | 11.05 |
| Secondary text on card (`inkS2` on `surface`) | 4.5:1 | 7.22 | 7.01 | 7.39 | 7.50 | 7.28 | 6.56 | 6.36 |
| Secondary text on inset (`inkS2` on `surface2`) | 4.5:1 | 6.38 | 6.11 | 6.27 | 6.27 | 5.98 | 5.25 | 5.37 |
| Primary button label (`onPrimary` on `primary`) | 4.5:1 | 9.05 | 8.43 | 10.39 | 9.15 | 7.29 | 7.57 | 7.18 |
| Accent button/chip label (`onAccent` on `accent`) | 4.5:1 | 10.96 | 14.57 | 5.03 | 6.04 | 6.46 | 7.90 | 6.93 |
| Success text on card (`good` on `surface`) | 4.5:1 | 5.12 | 5.73 | 6.03 | 6.00 | 5.64 | 5.44 | 5.80 |
| Error text on card (`bad` on `surface`) | 4.5:1 | 6.16 | 5.79 | 6.29 | 5.94 | 5.87 | 6.03 | 6.11 |
| Primary button edge vs bg (non-text) (`primary` on `bg`) | 3:1 | 6.53 | 7.44 | 10.39 | 7.60 | 4.80 | 5.47 | 4.17 |
| Focus ring vs bg (non-text) (`focus` on `bg`) | 3:1 | 8.91 | 11.13 | 16.82 | 11.71 | 8.07 | 9.10 | 8.24 |
| Focus ring inner band vs card (non-text) (`bg` on `surface`) | 3:1 | 11.61 | 13.64 | 15.36 | 13.77 | 10.60 | 10.31 | 9.96 |


The minimum text ratio in the whole table is 5.03:1 (accent label in Danfo Yellow); the minimum in the body text pairs is 10.3:1.

### 2.2 Colour-blind-safe rules
1. **Never encode meaning by colour alone.** Every state also has a shape, icon, text or position: correct/wrong = check or alert icon + word; difficulty = word + 1/2/3 pips + tick on the chosen one; selected tab/seg = filled + tick; turn indicator = avatar ring + label; card suits = shape + number; Ludo colours = colour + a distinct seed shape (circle, square, triangle, diamond) + a letter on the home base; dice pips = high-contrast dots, count readable without colour.
2. Do not pair red and green as the only difference. `good` and `bad` use different icons (check / triangle with exclamation).
3. Test in a deuteranopia and a greyscale filter before sign-off; pieces must remain distinguishable in greyscale.
4. Minimum 3:1 between a piece and the square it sits on, and between adjacent teams' pieces.

## 3. Type
Two self-hosted OFL fonts, subset to Basic Latin, Latin-1, Latin Extended-A, key Latin Extended-B and Extended Additional letters (ẹ ọ ṣ ị ɓ ɗ ƙ ŋ ń etc.), combining tone marks, punctuation and the naira sign.

| Role | Font | Notes |
|---|---|---|
| Display (`--ng-font-display`) | **Bungee** Regular, 11 KB woff2, `assets/fonts/bungee-subset.woff2` | Chunky signage lettering (David Jonathan Ross, OFL). Chosen for the bold, sign-painted danfo-and-shopfront feel, sized for short UI headings, scores, buttons on boards. **Use ALL CAPS and 1 to 3 words.** Caveat: Bungee has no `ɓ ɗ ƙ` (Hausa hooked letters); the stack falls back to Nunito for those glyphs, which is fine in a short label |
| UI (`--ng-font-ui`) | **Nunito** variable 400 to 800, 40 KB woff2, `assets/fonts/nunito-subset.woff2` | Rounded, very legible at 14 px, warm. Full Yoruba and Igbo coverage in the subset. Missing `ƙ Ƙ ǹ`: falls back to the system font |

Total fonts 51.5 KB (limit about 60 KB). `font-display: swap` is set. The developer should `<link rel="preload" as="font" type="font/woff2" crossorigin>` the UI font only.

Type scale (tokens): `--ng-fs-xs` 12 px, `sm` 14, `md` 16 (body), `lg` 18, `xl` 22, `2xl` clamp 24 to 30, `3xl` clamp 28 to 40, `display` clamp 32 to 56. Line heights: `--ng-lh-tight` 1.1 (display), `--ng-lh-body` 1.45. Body copy 16 px minimum; labels never below 12 px and then bold + uppercase.

## 4. Shape, depth, space, motion
- **Radii:** `--ng-r-xs` 6, `sm` 10, `md` 14 (buttons, inputs), `lg` 20 (cards, HUD), `xl` 28 (modals, banners), `pill` 999.
- **Shadows:** `--ng-sh-1` (hairline), `sh-2` (cards), `sh-3` (toasts, banners), `sh-4` (modals), `--ng-sh-btn` (a hard 4 px "pressed key" edge for buttons; flattens on `:active`).
- **Spacing (4 px grid):** `--ng-s-1..8` = 4, 8, 12, 16, 24, 32, 48, 64.
- **Tap targets:** `--ng-tap` 44 px minimum for every button, tab, seg option (seg options are 56 px). Visual affordance: filled surface or 2 px outline, 4 px bottom edge on buttons.
- **Focus ring:** 3 px `--ng-focus` outline + 2 px inner `--ng-bg` band (3:1 on both dark and light surfaces). Never remove it.
- **Motion:** `--ng-t-fast` 120 ms (press), `base` 200 ms (fades), `slow` 360 ms (springy pop-ins), `celebrate` 1100 ms. Easing `--ng-ease` (decelerate) and `--ng-ease-spring` (overshoot). **Only `transform` and `opacity` are animated** (progress uses a translated full-width fill, never `width`). `prefers-reduced-motion` collapses durations to 1 ms and hides confetti and stripe sweeps.
- **Safe areas:** `.ng-screen` pads with `env(safe-area-inset-*)`.

## 5. Pattern library
Six original, tileable, single-colour SVGs in `packages/core/assets/patterns/` (each under 1 KB). They work as **CSS masks** so any theme can tint them (`--ng-pat-color`, opacity `--ng-pat-op`, tile size `--ng-pat-size`). Open `patterns-preview.html` to see each in all seven themes.

| File | Class | Reference | Tile | Use for |
|---|---|---|---|---|
| `adire.svg` | `.ng-pat--adire` | Yoruba resist-dye: concentric rings, dot clusters, dash accents | 96 | menu and Ayo backgrounds, Ludo safe squares |
| `aso-oke.svg` | `.ng-pat--asooke` | woven strip bands, weft dashes | 64x32 | card backs, borders, table edges |
| `akwete.svg` | `.ng-pat--akwete` | Igbo woven diamonds and zigzag corners | 96 | rewards, Whot card backs, headers |
| `uli.svg` | `.ng-pat--uli` | flowing uli-inspired lines, leaves, dots (abstract, no ceremonial composition) | 128 | subtle screen backgrounds |
| `arewa.svg` | `.ng-pat--arewa` | Zaria/Kano wall-relief star-and-square geometry | 96 | Draughts frame, northern levels |
| `ankara.svg` | `.ng-pat--ankara` | bold wax-print repeat: ringed bloom, petals, quarter fans | 120 | celebration and results backdrops |

Usage: `<section class="ng-pat ng-pat--adire" style="--ng-pat-color:var(--ng-ink);--ng-pat-op:.12">`. For a card back use `.ng-pat--asooke` over `--ng-primary` with the `.ng-stripe` band. Keep pattern opacity <= .18 behind text (text must still meet contrast on the base colour; the textures are decoration only). Do not mix more than two patterns per screen. None of these reproduce a specific artist's design, kente, nsibidi or masquerade imagery.

## 6. Components and class reference
Include in the game's `index.html` (or import in the shell): `import '@naija/core/styles/tokens.css'; import '@naija/core/styles/skin.css';`. Fonts and pattern URLs are relative to the CSS file (`../../assets/...`), so Vite resolves and hashes them.

State classes are `is-*`. Add theme class on the root. Root wrapper: `<body class="ng-app">`.

**Layout and text**
- `.ng-app` root: background gradient (`bg` to `bg-2`), UI font, `100dvh`.
- `.ng-screen` centred full-height column, max width `--ng-maxw` (520 px), safe-area padding. One per screen (menu, game, results).
- `.ng-h` display heading (Bungee caps); modifiers `.ng-h--display` (hero), `.ng-h--sm`.
- `.ng-muted` secondary text colour (`ink-2`, or `ink-s-2` inside `.ng-card`).
- `.ng-sr` visually hidden, screen-reader text.
- `.ng-card` light surface panel. `.ng-chip` small accent label/badge.
- `.ng-stripe` 10 px aso-oke stripe divider from the theme stripe tokens.
- `.ng-pat` + `.ng-pat--adire|asooke|akwete|uli|arewa|ankara` pattern overlay (see section 5).

**Buttons** (`<button class="ng-btn ...">`, min 44 px, hard bottom edge, press-down, focus ring)
- Variants: `.ng-btn--primary` (default look), `.ng-btn--secondary` (light surface), `.ng-btn--accent`, `.ng-btn--ghost` (outlined). Sizes: `.ng-btn--lg` (56 px), `.ng-btn--block` (full width), `.ng-btn--icon` (44 px round, icon only; always give `aria-label`).
- Disabled: `disabled` or `aria-disabled="true"` (55% opacity, no edge, not-allowed cursor; do not rely on opacity alone: also change the label, e.g. "Locked").
- Icons inside: `<svg class="ng-icon"><use href="#ng-play"/></svg>`. Toggle buttons use `aria-pressed` with two icons inside: `.ng-icon--on` and `.ng-icon--off` (only one shows).

**Modal, pause, how-to dialog**
- `.ng-modal` fixed backdrop (toggle `.is-open`; visibility is delayed so fades work). Children: `.ng-modal__panel` (`role="dialog" aria-modal="true" tabindex="-1"`; aso-oke stripe top band), `.ng-modal__title`, `.ng-modal__body`, `.ng-modal__actions` (stacked on phones, row on >= 600 px; put the primary action first in the DOM), `.ng-modal__close` (icon button, top right).
- `.ng-modal--pause` centres the title for the pause screen. Trap focus in the panel, return focus on close, Esc closes.

**Toast**
- `.ng-toast-host` (fixed, top, `aria-live="polite"`) containing `.ng-toast` with variants `.ng-toast--good` and `.ng-toast--bad`; icon `.ng-toast__icon` (use `#ng-check` or `#ng-alert`); add `.is-out` to leave, then remove the node on `animationend`. Always includes text.

**HUD**
- `.ng-hud` top bar with a woven stripe underline; children `.ng-hud__item` containing `.ng-hud__label` + `.ng-hud__value` (Bungee, tabular numerals); `.ng-hud__spacer` pushes items right; add `.ng-hud__pop` to a value to pulse on change. Pause, sound buttons go inside as `.ng-btn--ghost.ng-btn--icon`.

**Menu screen**
- `.ng-screen.ng-menu` with `.ng-menu__logo` (the lockup `<img>`), `.ng-menu__tag` (a Pidgin tagline), `.ng-menu__list` (`<ul>` of buttons, max 320 px), `.ng-menu__persona` + `.ng-avatar` (coach bubble with avatar), `.ng-menu__footer` (sound/music/settings icon buttons). Add `.ng-pat.ng-pat--adire` (or the game's pattern) to the screen for texture.

**How to play**
- `.ng-screen.ng-howto`, `.ng-howto__steps` (`<ol>`), `.ng-howto__step` (auto-numbered gold badge), optional `.ng-howto__art` (an SVG diagram, <= 160 px tall). Keep each step to one sentence; put it in `t()`.

**Difficulty picker (segmented, never colour-only)**
- `<fieldset class="ng-seg" role="radiogroup">` with three `<label><input type="radio" name="difficulty"><span class="ng-seg__opt"><span class="ng-seg__txt">Easy</span><span class="ng-pips" style="--n:1"></span></span></label>`. Easy = 1 pip, Medium = 2, Hard = 3. The checked option is filled with the primary colour **and** shows a tick before the word. Arrow keys work natively with the radios. The same component serves any 2 to 4 option choice (set `--n` or omit pips).

**Progress (aso-oke stripe)**
- `.ng-progress` (+ `.ng-progress--thin`) with a single child `.ng-progress__fill`; set the value as `--ng-p: 0..1` on the `.ng-progress` element. `role="progressbar"` with `aria-valuenow`. The woven stripe is never squashed because the fill slides rather than scales.

**Loader**
- `.ng-loader` (fixed, full screen, z 90) containing `.ng-loader__logo` (img), `.ng-progress`, and optionally `.ng-loader__shuttle` (four bobbing loom bars, `<i></i>` x 4). Add `.is-done` to fade out, then remove from DOM.

**Results screen (aso-oke gold celebration)**
- `.ng-screen.ng-results` (add `.ng-results--lose` for the gentler no-gold-title variant) containing `.ng-results__banner` (wine banner framed by woven bands) with `.ng-results__title` (slams in), `.ng-results__sub` (e.g. "Ẹ kú iṣẹ́!" with copy from the persona or voice script), `.ng-results__stars` of three `<svg class="ng-star [is-on]" viewBox="0 0 24 24"><use href="#ng-star"/></svg>` (filled + outlined so earned vs unearned is shape-readable); `.ng-results__stats` list of `.ng-stat` (`.ng-stat__value`, `.ng-stat__label`); `.ng-results__actions` (Play again, Home).
- Celebration layers (decorative, `aria-hidden="true"`): `.ng-confetti` with 12 `<i>` gele-ribbon strips falling once; `.ng-sweep` with 3 `<i>` aso-oke stripes sweeping across. Both are hidden under `prefers-reduced-motion`.

**CPU persona**
- `.ng-avatar` (48 px round avatar with gold ring). `.ng-banter` pill bubble (avatar + one short line) with `.is-out` to dismiss; place near the persona's seat.

**Icons** (sprite `packages/core/assets/icons/icons.svg`, inline it once into the page, then `<use href="#ng-name">`; individual files `icons/<name>.svg` also exist): `play, pause, sound-on, sound-off, music-on, music-off, settings, home, replay, star, coin, trophy, hint, close, back, check, alert`. All fill with `currentColor`. `coin` is a ring token with an N and double bars, **inspired by the naira sign, clearly a game token and never real money**. Off icons differ by shape (X, slash), not colour.

## 7. Logo
`packages/core/assets/logo/`: `logo-lockup.svg` (stacked NAIJA over GAMES ribbon, 360x170), `logo-horizontal.svg` (die emblem + words), `logo-mark.svg` (emblem only, 128): a Naija-green die with five **adire-ring pips** in gold, wordmark set in Bungee outlines (OFL allows embedding converted outlines) with a woven aso-oke stripe. Original, no brand reference. **Placeholder**: a professional identity is a human task (HUMAN_ASSETS.md). Minimum sizes: lockup 120 px wide, mark 24 px.

## 8. CPU persona sheet
Eight avatars (128x128 viewBox, shape-built, rounded to ~24 px by the sheet or `border-radius:50%` by `.ng-avatar`): Mama Nkechi (Igbo, orange gele), Baba Ade (Yoruba, fila and glasses), Malam Sani (Hausa-Fulani, kufi), Tari (Ijaw, braids and headphones), Efe (Urhobo, danfo-yellow, singing), Aisha (Hausa, hijab and glasses), Chidi (Igbo, keeper jersey numbered 1), Funmi (Yoruba, cornrow bun and green blazer). Skin tones run `#3B2314` to `#A8744C`. See `PERSONAS.md` for regions, play styles and 8 banter lines each (EN + Pidgin). Always sit the avatar on a coloured square (never transparent), face forward, dignified expression. Never recolour skin tones to a team colour.

## 9. SFX family design (instrument voices)
Implemented in the second pass as Web Audio presets: shared voices in `packages/core/src/audio/instruments.ts`, mapped events in `core-sfx.ts`; games add specifics in `games/<slug>/src/audio/sfx.ts`. **No generic blip, coin or whoosh presets.**

Global rules: master chain = voice gain -> `DynamicsCompressor` (threshold -12 dB, ratio 4) -> master gain 0.5. Every voice starts with a 2 to 5 ms linear attack and ends with an `exponentialRampToValueAtTime(0.0001)` release so nothing clicks. SFX < 300 ms; fanfares < 1.5 s. Peak <= -6 dBFS. Provide `soft` (gain x0.5, plus low-pass at 5 kHz, for quiet mode) and `full` mixes. Randomise pitch by +/-2% and gain by +/-1 dB per trigger so repeats do not machine-gun. All noise comes from one pre-generated 1 s white-noise buffer (reuse the buffer to keep the GC quiet).

| Voice | Instrument reference | Recipe |
|---|---|---|
| **Talking drum** (gangan / dundun) | Yoruba pressure drum, speaks via pitch bend | Body: sine osc, `frequency` exp-ramps from `f0` to `f1` over 100 to 160 ms; second triangle osc at 2x pitch, gain 0.25; stick attack: 12 ms white-noise burst through band-pass 1.2 kHz Q 1, gain 0.3. Env: attack 3 ms, decay 120 to 220 ms. **Up glide** 180 -> 300 Hz ("your turn", combo). **Down glide** 300 -> 150 Hz ("no"). **Squeeze** (3-step) 160 -> 240 -> 200 Hz. **Fill** = 4 hits 80 ms apart rising 150, 180, 220, 300 Hz |
| **Agogo** | double iron bell, Yoruba/Igbo | Two FM bells struck 60 ms apart. Carrier sine `f1` = 880 Hz, second `f2` = 1.5x f1 (a fifth; use 4/3 for a fourth). Modulator sine at 1.41x carrier, index decaying 3 -> 0.2 over 120 ms. High-pass 400 Hz. Env: attack 2 ms, decay 140 to 180 ms. **High** variant +1 octave and 110 ms (coin) |
| **Ogene** | Igbo iron gong-bell | Carrier sine 520 Hz, modulator at 2.76x, index 4 -> 0.5 over 600 ms; extra partial at 2.0x gain 0.3; low-pass 3 kHz. Env: attack 3 ms, decay 500 to 900 ms (only in fanfare-class sounds, <= 1.2 s) |
| **Shekere** | beaded gourd rattle | 1 s noise buffer -> high-pass 3 kHz -> band-pass 6 kHz Q 2. Burst env: attack 3 ms, decay 22 ms. **Swing pattern** 6 bursts at gaps 40, 65, 40, 65, 40 ms (long-short swing), gain ramp 0.5 -> 1.0 -> 0.6. **Tick** = one burst 30 ms at 7 kHz |
| **Udu** | Igbo clay-pot drum, "bloop" | Sine `200 -> 90 Hz` exp-ramp over 120 ms; second sine at 1.5x, gain 0.2 (pot ring); low-pass 400 Hz resonance 4. Env: attack 8 ms (soft), decay 220 ms |
| **Ekwe** | wooden slit drum | 6 ms noise burst through two band-passes: 620 Hz Q 12 (gain 1) and 1180 Hz Q 10 (gain 0.5), plus a 310 Hz sine thump with 40 ms decay. Total about 90 ms. Variants: tap = base; piece move = f x1.22 and +30 ms; card place = f x0.77 plus extra thump |
| **Goje / kakaki fanfare** | Hausa fiddle and long trumpet | Two sawtooth oscillators detuned +/-7 cents, vibrato LFO 5.5 Hz depth 6 cents, band-pass formant 1.4 kHz Q 3 (reedy goje) with low-pass sweeping 800 -> 3200 -> 1200 Hz (kakaki swell). Phrase on a Hausa-flavoured pentatonic: D4 F4 G4 A4 D5 at 120, 120, 120, 120 and 500 ms (about 1.1 s); finish with a soft ogene strike |
| **Danfo horn** | Lagos "poom-poom" | Two square oscillators (349 Hz + 440 Hz), low-pass 1.8 kHz, attack 10 ms. Blast 1 = 140 ms, gap 60 ms, blast 2 = same pitches x0.89 for 160 ms |
| **Crowd** | stadium cheer and whistle (no vuvuzela) | Noise -> three parallel band-passes (500 Hz, 1.5 kHz, 2.8 kHz; gains 1, 0.7, 0.4), amplitude LFO 8 Hz depth 0.3, swell attack 150 ms, release 700 ms (total about 1.2 s). **Whistle**: sine 2.8 kHz with 40 Hz tremolo, 250 ms |

Event mapping (shared preset names, in `core-sfx.ts`):

| Event | Instrument voice | Preset name | Duration |
|---|---|---|---|
| tap (any button) | Ekwe, base | `ng.tap` | 90 ms |
| menu select / confirm | Agogo, single bell high | `ng.menu` | 130 ms |
| success / correct answer | Agogo, double bell rising fifth | `ng.success` | 220 ms |
| fail / wrong / illegal move | Talking drum down glide + ekwe low double click | `ng.fail` | 260 ms |
| coin / reward pickup | Agogo, high octave, short | `ng.coin` | 110 ms |
| card place / card draw | Ekwe card variant; deal = shekere short swing | `ng.card`, `ng.deal` | 120 ms |
| dice shake then roll | Shekere swing (6 bursts) then ekwe thud on land | `ng.dice` | 280 ms |
| turn start ("your turn") | Talking drum up glide | `ng.turn` | 200 ms |
| piece placed / seed drop | Udu bloop (pitch +/-2 semitones per seed for runs) | `ng.drop` | 200 ms |
| win (fanfare) | Kakaki phrase + ogene strike + talking-drum fill | `ng.win` | 1.4 s |
| lose (gentle, not mocking) | Talking-drum 3-step down + low udu | `ng.lose` | 700 ms |
| unlock / trophy | Goje phrase (shorter) + agogo shimmer | `ng.unlock` | 1.0 s |
| timer tick (last 5 s) | Shekere tick, last tick pitched up | `ng.tick` | 30 ms |
| special / big card, boss moment | Ogene | `ng.special` | 500 ms |
| obstacle (Danfo Dash) | Danfo horn | `ng.horn` | 360 ms |
| goal / save (Penalty King) | Crowd cheer / whistle + talking-drum build-up | `ng.crowd`, `ng.whistle` | 1.2 s / 250 ms |

### 9.1 As implemented (supersedes the table above where different)
Code: `packages/core/src/audio/instruments.ts` (voices), `core-sfx.ts` (event cues, `softSfx()`), `instruments.test.ts` (offline-render peak, duration and coverage checks; run `SFX_REPORT=1 npx vitest run packages/core/src/audio/instruments.test.ts` to print peak levels per voice and cue).
- **Voice ids:** `talkingDrum` (up glide), `talkingDrumDown`, `talkingDrumSqueeze`, `agogo` (double bell), `agogoTing` (single bell), `ogene` (0.3 s strike), `ogeneRing` (0.65 s, fanfares), `shekere` (5-burst shake), `shekereShuffle`, `shekereTick`, `udu`, `ekwe`, `danfoHorn`, `crowd`, `whistle`, `fanfare` (kakaki-goje phrase), `fanfareShort`. Fanfare-class (<= 1.5 s): `fanfare`, `fanfareShort`, `ogeneRing`, `crowd`; all others <= 0.3 s.
- **Events** are the engine's names (`tap`, `select`, `win`...), not `ng.*`. `ng.menu` is `menu` (alias of `select`), `ng.deal` is `deal`, `ng.special` is `special`, `ng.horn` is `horn`, `ng.crowd`/`ng.whistle` are `crowd`/`whistle`; `build` is a talking-drum fill. Extras are cues in `coreSfx`, callable with `playSfx`.
- **Synth limits vs the design:** the engine has no filter on oscillators, so the kakaki "low-pass swell" is approximated with 1:1 FM brass plus a quiet vibrato sawtooth; the danfo horn mixes squares with a triangle an octave down to soften the buzz; the crowd's 8 Hz flutter is replaced by staggered noise layers. Ogene is split into a 0.3 s strike and a 0.65 s ring so SFX stay under 300 ms. Win = drum fill + fanfare + ogene ring, span 1.43 s.
- **Soft vs full mix:** the engine has no switch; full = `registerSfx(coreSfx)`, soft = `registerSfx(softSfx(coreSfx))` (every cue at 50%). Voices are capped at 0.6 in the engine; every voice and cue renders offline at peak <= 0.43 (full), well below clipping.

## 10. Do's and don'ts
**Do**
- Use Nigerian references specifically (adire, aso-oke, akwete, Arewa relief, danfo, keke, BRT, mama-put, gele) and rotate regions.
- Keep character art modern and dignified (Nollywood-comedy warmth); vary skin tone across the full dark-to-brown range, hair and headwear.
- Use shape + text + colour together; keep text >= 4.5:1; keep targets >= 44 px.
- Keep each game's art <= 800 KB and the font pair <= 60 KB.
- Use cosmetic, clearly fictional coins and note-shaped confetti.
**Don't**
- Don't use kente (Ghana), kora (Mande), pan-African savanna sunsets, safari animals, tribal-mask clip art, nsibidi glyphs, shrine or religious symbols, masquerade (egungun, mmanwu) regalia as decoration, or a party's colours as the dominant theme.
- Don't caricature (no exaggerated lips, no "villager" tropes), and don't tie any trait (stingy, trader, hustler) to a group.
- Don't copy or trace artists' textiles, brands, logos, card designs, music, or real people's faces; don't download art of unknown licence.
- Don't show real naira banknote designs or imply real money; no gambling visuals.
- Don't use generic blip/coin/whoosh sounds, text-to-speech, or a faked accent.
- Don't animate layout properties (width, top, left); transform and opacity only.

## 11. Self-check against the cultural guide
| Principle | Check |
|---|---|
| 1. Nigerian, not pan-African | Patterns are adire, aso-oke, akwete, uli, Arewa relief, ankara. Instruments are gangan, agogo, ogene, shekere, udu, ekwe, goje, kakaki. No kente, kora, safari or savanna. Pass |
| 2. Contemporary and urban, with roots | Danfo, market and Lagos palettes, modern avatars with headphones, hoodie, blazer, football kit, alongside gele, fila, kufi, aso-oke bands. Pass |
| 3. Whole country | Persona regions: Igbo (Enugu, Owerri), Yoruba (Ibadan, Lagos), Hausa-Fulani (Kano, Kaduna), Ijaw (Port Harcourt), Urhobo (Warri). Palettes cover Yoruba, Igbo, Hausa and South-South. Edo/Benin brass is reserved for trophies. Middle Belt (Tiv, Nupe) not yet represented: **gap to fill in a later Northern/Middle Belt pack** |
| 4. Celebrate, never mock | Banter humour is everyday (go-slow, pothole, food, lectures); lose sting is gentle; no ethnicity, religion, poverty or body jokes. Pass |
| 5. Original work only | Every SVG, pattern, icon, logo, avatar and token set is generated in this repo from shapes. Fonts are OFL. No traced or imported art. Pass |

Avoid-list check: no kente, no kora, no safari decoration, no masks, no masquerade regalia, no shrine or religious symbols, no nsibidi, no party colours as a dominant theme, no real banknotes, no real brands. Pass. Items for the human cultural reviewer: uli pattern abstraction, Arewa star motif, the fila and kufi drawings, the Yoruba/Igbo/Hausa words and the Pidgin lines (all `_review: true` flagged in `PERSONAS.md` and `VOICE_SCRIPT.md`).
