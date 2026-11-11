# Akọni & Dike: Asset Bible

Every asset is **period-accurate** for its chapter and follows `docs/assets/CULTURAL_GUIDE.md`.
Only the Moremi prologue is ancient (Ile-Ife, traditionally the 12th century). Kiriji is the
1870s–1890s, and Ekumeku is the 1880s–1910s.

**Who makes what:**
- **Asset-designer agent:** SVG tiles, sprites, UI frames, patterns, icons and synthesized
  SFX, plus placeholders for everything else.
- **Human illustrator:** hero portraits and cutscene panels (3–6 per chapter, ≤ 300 KB per
  chapter).
- **Commissioned composer:** music.
- **Nigerian voice actors:** battle barks.

## Visual identity per campaign
| | Prologue (Moremi) | Kiriji (Yoruba) | Ekumeku (Igbo) |
|---|---|---|---|
| Palette | Firelight orange, raffia gold, river night blue | Adire indigo, laterite red, dry-season gold | Forest green, uli ochre, night blue |
| UI frame pattern | Simple adire circles | Aso-oke stripes, with adire motifs on map borders | Uli line work, with akwete diamonds on borders |
| Style reference (for inspiration only, never copied) | Ife bronze and terracotta heads: calm faces, fine facial lines | Period photographs and museum objects (reference only) | Period photographs and museum objects (reference only) |

## Environments
| Chapter | Environment | Must include | Must NOT include |
|---|---|---|---|
| Prologue | Ife market, palace courtyard, Esinmirin riverbank at night | Laterite walls, thatch, market stalls, palm-kernel torches | Shrines, sacrifice imagery, masquerade regalia |
| Kiriji 1 | Oke-Imesi town and market | Mud-walled compounds, thatched roofs, market stalls, hill path | Corrugated iron roofs, modern items |
| Kiriji 2 | Imesi-Ile ridge camp | Rolling Ekiti hills, war-camp huts, earthworks, drum stand | — |
| Kiriji 3 | Forest trade road | Dense forest, carts and porters, cliffs and lookouts | Railways (not built until after 1893) |
| Kiriji 4 | Kiriji camps at night | Camp-town life (farms, cooking fires, stalls), lanterns, supply depots | — |
| Kiriji 5 | Ridges and hill objectives | Three hilltop positions, truce flags | — |
| Kiriji 6 | No-man's-land and the treaty hill | Treaty stone on the hill, both camps visible | Real flags or insignia |
| Ekumeku P | Anioma riverbank village | Company steamer and trading post, ukwu tree, red-earth compound walls | Real Company flag or logo |
| Ekumeku 1 | Forest road | Dense bush, supply crates, cover spots | — |
| Ekumeku 2 | Forest signal posts and 3 villages | Signal trees, yam barns, obi meeting house | — |
| Ekumeku 3 | Checkpoint market town | Stalls, crowds, baskets of yam and palm oil, rooftops and awnings | — |
| Ekumeku 4 | Village and ford | Lanes, fences, smoke effects | Flames on people, injuries |
| Ekumeku 5 | Ogwashi-Uku forest roads and ford | Forest roads split three ways, ford | — |
| Ekumeku 6 | Night cordon and the river | Lantern patrols, canoe at the bank | Searchlights (anachronistic) |

## Characters and outfits
| Character | Outfit and gear |
|---|---|
| Moremi | Royal wrapper, beaded crown or ornament (original design), torch and staff |
| Raffia raiders | Plain full-body raffia cloaks (not real masquerade regalia) |
| Bisi | Hunter's buba and sokoto, leather pouch, bow, short sword, later the Saro rifle. Unlockables: aso-oke war sash |
| Akin | Buba, fila cap, breech-loading rifle, powder horn |
| Iya Morenike | Adire wrapper and gele, trader's calabashes |
| Ekitiparapo and Ibadan fighters | Agbada and buba-style war dress, fila, spears, cutlasses, bows, dane guns. Ibadan is set apart by **colour accents only**, never by caricature |
| Ogedengbe, Fabunmi, Latoosa | Dignified chief's dress, drawn as respectful likenesses **inspired by** descriptions. Not traced from photographs. Check with heritage bodies |
| Samuel Johnson, Charles Phillips | 1880s clerical dress |
| Nkem | Wrapper, okpu agu leopard cap (unlockable), machete, dane gun |
| Ada | Market wrapper and head-tie, baskets |
| Okeke | Wrapper, ogene and striker |
| Ogbuefi Nwaka | Titled man's attire (original design; avoid specific sacred regalia) |
| Captain Harrow and constables | Generic period colonial uniforms. No real insignia, no ethnic labels |
| Museum guides and JSS class | Modern Nigerian school uniforms (navy, green, maroon), with guide lanyards |

## Weapons and props
- **Kiriji:** spears, cutlasses, bows, flintlock dane guns, Saro breech-loading rifles (the
  "star item", with a generic period design and no brand marks), powder horns, talking drums
  (gángan and dùndún), agogo, cowrie strings, calabashes, treaty stone.
- **Ekumeku:** machetes, dane guns, ogene and ekwe, yam baskets, palm-oil pots, crates,
  canoe, lanterns.
- **Museum:** display cases holding each source-card object.

## Audio
- **SFX (synthesized, Nigerian instruments only):**
  - **Kiriji:** talking-drum rally, the "ki-ri-ji" rifle crack, agogo for orders.
  - **Ekumeku:** ogene signal codes, ekwe wood clicks for stealth steps, udu for ambush.
  - **Prologue:** torch whoosh, shekere crowd.
- **Music briefs (commissioned):**
  - **Kiriji:** jùjú- and dùndún-led war drums, with slow highlife for camp scenes.
  - **Ekumeku:** akwatankwa bamboo and ogene polyrhythms, with tense low udu for stealth.
  - **Prologue:** a single flute over soft drums.
- **Voice barks:** English, Pidgin, Yoruba and Igbo ("Ẹ jẹ́ ká lọ!", "Ekumeku!", "Oya, move!").
  All story text is read on screen, not voiced.

## Anachronism and sensitivity checklist (QA uses this)
- [ ] No corrugated iron in Kiriji chapters 1–3, no railways before 1893, no searchlights, no modern items outside the museum frame
- [ ] No Igbo-Ukwu bronzes in Ekumeku (they're about 1,000 years older). Ife-style art in the prologue only
- [ ] No shrines, ofo staffs, mbari houses, masquerades, war charms or nsibidi
- [ ] No blood, skulls, trophies or injuries. Smoke only, and no flames on people
- [ ] No real flags, insignia or logos, and no colonial photographs used in-game
- [ ] Real figures drawn with dignity and checked by heritage bodies
- [ ] Every asset logged in `games/akoni-dike/assets/CREDITS.md` with its reference source
