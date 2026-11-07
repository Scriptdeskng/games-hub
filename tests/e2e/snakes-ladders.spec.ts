import { expect, test, type Page } from '@playwright/test';
import {
  counters,
  eventTypes,
  expectScreen,
  inViewport,
  layoutProblems,
  openGame,
  press,
  watchErrors,
} from './helpers';
import {
  SLUG,
  boardLabelProblems,
  chooseMenu,
  humanTurn,
  isHumanTurn,
  round,
  waitForHuman,
} from './snakes-ladders.helpers';

/** `?tempo=` (test builds only) compresses animations and CPU pauses so real-tap games stay quick. */
const FAST = '?tempo=0.12';
const state = (page: Page): Promise<{ progress: { plays: number; wins: number; rules: object } }> =>
  page.evaluate(() => window.__naijaTest!.getState() as never);

test.describe('snakes-ladders: full playthrough', () => {
  test('menu, how-to, rules, a real game vs 1 CPU, pause, results, replay, quit; zero errors; portal order', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG, FAST);
    await expectScreen(page, 'menu');
    await expect(page.locator('h1')).toHaveText('Snakes & Ladders');

    await press(page.locator('#menu-howto'));
    await expectScreen(page, 'howto');
    await expect(page.locator('.ng-howto__step')).toHaveCount(6);
    await press(page.getByRole('button', { name: 'Got it' }));
    await expectScreen(page, 'menu');

    // every rule is a switch
    await press(page.locator('#menu-rules'));
    await expectScreen(page, 'rules');
    const switches = page.getByRole('switch');
    await expect(switches).toHaveCount(3);
    await expect(switches.nth(1)).toHaveAttribute('aria-checked', 'true');
    await press(switches.nth(1));
    await expect(switches.nth(1)).toHaveAttribute('aria-checked', 'false');
    await press(switches.nth(1));
    await expect(switches.nth(1)).toHaveAttribute('aria-checked', 'true');
    await press(page.getByRole('button', { name: 'Got it' }));
    await expectScreen(page, 'menu');

    // a real game: five turns by tap, so the two-dice turn (5th) and the re-roll are both seen
    await page.evaluate(() => window.__naijaTest!.setSeed(7));
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await expect(page.locator('.sl-pawn')).toHaveCount(2);
    await expect(page.locator('.ng-hud__item')).toHaveCount(2);
    let sawPick = false;
    let rerolled = false;
    for (let turn = 1; turn <= 5; turn++) {
      const log = await humanTurn(page, { reroll: turn === 2 });
      sawPick ||= log.sawPick;
      rerolled ||= log.rerolled;
    }
    expect(sawPick, 'the 5th turn offered two dice').toBe(true);
    expect(rerolled, 're-roll was used').toBe(true);
    const afterReroll = await round(page);
    expect(afterReroll!.players[0]!.rerollLeft).toBe(false);
    await expect(page.locator('#sl-reroll')).toContainText('used');

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
    await expect(page.locator('.ng-stat')).toHaveCount(5);
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
    expect(types).toContain('score');
    expect(types.indexOf('score')).toBeLessThan(types.indexOf('level_complete'));
    expect(types.filter((t) => t === 'level_complete')).toHaveLength(1);
    expect(watch.errors).toEqual([]);
  });

  test('three CPU opponents: four pawns, real turns, then a finished game', async ({ page }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG, FAST);
    await chooseMenu(page, { difficulty: 'Hard', cpus: 3 });
    await page.evaluate(() => window.__naijaTest!.setSeed(21));
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await expect(page.locator('.sl-pawn')).toHaveCount(4);
    await expect(page.locator('.ng-hud__item')).toHaveCount(4);
    for (let i = 0; i < 3; i++) await humanTurn(page);
    const s = await round(page);
    expect(s!.players).toHaveLength(4);
    // the HUD square numbers match the engine
    await expect(async () => {
      const hud = await page.locator('.ng-hud__value').allTextContents();
      const now = await round(page);
      expect(hud.map(Number)).toEqual(now!.players.map((p) => p.pos));
    }).toPass();
    expect((await state(page)).progress.plays).toBe(0);
    await page.evaluate(() => window.__naijaTest!.autoplay({ cpus: 3, difficulty: 'hard' }));
    await expectScreen(page, 'results');
    await expect(page.locator('.ng-stat')).toHaveCount(5);
    expect(watch.errors).toEqual([]);
  });

  test('the animated game plays itself to the end in real time (all three levels)', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG);
    for (const [difficulty, cpus] of [
      ['easy', 1],
      ['medium', 2],
      ['hard', 3],
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

  test('difficulty and opponent pickers reach the game', async ({ page }) => {
    await openGame(page, SLUG, FAST);
    await chooseMenu(page, { difficulty: 'Hard', cpus: 2 });
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    const st = (await page.evaluate(() => window.__naijaTest!.getState())) as {
      difficulty: string;
    };
    expect(st.difficulty).toBe('hard');
    expect((await round(page))!.players).toHaveLength(3);
  });

  test('keyboard: Enter starts, Space rolls and moves, R re-rolls, 1/2 picks, P pauses, Esc resumes', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await page.locator('#menu-play').focus();
    await page.keyboard.press('Enter');
    await expectScreen(page, 'play');
    let sawPick = false;
    let rerolled = false;
    for (let turn = 1; turn <= 5; turn++) {
      const log = await humanTurn(page, { via: 'keys', reroll: turn === 1, pick: 1 });
      sawPick ||= log.sawPick;
      rerolled ||= log.rerolled;
    }
    expect(rerolled).toBe(true);
    expect(sawPick).toBe(true);
    await waitForHuman(page);
    await page.keyboard.press('p');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(isHumanTurn((await round(page))!)).toBe(true);
  });
});

test.describe('snakes-ladders: settings, i18n, persistence', () => {
  test('sound, music, language and the rule switches persist across reloads', async ({ page }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG);
    await press(page.getByRole('button', { name: /Sound/ }));
    await press(page.getByRole('button', { name: /Music/ }));
    await press(page.getByRole('button', { name: /Pidgin/ }));
    await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
    await press(page.locator('#menu-rules'));
    await press(page.getByRole('switch').first()); // exact roll off
    await press(page.getByRole('button', { name: 'I don hear' }));
    await chooseMenu(page, { cpus: 3 });

    await page.reload();
    await page.waitForFunction(() => Boolean(window.__naijaTest));
    await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
    await expect(page.getByRole('button', { name: /Sound/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('pcm');
    const st = await state(page);
    expect((st.progress.rules as { exactFinish: boolean }).exactFinish).toBe(false);
    expect((st.progress as unknown as { cpuCount: number }).cpuCount).toBe(3);
    await press(page.locator('#menu-rules'));
    await expect(page.getByRole('switch').first()).toHaveAttribute('aria-checked', 'false');
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
          players: { pos: number }[];
          turns: { taken: number[] };
        };
        return [s.winner, s.players.map((p) => p.pos), s.turns.taken];
      });
    };
    const a = await run();
    await press(page.getByRole('button', { name: 'Main menu' }));
    expect(await run()).toEqual(a);
  });
});

test.describe('snakes-ladders: lifecycle', () => {
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

test.describe('snakes-ladders: offline second pass', () => {
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
    // board art and connector badges came from the cache
    expect(
      await page.evaluate(() => {
        const img = document.querySelector<HTMLImageElement>('.sl-board__bg');
        return !!img && img.complete && img.naturalWidth > 0;
      }),
    ).toBe(true);
    await page.evaluate(() => window.__naijaTest!.autoplay());
    await expectScreen(page, 'results');
    await context.setOffline(false);
    expect(watch.errors.filter((e) => !e.startsWith('requestfailed'))).toEqual([]);
  });
});

test.describe('snakes-ladders: mock portal (cross-origin iframe)', () => {
  test('events reach only the portal origin, in order, and progress syncs through the API', async ({
    page,
  }) => {
    const token = `tok_e2e_sl_${Date.now()}`;
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

test.describe('snakes-ladders: layout on every screen (en and pcm)', () => {
  for (const lang of ['en', 'pcm']) {
    test(`no overflow or clipped text, board labels fit, primary actions in view [${lang}]`, async ({
      page,
    }) => {
      await openGame(page, SLUG, `?lang=${lang}&tempo=0.12`);
      const seen: string[] = [];
      const check = async (label: string): Promise<void> => {
        (await layoutProblems(page, { include: '.sl-n' })).forEach((p) =>
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
      await inView('rules close', page.locator('.sl-rules .ng-btn'));
      await press(page.locator('.sl-rules .ng-btn'));

      await chooseMenu(page, { cpus: 3 });
      await press(page.locator('#menu-play'));
      await expectScreen(page, 'play');
      await check('play');
      seen.push(...(await boardLabelProblems(page)).map((p) => `board: ${p}`));
      await inView('die', page.locator('.ng-dice'));
      await inView('board', page.locator('.sl-board'));
      await inView('pause', page.locator('.ng-hud .ng-btn'));

      // the decision step (Move / Re-roll) and a two-dice turn both fit
      await press(page.locator('.ng-dice'));
      await expect.poll(async () => (await round(page))?.phase).toBe('decide');
      await expect(page.locator('#sl-move')).toBeVisible();
      await check('play decide');
      await inView('Move', page.locator('#sl-move'));
      await inView('Re-roll', page.locator('#sl-reroll'));
      await press(page.locator('#sl-move'));
      for (let i = 0; i < 3; i++) await humanTurn(page); // turns 2 to 4
      await waitForHuman(page);
      await press(page.locator('.ng-dice'));
      await expect(page.locator('.ng-dice__opt')).toHaveCount(2, { timeout: 15_000 });
      await check('play pick');
      for (const b of await page.locator('.ng-dice__opt').all()) await inView('die choice', b);
      await press(page.locator('.ng-dice__opt').first());

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
        await inView('Play again', page.locator('.ng-results__actions .ng-btn').first());
        await press(page.locator('.ng-results__actions .ng-btn').last());
        await expectScreen(page, 'menu');
      }
      expect(seen).toEqual([]);
    });
  }
});
