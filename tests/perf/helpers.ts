import type { CDPSession, Page } from '@playwright/test';

export const SLUG = process.env.PERF_SLUG ?? '_template';

/** Fast 3G as in Lighthouse/DevTools: 1.6 Mbps down, 750 kbps up, 150 ms RTT. */
export const FAST_3G = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};

/** 4x CPU slowdown approximates a low/mid Android phone (Tecno/Infinix/Itel class). */
export async function throttle(
  page: Page,
  opts: { cpu?: number; network?: boolean } = {},
): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: opts.cpu ?? 4 });
  if (opts.network) await cdp.send('Network.emulateNetworkConditions', FAST_3G);
  return cdp;
}

/** Network conditions off again (so long soaks are not network-bound) while keeping the CPU throttle. */
export const unthrottleNetwork = (cdp: CDPSession): Promise<unknown> =>
  cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });

/** Heap in bytes after a forced GC (CDP), so samples are comparable. */
export async function heapAfterGc(cdp: CDPSession): Promise<number> {
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  const { usedSize } = (await cdp.send('Runtime.getHeapUsage')) as { usedSize: number };
  return usedSize;
}

/** In-page frame sampler independent of the game's own perf code. */
export async function startFrameSampler(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __sampling: boolean };
    w.__frames = [];
    w.__sampling = true;
    const tick = (t: number): void => {
      if (!w.__sampling) return;
      w.__frames.push(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export interface FpsStats {
  frames: number;
  seconds: number;
  avgFps: number;
  /** slowest 1-second window */
  minFps: number;
  /** longest single frame in ms */
  worstFrameMs: number;
}

export async function stopFrameSampler(page: Page): Promise<FpsStats> {
  return page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __sampling: boolean };
    w.__sampling = false;
    const f = w.__frames;
    const seconds = (f[f.length - 1]! - f[0]!) / 1000;
    let min = Infinity;
    let start = 0;
    for (let i = 1; i < f.length; i++) {
      if (f[i]! - f[start]! >= 1000) {
        min = Math.min(min, ((i - start) * 1000) / (f[i]! - f[start]!));
        start = i;
      }
    }
    let worst = 0;
    for (let i = 1; i < f.length; i++) worst = Math.max(worst, f[i]! - f[i - 1]!);
    return {
      frames: f.length,
      seconds,
      avgFps: (f.length - 1) / seconds,
      minFps: min === Infinity ? 0 : min,
      worstFrameMs: worst,
    };
  });
}

/** Least-squares slope of y over x. */
export function slope(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}
