import { createBanter, PROFILES, thinkDelayMs, type Banter } from '@naija/core/ai-kit';
import { createFlow } from '@naija/core/board-kit';
import type { Core } from '@naija/core/boot';
import { createScope } from '@naija/core/lifecycle';
import { createRng } from '@naija/core/rng';
import { toast, type Component, type Difficulty } from '@naija/core/ui-kit';
import {
  PERSONA_OF,
  createAiClient,
  decide,
  decisionSeed,
  personaById,
  type AiClient,
  type AiStats,
  type WorkerLike,
} from '../ai';
import { DARK, LIGHT, countPieces, isKing } from '../rules/board';
import type { Rules } from '../rules/config';
import {
  applyMove,
  createGame,
  findMove,
  isOver,
  legalMoves,
  mustCaptureNow,
  type GameState,
  type MoveRecord,
} from '../rules/engine';
import type { Move } from '../rules/movegen';
import { createAnimator } from './animate';
import { createHuman, type Human } from './play-human';
import { createPlayUi, type PlayUi } from './play-ui';

export interface PlayStats {
  /** moves the human made */
  moves: number;
  /** pieces the human took */
  captured: number;
  /** pieces the CPU took from the human */
  lost: number;
  /** most pieces taken in one move */
  bestCapture: number;
  /** kings the human made */
  kings: number;
  hints: number;
}

export interface PlayOptions {
  difficulty: Difficulty;
  rules: Rules;
  seed: number;
  /** quicker animations and CPU pauses (setting) */
  fastPlay: boolean;
  /** how to start the AI worker (omit to search on the main thread) */
  createWorker?: () => WorkerLike;
  /** after every human move (the app reports the score to the portal) */
  onMove(state: GameState, stats: PlayStats): void;
  onEnd(state: GameState, stats: PlayStats): void;
  onRestart(): void;
  onQuit(): void;
  /**
   * Test builds only: an animation speed factor, and a player that picks the human's moves.
   * Production never passes it (and the code that reads it is removed from the bundle).
   */
  test?: { tempo?: number; player?: (s: GameState) => Move };
}

export interface Play extends Component {
  start(): void;
  snapshot(): GameState;
  stats(): PlayStats;
  ai(): AiStats & { mode: string };
  /** the CPU's answer times so far, ms (for the perf report) */
  thinkTimes(): readonly number[];
}

const FAST_TEMPO = 0.6;
const IDLE_MS = 14000;

/** One game: the engine, the CPU (in a worker) and everything on the play screen. */
export function createPlay(core: Core, o: PlayOptions): Play {
  const { t } = core;
  const scope = createScope();
  const tempo = (__NAIJA_TEST__ ? o.test?.tempo : undefined) ?? (o.fastPlay ? FAST_TEMPO : 1);
  const reduced = (): boolean =>
    core.settings.get('reducedMotion') ||
    (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const personaId = PERSONA_OF[o.difficulty];
  const persona = personaById(personaId);
  const cpuName = t(persona.nameKey);
  let state = createGame({ seed: o.seed, rules: o.rules });
  const stats: PlayStats = { moves: 0, captured: 0, lost: 0, bestCapture: 0, kings: 0, hints: 0 };
  const thinkRng = createRng(o.seed ^ 0x7e11);
  const thinks: number[] = [];
  let over = false;
  let lastCpuCapture = false;

  const ui: PlayUi = createPlayUi({
    ctx: core,
    size: o.rules.size,
    cpuName,
    persona,
    onPause: () => flow.pause(),
    onHint: () => hint(),
    squareLabel: (name, v) =>
      t('sq.label', {
        name,
        piece: t(
          v === 0 ? 'piece.none' : `piece.${v > 0 ? 'light' : 'dark'}${isKing(v) ? 'King' : 'Man'}`,
        ),
      }),
  });
  const sfx = (name: string, opts?: { pitch?: number }): void => core.audio.playSfx(name, opts);
  const flow = createFlow({
    core,
    scope,
    tempo,
    isOver: () => over,
    onRestart: o.onRestart,
    onQuit: o.onQuit,
  });
  const anim = createAnimator({ board: ui.board, flow, sfx, reducedMotion: reduced });
  const client: AiClient = createAiClient({ scope, createWorker: o.createWorker });
  const banter: Banter = createBanter({
    t,
    rng: createRng(o.seed ^ 0xba17),
    show: (line) => {
      sfx('personaIn');
      ui.bubble.show(line);
    },
    chance: {
      chain: 0.9,
      humanCapture: 0.6,
      cpuCapture: 0.5,
      mustCapture: 0.9,
      idle: 1,
      think: 0.3,
    },
  });
  const say = (event: string, force = false): void => void banter.say(persona, event, { force });

  const human: Human = createHuman({
    board: ui.board,
    scope,
    onSelect: (picked) => sfx(picked ? 'pieceSelect' : 'pieceDeselect'),
    onStep: () => ui.setStatus(t('play.pickPath')),
    onIllegal(reason) {
      if (reason === 'must') {
        sfx('mustCapture');
        ui.setStatus(t('play.mustCapture'));
        toast(ui.el, t('play.mustCapture'), { kind: 'bad', label: t('toast.heads') });
        say('mustCapture');
      } else {
        sfx('illegal');
        ui.setStatus(t(reason === 'blocked' ? 'play.blocked' : 'play.pickPiece'));
      }
    },
  });

  const ownSquares = (): number[] => state.board.flatMap((v, i) => (v > 0 ? [i] : []));
  const sync = (): void => {
    ui.you.setCaptured(state.captured[LIGHT]);
    ui.cpu.setCaptured(state.captured[DARK]);
    ui.setMoves(stats.moves);
  };

  function hint(): void {
    if (!human.active || flow.modalOpen || over) return;
    stats.hints++;
    // a shallow search of the human's own position: instant, and free (no coins)
    const m = decide(state, 'hard', decisionSeed(state.seed, state.plies), 1500).move;
    human.hint(m);
    sfx('hint');
    ui.board.showPath(m);
    ui.setStatus(t('play.hintSay', { from: sqName(m.from), to: sqName(m.to) }));
  }
  const sqName = (i: number): string => {
    const n = o.rules.size;
    return `${String.fromCharCode(97 + (i % n))}${n - Math.floor(i / n)}`;
  };

  // ---- keys: P pauses, H hints, Escape puts a picked piece back ----
  scope.on(document, 'keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'p') {
      e.preventDefault();
      flow.toggle();
    } else if (flow.modalOpen || over) return;
    else if (k === 'h') hint();
    else if (e.key === 'Escape' && human.back()) e.preventDefault();
  });

  function describe(m: MoveRecord): string {
    const n = m.caps.length;
    const who = m.side === LIGHT;
    if (n === 0) return t(who ? 'play.youMoved' : 'play.cpuMoved', { name: cpuName });
    if (n >= 2) return t(who ? 'play.youChain' : 'play.cpuChain', { n, name: cpuName });
    return t(who ? 'play.youTook' : 'play.cpuTook', { name: cpuName });
  }

  /** Apply a move to the engine, count it, and show it. */
  async function play(m: Move): Promise<void> {
    state = applyMove(state, m);
    const rec = state.lastMove as MoveRecord;
    const mine = rec.side === LIGHT;
    if (mine) {
      stats.moves++;
      stats.captured += rec.caps.length;
      stats.bestCapture = Math.max(stats.bestCapture, rec.caps.length);
      if (rec.crowned) stats.kings++;
    } else stats.lost += rec.caps.length;
    ui.board.setMarks('last-from', []);
    ui.board.setMarks('last-to', []);
    await anim.playMove(rec, state);
    ui.board.setMarks('last-from', [rec.from]);
    ui.board.setMarks('last-to', [rec.to]);
    sync();
    ui.setStatus(describe(rec));
    if (rec.caps.length >= 2) say(mine ? 'chain' : 'cpuChain');
    if (rec.caps.length > 0) say(mine ? 'humanCapture' : 'cpuCapture');
    if (rec.crowned) say(mine ? 'humanCrown' : 'cpuCrown');
    const { men, kings } = countPieces(state.board);
    const left = ((mine ? men[1] : men[0]) as number) + ((mine ? kings[1] : kings[0]) as number);
    if (left === 1 && rec.caps.length > 0 && !over) sfx('lastPiece');
    lastCpuCapture = !mine && rec.caps.length > 0;
    if (mine) o.onMove(state, stats);
    await flow.sleep(rec.caps.length > 0 ? 260 : 120);
  }

  async function humanTurn(): Promise<void> {
    ui.setTurn('you');
    if (!lastCpuCapture && state.plies > 0) sfx('yourTurn');
    ui.setStatus(t(mustCaptureNow(state) ? 'play.mustCapture' : 'play.yourTurn'));
    const moves = legalMoves(state);
    let move: Move;
    if (__NAIJA_TEST__ && o.test?.player) {
      await flow.sleep(80);
      move = o.test.player(state);
    } else {
      ui.setHintEnabled(true);
      const idle = scope.timeout(() => {
        ui.setStatus(t('play.nudge'));
        say('idle', true);
      }, IDLE_MS);
      move = await flow.alive(human.ask(moves, ownSquares()));
      idle();
      ui.setHintEnabled(false);
    }
    human.cancel();
    await flow.gate();
    await play(move);
  }

  async function cpuTurn(): Promise<void> {
    ui.setTurn('cpu');
    ui.cpu.setThinking(true);
    ui.setStatus(t('play.cpuThinking', { name: cpuName }));
    const forced = legalMoves(state).length === 1;
    const delay = forced ? 300 : thinkDelayMs(thinkRng, persona, PROFILES[o.difficulty]);
    if (!forced) say('think');
    // "thinking" ticks: quiet, about every 600 ms, at most six
    let ticks = 0;
    const stopTicks = scope.interval(() => ticks++ < 6 && !flow.modalOpen && sfx('thinkTick'), 600);
    const req = client.request(state, o.difficulty);
    const [thought] = await flow.alive(Promise.all([req.result, flow.sleep(delay)]));
    stopTicks();
    ui.cpu.setThinking(false);
    if (!thought) return;
    thinks.push(Math.round(thought.ms));
    await flow.gate();
    // the answer is checked against the rules: a corrupt reply can never reach the board
    const move =
      findMove(state, thought.move) ??
      decide(state, 'easy', decisionSeed(state.seed, state.plies), 100).move;
    await play(move);
  }

  async function run(): Promise<void> {
    ui.board.render(state);
    sfx('boardIn');
    sync();
    client.warm();
    say('start', true);
    ui.board.setCursor(ui.board.size === 10 ? 9 * 10 + 0 : 7 * 8 + 0);
    while (!flow.dead && !isOver(state)) {
      await flow.gate();
      if (flow.dead || isOver(state)) break;
      if (state.turn === LIGHT) await humanTurn();
      else await cpuTurn();
    }
    if (flow.dead || !isOver(state)) return;
    await finish();
  }

  async function finish(): Promise<void> {
    over = true;
    ui.setTurn(null);
    ui.setHintEnabled(false);
    const r = state.result as NonNullable<GameState['result']>;
    ui.setStatus(t(`play.end.${r.reason}`, { name: cpuName }));
    say(r.winner === null ? 'draw' : r.winner === LIGHT ? 'lose' : 'win', true);
    await flow.sleep(r.winner === LIGHT ? 900 : 1300);
    if (!flow.dead) o.onEnd(state, stats);
  }

  return {
    el: ui.el,
    snapshot: () => state,
    stats: () => stats,
    ai: () => ({ ...client.stats, mode: client.mode }),
    thinkTimes: () => thinks,
    start() {
      void run();
    },
    destroy() {
      flow.kill();
      client.destroy();
      human.cancel();
      human.destroy();
      ui.destroy();
      scope.destroy();
    },
  };
}
