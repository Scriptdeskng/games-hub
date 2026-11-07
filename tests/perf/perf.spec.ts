import { expect, test } from '@playwright/test';
import { SLUG, heapAfterGc, startFrameSampler, stopFrameSampler, throttle } from './helpers';

/**
 * Budgets (CLAUDE.md): first interactive screen <= 4 s on Fast 3G (with 4x CPU), >= 50 fps average
 * during play on a 4x CPU-throttled mobile profile. Numbers are printed even when a budget fails.
 */
const MENU_BUDGET_MS = 4000;
const FPS_BUDGET = 50;

test('Fast 3G + 4x CPU: time to menu and fps during a real-time round', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const cdp = await throttle(page, { cpu: 4, network: true });

  const t0 = Date.now();
  await page.goto(`/${SLUG}/`);
  await page.waitForFunction(() => window.__naijaTest?.screen() === 'menu', undefined, {
    timeout: 30_000,
  });
  const menuMs = Date.now() - t0;

  await page.evaluate(() => window.__naijaTest!.setSeed(7));
  await startFrameSampler(page);
  for (const difficulty of ['medium', 'hard']) {
    await page.evaluate(
      (d) => window.__naijaTest!.autoplay({ realtime: true, difficulty: d }),
      difficulty,
    );
  }
  const fps = await stopFrameSampler(page);
  const core = await page.evaluate(() => window.__naijaTest!.perf());
  const heapMB = (await heapAfterGc(cdp)) / 1048576;
  const results = {
    slug: SLUG,
    project: info.project.name,
    timeToMenuMs: menuMs,
    fpsAvg: +fps.avgFps.toFixed(1),
    fpsMin1s: +fps.minFps.toFixed(1),
    worstFrameMs: +fps.worstFrameMs.toFixed(1),
    seconds: +fps.seconds.toFixed(1),
    corePerf: core && { avgFps: core.avgFps, minFps: core.minFps },
    heapAfterRunMB: +heapMB.toFixed(2),
  };
  console.log(`PERF ${JSON.stringify(results)}`);
  await info.attach('perf.json', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect.soft(menuMs, `time to menu ${menuMs} ms`).toBeLessThanOrEqual(MENU_BUDGET_MS);
  expect
    .soft(fps.avgFps, `average fps ${fps.avgFps.toFixed(1)}`)
    .toBeGreaterThanOrEqual(FPS_BUDGET);
  expect(errors).toEqual([]);
});
