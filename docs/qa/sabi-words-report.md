# QA report: sabi-words (2026-11-09, commit 7df95c2, round 6)
Verdict: **PASS** (QA gate). Not release-ready: 417 words `reviewed:false`; blocklist native-speaker review is a release gate (HUMAN_ASSETS row 47). Condensed record saved by the lead.
History: R1-R5 FAIL (blocklist gaps, rotation, diacritics, results bar), R6 PASS. Round 3 stop-and-ask: user chose "A" for blocklist (add strings, human review as release gate) and diacritics (fix plainly wrong, tag the rest for native reviewer).

## Gates (R6)
lint, typecheck; 848 tests (rules 99.84% lines); build + prod-gate; size 124.0 KB gzip; e2e 72/72; e2e:extra 72/72; perf: menu 1.7 s, 59.8 fps avg / 59 min; 10-min soak alone: 211 rounds, 0 rescues, slope 12.3 KB/min, heap flat after ~3 min (30-min soak advised before release).
DEF-26: results bar 56 px; at rest, last stat tile ends above the bar in 32/32 combinations (360x640, 375x812, 812x375, 1280x800; en/pcm; easy/medium/hard win, hard loss); stickyOverlaps check runs at every viewport and detects a forced overlap. Blocklist probe: 2,700 raw + 2,700 fallback runs, 0 failures, 0 filler hits. DEF-25 lang rule proven on scratch copy; DEF-27 ODOGWU underdot fixed.

## Open minors
R6-01 sabi pack checker not wired into a gate (lead wired it into `packs:check` after this report); R6-02 mark rule does not fire for a native word with neither region hint nor lang tag (ASUN without tag); R6-03 lang tag count is 44 (yo 31, ig 10, ha 2, edo 1), not 37; R6-04 desktop sticky bar hides the last slip row at rest (reachable by scroll).

## Needs human review
Native-speaker blocklist review (release gate); tone patterns of 93 `uncertain` forms (e.g. Ọ̀dọ̀gwụ̀, Rọ̀dọ̀, Nkwọ̀bị); BENINCITY lang:edo tag; ABACHA (surname/politics reading); untagged loanwords (SUYA, ZOBO, MASA, KILISHI, OWAMBE, OYA, SHAKARA, BANGA, KOBO, BUKA, JARA, GBAM, FUFU); Pidgin lines ("How correct", "Run am again", "Go back menu", 83 `_review`); AMMO/SLASH/KNIFE/STRIP/YAWA decisions; coin economy values; Daily always Medium; "Kóyo!"; Osas adire head tie; real-device 360x640 tile sizes (22 px faces on Hard) and results layout; placeholders (music, voice, avatar, hero art).
