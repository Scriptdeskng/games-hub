# QA report: penalty-king (2026-11-11, commit b5ef3ef, round 3)
Verdict: **PASS** (no blocker or major). Condensed record saved by the lead. History: R1 FAIL (MAJOR-1 single repeated outer-post placement beat Hard), R2 FAIL (BLOCKER-1: uncovered keeper seam |x| 1.15-1.40 opened by the R1 fix; weak 8-placement test), R3 PASS.

## Gates (R3): all PASS
lint, typecheck; 1258 tests (rules 100% lines); build + prod-gate; size 156.9 KB gzip; e2e 506 (all games); e2e:extra 66/66; perf: menu 1.96 s, 59.3 fps avg / 54 min; 10-min soak alone: 78 rounds, 0 rescues, slope 15.8 KB/min.
Round 1/2 verified: shootout engine matches QA's independent oracle on 2,226,176 games; physics deterministic and finite on hostile input; portal/privacy clean; single-player; SFX Nigerian-only.

## Keeper coverage and exploit probes (R3)
Own 0.05 m sweep (7,852 points): 0 uncovered by a completed dive, 0 right-way misses, 0.01 m seam walk 0 gaps; late dive leaves outer corners by design. Hard best single placement: 19.2% fresh / 13.4% learned at react 0.25 s; 21.1% fresh / 15.4% at 0.18 s (about 1 point margin to the 22% limit); 4.8% at 0.35 s. Round-2 seam repro: 5.6-17.0% (was 99.6%). Human win rates on fresh seeds: 67.7/35.2/23.8 (Easy/Medium/Hard), monotonic; keeper saves 12.6/25.5/37.6; Hard beats Easy 83.1% CPU v CPU. Hard beatable (17-20% for random or single-placement humans).

## Open minors
QA-R3-01 anti-exploit probes are skipped under coverage (`heavy = ... it.skip`; skip only the timing bound); QA-R3-02 alternating two placements beats Hard 42.7% fresh / 33.7% learned (zonePrior has no recency: design decision before release); QA-R3-03 dead exports PLACEMENTS, OVER_ZONE, keyAimLimit, diveEase; QA-R3-04 README/brief watchdog second-firing rule, 31 vs 26 HUD icons, floodlight-glow listed; QA-R3-05 results tile shows scoreline under difficulty name (app.ts:269); QA-R3-06 CPU miss/post plays no crowdGroan (sounds.ts:51-52); QA-R3-07 overflow on cup/how-to/stats screens (14 elements scrollWidth > clientWidth; how-to Got it not sticky); QA-R3-08 play.ts 403 lines; QA-R3-09 hard-coded noscript text.

## Needs human review
Chidi not used (guide names him; rivals Ozavize Ebira, Ndako Nupe, Hamman Fulani); team names need live NPFL/NNL/NWFL + trademark check (release blocker, HUMAN_ASSETS row 63); maroon/gold/white ad-board band vs kente; `whistleSub` on a phone speaker; 118 pcm `_review` lines; persona details with native speakers; silent music/voice, SVG placeholder hero art/busts/crests; two-placement balance (QA-R3-02); registry `deploy:false` and no hub entry/category; real-device test.
