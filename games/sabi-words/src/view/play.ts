import { createBanter, createBubbleView, type Banter, type Persona } from '@naija/core/ai-kit';
import type { Core } from '@naija/core/boot';
import { createScope } from '@naija/core/lifecycle';
import { createLoop } from '@naija/core/loop';
import { createRng } from '@naija/core/rng';
import { createModal, createPause, h, type Component, type Modal } from '@naija/core/ui-kit';
import { OSAS } from '../ai/personas';
import { playMusic, tenseMusic } from '../audio/music';
import {
  LOW_TIME_S,
  STAR_2_FRAC,
  STAR_3_FRAC,
  HINT_COST,
  cellFor,
  fitsBox,
  createRound,
  findWord,
  hintTarget,
  select,
  tick,
  unfound,
  useHint,
  wordCells,
  type GameState,
  type Puzzle,
} from '../rules';
import { createBoard } from './board';
import { createHud } from './hud';
import { handleKey } from './keys';
import { viewportBox } from './layout';
import { createWordList } from './wordlist';

export interface PlayOptions {
  puzzle: Puzzle;
  /** a replay of the Daily after the scored attempt: shown as "Practice" */
  practice?: boolean;
  /** coins in the wallet right now */
  coins(): number;
  /** pay for a hint: the coins left, or null when the player cannot afford it */
  spend(cost: number): number | null;
  onScore(s: GameState): void;
  onEnd(s: GameState): void;
  onRestart(): void;
  onQuit(): void;
  /** test builds only */
  test?: { tempo?: number; clockMs?: number; bot?: { win: boolean; everyMs: number } };
}

export interface Play extends Component {
  snapshot(): GameState;
  start(): void;
  /** test builds only: solve (win) or run the clock out (lose) instantly, then finish */
  fastForward?: (win: boolean) => GameState;
}

export function createPlay(core: Core, o: PlayOptions): Play {
  const scope = createScope();
  const { t } = core;
  // test-build options only: in production `test` is undefined and nothing below reads it
  const test = __NAIJA_TEST__ ? o.test : undefined;
  const tempo = test?.tempo && test.tempo > 0 ? test.tempo : 1;
  const n = o.puzzle.size;
  let s = createRound(o.puzzle);
  if (__NAIJA_TEST__ && test?.clockMs)
    s = { ...s, durationMs: test.clockMs, timeLeftMs: test.clockMs };
  let over = false;
  let lastSec = -1;
  let modal: Modal | null = null;
  let modalKind: 'pause' | 'tight' | null = null;
  let hintBusy = false;
  let clueFor: number | null = null;
  let botIn = test?.bot?.everyMs ?? 0;

  const live = h('p', { class: 'ng-sr', role: 'status', 'aria-live': 'polite' });
  const bubble = createBubbleView(scope, { name: (p) => t(p.nameKey), ms: 3000 });
  const banter: Banter = createBanter({
    t,
    rng: createRng((o.puzzle.seed ^ 0x5eed) >>> 0),
    show: (line) => {
      bubble.show(line);
      core.audio.playSfx('hostIn');
    },
    chance: { found: 0.4, long: 1, wrong: 0.35, hint: 1, low: 1, star3: 1 },
  });
  const say = (event: string, force = false, p: Persona = OSAS): void =>
    void banter.say(p, event, { force });

  const hud = createHud(core, scope, {
    practice: o.practice === true,
    onPause: () => pause(),
    onHint: () => hintAction(),
  });
  const words = createWordList(o.puzzle.words, t);
  const clue = h('p', { class: 'sw-clue', 'aria-live': 'polite' });
  const board = createBoard({
    puzzle: o.puzzle,
    cell: cellFor(n, viewportBox(o.puzzle.words.length).w, viewportBox(o.puzzle.words.length).h),
    scope,
    t,
    announce: (text) => (live.textContent = text),
    onSelect: (len) =>
      core.audio.playSfx(len === 1 ? 'letterTap' : 'letterSwipe', {
        pitch: 1 + Math.min(0.4, 0.04 * (len - 1)),
      }),
    onSubmit: (from, to) => apply(from, to),
  });
  board.el.querySelector('.sw-tile')?.setAttribute('data-autofocus', '');
  const el = h('section', { class: 'ng-screen ng-play sw-play', 'aria-label': t('game.title') }, [
    h('div', { class: 'sw-stage' }),
    hud.el,
    h('div', { class: 'sw-play__main' }, [
      board.el,
      h('div', { class: 'sw-play__side' }, [
        words.el,
        // one line under the slip: the hint clue stays here, Osas's bubble covers it for 3 s
        h('div', { class: 'sw-note' }, [clue, h('div', { class: 'sw-banter' }, [bubble.el])]),
      ]),
    ]),
    live,
  ]);

  const coinsNow = (): number => o.coins();
  function syncHint(): void {
    hud.setHint(!over && coinsNow() >= HINT_COST && hintTarget(s) !== null);
  }

  // ---- one place where a swipe is judged
  function apply(from: number, to: number): void {
    if (over || modal) return board.clearSelection();
    const r = select(s, from, to);
    s = r.state;
    if (r.result === 'found' && r.word !== undefined) {
      const w = o.puzzle.words[r.word]!;
      const f = s.found[s.found.length - 1]!;
      board.markFound(wordCells(s, r.word), f.lane);
      words.markFound(r.word, f.lane);
      if (clueFor === r.word) {
        clue.textContent = '';
        clueFor = null;
      }
      core.audio.playSfx(w.word.length >= 8 ? 'wordFoundLong' : 'wordFound');
      live.textContent = t('play.sr.wordFound', {
        word: w.display,
        left: s.puzzle.words.length - s.found.length,
      });
      if (s.status === 'won') say('star3', true);
      else say(w.word.length >= 8 ? 'long' : 'found', w.word.length >= 8);
      o.onScore(s);
      syncHint();
      if (s.status === 'won') finish();
    } else if (r.result === 'repeat') {
      board.clearSelection();
      core.audio.playSfx('selectionClear');
      live.textContent = t('play.sr.repeat');
    } else if (r.result === 'wrong') {
      board.markWrong(from, to);
      core.audio.playSfx('wordWrong');
      live.textContent = t('play.sr.wrong');
      say('wrong');
    } else {
      board.clearSelection();
      core.audio.playSfx('selectionClear');
    }
  }

  function hintAction(): void {
    if (over || modal || hintBusy) return;
    // one hint per tap sequence: a double tap must not spend twice
    hintBusy = true;
    scope.timeout(() => (hintBusy = false), 400);
    const target = hintTarget(s);
    const dry = useHint(s, coinsNow());
    if (target === null || !dry.ok) {
      core.audio.playSfx('selectionClear');
      live.textContent = t(target === null ? 'play.sr.noHint' : 'play.sr.poor', {
        cost: HINT_COST,
      });
      return;
    }
    const left = o.spend(dry.cost);
    if (left === null) return;
    s = dry.state;
    board.hint(dry.cell as number);
    const w = o.puzzle.words[dry.word as number]!;
    clueFor = dry.word as number;
    clue.textContent = t('play.clue', { hint: w.hint || w.display });
    core.audio.playSfx('hint');
    core.audio.playSfx('coinSpend');
    hud.setCoins(left);
    say('hint', true);
    syncHint();
  }

  function finish(): void {
    if (over) return;
    over = true;
    loop.stop();
    board.lock(true);
    syncHint();
    o.onEnd(s);
  }

  // ---- pause (the game clock only runs while the loop does)
  function freeze(kind: 'pause' | 'tight'): void {
    modalKind = kind;
    loop.pause();
    board.lock(true);
    hud.freeze(true);
  }
  function thaw(): void {
    modal = null;
    modalKind = null;
    hud.freeze(false);
    board.lock(false);
    if (!over) loop.resume();
  }
  function pause(): void {
    if (over || modal) return;
    freeze('pause');
    modal = createPause(core, {
      mount: core.root,
      onResume: thaw,
      onRestart: o.onRestart,
      onQuit: o.onQuit,
    });
  }
  scope.on(window, 'keydown', (e: KeyboardEvent) => {
    if (over) return;
    handleKey(e, {
      togglePause() {
        if (modalKind === 'pause') {
          modal?.close();
          thaw();
        } else if (!modal) pause();
      },
      blocked: () => modal !== null,
      hint: hintAction,
    });
  });
  // Rotating mid-round keeps the puzzle and every found word. The cell is re-fitted; if this grid
  // can no longer get cells of 26 px (a 12x12 on a short landscape phone) the round pauses with a
  // notice, and carries on by itself when the screen is rotated back.
  scope.on(window, 'resize', () => {
    const box = viewportBox(o.puzzle.words.length);
    board.setCell(cellFor(n, box.w, box.h));
    const tight = !fitsBox(n, box.w, box.h);
    if (tight && !modal && !over) {
      freeze('tight');
      modal = createModal(core, {
        title: t('play.tight.title'),
        body: t('play.tight.body'),
        mount: core.root,
        actions: [
          { label: t('ui.resume'), onClick: thaw },
          { label: t('ui.quit'), variant: 'ghost', onClick: o.onQuit },
        ],
        onDismiss: thaw,
      });
    } else if (!tight && modalKind === 'tight') {
      modal?.close();
      thaw();
    }
  });

  // ---- the clock
  const loop = createLoop({
    update: (dt) => step((dt * 1000) / tempo),
    perf: core.perf,
    onHidden: () => pause(),
  });

  function step(dtMs: number): void {
    if (over) return;
    s = tick(s, dtMs);
    const sec = Math.ceil(s.timeLeftMs / 1000);
    const frac = s.timeLeftMs / s.durationMs;
    hud.setTime(frac, sec);
    if (sec !== lastSec) {
      lastSec = sec;
      hud.setStars(frac >= STAR_3_FRAC ? 3 : frac >= STAR_2_FRAC ? 2 : 1);
      if (sec <= LOW_TIME_S && s.status === 'playing') {
        hud.setLow(true);
        core.audio.playSfx(sec === 1 ? 'timerLast' : 'timerLow');
        if (sec === LOW_TIME_S) {
          core.audio.playMusic(tenseMusic);
          say('low', true);
        }
      }
    }
    if (s.status === 'lost') {
      hud.setLow(false);
      return finish();
    }
    if (__NAIJA_TEST__ && test?.bot && test.bot.win && !over) {
      botIn -= dtMs;
      if (botIn <= 0) {
        botIn = test.bot.everyMs;
        solveOne();
      }
    }
  }

  /** Test builds only: find the next word the way a perfect player would (exhaustive solver). */
  function solveOne(): void {
    const i = unfound(s)[0];
    if (i === undefined) return;
    const occ = findWord(o.puzzle.letters, n, o.puzzle.words[i]!.word)[0];
    if (occ) apply(occ.cells[0] as number, occ.cells[occ.cells.length - 1] as number);
  }
  const fastForward = (win: boolean): GameState => {
    if (win) while (!over && unfound(s).length) solveOne();
    else {
      s = tick(s, s.durationMs);
      finish();
    }
    return s;
  };

  hud.setCoins(coinsNow());
  syncHint();
  say(createRng(o.puzzle.seed ^ 0xabc).chance(0.3) ? 'ready' : 'start', true);

  return {
    el,
    snapshot: () => s,
    ...(__NAIJA_TEST__ ? { fastForward } : {}),
    start() {
      core.audio.playSfx('gridIn');
      core.audio.playMusic(playMusic);
      loop.start();
    },
    destroy() {
      modal?.close();
      loop.destroy();
      scope.destroy();
    },
  };
}
