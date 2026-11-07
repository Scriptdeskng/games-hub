import { createBanter, type Banter } from '@naija/core/ai-kit';
import { createFlow } from '@naija/core/board-kit';
import type { Core } from '@naija/core/boot';
import { createInput } from '@naija/core/input';
import { createScope } from '@naija/core/lifecycle';
import { createRng } from '@naija/core/rng';
import type { Component, Difficulty } from '@naija/core/ui-kit';
import {
  HINT_SEARCH,
  bestPits,
  createHardBrain,
  createOpponent,
  easyBrain,
  personaById,
} from '../ai';
import { PERSONA_OF } from '../ai/personas';
import type { Rules } from '../rules/config';
import {
  apply,
  createGame,
  currentSide,
  isOver,
  legalMoves,
  mustFeedNow,
  threatenedPits,
  type Action,
  type GameState,
  type MoveRecord,
} from '../rules/engine';
import { createAnimator } from './animate';
import { HUMAN_PITS, keyOfPit, pitOfKey } from './geometry';
import { createPlayUi, type PlayUi } from './play-ui';

export interface PlayStats {
  /** seeds the human captured */
  captured: number;
  /** seeds the CPU captured from the human */
  lost: number;
  /** most seeds the human took in one move */
  bestCapture: number;
  /** moves the human made */
  moves: number;
  hints: number;
}

export interface PlayOptions {
  difficulty: Difficulty;
  rules: Rules;
  seed: number;
  /** quicker animations and CPU pauses (setting) */
  fastPlay: boolean;
  /** after every human move (the app reports the score to the portal) */
  onMove(state: GameState, move: MoveRecord): void;
  onEnd(state: GameState, stats: PlayStats): void;
  onRestart(): void;
  onQuit(): void;
  /**
   * Test builds only: animation speed factor, an auto-played human ("bot": Hard, or random when
   * `lose`), and `liveMoves`: play that many moves through the real UI, then finish instantly.
   */
  test?: { tempo?: number; bot?: boolean; lose?: boolean; liveMoves?: number };
}

export interface Play extends Component {
  start(): void;
  snapshot(): GameState;
  stats(): PlayStats;
  /** test builds only */
  fastForward?: () => GameState;
}

export const HUMAN_ID = 'you';
export const CPU_ID = 'cpu';
/** the "fast play" setting: every animation and pause takes 0.6 of its time */
const FAST_TEMPO = 0.6;

/** One game: the engine, the CPU opponent and everything on the play screen. */
export function createPlay(core: Core, o: PlayOptions): Play {
  const { t } = core;
  const scope = createScope();
  const tempo = o.test?.tempo ?? (o.fastPlay ? FAST_TEMPO : 1);
  const reduced = (): boolean =>
    core.settings.get('reducedMotion') ||
    (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---- seats, persona, game ----
  const personaId = PERSONA_OF[o.difficulty];
  const persona = personaById(personaId);
  const cpuName = t(persona.nameKey);
  let state = createGame({
    seed: o.seed,
    human: { id: HUMAN_ID, name: t('player.you') },
    cpu: { id: CPU_ID, name: cpuName, persona: personaId },
    rules: o.rules,
  });
  const cpu = createOpponent({ id: CPU_ID, seed: o.seed, difficulty: o.difficulty });
  const bot = o.test?.lose ? easyBrain : createHardBrain();
  const botRng = createRng(o.seed ^ 0xb07);
  let botOn = o.test?.bot ?? false;
  const stats: PlayStats = { captured: 0, lost: 0, bestCapture: 0, moves: 0, hints: 0 };

  // ---- view ----
  const ui: PlayUi = createPlayUi({
    ctx: core,
    names: [t('player.you'), cpuName],
    reducedMotion: reduced,
    tempo,
    personaName: () => cpuName,
    onPause: () => flow.pause(),
    onHint: () => hint(),
  });
  const banter: Banter = createBanter({
    t,
    rng: createRng(o.seed ^ 0xba17),
    show: (line) => ui.bubble.show(line),
    chance: { capture: 0.85, captured: 0.8, chain: 0.8, idle: 1 },
  });
  const say = (event: string, force = false): void => {
    banter.say(persona, event, { force });
  };

  // ---- flow control ----
  const flow = createFlow({
    core,
    scope,
    tempo,
    isOver: () => over,
    onRestart: o.onRestart,
    onQuit: o.onQuit,
  });
  const { gate, alive, sleep } = flow;
  let over = false;
  const sfx = (name: string, opts?: { pitch?: number; key?: string }): void =>
    core.audio.playSfx(name, opts);
  const anim = createAnimator({
    board: ui.board,
    flow,
    sfx,
    reducedMotion: reduced,
    onScore: (side, n) => ui.setScore(side, n),
  });
  anim.snap(state);
  ui.setHintEnabled(false);

  // ---- the human's choice ----
  let waiting: ((pit: number) => void) | null = null;
  let playable: number[] = [];
  let selected: number | null = null;
  const live = (): boolean => !flow.modalOpen && !over && !flow.dead;

  function tap(pit: number): void {
    if (!waiting || !live()) return;
    if (playable.includes(pit)) {
      sfx('pitSelect');
      const done = waiting;
      waiting = null;
      done(pit);
      return;
    }
    sfx('noMove');
    const seeds = state.pits[pit] as number;
    if (seeds === 0) ui.setStatus(t('play.emptyTap'));
    else if (mustFeedNow(state)) {
      sfx('mustFeed');
      ui.setStatus(t('play.mustFeedTap'));
    }
  }
  ui.board.onPit(tap);

  function cycle(dir: number): void {
    if (!waiting || !live() || playable.length === 0) return;
    const i = selected === null ? -1 : playable.indexOf(selected);
    const next =
      i < 0
        ? (playable[dir > 0 ? 0 : playable.length - 1] as number)
        : (playable[(i + dir + playable.length) % playable.length] as number);
    selected = next;
    ui.board.select(next);
  }
  const onPitButton = (e: KeyboardEvent): boolean =>
    (e.target as HTMLElement | null)?.classList?.contains('ayo-pit') ?? false;
  const confirm = (e: KeyboardEvent): void => {
    if (!live() || !waiting || onPitButton(e)) return;
    e.preventDefault();
    tap(selected ?? (playable[0] as number));
  };
  const arrow = (dir: number) => (e: KeyboardEvent) => {
    if (!live() || !waiting) return;
    e.preventDefault();
    cycle(dir);
  };
  const keys: Record<string, (e: KeyboardEvent) => void> = {
    Enter: confirm,
    ' ': confirm,
    ArrowRight: arrow(1),
    ArrowUp: arrow(1),
    ArrowLeft: arrow(-1),
    ArrowDown: arrow(-1),
    h: () => hint(),
    p: () => flow.toggle(),
    Escape: () => flow.toggle(),
  };
  for (const pit of HUMAN_PITS) {
    const n = keyOfPit(pit);
    keys[String(n)] = () => tap(pitOfKey(n));
  }
  const input = createInput(ui.el, { keys });

  /** The hint button: the best pit by a shallow search, and the pits the CPU could capture next. */
  function hint(): void {
    if (!waiting || !live()) return;
    stats.hints++;
    const best = bestPits(state, HINT_SEARCH).find((p) => playable.includes(p)) as number;
    ui.board.clearMarks('hint');
    ui.board.clearMarks('danger');
    ui.board.mark(best, 'hint', true);
    for (const p of threatenedPits(state, 0)) ui.board.mark(p, 'danger', true);
    sfx('hint');
    ui.setStatus(t('play.hintSay', { n: keyOfPit(best) }));
  }

  async function chooseHuman(moves: readonly { pit: number }[]): Promise<number> {
    if (botOn) {
      await sleep(150);
      return (bot.decide(state, botRng) as { pit: number }).pit;
    }
    playable = moves.map((m) => m.pit);
    selected = null;
    ui.board.setPlayable(playable);
    ui.setHintEnabled(true);
    const idle = scope.timeout(() => {
      ui.setStatus(t('play.nudge'));
      say('idle', true);
    }, 12000);
    const pit = await alive(new Promise<number>((r) => (waiting = r)));
    idle();
    ui.setHintEnabled(false);
    ui.board.select(null);
    playable = [];
    return pit;
  }

  // ---- one turn ----
  const pitName = (pit: number): number => (pit % 6) + 1;

  function count(m: MoveRecord): void {
    if (m.side === 0) {
      stats.moves++;
      stats.captured += m.gained;
      stats.bestCapture = Math.max(stats.bestCapture, m.gained);
    } else stats.lost += m.captures.filter((c) => c.pit < 6).reduce((n, c) => n + c.count, 0);
  }

  function react(m: MoveRecord): void {
    if (m.captures.length >= 2) say('chain');
    if (m.gained > 0) {
      if (m.side === 1) say('capture');
      else say('captured');
    }
  }

  function describe(m: MoveRecord): string {
    if (m.gained === 0)
      return t(m.side === 0 ? 'play.youPlayed' : 'play.cpuPlayed', {
        n: pitName(m.pit),
        name: cpuName,
      });
    if (m.captures.length >= 2) return t('play.chain', { n: m.captures.length, seeds: m.gained });
    return t(m.side === 0 ? 'play.youCaptured' : 'play.cpuCaptured', {
      n: m.gained,
      name: cpuName,
    });
  }

  async function takeTurn(): Promise<void> {
    const side = currentSide(state);
    const human = side === 0;
    const moves = legalMoves(state);
    ui.setTurn(side);
    let pit: number;
    if (human) {
      sfx('yourTurn');
      if (mustFeedNow(state)) {
        sfx('mustFeed');
        ui.setStatus(t('play.mustFeed'));
      } else ui.setStatus(t('play.yourTurn'));
      pit = await chooseHuman(moves);
    } else {
      sfx('cpuTurn');
      ui.setStatus(t('play.cpuTurn', { name: cpuName }));
      // a real choice takes a moment of thought; a forced move does not
      await sleep(moves.length > 1 ? cpu.thinkMs() : 300);
      pit = (cpu.decide(state) as { pit: number }).pit;
      ui.board.mark(pit, 'select', true);
      ui.setStatus(t('play.cpuPicks', { name: cpuName, n: pitName(pit) }));
      await sleep(320);
    }
    await gate();
    state = apply(state, { type: 'move', pit });
    const m = state.lastMove as MoveRecord;
    count(m);
    if (m.skipped) ui.setStatus(t('play.skip'));
    await playMoveAndReact(m);
    if (human) o.onMove(state, m);
  }

  async function playMoveAndReact(m: MoveRecord): Promise<void> {
    await anim.playMove(m);
    ui.setStatus(describe(m));
    react(m);
    await sleep(m.gained > 0 ? 450 : 200);
  }

  async function run(): Promise<void> {
    say('start', true);
    let steps = 0;
    while (!flow.dead && !isOver(state)) {
      await gate();
      if (flow.dead || isOver(state)) break;
      await takeTurn();
      if (__NAIJA_TEST__ && o.test?.liveMoves && ++steps >= o.test.liveMoves && !isOver(state)) {
        fastForward();
      }
    }
    if (flow.dead || !isOver(state)) return;
    await finish();
  }

  async function finish(): Promise<void> {
    over = true;
    ui.setTurn(null);
    ui.board.setPlayable([]);
    ui.setHintEnabled(false);
    const end = state.end as NonNullable<GameState['end']>;
    if (end.reason !== 'score') {
      ui.setStatus(t(`play.end.${end.reason}`, { name: cpuName }));
      await sleep(500);
      await alive(anim.sweep(state));
    }
    if (state.draw) say('draw', true);
    else if (state.winner === HUMAN_ID) say('lose', true);
    else say('win', true);
    await sleep(state.winner === HUMAN_ID ? 900 : 1300);
    if (!flow.dead) o.onEnd(state, stats);
  }

  /** Test builds: play the rest of the game at once (Hard, or random for `lose`, plays the human seat). */
  const fastForward = (): GameState => {
    flow.setFast(true);
    botOn = true;
    for (let n = 0; !isOver(state) && n < 2000; n++) {
      const choice: Action =
        currentSide(state) === 0 ? bot.decide(state, botRng) : cpu.decide(state);
      state = apply(state, choice);
      const m = state.lastMove as MoveRecord;
      count(m);
      if (m.side === 0) o.onMove(state, m);
    }
    over = true;
    anim.snap(state);
    return state;
  };

  return {
    el: ui.el,
    snapshot: () => state,
    stats: () => stats,
    ...(__NAIJA_TEST__ ? { fastForward } : {}),
    start() {
      void run();
    },
    destroy() {
      flow.kill();
      input.destroy();
      ui.destroy();
      scope.destroy();
    },
  };
}
