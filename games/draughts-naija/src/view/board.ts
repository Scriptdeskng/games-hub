import type { Scope } from '@naija/core/lifecycle';
import { h } from '@naija/core/ui-kit';
import { isDarkSquare, isKing, squareName } from '../rules/board';
import type { GameState } from '../rules/engine';
import type { Move } from '../rules/movegen';
import { centreOf, leg, metricsFor, type Metrics } from './geometry';

export type MarkKind =
  'select' | 'move' | 'capturable' | 'hint' | 'last-from' | 'last-to' | 'illegal';
export type FxKind = 'ring' | 'ribbons' | 'crown';

export interface BoardOptions {
  size: 10 | 8;
  scope: Scope;
  /** accessible label of a square: its name and what is on it */
  label(name: string, piece: number): string;
  boardLabel: string;
}

/**
 * The DOM board: only the dark squares exist, as `button.dn-sq` in a CSS grid (see
 * assets/draughts-art.css). The view never decides a rule: it draws the state it is given and the
 * marks the play controller asks for. Motion is CSS transform and opacity only.
 */
export interface BoardView {
  el: HTMLElement;
  readonly size: 10 | 8;
  metrics(): Metrics;
  /** bring the squares in line with `s` (the authority; animations are only decoration) */
  render(s: GameState): void;
  square(i: number): HTMLButtonElement | undefined;
  pieceAt(i: number): HTMLElement | undefined;
  /** exactly these squares carry the mark (others lose it) */
  setMarks(kind: MarkKind, squares: readonly number[]): void;
  /** pieces that must capture get the warning triangle */
  setMust(squares: readonly number[]): void;
  /** the previewed capture path: dashed legs, numbered stones, jumped pieces and a chain badge */
  showPath(m: Move | null, upTo?: number): void;
  /** numbered stones only (used to tell paths apart) */
  showStones(stones: readonly { sq: number; n: number }[]): void;
  fx(kind: FxKind, sq: number): void;
  /** the roving tab stop and, optionally, the keyboard focus */
  setCursor(i: number, focus?: boolean): void;
  readonly cursor: number;
  /** drag a piece by the finger/mouse offset (px); `null` puts it back */
  drag(sq: number, dx: number, dy: number): void;
  drop(sq: number): void;
  shake(sq: number): void;
  /** move a piece element between squares for an animation step; returns the px offset it slid from */
  slide(from: number, to: number): void;
  /** play the capture exit of a piece (removed when the animation ends) */
  take(sq: number): void;
  crown(sq: number): void;
  destroy(): void;
}

const pieceClass = (v: number): string =>
  `dn-piece dn-piece--${v > 0 ? 'light' : 'dark'}${isKing(v) ? ' dn-piece--king' : ''}`;

export function createBoard(o: BoardOptions): BoardView {
  const n = o.size;
  const squares = new Map<number, HTMLButtonElement>();
  const pieces = new Map<number, HTMLElement>();
  const values = new Map<number, number>();
  const marks = new Map<MarkKind | 'path' | 'jumped', Set<number>>();
  let must = new Set<number>();
  let cursor = -1;
  let fxCount = 0;

  const grid = h('div', { class: 'dn-grid' });
  const lines = h('div', { class: 'dn-lines', 'aria-hidden': 'true' });
  const el = h('div', {
    class: 'dn-board',
    'data-n': n,
    style: `--dn-n:${n}`,
    role: 'group',
    'aria-label': o.boardLabel,
  });
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!isDarkSquare(r, c)) continue;
      const i = r * n + c;
      const b = h('button', {
        type: 'button',
        class: 'dn-sq',
        style: `grid-row:${r + 1};grid-column:${c + 1}`,
        'data-r': r,
        'data-c': c,
        'data-i': i,
        tabindex: -1,
        'aria-label': o.label(squareName(i, n), 0),
      });
      squares.set(i, b);
      grid.append(b);
    }
  }
  el.append(grid, lines);

  const metrics = (): Metrics => metricsFor(n, el.clientWidth || 344);

  function setCursor(i: number, focus = false): void {
    if (cursor === i && !focus) return;
    squares.get(cursor)?.setAttribute('tabindex', '-1');
    cursor = i;
    const b = squares.get(i);
    b?.setAttribute('tabindex', '0');
    if (focus) b?.focus({ preventScroll: true });
  }

  function setMarks(kind: MarkKind | 'path' | 'jumped', next: readonly number[]): void {
    const now = marks.get(kind) ?? new Set<number>();
    const want = new Set(next);
    const cls = `is-${kind}`;
    for (const i of now) if (!want.has(i)) squares.get(i)?.classList.remove(cls);
    for (const i of want) if (!now.has(i)) squares.get(i)?.classList.add(cls);
    marks.set(kind, want);
  }

  const applyMust = (): void => {
    for (const [i, p] of pieces) p.classList.toggle('is-must', must.has(i));
  };

  function render(s: GameState): void {
    for (const [i, b] of squares) {
      const v = s.board[i] as number;
      const had = values.get(i) ?? 0;
      let p = pieces.get(i);
      if (v === 0) {
        if (p) {
          p.remove();
          pieces.delete(i);
        }
      } else {
        if (!p) {
          p = h('i', { class: pieceClass(v) });
          b.append(p);
          pieces.set(i, p);
        } else if (had !== v || p.classList.contains('is-taken')) {
          p.className = pieceClass(v);
        }
      }
      if (had !== v) {
        values.set(i, v);
        b.setAttribute('aria-label', o.label(squareName(i, n), v));
      }
    }
    applyMust();
  }

  function clearPathLayer(): void {
    lines.replaceChildren();
    setMarks('path', []);
    setMarks('jumped', []);
    for (const b of squares.values()) b.querySelector(':scope > .dn-step')?.remove();
  }
  const putStep = (sq: number, num: number): void => {
    const b = squares.get(sq);
    if (!b) return;
    b.querySelector(':scope > .dn-step')?.remove();
    b.append(h('b', { class: 'dn-step', text: String(num) }));
  };

  function showStones(stones: readonly { sq: number; n: number }[]): void {
    clearPathLayer();
    setMarks(
      'path',
      stones.map((s) => s.sq),
    );
    for (const s of stones) putStep(s.sq, s.n);
  }

  function showPath(m: Move | null, upTo?: number): void {
    clearPathLayer();
    if (!m) return;
    const hops = Math.min(upTo ?? m.path.length, m.path.length);
    const mt = metrics();
    let from = m.from;
    const stones: number[] = [];
    for (let k = 0; k < hops; k++) {
      const to = m.path[k] as number;
      const g = leg(from, to, mt);
      lines.append(
        h('i', { class: 'dn-leg', style: `--x:${g.x};--y:${g.y};--len:${g.len};--a:${g.deg}` }),
      );
      stones.push(to);
      from = to;
    }
    setMarks('path', stones);
    stones.forEach((sq, k) => putStep(sq, k + 1));
    setMarks('jumped', m.caps.slice(0, hops));
    if (m.caps.length >= 2 && hops === m.path.length) {
      lines.append(h('b', { class: 'dn-chain', text: `x${m.caps.length}` }));
    }
  }

  function fx(kind: FxKind, sq: number): void {
    if (fxCount >= 6) return;
    const mt = metrics();
    const c = centreOf(sq, mt);
    const node = h('i', {
      class: `dn-fx dn-fx--${kind}`,
      style: `--x:${(mt.inset + c.x).toFixed(1)};--y:${(mt.inset + c.y).toFixed(1)}`,
      'aria-hidden': 'true',
    });
    el.append(node);
    fxCount++;
    // the effect is hidden under reduced motion and never fires animationend: remove by timer
    o.scope.timeout(() => {
      node.remove();
      fxCount--;
    }, 900);
  }

  function slide(from: number, to: number): void {
    const p = pieces.get(from);
    const dest = squares.get(to);
    if (!p || !dest) return;
    const mt = metrics();
    const a = centreOf(from, mt);
    const b = centreOf(to, mt);
    pieces.delete(from);
    values.set(to, values.get(from) ?? 0);
    values.set(from, 0);
    pieces.set(to, p);
    dest.append(p);
    p.style.setProperty('--dx', `${(a.x - b.x).toFixed(1)}px`);
    p.style.setProperty('--dy', `${(a.y - b.y).toFixed(1)}px`);
    p.classList.remove('is-sliding');
    void p.offsetWidth; // restart the animation for a second hop
    p.classList.add('is-sliding');
  }

  function take(sq: number): void {
    const p = pieces.get(sq);
    if (!p) return;
    pieces.delete(sq);
    values.set(sq, 0);
    p.classList.add('is-taken');
    fx('ring', sq);
    o.scope.timeout(() => p.remove(), 320);
  }

  function crown(sq: number): void {
    const p = pieces.get(sq);
    if (!p) return;
    const v = values.get(sq) ?? 0;
    const k = v > 0 ? 2 : -2;
    values.set(sq, k);
    p.className = `${pieceClass(k)} is-crowned`;
    fx('crown', sq);
  }

  function drag(sq: number, dx: number, dy: number): void {
    const b = squares.get(sq);
    const p = pieces.get(sq);
    if (!b || !p) return;
    b.classList.add('is-drag');
    p.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(1.12)`;
  }
  function drop(sq: number): void {
    squares.get(sq)?.classList.remove('is-drag');
    const p = pieces.get(sq);
    if (p) p.style.transform = '';
  }

  function shake(sq: number): void {
    const b = squares.get(sq);
    if (!b) return;
    b.classList.remove('is-illegal');
    void b.offsetWidth;
    b.classList.add('is-illegal');
    o.scope.timeout(() => b.classList.remove('is-illegal'), 300);
  }

  return {
    el,
    size: n,
    metrics,
    render,
    square: (i) => squares.get(i),
    pieceAt: (i) => pieces.get(i),
    setMarks,
    setMust(sq) {
      must = new Set(sq);
      applyMust();
    },
    showPath,
    showStones,
    fx,
    setCursor,
    get cursor() {
      return cursor;
    },
    drag,
    drop,
    shake,
    slide,
    take,
    crown,
    destroy() {
      el.remove();
      squares.clear();
      pieces.clear();
    },
  };
}
