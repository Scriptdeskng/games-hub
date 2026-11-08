import { createBanter } from '@naija/core/ai-kit';
import { createFlow } from '@naija/core/board-kit';
import type { Core } from '@naija/core/boot';
import { createInput } from '@naija/core/input';
import { createScope } from '@naija/core/lifecycle';
import { createRng } from '@naija/core/rng';
import type { Component, Difficulty } from '@naija/core/ui-kit';
import { brainsFor, createOpponents, personaById, pickPersonas, type Cpu } from '../ai';
import { cardOf, type ShapeName } from '../rules/cards';
import type { Rules } from '../rules/config';
import {
  announce,
  apply,
  canAnnounce,
  canCatch,
  catchPlayer,
  createGame,
  exposedSeat,
  isOver,
  legalPlays,
  mustDraw,
  type GameState,
} from '../rules/engine';
import { canDraw, legalActions, type Action } from '../rules/legal';
import { viewFor } from '../rules/view';
import { createPresenter } from './present';
import { createPlayUi } from './table';

export interface PlayStats {
  /** CPUs the human caught without "Last card" */
  catches: number;
  /** times the human was caught */
  caught: number;
}

export interface PlayOptions {
  difficulty: Difficulty;
  cpuCount: number;
  rules: Rules;
  seed: number;
  /** with no card to play, draw without asking (setting, default on) */
  autoDraw: boolean;
  /** quicker animations and CPU pauses (setting) */
  fastPlay: boolean;
  /** after every human action (the app reports the score to the portal) */
  onMove(state: GameState): void;
  onEnd(state: GameState, stats: PlayStats): void;
  onRestart(): void;
  onQuit(): void;
  /** Test builds only: animation speed, an auto-played human, and `liveMoves` real steps first. */
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
export const HUMAN_SEAT = 0;
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
  const personaIds = pickPersonas(o.cpuCount);
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
    first: (o.seed >>> 2) % (o.cpuCount + 1),
  });
  const cpus: Cpu[] = createOpponents({ seed: o.seed, difficulty: o.difficulty, seats: cpuSeats });
  const cpuAt = (seat: number): Cpu => cpus[seat - 1] as Cpu;
  const seatName = (seat: number): string => state.turns.seats[seat]?.name ?? String(seat);
  const botBrain = brainsFor('balanced').hard;
  const botRng = createRng(o.seed ^ 0xb07);
  let botOn = o.test?.bot ?? false;
  const stats: PlayStats = { catches: 0, caught: 0 };
  let over = false;

  const banter = createBanter({
    t,
    rng: createRng(o.seed ^ 0xba17),
    show: (line) => ui.bubble.show(line),
    chance: {
      play: 0.12,
      pickTwo: 0.55,
      gotPickTwo: 0.6,
      market: 0.6,
      suspension: 0.5,
      holdOn: 0.4,
      whotCall: 0.5,
    },
  });
  const say = (seat: number, event: string, force = false): void => {
    const id = personaIds[seat - 1];
    if (id) banter.say(personaById(id), event, { force });
  };

  // ---- view ----
  const ui = createPlayUi({
    core,
    cpus: cpuSeats.map((s, i) => ({
      seat: i + 1,
      name: s.name,
      avatar: personaById(s.persona).avatar,
    })),
    lastCardOn: state.rules.lastCard,
    personaName: (id) => t(personaById(id).nameKey),
    onTapCard: (id) => onTapCard(id),
    onFlickCard: (id) => onFlick(id),
    onDraw: () => onDrawTap(),
    onLast: () => onLast(),
    onCatch: (seat) => onCatch(seat),
    onPause: () => flow.pause(),
  });
  const flow = createFlow({
    core,
    scope,
    tempo,
    isOver: () => over,
    onRestart: o.onRestart,
    onQuit: o.onQuit,
  });
  const { gate, alive, sleep } = flow;
  const presenter = createPresenter({ core, ui, flow, tempo, state, seatName, say, reduced });

  // ---- committing actions: state changes at once, the show is queued in order ----
  let queue: Promise<void> = Promise.resolve();
  let awaiting: ((a: Action) => void) | null = null;
  const playable = (): ReadonlySet<number> | null =>
    awaiting && !over ? new Set(legalPlays(state)) : null;

  function flags(): void {
    ui.seats.seats.forEach((s, i) => {
      const exposed = exposedSeat(state, i + 1);
      s.setCatchable(exposed && canCatch(state, HUMAN_SEAT, i + 1));
      const len = (state.hands[i + 1] as number[]).length;
      s.setCalled(state.calls[i + 1] !== 'none' && len <= 2);
    });
    ui.setLast(canAnnounce(state, HUMAN_SEAT), exposedSeat(state, HUMAN_SEAT));
    const forced = awaiting !== null && mustDraw(state);
    ui.setTake(forced);
    ui.seats.seats.forEach((s, i) => s.setTurn(state.turns.index === i + 1 && !over));
  }

  function commit(next: GameState): void {
    state = next;
    const events = next.last;
    queue = queue.then(async () => {
      await presenter.present(events);
      presenter.render(playable());
      flags();
    });
    flags();
  }
  const drain = (): Promise<void> => alive(queue);

  // ---- the human's input ----
  const illegal = (key: string): void => {
    core.audio.playSfx('illegal');
    ui.setStatus(t(key));
  };
  function submit(a: Action): void {
    const r = awaiting;
    awaiting = null;
    r?.(a);
  }
  function onTapCard(id: number): void {
    if (!awaiting || over || flow.modalOpen) return;
    if (!legalPlays(state).includes(id)) return illegal('whot.noFit');
    if (ui.hand.selected !== id) {
      ui.hand.select(id);
      // focus follows the selection, so Enter/Space (a native click) plays this card
      ui.hand.cardEl(id)?.focus({ preventScroll: true });
      core.audio.playSfx('select');
      ui.setStatus(t('whot.confirm'));
      return;
    }
    void confirmPlay(id);
  }
  function onFlick(id: number): void {
    if (!awaiting || over || flow.modalOpen) return;
    if (!legalPlays(state).includes(id)) return illegal('whot.noFit');
    ui.hand.select(id);
    void confirmPlay(id);
  }
  async function confirmPlay(id: number): Promise<void> {
    if (cardOf(id).shape === 'whot') {
      ui.setStatus(t('whot.pick.title'));
      const shape: ShapeName | null = await alive(ui.pickShape());
      if (shape === null) return;
      core.audio.playSfx('shapePick');
      if (awaiting) submit({ type: 'play', card: id, call: shape });
    } else submit({ type: 'play', card: id });
  }
  function onDrawTap(): void {
    if (!awaiting || over || flow.modalOpen) return;
    if (!canDraw(state, state.hands[HUMAN_SEAT] as number[])) return illegal('whot.mustPlay');
    submit({ type: 'draw' });
  }
  function onLast(): void {
    if (over || flow.modalOpen || !canAnnounce(state, HUMAN_SEAT)) return;
    commit(announce(state, HUMAN_SEAT));
  }
  function onCatch(seat: number): void {
    if (over || flow.modalOpen || !canCatch(state, HUMAN_SEAT, seat)) return;
    stats.catches++;
    commit(catchPlayer(state, HUMAN_SEAT, seat));
  }

  // keys: 1-9 pick/play the nth card, arrows move, Enter/Space plays, D draw, L last card, P/Esc pause
  const live =
    (fn: (e: KeyboardEvent) => void) =>
    (e: KeyboardEvent): void => {
      if (!flow.modalOpen && !over && !ui.pickerOpen) fn(e);
    };
  const step = (dir: number) =>
    live((e) => {
      if (!awaiting) return;
      e.preventDefault();
      const ids = ui.hand.ids;
      const at = ids.indexOf(ui.hand.selected ?? -1);
      const to = ids[(at + dir + ids.length) % ids.length];
      if (to !== undefined) {
        ui.hand.select(to);
        (ui.hand.cardEl(to) as HTMLElement | undefined)?.focus({ preventScroll: true });
      }
    });
  const primary = live((e) => {
    if ((e.target as HTMLElement | null)?.closest?.('button')) return; // native click handles it
    const sel = ui.hand.selected;
    if (!awaiting || sel === null) return;
    e.preventDefault();
    onTapCard(sel);
  });
  const keys: Record<string, (e: KeyboardEvent) => void> = {
    ArrowRight: step(1),
    ArrowDown: step(1),
    ArrowLeft: step(-1),
    ArrowUp: step(-1),
    Enter: primary,
    ' ': primary,
    d: live(() => onDrawTap()),
    l: live(() => onLast()),
    p: () => !ui.pickerOpen && flow.toggle(),
    Escape: () => !ui.pickerOpen && flow.toggle(),
  };
  for (let n = 1; n <= 9; n++) {
    keys[String(n)] = live(() => {
      const id = ui.hand.ids[n - 1];
      if (id !== undefined) onTapCard(id);
    });
  }
  const input = createInput(ui.el, { keys });

  // ---- turns ----
  async function humanTurn(): Promise<void> {
    const legal = legalActions(state, state.hands[HUMAN_SEAT] as number[]);
    const forced = legal.length === 1 && legal[0]?.type === 'draw';
    const pick = state.pending;
    ui.setStatus(
      t(
        pick ? 'whot.pending' : forced ? 'whot.mustDraw' : 'whot.yourTurn',
        pick ? { n: pick.count } : undefined,
      ),
    );
    core.audio.playSfx('turn');
    let action: Action;
    if (botOn) {
      await sleep(180);
      action = botBrain.decide(viewFor(state, HUMAN_SEAT), botRng);
    } else if (forced && o.autoDraw) {
      await sleep(750);
      action = { type: 'draw' };
    } else {
      const idle = scope.timeout(() => ui.setStatus(t('whot.nudge')), 9000);
      const chosen = new Promise<Action>((r) => (awaiting = r));
      presenter.render(playable());
      flags();
      action = await alive(chosen);
      idle();
    }
    awaiting = null;
    ui.hand.select(null);
    if (flow.dead) return;
    await gate();
    commit(apply(state, action));
    await drain();
    o.onMove(state);
  }

  async function cpuTurn(seat: number): Promise<void> {
    const cpu = cpuAt(seat);
    core.audio.playSfx('cpuTurn');
    ui.setStatus(t('whot.cpuTurn', { name: seatName(seat) }));
    flags();
    await sleep(cpu.thinkMs());
    for (let guard = 0; guard < 8 && !flow.dead; guard++) {
      await gate();
      const a = cpu.decide(viewFor(state, seat));
      if (a.type === 'catch' && a.target === HUMAN_SEAT) stats.caught++;
      commit(apply(state, a));
      await drain();
      if (a.type !== 'catch') return;
    }
  }

  async function run(): Promise<void> {
    core.audio.playSfx('shuffle');
    presenter.render(null);
    flags();
    ui.hand.el.querySelectorAll('.whot-card').forEach((c, i) => {
      if (!reduced()) {
        const el = c as HTMLElement;
        el.style.animationDelay = `${Math.round(i * 60 * tempo)}ms`;
        el.style.animationDuration = `${Math.round(320 * tempo) || 1}ms`;
        el.classList.add('is-draw');
        core.audio.playSfx('deal', { pitch: 1 + i * 0.02 });
        scope.timeout(
          () => {
            el.classList.remove('is-draw');
            el.style.animationDelay = '';
          },
          Math.round((i * 60 + 340) * tempo),
        );
      }
    });
    await sleep(450);
    let steps = 0;
    while (!flow.dead && !isOver(state)) {
      await gate();
      if (flow.dead || isOver(state)) break;
      const seat = state.turns.index;
      if (seat === HUMAN_SEAT) await humanTurn();
      else await cpuTurn(seat);
      if (__NAIJA_TEST__ && o.test?.liveMoves && ++steps >= o.test.liveMoves && !isOver(state)) {
        fastForward();
      }
    }
    if (flow.dead || !isOver(state)) return;
    over = true;
    awaiting = null;
    await drain();
    flags();
    const winner = state.turns.seats.findIndex((s) => s.id === state.winner);
    if (winner === HUMAN_SEAT) say(1, 'lose', true);
    else say(winner, 'win', true);
    await sleep(winner === HUMAN_SEAT ? 900 : 1300);
    if (!flow.dead) o.onEnd(state, stats);
  }

  /** Test builds: play the rest of the game at once (a Hard bot plays the human seat). */
  const fastForward = (): GameState => {
    flow.setFast(true);
    botOn = true;
    for (let n = 0; !isOver(state) && n < 20000; n++) {
      const seat = state.turns.index;
      const a =
        seat === HUMAN_SEAT
          ? botBrain.decide(viewFor(state, seat), botRng)
          : cpuAt(seat).decide(viewFor(state, seat));
      if (a.type === 'catch') {
        if (seat === HUMAN_SEAT) stats.catches++;
        else if (a.target === HUMAN_SEAT) stats.caught++;
      }
      state = apply(state, a);
      if (seat === HUMAN_SEAT && a.type !== 'catch') o.onMove(state);
    }
    over = true;
    queue = Promise.resolve();
    presenter.snapTo(state);
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
      awaiting = null;
      input.destroy();
      ui.destroy();
      scope.destroy();
    },
  };
}
