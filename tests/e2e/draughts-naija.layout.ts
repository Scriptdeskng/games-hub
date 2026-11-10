import { expect, test } from '@playwright/test';
import {
  expectScreen,
  layoutProblems,
  inViewport,
  openGame,
  press,
  stickyOverlaps,
} from './helpers';
import {
  FAST,
  SLUG,
  boardProblems,
  humanTurn,
  startPlay,
  waitForHuman,
} from './draughts-naija.helpers';

/** Every screen at the project's viewport (portrait phones, landscape phone, desktop), English and Pidgin. */
export function layoutTests(): void {
  test.describe('draughts-naija: layout', () => {
    for (const lang of ['en', 'pcm']) {
      for (const size of ['10x10', '8x8']) {
        test(`no overflow or clipped text; the board fits and is square; seats and controls are visible [${lang} ${size}]`, async ({
          page,
        }) => {
          const vp = page.viewportSize()!;
          await openGame(page, SLUG, `?lang=${lang}&tempo=0.15`);
          expect(await layoutProblems(page)).toEqual([]);
          if (size === '8x8')
            await press(page.locator('.ng-seg label', { hasText: '8x8' }).first());
          for (const [id, screen] of [
            ['#menu-howto', 'howto'],
            ['#menu-rules', 'rules'],
          ] as const) {
            await press(page.locator(id));
            await expectScreen(page, screen);
            expect(await layoutProblems(page), screen).toEqual([]);
            await press(page.locator('.ng-sticky-actions button').first());
            await expectScreen(page, 'menu');
          }
          await startPlay(page);
          await humanTurn(page);
          expect(await layoutProblems(page, { skip: '.dn-board' })).toEqual([]);
          const board = (await page.locator('.dn-board').boundingBox())!;
          expect(Math.abs(board.width - board.height)).toBeLessThan(1.5);
          expect(board.x).toBeGreaterThanOrEqual(-0.5);
          expect(board.x + board.width).toBeLessThanOrEqual(vp.width + 0.5);
          expect(board.y + board.height).toBeLessThanOrEqual(vp.height + 0.5);
          for (const sel of [
            '.dn-board',
            '.dn-seat--cpu',
            '.dn-seat:not(.dn-seat--cpu)',
            '.dn-hud',
          ])
            expect(await inViewport(page.locator(sel)), sel).toBe(true);
          // no stray page scroll on the play screen
          expect(
            await page.evaluate(
              () => document.documentElement.scrollHeight <= window.innerHeight + 1,
            ),
          ).toBe(true);
          if (vp.width === 360 && size === '10x10') expect(board.width / 10).toBeGreaterThan(30); // 31.6 px cells
          if (vp.width > vp.height) {
            // landscape: seats beside the board, the board capped by the height
            const cpu = (await page.locator('.dn-seat--cpu').boundingBox())!;
            expect(cpu.x + cpu.width).toBeLessThanOrEqual(board.x + 2);
          }
          await waitForHuman(page);
          expect(await boardProblems(page)).toEqual([]);
        });
      }
    }

    test('results screen: no stat tile under the action bar, status text sits on a solid plate', async ({
      page,
    }) => {
      await openGame(page, SLUG);
      await page.evaluate(() => window.__naijaTest!.autoplay({ win: true }));
      await expectScreen(page, 'results');
      expect(await stickyOverlaps(page)).toEqual([]);
      expect(await layoutProblems(page)).toEqual([]);
      await press(page.getByRole('button', { name: 'Play again' }));
      const bg = await page
        .locator('.dn-status')
        .evaluate((e) => getComputedStyle(e).backgroundColor);
      expect(bg).not.toMatch(/rgba\(.*, 0\)/);
    });

    test('perf hook reports real frames while playing', async ({ page }) => {
      await openGame(page, SLUG, FAST);
      await startPlay(page);
      await humanTurn(page);
      await page.waitForTimeout(600);
      const p = await page.evaluate(() => window.__naijaTest!.perf());
      expect(p).not.toBeNull();
      expect(p!.frames).toBeGreaterThan(5);
    });
  });
}
