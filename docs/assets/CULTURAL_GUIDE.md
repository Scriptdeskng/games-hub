# Nigerian Cultural Asset Guide

Every visual, sound, word and animation in these games should feel like it comes from
Nigeria, not from a generic "African" template. This guide is the source of truth for the
asset-designer, and the QA reviewer checks against it. `STYLE_GUIDE.md` (palette values, type
scale, components) must be built from the choices here.

## 1. Principles
1. **Nigerian, not "pan-African".** Use specifically Nigerian references. Avoid savanna-and-
   sunset clichés, safari animals as decoration, tribal-mask clip art, kente (Ghanaian) or kora
   (Mande) as stand-ins for Nigeria.
2. **Contemporary and urban, with roots.** Today's Lagos, Abuja, Kano, Enugu and Port Harcourt
   (phones, BRT buses, danfos, malls, markets, Afrobeats), layered with heritage textiles,
   crafts and instruments.
3. **Represent the whole country.** Rotate references across Yoruba, Igbo, Hausa-Fulani and the
   South-South and Middle Belt (Edo, Ijaw, Efik/Ibibio, Tiv, Nupe and others). No single game
   should be all-Lagos or all one ethnic group, unless the game is about that place (e.g.
   Danfo Dash is Lagos).
4. **Celebrate, never mock.** Humour comes from shared everyday experience (go-slow traffic,
   NEPA taking light, the market haggle), never from ethnicity, religion, accent, poverty or
   body type.
5. **Original work only.** Draw inspiration from motifs and traditions, but never copy a
   specific artist's textile design, a photographed artwork, a brand, or a real person's likeness.

## 2. Visual language

### Colour palettes (the asset-designer turns these into exact tokens with contrast-checked pairs)
| Palette | Inspiration | Feel | Good for |
|---|---|---|---|
| **Naija Green** | the national green and white, deep forest green | proud, fresh | shared portal UI, Penalty King |
| **Adire Indigo** | Yoruba hand-dyed indigo cloth, deep blues with off-white resist patterns | calm, crafted | Ayo, Draughts, menus |
| **Danfo Yellow** | Lagos danfo yellow with black stripes, asphalt grey, signage red | loud, energetic | Danfo Dash, Snakes & Ladders |
| **Aso-oke Gold** | woven aso-oke and gele: gold, wine, burnt orange | festive, premium | Whot, results screens, rewards |
| **Market Spice** | pepper red, palm-oil orange, plantain yellow, ugu green | warm, appetising | Mama Put Match, Sabi Words food pack |
| **Northern Earth** | Kano dye pits, Zaria/Hausa architecture: terracotta, ochre, indigo | rich, earthy | Northern levels and packs |
| **Creek & Coral** | Niger Delta creeks and coral beads: teal, coral red, mangrove green | lively | South-South levels and packs |

Avoid using a major political party's colour combination as a dominant theme.

### Patterns and textures (draw as original SVG patterns inspired by these)
- **Adire** (Yoruba resist-dye): circles, dots, lines and folded-tie motifs, indigo on white.
- **Aso-oke** (Yoruba hand-woven strips): narrow striped bands, ideal for borders, card backs and progress bars.
- **Akwete** (Igbo weaving): geometric woven diamonds and zigzags.
- **Uli** (Igbo body and wall art): flowing line drawings, good for subtle backgrounds. Keep them
  decorative and abstract. Don't reproduce specific ceremonial compositions.
- **Hausa/Arewa architecture:** Zaria- and Kano-style raised geometric wall relief and arches,
  good for frames and northern level backgrounds.
- **Ankara wax-print energy:** bold repeat prints for celebratory screens (original patterns only).
- **Materials:** carved iroko or mahogany wood (Ayo board, Whot table), woven raffia, calabash,
  brass (Benin-inspired gleam for trophies), and market tarpaulin.
- **Avoid:** sacred or shrine symbols, specific masquerade (egungun, mmanwu) regalia as
  decoration, religious symbols of any faith, and nsibidi glyphs (their meanings and context
  are restricted, so don't use them as decoration).

### Places and objects (illustrate as original drawings)
Lagos: danfo, keke napep, okada, BRT bus, Third Mainland Bridge-style bridge silhouette, the
Lekki toll-gate *shape* (no logos), Balogun-style market stalls, mama-put canteen. Abuja: Zuma
Rock-style silhouette, wide roads. North: dye pits, a camel at a market, a city wall arch.
East: Ogbete-style market, palm trees, Igbo-Ukwu-inspired bronze shapes. South-South: creek
canoes, mangroves. Everyday items: generator ("I better pass my neighbour"), NEPA pole,
recharge-card stand, suya spot with smoke, Agege bread, a Gala-style snack (generic, no brand),
gele and agbada silhouettes, a football on a dusty pitch, the Whot deck on a plastic table.

### People and characters
- Diverse Nigerian characters with varied skin tones (a full range of dark and brown tones,
  never one), hair (cornrows, low cut, braids, gele, hijab, fila, kufi), ages and regions.
- Draw them modern and dignified, with the warmth of a Nollywood comedy, not a caricature.
- CPU personas (shared across games, with original names). Their personalities are individual
  and must **never** be ethnic stereotypes (no "stingy", "trader", "hustler" or similar tropes
  tied to a group):
  **Mama Nkechi** (warm mama-put owner who coaches you), **Baba Ade** (proud retired teacher
  who loves Ayo), **Malam Sani** (calm, patient strategist), **Tari** (cool university
  student), **Efe** (cheerful danfo driver who sings), **Aisha** (bookish quiz champion),
  **Chidi** (football-mad goalkeeper), **Funmi** (bubbly banker who never backs down at Ludo).
  Each has an avatar, a play style and 6–10 Pidgin or English banter lines. Together they
  span different regions, ages and genders.

### Type
One bold display face with a hand-painted Lagos-signage feel (an OFL licence font chosen for
that character), plus one clean, highly legible UI face. Both are self-hosted `.woff2` subsets.

## 3. Sound effects: Nigerian instruments and everyday sounds
Default rule: **every core interaction sound references a Nigerian instrument or everyday
sound.** Make them as Web Audio synth presets in `src/audio/sfx.ts` (shared ones go in core).
Design tips are given for each.

| Sound | Inspiration | Synth approach | Use for |
|---|---|---|---|
| **Talking drum (gángan / dùndún)** | Yoruba pressure drum that "speaks" with pitch bends | membrane (sine + noise burst) with fast pitch glide up or down | turn start, "your turn", combo rises, level up |
| **Agogo** | Yoruba/Igbo double iron bell | two metallic FM tones a 4th or 5th apart | menu select, correct answer, coin |
| **Ogene** | Igbo iron gong-bell | longer metallic FM tone with slow decay | big win, special card (Whot 20), boss moment |
| **Shekere** | gourd rattle with beads | band-passed noise bursts, swung | dice shake, card shuffle, timer tick in the last 5 s |
| **Udu** | Igbo clay pot drum, deep "bloop" | low sine with a pitch drop and soft attack | Ayo seed into pit, piece lands, match-3 drop |
| **Ekwe / slit drum** | wooden slit drum | short hollow wood (resonant band-pass click) | button tap, piece move, card place |
| **Goje / kakaki hint** | Hausa fiddle / long trumpet (royal fanfare) | a short reedy or brassy saw-wave fanfare | trophy, cup win, unlocks |
| **Market and street** | danfo horn "poom-poom", conductor's bus-stop call, generator hum, okada engine | horn = two-tone square, engine = filtered saw with LFO | Danfo Dash obstacles, Snakes & Ladders bus/pothole moments |
| **Crowd** | Nigerian football crowd cheer and vuvuzela-free whistles | layered noise and formants | Penalty King goal and save |

Keep every SFX under 300 ms (fanfares under 1.5 s) and mixed so it never clips. Provide
"soft" and "full" mixes.

**Voice (human-recorded, licensed):** short exclamations recorded by Nigerian voice actors in
Pidgin and English, e.g. "Oya!", "Na you dey play!", "Chai!", "E don do!", "Last card!",
"Pick two!", "Market don open!", "Goal!". The asset-designer writes the voice script (with
emotion notes per line) and leaves silent placeholders. Never use text-to-speech or a faked accent.

## 4. Music direction (commissioned or licensed, never imported without a licence)
Short loops of 30–60 s, ≤ 300 KB each (`.ogg` + `.mp3`), seamless, with one "menu" and one
"play" loop per game. Styles to brief composers with:
- **Afrobeats** (log-drum-free, light percussion): Danfo Dash, Mama Put Match, menus
- **Highlife** (guitar-led, warm): Whot, Ludo, results screens
- **Jùjú / fújì-inspired percussion** with talking drum: Ayo, Snakes & Ladders
- **Hausa-inspired** (calabash percussion, goje-style melody): Draughts and northern levels
- **Football-chant energy** (drums, whistles): Penalty King
- **Calm quiz bed** (soft highlife guitar and shekere), plus a tense last-5-seconds variant: Sabi Quiz

No samples of existing songs, no artist sound-alikes, and no uncleared beats.

## 5. Language and copy
- Ship `en` and `pcm` (Nigerian Pidgin). Pidgin must sound natural ("Your turn don reach",
  not literal translation). Mark doubtful lines with `_review: true` for a human to check.
- Sprinkle a few well-known words from Yoruba, Igbo and Hausa in celebratory moments
  (e.g. "Ẹ kú iṣẹ́!", "Ọ dị mma!", "Madalla!"), always with correct diacritics and checked by
  a native speaker. Rotate them across regions.
- Naira-styled cosmetic coins are fine visually (₦-inspired icon), but never imply real money.

## 6. Animation and "feel" cues
- **Card slam** in Whot with a table-thump shake, like slapping a card on a plastic table.
- **Dice:** a cupped-hands shake (to shekere), then a roll on a wooden surface.
- **Ayo seeds** drop one by one with udu bloops, and captures sweep seeds into the player's tray.
- **Celebrations:** a gele-ribbon confetti burst, aso-oke stripes sweeping across the screen,
  talking-drum fills. For a big win, an "owambe" spray of cosmetic note-shaped confetti
  (clearly fictional currency, no real banknote designs).
- **CPU persona reactions:** a small avatar pop with a banter line ("Ehen? You think say you fit me?").

## 7. Per-game cultural asset map
| Game | Visual world | Signature SFX | Music | Characters and copy |
|---|---|---|---|---|
| Naija Whot | plastic table on a Lagos veranda, ankara cloth, card backs in an aso-oke stripe | ekwe card place, ogene for Whot 20, shekere shuffle | highlife | all personas, Whot calls in Pidgin |
| Naija Ludo | board in Naija Green with adire-patterned safe squares | shekere dice, agogo capture, talking-drum turn | highlife / jùjú | Funmi, Baba Ade |
| Ayo Olopon | carved iroko board, brass seed tray, adire indigo cloth | udu seed drops, agogo capture | jùjú percussion | Baba Ade, Malam Sani |
| Snakes & Ladders | Lagos map board: BRT/okada "ladders", pothole and go-slow "snakes" | danfo horn, shekere dice | fújì-inspired percussion | Tari, Efe |
| Draughts Naija | Arewa-relief board frame, terracotta and indigo | ekwe piece move, ogene king | Hausa-inspired | Malam Sani, Aisha |
| Sabi Quiz | TV-show set with aso-oke gold lighting | agogo correct, low talking-drum wrong, shekere timer | calm quiz bed | Aisha as host/rival |
| Sabi Words | market notice board, hand-painted signage letters | ekwe letter taps, agogo word found | light Afrobeats | rotating regional packs |
| Penalty King | dusty community pitch to stadium, invented team crests | crowd cheer, whistle, talking-drum build-up | football chant drums | Chidi |
| Danfo Dash | Lagos traffic, Third Mainland-style bridge, BRT lanes | danfo horn, conductor call, generator hum | Afrobeats | Efe as driver, passengers |
| Mama Put Match | food tiles drawn appetisingly, with Balogun, Wuse, Kurmi and Ogbete districts | udu drops, agogo combos, talking-drum cascades | Afrobeats / highlife | Mama Nkechi as guide |
| Akọni & Dike | a JSS museum-trip frame around two period worlds: Kiriji (adire indigo, laterite, dry-season gold, Ekiti hills) and Ekumeku (forest green, uli ochre, night blue, Anioma compounds); aso-oke and akwete trims | Kiriji set: talking-drum parry and rally, agogo; Ekumeku set: ogene signals, udu, ekwe (no shared cues across campaigns; the Company bugle is a documented story-sound exception) | Kiriji: slow highlife and jùjú/dùndún war drums; Ekumeku: akwatankwa bamboo and ogene, low udu | Bisi, Akin, Iya Morenike, Nkem, Ada, Okeke, Ogbuefi Nwaka, guides Mr Adewale and Mrs Okonkwo; Pidgin banter, Yoruba and Igbo words `_review` |

## 8. Cultural review (a human task at each phase exit)
A Nigerian reviewer (ideally from more than one region) checks each game for authenticity,
accidental stereotypes, sacred or political symbols, language accuracy (Pidgin and diacritics)
and regional balance. Findings go into `docs/qa/<slug>-report.md` under "Cultural review".
