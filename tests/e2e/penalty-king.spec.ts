import { expect, test } from '@playwright/test';
import {
  counters,
  eventTypes,
  expectNoSeedInStart,
  expectScreen,
  inViewport,
  layoutProblems,
  openGame,
  press,
  stickyOverlaps,
  watchErrors,
} from './helpers';

const SLUG = 'penalty-king';

test.describe('penalty-king: full playthrough', () => {
  test('menu -> how-to -> play -> pause -> results -> replay with zero errors', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG);
    await expectScreen(page, 'menu');
    await expect(page.locator('h1')).toHaveText('Penalty King');

    // how to play and back
    await press(page.locator('#menu-howto'));
    await expectScreen(page, 'howto');
    await expect(page.locator('.ng-howto__step')).toHaveCount(4);
    await press(page.getByRole('button', { name: 'Got it' }));
    await expectScreen(page, 'menu');

    // start on Medium with a real tap on a bell
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await expect(page.locator('.arena')).toBeVisible();
    await expect(page.locator('.target.is-on').first()).toBeVisible();
    await expect
      .poll(async () => {
        await press(page.locator('.target.is-on:not(.is-hit):not(.is-gone)').first(), {
          timeout: 800,
        }).catch(() => undefined);
        return page.evaluate(
          () => (window.__naijaTest!.getState() as { round: { hits: number } }).round.hits,
        );
      })
      .toBeGreaterThan(0);

    // pause freezes the round, resume continues it
    await press(page.getByRole('button', { name: 'Pause' }));
    await expect(page.getByRole('dialog')).toBeVisible();
    const frozen = await page.evaluate(
      () => (window.__naijaTest!.getState() as { round: { timeLeftMs: number } }).round.timeLeftMs,
    );
    await page.waitForTimeout(400);
    const still = await page.evaluate(
      () => (window.__naijaTest!.getState() as { round: { timeLeftMs: number } }).round.timeLeftMs,
    );
    expect(still).toBe(frozen);
    await press(page.getByRole('button', { name: 'Resume' }));
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.waitForTimeout(300);
    const moved = await page.evaluate(
      () => (window.__naijaTest!.getState() as { round: { timeLeftMs: number } }).round.timeLeftMs,
    );
    expect(moved).toBeLessThan(frozen);

    // finish the round through the test hook
    await page.evaluate(() => window.__naijaTest!.autoplay());
    await expectScreen(page, 'results');
    await expect(page.locator('.ng-results__title')).toHaveText('You win!');
    await expect(page.locator('.ng-stat')).toHaveCount(5);

    // replay starts a fresh round
    await press(page.getByRole('button', { name: 'Play again' }));
    await expectScreen(page, 'play');

    // quit from the pause menu
    await press(page.getByRole('button', { name: 'Pause' }));
    await press(page.getByRole('button', { name: 'Quit' }));
    await expectScreen(page, 'menu');

    // portal events: ready first, then every start is closed by an end (level_complete just
    // before the end of a won round); the abandoned rounds end with quit
    const types = await eventTypes(page);
    expect(types.slice(0, 3)).toEqual(['ready', 'start', 'score']);
    await expectNoSeedInStart(page);
    let open = false;
    types.slice(1).forEach((type, i) => {
      if (type === 'start') {
        expect(open, `start while a round is open at ${i}`).toBe(false);
        open = true;
      } else if (type === 'end') {
        expect(open, `end without start at ${i}`).toBe(true);
        open = false;
      } else if (type === 'level_complete') {
        expect(types[i + 2]).toBe('end');
      } else {
        expect(open, `${type} outside a round`).toBe(true);
      }
    });
    expect(open).toBe(false);
    expect(types.filter((t) => t === 'start')).toHaveLength(3);
    expect(types.filter((t) => t === 'level_complete')).toHaveLength(1);

    expect(watch.errors).toEqual([]);
  });

  test('a lost round shows the encouraging results screen', async ({ page }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG);
    await page.evaluate(() => window.__naijaTest!.autoplay({ win: false }));
    await expectScreen(page, 'results');
    await expect(page.locator('.ng-results__title')).toContainText('Try again');
    expect(await eventTypes(page)).not.toContain('level_complete');
    expect(watch.errors).toEqual([]);
  });

  test('difficulty visibly changes bell size, goal and lifetime', async ({ page }) => {
    await openGame(page, SLUG);
    const sizeFor = async (label: string): Promise<{ size: number; hint: string }> => {
      await expectScreen(page, 'menu');
      await press(page.locator('.ng-seg label', { hasText: label }));
      const hint = (await page.locator('.hint').textContent()) ?? '';
      await press(page.locator('#menu-play'));
      await expectScreen(page, 'play');
      const size = await page
        .locator('.target')
        .first()
        .evaluate((el) => el.getBoundingClientRect().width);
      await press(page.getByRole('button', { name: 'Pause' }));
      await press(page.getByRole('button', { name: 'Quit' }));
      return { size, hint };
    };
    const easy = await sizeFor('Easy');
    const medium = await sizeFor('Medium');
    const hard = await sizeFor('Hard');
    expect(easy.size).toBeGreaterThan(medium.size);
    expect(medium.size).toBeGreaterThan(hard.size);
    expect(hard.size).toBeGreaterThanOrEqual(44);
    expect(new Set([easy.hint, medium.hint, hard.hint]).size).toBe(3);
  });

  test('keyboard: Enter starts, Space hits the oldest bell, P pauses, Escape resumes', async ({
    page,
  }) => {
    await openGame(page, SLUG);
    await page.locator('#menu-play').focus();
    await page.keyboard.press('Enter');
    await expectScreen(page, 'play');
    await expect(page.locator('.target.is-on').first()).toBeVisible();
    await expect
      .poll(async () => {
        await page.keyboard.press(' ');
        return page.evaluate(
          () => (window.__naijaTest!.getState() as { round: { hits: number } }).round.hits,
        );
      })
      .toBeGreaterThan(0);
    await page.keyboard.press('p');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('layout: no horizontal overflow, every control is at least 44px', async ({ page }) => {
    await openGame(page, SLUG);
    const check = async (): Promise<void> => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('button, label, [role=button]')]
          .map((el) => ({ t: el.textContent?.trim() ?? '', r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 44))
          .map(({ t, r }) => `${t} ${Math.round(r.width)}x${Math.round(r.height)}`),
      );
      expect(small).toEqual([]);
    };
    await check();
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await check();
  });
});

test.describe('penalty-king: portal origin (QA D14)', () => {
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
});

test.describe('penalty-king: narrow screens (QA D15)', () => {
  test('HUD labels do not overflow at 320px wide, even on Hard', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openGame(page, SLUG);
    await press(page.locator('.ng-seg label', { hasText: 'Hard' }));
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    expect(await layoutProblems(page)).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
  });
});

test.describe('penalty-king: settings, i18n, persistence', () => {
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

  test('?lang=pcm selects Pidgin and storage never holds a token', async ({ page }) => {
    await openGame(page, SLUG, '?lang=pcm&token=tok_secret_value');
    await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
    const dump = await page.evaluate(
      () => JSON.stringify(Object.entries(localStorage)) + location.search,
    );
    // the token is allowed in the URL only because the portal put it there; it must not be stored
    expect(dump.replace('?lang=pcm&token=tok_secret_value', '')).not.toContain('tok_secret_value');
    expect(dump).not.toMatch(/\d{9,}/);
  });

  test('progress is saved and survives a reload', async ({ page }) => {
    await openGame(page, SLUG);
    await page.evaluate(() => window.__naijaTest!.autoplay({ difficulty: 'easy' }));
    await expectScreen(page, 'results');
    await page.reload();
    await page.waitForFunction(() => Boolean(window.__naijaTest));
    const progress = await page.evaluate(
      () =>
        (window.__naijaTest!.getState() as { progress: { plays: number; wins: number } }).progress,
    );
    expect(progress.plays).toBe(1);
    expect(progress.wins).toBe(1);
  });

  test('setSeed makes rounds reproducible', async ({ page }) => {
    await openGame(page, SLUG);
    const run = async (): Promise<unknown> => {
      await page.evaluate(() => window.__naijaTest!.setSeed(42));
      return page.evaluate(async () => {
        const s = (await window.__naijaTest!.autoplay({ difficulty: 'hard' })) as {
          score: number;
          hits: number;
          misses: number;
        };
        return [s.score, s.hits, s.misses];
      });
    };
    const a = await run();
    await press(page.getByRole('button', { name: 'Main menu' }));
    const b = await run();
    expect(a).toEqual(b);
  });
});

test.describe('penalty-king: lifecycle and performance', () => {
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
      // round 0 starts the music scheduler (audio unlocks on the first tap) and the loader's
      // fade timer may still be pending; from round 1 on the counters must stay flat
      if (i === 1) base = await counters(page);
      else if (i > 1) expect(await counters(page)).toEqual(base);
    }
    // destroy() also removes the hook, so keep a handle on counters() first
    const after = await page.evaluate(() => {
      const read = window.__naijaTest!.counters;
      window.__naijaTest!.destroy();
      return { hook: window.__naijaTest, counters: read() };
    });
    expect(after.hook).toBeUndefined();
    expect(after.counters).toEqual({ listeners: 0, timers: 0, rafs: 0 });
    expect(watch.errors).toEqual([]);
  });

  test('destroy() right after load leaves zero listeners, timers and RAF loops', async ({
    page,
  }) => {
    await openGame(page, SLUG);
    const after = await page.evaluate(() => {
      const read = window.__naijaTest!.counters;
      window.__naijaTest!.destroy(); // well inside the loader's 400 ms fade
      return read();
    });
    expect(after).toEqual({ listeners: 0, timers: 0, rafs: 0 });
    await expect(page.locator('.ng-loader')).toHaveCount(0);
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

test.describe('penalty-king: offline second pass', () => {
  test('after the first load the game works offline (service worker)', async ({
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
    await expect(page.locator('h1')).toHaveText('Penalty King');
    // deep link with portal query string must hit the precached page too
    await page.goto(`/${SLUG}/?lang=pcm&token=tok_offline`);
    await page.waitForFunction(() => Boolean(window.__naijaTest));
    await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
    // and a round is playable offline
    await page.evaluate(() => window.__naijaTest!.autoplay());
    await expectScreen(page, 'results');
    await context.setOffline(false);
    expect(watch.errors.filter((e) => !e.startsWith('requestfailed'))).toEqual([]);
  });
});

test.describe('penalty-king: mock portal (cross-origin iframe)', () => {
  test('events reach only the portal origin, in order, and progress syncs through the API', async ({
    page,
  }) => {
    const token = `tok_e2e_${Date.now()}`; // the mock portal keeps progress per token
    await page.goto(`http://localhost:4180/?game=penalty-king&token=${token}`);
    const frame = page.frameLocator('#frame');
    await expect(frame.locator('#menu-play')).toBeVisible();
    await expect(page.locator('#order')).toHaveText('ready');

    const handle = await page.locator('#frame').elementHandle();
    const f = await handle!.contentFrame();
    await f!.evaluate(() => window.__naijaTest!.autoplay());
    await expect(page.locator('#order')).toHaveText(
      /^ready > start > score( > score)* > level_complete > end$|^ready > start > score > level_complete > end$/,
    );
    await expect(page.locator('#verdict')).toHaveText('order OK');

    // the opaque token never reaches storage; progress did reach the portal API
    const stored = await f!.evaluate(() => JSON.stringify(Object.entries(localStorage)));
    expect(stored).not.toContain(token);
    const res = await page.request.get('http://localhost:4180/api/games/penalty-king/progress', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.plays).toBe(1);
  });
});

test.describe('penalty-king: layout on every screen (en and pcm)', () => {
  for (const lang of ['en', 'pcm']) {
    test(`no overflow or clipped text, primary actions in view [${lang}]`, async ({ page }) => {
      await openGame(page, SLUG, `?lang=${lang}`);
      const seen: string[] = [];
      const check = async (label: string): Promise<void> => {
        (await layoutProblems(page)).forEach((p) => seen.push(`${label}: ${p}`));
      };

      // menu: the play button AND the sound/music/language bar are visible without scrolling
      await expectScreen(page, 'menu');
      await check('menu');
      expect(await inViewport(page.locator('#menu-play')), 'menu Play in view').toBe(true);
      expect(await inViewport(page.locator('.ng-settings')), 'menu settings bar in view').toBe(
        true,
      );

      await press(page.locator('#menu-howto'));
      await expectScreen(page, 'howto');
      await check('howto');
      expect(await inViewport(page.locator('.ng-howto .ng-btn')), 'how-to close in view').toBe(
        true,
      );
      await press(page.locator('.ng-howto .ng-btn'));

      await press(page.locator('#menu-play'));
      await expectScreen(page, 'play');
      await check('play');
      await press(page.getByRole('button', { name: /Pause/ }));
      await expect(page.getByRole('dialog')).toBeVisible();
      await check('pause');
      for (const b of await page.getByRole('dialog').getByRole('button').all()) {
        expect(await inViewport(b), 'pause button in view').toBe(true);
      }
      await page.getByRole('dialog').getByRole('button').last().click({ force: true });
      await expectScreen(page, 'menu');

      // results for every difficulty label ("Medium", "Normal", "Hard Well Well", ...), win and lose
      for (const [difficulty, win] of [
        ['easy', true],
        ['medium', true],
        ['hard', true],
        ['hard', false],
      ] as const) {
        await page.evaluate(([d, w]) => window.__naijaTest!.autoplay({ difficulty: d, win: w }), [
          difficulty,
          win,
        ] as const);
        await expectScreen(page, 'results');
        await check(`results ${difficulty} ${win ? 'win' : 'lose'}`);
        if ((page.viewportSize()?.height ?? 999) <= 500) {
          (await stickyOverlaps(page)).forEach((p) => seen.push(`results: ${p}`));
        }
        expect(
          await inViewport(page.locator('.ng-results__actions .ng-btn').first()),
          'Play again in view',
        ).toBe(true);
        await press(page.locator('.ng-results__actions .ng-btn').last());
        await expectScreen(page, 'menu');
      }
      expect(seen).toEqual([]);
    });
  }
});
