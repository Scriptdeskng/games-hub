# Status

| Item | Phase | QA verdict | Size (gzip) | Open human-review items |
|---|---|---|---|---|
| core + `_template` | 0 | PASS (round 2) | core 22.4 KB / 60; template 80.5 KB / 3 MB | Pidgin `_review` lines; Yoruba/Igbo/Hausa words; cultural review; musician check of synths; portal API shape and allowed origins; real-device test |
| snakes-ladders | 1 | PASS (round 2) | game 108.6 KB / 3 MB; core 28.5 KB / 60 | 38 pcm `_review` lines; cultural review (Aisha/Funmi/Efe, regional balance); game length (3 CPUs 4.7 min); pawn greyscale legibility; token in page URL contract; real-device test |
| naija-ludo | 1 | PASS (round 1, 7 minors fixed) | game 106 KB / 3 MB; core 28.3 KB / 60 | 45 pcm `_review` lines; Yoruba/Hausa words; rules sign-off (stacks default safe, 6 always rolls again); game length (3 CPUs classic ~13.6 min); regional balance (no Igbo/South-South persona); synth music and voice lines deferred; re-run 10-min soak alone; real-device test |
| ayo-olopon | 1 | PASS (round 1, minors fixed) | game 108.8 KB / 3 MB; core 26.1 KB / 60 | exact Ayo rule variant and toggles (incl. `starver` end rule) need a Nigerian player; 71+ pcm `_review` lines; Yoruba/Hausa words; Efe/Malam Sani regional-mapping cultural review; Hard-vs-Hard 4.5% move-cap draws; music/voice/hero art placeholders; real-device test of Hard AI cost |
| naija-whot | 1 | PASS (round 3) | game 115.6 KB / 3 MB; core 26.2 KB / 60 | rules sign-off: `calmLate` default ON (after turn 240 a 2/5/14 is a plain card), Lagos defaults, finishOnSpecial, marketAgain, stack cap; Hard-vs-Easy margin thin for cautious mirror (lower bound ~79%); 95 pcm `_review` lines; Igbo/Hausa/Yoruba words; music/voice/hero art placeholders; real-device test |
| sabi-quiz | 2 | PASS (QA round 3; all gates green; release blocked until fact-check) | game 25.7 KB / 3 MB | fact-check of 300 questions (all reviewed:false, 58 tagged `uncertain`); pcm `_review` lines (62); Yoruba/Igbo/Hausa words; host (Etim) vs guide (Aisha); Daily device-local rule; core pcm labels 'Easy Easy'/'Hard Well Well' |
| sabi-words | 2 | PASS (QA round 6; all gates green; release blocked until review) | game 124 KB / 3 MB | blocklist (380 entries) native-speaker review is a release gate; 417 words reviewed:false; 93 `uncertain` display forms and 44 `lang:` words for Yoruba/Igbo/Hausa/Edo tone review; Pidgin `_review` lines; coin economy values; Daily is always Medium; Osas persona (Edo) |
| draughts-naija | 2 | PASS (QA round 2; minors N1-N9 open) | game 110 KB / 3 MB | rule variants (8x8 flying kings, majority, draws, colour); all 97 pcm `_review` lines; roster vs guide (Doosuur Tiv, Falmata Kanuri, Damola Yoruba); Tiv shawl review; real-device 10x10 tap test and Hard think time; CPU stall (M1) unconfirmed, watchdog added |
| penalty-king | 2 | PASS (QA round 3; minors QA-R3-01..09 open) | game 157 KB / 3 MB | team-name live check vs NPFL/NNL/NWFL + trademark (blocking); Chidi not used (guide); rivals Ozavize/Ndako/Hamman native review; 118 pcm `_review`; balance: alternating two placements beats Hard ~43%; registry deploy:false + hub entry/category; music/voice/hero art placeholders; real-device test |
| **akoni-dike** | A (flagship) | **NEXT**: A0 (brief, schemas, size rules) | | historian, cultural and JSS-teacher review; Moremi prologue decision (`features.moremiPrologue`, default off) |
| danfo-dash | 3 | after akoni-dike | | |
| mama-put-match | 3 | after akoni-dike | | |

Phase 0 D14 and D15 closed in the snakes-ladders round (default portal origin `https://m.gamesplash.com.ng` + localhost).
Open minor QA defects carried: SL-10(c) landmark clearance test (documented only), voice player not wired. SL-14 to SL-18 closed in the Ludo round.
