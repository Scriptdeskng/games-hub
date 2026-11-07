import type { Scope } from '../lifecycle';

/**
 * Piece movement: step-by-step hops and long slides, animated with `transform` only (the Web
 * Animations API runs on the compositor; nothing here touches layout). Coordinates are abstract
 * "board units" and `format` turns them into a CSS transform, so a game can use cell fractions
 * with percentages (`translate(calc(x*100%), ...)`, resize-proof) or plain pixels.
 */
export interface Point {
  x: number;
  y: number;
}

export interface PathStep extends Point {
  /** hop = small jump (one square), slide = smooth glide (ladder or snake). Default hop. */
  kind?: 'hop' | 'slide';
}

export interface MoverOptions {
  scope: Scope;
  /** board position -> CSS transform. Default: pixels. */
  format?: (x: number, y: number) => string;
  /** true = jump straight to the end of the path (the user prefers reduced motion) */
  reducedMotion?: () => boolean;
  /** hop duration in ms (default 170) */
  hopMs?: number;
  /** slide duration in ms (default 650) */
  slideMs?: number;
  /** how high a hop lifts, in board units (default 0.35) */
  lift?: number;
}

export interface RunOptions {
  /** called when the piece lands on step `i` (use it for per-square sounds) */
  onStep?: (i: number, step: PathStep) => void;
}

export interface Mover {
  /** Put the piece somewhere instantly. */
  place(p: Point): void;
  /** Walk the path. Resolves when the piece has landed on the last step (or was finished early). */
  run(steps: readonly PathStep[], o?: RunOptions): Promise<void>;
  /** Jump to the end of the running path now. */
  finish(): void;
  readonly position: Point;
  readonly busy: boolean;
}

const px = (x: number, y: number): string => `translate3d(${x}px,${y}px,0)`;

export function createMover(el: HTMLElement, o: MoverOptions): Mover {
  const format = o.format ?? px;
  const hopMs = o.hopMs ?? 170;
  const slideMs = o.slideMs ?? 650;
  const lift = o.lift ?? 0.35;
  let pos: Point = { x: 0, y: 0 };
  let anim: Animation | null = null;
  let resolveRun: (() => void) | null = null;
  let pending: { steps: readonly PathStep[]; i: number; opts: RunOptions } | null = null;

  const apply = (p: Point): void => {
    pos = { x: p.x, y: p.y };
    el.style.transform = format(p.x, p.y);
  };
  const stopAnim = (): void => {
    const a = anim;
    anim = null;
    if (a) {
      a.onfinish = null;
      a.cancel();
    }
  };
  const settle = (): void => {
    const r = resolveRun;
    resolveRun = null;
    pending = null;
    r?.();
  };
  o.scope.add(() => {
    stopAnim();
    settle();
  });

  function next(): void {
    const run = pending;
    if (!run) return;
    const step = run.steps[run.i];
    if (!step) return settle();
    const idx = run.i++;
    const from = pos;
    const land = (): void => {
      stopAnim();
      apply(step);
      run.opts.onStep?.(idx, step);
      next();
    };
    const slide = step.kind === 'slide';
    const ms = slide ? slideMs : hopMs;
    if (o.reducedMotion?.() || typeof el.animate !== 'function') return land();
    const frames: Keyframe[] = [{ transform: format(from.x, from.y) }];
    if (!slide) {
      frames.push({
        transform: format((from.x + step.x) / 2, (from.y + step.y) / 2 - lift),
        offset: 0.5,
      });
    }
    frames.push({ transform: format(step.x, step.y) });
    anim = el.animate(frames, {
      duration: ms,
      easing: slide ? 'cubic-bezier(.45,0,.25,1)' : 'ease-in-out',
      fill: 'forwards',
    });
    anim.onfinish = land;
  }

  return {
    place: (p) => {
      stopAnim();
      settle();
      apply(p);
    },
    run(steps, opts = {}) {
      stopAnim();
      settle();
      if (!steps.length) return Promise.resolve();
      return new Promise<void>((resolve) => {
        resolveRun = resolve;
        pending = { steps, i: 0, opts };
        next();
      });
    },
    finish() {
      const run = pending;
      if (!run) return;
      const last = run.steps[run.steps.length - 1];
      stopAnim();
      if (last) apply(last);
      settle();
    },
    get position() {
      return pos;
    },
    get busy() {
      return pending !== null;
    },
  };
}

/**
 * Hop steps along a linear track: every square from `from` (exclusive) to `to` (inclusive),
 * mapped to board points by `cellOf`. Works for forward and backward moves.
 */
export function trackSteps(
  from: number,
  to: number,
  cellOf: (square: number) => Point,
  kind: PathStep['kind'] = 'hop',
): PathStep[] {
  const out: PathStep[] = [];
  const dir = to >= from ? 1 : -1;
  for (let n = from + dir; dir > 0 ? n <= to : n >= to; n += dir) {
    out.push({ ...cellOf(n), kind });
  }
  return out;
}
