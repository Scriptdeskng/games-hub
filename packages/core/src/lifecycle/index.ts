/**
 * Scope: tracks every listener, timer and RAF callback so `destroy()` removes them all.
 * Live counts are exposed to the test hook for leak checks.
 */
export interface LeakCounters {
  listeners: number;
  timers: number;
  rafs: number;
}

const live: LeakCounters = { listeners: 0, timers: 0, rafs: 0 };

/** Diagnostic snapshot of everything currently registered through any Scope. */
export const leakCounters = (): LeakCounters => ({ ...live });

type Target = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

export interface Scope {
  on(
    target: Target,
    type: string,
    fn: (e: never) => void,
    opts?: boolean | AddEventListenerOptions,
  ): () => void;
  timeout(fn: () => void, ms: number): () => void;
  interval(fn: () => void, ms: number): () => void;
  raf(fn: (t: number) => void): () => void;
  /** Register an arbitrary cleanup function. */
  add(fn: () => void): () => void;
  destroy(): void;
  readonly destroyed: boolean;
}

export function createScope(): Scope {
  const cleanups = new Set<() => void>();
  let destroyed = false;

  const reg = (kind: keyof LeakCounters | null, undo: () => void): (() => void) => {
    if (destroyed) {
      undo();
      return () => undefined;
    }
    if (kind) live[kind]++;
    let done = false;
    const off = (): void => {
      if (done) return;
      done = true;
      cleanups.delete(off);
      if (kind) live[kind]--;
      undo();
    };
    cleanups.add(off);
    return off;
  };

  return {
    on(target, type, fn, opts) {
      const h = fn as EventListener;
      target.addEventListener(type, h, opts);
      return reg('listeners', () => target.removeEventListener(type, h, opts));
    },
    timeout(fn, ms) {
      let off: () => void = () => undefined;
      const id = setTimeout(() => {
        off();
        fn();
      }, ms);
      off = reg('timers', () => clearTimeout(id));
      return off;
    },
    interval(fn, ms) {
      const id = setInterval(fn, ms);
      return reg('timers', () => clearInterval(id));
    },
    raf(fn) {
      let off: () => void = () => undefined;
      const id = requestAnimationFrame((t) => {
        off();
        fn(t);
      });
      off = reg('rafs', () => cancelAnimationFrame(id));
      return off;
    },
    add: (fn) => reg(null, fn),
    destroy() {
      if (destroyed) return;
      [...cleanups].forEach((off) => off());
      destroyed = true;
    },
    get destroyed() {
      return destroyed;
    },
  };
}
