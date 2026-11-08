import { expect, test } from '@playwright/test';
import { SLUG, heapAfterGc, slope, throttle, unthrottleNetwork } from './helpers';

/**
 * Soak: back-to-back real-time rounds under 4x CPU throttle. Every SAMPLE_S seconds the heap is
 * measured after a forced GC. Length: SOAK_MINUTES (default 10); sampling: SOAK_SAMPLE_S (default 30).
 *
 * Leak criterion: least-squares slope of post-GC heap over time, ignoring a warm-up window
 * (first 20% of the run, at most 2 minutes: JIT, font and cache fill). The slope must stay under
 * MAX_SLOPE_KB_PER_MIN = 100 KB/min. A real leak (e.g. one retained DOM node or listener per round,
 * about 30 rounds in 10 minutes) shows up as hundreds of KB/min; GC noise on a ~3-6 MB heap after
 * forced collection is a few tens of KB. Also required: the listener/timer/RAF counters at each
 * results screen are identical to the first measured one.
 */
const MINUTES = Number(process.env.SOAK_MINUTES ?? 10);
const SAMPLE_S = Number(process.env.SOAK_SAMPLE_S ?? 30);
const MAX_SLOPE_KB_PER_MIN = 100;
const DIFFS = ['easy', 'medium', 'hard'];

test.setTimeout((MINUTES + 3) * 60_000);

test(`soak ${MINUTES} min at 4x CPU: heap trend and counters stay flat`, async ({ page }, info) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const cdp = await throttle(page, { cpu: 4, network: true });
  await page.goto(`/${SLUG}/`);
  await page.waitForFunction(() => window.__naijaTest?.screen() === 'menu', undefined, {
    timeout: 30_000,
  });
  await unthrottleNetwork(cdp);

  const start = Date.now();
  // Host sleep detector: wall clock minus a monotonic clock that stops while the machine sleeps.
  const mono0 = process.hrtime.bigint();
  const hostSleptMs = (): number =>
    Math.max(0, Date.now() - start - Number(process.hrtime.bigint() - mono0) / 1e6);
  const samples: { min: number; mb: number }[] = [];
  let nextSample = start;
  let rounds = 0;
  let baseline: unknown = null;
  const mismatches: string[] = [];

  while (Date.now() - start < MINUTES * 60_000) {
    const diff = DIFFS[rounds % DIFFS.length]!;
    await page.evaluate(
      (d) => window.__naijaTest!.autoplay({ realtime: true, difficulty: d } as never),
      diff,
    );
    rounds++;
    const c = await page.evaluate(() => window.__naijaTest!.counters());
    // the first two rounds warm up lazily-created things (audio, music scheduler, loader fade)
    if (rounds === 2) baseline = c;
    else if (rounds > 2 && JSON.stringify(c) !== JSON.stringify(baseline)) {
      mismatches.push(`round ${rounds}: ${JSON.stringify(c)} != ${JSON.stringify(baseline)}`);
    }
    if (Date.now() >= nextSample) {
      const mb = (await heapAfterGc(cdp)) / 1048576;
      samples.push({ min: (Date.now() - start) / 60_000, mb });
      nextSample += SAMPLE_S * 1000;
    }
  }
  samples.push({ min: (Date.now() - start) / 60_000, mb: (await heapAfterGc(cdp)) / 1048576 });

  // what the app's autoplay guard saw: every round's wall time, and any round that had to be rescued
  const auto = await page.evaluate(
    () =>
      (window.__naijaTest!.getState() as { autoplay?: unknown }).autoplay as {
        rounds: number;
        maxMs: number;
        rescues: unknown[];
      },
  );
  const total = samples[samples.length - 1]!.min;
  const warm = Math.min(2, total * 0.2);
  const steady = samples.filter((s) => s.min >= warm);
  const kbPerMin = slope(
    steady.map((s) => s.min),
    steady.map((s) => s.mb * 1024),
  );
  const report = {
    slug: SLUG,
    minutes: +total.toFixed(2),
    rounds,
    slowestRoundMs: auto?.maxMs,
    rescuedRounds: auto?.rescues ?? [],
    hostSleptMin: +(hostSleptMs() / 60_000).toFixed(2),
    samples: samples.map((s) => `${s.min.toFixed(1)}m=${s.mb.toFixed(2)}MB`),
    steadySamples: steady.length,
    slopeKBperMin: +kbPerMin.toFixed(1),
    limitKBperMin: MAX_SLOPE_KB_PER_MIN,
  };
  console.log(`SOAK ${JSON.stringify(report)}`);
  await info.attach('soak.json', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });

  expect(steady.length, 'need at least 3 steady-state heap samples').toBeGreaterThanOrEqual(3);
  expect(kbPerMin, `heap slope ${kbPerMin.toFixed(1)} KB/min`).toBeLessThan(MAX_SLOPE_KB_PER_MIN);
  expect(mismatches).toEqual([]);
  // a round must end by itself: a rescue means the flow was held somewhere (see its `flow` dump)
  expect(auto?.rescues ?? [], 'autoplay rounds that stalled and were rescued').toEqual([]);
  expect(errors).toEqual([]);
});
