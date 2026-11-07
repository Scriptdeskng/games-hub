import { createMover, type Mover, type PathStep } from '@naija/core/board-kit';
import { createScope } from '@naija/core/lifecycle';
import { h, type Component } from '@naija/core/ui-kit';
import { HOME, YARD } from '../rules/config';
import { seedCentre, topLeft, type Cell } from './geometry';
import { layoutStacks, type Placement, type SeedRef } from './stacks';

const ASSETS = './assets';
/** seat colour names, slot order (assets/seeds/seed-<colour>.svg) */
export const COLOURS = ['red', 'green', 'yellow', 'indigo'] as const;

export interface BoardPlayer {
  id: string;
  slot: number;
  /** accessible name, e.g. "Funmi" */
  label: string;
  human: boolean;
}

export interface BoardOptions {
  players: readonly BoardPlayer[];
  /** seeds per player (2 in quick mode, else 4) */
  seeds: number;
  reducedMotion?: () => boolean;
  /** animation speed factor: 1 = normal, 0.25 = four times faster (test builds only) */
  tempo?: number;
  /** accessible name of the board */
  label: string;
  /** accessible name of a movable seed: (seed number from 1, steps) */
  seedLabel(n: number, steps: number): string;
}

/** A seed the human may move, with where it would land. */
export interface MovableSeed {
  seed: number;
  /** progress after the move */
  to: number;
  steps: number;
}

export interface BoardView extends Component {
  /** Put every seed where the state says without animating. `pos[id][seed]` is its progress. */
  syncSeeds(pos: Readonly<Record<string, readonly number[]>>): void;
  /** Hop a seed square by square (a release from the yard glides out). Resolves when it landed. */
  move(
    id: string,
    seed: number,
    from: number,
    to: number,
    onStep?: (i: number) => void,
  ): Promise<void>;
  /** A captured seed: burst at its square, then it flies back to its yard pit. */
  sendHome(id: string, seed: number, from: number): Promise<void>;
  /** Pop an effect (capture, six or home) on a cell centre. */
  pop(kind: 'capture' | 'six' | 'home', at: Cell): Promise<void>;
  /** Mark the human's legal seeds (ring + 44 px target); `null` clears them. */
  setMovable(moves: readonly MovableSeed[] | null, onPick?: (seed: number) => void): void;
  /** Keyboard / hover selection among the movable seeds (shows the landing marker). */
  setSelected(seed: number | null): void;
  /** Whose turn it is: that colour's seeds bob. */
  setTurn(id: string | null): void;
}

interface Seed {
  key: string;
  id: string;
  slot: number;
  index: number;
  progress: number;
  el: HTMLElement;
  body: HTMLElement;
  badge: HTMLImageElement;
  hit: HTMLButtonElement | null;
  mover: Mover;
  moving: boolean;
  placed: Placement | null;
}

const format = (x: number, y: number): string => `translate(${x * 100}%,${y * 100}%)`;

export function createBoard(o: BoardOptions): BoardView {
  const scope = createScope();
  const tempo = o.tempo ?? 1;
  const reduced = (): boolean => o.reducedMotion?.() ?? false;
  const seeds: Seed[] = [];
  let onPick: ((seed: number) => void) | undefined;
  let moves: readonly MovableSeed[] = [];
  let selected: number | null = null;

  const bg = h('img', {
    class: 'ld-board__bg',
    src: `${ASSETS}/board/board.svg`,
    alt: '',
    draggable: 'false',
  });
  const layer = h('div', { class: 'ld-board__seeds' });
  const fxLayer = h('div', { class: 'ld-board__fx', 'aria-hidden': 'true' });
  const marker = h('div', { class: 'ld-target', hidden: '' }, [
    h('img', { src: `${ASSETS}/fx/target-marker.svg`, alt: '', draggable: 'false' }),
  ]);
  fxLayer.append(marker);

  // ---- seeds ----
  const centre = (s: Seed, progress = s.progress): Cell =>
    seedCentre(s.slot, progress, s.index, o.seeds);
  for (const p of o.players) {
    for (let index = 0; index < o.seeds; index++) {
      const colour = COLOURS[p.slot] as string;
      const badge = h('img', { class: 'ld-seed__badge', alt: '', draggable: 'false', hidden: '' });
      const body = h('span', { class: 'ld-seed__body' }, [
        h('img', {
          class: 'ld-seed__img',
          src: `${ASSETS}/seeds/seed-${colour}.svg`,
          alt: '',
          draggable: 'false',
        }),
        badge,
      ]);
      const el = h('div', { class: 'ld-seed', 'data-seat': String(p.slot) }, [body]);
      let hit: HTMLButtonElement | null = null;
      if (p.human) {
        el.prepend(
          h('img', {
            class: 'ld-seed__ring',
            src: `${ASSETS}/fx/move-ring.svg`,
            alt: '',
            draggable: 'false',
          }),
        );
        hit = h('button', { type: 'button', class: 'ld-seed__hit', hidden: '' });
        el.append(hit);
      }
      const mover = createMover(el, {
        scope,
        format,
        reducedMotion: reduced,
        hopMs: Math.round(150 * tempo) || 1,
        slideMs: Math.round(520 * tempo) || 1,
        lift: 0.4,
      });
      const seed: Seed = {
        key: `${p.id}:${index}`,
        id: p.id,
        slot: p.slot,
        index,
        progress: YARD,
        el,
        body,
        badge,
        hit,
        mover,
        moving: false,
        placed: null,
      };
      if (hit) {
        scope.on(hit, 'click', () => onPick?.(index));
        const aim = (): void => api.setSelected(index);
        scope.on(hit, 'focus', aim);
        scope.on(hit, 'pointerenter', aim);
      }
      seeds.push(seed);
      layer.append(el);
      mover.place(topLeft(centre(seed)));
    }
  }

  /** Re-draw stacks: every seed's offset, scale and badge from where the seeds are now. */
  function arrange(): void {
    const refs: SeedRef[] = seeds
      .filter((s) => !s.moving)
      .map((s) => ({ key: s.key, slot: s.slot, progress: s.progress }));
    const layout = layoutStacks(refs);
    for (const s of seeds) {
      const p = layout.get(s.key) ?? { dx: 0, dy: 0, scale: 1, badge: 0 };
      s.el.classList.toggle('is-home', s.progress >= HOME && !s.moving);
      s.el.classList.toggle('is-yard', s.progress < 0);
      const was = s.placed;
      if (
        was &&
        was.dx === p.dx &&
        was.dy === p.dy &&
        was.scale === p.scale &&
        was.badge === p.badge
      ) {
        continue;
      }
      s.placed = p;
      s.body.style.transform = `translate(${p.dx * 100}%,${p.dy * 100}%) scale(${p.scale})`;
      if (p.badge) {
        s.badge.setAttribute('src', `${ASSETS}/seeds/badge-${p.badge}.svg`);
        s.badge.hidden = false;
      } else s.badge.hidden = true;
    }
  }

  const find = (id: string, index: number): Seed =>
    seeds.find((s) => s.id === id && s.index === index) as Seed;

  // ---- effects (three pooled elements, reused) ----
  const fx = {
    capture: h('img', { src: `${ASSETS}/fx/capture-burst.svg`, alt: '', draggable: 'false' }),
    six: h('img', { src: `${ASSETS}/fx/six-burst.svg`, alt: '', draggable: 'false' }),
    home: h('img', { src: `${ASSETS}/fx/home-rosette.svg`, alt: '', draggable: 'false' }),
  };
  const fxBox = {
    capture: h('div', { class: 'ld-fx', hidden: '' }, [fx.capture]),
    six: h('div', { class: 'ld-fx', hidden: '' }, [fx.six]),
    home: h('div', { class: 'ld-fx', hidden: '' }, [fx.home]),
  };
  fxLayer.append(fxBox.capture, fxBox.six, fxBox.home);

  /** effect animations in flight: cancelled once, on destroy (no per-call cleanup piling up) */
  const running = new Set<Animation>();
  scope.add(() => running.forEach((a) => a.cancel()));

  function pop(kind: 'capture' | 'six' | 'home', at: Cell): Promise<void> {
    const box = fxBox[kind];
    const img = fx[kind];
    if (reduced() || typeof img.animate !== 'function') return Promise.resolve();
    const t = topLeft(at);
    box.style.transform = format(t.x, t.y);
    box.hidden = false;
    return new Promise<void>((resolve) => {
      const a = img.animate(
        [
          { transform: 'scale(.2)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1, offset: 0.35 },
          { transform: 'scale(1.25)', opacity: 0 },
        ],
        { duration: Math.round(520 * tempo) || 1, easing: 'ease-out' },
      );
      running.add(a);
      const done = (): void => {
        running.delete(a);
        box.hidden = true;
        resolve();
      };
      a.onfinish = done;
      a.oncancel = done;
    });
  }

  // ---- movable seeds, selection, landing marker ----
  function showMarker(on: boolean, at?: Cell): void {
    marker.hidden = !on;
    if (on && at) {
      const t = topLeft(at);
      marker.style.transform = format(t.x, t.y);
    }
  }

  const board = h('div', { class: 'ld-board', role: 'group', 'aria-label': o.label }, [
    bg,
    fxLayer,
    layer,
  ]);
  const el = h('div', { class: 'ld-board-wrap' }, [board]);
  arrange();
  const api: BoardView = {
    el,
    syncSeeds(pos) {
      for (const s of seeds) {
        s.progress = pos[s.id]?.[s.index] ?? YARD;
        s.mover.place(topLeft(centre(s)));
      }
      arrange();
    },
    async move(id, index, from, to, onStep) {
      const s = find(id, index);
      s.moving = true;
      s.progress = to;
      s.el.style.zIndex = '6';
      arrange();
      const steps: PathStep[] = [];
      if (from === YARD) {
        steps.push({ ...topLeft(centre(s, 0)), kind: 'slide' });
      } else {
        for (let p = from + 1; p <= to; p++) steps.push({ ...topLeft(centre(s, p)), kind: 'hop' });
      }
      await s.mover.run(steps, { onStep: (i) => onStep?.(i) });
      s.moving = false;
      s.el.style.zIndex = '';
      arrange();
    },
    async sendHome(id, index, from) {
      const s = find(id, index);
      await pop('capture', centre(s, from));
      s.moving = true;
      s.progress = YARD;
      s.el.style.zIndex = '6';
      arrange();
      await s.mover.run([{ ...topLeft(centre(s, YARD)), kind: 'slide' }]);
      s.moving = false;
      s.el.style.zIndex = '';
      arrange();
    },
    pop,
    setMovable(list, pick) {
      moves = list ?? [];
      onPick = pick;
      selected = null;
      showMarker(false);
      for (const s of seeds) {
        if (!s.hit) continue;
        const m = moves.find((x) => x.seed === s.index);
        s.el.classList.toggle('is-movable', !!m);
        s.el.classList.remove('is-selected');
        s.hit.hidden = !m;
        if (m) s.hit.setAttribute('aria-label', o.seedLabel(s.index + 1, m.steps));
      }
    },
    setSelected(index) {
      const m = moves.find((x) => x.seed === index);
      selected = m ? index : null;
      for (const s of seeds)
        s.el.classList.toggle('is-selected', s.hit !== null && s.index === selected);
      if (m) {
        const s = seeds.find((x) => x.hit && x.index === m.seed) as Seed;
        showMarker(true, centre(s, m.to));
      } else showMarker(false);
    },
    setTurn(id) {
      for (const s of seeds) s.el.classList.toggle('is-turn', s.id === id);
    },
    destroy() {
      scope.destroy();
    },
  };
  return api;
}
