import { expect, test } from '@playwright/test';
import { counters, expectScreen, layoutProblems, openGame, press, watchErrors } from './helpers';
import { SLUG, appState, round, startRound } from './sabi-words.helpers';

/** Portal, settings, persistence, lifecycle, offline. */
export function systemTests(): void {
  test.describe('sabi-words: portal origin and narrow screens', () => {
    test('a crafted ?portal= origin gets no request and no token', async ({ page }) => {
      const hits: string[] = [];
      await page.route(
        (u) => u.hostname === 'evil.example',
        (route) => {
          hits.push(route.request().url());
          return route.abort();
        },
      );
      await openGame(page, SLUG, '?token=tok_d14_secret&portal=https://evil.example');
      await page.evaluate(() => window.__naijaTest!.autoplay());
      await expectScreen(page, 'results');
      expect(hits).toEqual([]);
    });

    test('the play screen does not overflow at 320px wide, even on Hard', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await openGame(page, SLUG);
      await press(page.locator('.ng-seg label', { hasText: 'Hard' }));
      await press(page.locator('#menu-play'));
      await expectScreen(page, 'play');
      expect(await layoutProblems(page, { skip: '.sw-board, .sw-banter' })).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      ).toBeLessThanOrEqual(0);
      // a small screen steps the big grid down rather than shrinking the letters
      expect((await round(page)).puzzle.size).toBeLessThanOrEqual(12);
      const cell = await page
        .locator('.sw-tile')
        .first()
        .evaluate((e) => e.getBoundingClientRect().width + 4);
      expect(cell).toBeGreaterThanOrEqual(26);
    });
  });

  test.describe('sabi-words: settings, i18n, persistence', () => {
    test('sound, music and language persist across reloads', async ({ page }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG);
      const sound = page.getByRole('button', { name: /Sound/ });
      await expect(sound).toHaveAttribute('aria-pressed', 'true');
      await press(sound);
      await press(page.getByRole('button', { name: /Music/ }));
      await press(page.getByRole('button', { name: /Pidgin/ }));
      await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
      await page.reload();
      await page.waitForFunction(() => Boolean(window.__naijaTest));
      await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
      await expect(page.getByRole('button', { name: /Sound/ })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      await expect(page.getByRole('button', { name: /Music/ })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(await page.evaluate(() => document.documentElement.lang)).toBe('pcm');
      expect(watch.errors).toEqual([]);
    });

    test('?lang=pcm selects Pidgin, Osas speaks it, and storage never holds a token', async ({
      page,
    }) => {
      await openGame(page, SLUG, '?lang=pcm&token=tok_secret_value');
      await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
      await press(page.locator('#menu-play'));
      await expectScreen(page, 'play');
      await expect(page.locator('.ng-banter')).toContainText('Osas');
      await expect(page.locator('.ng-banter')).toContainText(
        /Make we find some words|look for every side/,
      );
      const dump = await page.evaluate(
        () => JSON.stringify(Object.entries(localStorage)) + location.search,
      );
      expect(dump.replace('?lang=pcm&token=tok_secret_value', '')).not.toContain(
        'tok_secret_value',
      );
      expect(dump).not.toMatch(/\d{9,}/);
    });

    test('progress, coins and stats are saved, shown on the stats screen and survive a reload', async ({
      page,
    }) => {
      await openGame(page, SLUG);
      await page.evaluate(() => window.__naijaTest!.autoplay({ difficulty: 'easy' }));
      await expectScreen(page, 'results');
      await page.reload();
      await page.waitForFunction(() => Boolean(window.__naijaTest));
      const p = (await appState(page)).progress;
      expect(p.plays).toBe(1);
      expect(p.wins).toBe(1);
      expect(p.wordsFound).toBe(6);
      expect(p.coins).toBe(20 + 10 + 3 * 5);
      expect(p.best.easy!.stars).toBe(3);
      await press(page.locator('#menu-stats'));
      await expectScreen(page, 'stats');
      await expect(page.locator('.sw-stats')).toContainText('45');
      expect(await layoutProblems(page)).toEqual([]);
    });

    test('setSeed makes rounds reproducible', async ({ page }) => {
      await openGame(page, SLUG);
      const run = async (): Promise<string> => {
        await page.evaluate(() => window.__naijaTest!.setSeed(42));
        await page.evaluate(() => window.__naijaTest!.autoplay({ difficulty: 'hard' }));
        const s = await appState(page);
        await press(page.getByRole('button', { name: 'Main menu' }));
        return s.packId;
      };
      const letters = async (): Promise<string> => {
        await page.evaluate(() => window.__naijaTest!.setSeed(42));
        await press(page.locator('#menu-play'));
        await expectScreen(page, 'play');
        const l = (await round(page)).puzzle.letters;
        await press(page.getByRole('button', { name: 'Pause' }));
        await press(page.getByRole('button', { name: 'Quit' }));
        return l;
      };
      await run();
      const a = await letters();
      const b = await letters();
      expect(a).toBe(b);
    });
  });

  test.describe('sabi-words: lifecycle and performance', () => {
    test('no leaked listeners, timers or RAF loops across rounds; destroy() clears all', async ({
      page,
    }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG);
      await expectScreen(page, 'menu');
      let base = await counters(page);
      for (let i = 0; i < 4; i++) {
        await press(page.locator('#menu-play'));
        await expectScreen(page, 'play');
        await page.waitForTimeout(200);
        await page.evaluate(() => window.__naijaTest!.autoplay());
        await expectScreen(page, 'results');
        await press(page.getByRole('button', { name: 'Main menu' }));
        await expectScreen(page, 'menu');
        if (i === 1) base = await counters(page);
        else if (i > 1) expect(await counters(page)).toEqual(base);
      }
      const after = await page.evaluate(() => {
        const read = window.__naijaTest!.counters;
        window.__naijaTest!.destroy();
        return { hook: window.__naijaTest, counters: read() };
      });
      expect(after.hook).toBeUndefined();
      expect(after.counters).toEqual({ listeners: 0, timers: 0, rafs: 0 });
      expect(watch.errors).toEqual([]);
    });

    test('destroy() mid-round (a swipe in progress) and right after load leave nothing running', async ({
      page,
    }) => {
      await openGame(page, SLUG);
      await startRound(page, 'Easy');
      const a = await page.locator('.sw-tile').first().boundingBox();
      await page.mouse.move(a!.x + 5, a!.y + 5);
      await page.mouse.down();
      const after = await page.evaluate(() => {
        const read = window.__naijaTest!.counters;
        window.__naijaTest!.destroy();
        return read();
      });
      expect(after).toEqual({ listeners: 0, timers: 0, rafs: 0 });
      await page.mouse.up();
    });

    test('perf hook reports frames while playing', async ({ page }) => {
      await openGame(page, SLUG);
      await press(page.locator('#menu-play'));
      await expectScreen(page, 'play');
      await page.waitForTimeout(1600);
      const perf = await page.evaluate(() => window.__naijaTest!.perf());
      expect(perf).not.toBeNull();
      expect(perf!.frames).toBeGreaterThan(30);
      expect(perf!.fps).toBeGreaterThan(20);
    });
  });

  test.describe('sabi-words: offline second pass', () => {
    test('after the first load the game works offline (service worker), packs included', async ({
      page,
      context,
    }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG);
      const registered = await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.ready;
        return Boolean(reg.active);
      });
      expect(registered).toBe(true);
      await context.setOffline(true);
      await page.reload();
      await page.waitForFunction(() => Boolean(window.__naijaTest));
      await expectScreen(page, 'menu');
      await page.goto(`/${SLUG}/?lang=pcm&token=tok_offline`);
      await page.waitForFunction(() => Boolean(window.__naijaTest));
      await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
      await page.evaluate(() => window.__naijaTest!.autoplay({ pack: 'pidgin-words' }));
      await expectScreen(page, 'results');
      await context.setOffline(false);
      expect(watch.errors.filter((e) => !e.startsWith('requestfailed'))).toEqual([]);
    });
  });

  test.describe('sabi-words: mock portal (cross-origin iframe)', () => {
    test('events reach only the portal origin, in order, and progress syncs through the API', async ({
      page,
    }) => {
      const token = `tok_e2e_${Date.now()}`;
      await page.goto(`http://localhost:4180/?game=sabi-words&token=${token}`);
      const frame = page.frameLocator('#frame');
      await expect(frame.locator('#menu-play')).toBeVisible();
      await expect(page.locator('#order')).toHaveText('ready');
      const handle = await page.locator('#frame').elementHandle();
      const f = await handle!.contentFrame();
      await f!.evaluate(() => window.__naijaTest!.autoplay());
      await expect(page.locator('#order')).toHaveText(
        /^ready > start > score( > score)* > level_complete > end$/,
      );
      await expect(page.locator('#verdict')).toHaveText('order OK');
      const stored = await f!.evaluate(() => JSON.stringify(Object.entries(localStorage)));
      expect(stored).not.toContain(token);
      const res = await page.request.get('http://localhost:4180/api/games/sabi-words/progress', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      expect((await res.json()).data.plays).toBe(1);
    });
  });
}
