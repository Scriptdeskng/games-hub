# Akọni & Dike: Learning Layer

Goal: the game should feel like a history lesson you play. Every chapter teaches 2–3 real
facts, shows how historians know them, and checks what the player learned. It never stops
play for more than about 20 seconds.

**Audience:** junior secondary students (about ages 10–15), their teachers, and adult
subscribers. Nigerian History is compulsory from Primary 1 to JSS 3 under the curriculum
that started in the 2025/26 session.

## Frame: a museum visit
Each campaign opens with a JSS class on a trip:
- **Kiriji:** the Kiriji war site and its markers, with the guide **Mr Adewale**.
- **Ekumeku:** an Anioma heritage museum, with the guide **Mrs Okonkwo**.

The guide stands at an exhibit (a Saro rifle, the treaty stone, an ogene) and says "Let me
tell you what happened here." The chapter then plays as that story. Back at the museum
afterwards, the students ask the questions a real child would ask, and the guide answers.

## Tools (all content is data-driven JSON in `games/akoni-dike/content/learning/`)
| Tool | Behaviour | Frequency |
|---|---|---|
| History, Legend or Story tags | A badge on every cutscene panel and character card | Always |
| Did-you-know cards | A one-line fact slides in on a trigger (taking a hill, crossing a river). It never pauses play | 2–3 per battle |
| Source cards | A real source with who wrote it, when, and why it matters: a short line from the 1886 treaty, a quote from Johnson's *History of the Yorubas*, a museum object | 1 per chapter, kept in the codex |
| Two sides | One event as different groups remember it (Ibadan and the Ekitiparapo; Ile-Ife and Ugbo; colonial reports and Anioma oral history) | Chapters 1, 5 and the finales |
| Timeline and map | Nigeria map and timeline pins unlock as chapters are won | After each chapter |
| Knowledge check | 3 multiple-choice questions on the guide's tablet. Right answers earn bonus honours, wrong ones show the correct fact. **Never blocks progress** | End of chapter |
| Glossary | Tappable terms in all dialogue: ajele, Aare Ona Kakanfo, Balogun, Seriki, Saro, otu okorobia, ogene, Royal Niger Company | Always |

**Shared engine:** build the knowledge check on a reusable `@naija/core/quiz` module (question
schema, timer optional, lifelines optional). The later Sabi Quiz game must reuse this module,
not duplicate it.

## Lesson per chapter
| Chapter | Key lesson |
|---|---|
| Prologue: Raffia Raiders | What a legend is, why Ile-Ife's Edi festival remembers Moremi, and why Ugbo tells it differently |
| Kiriji 1 | How 19th-century Ibadan ruled other towns through resident officials (ajele), and why the towns revolted |
| Kiriji 2 | What a confederacy is: the Ekitiparapo, and Fabunmi stepping aside for Ogedengbe |
| Kiriji 3 | Who the Saro were, and how breech-loading rifles changed the war and gave it its name |
| Kiriji 4 | Stalemate, trade routes and supplies, and how camp life became town life |
| Kiriji 5 | Military titles and command, Aare Latoosa's role, and respect between enemies |
| Kiriji 6 | The 1886 treaty, Johnson and Phillips, and why fighting lingered until 1893 |
| Ekumeku Prologue | How the Royal Niger Company arrived, and the taxes, courts and trade rules it imposed |
| Ekumeku 1 | Age-grades (otu okorobia), rival towns uniting, and what "Ekumeku" means |
| Ekumeku 2 | Communication without writing, and why guerrilla tactics suited the forest |
| Ekumeku 3 | Markets and traders in Igbo society and in resistance networks |
| Ekumeku 4 | Collective punishment, the 1904 rising, and why towns defending alone was a weakness |
| Ekumeku 5 | The 1909 expedition and why it failed |
| Ekumeku 6 | How the movement ended, and how communities keep history alive when they lose |

## Classroom mode (Settings toggle)
- All chapters unlocked, with Story difficulty, so any lesson can be shown in about 10 minutes.
- A one-page teacher guide per chapter (`docs/games/akoni-dike/teacher/chNN.md`, exported to
  PDF) covering goals, a 5-minute summary, the source card, 3 discussion questions and the
  quiz answers.
- A class quiz that can be projected for the whole class. It needs no accounts or phone
  numbers, and works offline.

## Accuracy rules
- Every fact card, source card and quiz item has `source`, `reviewedBy` and `reviewed`
  fields. **Release builds fail if any item has `reviewed: false`** (enforce this in the
  build script).
- Where sources disagree (Kiriji 1886 vs 1893), the codex says so.
- Human sign-offs: a historian for each campaign, a JSS history teacher for the reading level
  and the mapping to NERDC basic-education History topics, and a before-and-after quiz
  playtest with one JSS class.
- Target content: about 150 cards and items in total.
