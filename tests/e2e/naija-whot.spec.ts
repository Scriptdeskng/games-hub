import { expect, test, type Page } from '@playwright/test';
import {
  contrastOf,
  counters,
  eventTypes,
  expectNoSeedInStart,
  expectScreen,
  inViewport,
  layoutProblems,
  settled,
  openGame,
  press,
  stickyOverlaps,
  watchErrors,
} from './helpers';
import {
  SLUG,
  chooseMenu,
  humanTurn,
  isHumanTurn,
  round,
  startWithWhot,
  waitForHuman,
} from './naija-whot.helpers';

/** `?tempo=` (test builds only) compresses animations and CPU pauses so real-tap games stay quick. */
const FAST = '?tempo=0.12';
const state = (
  page: Page,
): Promise<{
  progress: {
    plays: number;
    wins: number;
    rules: Record<string, boolean>;
    autoDraw: boolean;
    cpuCount: number;
  };
}> => page.evaluate(() => window.__naijaTest!.getState() as never);
const switches = (page: Page): ReturnType<Page['getByRole']> => page.getByRole('switch');
const RULE_SWITCH = { autoDraw: 9, lastCard: 5, marketEnds: 7 } as const;

test.setTimeout(120_000);

test.describe('naija-whot: full playthrough', () => {
  test('menu, how-to, rules, a real game vs 1 CPU, pause, results, replay, quit; zero errors; portal order', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG, FAST);
    await expectScreen(page, 'menu');
    await expect(page.locator('h1')).toHaveText('Naija Whot');

    await press(page.locator('#menu-howto'));
    await expectScreen(page, 'howto');
    await expect(page.locator('.ng-howto__step')).toHaveCount(6);
    await expect(page.locator('.wh-legend__item')).toHaveCount(6);
    await press(page.getByRole('button', { name: 'Got it' }));
    await expectScreen(page, 'menu');

    // every house rule is a switch with the Lagos defaults
    await press(page.locator('#menu-rules'));
    await expectScreen(page, 'rules');
    await expect(switches(page)).toHaveCount(11);
    // stackTwo, defendFive, whotOnPending, finishOnSpecial, marketAgain, lastCard, semiLast,
    // marketEnds, calmLate, autoDraw, fastPlay
    const defaults = [
      'true',
      'true',
      'false',
      'true',
      'true',
      'true',
      'false',
      'false',
      'true',
      'true',
      'false',
    ];
    for (const [i, want] of defaults.entries()) {
      await expect(switches(page).nth(i)).toHaveAttribute('aria-checked', want);
    }
    await press(switches(page).first());
    await expect(switches(page).first()).toHaveAttribute('aria-checked', 'false');
    await press(switches(page).first());
    await expect(switches(page).first()).toHaveAttribute('aria-checked', 'true');
    await press(page.getByRole('button', { name: 'Got it' }));
    await expectScreen(page, 'menu');

    // a real game on a fixed seed (the same deal every run): tap cards, draw from the market
    await chooseMenu(page, { difficulty: 'Easy' });
    await page.evaluate(() => window.__naijaTest!.setSeed(11));
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await expect(page.locator('.wh-seat')).toHaveCount(1);
    await expect(page.locator('.wh-fan .whot-card')).toHaveCount(5);
    await expect(page.locator('.ng-hud__item')).toHaveCount(2);
    let played = 0;
    for (let i = 0; i < 8; i++) {
      const log = await humanTurn(page);
      if (log.played) played++;
    }
    expect(played).toBeGreaterThan(0);

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

  for (const cpus of [2, 3] as const) {
    test(`${cpus} CPU opponents: ${cpus} face-down hands, real turns, then a finished game`, async ({
      page,
    }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG, FAST);
      await chooseMenu(page, { difficulty: 'Hard', cpus });
      // a fixed deal (seeds are random per game otherwise): this one is still running after 4 turns
      await page.evaluate(() => window.__naijaTest!.setSeed(11));
      await press(page.locator('#menu-play'));
      await expectScreen(page, 'play');
      await expect(page.locator('.wh-seat')).toHaveCount(cpus);
      await expect(page.locator('.wh-seat .whot-cpu-hand')).toHaveCount(cpus);
      // CPU hands are only card backs: no face is ever rendered for them
      expect(await page.locator('.wh-seat .whot-card[data-card]').count()).toBe(0);
      for (let i = 0; i < 4; i++) await humanTurn(page);
      const s = (await round(page))!;
      expect(s.hands).toHaveLength(cpus + 1);
      expect((await state(page)).progress.plays).toBe(0);
      await page.evaluate(
        (c) => window.__naijaTest!.autoplay({ cpus: c, difficulty: 'hard' }),
        cpus,
      );
      await expectScreen(page, 'results');
      expect(watch.errors).toEqual([]);
    });
  }

  test('the animated game plays itself to the end in real time (all levels, 1 to 3 CPUs)', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG);
    for (const [difficulty, cpus] of [
      ['easy', 1],
      ['medium', 3],
      ['hard', 2],
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

  test('there is no way to add a second human: the menu only offers 1, 2 or 3 CPUs', async ({
    page,
  }) => {
    await openGame(page, SLUG);
    const field = page.locator('.ng-field', { hasText: /Opponents/ });
    await expect(field.locator('label')).toHaveCount(3);
    await expect(page.getByText(/pass|local|online|invite|friend/i)).toHaveCount(0);
  });
});

test.describe('naija-whot: cards, shapes, draw, last card', () => {
  test('a Whot 20: tap twice, pick a shape from the picker, the called shape is shown', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG, FAST);
    await startWithWhot(page);
    await waitForHuman(page);
    const whot = page
      .locator(
        '.wh-fan .whot-card[data-card="49"], .wh-fan .whot-card[data-card="50"], .wh-fan .whot-card[data-card="51"], .wh-fan .whot-card[data-card="52"], .wh-fan .whot-card[data-card="53"]',
      )
      .first();
    await press(whot);
    await expect(whot).toHaveClass(/is-selected/);
    await press(whot);
    await expect(page.locator('.wh-picker')).toBeVisible();
    const shapes = page.locator('.wh-picker .wh-shape');
    await expect(shapes).toHaveCount(5);
    for (const b of await shapes.all()) {
      const box = (await b.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(43.5);
      expect(box.height).toBeGreaterThanOrEqual(43.5);
      expect(await inViewport(b)).toBe(true);
    }
    await press(page.locator('.wh-picker .wh-shape[data-shape="triangle"]'));
    await expect(page.locator('.wh-picker')).toBeHidden();
    await expect
      .poll(
        async () =>
          (await round(page))!.discard.at(-1)! >= 49 || (await round(page))!.called !== null,
      )
      .toBe(true);
    await expect(page.locator('.wh-called')).toBeVisible();
    expect(watch.errors).toEqual([]);
  });

  test('a tapped card that does not fit is refused with a message, not played', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await waitForHuman(page);
    const blocked = page.locator('.wh-fan .whot-card.is-blocked').first();
    if (await blocked.count()) {
      const taken = (await round(page))!.turns.taken[0];
      await press(blocked);
      await expect(page.locator('.wh-status')).toContainText(/fit/);
      expect((await round(page))!.turns.taken[0]).toBe(taken);
    }
  });

  test('with auto-draw off the market asks to be tapped, and tapping it draws', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await press(page.locator('#menu-rules'));
    await press(switches(page).nth(RULE_SWITCH.autoDraw));
    await press(page.getByRole('button', { name: 'Got it' }));
    expect((await state(page)).progress.autoDraw).toBe(false);
    await chooseMenu(page, { difficulty: 'Hard' });
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    let drew = 0;
    for (let i = 0; i < 40 && drew === 0; i++) {
      const s = await waitForHuman(page);
      if (s.phase === 'over') break;
      const before = s.hands[0]!.length;
      const log = await humanTurn(page);
      if (log.drew) {
        drew++;
        expect((await round(page))!.hands[0]!.length).toBeGreaterThanOrEqual(before + 1);
      }
    }
    expect(drew, 'the market was tapped to draw').toBeGreaterThan(0);
  });

  test('tap targets: the fan keeps 44 px per card, the market and Last card are tap-sized', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await settled(page); // measure the resting fan, not a card mid-way through the deal animation
    const cards = await page.locator('.wh-fan .whot-card').all();
    expect(cards.length).toBe(5);
    const boxes = await Promise.all(cards.map((c) => c.boundingBox()));
    for (let i = 0; i < boxes.length - 1; i++) {
      expect(boxes[i + 1]!.x - boxes[i]!.x, `card ${i} visible strip`).toBeGreaterThanOrEqual(44);
    }
    for (const b of boxes) expect(b!.height).toBeGreaterThanOrEqual(44);
    for (const sel of ['.wh-market', '.whot-lastcard', '.ng-hud .ng-btn']) {
      const box = (await page.locator(sel).first().boundingBox())!;
      expect(box.width, sel).toBeGreaterThanOrEqual(43.5);
      expect(box.height, sel).toBeGreaterThanOrEqual(43.5);
    }
  });

  test('a 7-card fan fits the lane without clipping, every card keeping a 44 px strip', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await waitForHuman(page);
    await settled(page);
    // The deal is 5 cards; a 7-card hand (after a penalty) lays out the same way, so grow the real
    // fan to 7 real card buttons by cloning, then measure the real CSS (nothing else touches it).
    await page.evaluate(() => {
      const fan = document.querySelector('.wh-fan') as HTMLElement;
      const have = fan.querySelectorAll('.whot-card').length;
      const src = fan.querySelector('.whot-card') as HTMLElement;
      for (let i = have; i < 7; i++) fan.append(src.cloneNode(true));
    });
    const fan = page.locator('.wh-fan');
    const cards = await page.locator('.wh-fan .whot-card').all();
    expect(cards.length).toBe(7);
    const box = (await fan.boundingBox())!;
    const fit = await fan.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(fit.scroll, 'no horizontal scroll for 7 cards').toBeLessThanOrEqual(fit.client);
    const boxes = await Promise.all(cards.map((c) => c.boundingBox()));
    for (let i = 0; i < boxes.length - 1; i++) {
      expect(boxes[i + 1]!.x - boxes[i]!.x, `strip ${i}`).toBeGreaterThanOrEqual(44);
    }
    const first = boxes[0]!;
    const last = boxes[boxes.length - 1]!;
    expect(first.x, 'first card inside the lane').toBeGreaterThanOrEqual(box.x - 0.5);
    expect(last.x + last.width, 'last card fully inside the lane').toBeLessThanOrEqual(
      box.x + box.width + 0.5,
    );
    // the strip of every card is what a thumb hits: the element under it is that card
    const hits = await page.evaluate(() => {
      const list = [...document.querySelectorAll<HTMLElement>('.wh-fan .whot-card')];
      return list.map((c, i) => {
        const r = c.getBoundingClientRect();
        const next = list[i + 1]?.getBoundingClientRect();
        const x = next ? (r.left + next.left) / 2 : r.left + r.width / 2;
        const el = document.elementFromPoint(x, r.top + r.height / 2);
        return el?.closest('.whot-card') === c;
      });
    });
    expect(hits).toEqual(Array(7).fill(true));
  });

  test('a game that ends on the count-up says why on the results screen', async ({ page }) => {
    await openGame(page, SLUG, FAST);
    await press(page.locator('#menu-rules'));
    await press(switches(page).nth(RULE_SWITCH.marketEnds));
    await expect(switches(page).nth(RULE_SWITCH.marketEnds)).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await press(page.getByRole('button', { name: 'Got it' }));
    await expectScreen(page, 'menu');
    let seenMarket = false;
    let seenEmpty = false;
    for (let i = 0; i < 12 && !(seenMarket && seenEmpty); i++) {
      // fixed seeds: the same games every run (no flake on which way a random game ends)
      const s = (await page.evaluate(
        ([seed, win]) => {
          window.__naijaTest!.setSeed(seed as number);
          return window.__naijaTest!.autoplay({ cpus: 3, difficulty: 'easy', win: win as boolean });
        },
        [1000 + i * 97, i % 2 === 0],
      )) as { endedBy: string };
      await expectScreen(page, 'results');
      const note = page.locator('.wh-endnote');
      if (s.endedBy === 'market') {
        seenMarket = true;
        await expect(note).toHaveText('The market ran out, so the lowest hand total won.');
      } else if (s.endedBy === 'empty') {
        seenEmpty = true;
        await expect(note).toHaveCount(0);
      }
    }
    expect(seenMarket, 'a count-up game was found').toBe(true);
    expect(seenEmpty, 'an empty-hand game was found').toBe(true);
  });

  test('flick a card up to play it', async ({ page }) => {
    await openGame(page, SLUG, FAST);
    await chooseMenu(page, { difficulty: 'Easy' });
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    for (let i = 0; i < 20; i++) {
      const s = await waitForHuman(page);
      if (s.phase === 'over') return;
      const card = page
        .locator(
          '.wh-fan .whot-card.is-playable[data-card]:not([data-card="49"]):not([data-card="50"]):not([data-card="51"]):not([data-card="52"]):not([data-card="53"])',
        )
        .first();
      if (!(await card.count())) {
        await humanTurn(page);
        continue;
      }
      const b = (await card.boundingBox())!;
      const taken = s.turns.taken[0]!;
      await page.mouse.move(b.x + 20, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + 20, b.y - 20, { steps: 3 });
      await page.mouse.move(b.x + 20, b.y - 110, { steps: 4 });
      await page.mouse.up();
      await expect.poll(async () => (await round(page))!.turns.taken[0]).toBeGreaterThan(taken);
      return;
    }
  });

  test('Last card: the button is off at five cards, on at two, and calling it is recorded', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG, FAST);
    const seeds = [11, 12, 13, 14, 15, 16];
    await chooseMenu(page, { difficulty: 'Easy' });
    await page.evaluate((n) => window.__naijaTest!.setSeed(n), seeds[0]!);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await expect(page.locator('.whot-lastcard')).toBeDisabled();
    let pressed = false;
    let catches = 0;
    for (let g = 1; g <= seeds.length && !pressed; g++) {
      for (let i = 0; i < 80 && !pressed; i++) {
        const s = await waitForHuman(page);
        if (s.phase === 'over') break;
        if (s.hands[0]!.length <= 2) {
          await expect(page.locator('.whot-lastcard')).toBeEnabled();
          await press(page.locator('.whot-lastcard'));
          await expect(page.locator('.whot-lastbanner')).toBeVisible();
          expect((await round(page))!.calls[0]).not.toBe('none');
          pressed = true;
          break;
        }
        // a CPU that forgot to call: catch it
        const catchBtn = page.locator('.wh-catch:not([hidden])').first();
        if (await catchBtn.count()) {
          const target = Number(
            await catchBtn.evaluate((e) => (e.closest('.wh-seat') as HTMLElement).dataset.seat),
          );
          const n = s.hands[target]!.length;
          await press(catchBtn, { timeout: 1500 }).catch(() => undefined);
          if ((await round(page))!.hands[target]!.length > n) catches++;
        }
        await humanTurn(page);
      }
      if (!pressed) {
        await page.evaluate((n) => window.__naijaTest!.setSeed(n), seeds[g % seeds.length]!);
        await press(page.locator('.ng-results__actions .ng-btn').first()).catch(() => undefined);
        await expectScreen(page, 'play');
      }
    }
    expect(pressed, 'the human reached two cards and pressed Last card').toBe(true);
    void catches;
    expect(watch.errors).toEqual([]);
  });

  test('with Last card off the button is gone', async ({ page }) => {
    await openGame(page, SLUG, FAST);
    await press(page.locator('#menu-rules'));
    await press(switches(page).nth(RULE_SWITCH.lastCard));
    await press(page.getByRole('button', { name: 'Got it' }));
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await expect(page.locator('.whot-lastcard')).toBeHidden();
    expect((await round(page))!.rules.lastCard).toBe(false);
  });

  test('keyboard: number keys pick, Enter plays, D draws, P pauses, Esc resumes', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await chooseMenu(page, { difficulty: 'Easy' });
    await page.evaluate(() => window.__naijaTest!.setSeed(11));
    await page.locator('#menu-play').focus();
    await page.keyboard.press('Enter');
    await expectScreen(page, 'play');
    let keyed = 0;
    for (let i = 0; i < 6; i++) {
      const log = await humanTurn(page, { via: 'keys' });
      if (log.played) keyed++;
    }
    expect(keyed).toBeGreaterThan(0);
    if ((await waitForHuman(page)).phase === 'over') {
      // a short game: start another one for the pause keys
      await press(page.getByRole('button', { name: 'Play again' }));
      await expectScreen(page, 'play');
      await waitForHuman(page);
    }
    await page.keyboard.press('p');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(isHumanTurn((await round(page))!)).toBe(true);
  });
});

test.describe('naija-whot: settings, i18n, persistence', () => {
  test('sound, music, language, rules and opponents persist across reloads', async ({ page }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG);
    await press(page.getByRole('button', { name: /Sound/ }));
    await press(page.getByRole('button', { name: /Music/ }));
    await press(page.getByRole('button', { name: /Pidgin/ }));
    await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
    await press(page.locator('#menu-rules'));
    await press(switches(page).nth(2)); // Whot cancels a pick: on
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
    const st = (await state(page)).progress;
    expect(st.rules.whotOnPending).toBe(true);
    expect(st.cpuCount).toBe(3);
    await press(page.locator('#menu-rules'));
    await expect(switches(page).nth(2)).toHaveAttribute('aria-checked', 'true');
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
          hands: number[][];
          turns: { taken: number[] };
        };
        return [s.winner, s.hands, s.turns.taken];
      });
    };
    const a = await run();
    await press(page.getByRole('button', { name: 'Main menu' }));
    expect(await run()).toEqual(a);
  });
});

test.describe('naija-whot: lifecycle', () => {
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
      if (i === 1) base = await counters(page);
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
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => {
      const read = window.__naijaTest!.counters;
      window.__naijaTest!.destroy();
      return read();
    });
    expect(after).toEqual({ listeners: 0, timers: 0, rafs: 0 });
    await page.waitForTimeout(1800);
    expect(watch.errors).toEqual([]);
  });
});

test.describe('naija-whot: offline second pass', () => {
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
    // the card sprite is inline and the table art came from the cache
    await expect(page.locator('.wh-fan .whot-card__art use').first()).toHaveAttribute(
      'href',
      /#c-/,
    );
    await page.evaluate(() => window.__naijaTest!.autoplay());
    await expectScreen(page, 'results');
    await context.setOffline(false);
    expect(watch.errors.filter((e) => !e.startsWith('requestfailed'))).toEqual([]);
  });
});

test.describe('naija-whot: mock portal (cross-origin iframe)', () => {
  test('events reach only the portal origin, in order, and progress syncs through the API', async ({
    page,
  }) => {
    const token = `tok_e2e_wh_${Date.now()}`;
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

test.describe('naija-whot: layout on every screen (en and pcm)', () => {
  for (const lang of ['en', 'pcm']) {
    test(`no overflow or clipped text, the table fits the viewport, primary actions in view [${lang}]`, async ({
      page,
    }) => {
      await openGame(page, SLUG, `?lang=${lang}&tempo=0.12`);
      const seen: string[] = [];
      const check = async (label: string): Promise<void> => {
        (await layoutProblems(page, { skip: '.wh-fan' })).forEach((p) =>
          seen.push(`${label}: ${p}`),
        );
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        if (overflow > 0) seen.push(`${label}: page is ${overflow}px wider than the viewport`);
        const small = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('button, label, [role=button], [role=switch]')]
            .filter((el) => !el.hidden && getComputedStyle(el).display !== 'none')
            .map((el) => ({
              t: el.textContent?.trim() ?? el.getAttribute('aria-label') ?? '',
              r: el.getBoundingClientRect(),
            }))
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
      await inView('rules close', page.locator('.wh-rules .ng-btn'));
      await press(page.locator('.wh-rules .ng-btn'));

      await chooseMenu(page, { cpus: 3, difficulty: 'Easy' });
      await press(page.locator('#menu-play'));
      await expectScreen(page, 'play');
      await check('play');
      await inView('hud', page.locator('.ng-hud'));
      await inView('seats', page.locator('.wh-seats'));
      await inView('market', page.locator('.wh-market'));
      await inView('discard', page.locator('.wh-discard'));
      await inView('last card', page.locator('.whot-lastcard'));
      await inView('fan', page.locator('.wh-fan'));
      await inView('status', page.locator('.wh-status'));
      expect(await contrastOf(page.locator('.wh-status'))).toBeGreaterThanOrEqual(4.5);
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight - innerHeight),
      ).toBeLessThanOrEqual(1);

      await waitForHuman(page);
      await press(page.getByRole('button', { name: 'Pause' }));
      await expect(page.getByRole('dialog')).toBeVisible();
      await check('pause');
      for (const b of await page.getByRole('dialog').getByRole('button').all())
        await inView('pause button', b);
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
});

test.describe('naija-whot: portal iframe, permissions, referrer, origins', () => {
  const policyNoise = /permissions policy|devicemotion|accelerometer/i;
  for (const allow of [true, false]) {
    test(`portal iframe ${allow ? 'with' : 'WITHOUT'} allow="accelerometer; gyroscope": no console errors or policy warnings`, async ({
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
      await frame.locator('#menu-play').click();
      await expect(frame.locator('.wh-fan')).toBeVisible();
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
