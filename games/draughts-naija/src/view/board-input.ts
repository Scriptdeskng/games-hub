import type { Scope } from '@naija/core/lifecycle';
import type { BoardView } from './board';
import { nextCursor, pick, type ArrowKey, type Point } from './geometry';

export interface BoardInputOptions {
  board: BoardView;
  scope: Scope;
  /** squares that can be pressed right now (empty while the CPU moves or the game is paused) */
  pressable(): readonly number[];
  /** squares a dragged piece can be dropped on */
  dropTargets(): readonly number[];
  /**
   * A pointer went down on `sq` (a movable piece, found with hit-slop). The controller selects the
   * piece if it is not selected yet and says what happened: 'picked' (selected now, a tap must not
   * toggle it off), 'again' (it was already selected: a tap deselects it), or 'none'.
   */
  onDown(sq: number): 'picked' | 'again' | 'none';
  /** a tap, a keyboard press or a drop on a square */
  onPress(sq: number): void;
  /** the pointer or the keyboard cursor is over `sq` (or nothing): the controller previews the path */
  onHover(sq: number | null): void;
}

/** Pointer movement (px) before a press on a piece becomes a drag. */
const DRAG_START = 6;
const DROP_SLOP = 26;

/**
 * Touch, mouse and keyboard input for the board, with hit-slop (a press means the nearest legal square
 * within 22 px): tap-tap, drag-and-drop and arrow keys. A 10x10 cell is only 31.6 px wide at 360 px,
 * so the exact square under the finger is not demanded.
 */
export function createBoardInput(o: BoardInputOptions): { destroy(): void } {
  const { board, scope } = o;
  const el = board.el;
  let down: {
    id: number;
    x: number;
    y: number;
    piece: number | null;
    picked: boolean;
    dragging: boolean;
  } | null = null;
  let prefCol = 0;

  const grid = (e: PointerEvent): Point => {
    const r = el.getBoundingClientRect();
    const m = board.metrics();
    // the board may be scaled by CSS: convert from client px to the board's own px
    const k = r.width > 0 ? m.board / r.width : 1;
    return { x: (e.clientX - r.left) * k - m.inset, y: (e.clientY - r.top) * k - m.inset };
  };

  scope.on(el, 'pointerdown', (e: PointerEvent) => {
    if (e.button > 0 || down) return;
    const targets = o.pressable();
    if (targets.length === 0) return;
    const p = grid(e);
    const sq = pick(p, targets, board.metrics());
    let piece: number | null = null;
    let picked = false;
    if (sq !== null && targets.includes(sq)) {
      const r = o.onDown(sq);
      if (r !== 'none') piece = sq;
      picked = r === 'picked';
    }
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, piece, picked, dragging: false };
    if (piece !== null) el.setPointerCapture?.(e.pointerId);
  });

  scope.on(el, 'pointermove', (e: PointerEvent) => {
    if (!down) {
      if (e.pointerType === 'mouse') {
        const p = grid(e);
        o.onHover(pick(p, o.dropTargets(), board.metrics(), 14));
      }
      return;
    }
    if (e.pointerId !== down.id || down.piece === null) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    if (!down.dragging && Math.hypot(dx, dy) > DRAG_START) down.dragging = true;
    if (down.dragging) {
      board.drag(down.piece, dx, dy);
      o.onHover(pickDrop(e));
    }
  });

  const pickDrop = (e: PointerEvent): number | null => {
    const t = o.dropTargets();
    const sq = pick(grid(e), t, board.metrics(), DROP_SLOP);
    return sq !== null && t.includes(sq) ? sq : null;
  };

  const finish = (e: PointerEvent, cancelled: boolean): void => {
    if (!down || e.pointerId !== down.id) return;
    const d = down;
    down = null;
    if (d.piece !== null) el.releasePointerCapture?.(e.pointerId);
    if (d.dragging && d.piece !== null) {
      board.drop(d.piece);
      o.onHover(null);
      const target = cancelled ? null : pickDrop(e);
      if (target !== null) o.onPress(target);
      return;
    }
    if (cancelled || d.picked) return;
    const sq = pick(grid(e), o.pressable(), board.metrics());
    if (sq !== null) o.onPress(sq);
  };
  scope.on(el, 'pointerup', (e: PointerEvent) => finish(e, false));
  scope.on(el, 'pointercancel', (e: PointerEvent) => finish(e, true));
  scope.on(el, 'pointerleave', () => !down && o.onHover(null));

  // keyboard: Enter and Space arrive as a click with detail 0 (a pointer click has detail >= 1)
  scope.on(el, 'click', (e: MouseEvent) => {
    if (e.detail !== 0) return;
    const sq = Number((e.target as HTMLElement).closest<HTMLElement>('.dn-sq')?.dataset.i);
    if (Number.isFinite(sq)) o.onPress(sq);
  });
  scope.on(el, 'keydown', (e: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const cur = board.cursor;
    if (cur < 0) return;
    e.preventDefault();
    const n = board.size;
    const next = nextCursor(cur, e.key as ArrowKey, n, prefCol);
    prefCol = next.prefCol;
    board.setCursor(next.i, true);
  });
  scope.on(el, 'focusin', (e: FocusEvent) => {
    const sq = Number((e.target as HTMLElement).closest<HTMLElement>('.dn-sq')?.dataset.i);
    if (Number.isFinite(sq)) {
      prefCol = sq % board.size;
      o.onHover(sq);
    }
  });
  scope.on(el, 'focusout', () => o.onHover(null));

  return { destroy: () => undefined };
}
