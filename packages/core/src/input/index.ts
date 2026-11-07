import { createScope } from '../lifecycle';

export type SwipeDir = 'left' | 'right' | 'up' | 'down';

export interface InputHandlers {
  /** Quick press and release without moving. Coordinates are client px. */
  onTap?(x: number, y: number, ev: PointerEvent): void;
  onSwipe?(dir: SwipeDir, dist: number, ev: PointerEvent): void;
  /** Map `KeyboardEvent.key` (e.g. ' ', 'Enter', 'ArrowLeft', 'p') to a handler. */
  keys?: Record<string, (ev: KeyboardEvent) => void>;
}

export interface InputOptions {
  /** max movement (px) for a tap */
  tapSlop?: number;
  /** max duration (ms) for a tap */
  tapMaxMs?: number;
  /** min distance (px) for a swipe */
  swipeMin?: number;
  /** where keyboard events are listened for */
  keyTarget?: EventTarget;
}

export interface Input {
  setHandlers(h: InputHandlers): void;
  destroy(): void;
}

/** Classify a pointer gesture. Pure, exported for tests. */
export function classifyGesture(
  dx: number,
  dy: number,
  ms: number,
  o: Required<Pick<InputOptions, 'tapSlop' | 'tapMaxMs' | 'swipeMin'>>,
): { kind: 'tap' } | { kind: 'swipe'; dir: SwipeDir; dist: number } | { kind: 'none' } {
  const dist = Math.hypot(dx, dy);
  if (dist <= o.tapSlop && ms <= o.tapMaxMs) return { kind: 'tap' };
  if (dist >= o.swipeMin) {
    const dir: SwipeDir =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    return { kind: 'swipe', dir, dist };
  }
  return { kind: 'none' };
}

export function createInput(
  el: HTMLElement,
  handlers: InputHandlers = {},
  options: InputOptions = {},
): Input {
  const scope = createScope();
  const o = { tapSlop: 12, tapMaxMs: 500, swipeMin: 36, ...options };
  let h = handlers;
  let down: { x: number; y: number; t: number; id: number } | null = null;

  scope.on(el, 'pointerdown', (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
  });
  scope.on(el, 'pointerup', (e: PointerEvent) => {
    if (!down || down.id !== e.pointerId) return;
    const g = classifyGesture(
      e.clientX - down.x,
      e.clientY - down.y,
      performance.now() - down.t,
      o,
    );
    const x = e.clientX;
    const y = e.clientY;
    down = null;
    if (g.kind === 'tap') h.onTap?.(x, y, e);
    else if (g.kind === 'swipe') h.onSwipe?.(g.dir, g.dist, e);
  });
  scope.on(el, 'pointercancel', () => {
    down = null;
  });
  scope.on(options.keyTarget ?? window, 'keydown', (e: KeyboardEvent) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = h.keys;
    const fn = k?.[e.key] ?? k?.[e.key.toLowerCase()] ?? k?.[e.key.toUpperCase()];
    if (fn) fn(e);
  });

  return {
    setHandlers(next) {
      h = next;
    },
    destroy: () => scope.destroy(),
  };
}
