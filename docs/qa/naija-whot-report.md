# QA report: naija-whot (round 2 summary, commit c15681f)

Verdict (round 2): FAIL (one major: N-01). Round 3 follows the N-01/N-02/N-03 fixes; this file is overwritten by the round-3 report.

The round-2 QA agent could not write this file (harness refused), so the lead saved this condensed record of its returned report.

## Round 2 results
- Gates on c15681f: lint, typecheck, i18n, test:cov (2 of 2 runs, 600/600), build + prod-gate, size 115.3 KB gzip, e2e 62/62, e2e:extra 62/62, e2e:perf, 10-minute soak (165 rounds, heap slope 3.2 KB/min): all PASS.
- AI: 0 illegal moves in 17,700 seeded games; 600-turn cap 0.0% in 9,000 games (1/2/3 CPUs x Easy/Medium/Hard); Hard vs Easy 83.7-85.0% (Wilson lower bounds 82.3-83.7%) over 3,000 games per style; Medium vs Easy 73.3%; Hard vs Medium 66.0%; AI reads public information only (0 of 107,844 decisions changed when hidden cards were scrambled).
- Privacy: portal `start` payload no longer carries the seed; seed from crypto.getRandomValues; test hooks absent from the production bundle.
- Round 1: W-01..W-14 fixed except W-03 (persona styles) partly; W-04 soak stall explained by host sleep (caffeinate added to scripts/e2e.mjs), not reproduced.

## Round 2 defects
- N-01 (major): Aisha's Whot hoard and Mama Nkechi's Whot reserve had no effect at Medium. Fixed after the round (slip path), pending round-3 verification.
- N-02 (minor): five pcm banter lines unflagged. Fixed after the round.
- N-03 (minor, not reproduced): one double tap ended in a market draw. Defensive guards plus tests added after the round.
- N-04 (warn): music and voice are placeholders (human delivery item).

## calmLate judgement (QA)
Defensible as a visible toggle; not yet defensible as the default without human rules sign-off. It applies in 17-21% of 3-CPU games; with it off the 600-turn cap fires in 2.6% (Medium) and 11.4% (Hard). QA recommends default-off, or rebalancing Hard's hand growth, until a Nigerian rules reviewer signs off. Left ON for now; decision for the owner.

## Needs human review
Rules sign-off (calmLate default and 240-turn threshold, Lagos defaults, stack cap, difficulty-applies-to-all-CPUs); Pidgin/Igbo/Hausa lines ("Omo", "Haba", "Madalla", "Oya", "Ọ dị mma!", calm lines); Mama Nkechi framing; highlife music, voice lines, avatars, thumbnails; check the last rule card clears the fixed "Got it" bar on a real phone; real-device test (7-card fan at 360, double tap, 10-minute thermal run).
