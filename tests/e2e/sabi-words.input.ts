import { expect, test } from '@playwright/test';
import { expectScreen, openGame } from './helpers';
import {
  SLUG,
  ends,
  foundCount,
  round,
  startRound,
  swipe,
  tapTile,
  tileCentre,
} from './sabi-words.helpers';

/** Every way of choosing a word: swipe in every direction, tap-tap, keyboard. */
export function inputTests(): void {
  test.describe('sabi-words: selecting words', () => {
    test('swipes work in every direction the puzzle uses, both ways round', async ({ page }) => {
      await openGame(page, SLUG);
      await page.evaluate(() => window.__naijaTest!.setSeed(12));
      const r = await startRound(page, 'Hard');
      const dirs = new Set<string>();
      for (let i = 0; i < r.puzzle.words.length; i++) {
        const w = r.puzzle.words[i]!;
        const [a, b] = ends(r, i);
        await swipe(page, i % 2 ? b : a, i % 2 ? a : b);
        // the last word ends the round, so the results screen replaces the board
        if (i < r.puzzle.words.length - 1) await expect.poll(() => foundCount(page)).toBe(i + 1);
        else await expectScreen(page, 'results');
        dirs.add(w.dir);
      }
      expect(dirs.size).toBeGreaterThanOrEqual(3);
      await expectScreen(page, 'results');
    });

    test('tap the first letter, then the last letter (the accessible fallback)', async ({
      page,
    }) => {
      await openGame(page, SLUG);
      const r = await startRound(page, 'Easy');
      const [a, b] = ends(r, 1);
      await tapTile(page, a);
      await expect(page.locator('.sw-tile.is-sel')).toHaveCount(1);
      await tapTile(page, b);
      await expect.poll(() => foundCount(page)).toBe(1);
      await expect(page.locator('.sw-tile.is-sel')).toHaveCount(0);
      // tapping the same tile twice cancels
      await tapTile(page, a);
      await tapTile(page, a);
      await expect(page.locator('.sw-tile.is-sel')).toHaveCount(0);
    });

    test('a swipe passing a cell corner does not select the neighbour (0.4 x cell circle)', async ({
      page,
    }) => {
      await openGame(page, SLUG);
      await startRound(page, 'Easy');
      const a = await tileCentre(page, 0);
      const cell = (await tileCentre(page, 1)).x - a.x;
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      // just inside the dead zone between tile 0 and tile 9 (diagonal corner)
      await page.mouse.move(a.x + cell * 0.5, a.y + cell * 0.5, { steps: 3 });
      await expect(page.locator('.sw-tile.is-sel')).toHaveCount(1);
      await page.mouse.move(a.x + cell, a.y + cell, { steps: 3 });
      await expect(page.locator('.sw-tile.is-sel')).toHaveCount(2);
      await page.mouse.up();
    });

    test('keyboard: arrows move, Space starts, Enter ends, Escape cancels, H hints, P pauses', async ({
      page,
    }) => {
      await openGame(page, SLUG);
      const r = await startRound(page, 'Easy');
      const n = r.puzzle.size;
      const [a, b] = ends(r, 0);
      const word = r.puzzle.words[0]!;
      await page.locator('.sw-tile').nth(a).focus();
      await page.keyboard.press('Space');
      await expect(page.locator('.sw-tile.is-sel')).toHaveCount(1);
      // Escape cancels the selection, and does not open the pause dialog
      await page.keyboard.press('Escape');
      await expect(page.locator('.sw-tile.is-sel')).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      // a real word: start, walk to the end with arrow keys, Enter
      await page.keyboard.press('Enter');
      const dr = Math.sign(Math.floor(b / n) - Math.floor(a / n));
      const dc = Math.sign((b % n) - (a % n));
      for (let k = 1; k < word.word.length; k++) {
        if (dc) await page.keyboard.press(dc > 0 ? 'ArrowRight' : 'ArrowLeft');
        if (dr) await page.keyboard.press(dr > 0 ? 'ArrowDown' : 'ArrowUp');
      }
      await expect(page.locator('.sw-tile.is-sel')).toHaveCount(word.word.length);
      await page.keyboard.press('Enter');
      await expect.poll(() => foundCount(page)).toBe(1);
      await expect(page.locator('.sw-tile.is-found')).toHaveCount(word.word.length);
      // a bad pair (not in a line) is refused with a spoken hint, nothing is found
      await page.locator('.sw-tile').nth(0).focus();
      await page.keyboard.press('Space');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await expect(page.locator('[role=status]').last()).toContainText(/straight line|word|Start/i);
      await page.keyboard.press('Escape');
      // H asks for a hint, P pauses, Escape resumes
      await page.keyboard.press('h');
      await expect.poll(async () => (await round(page)).hintsUsed).toBe(1);
      await page.keyboard.press('p');
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });

    test('Tab reaches the grid and every tile has a spoken name', async ({ page }) => {
      await openGame(page, SLUG);
      await startRound(page, 'Easy');
      const labels = await page
        .locator('.sw-tile')
        .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
      expect(labels.every((l) => /, row \d+, column \d+/.test(l))).toBe(true);
      const tabbable = await page.locator('.sw-tile[tabindex="0"]').count();
      expect(tabbable).toBe(1);
    });
  });
}
