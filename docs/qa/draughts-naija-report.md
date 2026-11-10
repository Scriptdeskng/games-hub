# QA report: draughts-naija (2026-11-10, commit 7f377bd, round 2)
Verdict: **PASS** (no blocker or major). Condensed record saved by the lead. Round 1 FAIL: B1 blocker (a legal move ending on the piece's own start square could not be entered by tap), M1 major unconfirmed (CPU "thinking" stall twice in ~54 real-time rounds).

## Gates (R2): all PASS
lint, typecheck; 1010 tests (rules 100% lines); build + prod-gate; size 110.0 KB gzip; full e2e 440 (all games, because core flow.ts changed); e2e:extra 62/62; perf: menu 1.67 s, 60 fps avg / 58 min; 10-min soak alone: 39 rounds, 0 rescues, slope 14.2 KB/min, plateau ~2.45 MB.
Round 1 results that stand: independent move generator agrees on 5 rule variants (0 mismatches); perft 9/81/658/4265/27117 (10x10) and 7/49/302/1469/7473 (8x8); 14 hand-built positions; full-budget Hard v Easy 100% over 200 games on both sizes, Medium v Easy 97%/88%, Hard v Medium 96%/92%, 0 illegal moves in 1200 games; worker built, precached, offline OK, 5 fallback modes, terminated on quit, no leaks.
R2: src/ai decisions identical to b482c68 at shipped budgets (400/400), so round-1 rates stand.

## Verified fixed
B1: 35/35 real-browser probes (tap-tap, drag onto own square, keyboard, 8x8 and king circuits, plain deselect still works); round-1 code failed 12. M1: not reproduced in 30+39 real-time rounds nor with a worker that never answers, answers late, or is paused; hard watchdog added (8 s, cpu-turn.ts) plus flow.ts gate() self-heal; root cause still unidentified. Layout (banter row, results/rules bars), dead code, howto.3, CREDITS, index.html: fixed.

## Open minors
N1 flow.ts self-heal branch (lines 49-52) uncovered, effectively dead; N2 WORKER_AI_PATTERN.md wrong about the worker constructor (shipped `{type:"module"}`; only the worker chunk is an IIFE); N3 README says hint "free" but costs 15 points; N4 README Hard depth "5.6" vs measured 8.19 early-game; N5 dead FALLBACK_DEPTH and no-op destroy; N6 two weak entry tests (entry.test.ts:140-168); N7 sfx.ts header cites wrong brief section; N8 360x640 results page scrolls 13-60 px and "Go to menu" is cut at the bottom edge at rest; N9 seat tray "x0" wraps under "You".
Warnings: W1 M1 not confirmed fixed until a real-device run; W2 watchdog only unit-tested (client's 6 s timeout always answers first); W3 numbered-stone-on-origin cannot occur in legal positions; W5 heap +13% over 10 min then plateau.

## Needs human review
Roster deviates from guide (Malam Sani/Aisha not used); difficulty tiers map to regions (Easy Middle Belt, Medium North-East, Hard South-West); Doosuur's striped shawl (Tiv reviewer); Arewa relief; "Ó dára!"; all 97 pcm lines (`_review`), "YOU WIN! E CHOKE!"; music and voice placeholders; persona busts and hero art; rule variants (8x8 flying kings default off, majority on, 25-move king draw, threefold repetition, light-only colour); real-device test of 31.6 px cells, Hard think time and the M1 stall.
