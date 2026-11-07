import { createBanter, type Banter } from '@naija/core/ai-kit';
import { createFlow } from '@naija/core/board-kit';
import type { Core } from '@naija/core/boot';
import { createInput } from '@naija/core/input';
import { createScope } from '@naija/core/lifecycle';
import { createRng } from '@naija/core/rng';
import type { Component, Difficulty } from '@naija/core/ui-kit';
import {
  createHardBrain,
  createOpponents,
  personaById,
  pickPersonas,
  type Cpu,
  type PlannerCache,
} from '../ai';
import {
  apply,
  createGame,
  currentSeatOf,
  isOver,
  legalActions,
  playerById,
  turnsUntilChoice,
  type Action,
  type GameState,
  type MoveRecord,
  type Phase,
  type Rules,
} from '../rules';
import { createPlayUi, type PlayUi } from './play-ui';
import { jumpSfx, playMusic } from '../audio/cues';

export interface PlayOptions {
  difficulty: Difficulty;
  cpuCount: number;
  /** stored game counter: rotates the third CPU (Funmi / Aisha) */
  gameCounter: number;
  rules: Rules;
  seed: number;
  /** the app's planner cache, shared by this game's Hard CPUs (instance state, not a module global) */
  planners: PlannerCache;
  /** after every move (the app reports the score to the portal) */
  onMove(state: GameState, move: MoveRecord): void;
  onEnd(state: GameState): void;
  onRestart(): void;
  onQuit(): void;
  /**
   * Test builds only: animation speed factor, an auto-played human, and `liveMoves`: play that
   * many moves through the real UI, then finish the rest of the game instantly (bounded rounds).
   */
  test?: { tempo?: number; bot?: boolean; liveMoves?: number };
}

export interface Play extends Component {
  start(): void;
  getState(): GameState;
  readonly humanId: string;
  /** test builds only */
  fastForward?: () => GameState;
}

export const HUMAN_ID = 'you';

/** One game: the engine, the CPU opponents and everything on the play screen. */
export function createPlay(core: Core, o: PlayOptions): Play {
  const { t } = core;
  const scope = createScope();
  const tempo = o.test?.tempo ?? 1;
  const reduced = (): boolean =>
    core.settings.get('reducedMotion') ||
    (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---- seats, personas, game ----
  const personaIds = pickPersonas(o.seed, o.cpuCount, o.gameCounter);
  const cpuSeats = personaIds.map((persona, i) => ({
    id: `cpu${i + 1}`,
    name: t(personaById(persona).nameKey),
    persona,
  }));
  let state = createGame({
    seed: o.seed,
    human: { id: HUMAN_ID, name: t('player.you') },
    cpus: cpuSeats,
    rules: o.rules,
  });
  const cpus: Cpu[] = createOpponents({
    seed: o.seed,
    difficulty: o.difficulty,
    seats: cpuSeats,
    planners: o.planners,
  });
  const cpuOf = (id: string): Cpu => cpus.find((c) => c.id === id) as Cpu;
  const bot = createHardBrain(o.planners);
  const botRng = createRng(o.seed ^ 0xb07);
  let botOn = o.test?.bot ?? false;

  // ---- view ----
  const ui: PlayUi = createPlayUi({
    ctx: core,
    layout: state.layout,
    players: state.turns.seats.map((s) => ({
      id: s.id,
      name: s.name,
      label: s.name,
      pawn: `./assets/pawns/pawn-${s.kind === 'human' ? 'you' : (s.persona ?? 'tari')}.svg`,
    })),
    reducedMotion: reduced,
    tempo,
    personaName: (id) => t(personaById(id).nameKey),
    onPause: () => flow.pause(),
    onMove: () => decide?.('accept'),
    onReroll: () => decide?.('reroll'),
  });
  ui.board.setPositions(Object.fromEntries(state.players.map((p) => [p.id, p.pos])));
  state.players.forEach((p) => ui.setPos(p.id, p.pos));
  ui.setRerollAvailable(state.rules.reroll ? 'available' : 'off');

  const banterRng = createRng(o.seed ^ 0xba17);
  const banter: Banter = createBanter({
    t,
    rng: banterRng,
    show: (line) => ui.bubble.show(line),
    chance: { ladder: 0.7, snake: 0.7, six: 0.5, humanLadder: 0.45, humanSnake: 0.45, idle: 1 },
  });
  const say = (personaId: string, event: string, force = false): void => {
    banter.say(personaById(personaId), event, { force });
  };
  const anyPersona = (): string => personaIds[banterRng.int(0, personaIds.length - 1)] as string;

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
  let rollWaiter: (() => void) | null = null;
  let decide: ((a: 'accept' | 'reroll') => void) | null = null;
  let over = false;
  let idleOff: () => void = () => undefined;

  // ---- keyboard: Space/Enter roll or move, 1/2 pick (dice view), R re-roll, P/Esc pause ----
  const primary = (e: KeyboardEvent): void => {
    e.preventDefault(); // a focused button must not also click
    if (flow.modalOpen || over) return;
    if (decide) decide('accept');
    else rollWaiter?.();
  };
  const input = createInput(ui.el, {
    keys: {
      ' ': primary,
      Enter: primary,
      r: (e) => {
        e.preventDefault();
        if (!flow.modalOpen && !over) decide?.('reroll');
      },
      p: () => flow.toggle(),
      Escape: () => flow.toggle(),
    },
  });
  ui.dice.onRequest(() => rollWaiter?.());

  // ---- one turn ----
  const me = (): string => currentSeatOf(state).id;
  const nameOf = (id: string): string => state.turns.seats.find((s) => s.id === id)?.name ?? id;
  const step = (a: Action): GameState => (state = apply(state, a));
  const phaseNow = (): Phase => state.phase;

  const refreshHud = (): void => {
    for (const p of state.players) ui.setPos(p.id, p.pos);
    const mine = playerById(state, HUMAN_ID);
    ui.setRerollAvailable(!state.rules.reroll ? 'off' : mine.rerollLeft ? 'available' : 'used');
  };

  async function showRoll(value: number | null): Promise<void> {
    await alive(ui.dice.roll(value));
    if (value !== null) {
      core.audio.playSfx('diceLand');
      if (value === 6) core.audio.playSfx('six');
    }
  }

  /** Walk the pawn, then ride the ladder or slide down the snake. */
  async function playMove(m: MoveRecord): Promise<void> {
    const id = m.playerId;
    ui.setCaption(null);
    if (m.overshoot) {
      core.audio.playSfx('finishBounce');
      ui.setStatus(t('voice.sl.exact'));
      await alive(ui.board.nope(id));
      return;
    }
    await alive(
      ui.board.hop(id, m.from, m.landed, (i) =>
        core.audio.playSfx('step', { pitch: 1 + Math.min(0.12, i * 0.02), key: 'step' }),
      ),
    );
    core.audio.playSfx('drop');
    if (m.via && m.jumpId) {
      const j = [...state.layout.ladders, ...state.layout.snakes].find((x) => x.id === m.jumpId);
      ui.board.flash(m.jumpId);
      ui.setCaption(m.via, t(`snakes.cap.${j?.from ?? m.landed}`));
      core.audio.playSfx(jumpSfx(m.via, j?.theme));
      await sleep(260);
      await alive(ui.board.slide(id, m.to));
      core.audio.playSfx('drop');
    }
    ui.setPos(id, m.to);
  }

  function react(m: MoveRecord): void {
    const isHuman = m.playerId === HUMAN_ID;
    const persona = isHuman
      ? anyPersona()
      : (cpuSeats.find((s) => s.id === m.playerId)?.persona as string);
    if (m.via === 'ladder') say(persona, isHuman ? 'humanLadder' : 'ladder');
    else if (m.via === 'snake') say(persona, isHuman ? 'humanSnake' : 'snake');
    else if (m.roll === 6 && !isHuman) say(persona, 'six');
  }

  /** After the engine moved the pawn (lastMove is set): show it. */
  async function afterMove(): Promise<void> {
    const m = state.lastMove as MoveRecord;
    ui.dice.clearChoice();
    await playMove(m);
    refreshHud();
    react(m);
    if (m.playerId === HUMAN_ID) o.onMove(state, m);
    if (m.roll === 6 && !m.overshoot) await sleep(120);
  }

  async function humanTurn(): Promise<void> {
    ui.board.setTurn(HUMAN_ID);
    core.audio.playSfx('turn');
    ui.dice.setEnabled(true);
    ui.setStatus(turnsUntilChoice(state) === 1 ? t('play.yourTurnTwo') : t('play.yourTurn'));
    if (botOn) await sleep(200);
    else {
      idleOff = scope.timeout(() => {
        ui.setStatus(t('voice.sl.roll'));
        say(anyPersona(), 'idle', true);
      }, 9000);
      await new Promise<void>((r) => (rollWaiter = r));
      rollWaiter = null;
      idleOff();
    }
    if (flow.dead) return;
    ui.dice.setEnabled(false);
    await gate();
    step({ type: 'roll' });
    await resolveDice(true);
  }

  /** Show what the engine did after a roll/pick, and drive any decisions the human has to make. */
  async function resolveDice(human: boolean): Promise<void> {
    if (phaseNow() === 'pick') {
      const options = state.dice as [number, number];
      await showRoll(null);
      core.audio.playSfx('diceChoice');
      let index: 0 | 1;
      if (human) {
        ui.setStatus(t('play.pick'));
        index = botOn
          ? (bot.decide(state, botRng) as { index: 0 | 1 }).index
          : await alive(ui.dice.choose(options));
        if (botOn) {
          ui.dice.showChoice(options, index);
          await sleep(500);
        }
      } else {
        index = (cpuOf(me()).decide(state) as { index: 0 | 1 }).index;
        ui.dice.showChoice(options, index);
        ui.setStatus(t('play.cpuKeeps', { name: nameOf(me()), n: options[index] }));
        await sleep(900);
      }
      step({ type: 'pick', index });
      ui.dice.clearChoice();
      ui.dice.show(options[index]);
      if (phaseNow() === 'decide') return decideStep(human);
      return afterMove();
    }
    if (phaseNow() === 'decide') {
      await showRoll(state.roll);
      return decideStep(human);
    }
    // the move happened at once (no re-roll to offer)
    const m = state.lastMove as MoveRecord;
    await showRoll(m.roll);
    ui.setStatus(rolledText(m.playerId, m.roll));
    await sleep(150);
    return afterMove();
  }

  const rolledText = (id: string, n: number): string =>
    id === HUMAN_ID ? t('play.youRolled', { n }) : t('play.rolled', { name: nameOf(id), n });

  async function decideStep(human: boolean): Promise<void> {
    const rollValue = state.roll as number;
    const canRe = state.rules.reroll && playerById(state, me()).rerollLeft;
    let choice: 'accept' | 'reroll';
    if (human && !botOn) {
      ui.setStatus(
        canRe ? t('play.decide', { n: rollValue }) : t('play.youRolled', { n: rollValue }),
      );
      ui.showDecision(canRe, rollValue);
      choice = await new Promise<'accept' | 'reroll'>((r) => (decide = r));
      decide = null;
      ui.hideDecision();
    } else if (human) {
      await sleep(150);
      choice = (bot.decide(state, botRng) as { type: 'accept' | 'reroll' }).type;
    } else {
      ui.setStatus(rolledText(me(), rollValue));
      await sleep(300);
      choice = (cpuOf(me()).decide(state) as { type: 'accept' | 'reroll' }).type;
    }
    await gate();
    if (choice === 'reroll') {
      core.audio.playSfx('reroll');
      const who = me();
      ui.setStatus(t('play.rerolled', { name: nameOf(who) }));
      step({ type: 'reroll' });
      refreshHud();
      await showRoll((state.lastMove as MoveRecord).roll);
    } else {
      step({ type: 'accept' });
    }
    return afterMove();
  }

  async function cpuTurn(): Promise<void> {
    const id = me();
    const cpu = cpuOf(id);
    ui.board.setTurn(id);
    ui.dice.setEnabled(false);
    core.audio.playSfx('cpuTurn');
    ui.setStatus(t('play.cpuTurn', { name: nameOf(id) }));
    await sleep(cpu.thinkMs());
    if (flow.dead) return;
    step(cpu.decide(state));
    await resolveDice(false);
  }

  async function run(): Promise<void> {
    say(personaIds[0] as string, 'start', true);
    let moves = 0;
    while (!flow.dead && !isOver(state)) {
      await gate();
      ui.setTurn(state.turns.index);
      if (currentSeatOf(state).kind === 'human') await humanTurn();
      else await cpuTurn();
      if (__NAIJA_TEST__ && o.test?.liveMoves && ++moves >= o.test.liveMoves && !isOver(state)) {
        fastForward();
      }
    }
    if (flow.dead || !isOver(state)) return;
    over = true;
    ui.board.setTurn(null);
    ui.dice.setEnabled(false);
    const winner = state.winner as string;
    if (winner === HUMAN_ID) say(anyPersona(), 'lose', true);
    else say(cpuSeats.find((s) => s.id === winner)?.persona as string, 'win', true);
    await sleep(winner === HUMAN_ID ? 900 : 1300);
    if (!flow.dead) o.onEnd(state);
  }

  const fastForward = (): GameState => {
    flow.setFast(true);
    botOn = true;
    for (let n = 0; !isOver(state) && n < 20000; n++) {
      const seat = currentSeatOf(state);
      const choice =
        seat.kind === 'human' ? bot.decide(state, botRng) : cpuOf(seat.id).decide(state);
      const legal = legalActions(state);
      const before = state.lastMove;
      step(legal.find((a) => a.type === choice.type) ? choice : (legal[0] as Action));
      if (state.lastMove !== before && state.lastMove?.playerId === HUMAN_ID) {
        o.onMove(state, state.lastMove);
      }
    }
    over = true;
    return state;
  };

  return {
    el: ui.el,
    humanId: HUMAN_ID,
    getState: () => state,
    ...(__NAIJA_TEST__ ? { fastForward } : {}),
    start() {
      core.audio.playMusic(playMusic);
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
