# QA report: sabi-quiz (2026-11-08, commit 50d0267, round 3)
Verdict: **PASS** (QA gate). Not release-ready: all 300 questions are `reviewed:false` (HUMAN_ASSETS item 38; `npm run packs:release-check` fails by design).

Condensed record saved by the lead (the QA agent cannot write report files). Rounds: R1 FAIL (D1 daily replayable, D2 duel e2e flake), R2 FAIL (D13 practice daily emitted score/level_complete), R3 PASS.

## Gates (round 3)
lint, typecheck PASS; 758 unit tests, rules coverage 100% lines / 98.85% branches; build + prod-gate OK; size 124.4 KB gzip (25.7 KB core) vs 3072 KB; e2e 58 passed (2 skipped by design); e2e:extra 59 passed (1 skipped by design); perf (4x CPU, Fast 3G): menu 1.8 s, 60 fps avg / 59 min, heap 2.08 MB; 10-min soak alone: 51 rounds, heap flat 2.24 MB, slope -2.3 KB/min, counters flat.

## Verified in browser
Portal events: scored Daily = ready, start, score x10, level_complete, end; practice = start(practice:true), end(practice:true) only; seed never sent; token only as Bearer; no token/MSISDN in storage keys. Lifeline captions readable at 375x812/360x640 en+pcm. Daily copy right for abandoned vs finished vs legacy records. Practice does not increment plays. Prod bundle has no test reads. Single-player confirmed. Cultural review: no clichés, symbols or stereotypes in screenshots.

## Open (minor, non-blocking)
- D12 core pcm labels "Easy Easy", "Hard Well Well" (core-owned, `_review`-flagged, human).
- D16 FIXED by lead after the report (HUMAN_ASSETS item 38 body).
- D19 `sanitizeDaily` legacy `finished` branch not covered by a unit test (daily.ts:29).
- W1 Daily record device-local; W2 Restart on a scored Daily burns it; W4 e2e spec 965 lines; W5 pcm hint line identical to English, 47 pcm strings equal en; W6 one slow soak round (69.5 s, no stall, re-run on idle machine); W7 lifeline captions 11 px; W3 320x568 unmeasured.

## Needs human review
Fact-check of 300 questions (58 tagged `uncertain`, listed in games/sabi-quiz/README.md); 62 pcm `_review` lines; 15 native-review Yoruba/Igbo/Hausa items; host Uncle Etim vs guide's "Aisha as host/rival"; Etim/Dung names, regions and banter; political-adjacent history items (sq-his-010, 018, 020, 028); real clubs/players as trivia; regional balance (Lagos 30, Kano 28 vs Benue/Sokoto 3); Daily rules (device-local, first start burns day, 15 s clock, 125% scale); portal meaning of absent `practice` key; placeholders (portraits, hero webp, music, voice); real low-end Android test.
