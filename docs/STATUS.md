# Status

| Item | Phase | QA verdict | Size (gzip) | Open human-review items |
|---|---|---|---|---|
| core + `_template` | 0 | PASS (round 2) | core 22.4 KB / 60; template 80.5 KB / 3 MB | Pidgin `_review` lines; Yoruba/Igbo/Hausa words; cultural review; musician check of synths; portal API shape and allowed origins; real-device test |
| snakes-ladders | 1 | PASS (round 2) | game 108.6 KB / 3 MB; core 28.5 KB / 60 | 38 pcm `_review` lines; cultural review (Aisha/Funmi/Efe, regional balance); game length (3 CPUs 4.7 min); pawn greyscale legibility; token in page URL contract; real-device test |
| naija-ludo | 1 | PASS (round 1, 7 minors fixed) | game 106 KB / 3 MB; core 28.3 KB / 60 | 45 pcm `_review` lines; Yoruba/Hausa words; rules sign-off (stacks default safe, 6 always rolls again); game length (3 CPUs classic ~13.6 min); regional balance (no Igbo/South-South persona); synth music and voice lines deferred; re-run 10-min soak alone; real-device test |
| ayo-olopon | 1 | not started | | |
| naija-whot | 1 | not started | | |
| sabi-quiz | 2 | not started | | |
| sabi-words | 2 | not started | | |
| draughts-naija | 2 | not started | | |
| penalty-king | 2 | not started | | |
| danfo-dash | 3 | not started | | |
| mama-put-match | 3 | not started | | |

Phase 0 D14 and D15 closed in the snakes-ladders round (default portal origin `https://m.gamesplash.com.ng` + localhost).
Open minor QA defects carried: SL-10(c) landmark clearance test (documented only), voice player not wired. SL-14 to SL-18 closed in the Ludo round.
