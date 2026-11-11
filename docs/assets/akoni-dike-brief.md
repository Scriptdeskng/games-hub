# Akọni & Dike: asset brief (Phase A0)

Slug `akoni-dike` (flagship), branch `game/akoni-dike`. Status: **A0 brief only**. No game art is produced in this phase beyond what a later phase needs; everything below is the contract for A1 to A3. Binding sources, in order: `docs/games/akoni-dike/ASSET_BIBLE.md`, `SCRIPT.md` (the 8 guardrails), `LEARNING.md`, `docs/assets/CULTURAL_GUIDE.md`, then `STYLE_GUIDE.md` (shared tokens, patterns, SFX family). Where this brief adds a design choice that no source states, it is tagged `[D]` and is **not** a historical claim.

## Parts of this brief

| Part | File                                                     | Covers                                                                                            |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1    | `docs/assets/akoni-dike-brief.md` (this file)            | cultural concept, three visual identities, palettes, frames, readability rules                    |
| 2    | `akoni-dike-brief/02-boards-kiriji.md`                   | reference boards: Moremi prologue (flagged) and Kiriji 1 to 6                                     |
| 3    | `akoni-dike-brief/03-boards-ekumeku.md`                  | reference boards: Ekumeku prologue and 1 to 6                                                     |
| 4    | `akoni-dike-brief/04-assets-and-atlas.md`                | every asset by path, pack layout and budgets, sprite atlas plan, UI, museum, learning UI          |
| 5    | `akoni-dike-brief/05-audio-music-voice.md`               | SFX map, new synth voices, music briefs, licensed-music note, bark script and diacritics registry |
| 6    | `akoni-dike-brief/06-qa-checklist-and-selfcheck.md`      | numbered anachronism and sensitivity QA checklist, self-check, "Needs historian" table            |
| 7    | `akoni-dike-brief/07-human-assets-and-open-questions.md` | human-made assets table, rows for the shared docs, open questions                                 |

Rows were also appended to `docs/assets/HUMAN_ASSETS.md` (rows 69 on), `PERSONAS.md` ("Added with Akọni & Dike") and `VOICE_SCRIPT.md` ("Game-specific lines: Akọni & Dike").

**Chapter count.** SCRIPT.md defines **14** playable units, not 15: Moremi prologue (flag `features.moremiPrologue`, default off), Kiriji 1 to 6, Ekumeku prologue, Ekumeku 1 to 6. This brief uses 14 boards. If a 15th unit exists in the source doc, tell the asset-designer.

**Source tags used everywhere.** `[SC]` SCRIPT.md, `[LE]` LEARNING.md, `[AB]` ASSET_BIBLE.md, `[CG]` CULTURAL_GUIDE.md, `[SG]` STYLE_GUIDE.md, `[D]` design choice, `[H-nn]` entry in the "Needs historian" table (part 6). Nothing may be drawn from memory of "how it looked"; if a detail is not in `[SC]`, `[LE]` or `[AB]` it is a `[D]` placeholder with an `[H-nn]` ticket.

## 1. Cultural concept

**A history lesson you play, framed by a modern Nigerian school trip.** A JSS class visits a museum (Kiriji war site and its markers with **Mr Adewale**; an Anioma heritage museum with **Mrs Okonkwo**) `[LE]`. The guide stops at an exhibit, says "Let me tell you what happened here", and the chapter plays as that story, in a top-down action-adventure where the player is one human against the game's levels and CPU forces. The museum frame is the only place modern items appear `[AB]`.

Two campaigns, two moods:

- **Kiriji, The Hills Remember (Yoruba, 1877 to 1893).** The Ekitiparapo confederacy and Ibadan fought for years; the story ends in the 1886 peace `[SC]`. Visual mood: indigo cloth, laterite earth, dry-season gold, rolling Ekiti hills, camps that become towns. It is open-field, drum-led and about **fear, courage and the harder choice of peace**. Ibadan's commanders are brave, capable rivals, never villains; the antagonist is overreach and endless war `[SC guardrail 2]`.
- **Ekumeku, The Forest Does Not Speak (Igbo, 1883 to 1914).** Scattered towns become one silent brotherhood; the codex states honestly that the Company won `[SC guardrail 7]`. Visual mood: forest green, uli ochre, night blue; stealth, ambush, signals, crowds. The opponent is "the Company" and its constabulary **as a system**, never an ethnic group `[SC guardrail 3]`.
- **Prologue: Moremi (legend, Ile-Ife; flagged, default off).** Ife-style calm, firelight, a single flute. Ugbo remembers Moremi as a traitor, so the client decides whether it ships `[SC open decision]`. The raiders are "the raffia raiders of the forest" and are never called Igbo `[SC guardrail 1, 2]`.

Regions and traditions drawn on: Yoruba (Ekiti and Ijesa hills, Ile-Ife, Imesi, aso-oke, adire, talking drums gángan and dùndún, agogo), Igbo (Anioma riverbank villages, akwete, uli, ogene, ekwe, udu), and, through the museum class, a deliberately mixed roster of modern students (part 3, museum frame boards). Contemporary layer (Principle 2): the school trip, tablets, lanyards and uniforms, kept inside the frame only.

**Hard limits restated for every artist.** Yoruba and Igbo are never enemies; no villain city or people; colonial forces carry no ethnic labels; no gore, trophies, skulls, blood, executions or torture; no shrines, ofo, mbari, masquerades, nsibidi, war charms; correct diacritics; no real flags, insignia, logos or colonial photographs in game `[SC]` `[AB]`.

## 2. Three visual identities

Each identity is a theme class in `games/akoni-dike/assets/themes/akd-themes.css` (built in A1 from the table below; same token names as `[SG]` section 2 so the shared `.ng-*` skin works unchanged): `theme-akd-prologue`, `theme-akd-kiriji`, `theme-akd-ekumeku`. Fonts stay the shared pair (Bungee display, Nunito UI, 55 KB); no third face is shipped.

### 2.1 UI palette tokens (`--ng-<token>`; values are `[D]` derived from the palette words in `[AB]`)

| Token                        | Prologue (Firelight orange, raffia gold, river night blue) | Kiriji (Adire indigo, laterite red, dry-season gold) | Ekumeku (Forest green, uli ochre, night blue) |
| ---------------------------- | ---------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| bg                           | `#101A3C` river night                                      | `#17235E` adire indigo                               | `#0F3B2A` forest green                        |
| bg-2                         | `#080F26`                                                  | `#0B1237`                                            | `#08241A`                                     |
| surface                      | `#F7E9CB` raffia cream                                     | `#F4ECD8` undyed cotton                              | `#F1EBD3`                                     |
| surface-2                    | `#EBD3A0`                                                  | `#E4D6B4`                                            | `#DDD3A8`                                     |
| ink / ink-2 (on bg)          | `#FFF3D9` / `#F2CF9A`                                      | `#F8F1DF` / `#C3CDF0`                                | `#F6F0DA` / `#BFDCC2`                         |
| ink-s / ink-s-2 (on surface) | `#24140A` / `#5C4122`                                      | `#121C4C` / `#454C78`                                | `#0A2A1B` / `#3F5A47`                         |
| primary / on-primary         | `#F4902F` firelight / `#2A1000`                            | `#D9A93A` dry-season gold / `#241600`                | `#D9A038` uli ochre / `#201300`               |
| accent / on-accent           | `#E6BE55` raffia gold / `#1F1500`                          | `#A8432A` laterite red / `#FFFFFF`                   | `#1F2F6B` night blue / `#F6F0DA`              |
| good / bad (on surface)      | `#1E6B38` / `#A8281E`                                      | `#1B6B3C` / `#A8281E`                                | `#1B6B3C` / `#A8281E`                         |
| focus                        | `#FFE08A`                                                  | `#FFD84D`                                            | `#FFD87A`                                     |
| stripe-1 / 2 / 3             | `#F4902F` / `#E6BE55` / `#3A5BA8`                          | `#2B45B0` / `#F4ECD8` / `#D9A93A`                    | `#D9A038` / `#F1EBD3` / `#8A5A1E`             |

Accent chips on `bg` in Kiriji (`#A8432A` on `#17235E` is 2.43:1) and Ekumeku (night blue on forest green is about 1:1) **must carry a 2 px `ink` outline** (ink on bg 12.96:1 and 10.95:1), so the chip edge is never colour alone. This rule is part of the skin override.

### 2.2 Contrast check (WCAG 2.1, computed with the same relative-luminance formula as `packages/core/assets/tools/contrast-check.mjs`; re-run that tool once `palettes.json` gains these three entries)

| Pair                                                                       | Need | Prologue | Kiriji | Ekumeku |
| -------------------------------------------------------------------------- | ---- | -------- | ------ | ------- |
| ink on bg                                                                  | 4.5  | 15.44    | 12.96  | 10.95   |
| ink on bg-2                                                                | 4.5  | 17.24    | 16.12  | 14.40   |
| ink-2 on bg                                                                | 4.5  | 11.47    | 9.25   | 8.47    |
| ink-2 on bg-2                                                              | 4.5  | 12.80    | 11.52  | 11.14   |
| ink-s on surface                                                           | 4.5  | 14.81    | 13.76  | 12.92   |
| ink-s on surface-2                                                         | 4.5  | 12.17    | 11.25  | 10.26   |
| ink-s-2 on surface                                                         | 4.5  | 7.82     | 6.97   | 6.35    |
| ink-s-2 on surface-2                                                       | 4.5  | 6.43     | 5.70   | 5.05    |
| on-primary on primary                                                      | 4.5  | 7.57     | 8.14   | 7.83    |
| on-accent on accent                                                        | 4.5  | 10.18    | 6.00   | 10.97   |
| good on surface                                                            | 4.5  | 5.43     | 5.55   | 5.46    |
| bad on surface                                                             | 4.5  | 5.85     | 5.97   | 5.88    |
| primary vs bg (non-text)                                                   | 3    | 7.19     | 6.73   | 5.38    |
| focus vs bg (non-text)                                                     | 3    | 13.18    | 10.55  | 9.14    |
| bg vs surface (focus inner band)                                           | 3    | 14.15    | 12.40  | 10.46   |
| Minimum body-text ratio is 5.05 (ink-s-2 on surface-2, Ekumeku). All pass. |

### 2.3 World (art) palette, for tiles and sprites (not UI text) `[D]`

| Campaign                                                                                                                                                                                                                                           | Ground and structures                                                                                      | Light and accents                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Prologue                                                                                                                                                                                                                                           | laterite wall `#A6502F`, thatch `#C9A96B`, palm-kernel torch light                                         | firelight `#F4902F`, raffia `#D6B25E`, river night `#101A3C`                         |
| Kiriji                                                                                                                                                                                                                                             | laterite `#9B4E32`, dry-season grass `#C9A24A`, hill green `#5E7A3A`, mud wall `#B07A52`, thatch `#C9A96B` | indigo cloth `#17235E`, dry gold `#D9A93A`; rival accent colour (`[D]`, section 2.5) |
| Ekumeku                                                                                                                                                                                                                                            | forest floor `#2A4A33`, red-earth wall `#8A3F2A`, yam-field green `#6C8F3E`, thatch `#B79A5E`              | night blue `#1F2F6B`, uli ochre `#D9A038`, lantern warm `#F2C46A`                    |
| Skin tones run `#3B2314` to `#A8744C` `[CG]`; no character is recoloured to a team colour. No party-colour pairing dominates: Ekumeku forest green is always paired with ochre, cream and night blue, never a flat green-white-green block `[CG]`. |

### 2.4 UI frame patterns (reuse `packages/core/assets/patterns/*.svg` as CSS masks; add only the 9-slice frames in part 4)

| Identity                                                                                                                         | Frame                                                                                                                    | Reference                                                  |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Prologue                                                                                                                         | simple adire rings (`.ng-pat--adire`) on a raffia-gold 3 px border, plain corners                                        | Yoruba resist-dye circles `[AB]`; calm, almost bare        |
| Kiriji                                                                                                                           | aso-oke stripe bands top and bottom (`.ng-stripe` from stripe tokens), adire motifs on **map borders** only              | Yoruba strip weaving `[AB]`                                |
| Ekumeku                                                                                                                          | uli line work for panel backgrounds (`.ng-pat--uli`, opacity <= .12), akwete diamonds on **borders** (`.ng-pat--akwete`) | Igbo wall and body line art, abstract; Igbo weaving `[AB]` |
| Never more than two patterns per screen `[SG]`. Uli stays decorative and abstract; no ceremonial composition, no nsibidi `[CG]`. |

### 2.5 Style references (described in words only; nothing is copied, traced or imitated)

- **Prologue.** Inspired by the _spirit_ of Ife naturalistic heads: calm, evenly modelled faces, restrained expression, a few fine parallel facial lines. The drawing is original and flat-vector; no museum object is traced and no head is a copy. A cultural reviewer confirms the faces read as dignified art, not as a sacred object `[H-01]`.
- **Kiriji and Ekumeku.** "Period photographs and museum objects (reference only)" `[AB]` means an illustrator may study them for clothing and posture with licence checked. **Rule: no photograph, scan or image of unknown licence is downloaded or placed in the repo; nothing is traced; no colonial photograph appears in game** `[AB]`. The asset-designer works from words in `[SC]` `[AB]` only.
- **Rival accent `[D]`.** Ibadan-side fighters are set apart by **one accent colour on sash and fila** (proposed `#2F8F83` teal) and **never by caricature, face, skin or body shape** `[AB]`. The teal is a readability choice, not a claim about real dress `[H-05]`. Gameplay identity never depends on it: every combatant also has a shape marker (2.6).

### 2.6 Readability and colour-blind rules for action play (360 x 640)

1. **Shape plus colour plus text/sound.** Allies show a **ring** under the feet; targets of the squad show a **corner-bracket**; enemies that can be pushed back show a **diamond** pip; the hero shows a **double keyline halo**. No team is told apart by colour only. Test in a deuteranopia and a greyscale filter `[SG 2.2]`.
2. **Overlays** (rings, cones, tells, order ring) use a double keyline (1 px `#111111` inside, 1 px `#FFFFFF` outside) so they hold 3:1 on every ground tile and at night.
3. **Parry tell** = contracting ring + exclamation glyph + audio cue (`tell`), never colour alone.
4. **Sight cones** have three shape states: idle (dashed edge), suspicious (zigzag edge), alert (solid edge with chevrons), each with a word-icon (eye, question mark, exclamation).
5. **Morale** is shown as a 5-tick bar with a three-glyph set (steady = full square, wavering = cracked square, breaking = open square); the enemy sprite itself changes pose (part 4, section 3.4).
6. **Tap targets >= 44 px** (HUD buttons are 56 to 64 px) with a filled disc and a 4 px bottom edge; joystick base is a visible ring `[SG 4]`.
7. **Smoke and night** never hide the hero: the hero keeps a keyline outline and a soft floor ring in Ekumeku 4 and 6 and Kiriji 4.
8. Text is DOM (`t('key')`), never baked into art, except outlined title lettering in placeholder panels. All motion is transform and opacity only; `prefers-reduced-motion` removes screen shake and flashes.

### 2.7 No-gore visual contract (applies to every sprite, fx and panel)

Hit = 80 ms flash-to-cream, 8 to 16 px knockback, 3-frame hit stop, a cream-gold ring spark (no red, no splatter). Defeat = **drop weapon, kneel with open hands, or run**. Heroes who are "down" kneel and catch their breath (no lying figures). Named rivals are always disarmed. No skulls, no bones, no severed anything, no head-taking and no slave-raiding imagery; those two histories get one codex sentence each, never pictured `[SC guardrail 5]`. Fire and smoke never touch a body sprite (see the Moremi duel, part 2, and Ekumeku 4, part 3).
