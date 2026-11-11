# Akọni & Dike: `@naija/core/quiz` extraction (A1 design)

Split out of `ARCHITECTURE.md` (this is its section 7). Nothing here is built. The knowledge-check item type
(`KnowledgeCheckItem`, a `QuizQuestion` plus `explanation`) and its validator already exist (section 2 of
`ARCHITECTURE.md`); this document is about running those items, and about not regressing Sabi Quiz. Task A1.3
in `ARCHITECTURE.md` section 15 builds it.

## 7. `@naija/core/quiz` extraction **[A1]** (from `games/sabi-quiz/src/rules`)

Sources read: `config.ts`, `scoring.ts`, `poll.ts`, `engine.ts` (340 lines), `daily.ts`, `progress.ts`.

| Moves to `@naija/core/quiz` (generic, pure) | Stays in Sabi Quiz |
|---|---|
| `multiplierFor`, `speedBonus`, a `ScoringModel` interface (`classicPoints` becomes the default model) | `PROFILES`, `CATEGORIES`, `DUEL_*`, `PASS_MARK`, `stars`, `won` |
| `toPercents`, `padiPoll` (crowd lifeline) | duel mode, `CpuSeat`, `answerCpu`, `duelOutcome`, `duelPoints` |
| a generic round machine from `engine.ts`: `createQuiz`, `tick`, `answer`, `next`, `canUse`, `useFifty`, `useSkip`, `usePadi`, `accuracy`, state + history | daily record/streak (`daily.ts`), `progress.ts` (stats keys are game-specific) |
| already in core: `pickQuestions`, `shuffleOptions`, `dailySeed`, `QuizQuestion` | all views, personas, i18n |

```ts
createQuiz<Q extends QuizQuestion>({ questions: Q[], spares?: Q[], seed: number,
  timer?: { limitMs: number },            // optional: Akọni checks have none
  lifelines?: LifelineId[],               // optional: Akọni uses none
  scoring?: ScoringModel,                 // optional: Akọni awards honours, not points
  onWrong?: 'reveal' | 'reveal-explanation' }): QuizState<Q>
```

State stays JSON-serialisable with the rng in state, as in Sabi. Akọni's knowledge check = `createQuiz` with 3
items, no timer, no lifelines, `reveal-explanation`, and `never blocks`: the engine has no "fail" state; the
caller decides honours from `correct`. `KnowledgeCheckItem` already extends `QuizQuestion`.

**Sabi migration without regressions (deferred to after the vertical slice, as its own PR):**
1. Copy `engine.test.ts` (474 lines), `scoring.test.ts` (38) and `poll.test.ts` (80), about 592 lines in total, into `packages/core/src/quiz` first; the
   new module must pass them unchanged with Sabi's config injected.
2. Make `sabi-quiz/src/rules/engine.ts` a thin wrapper over `createQuiz` that adds duel and daily. Public
   exports (`createRound`, `answer`, ...) keep their signatures so `app.ts` and views do not change.
3. Gates: all existing Sabi unit tests green with zero edits, seeded replay equality (same seed => same
   question ids and scores as the pre-migration build, recorded as a golden file), Sabi e2e green, Sabi size
   delta <= +1 KB, core delta counted against the 60 KB budget.
