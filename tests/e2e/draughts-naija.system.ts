import { expect, test } from '@playwright/test';
import { expectScreen, openGame, press, watchErrors } from './helpers';
import { FAST, SLUG, snap, startPlay, waitForHuman, humanTurn } from './draughts-naija.helpers';

/** The Web Worker, its fallbacks, offline, the mock portal, storage. */
export function systemTests(): void {
  test.describe('draughts-naija: AI worker', () => {
    test('the CPU answers from the Web Worker (a separate script file), with think times recorded', async ({
      page,
    }) => {
      const watch = watchErrors(page);
      const files: string[] = [];
      page.on('request', (r) => /worker-[\w-]+\.js/.test(r.url()) && files.push(r.url()));
      await openGame(page, SLUG, FAST);
      await press(page.locator('.ng-seg label', { hasText: 'Hard' }).first());
      await startPlay(page);
      await humanTurn(page);
      await expect.poll(async () => (await snap(page)).ai!.workerAnswers).toBeGreaterThan(0);
      const st = await snap(page);
      expect(st.ai).toMatchObject({
        mode: 'worker',
        mainAnswers: 0,
        workerFailures: 0,
        timeouts: 0,
      });
      expect(files.length).toBeGreaterThan(0);
      expect(st.thinkTimes.length).toBeGreaterThan(0);
      expect(watch.errors).toEqual([]);
    });

    test('without Worker support the game runs the search on the main thread and still plays', async ({
      page,
    }) => {
      const watch = watchErrors(page);
      await page.addInitScript(() => {
        (window as unknown as { Worker?: unknown }).Worker = undefined;
      });
      await openGame(page, SLUG);
      await page.evaluate(() =>
        window.__naijaTest!.autoplay({ realtime: true, difficulty: 'hard' }),
      );
      await expectScreen(page, 'results');
      const st = await snap(page);
      expect(st.ai).toBeNull(); // the round is over; check the next one
      await press(page.getByRole('button', { name: 'Play again' }));
      await humanTurn(page);
      await expect.poll(async () => (await snap(page)).ai!.mainAnswers).toBeGreaterThan(0);
      expect((await snap(page)).ai).toMatchObject({ mode: 'main', workerAnswers: 0 });
      expect(watch.errors).toEqual([]);
    });

    test('a worker that never answers is dropped after the timeout and the CPU still moves', async ({
      page,
    }) => {
      test.setTimeout(60_000);
      const watch = watchErrors(page);
      await page.addInitScript(() => {
        class Silent {
          onmessage: unknown = null;
          onerror: unknown = null;
          postMessage(): void {}
          terminate(): void {}
        }
        (window as unknown as { Worker: unknown }).Worker = Silent;
      });
      await openGame(page, SLUG, FAST);
      await startPlay(page);
      await humanTurn(page);
      await expect
        .poll(async () => (await snap(page)).round!.plies, { timeout: 20_000 })
        .toBeGreaterThanOrEqual(2);
      expect((await snap(page)).ai).toMatchObject({ mode: 'main', timeouts: 1 });
      expect(watch.errors).toEqual([]);
    });

    test('quitting while the CPU thinks terminates the worker and leaves nothing running', async ({
      page,
    }) => {
      await page.addInitScript(() => {
        const Real = window.Worker;
        const log = { made: 0, ended: 0 };
        (window as unknown as { __w: typeof log }).__w = log;
        (window as unknown as { Worker: unknown }).Worker = class extends Real {
          constructor(u: string | URL, o?: WorkerOptions) {
            super(u, o);
            log.made++;
          }
          override terminate(): void {
            log.ended++;
            super.terminate();
          }
        };
      });
      const watch = watchErrors(page);
      await openGame(page, SLUG);
      const base = await page.evaluate(() => window.__naijaTest!.counters());
      await press(page.locator('.ng-seg label', { hasText: 'Hard' }).first());
      await startPlay(page);
      await humanTurn(page);
      await page.waitForTimeout(150);
      await press(page.getByRole('button', { name: 'Pause' }));
      await press(page.getByRole('button', { name: 'Quit' }));
      await expectScreen(page, 'menu');
      const w = await page.evaluate(
        () => (window as unknown as { __w: { made: number; ended: number } }).__w,
      );
      expect(w.made).toBeGreaterThan(0);
      expect(w.ended).toBe(w.made);
      const c = await page.evaluate(() => window.__naijaTest!.counters());
      expect(c).toEqual(base); // the board, the client and the worker left no listener, timer or RAF behind
      await page.waitForTimeout(1500);
      expect(watch.errors).toEqual([]);
    });
  });

  test.describe('draughts-naija: offline, portal, storage', () => {
    test('after the first load the game works offline, worker included (service worker)', async ({
      page,
      context,
    }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG, FAST);
      expect(
        await page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).active)),
      ).toBe(true);
      await context.setOffline(true);
      await page.reload();
      await page.waitForFunction(() => Boolean(window.__naijaTest));
      await expectScreen(page, 'menu');
      await startPlay(page);
      await humanTurn(page);
      await expect
        .poll(async () => (await snap(page)).ai!.workerAnswers, { timeout: 30_000 })
        .toBeGreaterThan(0);
      await page.evaluate(() => window.__naijaTest!.autoplay());
      await expectScreen(page, 'results');
      await context.setOffline(false);
      expect(watch.errors.filter((e) => !e.startsWith('requestfailed'))).toEqual([]);
    });

    test('events reach only the portal origin, in order, and progress syncs through the API', async ({
      page,
    }) => {
      const token = `tok_e2e_dn_${Date.now()}`;
      await page.goto(`http://localhost:4180/?game=${SLUG}&token=${token}`);
      await expect(page.frameLocator('#frame').locator('#menu-play')).toBeVisible();
      await expect(page.locator('#order')).toHaveText('ready');
      const f = await (await page.locator('#frame').elementHandle())!.contentFrame();
      await f!.evaluate(() => window.__naijaTest!.autoplay({ win: true }));
      await expect(page.locator('#order')).toHaveText(
        /^ready > start( > score)* > level_complete > end$/,
      );
      await expect(page.locator('#verdict')).toHaveText('order OK');
      const stored = await f!.evaluate(() => JSON.stringify(Object.entries(localStorage)));
      expect(stored).not.toContain(token);
      const res = await page.request.get(`http://localhost:4180/api/games/${SLUG}/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      expect((await res.json()).data.plays).toBe(1);
    });

    test('a crafted ?portal= origin gets no request, no events and no token; the token is never a Referer', async ({
      page,
    }) => {
      const hits: string[] = [];
      await page.route(
        (u) => u.hostname === 'evil.example',
        (route) => {
          hits.push(route.request().url());
          return route.abort();
        },
      );
      const reqs: import('@playwright/test').Request[] = [];
      page.on('request', (r) => reqs.push(r));
      await openGame(page, SLUG, '?token=tok_d14_secret&portal=https://evil.example&lang=en');
      await page.evaluate(() => window.__naijaTest!.autoplay({ win: true }));
      await expectScreen(page, 'results');
      expect(hits).toEqual([]);
      for (const h of await Promise.all(reqs.map((r) => r.allHeaders())))
        expect(h.referer ?? '').not.toContain('tok_d14');
    });

    test('settings, progress and the ?lang=pcm choice persist; storage never holds a token', async ({
      page,
    }) => {
      await openGame(page, SLUG, '?lang=pcm&token=tok_abc123xyz');
      await expect(page.locator('.dn-opponent')).toContainText('You dey play against');
      await page.evaluate(() => window.__naijaTest!.autoplay({ win: true, size: 8 }));
      await expectScreen(page, 'results');
      await page.reload();
      await page.waitForFunction(() => Boolean(window.__naijaTest));
      const st = await snap(page);
      expect(st.progress).toMatchObject({ plays: 1, wins: 1, lastSize: 8 });
      expect(JSON.stringify(await page.evaluate(() => Object.entries(localStorage)))).not.toContain(
        'tok_abc',
      );
    });

    test('setSeed makes the game reproducible', async ({ page }) => {
      await openGame(page, SLUG, FAST);
      const run = async (): Promise<unknown> => {
        await page.evaluate(() => window.__naijaTest!.setSeed(99));
        await startPlay(page);
        await humanTurn(page);
        await expect.poll(async () => (await snap(page)).round!.plies).toBeGreaterThanOrEqual(2);
        await waitForHuman(page);
        const b = (await snap(page)).round!.board;
        await press(page.getByRole('button', { name: 'Pause' }));
        await press(page.getByRole('button', { name: 'Quit' }));
        return b;
      };
      expect(await run()).toEqual(await run());
    });
  });
}
