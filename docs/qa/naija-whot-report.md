# QA report: naija-whot (round 3, commit 667c242; N-05 fixed afterwards)

Verdict: PASS (no blocker or major; N-05 minor found in round 3 and fixed after it).

The QA agent could not write this file (harness refuses report files), so the lead saved this condensed record of its returned report. Round 1 and 2 history: FAIL (W-01..W-14, then N-01).

## Gates (round 3, run alone)
lint, typecheck, i18n (127 keys en = pcm), test:cov x2 (604/604; Whot src/rules 100% lines, 98.5% branches), build + prod-gate, size 115.6 KB gzip / 3072 KB (core 26.2 KB), e2e 64/64, e2e:extra 64/64, e2e:perf (menu 2.17 s, 59.8 fps avg, worst frame 50 ms, heap 2.41 MB), 10-minute soak (165 rounds, slope 5.1 KB/min vs 100): all PASS.

## Verified defects
- N-01 (persona Whot hold at Medium): FIXED. Whot-with-alternative at Medium over 4000 games per style: balanced 14.8%, cautious (Mama Nkechi) 6.3%, hoarder (Aisha) 3.0%, aggressive 14.7%.
- Hard vs Easy, 24 configs, all point estimates >= 81.5%. WARN: cautious mirror Wilson lower bound 79.0% / 79.8% on two seed sets (repo test passes). Medium > Easy 72.6%; Hard > Medium 65.0%.
- 600-turn cap: 0 of 500 in all 9 CPU-count x difficulty cells. 0 illegal moves (1,800 games).
- N-02 (pcm banter flags): all 30 banter lines flagged `_review`; 95 `_review` in total.
- N-03 (double tap): double/triple taps play once, picker opens once, never a draw. Not reproduced originally; guards added.
- N-05 (minor, new): a refused card tap armed the 450 ms draw lockout. FIXED after this round: lockout arms only on accepted taps and resets at each new human turn; unit and e2e regression tests added; e2e unseeded flakes fixed (setSeed(11)); `npm run e2e` 248/248 four times, e2e:extra 66/66 twice.

## Not re-run in round 3 (passed in round 2)
Privacy, cultural, content, portal, single-player.

## Needs human review
Rules sign-off (calmLate default ON and the 240-turn threshold; Lagos defaults; stack cap; difficulty applies to all CPUs); Pidgin/Igbo/Hausa lines ("Omo", "Haba", "Madalla", "Oya", "Ọ dị mma!"); Mama Nkechi framing; highlife music, 8 voice lines, avatars, thumbnails; last rule card vs the fixed "Got it" bar on a real phone; real-device tests (7-card fan at 360, double tap, 10-minute thermal run).
