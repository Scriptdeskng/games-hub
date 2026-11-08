# Sabi Quiz (`sabi-quiz`)

A Lagos TV quiz night in a buka bar. One human against the game: 10-question rounds, a 15 second
clock, three lifelines, a streak multiplier, a Daily Challenge and a Quiz Duel against a CPU
contestant. No second human, no pass-and-play, no money, no prizes.

## Modes

- **Classic**: 10 questions from all topics or one (topic picker on the menu). Pass mark 6 correct
  (1 star), 8 (2 stars), 9 or 10 (3 stars).
- **Daily Challenge**: the same 10 questions for everybody on a given local date (4 easy, 4 medium,
  2 hard, easy first), chosen by `dailyRng` from the date only. The first play of a day is scored
  and its score (date, score, correct; no id of any kind) is kept in core storage under `daily`.
  Further plays that day are replays marked **Practice**: they never change the saved daily score,
  the best score or the win count.
- **Quiz Duel**: race a CPU contestant on a fixed 15 s clock with the Medium question mix. Chidi
  (Easy), Dung (Medium), Aisha (Hard). Both answer the same question; it closes when both have
  answered or the time is up. A correct answer is worth 100 plus up to 100 for speed, so the faster
  correct answer scores more. No lifelines and no streak multiplier in a duel.

## Difficulty (Classic)

| Setting | Clock | Question mix (easy / medium / hard) | Points scale | Padi is wrong |
| ------- | ----- | ----------------------------------- | ------------ | ------------- |
| Easy    | 20 s  | 6 / 3 / 1                           | 100%         | 10%           |
| Medium  | 15 s  | 3 / 5 / 2                           | 125%         | 18%           |
| Hard    | 10 s  | 1 / 5 / 4                           | 150%         | 28%           |

A correct answer scores (base by question difficulty 100 / 150 / 200 + up to 50 for speed) x streak
multiplier (x2 at 3 in a row, x3 at 5, x5 at 8), then x the points scale. A wrong answer or a
timeout scores nothing and breaks the streak. In a duel the difficulty picks the contestant
(accuracy about 55 / 72 / 88 percent, buzz time 6-11 s / 8-12 s / 3-6 s).

## Lifelines (once each per round, Classic and Daily)

- **50/50** removes two wrong plates (never the right one).
- **Skip** swaps the open question for a spare of the same difficulty, restarts the clock, keeps the
  streak and scores nothing for it.
- **Ask your padi** shows a simulated crowd vote that leans to the right answer but is sometimes
  wrong; the clock holds still while the panel is open.

Keys: A to D or 1 to 4 answer; F, S, H use 50/50, Skip, padi; L uses the next lifeline; P or Esc
pauses.

## Code map

- `src/rules/`: pure, seeded, serialisable engine (no DOM, no timers). `engine.ts`, `scoring.ts`,
  `poll.ts`, `daily.ts`, `progress.ts`.
- `src/ai/`: duel contestants on `@naija/core/ai-kit` (`brains.ts`, `personas.ts`) and the headless
  simulator used by the tests (`sim.ts`, test-only: not imported by the app).
- `src/view/`: DOM and CSS. `assets/quiz-art.css` holds the `.sq-*` art hooks; `src/style.css`
  places them.
- `src/content.ts`: the pack validator (core's `validateQuizPack` plus the text-length caps).

## Questions: dev note on review status

`assets/packs/sabi-core-en.json` (300 questions) currently ships with `reviewed: false` on every
question, by agreement. **The game does not filter on `reviewed`** and shows nothing about it to
players. The release gate is a deploy-time check: `npm run packs:release-check` fails while any
question is unreviewed, so nothing goes live until a human fact-checker has flipped the flags.
A pack that fails validation (or a failed download) shows the friendly "questions did not load"
screen with a Retry button; it is handled, never a console error.

## Test builds

`window.__naijaTest` (test builds only; the production bundle has none of it): `autoplay({ mode,
difficulty, win, realtime })`, `getState()`, `setSeed(n)`. `?tempo=0.25` runs the game clock 4x
faster and `?pack=<url>` swaps the question pack (both test builds only).
