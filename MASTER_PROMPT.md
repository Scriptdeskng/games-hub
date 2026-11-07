# Master Prompt: start implementation

**How to use:** open this repo in VS Code and start Claude Code in the repo root. Check
`/agents` and confirm that `senior-developer`, `asset-designer` and `qa-reviewer` are listed.
Then paste everything between the lines below as your first message.

At each phase checkpoint, Claude stops and asks for your approval. Reply
**"Approved, continue to Phase N"**, or give feedback.

---

You are the **lead and orchestrator** for the Naija Games project: 10 lightweight, single-player
(one human vs the CPU or the game itself, never multiplayer),
Nigerian-themed HTML5 games for the GameSplash subscription portal.

## Step 1: load context
Read, in full: `CLAUDE.md`, `docs/GAMES.md`, `docs/IMPLEMENTATION_PLAN.md`,
`docs/assets/CULTURAL_GUIDE.md`, and the three
agent files in `.claude/agents/`. Then reply with a short summary of how you understand the
budgets, the stack, the Definition of Done and the phase order, and list any contradictions
or questions. Do **not** start coding until I answer, unless you have no questions.

## Step 2: how you work
- You orchestrate. Delegate the real work to the subagents:
  - **senior-developer** for all code, tests and tooling
  - **asset-designer** for the style guide, asset briefs, SVG/CSS art, SFX presets, and lists of human-made assets
  - **qa-reviewer** for independent verification and the PASS/FAIL report
- For every game or milestone, run this loop:
  1. asset-designer → brief and first-pass assets (placeholders are fine for hero art)
  2. senior-developer → implementation and tests, green on all gates
  3. asset-designer → final assets wired to the filenames the developer used
  4. qa-reviewer → `docs/qa/<slug>-report.md`
  5. If FAIL: hand the report to senior-developer (and to asset-designer for art defects),
     fix, and send back to qa-reviewer. Repeat until PASS. After 3 failed QA rounds on the same
     defect, stop and ask me.
- Pass each subagent a precise brief: the game slug, the GAMES.md section, the relevant
  files, and what "done" means for this step. Subagents don't see this conversation, so give
  them everything they need.
- Track progress in a todo list, one item per game step, and keep `docs/STATUS.md` updated
  (a table of game · phase · QA verdict · size · open human-review items).
- Work on branches: `core/foundation`, then `game/<slug>`. Make small conventional commits.
  **Never push, merge to main or deploy without my explicit approval.**
- Never relax a budget, test or lint rule to get green. If something in the plan is wrong
  or impossible, stop and tell me, with options.

## Step 3: Phase 0 (foundation), start here
Deliver, on branch `core/foundation`:
1. The npm workspaces monorepo with Vite + TypeScript, ESLint and Prettier, Vitest, Playwright
   (mobile Chrome projects at 375×812 and 360×640), and the scripts `lint`, `typecheck`,
   `test`, `build`, `size`, `e2e`, `check` (all gates), `dev <slug>` and `new-game <slug>`.
2. `packages/core` with every module in the plan: boot, loader, audio (Web Audio synth and
   gesture unlock), i18n (en, pcm and a missing-key checker), settings, storage, portal
   bridge, input (tap, swipe, keyboard), seeded RNG, fixed-timestep loop, perf hook, test
   hook, and the ui-kit (menu, how-to-play, pause, results, difficulty picker, toast, modal).
3. `games/_template`: a tiny complete game (tap-the-target) that uses all of core and
   passes every gate. It's the scaffold source for `new-game`.
4. `tools/mock-portal.html`, which embeds any built game and logs its bridge events.
5. `scripts/size-budget.mjs`, plus a GitHub Actions workflow that runs `npm run check`.
6. asset-designer: build `docs/assets/STYLE_GUIDE.md` from `docs/assets/CULTURAL_GUIDE.md`, plus the
   pattern library, CPU persona avatar sheet, shared Nigerian instrument SFX voices (core
   `instruments.ts`), design tokens in core CSS, the shared UI
   skin, and the core SFX set.
7. qa-reviewer: a report on `_template` and core, as `docs/qa/_template-report.md`.

When Phase 0 is **PASS**, stop and give me: what was built, the gate results, bundle sizes,
screenshots (paths), open questions, and the plan for Phase 1. Wait for my approval.

## Later phases (after my approval at each checkpoint)
Follow `docs/IMPLEMENTATION_PLAN.md` exactly. Phase 1 is snakes-ladders → naija-ludo →
ayo-olopon → naija-whot. Phase 2 is sabi-quiz → sabi-words → draughts-naija → penalty-king.
Phase 3 is danfo-dash → mama-put-match. Phase 4 is polish, deploy script (dry-run only) and
catalogue metadata. Start each game with `npm run new-game <slug>`. Finish each phase with
every game in that phase at QA PASS, an updated `docs/STATUS.md`, and a checkpoint summary
to me.

Begin with Step 1 now.

---

## Tips for the human operator
- **Long sessions:** Claude Code may compact context. `CLAUDE.md` and `docs/STATUS.md` keep the
  state, so if a session restarts, say: *"Read CLAUDE.md and docs/STATUS.md, then continue
  from the current phase."*
- **Human tasks the agents will flag:** rules sign-off for Whot, Ludo and Ayo by a Nigerian
  player; a cultural review of each game by Nigerian reviewers from more than one region;
  review of the Pidgin, Yoruba, Igbo and Hausa lines; Nigerian voice actors for the exclamation
  lines; hero art and music (commissioned or licensed);
  fact-checking the quiz questions; testing on real low-end Android phones; DO Spaces
  credentials and the deploy approval.
- **Model and cost:** the subagents inherit your session model. For cheaper QA, change
  `model: inherit` to a lighter model in `qa-reviewer.md`.
