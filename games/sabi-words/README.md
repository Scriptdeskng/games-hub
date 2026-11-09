# Sabi Words (`sabi-words`)

A word search at a Lagos market stall. One human against the clock: swipe across the letters to
circle the hidden words before time runs out. No second human, no pass-and-play, no money, no
prizes. Osas, a sign-painter from Benin City, guides and cheers (she is not an opponent).

## Play

- **Packs** (menu card, six themes): Naija Food, Lagos Places, Football Terms, Pidgin Words,
  States and Capitals, Cloth and Markets. Words come from `assets/packs/*.json`, fetched at run
  time, so the client can update them without a code release.
- **Daily Puzzle**: Medium, 10x10, a pack and seed chosen from the local date only (the same grid
  for everybody that day, never stepped down for a small screen). The first start of a day is the
  scored attempt; Restart, Quit-and-start and replays are **Practice**: they save nothing, earn no
  coins, and tell the portal only `start` (with `practice: true`) and `end` (no score).
- **Selecting**: swipe (a tile counts when the pointer is within 0.4 x cell of its centre, so
  diagonals are not ambiguous), or tap the first letter then the last letter, or use the keyboard:
  arrows move, Space or Enter marks the start and then the end, Escape cancels, H hint, P pause.
  A word counts read either way round.
- **Hints**: the lantern costs 10 coins, rings the first letter of an unfound word and shows its
  clue text. Coins are cosmetic: earned by finishing (a win pays 10/15/20 by level plus 5 per star,
  a lost round one coin per word found), stored in the saved progress (core storage, or the portal
  API when a token is present). No purchase, no cash value.
- **Stars** by the share of the clock left on completion: 3 at 50% or more, 2 at 20% or more,
  otherwise 1. A timeout is a loss; results still list every word with the found ones marked.
- The last 5 seconds get the warning look (dashed gold bar, triangle) and ticks.
- Found words take the six cloth lanes in finding order (pattern, outline, underline and a struck-
  through word with a check disc: never colour alone). The word list shows the pack's `display:`
  tag when present.

## Levels

| Level  | Grid  | Words | Clock | Directions                                | Word length |
| ------ | ----- | ----- | ----- | ----------------------------------------- | ----------- |
| Easy   | 8x8   | 6     | 3 min | right, down                               | 3 to 7      |
| Medium | 10x10 | 8     | 4 min | + both diagonals going right, left and up | 3 to 10     |
| Hard   | 12x12 | 10    | 5 min | all 8                                     | 4 to 12     |

**Cell size cap.** Cells are at most 44 px and never under 26 px: if the screen cannot give a
12x12 grid 26 px cells, it steps down to 10x10 (then 8x8). At 360x640 portrait all three levels
keep their own size (12x12 gets exactly 26 px cells); a short landscape phone (812x375) plays Hard
as 10x10. The level's other numbers (words, clock, directions) do not change. Letters are 15 px or
more. Tiles are below 44 px by design (the hit circle does the work); every other control is 44 px.

## Code map

- `src/rules/`: pure, seeded, serialisable (no DOM, no timers, no `Math.random`).
  `generator.ts` (place, blocklist-aware filler, repair, attempt cap), `blocklist.ts`, `solver.ts`
  (independent exhaustive search), `engine.ts`, `selection.ts` (hit circle, grid fit), `progress.ts`,
  `daily.ts`, `grid.ts`, `words.ts`, `config.ts`.
- `src/ai/`: Osas (`personas.ts`) and `searcher.ts`, a model of a human searcher used only by the
  difficulty tests (never imported by the app).
- `src/view/`: DOM and CSS. `assets/words-art.css` holds the `.sw-*` art hooks; `src/style.css`
  places them. `board.ts` is the grid (pointer, tap-tap, keyboard); `play.ts` ties it to the
  engine, HUD, word list and pause.
- `src/content.ts`: the six pack URLs (literal paths, so the ship check sees them) and the pack
  validator (core's `validateWordPack` plus the grid word form: 3 to 12 letters A-Z, at least 12
  words).

## Generator guarantees

For a pack, level, size and seed the output is deterministic. Every word is placed (an exhaustive
solver finds exactly one occurrence of each), no placed word is hidden inside another, and no
blocked string (the pack's `blocklist` merged with a built-in floor, both read forwards and
backwards, in every row, column and both diagonals) appears anywhere. Filler is redrawn; a placed
word is only moved by starting a whole new attempt (cap 40, each seeded). Tests run every shipped
pack through 200 seeded puzzles at each size.

## Words: dev note on review status

All 417 words ship with `reviewed: false`, by agreement and exactly as in Sabi Quiz. **The game
does not filter on `reviewed`** and shows nothing about it to players (refusing unreviewed words
would leave no playable pack). The release gate is a deploy-time check:
`npm run packs:release-check` (and `node scripts/check-sabi-words-pack.mjs --release`) fails while
any word is unreviewed, so nothing goes live until a human has flipped the flags. A pack that fails
validation, or a failed download, shows the friendly "words did not load" screen with Retry; it is
handled, never a console error.

## Blocklist: how short strings are handled

Every pack carries the same 168-entry `blocklist` (merged with `MIN_BLOCKLIST` in
`src/rules/blocklist.ts`, same short strings in both: ASS, POO, HOE, TIT, TITS, SLAG, THOT, NIGG,
KNOB, SHAG, BOOB, BUTT, HOMO, PIMP, SEX, PORN and more). The generator scans every row, column and
diagonal, both directions, and **redraws filler** for any blocked occurrence that uses at least one
filler cell. An occurrence made only of placed letters is allowed only inside ONE accepted pack word
(ASS in PASS or BRASS, TIT in STITCH); where two placed words cross to spell one, the attempt is
thrown away. A pack word that IS a blocked string, or holds one of 5+ letters, is never picked.
`scripts/check-sabi-words-pack.mjs` mirrors this (it lists the embedded 3 to 4 letter cases: BRASS,
STITCH, SUBSTITUTE, PASS, ASSIST, CASSAVA). A regression test builds 200 seeds x 6 packs x 3 sizes
and asserts a fixed list of vulgar strings never occurs outside a placed word.

**Open decision (cultural reviewers): AKATA and OYINBO** are not blocked. Some readers find them
derogatory; others use them neutrally. Add them to every pack's `blocklist` (and `MIN_BLOCKLIST`)
if the reviewers decide so: the generator needs no change.

## Display forms and diacritics (native review)

`word` stays A-Z; the `display:` tag carries the marks. Added in QA round 1 and tagged `uncertain`:
Egusi (Ẹ̀gúsí), Amala (Àmàlà), Eba (Èbà), Akara (Àkàrà), Ogbono (Ọ̀gbọ̀nọ̀), Efọ riro, Ewedu (Ẹ̀wẹ́dú),
Gbegiri (Gbẹ̀gìrì), Dodo (Dòdò), Asaro (Àsáró), Ekuru (Ẹ̀kuru), Ọha soup, Ogi (Ògì), Agbalumo
(Agbálùmọ̀), Aṣọ òkè, Aṣọ ẹbí, Adìrẹ, Agbádá, Bùbá, Gèlè, Fìlà, Ìró, Ìrókò, Ọ̀dọ̀gwù, Lagbájá. Pidgin
hints for DASH and FLEX were reworded (neutral gloss; native review). Not done: Hausa hooked letters
(Ɗanwake, Ƙ...) because the pack checker needs the display form to start with the plain word;
English place-name spellings (Ojuelegba, Idumota) stay as is (policy call).

## Rotation and the console

Rotating mid-round keeps the puzzle, found words, hints and the clock. The cell is re-fitted; if the
current grid can no longer get 26 px cells (12x12 on a short landscape phone) the round pauses with a
"Tight fit" notice (Continue, or rotate back and it resumes by itself). The floor is 16 px.
A pack file that is missing makes the **browser** print its own "Failed to load resource: 404" line:
a check-before-fetch would log the same line, so the game adds nothing and the e2e spec filters only
that browser text.

## Test builds

`window.__naijaTest` (test builds only; the production bundle has none of it):
`autoplay({ difficulty, pack, mode, win, realtime })` (solves with the exhaustive solver, or lets
the clock run out), `getState()`, `setSeed(n)`. `?tempo=0.25` runs the game clock 4x faster,
`?clock=9000` starts rounds with 9 s on the clock, `?pack=<url>` swaps the pack (all test builds
only). `npm run e2e -- sabi-words`, `npm run e2e:extra -- sabi-words`, `e2e:perf` and `e2e:soak`
work for this slug.
