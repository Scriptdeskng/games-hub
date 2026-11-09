import { expect, test } from '@playwright/test';
import {
  expectScreen,
  inViewport,
  layoutProblems,
  openGame,
  press,
  settled,
  stickyOverlaps,
} from './helpers';
import { SLUG, appState, choosePack, round, startRound, swipeWord } from './sabi-words.helpers';

/** Controls under 44 px, except the letter tiles: those are chosen by the 0.4 x cell hit circle. */
const smallTargets = (page: import('@playwright/test').Page): Promise<string[]> =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, label, [role=button]')]
      .filter((el) => !el.classList.contains('sw-tile'))
      .map((el) => ({
        t: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim(),
        r: el.getBoundingClientRect(),
      }))
      .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 44))
      .map(({ t, r }) => `${t} ${Math.round(r.width)}x${Math.round(r.height)}`),
  );

export function layoutTests(): void {
  test.describe('sabi-words: layout', () => {
    for (const lang of ['en', 'pcm']) {
      test(`no overflow and no tiny control on any screen [${lang}]`, async ({ page }) => {
        test.setTimeout(150_000); // twelve full-page layout scans
        await openGame(page, SLUG, `?lang=${lang}`);
        const seen: string[] = [];
        const check = async (label: string): Promise<void> => {
          await settled(page);
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          );
          if (overflow > 0) seen.push(`${label}: page overflows by ${overflow}px`);
          (await layoutProblems(page, { skip: '.sw-board, .sw-banter' })).forEach((p) =>
            seen.push(`${label}: ${p}`),
          );
          (await smallTargets(page)).forEach((p) => seen.push(`${label}: small ${p}`));
        };
        await expectScreen(page, 'menu');
        await check(`menu ${lang}`);
        expect(await inViewport(page.locator('#menu-play'))).toBe(true);
        expect(await inViewport(page.locator('.ng-settings'))).toBe(true);
        await press(page.locator('#menu-pack'));
        await check(`packs ${lang}`);
        await press(page.locator('.sw-packlist .sw-pack').first());
        await press(page.locator('#menu-stats'));
        await check(`stats ${lang}`);
        await press(page.locator('.sw-stats .ng-btn'));
        await press(page.locator('#menu-howto'));
        await check(`howto ${lang}`);
        await press(page.locator('.ng-howto .ng-btn'));
        for (const label of ['Easy', 'Medium', 'Hard']) {
          await press(page.locator('.ng-seg label').nth(['Easy', 'Medium', 'Hard'].indexOf(label)));
          await press(page.locator('#menu-play'));
          await expectScreen(page, 'play');
          await check(`play ${label} ${lang}`);
          await press(page.getByRole('button', { name: /Pause|Rest/ }));
          await expect(page.getByRole('dialog')).toBeVisible();
          await check(`pause ${label} ${lang}`);
          await page.getByRole('dialog').getByRole('button').last().click({ force: true });
          await expectScreen(page, 'menu');
        }
        for (const [d, win] of [
          ['easy', true],
          ['hard', true],
          ['hard', false],
        ] as const) {
          await page.evaluate(
            ([dd, w]) => window.__naijaTest!.autoplay({ difficulty: dd, win: w }),
            [d, win] as const,
          );
          await expectScreen(page, 'results');
          await check(`results ${d} ${win} ${lang}`);
          if ((page.viewportSize()?.height ?? 999) <= 500)
            (await stickyOverlaps(page)).forEach((p) => seen.push(`results: ${p}`));
          expect(await inViewport(page.locator('.ng-results__actions .ng-btn').first())).toBe(true);
          await press(page.locator('.ng-results__actions .ng-btn').last());
          await expectScreen(page, 'menu');
        }
        expect(seen, lang).toEqual([]);
      });
    }

    test('the grid fits the screen at every level: whole board in view, letters 15 px, cells 26 px or more', async ({
      page,
    }) => {
      await openGame(page, SLUG);
      const vp = page.viewportSize()!;
      for (const label of ['Easy', 'Medium', 'Hard']) {
        await press(page.locator('.ng-seg label', { hasText: label }));
        const r = await startRound(page);
        await settled(page);
        const geo = await page.evaluate(() => {
          const board = document.querySelector('.sw-board')!.getBoundingClientRect();
          const tile = document.querySelector('.sw-tile')!;
          const letter = getComputedStyle(document.querySelector('.sw-tile__l')!);
          return {
            left: board.left,
            right: board.right,
            top: board.top,
            bottom: board.bottom,
            cell: tile.getBoundingClientRect().width + 4,
            font: parseFloat(letter.fontSize),
          };
        });
        expect(geo.left, label).toBeGreaterThanOrEqual(0);
        expect(geo.right, label).toBeLessThanOrEqual(vp.width);
        expect(geo.top, label).toBeGreaterThanOrEqual(0);
        expect(geo.bottom, `${label} board bottom in view`).toBeLessThanOrEqual(vp.height);
        expect(geo.cell, `${label} cell`).toBeGreaterThanOrEqual(26);
        expect(geo.font, `${label} font`).toBeGreaterThanOrEqual(15);
        // the size is the level's own, or stepped down (12 -> 10 -> 8) only on a screen too small for it
        expect([8, 10, 12]).toContain(r.puzzle.size);
        if (label === 'Easy') expect(r.puzzle.size).toBe(8);
        if (vp.width >= 360 && vp.height >= 640 && vp.width < vp.height)
          expect(r.puzzle.size).toBe({ Easy: 8, Medium: 10, Hard: 12 }[label]);
        expect(await inViewport(page.locator('.sw-hint'))).toBe(true);
        await press(page.getByRole('button', { name: 'Pause' }));
        await press(page.getByRole('button', { name: 'Quit' }));
      }
    });

    test('found words use pattern and underline, not colour alone, and the lanes cycle', async ({
      page,
    }) => {
      await openGame(page, SLUG);
      await startRound(page, 'Easy');
      await page.evaluate(() => window.__naijaTest!.getState());
      const r = await round(page);
      expect(r.puzzle.words).toHaveLength(6);
      // find all six through the engine path and inspect the finished board on the results slip
      await page.evaluate(() => window.__naijaTest!.autoplay());
      await expectScreen(page, 'results');
      const lanes = await page
        .locator('.sw-words--results .sw-word.is-found')
        .evaluateAll((els) => els.map((e) => e.getAttribute('data-lane')));
      expect(lanes.sort()).toEqual(['1', '2', '3', '4', '5', '6']);
      const marks = await page
        .locator('.sw-words--results .sw-word.is-found')
        .first()
        .evaluate((el) => {
          const cs = getComputedStyle(el);
          const sw = getComputedStyle(el.querySelector('.sw-word__sw')!);
          return { line: cs.textDecorationLine, pattern: sw.backgroundImage };
        });
      expect(marks.line).toContain('line-through');
      expect(marks.pattern).toContain('url(');
    });

    test('long display names fit the word slip on every pack', async ({ page }) => {
      await openGame(page, SLUG);
      for (const id of ['pidgin-words', 'states-capitals', 'lagos-places', 'cloth-markets']) {
        await choosePack(page, id);
        await startRound(page, 'Hard');
        await settled(page);
        const bad = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('.sw-word')]
            .filter(
              (e) =>
                e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > innerWidth,
            )
            .map((e) => e.textContent),
        );
        expect(bad, id).toEqual([]);
        await press(page.getByRole('button', { name: 'Pause' }));
        await press(page.getByRole('button', { name: 'Quit' }));
      }
    });

    const cellOf = (page: import('@playwright/test').Page): Promise<number> =>
      page
        .locator('.sw-tile')
        .first()
        .evaluate((e) => e.getBoundingClientRect().width + 4);
    const PORTRAIT = { width: 375, height: 812 };
    const LANDSCAPE = { width: 812, height: 375 };

    test('rotating a running Hard round: it pauses behind a notice with only Quit, keeps everything, and resumes by itself when it fits again', async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(PORTRAIT);
      await openGame(page, SLUG);
      const r0 = await startRound(page, 'Hard');
      expect(r0.puzzle.size).toBe(12);
      await swipeWord(page, 0);
      const coins = (await appState(page)).progress.coins;
      expect(await cellOf(page)).toBeGreaterThanOrEqual(26);

      await page.setViewportSize(LANDSCAPE);
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('Tight fit');
      // no way to play on at a tiny grid: the only button is Quit
      await expect(dialog.getByRole('button')).toHaveCount(1);
      await expect(dialog.getByRole('button', { name: 'Quit' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeVisible();
      const frozen = (await round(page)).timeLeftMs;
      await page.waitForTimeout(400);
      const held = await round(page);
      expect(held.timeLeftMs).toBe(frozen);
      expect(held.puzzle.letters).toBe(r0.puzzle.letters);
      expect(held.puzzle.size).toBe(12);
      expect(held.found).toHaveLength(1);
      await expect(page.locator('.sw-tile')).toHaveCount(144);
      expect((await appState(page)).progress.coins).toBe(coins);

      // rotating back closes the notice and the clock carries on, at a comfortable size
      await page.setViewportSize(PORTRAIT);
      await expect(dialog).toHaveCount(0);
      await expect.poll(async () => (await round(page)).timeLeftMs).toBeLessThan(frozen);
      await expect.poll(() => cellOf(page)).toBeGreaterThanOrEqual(26);
      expect((await round(page)).found).toHaveLength(1);
    });

    test('pause, rotate, Resume: the round does not run on a tiny grid; the notice appears and clears when it fits', async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(PORTRAIT);
      await openGame(page, SLUG);
      await startRound(page, 'Hard');
      await press(page.getByRole('button', { name: 'Pause' }));
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('Game paused');
      const frozen = (await round(page)).timeLeftMs;

      await page.setViewportSize(LANDSCAPE);
      await expect(dialog).toContainText('Game paused'); // the pause dialog stays
      await press(page.getByRole('button', { name: 'Resume' }));
      // not running: the Tight-fit notice took over, the clock is still frozen
      await expect(dialog).toContainText('Tight fit');
      await expect(dialog.getByRole('button')).toHaveCount(1);
      await page.waitForTimeout(400);
      expect((await round(page)).timeLeftMs).toBe(frozen);

      await page.setViewportSize(PORTRAIT);
      await expect(dialog).toHaveCount(0);
      await expect.poll(async () => (await round(page)).timeLeftMs).toBeLessThan(frozen);
      await expect.poll(() => cellOf(page)).toBeGreaterThanOrEqual(26);

      // pause, rotate and rotate back before Resume: Resume simply resumes
      await press(page.getByRole('button', { name: 'Pause' }));
      const f2 = (await round(page)).timeLeftMs;
      await page.setViewportSize(LANDSCAPE);
      await page.setViewportSize(PORTRAIT);
      await press(page.getByRole('button', { name: 'Resume' }));
      await expect(dialog).toHaveCount(0);
      await expect.poll(async () => (await round(page)).timeLeftMs).toBeLessThan(f2);
    });

    test('a Medium round rotates without a notice (10x10 still gets 26 px cells)', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await openGame(page, SLUG);
      await startRound(page, 'Medium');
      await page.setViewportSize({ width: 812, height: 375 });
      await page.waitForTimeout(300);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      const cell = await page
        .locator('.sw-tile')
        .first()
        .evaluate((e) => e.getBoundingClientRect().width + 4);
      expect(cell).toBeGreaterThanOrEqual(26);
      expect((await round(page)).status).toBe('playing');
    });
  });
}
