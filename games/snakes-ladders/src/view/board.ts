import { createMover, trackSteps, type Mover, type PathStep } from '@naija/core/board-kit';
import { createScope } from '@naija/core/lifecycle';
import { h, type Component } from '@naija/core/ui-kit';
import type { BoardLayout } from '../rules/config';
import { renderConnectors } from './connectors';
import { squareGrid } from './geometry';

export interface BoardPlayer {
  id: string;
  /** pawn artwork url */
  pawn: string;
  /** accessible name, e.g. "Tari" */
  label: string;
}

export interface BoardOptions {
  layout: BoardLayout;
  players: readonly BoardPlayer[];
  /** true = pawns jump instead of hopping */
  reducedMotion?: () => boolean;
  /** animation speed factor: 1 = normal, 0.25 = four times faster (test builds only) */
  tempo?: number;
  /** accessible name of the board */
  label: string;
  /** board background artwork (no numbers, ladders or snakes baked in) */
  bgSrc: string;
}

export interface BoardView extends Component {
  /** Put every pawn on its square without animating. */
  setPositions(pos: Readonly<Record<string, number>>): void;
  /** Hop `id` square by square from `from` to `to` (forward or back). */
  hop(id: string, from: number, to: number, onStep?: (i: number) => void): Promise<void>;
  /** Glide along a ladder or snake. */
  slide(id: string, to: number): Promise<void>;
  /** The pawn cannot move (exact-roll rule): a quick shake in place. */
  nope(id: string): Promise<void>;
  flash(jumpId: string): void;
  /** Mark whose turn it is (a pulse around that pawn). */
  setTurn(id: string | null): void;
  /** Finish every running animation at once. */
  finish(): void;
}

const cell = (n: number, size: number): { x: number; y: number } =>
  squareGrid(Math.max(1, n), size);

export function createBoard(o: BoardOptions): BoardView {
  const scope = createScope();
  const size = o.layout.size;
  const tempo = o.tempo ?? 1;
  const bg = h('img', {
    class: 'sl-board__bg',
    src: o.bgSrc,
    alt: '',
    draggable: 'false',
  });
  const overlay = renderConnectors(o.layout);

  // Square numbers are real text (crisp, translatable), drawn above the overlay.
  const nums = h('div', { class: 'sl-board__nums', 'aria-hidden': 'true' });
  for (let n = 1; n <= size * size; n++) {
    const g = cell(n, size);
    const s = h('span', { class: 'sl-n', text: String(n) });
    s.style.gridRow = String(g.y + 1);
    s.style.gridColumn = String(g.x + 1);
    nums.append(s);
  }

  const pawnsLayer = h('div', { class: 'sl-board__pawns' });
  interface Pawn {
    el: HTMLElement;
    mover: Mover;
    square: number;
    index: number;
  }
  const pawns = new Map<string, Pawn>();
  const format = (x: number, y: number): string => `translate(${x * 100}%,${y * 100}%)`;
  o.players.forEach((p, index) => {
    const tok = h('span', { class: 'sl-pawn__tok' }, [
      h('img', { src: p.pawn, alt: '', draggable: 'false' }),
    ]);
    const el = h(
      'div',
      { class: 'sl-pawn', 'data-pawn': p.id, role: 'img', 'aria-label': p.label },
      [h('span', { class: 'sl-pawn__halo' }), tok],
    );
    const mover = createMover(el, {
      scope,
      format,
      reducedMotion: o.reducedMotion,
      hopMs: Math.round(170 * tempo) || 1,
      slideMs: Math.round(650 * tempo) || 1,
    });
    pawns.set(p.id, { el, mover, square: 0, index });
    pawnsLayer.append(el);
  });

  /** Pawns that share a square sit in its four corners; a lone pawn sits in the middle. */
  const arrange = (): void => {
    const bySquare = new Map<number, Pawn[]>();
    for (const p of pawns.values()) {
      const key = Math.max(1, p.square);
      bySquare.set(key, [...(bySquare.get(key) ?? []), p]);
    }
    for (const group of bySquare.values()) {
      for (const p of group) {
        p.el.dataset.slot = group.length > 1 ? String(p.index % 4) : 'solo';
      }
    }
  };

  const board = h('div', { class: 'sl-board', role: 'group', 'aria-label': o.label }, [
    bg,
    overlay.svg as unknown as Node,
    nums,
    pawnsLayer,
  ]);
  const el = h('div', { class: 'sl-board-wrap' }, [board]);

  const place = (id: string, square: number): void => {
    const p = pawns.get(id);
    if (!p) return;
    p.square = square;
    p.mover.place(cell(square, size));
  };

  const raise = (id: string, on: boolean): void => {
    const p = pawns.get(id);
    if (p) p.el.style.zIndex = on ? '5' : '';
  };

  return {
    el,
    setPositions(pos) {
      for (const id of pawns.keys()) place(id, pos[id] ?? 0);
      arrange();
    },
    async hop(id, from, to, onStep) {
      const p = pawns.get(id);
      if (!p) return;
      raise(id, true);
      // from the start the pawn waits on square 1's cell: a roll of 1 still bounces in place
      const steps: PathStep[] = trackSteps(Math.max(from, 0), to, (n) => cell(n, size));
      p.square = to;
      arrange();
      await p.mover.run(steps, { onStep: (i) => onStep?.(i) });
      raise(id, false);
    },
    async slide(id, to) {
      const p = pawns.get(id);
      if (!p) return;
      raise(id, true);
      p.square = to;
      arrange();
      await p.mover.run([{ ...cell(to, size), kind: 'slide' }]);
      raise(id, false);
    },
    nope(id) {
      const p = pawns.get(id);
      if (!p || o.reducedMotion?.()) return Promise.resolve();
      return new Promise<void>((resolve) => {
        p.el.classList.add('is-nope');
        scope.timeout(
          () => {
            p.el.classList.remove('is-nope');
            resolve();
          },
          Math.round(360 * tempo) || 1,
        );
      });
    },
    flash: (id) => overlay.flash(id),
    setTurn(id) {
      for (const [pid, p] of pawns) p.el.classList.toggle('is-turn', pid === id);
    },
    finish() {
      for (const p of pawns.values()) p.mover.finish();
    },
    destroy() {
      scope.destroy();
      overlay.clearFlash();
    },
  };
}
