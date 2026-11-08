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
  FAST,
  SLUG,
  answerBy,
  answerOpen,
  appState,
  playOut,
  chooseDifficulty,
  round,
  startClassic,
  tapPlate,
  waitForQuestion,
} from './sabi-quiz.helpers';

const auto = (page: Page, opts: Record<string, unknown>): Promise<unknown> =>
  page.evaluate((o) => window.__naijaTest!.autoplay(o), opts);

test.describe('sabi-quiz: full playthrough', () => {
  test('menu, how-to, topic, a real Classic round with all three lifelines, pause, results, replay, quit; zero errors; portal order', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG, FAST);
    await expectScreen(page, 'menu');
    await expect(page.locator('h1')).toHaveText('Sabi Quiz');

    await press(page.locator('#menu-howto'));
    await expectScreen(page, 'howto');
    await expect(page.locator('.ng-howto__step')).toHaveCount(5);
    await press(page.getByRole('button', { name: 'Got it' }));
    await expectScreen(page, 'menu');

    // topic picker: nine choices, all topics or one
    await press(page.locator('#menu-topic'));
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.sq-topic')).toHaveCount(9);
    await press(page.locator('.sq-topic[data-topic="all"]'));
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.evaluate((n) => window.__naijaTest!.setSeed(n), 11);
    await startClassic(page);
    await expect(page.locator('.sq-plate')).toHaveCount(4);
    await expect(page.locator('.sq-llbar .sq-ll')).toHaveCount(3);
    await expect(page.locator('.sq-ring')).toBeVisible();

    // question 1: 50/50 removes exactly two wrong plates (shape + letter badge stay on the plates)
    let r = await waitForQuestion(page, 0);
    expect(r.limitMs).toBe(15000);
    await press(page.locator('.sq-ll--5050'));
    await expect(page.locator('.sq-plate[data-state="eliminated"]')).toHaveCount(2);
    r = (await round(page))!;
    expect(r.eliminated).toHaveLength(2);
    expect(r.eliminated).not.toContain(r.questions[0]!.answer);
    await expect(page.locator('.sq-ll--5050')).toBeDisabled();
    await answerBy(page, true, 0);

    // question 2: ask your padi: a poll panel, four bars, percentages add up, the clock holds still
    await waitForQuestion(page, 1);
    await press(page.locator('.sq-ll--padi'));
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.sq-poll .sq-bar')).toHaveCount(4);
    await expect(page.locator('.sq-poll__pct').nth(3)).toHaveCSS('opacity', '1');
    const pcts = await page
      .locator('.sq-poll__pct')
      .allTextContents()
      .then((a) => a.map((x) => parseInt(x, 10)));
    expect(pcts.reduce((a, b) => a + b, 0)).toBe(100);
    const held = (await round(page))!.timeLeftMs;
    await page.waitForTimeout(400);
    expect((await round(page))!.timeLeftMs).toBe(held);
    await press(page.getByRole('button', { name: 'Back to the question' }));
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await answerBy(page, true, 1);

    // question 3: skip swaps in a fresh question, the number stays
    await waitForQuestion(page, 2);
    const before = (await round(page))!.questions[2]!.id;
    await press(page.locator('.sq-ll--skip'));
    await expect.poll(async () => (await round(page))!.questions[2]!.id).not.toBe(before);
    r = (await round(page))!;
    expect(r.skips).toBe(1);
    expect(r.index).toBe(2);
    await expect(page.locator('.sq-ll.is-used')).toHaveCount(3);
    await answerBy(page, true, 2);

    // pause freezes the clock; resume continues
    await waitForQuestion(page, 3);
    await press(page.getByRole('button', { name: 'Pause' }));
    await expect(page.getByRole('dialog')).toBeVisible();
    const frozen = (await round(page))!.timeLeftMs;
    await page.waitForTimeout(400);
    expect((await round(page))!.timeLeftMs).toBe(frozen);
    await press(page.getByRole('button', { name: 'Resume' }));
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(async () => (await round(page))!.timeLeftMs).toBeLessThan(frozen);

    // the rest of the round with real taps, one wrong answer on the way
    await answerBy(page, true, 3);
    for (let i = 4; i < 10; i++) await answerBy(page, i !== 5, i);
    await expectScreen(page, 'results');
    await expect(page.locator('.ng-results__title')).toHaveText('You win!');
    // correct, accuracy, best streak, mode rows beside score and best
    await expect(page.locator('.ng-stat')).toHaveCount(6);
    const done = await appState(page);
    expect(done.progress.plays).toBe(1);
    expect(done.progress.wins).toBe(1);
    expect(done.progress.bestStreak).toBeGreaterThanOrEqual(5);

    await press(page.getByRole('button', { name: 'Play again' }));
    await expectScreen(page, 'play');
    await press(page.getByRole('button', { name: 'Pause' }));
    await press(page.getByRole('button', { name: 'Quit' }));
    await expectScreen(page, 'menu');

    // portal events: ready first; every start is closed by an end; level_complete just before it
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
    expect(types.filter((t) => t === 'start')).toHaveLength(2);
    expect(types.filter((t) => t === 'score')).toHaveLength(10);
    expect(types.filter((t) => t === 'level_complete')).toHaveLength(1);
    expect(watch.errors).toEqual([]);
  });

  test('a lost round shows the encouraging results screen', async ({ page }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG);
    await auto(page, { win: false });
    await expectScreen(page, 'results');
    await expect(page.locator('.ng-results__title')).toContainText('Try again');
    expect(await eventTypes(page)).not.toContain('level_complete');
    expect(watch.errors).toEqual([]);
  });

  test('the timer runs out: a timeout scores nothing, shows the answer, breaks the streak', async ({
    page,
  }) => {
    await openGame(page, SLUG, '?tempo=0.25');
    await startClassic(page);
    await waitForQuestion(page, 0);
    await expect.poll(async () => (await round(page))!.timeouts, { timeout: 15_000 }).toBe(1);
    const r = (await round(page))!;
    expect(r.score).toBe(0);
    await expect(page.locator('.sq-plate[data-state="correct"]')).toHaveCount(1);
    await expect(page.locator('.sq-ring__n')).toHaveText('0');
    // and the round moves on by itself (the next question, or the end of a round that timed out)
    await expect
      .poll(async () => (await round(page))?.index ?? 99, { timeout: 15_000 })
      .toBeGreaterThanOrEqual(1);
  });

  test('difficulty visibly changes the clock, the question mix and the hint', async ({ page }) => {
    await openGame(page, SLUG);
    const probe = async (label: string): Promise<{ limit: number; hard: number; hint: string }> => {
      await expectScreen(page, 'menu');
      await chooseDifficulty(page, label);
      const hint = (await page.locator('.hint').first().textContent()) ?? '';
      await startClassic(page);
      const r = (await round(page))!;
      await press(page.getByRole('button', { name: 'Pause' }));
      await press(page.getByRole('button', { name: 'Quit' }));
      return {
        limit: r.limitMs,
        hard: r.questions.filter((q) => q.difficulty === 'hard').length,
        hint,
      };
    };
    const easy = await probe('Easy');
    const medium = await probe('Medium');
    const hard = await probe('Hard');
    expect([easy.limit, medium.limit, hard.limit]).toEqual([20000, 15000, 10000]);
    expect(easy.hard).toBeLessThan(medium.hard);
    expect(medium.hard).toBeLessThan(hard.hard);
    expect(new Set([easy.hint, medium.hint, hard.hint]).size).toBe(3);
    expect(hard.hint).toContain('Aisha');
    expect(easy.hint).toContain('Chidi');
  });

  test('a topic filter shows only that topic, with its name on the card', async ({ page }) => {
    await openGame(page, SLUG, FAST);
    await press(page.locator('#menu-topic'));
    await press(page.locator('.sq-topic[data-topic="football"]'));
    await expect(page.locator('#menu-topic')).toContainText('Football');
    await startClassic(page);
    const r = (await round(page))!;
    expect(r.questions.every((q) => q.category === 'football')).toBe(true);
    await expect(page.locator('.sq-card__cat')).toContainText('Football');
    expect(r.questions).toHaveLength(10);
  });

  test('keyboard: Enter starts, B answers, F is 50/50, H asks the padi, P pauses, Escape resumes', async ({
    page,
  }) => {
    test.skip(
      await page.evaluate(() => navigator.maxTouchPoints > 0),
      'keyboard run: desktop project',
    );
    await openGame(page, SLUG, FAST);
    await page.locator('#menu-play').focus();
    await page.keyboard.press('Enter');
    await expectScreen(page, 'play');
    await waitForQuestion(page, 0);
    await page.keyboard.press('f');
    await expect(page.locator('.sq-plate[data-state="eliminated"]')).toHaveCount(2);
    await page.keyboard.press('h');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.keyboard.press('p');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('p');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // answer with a letter key: any plate that was not removed
    const r = (await round(page))!;
    const open = [0, 1, 2, 3].filter((i) => !r.eliminated.includes(i));
    await page.keyboard.press('abcd'[open[0]!]!);
    await expect.poll(async () => (await round(page))!.phase).toBe('reveal');
    // digits work too
    await waitForQuestion(page, 1);
    await page.keyboard.press('3');
    await expect.poll(async () => (await round(page))!.phase).toBe('reveal');
    await waitForQuestion(page, 2);
    await page.keyboard.press('l'); // L uses the next lifeline
    await expect
      .poll(async () => (await round(page))!.used.padi || (await round(page))!.used.fifty)
      .toBe(true);
  });

  test('the answer plates are told apart by shape and letter, not colour alone', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await startClassic(page);
    const r = await waitForQuestion(page, 0);
    // each plate carries its own badge art (A circle, B triangle, C square, D star)
    const arts = await page
      .locator('.sq-plate')
      .evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundImage));
    expect(new Set(arts).size).toBe(4);
    // text is readable: ink on the cream plate
    const ratio = await page
      .locator('.sq-plate__t')
      .first()
      .evaluate((el) => {
        const rgb = (c: string): number[] => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        const lum = ([a, b, c]: number[]): number => {
          const f = (v: number): number => {
            const x = (v ?? 0) / 255;
            return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * f(a!) + 0.7152 * f(b!) + 0.0722 * f(c!);
        };
        return (
          (lum(rgb('rgb(255, 243, 218)')) + 0.05) / (lum(rgb(getComputedStyle(el).color)) + 0.05)
        );
      });
    expect(ratio).toBeGreaterThan(7);
    // after the answer: correct and wrong plates use different states (frame and icon), plus a spoken label
    await tapPlate(page, (r.questions[0]!.answer + 1) % 4);
    await expect(page.locator('.sq-plate[data-state="wrong"]')).toHaveCount(1);
    await expect(page.locator('.sq-plate[data-state="correct"]')).toHaveCount(1);
    await expect(page.locator('.sq-plate[data-state="correct"]')).toHaveAttribute(
      'aria-label',
      /correct answer/,
    );
    await expect(page.locator('.sq-plate[data-state="wrong"]')).toHaveAttribute(
      'aria-label',
      /wrong/,
    );
    expect(await contrastOf(page.locator('.sq-streak__n'))).toBeGreaterThan(3);
  });

  test('the streak builds a multiplier badge after three right answers in a row', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await startClassic(page);
    for (let i = 0; i < 3; i++) await answerBy(page, true, i);
    await expect(page.locator('.sq-streak__badge--2')).toBeVisible();
    await expect(page.locator('.sq-streak__n')).toHaveText('3');
    await answerBy(page, false, 3);
    await expect(page.locator('.sq-streak__n')).toHaveText('0');
    await expect(page.locator('.sq-streak__badge--2')).toBeHidden();
  });
});

test.describe('sabi-quiz: Quiz Duel', () => {
  test('intro, a real duel against the contestant, scores, results', async ({ page }) => {
    test.setTimeout(180_000);
    const watch = watchErrors(page);
    // clock at 0.7x speed of the test default: a real tap has about 10 s per 15 s question, and
    // the test answers whichever question is open, so a stalled runner cannot miss an index
    await openGame(page, SLUG, '?tempo=0.7');
    // Easy is Chidi (buzzes at 6 to 11 s): slow enough for real taps on the fast test clock
    await chooseDifficulty(page, 'Easy');
    await press(page.locator('#menu-duel'));
    await expectScreen(page, 'duel');
    await expect(page.locator('.sq-podium')).toBeVisible();
    await expect(page.locator('.sq-duelintro')).toContainText('Chidi');
    await press(page.locator('#duel-start'));
    await expectScreen(page, 'play');
    await expect(page.locator('.sq-llbar')).toHaveCount(0); // no lifelines in a duel
    await expect(page.locator('.sq-duelchip')).toHaveCount(2);
    await expect(page.locator('.sq-duelstatus')).toContainText('Chidi');
    const r0 = await answerOpen(page, true);
    expect(r0.mode).toBe('duel');
    expect(r0.limitMs).toBe(15000);
    // locked in: the question stays open until the contestant buzzes or the time is up
    await expect(page.locator('.sq-duelstatus')).toContainText(/Locked in|Chidi/);
    await expect
      .poll(async () => (await round(page))?.history.length ?? 0)
      .toBeGreaterThanOrEqual(1);
    expect((await round(page))!.score).toBeGreaterThan(100); // 100 + a speed bonus
    // then whichever question is open, until the results show
    expect(await playOut(page, true)).toBeGreaterThanOrEqual(9);
    await expectScreen(page, 'results');
    await expect(page.locator('.ng-results__title')).toHaveText('You win!');
    await expect(page.locator('.ng-stat', { hasText: /Chidi/ })).toHaveCount(1);
    const done = await appState(page);
    expect(done.progress.duel.easy.won).toBe(1);
    expect(watch.errors).toEqual([]);
  });

  test('a duel can be lost, and every contestant is named by difficulty', async ({ page }) => {
    await openGame(page, SLUG);
    for (const [label, name] of [
      ['Easy', 'Chidi'],
      ['Medium', 'Dung'],
      ['Hard', 'Aisha'],
    ] as const) {
      await chooseDifficulty(page, label);
      await press(page.locator('#menu-duel'));
      await expect(page.locator('.sq-duelintro')).toContainText(name);
      await press(page.getByRole('button', { name: 'Back' }));
      await expectScreen(page, 'menu');
    }
    await auto(page, { mode: 'duel', difficulty: 'easy', win: false });
    await expectScreen(page, 'results');
    await expect(page.locator('.ng-results__title')).toContainText('Try again');
    expect((await appState(page)).progress.duel.easy.lost).toBe(1);
    await auto(page, { mode: 'duel', difficulty: 'medium', win: true });
    await expect(page.locator('.ng-results__title')).toHaveText('You win!');
  });
});

test.describe('sabi-quiz: Daily Challenge', () => {
  test('one scored attempt a day, replays are practice, stored by date and nothing else', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    await openGame(page, SLUG);
    await expect(page.locator('.hint', { hasText: 'New questions every day' })).toBeVisible();
    await auto(page, { mode: 'daily', win: true });
    await expectScreen(page, 'results');
    await expect(
      page.locator('.ng-results__sub', { hasText: "Today's score is saved" }),
    ).toBeVisible();
    const first = await appState(page);
    expect(first.daily).not.toBeNull();
    expect(Object.keys(first.daily!).sort()).toEqual(['correct', 'date', 'score']);
    expect(first.daily!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(first.progress.best.daily).toBe(first.daily!.score);
    await press(page.getByRole('button', { name: 'Main menu' }));
    await expect(
      page.locator('.hint', { hasText: `Today's score: ${first.daily!.score}` }),
    ).toBeVisible();

    // the second go is practice: it is marked, and it never changes the saved daily score
    await press(page.locator('#menu-daily'));
    await expectScreen(page, 'play');
    await expect(page.locator('.sq-practice')).toBeVisible();
    // the same ten questions every time today
    const ids1 = (await round(page))!.questions.map((q) => q.id);
    await page.evaluate(() => window.__naijaTest!.autoplay({ mode: 'daily', win: false }));
    await expectScreen(page, 'results');
    await expect(page.locator('.ng-results__sub', { hasText: 'Practice replay' })).toBeVisible();
    const second = await appState(page);
    expect(second.daily).toEqual(first.daily);
    expect(second.progress.best.daily).toBe(first.daily!.score);
    await press(page.getByRole('button', { name: 'Play again' }));
    await expectScreen(page, 'play');
    expect((await round(page))!.questions.map((q) => q.id)).toEqual(ids1);

    // the record survives a reload and keeps replays marked as practice
    await page.reload();
    await page.waitForFunction(() => Boolean(window.__naijaTest));
    expect((await appState(page)).daily).toEqual(first.daily);
    const keys = await page.evaluate(() => Object.keys(localStorage));
    expect(keys.some((k) => k.endsWith(':daily'))).toBe(true);
    expect(keys.join()).not.toMatch(/\d{7,}|token|user/i);
    expect(watch.errors).toEqual([]);
  });
});

test.describe('sabi-quiz: Daily Challenge is one scored start (QA D1)', () => {
  test('start, quit, start again is Practice; the saved score comes only from the first attempt', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    const starts = (): Promise<{ practice?: boolean; mode?: string }[]> =>
      page.evaluate(() =>
        window
          .__naijaTest!.events()
          .filter((e) => e.type === 'start')
          .map((e) => e.data as { practice?: boolean }),
      );
    // first start: the scored attempt; the day is marked used at once
    await press(page.locator('#menu-daily'));
    await expectScreen(page, 'play');
    await expect(page.locator('.sq-practice')).toHaveCount(0);
    expect((await starts())[0]!.practice).toBeUndefined();
    const marked = (await appState(page)).daily;
    expect(marked).toMatchObject({ score: 0, correct: 0 });
    // quit mid-round, then start again: practice
    await press(page.getByRole('button', { name: 'Pause' }));
    await press(page.getByRole('button', { name: 'Quit' }));
    await expectScreen(page, 'menu');
    await press(page.locator('#menu-daily'));
    await expectScreen(page, 'play');
    await expect(page.locator('.sq-practice')).toBeVisible();
    expect((await starts())[1]!.practice).toBe(true);
    // restart from the pause menu is practice too
    await press(page.getByRole('button', { name: 'Pause' }));
    await press(page.getByRole('button', { name: 'Restart' }));
    await expectScreen(page, 'play');
    expect((await starts()).at(-1)!.practice).toBe(true);
    // a finished practice round changes nothing that was saved
    await page.evaluate(() => window.__naijaTest!.autoplay({ mode: 'daily', win: true }));
    await expectScreen(page, 'results');
    await expect(page.locator('.ng-results__sub', { hasText: 'Practice replay' })).toBeVisible();
    const after = await appState(page);
    expect(after.daily).toEqual(marked);
    expect(after.progress.best.daily ?? 0).toBe(0);
    expect(after.progress.wins).toBe(0);
  });
});

test.describe('sabi-quiz: questions that do not load', () => {
  // the service worker would answer for the page and hide the blocked request from page.route
  test.use({ serviceWorkers: 'block' });
  test('a blocked pack shows a friendly retry screen with no game errors, and Retry recovers', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    // the browser itself logs a blocked request; the game must add nothing of its own
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text()))
        errors.push(`console: ${m.text()}`);
    });
    await page.route('**/assets/packs/*.json', (route) => route.abort());
    await openGame(page, SLUG, FAST);
    await expectScreen(page, 'menu');
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'error');
    await expect(page.getByRole('alert')).toContainText('questions');
    await expect(page.locator('#sq-retry')).toBeVisible();
    expect(await inViewport(page.locator('#sq-retry'))).toBe(true);
    // still blocked: stays on the same screen
    await press(page.locator('#sq-retry'));
    await expect(page.getByRole('alert')).toBeVisible();
    await expectScreen(page, 'error');
    // back to the menu works
    await press(page.getByRole('button', { name: 'Main menu' }));
    await expectScreen(page, 'menu');
    // unblock and retry: the round starts
    await page.unroute('**/assets/packs/*.json');
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await waitForQuestion(page, 0);
    expect(errors).toEqual([]);
  });

  test('a pack that fails validation is refused politely (no console errors, no half-loaded round)', async ({
    page,
  }) => {
    const watch = watchErrors(page);
    const bad = encodeURIComponent(
      JSON.stringify({ version: 1, id: 'x', title: 'x', lang: 'en', questions: [{ id: 'a' }] }),
    );
    await openGame(page, SLUG, `?pack=data:application/json,${bad}`);
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'error');
    await press(page.locator('#menu-daily').or(page.getByRole('button', { name: 'Main menu' })));
    await expectScreen(page, 'menu');
    expect(watch.errors).toEqual([]);
  });
});

test.describe('sabi-quiz: layout', () => {
  test('no horizontal overflow and every control is at least 44px on every screen', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    const check = async (label: string): Promise<void> => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${label} overflows`).toBeLessThanOrEqual(0);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('button, label, [role=button]')]
          .map((el) => ({
            t: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim(),
            r: el.getBoundingClientRect(),
          }))
          .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 44))
          .map(({ t, r }) => `${t} ${Math.round(r.width)}x${Math.round(r.height)}`),
      );
      expect(small, `${label} small targets`).toEqual([]);
    };
    await check('menu');
    await press(page.locator('#menu-stats'));
    await expectScreen(page, 'stats');
    await check('stats');
    await press(page.getByRole('button', { name: 'Back' }));
    await press(page.locator('#menu-duel'));
    await check('duel intro');
    await press(page.locator('#duel-start'));
    await expectScreen(page, 'play');
    await check('duel');
    await press(page.getByRole('button', { name: 'Pause' }));
    await press(page.getByRole('button', { name: 'Quit' }));
    await press(page.locator('#menu-play'));
    await expectScreen(page, 'play');
    await check('classic');
    await waitForQuestion(page, 0);
    await press(page.locator('.sq-ll--padi'));
    await expect(page.getByRole('dialog')).toBeVisible();
    await check('poll');
  });

  test('the longest questions and answers fit the card and plates, nothing clipped, on every size', async ({
    page,
  }) => {
    await openGame(page, SLUG, FAST);
    await startClassic(page);
    const r = await waitForQuestion(page, 0);
    // show the longest question and options of the whole pack in the real DOM
    const worst = await page.evaluate(async () => {
      const pack = (await (await fetch('./assets/packs/sabi-core-en.json')).json()) as {
        questions: { q: string; options: string[] }[];
      };
      const q = [...pack.questions].sort((a, b) => b.q.length - a.q.length)[0]!;
      const o = [...pack.questions]
        .flatMap((x) => x.options)
        .sort((a, b) => b.length - a.length)
        .slice(0, 4);
      return { q: q.q, o };
    });
    expect(worst.q.length).toBeLessThanOrEqual(140);
    await page.evaluate((w) => {
      document.querySelector('.sq-card__q')!.textContent = w.q;
      (document.querySelector('.sq-card') as HTMLElement).dataset.len = 'xl';
      document.querySelectorAll('.sq-plate__t').forEach((e, i) => (e.textContent = w.o[i]!));
    }, worst);
    expect(r.questions).toHaveLength(10);
    expect(await layoutProblems(page, { skip: '.sq-stage' })).toEqual([]);
    const fits = await page.evaluate(() => {
      const box = (s: string): DOMRect => document.querySelector(s)!.getBoundingClientRect();
      const out: string[] = [];
      const card = box('.sq-card');
      const text = box('.sq-card__q');
      if (text.bottom > card.bottom - 4) out.push('question text overflows the card');
      document.querySelectorAll('.sq-plate').forEach((p, i) => {
        const pr = p.getBoundingClientRect();
        const tr = p.querySelector('.sq-plate__t')!.getBoundingClientRect();
        if (tr.bottom > pr.bottom || tr.top < pr.top) out.push(`plate ${i} text overflows`);
      });
      const last = box('.sq-llbar');
      if (last.bottom > window.innerHeight + 1) out.push('lifelines below the fold');
      return out;
    });
    expect(fits).toEqual([]);
  });

  for (const lang of ['en', 'pcm']) {
    test(`no overflow or clipped text and the key controls in view on every screen [${lang}]`, async ({
      page,
    }) => {
      await openGame(page, SLUG, `?lang=${lang}&tempo=0.25`);
      const seen: string[] = [];
      const check = async (label: string): Promise<void> => {
        (await layoutProblems(page, { skip: '.sq-stage' })).forEach((p) =>
          seen.push(`${label}: ${p}`),
        );
      };
      await expectScreen(page, 'menu');
      await check('menu');
      expect(await inViewport(page.locator('#menu-play')), 'menu Play in view').toBe(true);
      expect(await inViewport(page.locator('.ng-settings')), 'settings bar in view').toBe(true);

      await press(page.locator('#menu-howto'));
      await expectScreen(page, 'howto');
      await check('howto');
      expect(await inViewport(page.locator('.ng-howto .ng-btn')), 'how-to close in view').toBe(
        true,
      );
      await press(page.locator('.ng-howto .ng-btn'));

      await press(page.locator('#menu-stats'));
      await check('stats');
      expect(
        await inViewport(page.locator('.ng-sticky-actions .ng-btn')),
        'stats back in view',
      ).toBe(true);
      await press(page.locator('.ng-sticky-actions .ng-btn'));

      await press(page.locator('#menu-duel'));
      await check('duel intro');
      expect(await inViewport(page.locator('#duel-start')), 'duel start in view').toBe(true);
      await press(page.locator('#duel-start'));
      await expectScreen(page, 'play');
      await waitForQuestion(page, 0);
      await check('duel play');
      await press(page.getByRole('button', { name: /Pause|pause/ }));
      await check('pause');
      await page.getByRole('dialog').getByRole('button').last().click({ force: true });
      await expectScreen(page, 'menu');

      await press(page.locator('#menu-play'));
      await expectScreen(page, 'play');
      await waitForQuestion(page, 0);
      await check('classic play');
      const bottom = await page.evaluate(
        () =>
          document.querySelector('.sq-llbar')!.getBoundingClientRect().bottom <=
          window.innerHeight + 1,
      );
      expect(bottom, 'lifelines in view').toBe(true);
      await page.evaluate(() => window.__naijaTest!.autoplay({ win: true }));
      await expectScreen(page, 'results');
      await check('results');

      for (const [difficulty, win] of [
        ['easy', true],
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

test.describe('sabi-quiz: portal origin (QA D14)', () => {
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
    await auto(page, {});
    await expectScreen(page, 'results');
    expect(hits).toEqual([]);
  });
});

test.describe('sabi-quiz: narrow screens (QA D15)', () => {
  test('the play screen does not overflow at 320px wide, even on Hard', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openGame(page, SLUG, FAST);
    await chooseDifficulty(page, 'Hard');
    await startClassic(page);
    await waitForQuestion(page, 0);
    expect(await layoutProblems(page, { skip: '.sq-stage' })).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
  });
});

test.describe('sabi-quiz: settings, i18n, persistence', () => {
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

  test('?lang=pcm selects Pidgin, and the host speaks Pidgin on the play screen; storage never holds a token', async ({
    page,
  }) => {
    await openGame(page, SLUG, '?lang=pcm&token=tok_secret_value&tempo=0.25');
    await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
    await expect(page.locator('#menu-duel')).toHaveText('Quiz Duel');
    await startClassic(page);
    await expect(page.locator('.ng-bubble .ng-banter')).toContainText(/Etim/);
    await expect(page.locator('.ng-bubble .ng-banter')).toContainText(
      /Make we start|Finger don ready/,
    );
    const dump = await page.evaluate(
      () => JSON.stringify(Object.entries(localStorage)) + location.search,
    );
    expect(dump.replace('?lang=pcm&token=tok_secret_value&tempo=0.25', '')).not.toContain(
      'tok_secret_value',
    );
    expect(dump).not.toMatch(/\d{9,}/);
  });

  test('progress and stats are saved, shown on the stats screen and survive a reload', async ({
    page,
  }) => {
    await openGame(page, SLUG);
    await auto(page, { difficulty: 'easy' });
    await expectScreen(page, 'results');
    await page.reload();
    await page.waitForFunction(() => Boolean(window.__naijaTest));
    const s = await appState(page);
    expect(s.progress.plays).toBe(1);
    expect(s.progress.wins).toBe(1);
    expect(s.progress.best['classic:easy']).toBeGreaterThan(0);
    await press(page.locator('#menu-stats'));
    await expectScreen(page, 'stats');
    await expect(page.locator('.sq-acc')).toHaveCount(8);
    await expect(page.locator('.sq-stat', { hasText: 'Rounds played' })).toContainText('1');
    const asked = Object.values(s.progress.categories).reduce((a, c) => a + c.asked, 0);
    expect(asked).toBe(10);
  });

  test('setSeed makes rounds reproducible', async ({ page }) => {
    await openGame(page, SLUG);
    const run = async (): Promise<unknown> => {
      await page.evaluate((n) => window.__naijaTest!.setSeed(n), 42);
      return page.evaluate(async () => {
        const s = (await window.__naijaTest!.autoplay({ difficulty: 'hard' })) as {
          score: number;
          questions: { id: string }[];
        };
        return [s.score, s.questions.map((q) => q.id).join()];
      });
    };
    const a = await run();
    await press(page.getByRole('button', { name: 'Main menu' }));
    const b = await run();
    expect(a).toEqual(b);
  });
});

test.describe('sabi-quiz: lifecycle and performance', () => {
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
      await auto(page, i % 2 ? { mode: 'duel' } : {});
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

  test('destroy() mid-question leaves zero listeners, timers and RAF loops', async ({ page }) => {
    await openGame(page, SLUG, FAST);
    await startClassic(page);
    await waitForQuestion(page, 0);
    await press(page.locator('.sq-ll--padi')); // a poll modal is open too
    const after = await page.evaluate(() => {
      const read = window.__naijaTest!.counters;
      window.__naijaTest!.destroy();
      return read();
    });
    expect(after).toEqual({ listeners: 0, timers: 0, rafs: 0 });
  });

  test('destroy() right after load leaves zero listeners, timers and RAF loops', async ({
    page,
  }) => {
    await openGame(page, SLUG);
    const after = await page.evaluate(() => {
      const read = window.__naijaTest!.counters;
      window.__naijaTest!.destroy();
      return read();
    });
    expect(after).toEqual({ listeners: 0, timers: 0, rafs: 0 });
    await expect(page.locator('.ng-loader')).toHaveCount(0);
  });

  test('perf hook reports frames while playing; the ring only animates its arc and transforms', async ({
    page,
  }) => {
    await openGame(page, SLUG);
    await startClassic(page);
    await page.waitForTimeout(1600);
    const perf = await page.evaluate(() => window.__naijaTest!.perf());
    expect(perf).not.toBeNull();
    expect(perf!.frames).toBeGreaterThan(30);
    expect(perf!.fps).toBeGreaterThan(20);
    // no animation or transition on a layout property anywhere on the play screen
    const bad = await page.evaluate(() => {
      const layout = /^(width|height|top|left|right|bottom|margin|padding|font-size|border)/;
      return document
        .getAnimations()
        .map((a) => {
          const fx = a.effect as KeyframeEffect | null;
          return fx
            ? fx
                .getKeyframes()
                .flatMap((k) => Object.keys(k))
                .filter((p) => layout.test(p))
            : [];
        })
        .flat();
    });
    expect(bad).toEqual([]);
  });
});

test.describe('sabi-quiz: offline second pass', () => {
  test('after the first load the game works offline (service worker), questions included', async ({
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
    await expect(page.locator('h1')).toHaveText('Sabi Quiz');
    await page.goto(`/${SLUG}/?lang=pcm&token=tok_offline`);
    await page.waitForFunction(() => Boolean(window.__naijaTest));
    await expect(page.locator('#menu-play')).toHaveText('Oya, Play');
    await auto(page, {});
    await expectScreen(page, 'results');
    await context.setOffline(false);
    expect(watch.errors.filter((e) => !e.startsWith('requestfailed'))).toEqual([]);
  });
});

test.describe('sabi-quiz: mock portal (cross-origin iframe)', () => {
  test('events reach only the portal origin, in order, and progress syncs through the API', async ({
    page,
  }) => {
    const token = `tok_e2e_${Date.now()}`;
    await page.goto(`http://localhost:4180/?game=sabi-quiz&token=${token}`);
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
    const res = await page.request.get('http://localhost:4180/api/games/sabi-quiz/progress', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.plays).toBe(1);
  });
});
