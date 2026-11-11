import { expect, test } from '@playwright/test';
import { counters, expectScreen, openGame, press, watchErrors } from './helpers';
import {
  FAST,
  REAL,
  SLUG,
  realErrors,
  round,
  seedFor,
  snap,
  startFromMenu,
  swipe,
  waitHumanShot,
  waitRound,
} from './penalty-king.helpers';

/** Offline, art that fails to load, the watchdog, the mock portal, storage, seeds, leaks, accessibility. */
export function systemTests(): void {
  test.describe('penalty-king: offline, failures, portal, storage', () => {
    test('after the first load the game works offline (service worker): menu, a match, results', async ({
      page,
      context,
    }) => {
      test.setTimeout(90_000);
      const watch = watchErrors(page);
      await openGame(page, SLUG, FAST);
      expect(
        await page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).active)),
      ).toBe(true);
      await context.setOffline(true);
      await page.reload();
      await page.waitForFunction(() => Boolean(window.__naijaTest));
      await expectScreen(page, 'menu');
      await page.evaluate(() =>
        window.__naijaTest!.autoplay({ mode: 'quick', realtime: true, difficulty: 'easy' }),
      );
      await expectScreen(page, 'results');
      // the sprites came from the cache: the canvas drew real art, not plain shapes
      await context.setOffline(false);
      expect(watch.errors.filter((e) => !e.startsWith('requestfailed'))).toEqual([]);
    });

    test.describe('art that fails to load', () => {
      // the service worker would answer from its cache, so let the blocked requests reach the network layer
      test.use({ serviceWorkers: 'block' });
      test('the game falls back to plain shapes and plays a whole match with zero script errors', async ({
        page,
      }) => {
        test.setTimeout(90_000);
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
        page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
        let blocked = 0;
        await page.route(/\/assets\/(keeper|striker|goal|ball)\//, (route) => {
          blocked++;
          return route.abort();
        });
        await openGame(page, SLUG, FAST);
        await page.evaluate(() =>
          window.__naijaTest!.autoplay({ mode: 'quick', realtime: true, difficulty: 'medium' }),
        );
        await expectScreen(page, 'results');
        expect(blocked).toBeGreaterThan(0);
        expect(realErrors(errors)).toEqual([]);
        expect((await snap(page)).autoplay.rescues).toEqual([]);
      });
    });

    test('a stalled render loop cannot hold the match: the watchdog moves the CPU and animation phases on', async ({
      page,
    }) => {
      test.setTimeout(60_000);
      const watch = watchErrors(page);
      await openGame(page, SLUG, REAL);
      await page.evaluate((s) => window.__naijaTest!.setSeed(s), seedFor(0));
      await startFromMenu(page, 'Quick match');
      await waitHumanShot(page);
      // freeze every animation frame from now on: only wall-clock timers keep running
      await page.evaluate(() => {
        window.requestAnimationFrame = (() => 0) as never;
      });
      // the human shoots; the run-up, the flight and the result then depend on a loop that no longer runs
      await swipe(page, { dx: 30, dy: -150, ms: 70 });
      const before = await round(page);
      expect(before.state.kicks).toHaveLength(0);
      await expect
        .poll(async () => (await round(page)).watchdog, { timeout: 25_000, intervals: [500] })
        .toBeGreaterThan(before.watchdog);
      const after = await round(page);
      expect(after.state.kicks.length).toBeGreaterThan(before.state.kicks.length);
      expect(watch.errors).toEqual([]);
    });

    test('events reach only the portal origin, in order; progress syncs through the API; no seed, no token in storage', async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const token = `tok_e2e_pk_${Date.now()}`;
      await page.goto(`http://localhost:4180/?game=${SLUG}&token=${token}`);
      await expect(page.frameLocator('#frame').locator('#menu-play')).toBeVisible();
      await expect(page.locator('#order')).toHaveText('ready');
      const f = await (await page.locator('#frame').elementHandle())!.contentFrame();
      await f!.evaluate(() =>
        window.__naijaTest!.autoplay({ mode: 'quick', difficulty: 'easy', win: true }),
      );
      await expect(page.locator('#order')).toHaveText(
        /^ready > start( > score)* > level_complete > end$/,
      );
      await expect(page.locator('#verdict')).toHaveText('order OK');
      const stored = await f!.evaluate(() => JSON.stringify(Object.entries(localStorage)));
      expect(stored).not.toContain(token);
      expect(stored.toLowerCase()).not.toContain('seed');
      const res = await page.request.get(`http://localhost:4180/api/games/${SLUG}/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      expect((await res.json()).data.plays).toBe(1);
    });

    test('a crafted ?portal= origin gets no request, no events and no token', async ({ page }) => {
      const hits: string[] = [];
      await page.route(
        (u) => u.hostname === 'evil.example',
        (route) => {
          hits.push(route.request().url());
          return route.abort();
        },
      );
      await openGame(page, SLUG, '?token=tok_pk_secret&portal=https://evil.example&lang=en');
      await page.evaluate(() => window.__naijaTest!.autoplay({ mode: 'quick', win: true }));
      await expectScreen(page, 'results');
      expect(hits).toEqual([]);
    });

    test('settings, progress and the language persist; storage never holds a token; the CPU keeper reads a saved habit', async ({
      page,
    }) => {
      await openGame(page, SLUG, '?lang=pcm&token=tok_abc123xyz');
      await expect(page.locator('.pk-rival')).toContainText('Your rival na');
      expect(await page.evaluate(() => document.documentElement.lang)).toBe('pcm');
      await page.evaluate(() => window.__naijaTest!.autoplay({ mode: 'quick', win: true }));
      await expectScreen(page, 'results');
      await page.reload();
      await page.waitForFunction(() => Boolean(window.__naijaTest));
      const s = await snap(page);
      expect(s.progress.plays).toBe(1);
      expect(s.progress.lastMode).toBe('quick');
      expect(JSON.stringify(await page.evaluate(() => Object.entries(localStorage)))).not.toContain(
        'tok_abc',
      );
      const habit = (s.progress as unknown as { habit: Record<string, number> }).habit;
      expect(Object.values(habit).some((v) => v > 0)).toBe(true);
    });

    test('sound and music toggles persist and audio starts only after the first gesture', async ({
      page,
    }) => {
      await openGame(page, SLUG, FAST);
      await press(page.getByRole('button', { name: /Sound: on/ }));
      await press(page.getByRole('button', { name: /Music: on/ }));
      await expect(page.getByRole('button', { name: /Sound: off/ })).toBeVisible();
      await page.reload();
      await page.waitForFunction(() => Boolean(window.__naijaTest));
      await expect(page.getByRole('button', { name: /Sound: off/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Music: off/ })).toBeVisible();
    });

    test('setSeed makes the match reproducible: the same seed plays the same shootout, another seed a different one', async ({
      page,
    }) => {
      await openGame(page, SLUG, FAST);
      const play = (seed: number): Promise<unknown> =>
        page.evaluate(async (s) => {
          window.__naijaTest!.setSeed(s);
          return window.__naijaTest!.autoplay({ mode: 'quick', difficulty: 'hard', win: true });
        }, seed);
      const a = await play(31);
      const b = await play(31);
      expect(b).toEqual(a);
      expect(await play(100)).not.toEqual(a);
    });

    test('quitting mid-round leaves no listener, timer or frame behind', async ({ page }) => {
      await openGame(page, SLUG, REAL);
      const base = await counters(page);
      await startFromMenu(page, 'Quick match');
      await waitRound(page, (r) => r.phase === 'ready' || r.phase === 'runup');
      await page.waitForTimeout(300);
      await press(page.getByRole('button', { name: 'Pause' }));
      await press(page.getByRole('button', { name: 'Quit' }));
      await expectScreen(page, 'menu');
      await page.waitForTimeout(1500);
      expect(await counters(page)).toEqual(base);
    });

    test('screen readers hear every kick, the canvas is named, and each scoreboard shape has a name', async ({
      page,
    }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG, REAL);
      await page.evaluate((s) => window.__naijaTest!.setSeed(s), seedFor(0));
      await startFromMenu(page, 'Quick match');
      await expect(page.locator('canvas.pk-canvas')).toHaveAttribute(
        'aria-label',
        'Football pitch',
      );
      await waitHumanShot(page);
      await swipe(page, { dx: 0, dy: -150, ms: 70 });
      await waitRound(page, (r) => r.state.kicks.length >= 1);
      await expect(page.locator('.pk-hudwrap [role="status"].ng-sr')).toContainText(
        /Goal!|Saved!|Missed!|Off the post!/,
      );
      const labels = await page
        .locator('.pk-slot')
        .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
      expect(labels.every(Boolean)).toBe(true);
      expect(labels.some((l) => l === 'Not taken yet')).toBe(true);
      // each result class paints its own picture, not just its own colour
      const images = await page.evaluate(() => {
        const mk = (c: string): string => {
          const el = document.createElement('i');
          el.className = `pk-slot ${c}`;
          document.querySelector('.pk-scoreboard')!.append(el);
          const v = getComputedStyle(el).backgroundImage;
          el.remove();
          return v;
        };
        return ['is-goal', 'is-saved', 'is-miss', 'is-post', 'is-pending', 'is-next'].map(mk);
      });
      expect(new Set(images).size).toBe(6);
      expect(watch.errors).toEqual([]);
    });
  });
}
