# Sabi Quiz: asset brief

Slug `sabi-quiz`. Palette: **Aso-oke Gold** (`theme-aso-oke`: wine `#4A1020`, gold `#E8AE32`, burnt orange `#E4702A`, cream `#FFF3DA`) for the UI, with an **Adire Indigo** stage wall (`#122055`) behind it. The scaffold's `gameConfig.theme` is `theme-naija-green`; the developer should set it to `theme-aso-oke` (section 12). Generator `scripts/gen-sabi-quiz-art.mjs`, art checker `scripts/check-sabi-quiz-art.mjs`, pack checker `scripts/check-sabi-quiz-pack.mjs`. Art lives in `games/sabi-quiz/assets/`.

## 1. Cultural concept
A **Lagos TV quiz night in a buka bar**: the game-show stage is a neighbourhood eatery turned studio. The wall is **adire-indigo** with a faint resist-dye ring-and-dot pattern; **gold spotlight beams** (the aso-oke gold lighting the guide asks for) fall from the top corners; **ankara-coloured bunting** and a string of **buka-bar pendant bulbs** hang across the top; the stage floor is wine with a woven **aso-oke band** and an **akwete diamond row**; two plastic stools stand dark in the corners and an "on air" lamp glows at the side (no text, no brand, no real show). The question card is a cream cloth card with a wine header and an aso-oke strip, a number medallion and akwete diamonds along the foot. Answer plates are cream "buka plates" with a rim line, each carrying a **sign-painted badge** (a circle, triangle, square or star with an outlined letter). Lifelines are cream rosettes with a gold rim and an adire dotted ring. The streak is a flame and a scalloped **gele-style rosette**. The padi poll panel is a wine board with aso-oke-striped bars. The duel podium is two aso-oke-banded blocks under a spotlight.

Regions and traditions: Yoruba (adire wall, aso-oke bands, gele rosettes, talking drum and agogo in the SFX), Igbo (akwete diamonds, ekwe, udu, ogene), Hausa (Aisha as hard rival; goje and kakaki flavour only in the fanfares; Kannywood and kalangu in the pack), South-South (Efik host Uncle Etim from Calabar; Ijaw, Urhobo and Edo questions in the pack), Middle Belt (Dung from Jos, Plateau, a first for the catalogue), with Nigerian Pidgin as the language of the show. Content spans every geopolitical zone: the question pack names states, foods, writers and musicians from the North-West, North-East, North-Central, South-West, South-East and South-South.

Original-work statement: the stage, card, plates, badges, lifeline icons, streak, poll and podium are new drawings from basic shapes. Nothing is traced from, or modelled on, any real TV quiz, brand, logo, set or contestant. The adire and akwete motifs are simple original geometry in the style of the traditions, not copies of any artist's cloth.

## 2. Legibility and colour-blind contract (360x640)
- **The four answers are shape + letter + colour, never colour alone.** A = red circle, B = indigo triangle, C = orange square, D = green star. The letter is a sign-painted stroke glyph with an ink outline and a cream core, so it reads on every fill and in greyscale (checked in `sabi-quiz-sheet1-grey.png`). Keyboard keys: A B C D or 1 2 3 4.
- **Answer text is ink `#1D1D20` on cream `#FFF3DA` (15.3:1)**; the question text is `--ng-ink-s` on the cream card (15.8:1 in Aso-oke Gold). The text never sits on the pattern or the coloured badge.
- **Result states each have an icon and a different outline, not just a tint:** correct = solid green frame plus a check disc; wrong = dashed red frame plus a warning triangle (note: it is a triangle, so keep the plate B badge and the wrong-state icon visually separate by position: badge left, state icon right); eliminated (50/50) = dark hatch, strike line and an X disc; picked = gold frame plus a pointer. Add a visible word through `aria-label` and a screen-reader line.
- **Plate height 56 px minimum** (art is 320x64); full-width on a 360 px screen (328 px wide). Lifelines are 48 px (>= 44 px tap). The buzzer is 72 px.
- **Timer**: a ring with 15 tick marks (one per second, a longer tick every 5 s), a gold arc that drains, **and the number in the centre**. The last 5 s switch the arc to orange with five shekere-bead dots and a warning triangle on top, and the ring pulses, so the warning is shape, motion and sound, not only colour.
- **Streak badge** is the number (x2, x3, x5) in a scalloped rosette with 8, 10 and 12 points, so the tier is readable by shape and number.
- **Poll bars** always show the letter badge under each bar; the percentage is printed by the game next to each bar.

## 3. Assets (all under `games/sabi-quiz/assets/`)
Sizes are the SVG viewBox in units. Total art 44 KB gzip including the question pack (budget 800 KB).

| Path | Size | Purpose | Cultural reference | Maker |
|---|---|---|---|---|
| `bg/stage-portrait.svg`, `bg/stage-landscape.svg` | 360x640, 640x360 (`cover`) | full-bleed quiz-night stage backdrop | adire wall, aso-oke floor band, akwete diamonds, ankara bunting, buka-bar bulbs, gold spotlights | in-repo |
| `ui/question-card.svg` | 340x190 | question card frame (text overlaid in the DOM, `100% 100%`) | cloth card, aso-oke strip, akwete diamonds, adire dots | in-repo |
| `plates/plate-a.svg` ... `plate-d.svg` | 320x64 | four answer plates with baked-in shape + letter badge | buka plate, sign-painted letters | in-repo |
| `plates/state-correct.svg`, `state-wrong.svg`, `state-eliminated.svg`, `state-picked.svg` | 320x64 | transparent overlays laid over a plate | n/a | in-repo |
| `timer/ring.svg` | 128x128 (viewBox -4 -4 128 128) | timer face and 15 tick marks | aso-oke gold and wine | in-repo |
| `timer/arc.svg`, `timer/arc-low.svg` | same | the draining arc (circle class `sq-arc`, `pathLength=100`); `arc-low` adds beads and a warning triangle | shekere beads | in-repo |
| `lifelines/ll-5050.svg`, `ll-skip.svg`, `ll-padi.svg`, `ll-used.svg` | 64x64 | three lifeline icons and the spent overlay | cream rosette, gold rim, adire ring | in-repo |
| `streak/flame.svg` | 64x80 | streak flame | n/a | in-repo |
| `streak/badge-2.svg`, `badge-3.svg`, `badge-5.svg` | 96x96 | multiplier badges (x2, x3, x5) | gele-style scalloped rosette | in-repo |
| `poll/panel.svg` | 300x214 | "ask your padi" panel: three padi heads, four empty tracks, A to D badges | aso-oke band | in-repo |
| `poll/bar-fill.svg` | 48x130 (`none`) | bar fill, vertical aso-oke stripes so `scaleY` never distorts them | aso-oke | in-repo |
| `duel/podium.svg` | 340x170 | two podiums with an empty avatar ring and a blank score plate each | aso-oke band, spotlight | in-repo |
| `duel/buzzer.svg`, `duel/vs.svg`, `duel/lead-marker.svg` | 96x96, 72x72, 40x40 | duel buzzer, VS medallion, "in the lead" star | wooden base, brass dome | in-repo |
| `icons/categories.svg` | 9 symbols, 48x48 | **one sprite**: `cat-nollywood`, `cat-afrobeats`, `cat-football`, `cat-history`, `cat-food`, `cat-general`, `cat-pidgin`, `cat-geography`, `cat-daily`. Strokes use `currentColor` | clapperboard, talking drum, ball, scroll, bowl, bulb, speech bubbles, map pin, calendar | in-repo |
| `fx/correct-burst.svg`, `wrong-ripple.svg`, `streak-burst.svg`, `lifeline-glow.svg`, `time-up.svg` | 200 or 160 | one-shot fx (scale and fade) | gele-ribbon burst; udu ripple; flame ring; agogo-style bell | in-repo |
| `icon/menu-mark.svg` | 128x128 | menu mark: gold rosette, wine disc, question mark | gele rosette | in-repo |
| `avatars/etim.svg`, `avatars/dung.svg` | 128x128 | **new** persona portraits (host, duel contestant). Chidi and Aisha use `packages/core/assets/avatars/` | section 9 | in-repo placeholder |
| `packs/sabi-core-en.json`, `packs/daily-seed.json` | 94 KB (16 KB gzip), 3 KB | 300 questions and the 10-question daily seed (section 5) | n/a | in-repo, **human fact-check pending** |
| `quiz-art.css` | n/a | `.sq-*` classes and keyframes (section 4) | n/a | in-repo |
| `thumb/thumb-512x512.svg`, `thumb-1024x500.svg` | 512x512, 1024x500 | **placeholder** hero art (stage, card and four plates; no text) | stage | in-repo placeholder, human `.webp` |
| `audio/music/quiz-menu-highlife.mp3`, `quiz-play-highlife.mp3`, `quiz-tense-highlife.mp3` | silent | music placeholders (section 7) | highlife | human composer |
| `audio/voice/vo-sq-*.mp3` (10), `audio/voice-manifest.json` | silent | voice placeholders (section 8) | Pidgin quiz host | human voice actors |
| `ship.json` | n/a | include, dynamic and keep lists | n/a | in-repo |
| `../src/audio/sfx.ts`, `sfx.test.ts`, `music.ts` | n/a | `quizSfx` cue map and tests; synth stand-in music (`menuMusic`, `playMusic`, `tenseMusic`) | section 6 | in-repo |

Not shipped (like Whot): thumbs, music and voice files stay out of `ship.json` until something loads them. The scaffold's `agogo.svg` is listed in `include` only so today's scaffold still builds; delete the file and the entry once the real UI replaces it (section 12).

## 4. Developer API (CSS and sprite)
Import once: `import '../assets/quiz-art.css'`. Inline `icons/categories.svg` once (`?raw`) and use `<svg class="sq-cat"><use href="#cat-football"/></svg>`; tint with `color`.
- Stage: `<div class="sq-stage">`. Card: `.sq-card` (+ `.is-enter`) with `.sq-card__n` for the question number. Plates: `<button class="sq-plate sq-plate--a" data-state="picked|correct|wrong|eliminated">` with the answer in `.sq-plate__t`.
- Timer: `.sq-ring` containing the inlined `arc.svg` (or `arc-low.svg` at <= 5 s) and `.sq-ring__n`; set `--sq-p` (0..1 remaining) once per second; add `.is-low` for the last 5 s.
- Lifelines: `.sq-ll.sq-ll--5050|--skip|--padi`, `.is-used` adds the spent overlay (also set `disabled` and `aria-label`).
- Streak: `.sq-streak` with `.sq-streak__flame` and `.sq-streak__badge--2|3|5`.
- Poll: `.sq-poll` with four `.sq-bar` children in A..D order; set `--sq-v` (0..1) on each. Print `NN%` beside the badges in the DOM.
- Duel: `.sq-podium` with a `.ng-avatar` positioned over each ring (centres at 21 percent and 79 percent of the width, 22 percent from the top), `.sq-vs`, `.sq-buzzer`, `.sq-lead`.
- Fx: `.sq-fx.sq-fx--correct|--wrong|--streak|--lifeline|--timeup`, remove on `animationend`.
- Motion: transform and opacity everywhere except the one `stroke-dashoffset` on the timer arc (a single circle, once per second). `prefers-reduced-motion` collapses all durations.

## 5. Question pack
Files: `packs/sabi-core-en.json` (300) and `packs/daily-seed.json` (10). Schema exactly as the developer asked:
`{ version, id, title, lang, questions: [{ id, category, difficulty, q, options: [4], answer, source, reviewed, tags? }] }`.

- **IDs** `sq-<cat>-<nnn>` (`nol afb fbl his fod gen pcm geo`). Categories (the eight the brief asks for): `nollywood`, `afrobeats` (music and instruments), `football`, `history`, `food`, `general`, `pidgin` (Pidgin and Nigerian languages), `geography` (states, capitals, landmarks). Map each to a sprite symbol `cat-<id>`.
- **Counts:** 38 nollywood, 38 afrobeats, 38 football, 37 history, 38 food, 37 general, 37 pidgin, 37 geography = 300. Difficulty 120 easy, 120 medium, 60 hard (40/40/20) in every category. Answer index: exactly 75 / 75 / 75 / 75, spread evenly within each difficulty, no run longer than 3.
- **`reviewed`** is `false` on all 300. **No question may ship live until a human fact-checker flips it.** `node scripts/check-sabi-quiz-pack.mjs --release` fails while any question is unreviewed; the default run only warns.
- **`tags`:** `pidgin` on the 5 questions written in Pidgin (all in the `pidgin` category); `native-review` on 15 questions that quote Yoruba, Igbo or Hausa words and need a native speaker.
- **Daily seed:** the schema has a fixed `questions` array, so `daily-seed.json` is a pack of 10 questions (4 easy, 4 medium, 2 hard, ramping upward, 8 categories) that are **byte-identical copies** of core questions (the checker enforces it, so one fact-check covers both; flip `reviewed` in both files). Only questions with no uncertainty flag were chosen. Alternative for the developer: pick 10 by date with the seeded RNG from the core pack and ignore this file.
- **Length caps (enforced):** question <= 140 characters, option <= 48 characters, four unique options, exactly one correct, the answer word never repeated in the question text.
- **Sources** name a verifiable public page (e.g. `Wikipedia: Nollywood`, `Encyclopaedia Britannica: Nigeria`). They are pointers for the fact-checker, not proof; the checker only requires a named source.
- **Content rules applied:** original wording written in-house, no trivia site or book copied; no current office-holders or champions; no civil-war, party, religion or ethnic-comparison questions; no gore, gambling or brand advertising; family-friendly; living people appear only for a stable credit (for example a film director). Distractors are plausible but unambiguous, and several real names are used only as distractors for a different person's work.
- Pidgin in the question text is limited to the 5 tagged items; everything else is English so `en` and `pcm` can share the pack. A future `sabi-core-pcm.json` can translate the host chrome only.
- Human review list: see the final report of the asset-designer and the `U:` notes in this brief's section 10; 58 questions are flagged for extra attention, and the reviewer should still check all 300.

## 6. SFX list: event to instrument to preset (`src/audio/sfx.ts`, `quizSfx`)
Register as `{ ...coreSfx, ...quizSfx }`. No generic blips. Every cue <= 300 ms except the four celebration cues. Spans are asserted in `sfx.test.ts`.

| Event | Instrument or sound | Preset | Span |
|---|---|---|---|
| New question appears | low ekwe knock + dry shekere tick | `questionIn` | 100 ms |
| Round or duel start | talking drum up + agogo ting a fourth up | `roundStart` | 280 ms |
| Each second of the clock | **ekwe wood click** | `secondTick` | 100 ms |
| Last 5 s, each second | shekere tick + high ekwe | `timerLow` | 110 ms |
| Final second | the same, pitched up | `timerLast` | 110 ms |
| Tap a plate | bright ekwe | `select` | 100 ms |
| Answer locked | two ekwe knocks, second lower | `lock` | 160 ms |
| **Correct** | **ogene strike + agogo double bell** | `correct` | 300 ms |
| **Wrong** | **falling talking drum + low udu** (gentle) | `wrong` | 290 ms |
| Time up | shekere shake + low falling drum | `timeUp` | 300 ms |
| Streak x2 / x3 | two / three rising agogo tings | `streak2`, `streak3` | 230 / 300 ms |
| Streak x5+ (celebration) | talking-drum fill + ogene ring + agogo | `streakBig` | 920 ms |
| Streak broken | one soft falling drum | `streakBreak` | 260 ms |
| Lifeline 50/50 | shekere shuffle + two ekwe clicks | `lifeline5050` | 260 ms |
| Lifeline Skip | talking-drum squeeze | `lifelineSkip` | 290 ms |
| Lifeline Ask your padi | three rising ekwe taps (votes) + ting | `lifelinePadi` | 280 ms |
| One poll bar rises | soft udu bloop + shekere tick (raise pitch 6 percent per bar) | `padiBar` | 270 ms |
| Spent lifeline tapped | two low ekwe clicks | `lifelineUsed` | 200 ms |
| Duel: you buzz | ekwe + talking drum up | `duelBuzz` | 260 ms |
| Duel: CPU buzzes | lower, quieter ekwe + drum | `duelCpuBuzz` | 260 ms |
| Duel: you take the lead | two rising agogo tings | `duelLead` | 230 ms |
| Host banter pops in | ekwe + agogo ting | `hostIn` | 210 ms |
| Score counts up | agogo ting | `scoreTick` | 160 ms |
| Round won (celebration) | drum fill + kakaki-goje fanfare + ogene ring | `roundWin` | 1.25 s |
| Round not won (celebration, gentle) | falling squeeze + low udu | `roundLose` | 570 ms |
| Daily challenge done (celebration) | fanfare + agogo shimmer | `dailyDone` | 810 ms |

Soft mix: `softSfx({ ...coreSfx, ...quizSfx })` (every cue at 50 percent).

## 7. Music brief (human composer; synth stand-ins in `src/audio/music.ts`)
Three loops, `.ogg` + `.mp3`, each <= 300 KB, seamless, -16 LUFS, no existing songs or artist sound-alikes (guide section 4: calm quiz bed plus a tense last-5-seconds variant).
| File | Style | Tempo | Length | Instruments and mood |
|---|---|---|---|---|
| `audio/music/quiz-menu-highlife.mp3` | soft highlife | 96 BPM | 45 s | warm clean guitar riff, shekere on the off-beats, light bass, a gentle agogo answer; inviting TV-theme warmth, not a brass fanfare |
| `audio/music/quiz-play-highlife.mp3` | calm quiz bed | 100 BPM | 60 s | the same guitar and shekere, thinner, nothing between 150 and 400 Hz that fights the udu and drum cues, no melody on the beat the answer SFX lands on; supports thinking, not distraction |
| `audio/music/quiz-tense-highlife.mp3` | tense variant for the last 5 seconds | 132 BPM | 8 s loop | the play bed doubled in speed, shekere on every step, rising agogo, muted guitar; crossfade from the play bed at 5 s left |
Duck music 6 dB for voice lines and cut it on the correct and wrong cues. Provide the creator, date and licence for CREDITS.

## 8. Voice lines (silent placeholders; Nigerian voice actors)
Speaker: **Uncle Etim** (host). Files `audio/voice/vo-<id>.mp3`, manifest `audio/voice-manifest.json`. Same rules as `VOICE_SCRIPT.md`; every Pidgin line is `_review`. Full table with directions in `VOICE_SCRIPT.md` ("Game-specific lines: Sabi Quiz"). Ids: `sq-start`, `sq-correct`, `sq-wrong`, `sq-streak`, `sq-padi`, `sq-last5`, `sq-daily`, `sq-duel`, `sq-win`, `sq-lose`. Shared lines also used: `oya`, `madalla`, `e-ku-ise`, `you-don-win`, `e-don-do`.

## 9. Personas

### Host: Uncle Etim (`etim`), new
Efik, Calabar, 40s. Warm, theatrical quiz host who loves a dramatic pause and always lets a wrong answer down gently. Skin `#5A3520`; short hair; ankara-print bow tie and a hand microphone; Aso-oke Gold with Creek & Coral accents. Chosen to bring the **Efik / Cross River** voice into the catalogue (there was none, `PERSONAS.md` proposed "Ekaette" for the same gap; Etim is a second Efik name, so Ekaette stays free for Sabi Words). Efik name and region: native confirmation needed (HUMAN_ASSETS). Host, not CPU: he never plays. Developer keys `persona.etim.1` to `8` (PERSONAS.md has the table). Animation cue: tilts the microphone; agogo ting.

### Duel contestants (Quiz Duel, one per difficulty)
| Difficulty | Contestant | Region | Why this one | Suggested accuracy and buzz time (developer tunes in `src/ai`) |
|---|---|---|---|---|
| Easy | **Chidi** (`chidi`) | Igbo, Owerri | exists, cheerful and overconfident, fast on the buzzer but loses focus | about 55 percent, 6 to 11 s |
| Medium | **Dung** (`dung`), new | Berom, Jos, Plateau (Middle Belt) | fills the Middle Belt gap listed in PERSONAS.md; a patient "wait and strike" player who answers late but accurately | about 72 percent, 8 to 12 s (late but sure) |
| Hard | **Aisha** (`aisha`) | Hausa, Kaduna | the guide names her quiz champion | about 88 percent, 3 to 6 s |
Regional spread of the duel roster plus host: Igbo, Middle Belt, Hausa, Efik. Together with the other games the catalogue now touches Yoruba x2, Hausa x2, Igbo x2, Ijaw, Urhobo, Efik and Berom.

### Quiz banter (key `sq.banter.<id>.<n>`; `_review: true` where marked; Yoruba, Igbo, Hausa words always need a native speaker)
**Uncle Etim** (host, 8): the same 8 as `persona.etim.*` in `PERSONAS.md`.

**Chidi** (quiz-specific, 6):
| # | en | pcm | flags |
|---|---|---|---|
| 1 | Football questions? Easy, I am the goalkeeper of facts! | Football question? Easy, I be goalkeeper for facts! | `_review` |
| 2 | My hand is quick on the buzzer, my friend! | My hand quick for buzzer o! | `_review` |
| 3 | Ah! That one slipped past my gloves. | Ah! That one pass my gloves. | |
| 4 | Correct! Save of the day! | Correct! Na top save! | `_review` |
| 5 | Ndo o, the next question is yours. | Ndo o, next question na your own. | Igbo `Ndo`: `_review` (native speaker) |
| 6 | No worry, in the second half I wake up. | No worry, for second half I go wake. | `_review` |

**Dung** (duel, 8): `persona.dung.1` to `8` in `PERSONAS.md`.

**Aisha** (quiz, 4 extra to her 8 in PERSONAS.md):
| # | en | pcm | flags |
|---|---|---|---|
| 9 | That one is on page 212, if you want to check. | Dat one dey page 212, if you wan check. | `_review` |
| 10 | Buzzer first, then think. Not me, I think first. | Buzzer first, then think? No be me, I dey think first. | `_review` |
| 11 | Good answer. I will not go easy next round. | Correct answer. Next round I no go gentle. | `_review` |
| 12 | Tough one! Even I had to think twice. | Hard one! Even me, I think am twice. | `_review` |

## 10. Make versus human
| Item | Made in repo | Needs a human |
|---|---|---|
| All SVG art, CSS, sprite, fx, ship.json | yes (44 KB gzip total) | optional final illustration of the stage, card and thumbs |
| SFX | yes (`quizSfx`, 27 cues) | musician listening check on a phone speaker |
| Questions | 300 written in-house | **fact-check of every question, flip `reviewed`**; native reviewers for the 15 `native-review` and 5 `pidgin` items |
| Music | synth stand-ins, silent mp3 placeholders | composer (3 loops, section 7) |
| Voice | silent placeholders and manifest | voice actors (10 lines, section 8) |
| Hero art | SVG placeholders at 512x512 and 1024x500 | illustrator for `.webp` |
| Persona art for Etim and Dung | shape-built SVG busts | illustrator (same 128 viewBox, 3 expressions); native confirmation of names and regions |

Uncertainty flags (`U:`) are listed in the asset-designer's final report with question ids; they are also the first things for the fact-checker to look at.

## 11. Self-check against the guide
| Principle | Check |
|---|---|
| 1. Nigerian, not pan-African | adire wall, aso-oke bands, akwete diamonds, ankara bunting, danfo and buka-bar references; instruments are ekwe, agogo, ogene, udu, talking drum, shekere, kakaki and goje. No kente, kora, safari or savanna. Pass |
| 2. Contemporary and urban, with roots | a buka-bar TV studio with pendant bulbs, plastic stools and a studio lamp, beside gele rosettes and textile bands. Pass |
| 3. Whole country | host Efik (Calabar), duel Igbo, Berom (Jos), Hausa; questions cover all zones and 12+ named states; foods from Yoruba, Igbo, Hausa, Efik, Urhobo and Ijebu cooking. Middle Belt now has a persona. Pass |
| 4. Celebrate, never mock | wrong answers sound and look gentle (falling drum, dashed frame, "nearly" lines); no jokes about ethnicity, religion, accent, poverty or body type; no civil-war or politics questions. Pass |
| 5. Original work only | all art generated from shapes in-repo; every question worded in-house; no copied trivia, show format, brand or person likeness. Pass |
Avoid list: no kente, kora, safari, masks, masquerade regalia, shrine or religious symbols, nsibidi (also removed from a pack distractor), party colours, real banknotes, real brands. Pass. Gambling check: no coins, stakes or prizes; lifelines are free and the streak multiplier is a score multiplier only. Note for the compliance owner: the "buzzer" is a game-show prop, not a betting device.

## 12. Requests to the senior-developer
1. `gameConfig.theme` to `theme-aso-oke`; import `quiz-art.css`; read `./assets/ship.json` (the build checks it).
2. Use `src/audio/sfx.ts` (`quizSfx`, tests included) and `src/audio/music.ts`; delete the scaffold `src/sfx.ts` and its imports in `main.ts` and `app.ts`, and delete `assets/agogo.svg` plus its `include` entry when the UI is replaced.
3. Load packs with `fetch('./assets/packs/sabi-core-en.json')`; the `dynamic` entry `packs/*.json` requires the literal text `packs/` in the built code. Refuse to start a round on a question with `reviewed: false` outside dev mode (a `?unreviewed=1` flag in dev is fine); respect the release rule in GAMES.md.
4. Shuffling options is not needed: the answer index is already balanced, and shape + letter badges are tied to option position (A..D). Do not reorder options at run time unless you also remap the plate (the badge is part of the plate art).
5. 50/50 removes two wrong options (state `eliminated`); the padi poll should be weighted toward the right answer but still sometimes wrong (the GAMES.md rule).
6. Persona keys: add `persona.etim.1..8`, `persona.dung.1..8` (PERSONAS.md), `sq.banter.chidi.1..6`, `sq.banter.aisha.9..12`; the new avatars live in this game's `assets/avatars/` (core was not edited).
7. Keep CPU contestant tuning inside `src/ai` using the suggestions in section 9.
8. The question card art uses `100% 100%` and can stretch with long text; keep `.sq-card` to <= 140 characters of question text at 18 px (the pack enforces it).
