import { createScope } from '../lifecycle';

export interface PerfSnapshot {
  /** frames per second over the last ~1 s window */
  fps: number;
  /** lowest 1 s fps window since reset */
  minFps: number;
  frames: number;
  /** JS heap in MB (Chromium only, else null) */
  heapMB: number | null;
  /** heap samples every `heapEveryMs` (for trend checks in long-run tests) */
  heapSamples: number[];
}

export interface Perf {
  /** call once per rendered frame with a DOMHighResTimeStamp */
  frame(now: number): void;
  reset(): void;
  snapshot(): PerfSnapshot;
  destroy(): void;
}

const heapMB = (): number | null => {
  const m = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return m ? m.usedJSHeapSize / 1048576 : null;
};

export function createPerf(heapEveryMs = 5000): Perf {
  const scope = createScope();
  let frames = 0;
  let winStart = 0;
  let winFrames = 0;
  let fps = 0;
  let minFps = Infinity;
  let heapSamples: number[] = [];

  scope.interval(() => {
    const h = heapMB();
    if (h !== null) {
      heapSamples.push(+h.toFixed(2));
      if (heapSamples.length > 240) heapSamples.shift();
    }
  }, heapEveryMs);

  return {
    frame(now) {
      frames++;
      winFrames++;
      if (!winStart) winStart = now;
      const dt = now - winStart;
      if (dt >= 1000) {
        fps = (winFrames * 1000) / dt;
        if (fps < minFps) minFps = fps;
        winStart = now;
        winFrames = 0;
      }
    },
    reset() {
      frames = 0;
      winStart = 0;
      winFrames = 0;
      fps = 0;
      minFps = Infinity;
      heapSamples = [];
    },
    snapshot: () => ({
      fps: Math.round(fps),
      minFps: minFps === Infinity ? 0 : Math.round(minFps),
      frames,
      heapMB: heapMB(),
      heapSamples: heapSamples.slice(),
    }),
    destroy: () => scope.destroy(),
  };
}
