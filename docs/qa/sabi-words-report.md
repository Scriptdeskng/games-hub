# QA report: sabi-words (2026-11-09, commit e9783d2, round 3)
Verdict: **FAIL** (2 majors open: DEF-01 blocklist gaps, DEF-03 diacritics). Condensed record saved by the lead.
History: R1 FAIL (SW-01..05 majors), R2 FAIL (DEF-01, DEF-02, DEF-03), R3 FAIL (DEF-01, DEF-03). DEF-02 rotation fixed and verified in R3.

## Gates (R3): all PASS
lint, typecheck, 845 tests (rules 99.84% lines), build + prod-gate, size 121.5 KB gzip, e2e 72/72, e2e:extra 72/72, perf (menu 1.57 s, 59.5 fps), 10-min soak alone (211 rounds, 0 rescues, slope 12.2 KB/min; heap 1.96 -> 2.50 MB, flat in the last 2 min; 30-min soak advised before release). Generation: app path generateWithFallback 0 failures in 5,400 grids; raw generatePuzzle 4/16,200 (football-terms Hard 8x8). The 291-entry floor drops no pack words and adds no failures.

## Open defects
- DEF-01 major: filler still forms KKK (295 occurrences), NGGR (20) / RGGN (25), TITSY reversed (3), BINGO (2). Fix: add to src/rules/min-blocklist.json, all six pack blocklists, and the NASTY list in generator.test.ts. Round-2 list: 0 hits.
- DEF-03 major: Tátáshé uses "sh" for "ṣ" (should be Tátáṣé); Rodo (hint says Yoruba) and Abacha (Igbo, àbàchà) unmarked; Okpa tone, Efọ riró, Àdìrẹ, Isi ewu missing marks; Garri/Nkwobi plain (Garri acceptable as loanword with reviewer note; Nkwobi needs native review). Checker plainForm() normalisation is sound at rejecting unsupported characters but passes any ASCII transliteration and cannot detect missing marks: proposed fix is to require >= 1 combining mark/hooked letter on display tags whose hint names Yoruba/Igbo/Hausa, with an explicit allow-list.
- DEF-09 minor: core pcm.json "Easy Easy", "Normal", "E nearly be! Try again!" unflagged `_review`. DEF-19 minor: CREDITS says 59 uncertain, actual 84. DEF-20 minor: untagged words show in CAPS, tagged in Title case.

## Verified fixed in R3
DEF-02 rotation (notice with Quit only, clock frozen, auto-resume, progress kept, desktop resize ok), DEF-04/05/06/10/18, SW-02/03/06/08/09/10/11/14/15/16/17.

## Needs human review
Blocklist policy (GAY, ORAL, BET, GUN, COKE, DRUG, AKATA, OLODO, SHEGE, SWASTIKA, party names); embedded words BRASS PASS ASSIST CASSAVA STITCH SUBSTITUTE BALOGUN AJEGUNLE OREGUN ENUGU OGUN OGBETE KEEPER GOALKEEPER SHOOTOUT IYANAPAJA JAPA TRAFFIC OSUN; diacritics and native review of the 84 uncertain words; Pidgin (83 _review keys, FLEX, DASH, SHARP); "Kóyo!", adire head tie on Osas, LAGBAJA; coin economy values; Daily is always Medium; token in URL; placeholders (music, voice, avatar, hero art); real-device tile sizes (22 px faces at 360x640 Hard); 417 words reviewed:false.
