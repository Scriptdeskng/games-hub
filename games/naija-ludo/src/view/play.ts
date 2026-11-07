import { createBanter, type Banter } from '@naija/core/ai-kit';
import { createFlow } from '@naija/core/board-kit';
import type { Core } from '@naija/core/boot';
import { createInput } from '@naija/core/input';
import { createScope } from '@naija/core/lifecycle';
import { createRng } from '@naija/core/rng';
import type { Component, Difficulty } from '@naija/core/ui-kit';
import { createHardBrain, createOpponents, personaById, pickPersonas, type Cpu } from '../ai';
import { isSafeSquare, trackIndex } from '../rules/board';
import { HOME, LAST_TRACK, MAX_ROLL, seedsPer, type Rules } from '../rules/config';
import {
  apply,
  createGame,
  currentSeatOf,
  homeCount,
  isOver,
  legalMoves,
  playerById,
  type Action,
  type GameState,
  type Move,
  type MoveRecord,
} from '../rules/engine';
import { seedCentre } from './geometry';
import { createChooser } from './chooser';
import { createPlayUi, type PlayUi } from './play-ui';

export interface PlayStats {
  /** opponent seeds the human sent home */
  captures: number;
  /** human seeds that were sent home */
  lost: number;
}

export interface PlayOptions {
  difficulty: Difficulty;
  cpuCount: number;
  rules: Rules;
  seed: number;
  /** move a lone legal seed without asking (setting, default on) */
  autoMove: boolean;
  /** quicker animations and CPU pauses (setting) */
  fastPlay: boolean;
  /** after every human move (the app reports the score to the portal) */
  onMove(state: GameState, move: MoveRecord): void;
  onEnd(state: GameState, stats: PlayStats): void;
  onRestart(): void;
  onQuit(): void;
  /**
   * Test builds only: animation speed factor, an auto-played human, and `liveMoves`: play that
   * many steps through the real UI, then finish the rest of the game instantly (bounded rounds).
   */
  test?: { tempo?: number; bot?: boolean; liveMoves?: number };
}

export interface Play extends Component {
  start(): void;
  snapshot(): GameState;
  stats(): PlayStats;
  /** test builds only */
  fastForward?: () => GameState;
}

export const HUMAN_ID = 'you';
/** the "fast play" setting: every animation and pause takes 0.6 of its time */
const FAST_TEMPO = 0.6;

/** One game: the engine, the CPU opponents and everything on the play screen. */
export function createPlay(core: Core, o: PlayOptions): Play {
  const { t } = core;
  const scope = createScope();
  const tempo = o.test?.tempo ?? (o.fastPlay ? FAST_TEMPO : 1);
  const reduced = (): boolean =>
    core.settings.get('reducedMotion') ||
    (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---- seats, personas, game ----
  const personaIds = pickPersonas(o.seed, o.cpuCount);
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
  const total = seedsPer(state.rules);
  const cpus: Cpu[] = createOpponents({ seed: o.seed, difficulty: o.difficulty, seats: cpuSeats });
  const cpuOf = (id: string): Cpu => cpus.find((c) => c.id === id) as Cpu;
  const personaOf = (id: string): string =>
    cpuSeats.find((s) => s.id === id)?.persona ?? (personaIds[0] as string);
  const bot = createHardBrain();
  const botRng = createRng(o.seed ^ 0xb07);
  let botOn = o.test?.bot ?? false;
  const stats: PlayStats = { captures: 0, lost: 0 };

  /** short HUD label: the persona's first name, or "You" (full names stay in the status line) */
  const shortName = (id: string): string | undefined => {
    const persona = cpuSeats.find((s) => s.id === id)?.persona;
    return persona ? t(`persona.${persona}.short`) : undefined;
  };

  // ---- view ----
  const ui: PlayUi = createPlayUi({
    ctx: core,
    players: state.players.map((p, i) => ({
      id: p.id,
      slot: p.slot,
      label: state.turns.seats[i]?.name ?? p.id,
      name: shortName(p.id) ?? state.turns.seats[i]?.name ?? p.id,
      human: p.id === HUMAN_ID,
    })),
    seeds: total,
    reducedMotion: reduced,
    tempo,
    personaName: (id) => t(personaById(id).nameKey),
    onPause: () => flow.pause(),
  });
  const refresh = (): void => {
    ui.board.syncSeeds(Object.fromEntries(state.players.map((p) => [p.id, p.seeds])));
    for (const p of state.players) ui.setHome(p.id, homeCount(p), total);
  };
  refresh();

  const banter: Banter = createBanter({
    t,
    rng: createRng(o.seed ^ 0xba17),
    show: (line) => ui.bubble.show(line),
    chance: {
      six: 0.3,
      capture: 0.85,
      captured: 0.8,
      humanCapture: 0.8,
      home: 0.7,
      forfeit: 1,
      idle: 1,
    },
  });
  const say = (id: string, event: string, force = false): void => {
    banter.say(personaById(personaOf(id)), event, { force });
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
  let rollWaiter: (() => void) | null = null;
  const chooser = createChooser({
    board: ui.board,
    flow,
    over: () => over,
    onPick: () => core.audio.playSfx('pick'),
  });
  const onHit = (e: KeyboardEvent): boolean =>
    (e.target as HTMLElement | null)?.classList?.contains('ld-seed__hit') ?? false;

  // keys: Space/Enter roll or confirm, 1-4 choose a seed, arrows move the selection, P/Esc pause
  const live =
    (fn: (e: KeyboardEvent) => void) =>
    (e: KeyboardEvent): void => {
      if (!flow.modalOpen && !over) fn(e);
    };
  const primary = live((e) => {
    if (chooser.waiting && onHit(e)) return; // the focused seed's own button handles it
    e.preventDefault();
    if (chooser.waiting) chooser.confirm();
    else rollWaiter?.();
  });
  const arrow = (dir: number) =>
    live((e) => {
      if (!chooser.waiting) return;
      e.preventDefault();
      chooser.cycle(dir);
    });
  const keys: Record<string, (e: KeyboardEvent) => void> = {
    ' ': primary,
    Enter: primary,
    ArrowRight: arrow(1),
    ArrowDown: arrow(1),
    ArrowLeft: arrow(-1),
    ArrowUp: arrow(-1),
    p: () => flow.toggle(),
    Escape: () => flow.toggle(),
  };
  for (let n = 1; n <= 4; n++) keys[String(n)] = live(() => chooser.pickNumber(n));
  const input = createInput(ui.el, { keys });
  ui.dice.onRequest(() => rollWaiter?.());

  // ---- one step: roll, then maybe move ----
  const name = (id: string): string => state.turns.seats.find((s) => s.id === id)?.name ?? id;
  const apply1 = (a: Action): GameState => (state = apply(state, a));

  /** Apply a move and count what it did for the stats. */
  function applyMove(seed: number): MoveRecord {
    apply1({ type: 'move', seed });
    const m = state.lastMove as MoveRecord;
    for (const c of m.captures) {
      if (m.playerId === HUMAN_ID) stats.captures++;
      if (c.playerId === HUMAN_ID) stats.lost++;
    }
    return m;
  }

  async function showRoll(value: number): Promise<void> {
    await alive(ui.dice.roll(value));
    core.audio.playSfx('diceLand');
    if (value === MAX_ROLL) {
      core.audio.playSfx('six');
      ui.sixBurst();
    }
  }

  const rolledText = (id: string, n: number): string =>
    id === HUMAN_ID ? t('play.youRolled', { n }) : t('play.rolled', { name: name(id), n });

  /** Walk the seed, then play what happened where it landed. */
  async function playMove(m: MoveRecord): Promise<void> {
    const slot = playerById(state, m.playerId).slot;
    if (m.release) core.audio.playSfx('release');
    await alive(
      ui.board.move(m.playerId, m.seed, m.from, m.to, (i) =>
        core.audio.playSfx('step', { pitch: 1 + Math.min(0.14, i * 0.025), key: 'step' }),
      ),
    );
    const onTrack = m.to <= LAST_TRACK;
    if (m.to > LAST_TRACK && m.from <= LAST_TRACK && !m.home) core.audio.playSfx('homeColumn');
    else if (onTrack && !m.release && isSafeSquare(trackIndex(slot, m.to))) {
      core.audio.playSfx('safe');
    }
    const mates = playerById(state, m.playerId).seeds.filter((x) => x === m.to).length;
    if (onTrack && mates > 1) core.audio.playSfx('stack');
    for (const c of m.captures) {
      core.audio.playSfx('capture');
      await alive(ui.board.sendHome(c.playerId, c.seed, c.from));
      if (c.playerId === HUMAN_ID) core.audio.playSfx('seedLost');
    }
    if (m.home) {
      core.audio.playSfx('homeReached');
      await alive(ui.board.pop('home', seedCentre(slot, HOME, m.seed, total)));
    }
    for (const p of state.players) ui.setHome(p.id, homeCount(p), total);
  }

  function react(m: MoveRecord): void {
    const who = m.playerId;
    for (const c of m.captures) {
      if (who !== HUMAN_ID) say(who, 'capture');
      if (c.playerId !== HUMAN_ID) say(c.playerId, who === HUMAN_ID ? 'humanCapture' : 'captured');
    }
    if (who !== HUMAN_ID && m.home) say(who, 'home');
  }

  async function chooseSeed(human: boolean, moves: readonly Move[]): Promise<number> {
    if (!human) {
      const cpu = cpuOf(currentSeatOf(state).id);
      // a real choice takes a moment of thought; a forced move does not
      await sleep(moves.length > 1 ? cpu.thinkMs() : 250);
      return (cpu.decide(state) as { seed: number }).seed;
    }
    if (botOn) {
      await sleep(150);
      return (bot.decide(state, botRng) as { seed: number }).seed;
    }
    const roll = state.roll as number;
    return chooser.ask({
      moves,
      roll,
      auto: o.autoMove,
      sleep,
      onAuto: () => ui.setStatus(t('play.autoMove')),
      onChoose: () => {
        ui.setStatus(t('play.pickSeed', { n: roll }));
        return scope.timeout(() => say(personaIds[0] as string, 'idle', true), 12000);
      },
    });
  }

  async function takeTurn(): Promise<void> {
    const seat = currentSeatOf(state);
    const human = seat.kind === 'human';
    const id = seat.id;
    const again =
      state.sixes > 0 || (state.lastMove?.again === 'capture' && state.lastMove.playerId === id);
    ui.board.setTurn(id);
    ui.setTurn(state.turns.index);
    if (human) {
      core.audio.playSfx('turn');
      ui.dice.setEnabled(true);
      ui.setStatus(t(again ? 'play.rollAgain' : 'play.yourTurn'));
      if (botOn) await sleep(200);
      else {
        const idle = scope.timeout(() => {
          ui.setStatus(t('play.nudge'));
          say(personaIds[0] as string, 'idle', true);
        }, 9000);
        await alive(new Promise<void>((r) => (rollWaiter = r)));
        rollWaiter = null;
        idle();
      }
      ui.dice.setEnabled(false);
    } else {
      core.audio.playSfx('cpuTurn');
      ui.setStatus(t('play.cpuTurn', { name: name(id) }));
      await sleep(again ? 150 : 250);
    }
    if (flow.dead) return;
    await gate();
    apply1({ type: 'roll' });
    const r = state.lastRoll as NonNullable<GameState['lastRoll']>;
    await showRoll(r.value);
    ui.setStatus(rolledText(id, r.value));
    if (r.value === MAX_ROLL && !human) say(id, 'six');
    if (r.forfeit) {
      core.audio.playSfx('tripleSix');
      ui.setStatus(t(human ? 'play.forfeitYou' : 'play.forfeit', { name: name(id) }));
      if (!human) say(id, 'forfeit', true);
      await sleep(800);
      return;
    }
    if (r.stuck) {
      core.audio.playSfx('noMove');
      ui.setStatus(t(human ? 'play.stuckYou' : 'play.stuck', { name: name(id) }));
      await sleep(450);
      return;
    }
    await sleep(80);
    const seed = await chooseSeed(human, legalMoves(state));
    await gate();
    const m = applyMove(seed);
    await playMove(m);
    react(m);
    if (human) o.onMove(state, m);
    if (m.again && !m.won) {
      core.audio.playSfx('bonusRoll');
      await sleep(200);
    }
  }

  async function run(): Promise<void> {
    say(personaIds[0] as string, 'start', true);
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
    over = true;
    ui.board.setTurn(null);
    ui.dice.setEnabled(false);
    const winner = state.winner as string;
    if (winner === HUMAN_ID) say(personaIds[0] as string, 'lose', true);
    else say(winner, 'win', true);
    await sleep(winner === HUMAN_ID ? 900 : 1300);
    if (!flow.dead) o.onEnd(state, stats);
  }

  /** Test builds: play the rest of the game at once (Hard plays the human seat). */
  const fastForward = (): GameState => {
    flow.setFast(true);
    botOn = true;
    for (let n = 0; !isOver(state) && n < 50000; n++) {
      const seat = currentSeatOf(state);
      const choice =
        seat.kind === 'human' ? bot.decide(state, botRng) : cpuOf(seat.id).decide(state);
      const before = state.lastMove;
      apply1(choice);
      const m = state.lastMove;
      if (m && m !== before && choice.type === 'move') {
        for (const c of m.captures) {
          if (m.playerId === HUMAN_ID) stats.captures++;
          if (c.playerId === HUMAN_ID) stats.lost++;
        }
        if (m.playerId === HUMAN_ID) o.onMove(state, m);
      }
    }
    over = true;
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
