import { createScope } from '../lifecycle';
import type { Perf } from '../perf';

export interface LoopOptions {
  /** fixed simulation step in seconds (default 1/60) */
  step?: number;
  /** fixed-step update (simulation) */
  update(dt: number): void;
  /** called once per frame; `alpha` in [0,1) is the interpolation factor between steps */
  render?(alpha: number): void;
  /** max simulation steps per frame, to avoid the spiral of death (default 5) */
  maxSteps?: number;
  perf?: Perf;
  /** called when the tab is hidden and the loop auto-paused */
  onHidden?(): void;
}

export interface Loop {
  start(): void;
  stop(): void;
  /** Pause and resume keep the same state; time spent paused is discarded. */
  pause(): void;
  resume(): void;
  readonly running: boolean;
  /** Run `n` fixed steps synchronously (tests, autoplay fast-forward). */
  advance(n: number): void;
  destroy(): void;
}

export function createLoop(o: LoopOptions): Loop {
  const step = o.step ?? 1 / 60;
  const maxSteps = o.maxSteps ?? 5;
  const scope = createScope();
  let running = false;
  let acc = 0;
  let last = 0;
  let cancel: (() => void) | null = null;

  const frame = (now: number): void => {
    if (!running) return;
    acc += Math.min((now - last) / 1000, step * maxSteps);
    last = now;
    let n = 0;
    while (acc >= step && n < maxSteps) {
      o.update(step);
      acc -= step;
      n++;
    }
    o.render?.(acc / step);
    o.perf?.frame(now);
    cancel = scope.raf(frame);
  };

  const begin = (): void => {
    if (running || scope.destroyed) return;
    running = true;
    acc = 0;
    last = performance.now();
    o.perf?.reset();
    cancel = scope.raf(frame);
  };
  const halt = (): void => {
    running = false;
    cancel?.();
    cancel = null;
  };

  let autoPaused = false;
  scope.on(document, 'visibilitychange', () => {
    if (document.hidden && running) {
      halt();
      autoPaused = true;
      o.onHidden?.();
    } else if (!document.hidden && autoPaused) {
      autoPaused = false;
      // Stay paused if the game asked for a pause menu in onHidden; it calls resume().
      if (!o.onHidden) begin();
    }
  });

  return {
    start: begin,
    stop: halt,
    pause: halt,
    resume: begin,
    get running() {
      return running;
    },
    advance(n) {
      for (let i = 0; i < n; i++) o.update(step);
      o.render?.(0);
    },
    destroy() {
      halt();
      scope.destroy();
    },
  };
}
