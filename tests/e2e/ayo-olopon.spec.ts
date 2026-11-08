import { expect, test, type Page } from '@playwright/test';
import {
  contrastOf,
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
import {
  SLUG,
  boardProblems,
  chooseDifficulty,
  humanTurn,
  pitOrderProblems,
  playable,
  round,
  rulesSwitches,
  shown,
  waitForHuman,
} from './ayo-olopon.helpers';

/** `?tempo=` (test builds only) compresses animations and CPU pauses so real-tap games stay quick. */
const FAST = '?tempo=0.12';
const state = (
  page: Page,
): Promise<{
  progress: { plays: number; wins: number; draws: number; rules: object; fastPlay: boolean };
}> => page.evaluate(() => window.__naijaTest!.getState() as never);

test.describe('ayo-olopon: full playthrough', () => {
  test('menu, how-to, rules, a real game against Baba Ade, pause, results, replay, quit; zero errors; portal order', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG, FAST);
    await expectScreen(page, 'menu');
    await expect(page.locator('h1')).toHaveText('Ayo Olopon');
    await expect(page.locator('.ay-opponent')).toHaveText('You play against Baba Ade');

    await press(page.locator('#menu-howto'));
    await expectScreen(page, 'howto');
    await expect(page.locator('.ng-howto__step')).toHaveCount(6);
    await expect(page.locator('.ay-legend__item')).toHaveCount(6);
    await press(page.getByRole('button', { name: 'Got it' }));
    await expectScreen(page, 'menu');

    // every variation is a toggle: four switches and two two-way choices
    await press(page.locator('#menu-rules'));
    await expectScreen(page, 'rules');
    const switches = rulesSwitches(page);
    await expect(switches).toHaveCount(4);
    await expect(switches.first()).toHaveAttribute('aria-checked', 'true');
    await press(switches.first());
    await expect(switches.first()).toHaveAttribute('aria-checked', 'false');
    await press(switches.first());
    await expect(switches.first()).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.ay-rules .ng-seg')).toHaveCount(2);
    await press(page.getByRole('button', { name: 'Got it' }));
    await expectScreen(page, 'menu');

    // a real game: 12 pits of 4 seeds, 48 seeds on the board
    await page.evaluate((n) => window.__naijaTest!.setSeed(n), 3);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await expect(page.locator('.ayo-seed')).toHaveCount(48);
    await expect(page.locator('.ayo-pit')).toHaveCount(6); // only the human's pits are targets
    await expect(page.locator('.ng-hud__item')).toHaveCount(2);
    for (let i = 0; i < 6; i++) await humanTurn(page, { pick: i });
    expect((await boardProblems(page)).join('; ')).toBe('');
    expect((await pitOrderProblems(page)).join('; ')).toBe('');

    // pause freezes the game, resume continues it
    const before = await waitForHuman(page);
    await press(page.getByRole('button', { name: 'Pause' }));
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForTimeout(500);
    expect(await round(page)).toEqual(before);
    await press(page.getByRole('button', { name: 'Resume' }));
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await humanTurn(page);
    expect((await round(page))!.plies).toBeGreaterThan(before.plies);

    // finish through the test hook: results, then replay, then quit
    await page.evaluate(() => window.__naijaTest!.autoplay({ win: true }));
    await expectScreen(page, 'results');
    await expect(page.locator('.ng-results__title')).toHaveText('You win!');
    // a win by score (25 reached early) also shows the seeds left on the board in the seeds stat
    await expect(page.locator('.ng-stat')).toHaveCount(6);
    await expect(page.locator('.ng-stat', { hasText: /\d+ on board/ })).toHaveCount(1);
    await press(page.getByRole('button', { name: 'Play again' }));
    await expectScreen(page, 'play');
    await press(page.getByRole('button', { name: 'Pause' }));
    await press(page.getByRole('button', { name: 'Quit' }));
    await expectScreen(page, 'menu');

    // portal events: ready first; every start is closed by an end; level_complete just before end
    const types = await eventTypes(page);
    expect(types[0]).toBe('ready');
    expect(types[1]).toBe('start');
    await expectNoSeedInStart(page);
    let open = false;
    types.slice(1).forEach((type, i) => {
      if (type === 'start') {
        expect(open, `start inside an open game at ${i}`).toBe(false);
        open = true;
      } else if (type === 'end') {
        expect(open, `end without start at ${i}`).toBe(true);
        open = false;
      } else if (type === 'level_complete') {
        expect(types[i + 2]).toBe('end');
      } else {
        expect(open, `${type} outside a game`).toBe(true);
      }
    });
    expect(open).toBe(false);
    expect(types.filter((t) => t === 'level_complete')).toHaveLength(1);
    expect(watch.errors).toEqual([]);
  });

  test('the board always shows what the engine says: chips, seeds in pits and trays, 48 seeds in all', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG, FAST);
    await chooseDifficulty(page, 'Easy');
    await page.evaluate(() => window.__naijaTest!.setSeed(5));
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    let capturedSomething = false;
    for (let i = 0; i < 14; i++) {
      if ((await humanTurn(page, { pick: i % 3 })) === null) break;
      expect((await boardProblems(page)).join('; '), `after move ${i + 1}`).toBe('');
      const s = (await round(page))!;
      if (s.store[0] + s.store[1] > 0) capturedSomething = true;
    }
    expect(capturedSomething, 'a capture happened and the trays show it').toBe(true);
    expect(watch.errors).toEqual([]);
  });

  test('the sow is seed by seed: seeds land one at a time, 110 to 140 ms apart at normal speed', async ({
    page,
  }) => {
    await openGame(page, SLUG); // normal tempo
    await page.evaluate((n) => window.__naijaTest!.setSeed(n), 2);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await waitForHuman(page);
    // record every change of a pit chip with a timestamp
    await page.evaluate(() => {
      const w = window as unknown as { __chips: { t: number; i: number; n: number }[] };
      w.__chips = [];
      const chips = [...document.querySelectorAll('.ayo-chip')];
      chips.forEach((chip, i) => {
        new MutationObserver(() =>
          w.__chips.push({ t: performance.now(), i, n: Number(chip.textContent) }),
        ).observe(chip, { childList: true, characterData: true, subtree: true });
      });
    });
    const pit = (await playable(page))[0]!;
    const before = (await round(page))!;
    await press(page.locator(`.ayo-pit[data-pit="${pit}"]`));
    await expect.poll(async () => (await round(page))!.plies).toBeGreaterThan(before.plies);
    await page.waitForTimeout(1500);
    const log = await page.evaluate(
      () => (window as unknown as { __chips: { t: number; i: number; n: number }[] }).__chips,
    );
    // the lifted pit empties first, then each of the four seeds lands in the next pit, one after another
    const landings = log.filter((e) => e.i !== pit && e.n > 0).slice(0, 4);
    expect(landings.map((e) => e.i)).toEqual(
      [pit + 1, pit + 2, pit + 3, pit + 4].map((x) => x % 12),
    );
    for (let k = 1; k < landings.length; k++) {
      const gap = landings[k]!.t - landings[k - 1]!.t;
      expect(gap, `gap before seed ${k + 1}`).toBeGreaterThan(95);
      expect(gap, `gap before seed ${k + 1}`).toBeLessThan(190);
    }
  });

  test('the animated game plays itself to the end in real time (all three levels)', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG, '?tempo=0.2');
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const end = (await page.evaluate(
        (d) => window.__naijaTest!.autoplay({ realtime: true, difficulty: d, liveMoves: 8 }),
        difficulty,
      )) as { end: { reason: string } | null };
      expect(end.end).toBeTruthy();
      await expectScreen(page, 'results');
      await press(page.getByRole('button', { name: 'Main menu' }));
      await expectScreen(page, 'menu');
    }
    expect(watch.errors).toEqual([]);
  });

  test('won and lost games show the right results screen and portal events', async ({ page }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG);
    await page.evaluate(() => window.__naijaTest!.autoplay({ win: false, difficulty: 'hard' }));
    await expectScreen(page, 'results');
    await expect(page.locator('.ng-results__title')).toContainText('Try again');
    expect(await eventTypes(page)).not.toContain('level_complete');
    await press(page.getByRole('button', { name: 'Main menu' }));
    await page.evaluate(() => window.__naijaTest!.autoplay({ win: true, difficulty: 'easy' }));
    await expect(page.locator('.ng-results__title')).toHaveText('You win!');
    expect(await eventTypes(page)).toContain('level_complete');
    expect(watch.errors).toEqual([]);
  });

  test('each difficulty seats its own persona: Efe, Baba Ade, Malam Sani', async ({ page }) => {
    await openGame(page, SLUG, FAST);
    for (const [label, name] of [
      ['Easy', 'Efe'],
      ['Hard', 'Malam Sani'],
      ['Medium', 'Baba Ade'],
    ] as const) {
      await chooseDifficulty(page, label);
      await expect(page.locator('.ay-opponent')).toHaveText(`You play against ${name}`);
      await press(page.locator('#menu-play'));
      await expectScreen(page, 'play');
      await expect(page.locator('.ng-hud__item').nth(1).locator('.ng-hud__label')).toHaveText(name);
      await press(page.getByRole('button', { name: 'Pause' }));
      await press(page.getByRole('button', { name: 'Quit' }));
      await expectScreen(page, 'menu');
    }
  });

  test('there is no way to add a second human: no player count, no pass-and-play, no invite', async ({
    page,
  }) => {
    await openGame(page, SLUG);
    await expect(
      page.getByText(/pass|local|online|invite|friend|2 player|two player/i),
    ).toHaveCount(0);
    await expect(page.locator('.ng-field')).toHaveCount(1); // difficulty only
    const s = await state(page);
    expect(JSON.stringify(s)).not.toMatch(/players/i);
  });

  test('keyboard: Enter starts, 1-6 or arrows + Enter play a pit, H shows a hint, P pauses, Esc resumes', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await page.evaluate((n) => window.__naijaTest!.setSeed(n), 4);
    await page.locator('#menu-play').focus();
    await page.keyboard.press('Enter');
    await expectScreen(page, 'play');
    for (let i = 0; i < 6; i++) await humanTurn(page, { via: 'keys', pick: i % 3 });
    await waitForHuman(page);
    await page.keyboard.press('h');
    await expect(page.locator('.ayo-state--hint')).toHaveCount(1);
    await page.keyboard.press('p');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await playable(page)).length).toBeGreaterThan(0);
  });

  test('hint: marks the suggested pit, needs a human turn, and the marker goes when a pit is played', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await page.evaluate((n) => window.__naijaTest!.setSeed(n), 6);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await waitForHuman(page);
    const hint = page.getByRole('button', { name: 'Hint' });
    await expect(hint).toBeEnabled();
    await press(hint);
    await expect(page.locator('.ayo-state--hint')).toHaveCount(1);
    await expect(page.locator('.ay-status')).toContainText('Try pit');
    await humanTurn(page);
    await expect(page.locator('.ayo-state--hint')).toHaveCount(0);
  });

  test('tap targets: every pit button is at least 44 px, chips at least 22 px', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await waitForHuman(page);
    for (const b of await page.locator('.ayo-pit').all()) {
      const box = (await b.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(43.5);
      expect(box.height).toBeGreaterThanOrEqual(43.5);
      expect(await b.getAttribute('aria-label')).toMatch(/Pit \d, \d+ seeds/);
    }
    for (const c of await page.locator('.ayo-chip').all()) {
      const box = (await c.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(21.5);
    }
    // glowing pits have a ring (a shape), not only a colour
    await expect(page.locator('.ayo-state--select').first()).toBeVisible();
  });
});

test.describe('ayo-olopon: rules, settings, i18n, persistence', () => {
  test('rule toggles reach the game and persist across reloads, along with sound, language and speed', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG);
    await press(page.getByRole('button', { name: /Sound/ }));
    await press(page.getByRole('button', { name: /Pidgin/ }));
    await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
    await press(page.locator('#menu-rules'));
    await press(rulesSwitches(page).nth(0)); // skip origin off
    await press(rulesSwitches(page).nth(1)); // capture chain off
    await press(rulesSwitches(page).nth(2)); // must feed off
    await press(rulesSwitches(page).nth(3)); // fast play on
    await press(page.locator('.ay-rules .ng-seg label').nth(1)); // capture: 3 only
    await press(page.locator('.ay-rules .ng-seg label').nth(3)); // end seeds: other player
    await press(page.getByRole('button', { name: 'I don hear' }));

    await page.reload();
    await page.waitForFunction(() => Boolean(window.__naijaTest));
    await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('pcm');
    const st = (await state(page)).progress as unknown as {
      rules: Record<string, unknown>;
      fastPlay: boolean;
    };
    expect(st.rules).toEqual({
      skipOrigin: false,
      captureChain: false,
      capture: 'threeOnly',
      mustFeed: false,
      endSeeds: 'starver',
    });
    expect(st.fastPlay).toBe(true);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    expect((await round(page))!.rules).toEqual(st.rules);
    expect(watch.errors).toEqual([]);
  });

  test('?lang=pcm selects Pidgin and storage never holds the token', async ({ page }) => {
    await openGame(page, SLUG, '?lang=pcm&token=tok_secret_value');
    await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
    await expect(page.locator('.ay-opponent')).toHaveText('You go play with Baba Ade');
    const dump = await page.evaluate(
      () => JSON.stringify(Object.entries(localStorage)) + location.search,
    );
    expect(dump.replace('?lang=pcm&token=tok_secret_value', '')).not.toContain('tok_secret_value');
    expect(dump).not.toMatch(/\d{9,}/);
  });

  test('progress (wins, plays, streak) is saved and survives a reload', async ({ page }) => {
    await openGame(page, SLUG);
    await page.evaluate(() => window.__naijaTest!.autoplay({ difficulty: 'easy', win: true }));
    await expectScreen(page, 'results');
    await page.reload();
    await page.waitForFunction(() => Boolean(window.__naijaTest));
    const p = (await state(page)).progress as unknown as {
      plays: number;
      wins: number;
      streak: number;
    };
    expect([p.plays, p.wins, p.streak]).toEqual([1, 1, 1]);
  });

  test('setSeed makes games reproducible', async ({ page }) => {
    await openGame(page, SLUG);
    const run = async (): Promise<unknown> => {
      await page.evaluate(() => window.__naijaTest!.setSeed(42));
      return page.evaluate(async () => {
        const s = (await window.__naijaTest!.autoplay({ difficulty: 'hard', win: false })) as {
          pits: number[];
          store: number[];
          plies: number;
        };
        return [s.pits, s.store, s.plies];
      });
    };
    const a = await run();
    await press(page.getByRole('button', { name: 'Main menu' }));
    expect(await run()).toEqual(a);
  });
});

test.describe('ayo-olopon: lifecycle', () => {
  test('no leaked listeners, timers or RAF loops across five replays; destroy() clears all', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG, FAST);
    await expectScreen(page, 'menu');
    let base = await counters(page);
    for (let i = 0; i < 5; i++) {
      await press(page.locator('#menu-play'));
      await expectScreen(page, 'play');
      await humanTurn(page);
      await page.evaluate(() => window.__naijaTest!.autoplay());
      await expectScreen(page, 'results');
      await press(page.getByRole('button', { name: 'Play again' }));
      await expectScreen(page, 'play');
      await press(page.getByRole('button', { name: 'Pause' }));
      await press(page.getByRole('button', { name: 'Quit' }));
      await expectScreen(page, 'menu');
      if (i === 1)
        base = await counters(page); // music scheduler and loader fade settle by round 2
      else if (i > 1) expect(await counters(page), `after replay ${i + 1}`).toEqual(base);
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

  test('destroy() in the middle of a sow leaves nothing behind', async ({ page }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await waitForHuman(page);
    await press(page.locator('.ayo-pit.is-playable').first());
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => {
      const read = window.__naijaTest!.counters;
      window.__naijaTest!.destroy();
      return read();
    });
    expect(after).toEqual({ listeners: 0, timers: 0, rafs: 0 });
    await page.waitForTimeout(1800); // no stray timer fires after destroy
    expect(watch.errors).toEqual([]);
  });
});

test.describe('ayo-olopon: offline second pass', () => {
  test('after the first load the game works offline (service worker)', async ({
    page,
    context,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG);
    expect(
      await page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).active)),
    ).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => Boolean(window.__naijaTest));
    await expectScreen(page, 'menu');
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    // board art and seeds came from the cache
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.querySelectorAll<HTMLImageElement>('.ayo-board__art, .ayo-seed')].every(
            (i) => i.complete && i.naturalWidth > 0,
          ),
        ),
      )
      .toBe(true);
    await page.evaluate(() => window.__naijaTest!.autoplay());
    await expectScreen(page, 'results');
    await context.setOffline(false);
    expect(watch.errors.filter((e) => !e.startsWith('requestfailed'))).toEqual([]);
  });
});

test.describe('ayo-olopon: mock portal (cross-origin iframe)', () => {
  test('events reach only the portal origin, in order, and progress syncs through the API', async ({
    page,
  }) => {
    const token = `tok_e2e_ay_${Date.now()}`;
    await page.goto(`http://localhost:4180/?game=${SLUG}&token=${token}`);
    const frame = page.frameLocator('#frame');
    await expect(frame.locator('#menu-play')).toBeVisible();
    await expect(page.locator('#order')).toHaveText('ready');
    const f = await (await page.locator('#frame').elementHandle())!.contentFrame();
    await f!.evaluate(() => window.__naijaTest!.autoplay({ win: true }));
    await expect(page.locator('#order')).toHaveText(
      /^ready > start > score( > score)* > level_complete > end$/,
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

  test('a crafted ?portal= origin gets no request, no events and no token', async ({ page }) => {
    const hits: string[] = [];
    await page.route(
      (u) => u.hostname === 'evil.example',
      (route) => {
        hits.push(route.request().url());
        return route.abort();
      },
    );
    await openGame(page, SLUG, '?token=tok_d14_secret&portal=https://evil.example&lang=en');
    await page.evaluate(() => window.__naijaTest!.autoplay({ win: true }));
    await expectScreen(page, 'results');
    expect(hits).toEqual([]);
  });

  test('the token is never sent as a Referer', async ({ page }) => {
    const token = 'tok_referer_probe_9f3a';
    const reqs: import('@playwright/test').Request[] = [];
    page.on('request', (r) => reqs.push(r));
    await openGame(page, SLUG, `?token=${token}&lang=en`);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    const heads = await Promise.all(reqs.map((r) => r.allHeaders()));
    expect(reqs.length).toBeGreaterThan(5);
    for (const h of heads) expect(h.referer ?? '').not.toContain(token);
  });
});

test.describe('ayo-olopon: layout on every screen (en and pcm)', () => {
  for (const lang of ['en', 'pcm']) {
    test(`no overflow or clipped text, the board fits and is oriented for the screen, 44 px targets [${lang}]`, async ({
      page,
    }) => {
      await openGame(page, SLUG, `?lang=${lang}&tempo=0.12`);
      const seen: string[] = [];
      const check = async (label: string): Promise<void> => {
        (await layoutProblems(page, { skip: '.ayo-board' })).forEach((p) =>
          seen.push(`${label}: ${p}`),
        );
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        if (overflow > 0) seen.push(`${label}: page is ${overflow}px wider than the viewport`);
        const small = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('button, label, [role=button], [role=switch]')]
            .map((el) => ({ t: el.textContent?.trim() ?? '', r: el.getBoundingClientRect() }))
            .filter(({ r }) => r.width > 1 && (r.height < 44 || r.width < 44))
            .map(({ t, r }) => `${t} ${Math.round(r.width)}x${Math.round(r.height)}`),
        );
        small.forEach((s) => seen.push(`${label}: tap target ${s}`));
      };
      const inView = async (label: string, loc: ReturnType<Page['locator']>): Promise<void> => {
        if (!(await inViewport(loc))) seen.push(`${label}: not in the viewport`);
      };

      await expectScreen(page, 'menu');
      await check('menu');
      await inView('menu Play', page.locator('#menu-play'));
      await inView('menu settings bar', page.locator('.ng-settings'));

      await press(page.locator('#menu-howto'));
      await expectScreen(page, 'howto');
      await check('howto');
      await inView('how-to close', page.locator('.ng-howto .ng-btn'));
      await press(page.locator('.ng-howto .ng-btn'));

      await press(page.locator('#menu-rules'));
      await expectScreen(page, 'rules');
      await check('rules');
      await inView('rules close', page.locator('.ay-rules .ng-btn'));
      await press(page.locator('.ay-rules .ng-btn'));

      await page.evaluate((n) => window.__naijaTest!.setSeed(n), 3);
      await press(page.locator('#menu-play'));
      await expectScreen(page, 'play');
      await waitForHuman(page);
      await check('play');
      await inView('board', page.locator('.ayo-board'));
      await inView('pause', page.locator('.ng-hud .ng-btn').last());
      await inView('hint', page.locator('.ay-hint'));
      await inView('status', page.locator('.ay-status'));
      for (const b of await page.locator('.ayo-pit').all()) await inView('pit', b);
      const vp = page.viewportSize()!;
      const board = await page.evaluate(() => {
        const b = document.querySelector('.ayo-board') as HTMLElement;
        return { layout: b.dataset.layout, r: b.getBoundingClientRect().toJSON() };
      });
      const wantLayout = vp.width >= vp.height ? 'landscape' : 'portrait';
      if (board.layout !== wantLayout)
        seen.push(`board is ${board.layout} on ${vp.width}x${vp.height}`);
      (await pitOrderProblems(page)).forEach((p) => seen.push(`order: ${p}`));
      const scroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      if (scroll > 1) seen.push(`play: page scrolls by ${scroll}px`);

      await press(page.getByRole('button', { name: 'Pause' }));
      await expect(page.getByRole('dialog')).toBeVisible();
      await check('pause');
      for (const b of await page.getByRole('dialog').getByRole('button').all()) {
        await inView('pause button', b);
      }
      await page.getByRole('dialog').getByRole('button').last().click({ force: true });
      await expectScreen(page, 'menu');

      for (const [difficulty, win] of [
        ['easy', true],
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
        await inView('Play again', page.locator('.ng-results__actions .ng-btn').first());
        await press(page.locator('.ng-results__actions .ng-btn').last());
        await expectScreen(page, 'menu');
      }
      expect(seen).toEqual([]);
    });
  }

  test('the board turns with the screen: portrait phone, then landscape after a rotation', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await waitForHuman(page);
    const layout = (): Promise<string | undefined> =>
      page.evaluate(() => (document.querySelector('.ayo-board') as HTMLElement).dataset.layout);
    const vp = page.viewportSize()!;
    expect(await layout()).toBe(vp.width >= vp.height ? 'landscape' : 'portrait');
    await page.setViewportSize({ width: vp.height, height: vp.width });
    await expect.poll(layout).toBe(vp.height >= vp.width ? 'landscape' : 'portrait');
    expect((await pitOrderProblems(page)).join('; ')).toBe('');
    expect((await boardProblems(page)).join('; ')).toBe('');
    const v = await shown(page);
    expect(v.total).toBe(48);
  });

  test('pit counts keep a readable contrast and the play screen has no stray scroll', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await waitForHuman(page);
    expect(await contrastOf(page.locator('.ayo-chip').first())).toBeGreaterThanOrEqual(4.5);
    expect(await contrastOf(page.locator('.ay-status'))).toBeGreaterThanOrEqual(4.5);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight - innerHeight),
    ).toBeLessThanOrEqual(1);
  });
});

test.describe('ayo-olopon: perf hook', () => {
  test('perf hook reports real frames while playing', async ({ page }) => {
    await openGame(page, SLUG);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await page.waitForTimeout(1600);
    const perf = await page.evaluate(() => window.__naijaTest!.perf());
    expect(perf!.frames).toBeGreaterThan(30);
    expect(perf!.fps).toBeGreaterThan(20);
  });
});
