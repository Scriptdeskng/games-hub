# QA report: akoni-dike Phase A0 (2026-11-11/12, HEAD 9cdb44c, round 2)
Verdict: **FAIL** (open: A0R-M2a-d guardrail linter, A0R-M3a universal SFX cues, A0R-M7 classroom quiz presentation). Condensed record saved by the lead. Round 1: FAIL (M1-M7). Round 2: M1 and M4 fixed, M5 and M6 correctly presented; M2, M3 and M7 open.

## Gates: all PASS
lint, typecheck, 1600 tests (5 pre-existing skips: penalty-king heavy AI x3, draughts DN_RATES x2), build + prod-gate, size (existing games unchanged: `git diff d580b94 HEAD -- games` empty; core 24-29 KB), content:check and content:release-check (both vacuous: games/akoni-dike/content does not exist yet, documented as D11).

## Verified fixed
M1: schemas, lite checker, ajv 6.15 and the TS validators agree on all 157 mutations; 12 ts-only rows are genuinely inexpressible. M4: the rifle-named-war claim is gone everywhere; H-31 exists; LEARNING.md line 41 ("gave it its name") raised as open question 23. M5: PACKS.md 3.1 gives options A/B/C with recommendation B, marked open (D12). M6: A1 total 56 days = 54 dev + 2 owner = 11.2 weeks; keep-list 47 + moved 7; Phase A ~23.4 weeks. No invented history; no gore/shrine/masquerade/flag/artist/licence-agreement mentions.

## Open defects
- A0R-M2a major: `Company soldiers (Hausa) marched on the town.`, `Constables (Yoruba) guarded the road.`, `The Company constables, the Igbo men, took the market.` not flagged (parenthetical/appositive; guardrails.ts colonial-ethnic-label).
- A0R-M2b major: `The raiders were not never called Igbo.` (double negative) not flagged (NEG/NOT_NEGATED/gap in guardrails.ts).
- A0R-M2c major: `Yoruba soldiers fought the Company at Ikirun.`, `Ijesa soldiers defeated the Company at the pass.` blocked at error level (indigenous army vs Company); should be compliant or warning.
- A0R-M2d major: `allow` entries can silence PROTECTED rules (e.g. rule blood at kiriji-1); ARCH 2.4 says protected rules cannot be weakened; release gate neither rejects nor lists them (scripts/content-gate.ts ~105-112).
- A0R-M3a major: universal UI cues (tap/move/back/fail = ekwe; select/factSlide/start = agogo + talking drum) are shared across campaigns, contradicting 05 section 1 and the CULTURAL_GUIDE row ("no shared cues across campaigns"); the proposed machine check allows them.
- A0R-M7 major (presentation): the classroom projected whole-class quiz (LEARNING.md 53-60, PACKS.md 161, SCRIPT.md 113) conflicts with CLAUDE.md single-player; ARCH Q18 only asks where it is hosted: needs an owner decision with options.
- Minors: m1 zero-width-space TODO reviewer accepted (check.ts PLACEHOLDER_RE); m2 negation handled only for yoruba-igbo-enemies (`The Company never sent Hausa soldiers.` is an error); m3 cross-sentence colonial context is only a warning; m4 gates vacuous until content exists; A0R-M3b enemyHornK/truceHornK exceptions not testable under rules (1)/(4); A0R-M3c warHorn built on hausaNote recipe (musician decision).

## Needs human review
Owner: M7 classroom design; universal-cue sharing (code change vs guide amendment); M5 size model (A/B/C); A1 schedule options; Moremi prologue and the flame/firebrand question; Latoosa/Akin; LEARNING.md line 41 wording. Historians: 30+ tickets H-01..H-31. Musician: warHorn and bugle. A1 realism: the 47-day keep-list excludes asset/SFX production (107 presets, 5 new voices) and sign-offs, so it is optimistic.
