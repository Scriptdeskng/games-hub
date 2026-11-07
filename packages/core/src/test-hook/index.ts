import { leakCounters, type LeakCounters } from '../lifecycle';
import type { Perf, PerfSnapshot } from '../perf';
import type { PortalMessage } from '../portal';

/**
 * `window.__naijaTest`: installed only when `__NAIJA_TEST__` is true (dev and the e2e build);
 * production builds dead-code-eliminate it. Playwright drives full matches through it.
 */
export interface NaijaTestApi {
  game: string;
  /** Play a full game to the end quickly; resolves with the final state. */
  autoplay(opts?: Record<string, unknown>): Promise<unknown>;
  getState(): unknown;
  setSeed(n: number): void;
  /** live listeners / timers / RAF callbacks registered through core scopes */
  counters(): LeakCounters;
  perf(): PerfSnapshot | null;
  /** portal events emitted so far, in order */
  events(): Pick<PortalMessage, 'type' | 'data'>[];
  /** current top-level screen id, e.g. 'menu', 'play', 'results' */
  screen(): string;
  /** tear the whole game down (listeners, timers, RAF); counters() should then read 0 */
  destroy(): void;
}

export interface TestHookOptions {
  game: string;
  autoplay: NaijaTestApi['autoplay'];
  getState: NaijaTestApi['getState'];
  setSeed: NaijaTestApi['setSeed'];
  perf?: Perf;
  events: NaijaTestApi['events'];
  screen: NaijaTestApi['screen'];
  destroy: NaijaTestApi['destroy'];
}

declare global {
  interface Window {
    __naijaTest?: NaijaTestApi;
  }
}

export function installTestHook(o: TestHookOptions): () => void {
  if (typeof __NAIJA_TEST__ === 'undefined' || !__NAIJA_TEST__) return () => undefined;
  const api: NaijaTestApi = {
    game: o.game,
    autoplay: o.autoplay,
    getState: o.getState,
    setSeed: o.setSeed,
    counters: leakCounters,
    perf: () => o.perf?.snapshot() ?? null,
    events: o.events,
    screen: o.screen,
    destroy: o.destroy,
  };
  window.__naijaTest = api;
  return () => {
    if (window.__naijaTest === api) delete window.__naijaTest;
  };
}
