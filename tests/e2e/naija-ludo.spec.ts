import { expect, test, type Page } from '@playwright/test';
import {
  contrastOf,
  counters,
  eventTypes,
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
  chooseMenu,
  humanTurn,
  isHumanTurn,
  round,
  seedPositionProblems,
  seedWithFirstRoll,
  waitForHuman,
} from './naija-ludo.helpers';

/** `?tempo=` (test builds only) compresses animations and CPU pauses so real-tap games stay quick. */
const FAST = '?tempo=0.12';
const state = (
  page: Page,
): Promise<{ progress: { plays: number; wins: number; rules: object; autoMove: boolean } }> =>
  page.evaluate(() => window.__naijaTest!.getState() as never);

const rulesSwitches = (page: Page): ReturnType<Page['getByRole']> => page.getByRole('switch');

test.describe('naija-ludo: full playthrough', () => {
  test('menu, how-to, rules, a real game vs 1 CPU, pause, results, replay, quit; zero errors; portal order', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG, FAST);
    await expectScreen(page, 'menu');
    await expect(page.locator('h1')).toHaveText('Naija Ludo');

    await press(page.locator('#menu-howto'));
    await expectScreen(page, 'howto');
    await expect(page.locator('.ng-howto__step')).toHaveCount(6);
    await expect(page.locator('.ld-legend__item')).toHaveCount(4);
    await press(page.getByRole('button', { name: 'Got it' }));
    await expectScreen(page, 'menu');

    // every rule is a switch, and the stacks rule is a three-way choice
    await press(page.locator('#menu-rules'));
    await expectScreen(page, 'rules');
    const switches = rulesSwitches(page);
    await expect(switches).toHaveCount(6);
    await expect(switches.first()).toHaveAttribute('aria-checked', 'true');
    await press(switches.first());
    await expect(switches.first()).toHaveAttribute('aria-checked', 'false');
    await press(switches.first());
    await expect(switches.first()).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.ld-rules .ng-seg label')).toHaveCount(3);
    await press(page.getByRole('button', { name: 'Got it' }));
    await expectScreen(page, 'menu');

    // a real game: a 6 first, so the first move is a real choice between four yard seeds
    await page.evaluate((n) => window.__naijaTest!.setSeed(n), seedWithFirstRoll(6));
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await expect(page.locator('.ld-seed')).toHaveCount(8); // 4 + 4 seeds
    await expect(page.locator('.ng-hud__item')).toHaveCount(2);
    let choices = 0;
    let moved = 0;
    for (let i = 0; i < 12; i++) {
      const log = await humanTurn(page);
      choices = Math.max(choices, log.choices);
      if (log.moved) moved++;
    }
    expect(choices, 'the first 6 offered a choice of seeds').toBeGreaterThanOrEqual(2);
    expect(moved).toBeGreaterThan(0);
    expect((await seedPositionProblems(page)).join('; ')).toBe('');

    // pause freezes the game, resume continues it
    const before = await waitForHuman(page);
    await press(page.getByRole('button', { name: 'Pause' }));
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForTimeout(500);
    expect(await round(page)).toEqual(before);
    await press(page.getByRole('button', { name: 'Resume' }));
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await humanTurn(page);
    expect((await round(page))!.turns.taken[0]).toBeGreaterThan(before.turns.taken[0]!);

    // finish through the test hook: results, then replay
    await page.evaluate(() => window.__naijaTest!.autoplay({ win: true }));
    await expectScreen(page, 'results');
    await expect(page.locator('.ng-results__title')).toHaveText('You win!');
    await expect(page.locator('.ng-stat')).toHaveCount(6);
    await press(page.getByRole('button', { name: 'Play again' }));
    await expectScreen(page, 'play');
    await press(page.getByRole('button', { name: 'Pause' }));
    await press(page.getByRole('button', { name: 'Quit' }));
    await expectScreen(page, 'menu');

    // portal events: ready first; every start is closed by an end; level_complete just before end
    const types = await eventTypes(page);
    expect(types[0]).toBe('ready');
    expect(types[1]).toBe('start');
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

  test('three CPU opponents: four seats in four shapes, real turns, then a finished game', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG, FAST);
    await chooseMenu(page, { difficulty: 'Hard', cpus: 3 });
    await page.evaluate(() => window.__naijaTest!.setSeed(21));
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await expect(page.locator('.ld-seed')).toHaveCount(16);
    await expect(page.locator('.ng-hud__item')).toHaveCount(4);
    // the four seats look different without colour: four different seed pictures
    const shapes = await page
      .locator('.ld-seed__img')
      .evaluateAll((els) => [
        ...new Set(els.map((e) => (e as HTMLImageElement).getAttribute('src'))),
      ]);
    expect(shapes).toHaveLength(4);
    for (let i = 0; i < 4; i++) await humanTurn(page);
    const s = await round(page);
    expect(s!.players.map((p) => p.slot)).toEqual([0, 1, 2, 3]);
    expect((await seedPositionProblems(page)).join('; ')).toBe('');
    expect((await state(page)).progress.plays).toBe(0);
    await page.evaluate(() => window.__naijaTest!.autoplay({ cpus: 3, difficulty: 'hard' }));
    await expectScreen(page, 'results');
    expect(watch.errors).toEqual([]);
  });

  test('quick mode: two seeds each and the first seed home wins', async ({ page }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG, FAST);
    await chooseMenu(page, { mode: 'Quick' });
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await expect(page.locator('.ld-seed')).toHaveCount(4);
    expect((await round(page))!.rules.quick).toBe(true);
    await expect(page.locator('.ng-hud__value').first()).toHaveText('0/2');
    await page.evaluate(() => window.__naijaTest!.autoplay({ quick: true, win: true }));
    await expectScreen(page, 'results');
    const end = (await state(page)) as unknown as { progress: { rules: { quick: boolean } } };
    expect(end.progress.rules.quick).toBe(true);
    await expect(page.locator('.ng-results__title')).toHaveText('You win!');
    expect(watch.errors).toEqual([]);
  });

  test('the animated game plays itself to the end in real time (all three levels, 1 and 3 CPUs)', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG);
    for (const [difficulty, cpus] of [
      ['easy', 1],
      ['medium', 3],
      ['hard', 1],
    ] as const) {
      const end = (await page.evaluate(
        ([d, c]) => window.__naijaTest!.autoplay({ realtime: true, difficulty: d, cpus: c }),
        [difficulty, cpus] as const,
      )) as { winner: string };
      expect(end.winner).toBeTruthy();
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

  test('difficulty, opponent and mode pickers reach the game', async ({ page }) => {
    await openGame(page, SLUG, FAST);
    await chooseMenu(page, { difficulty: 'Hard', cpus: 3, mode: 'Quick' });
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    const st = (await page.evaluate(() => window.__naijaTest!.getState())) as {
      difficulty: string;
    };
    expect(st.difficulty).toBe('hard');
    const r = (await round(page))!;
    expect(r.players).toHaveLength(4);
    expect(r.players[0]!.seeds).toHaveLength(2);
  });

  test('there is no way to add a second human: the menu only offers CPUs 1 or 3', async ({
    page,
  }) => {
    await openGame(page, SLUG);
    const field = page.locator('.ng-field', { hasText: /Opponents/ });
    await expect(field.locator('label')).toHaveCount(2);
    await expect(page.getByText(/pass|local|online|invite|friend/i)).toHaveCount(0);
  });

  test('keyboard: Enter starts, Space rolls, number or arrow keys choose a seed, P pauses, Esc resumes', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    // auto-move off so every legal move is chosen with the keyboard
    await press(page.locator('#menu-rules'));
    await press(rulesSwitches(page).nth(4));
    await expect(rulesSwitches(page).nth(4)).toHaveAttribute('aria-checked', 'false');
    await press(page.getByRole('button', { name: 'Got it' }));
    await page.evaluate((n) => window.__naijaTest!.setSeed(n), seedWithFirstRoll(6));
    await page.locator('#menu-play').focus();
    await page.keyboard.press('Enter');
    await expectScreen(page, 'play');
    let choices = 0;
    for (let i = 0; i < 10; i++) {
      const log = await humanTurn(page, { via: 'keys', pick: i % 2 });
      choices = Math.max(choices, log.choices);
    }
    expect(choices).toBeGreaterThanOrEqual(2);
    await waitForHuman(page);
    await page.keyboard.press('p');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(isHumanTurn((await round(page))!)).toBe(true);
  });

  test('tap a seed with auto-move off, and the auto-move setting moves a lone seed by itself', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await press(page.locator('#menu-rules'));
    await press(rulesSwitches(page).nth(4));
    await press(page.getByRole('button', { name: 'Got it' }));
    expect((await state(page)).progress.autoMove).toBe(false);
    await page.evaluate((n) => window.__naijaTest!.setSeed(n), seedWithFirstRoll(6));
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    // first roll is a 6: four yard seeds glow, each a 44 px target with a name
    await press(page.locator('.ng-dice'));
    await expect(page.locator('.ld-seed__hit:not([hidden])')).toHaveCount(4, { timeout: 15_000 });
    for (const b of await page.locator('.ld-seed__hit:not([hidden])').all()) {
      const box = (await b.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(43.5);
      expect(box.height).toBeGreaterThanOrEqual(43.5);
      expect(await b.getAttribute('aria-label')).toMatch(/Seed \d: move 6/);
    }
    // glowing seeds have a ring (a shape), not only a colour
    await expect(page.locator('.ld-seed.is-movable .ld-seed__ring').first()).toBeVisible();
    await press(page.locator('.ld-seed__hit:not([hidden])').nth(2));
    await expect.poll(async () => (await round(page))!.players[0]!.seeds).toEqual([-1, -1, 0, -1]);
  });

  test('auto-move (default): a lone legal move is made without a tap', async ({ page }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG, FAST);
    expect((await state(page)).progress.autoMove).toBe(true);
    await page.evaluate((n) => window.__naijaTest!.setSeed(n), seedWithFirstRoll(6));
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await humanTurn(page); // the 6: four yard seeds, a real choice
    let autoMoves = 0;
    for (let i = 0; i < 25 && autoMoves < 2; i++) {
      const s0 = await waitForHuman(page);
      const t0 = s0.turns.taken[0]!;
      await press(page.locator('.ng-dice'));
      let tapped = false;
      await expect
        .poll(
          async () => {
            const s = (await round(page))!;
            const hits = await page.locator('.ld-seed__hit:not([hidden])').count();
            if (hits > 1) {
              tapped = true;
              await press(page.locator('.ld-seed__hit:not([hidden])').first());
            }
            return s.phase === 'over' || (s.turns.taken[0] ?? 0) > t0;
          },
          { timeout: 20_000, intervals: [50, 100, 200] },
        )
        .toBe(true);
      // a human move we never tapped was made by the auto-move setting
      if (!tapped && (await round(page))!.lastMove?.playerId === 'you') autoMoves++;
    }
    expect(autoMoves, 'a lone seed moved by itself').toBeGreaterThanOrEqual(1);
    expect(watch.errors).toEqual([]);
  });
});

test.describe('naija-ludo: settings, i18n, persistence', () => {
  test('sound, music, language, rules and mode persist across reloads', async ({ page }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG);
    await press(page.getByRole('button', { name: /Sound/ }));
    await press(page.getByRole('button', { name: /Music/ }));
    await press(page.getByRole('button', { name: /Pidgin/ }));
    await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
    await press(page.locator('#menu-rules'));
    await press(rulesSwitches(page).first()); // capture bonus off
    await press(page.locator('.ld-rules .ng-seg label').nth(1)); // stacks: block
    await press(page.getByRole('button', { name: 'I don hear' }));
    await chooseMenu(page, { cpus: 3, mode: 'Quick' });

    await page.reload();
    await page.waitForFunction(() => Boolean(window.__naijaTest));
    await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
    await expect(page.getByRole('button', { name: /Sound/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('pcm');
    const st = (await state(page)).progress as unknown as {
      rules: { captureBonus: boolean; stacks: string; quick: boolean };
      cpuCount: number;
    };
    expect(st.rules.captureBonus).toBe(false);
    expect(st.rules.stacks).toBe('block');
    expect(st.rules.quick).toBe(true);
    expect(st.cpuCount).toBe(3);
    await press(page.locator('#menu-rules'));
    await expect(rulesSwitches(page).first()).toHaveAttribute('aria-checked', 'false');
    expect(watch.errors).toEqual([]);
  });

  test('?lang=pcm selects Pidgin and storage never holds the token', async ({ page }) => {
    await openGame(page, SLUG, '?lang=pcm&token=tok_secret_value');
    await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
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
          winner: string;
          players: { seeds: number[] }[];
          turns: { taken: number[] };
        };
        return [s.winner, s.players.map((p) => p.seeds), s.turns.taken];
      });
    };
    const a = await run();
    await press(page.getByRole('button', { name: 'Main menu' }));
    expect(await run()).toEqual(a);
  });
});

test.describe('naija-ludo: lifecycle', () => {
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

  test('destroy() in the middle of a CPU turn leaves nothing behind', async ({ page }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await press(page.locator('.ng-dice'));
    await page.waitForTimeout(300);
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

test.describe('naija-ludo: offline second pass', () => {
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
    await page.goto(`/${SLUG}/?lang=pcm&token=tok_offline`);
    await page.waitForFunction(() => Boolean(window.__naijaTest));
    await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    // board art and seeds came from the cache
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.querySelectorAll<HTMLImageElement>('.ld-board__bg, .ld-seed__img')].every(
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

test.describe('naija-ludo: mock portal (cross-origin iframe)', () => {
  test('events reach only the portal origin, in order, and progress syncs through the API', async ({
    page,
  }) => {
    const token = `tok_e2e_ld_${Date.now()}`;
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
});

test.describe('naija-ludo: layout on every screen (en and pcm)', () => {
  for (const lang of ['en', 'pcm']) {
    test(`no overflow or clipped text, the 15x15 board stays legible, primary actions in view [${lang}]`, async ({
      page,
    }) => {
      await openGame(page, SLUG, `?lang=${lang}&tempo=0.12`);
      const seen: string[] = [];
      const check = async (label: string): Promise<void> => {
        (await layoutProblems(page, { skip: '.ld-board' })).forEach((p) =>
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
      await inView('rules close', page.locator('.ld-rules .ng-btn'));
      await press(rulesSwitches(page).nth(4)); // auto-move off: the choice is shown below
      await press(page.locator('.ld-rules .ng-btn'));

      await chooseMenu(page, { cpus: 3 });
      await page.evaluate((n) => window.__naijaTest!.setSeed(n), seedWithFirstRoll(6));
      await press(page.locator('#menu-play'));
      await expectScreen(page, 'play');
      await check('play');
      (await boardProblems(page)).forEach((p) => seen.push(`board: ${p}`));
      await inView('die', page.locator('.ng-dice'));
      await inView('board', page.locator('.ld-board'));
      await inView('pause', page.locator('.ng-hud .ng-btn'));
      await inView('status', page.locator('.ld-status'));

      // the move choice: four glowing yard seeds, each a 44 px target inside the viewport
      await press(page.locator('.ng-dice'));
      await expect(page.locator('.ld-seed__hit:not([hidden])')).toHaveCount(4, {
        timeout: 15_000,
      });
      await check('play choice');
      for (const b of await page.locator('.ld-seed__hit:not([hidden])').all()) {
        await inView('seed target', b);
      }
      await press(page.locator('.ld-seed__hit:not([hidden])').first());

      await waitForHuman(page);
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

  test('seed targets keep a readable contrast and the board has no stray scroll', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    expect(await contrastOf(page.locator('.ld-status'))).toBeGreaterThanOrEqual(4.5);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight - innerHeight),
    ).toBeLessThanOrEqual(1);
  });
});

test.describe('naija-ludo: portal iframe, permissions, referrer, origins', () => {
  const policyNoise = /permissions policy|devicemotion|accelerometer/i;
  for (const allow of [true, false]) {
    test(`portal iframe ${allow ? 'with' : 'WITHOUT'} allow="accelerometer; gyroscope": a game logs no console errors or policy warnings`, async ({
      page,
    }) => {
      const noise: string[] = [];
      const watch = watchErrors(page);
      page.on(
        'console',
        (m) => policyNoise.test(m.text()) && noise.push(`${m.type()}: ${m.text()}`),
      );
      const token = `tok_e2e_perm_${Date.now()}`;
      await page.goto(
        `http://localhost:4180/?game=${SLUG}&token=${token}&tempo=0.15${allow ? '' : '&noallow=1'}`,
      );
      const frame = page.frameLocator('#frame');
      await expect(frame.locator('#menu-play')).toBeVisible();
      const f = await (await page.locator('#frame').elementHandle())!.contentFrame();
      const allowed = await f!.evaluate(
        () =>
          (
            document as unknown as { featurePolicy?: { allowsFeature(f: string): boolean } }
          ).featurePolicy?.allowsFeature('accelerometer') ?? true,
      );
      expect(allowed, 'the iframe policy is the one under test').toBe(allow);
      await frame.locator('#menu-play').click();
      await expect(frame.locator('.ng-dice')).toBeVisible();
      await frame.locator('.ng-dice').click();
      await page.waitForTimeout(1500);
      expect(noise).toEqual([]);
      expect(watch.errors).toEqual([]);
    });
  }

  test('the token is never sent as a Referer, and the portal API still works', async ({ page }) => {
    const token = 'tok_referer_probe_9f3a';
    const reqs: import('@playwright/test').Request[] = [];
    page.on('request', (r) => reqs.push(r));
    await openGame(page, SLUG, `?token=${token}&lang=en`);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    const heads = await Promise.all(reqs.map((r) => r.allHeaders()));
    expect(reqs.length).toBeGreaterThan(5);
    for (const h of heads) expect(h.referer ?? '').not.toContain(token);
    expect(
      await page.evaluate(() =>
        document.querySelector('meta[name=referrer]')?.getAttribute('content'),
      ),
    ).toBe('no-referrer');
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

  test('an https localhost ?portal= is not a portal either', async ({ page }) => {
    const hits: string[] = [];
    await page.route(
      (u) => u.hostname === 'localhost' && u.protocol === 'https:',
      (route) => {
        hits.push(route.request().url());
        return route.abort();
      },
    );
    await openGame(page, SLUG, '?token=tok_https_local&portal=https://localhost:8443&lang=en');
    await page.evaluate(() => window.__naijaTest!.autoplay({ win: true }));
    await expectScreen(page, 'results');
    expect(hits).toEqual([]);
  });

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
