import { expect, test } from '@playwright/test';
import {
  eventTypes,
  expectNoSeedInStart,
  expectScreen,
  openGame,
  press,
  watchErrors,
} from './helpers';
import {
  SLUG,
  appState,
  ends,
  foundCount,
  round,
  startRound,
  swipe,
  swipeWord,
} from './sabi-words.helpers';

/** Menu to results, the lost round, difficulty, hints, pause, wrong swipes, the clock. */
export function flowTests(): void {
  test.describe('sabi-words: full playthrough', () => {
    test('menu, how-to, pack, a real swipe, a hint, pause, results, replay, quit; zero errors; portal order', async ({
      page,
    }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG);
      await expectScreen(page, 'menu');
      await expect(page.locator('h1')).toHaveText('Sabi Words');

      await press(page.locator('#menu-howto'));
      await expectScreen(page, 'howto');
      await expect(page.locator('.ng-howto__step')).toHaveCount(5);
      await press(page.getByRole('button', { name: 'Got it' }));
      await expectScreen(page, 'menu');

      // six themed packs; Lagos Places is chosen and remembered
      await press(page.locator('#menu-pack'));
      await expectScreen(page, 'packs');
      await expect(page.locator('.sw-packlist .sw-pack')).toHaveCount(6);
      await press(page.locator('[data-pack="lagos-places"]'));
      await expectScreen(page, 'menu');
      await expect(page.locator('#menu-pack')).toContainText('Lagos Places');

      const r0 = await startRound(page, 'Easy');
      expect(r0.puzzle.packId).toBe('lagos-places');
      expect(r0.puzzle.size).toBe(8);
      expect(r0.puzzle.words).toHaveLength(6);
      await expect(page.locator('.sw-tile')).toHaveCount(64);
      await expect(page.locator('.sw-word')).toHaveCount(6);

      // a real swipe finds a word: the tiles and the list entry take the first cloth lane
      await swipeWord(page, 0);
      await expect(page.locator('.sw-tile.is-found[data-lane="1"]')).toHaveCount(
        r0.puzzle.words[0]!.word.length,
      );
      await expect(page.locator('.sw-word.is-found[data-lane="1"]')).toHaveCount(1);
      await expect(page.locator('.sw-lane--1')).toHaveCount(1);

      // the lantern costs 10 coins and rings the first letter of an unfound word
      const coins = (await appState(page)).progress.coins;
      await press(page.locator('.sw-hint'));
      await expect.poll(async () => (await appState(page)).progress.coins).toBe(coins - 10);
      await expect(page.locator('.sw-tile.is-hint')).toHaveCount(1);
      await expect(page.locator('.sw-clue')).toContainText('Clue:');
      expect((await round(page)).hintsUsed).toBe(1);

      // pause freezes the clock, resume continues it
      await press(page.getByRole('button', { name: 'Pause' }));
      await expect(page.getByRole('dialog')).toBeVisible();
      const frozen = (await round(page)).timeLeftMs;
      await page.waitForTimeout(400);
      expect((await round(page)).timeLeftMs).toBe(frozen);
      await press(page.getByRole('button', { name: 'Resume' }));
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect.poll(async () => (await round(page)).timeLeftMs).toBeLessThan(frozen);

      // finish the round through the test hook
      await page.evaluate(() => window.__naijaTest!.autoplay());
      await expectScreen(page, 'results');
      await expect(page.locator('.ng-results__title')).toHaveText('You win!');
      await expect(page.locator('.ng-star.is-on')).toHaveCount(3);
      await expect(page.locator('.sw-words--results .sw-word.is-found')).toHaveCount(6);
      await expect(page.locator('.ng-stat')).toHaveCount(6);

      await press(page.getByRole('button', { name: 'Play again' }));
      await expectScreen(page, 'play');
      await press(page.getByRole('button', { name: 'Pause' }));
      await press(page.getByRole('button', { name: 'Quit' }));
      await expectScreen(page, 'menu');

      // portal: ready first, every start closed by an end, no seed anywhere
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
        } else if (type === 'level_complete') expect(types[i + 2]).toBe('end');
        else expect(open, `${type} outside a round`).toBe(true);
      });
      expect(open).toBe(false);
      expect(types.filter((x) => x === 'start')).toHaveLength(3);
      expect(types.filter((x) => x === 'level_complete')).toHaveLength(1);
      const all = await page.evaluate(() => JSON.stringify(window.__naijaTest!.events()));
      expect(all).not.toMatch(/seed|token/i);
      expect(watch.errors).toEqual([]);
    });

    test('a lost round shows the words found and the encouraging screen', async ({ page }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG);
      await page.evaluate(() => window.__naijaTest!.autoplay({ win: false }));
      await expectScreen(page, 'results');
      await expect(page.locator('.ng-results__title')).toContainText('Try again');
      await expect(page.locator('.sw-words--results .sw-word')).toHaveCount(8);
      await expect(page.locator('.ng-results__stars')).toHaveCount(0);
      const types = await eventTypes(page);
      expect(types).not.toContain('level_complete');
      expect(types[types.length - 1]).toBe('end');
      expect(watch.errors).toEqual([]);
    });

    test('the clock runs out for real: the last 5 seconds look urgent, then the round is lost', async ({
      page,
    }) => {
      // the game clock follows the frame loop, so a loaded machine can stretch real time: wait on
      // the game's own state, not on a wall-clock budget
      test.setTimeout(150_000);
      const watch = watchErrors(page);
      await openGame(page, SLUG, '?clock=9000');
      await startRound(page, 'Easy');
      await expect
        .poll(() => page.locator('.sw-time.is-low').count(), { timeout: 90_000, intervals: [50] })
        .toBe(1);
      await expectScreen(page, 'results');
      await expect(page.locator('.ng-results__title')).toContainText('Try again');
      expect((await appState(page)).progress.coins).toBeGreaterThanOrEqual(20);
      expect(watch.errors).toEqual([]);
    });

    test('difficulty changes the grid, the words, the clock and the hint', async ({ page }) => {
      await openGame(page, SLUG);
      const seen: { size: number; words: number; ms: number; hint: string }[] = [];
      for (const label of ['Easy', 'Medium', 'Hard']) {
        await expectScreen(page, 'menu');
        await press(page.locator('.ng-seg label', { hasText: label }));
        const hint = (await page.locator('.hint').first().textContent()) ?? '';
        await press(page.locator('#menu-play'));
        await expectScreen(page, 'play');
        const r = await round(page);
        const cell = await page
          .locator('.sw-tile')
          .first()
          .evaluate((el) => el.getBoundingClientRect().width + 4);
        expect(cell, `${label} cell`).toBeGreaterThanOrEqual(26);
        await expect(page.locator('.sw-tile')).toHaveCount(r.puzzle.size ** 2);
        seen.push({ size: r.puzzle.size, words: r.puzzle.words.length, ms: r.durationMs, hint });
        await press(page.getByRole('button', { name: 'Pause' }));
        await press(page.getByRole('button', { name: 'Quit' }));
      }
      const [e, m, h] = seen as [(typeof seen)[0], (typeof seen)[0], (typeof seen)[0]];
      expect(e.size).toBeLessThan(m.size);
      expect(m.size).toBeLessThanOrEqual(h.size);
      expect([e.words, m.words, h.words]).toEqual([6, 8, 10]);
      expect([e.ms, m.ms, h.ms]).toEqual([180000, 240000, 300000]);
      expect(new Set(seen.map((x) => x.hint)).size).toBe(3);
    });

    test('a wrong swipe shakes, counts, and costs nothing else; a long word can be swiped backwards', async ({
      page,
    }) => {
      await openGame(page, SLUG);
      const r = await startRound(page, 'Hard');
      const n = r.puzzle.size;
      // two letters in a row are never a word (words have 3+ letters)
      await swipe(page, 0, 1);
      await expect.poll(async () => (await round(page)).wrongs).toBe(1);
      await expect(page.locator('.sw-tile.is-wrong').first()).toBeVisible();
      expect(await foundCount(page)).toBe(0);
      expect((await round(page)).status).toBe('playing');
      // the longest word, read from its last letter back to its first
      const longest = r.puzzle.words
        .map((w, i) => ({ i, len: w.word.length }))
        .sort((a, b) => b.len - a.len)[0]!.i;
      const [a, b] = ends(r, longest);
      expect(a).not.toBe(b);
      await swipeWord(page, longest, true);
      expect((await round(page)).found[0]!.index).toBe(longest);
      expect(n).toBeGreaterThanOrEqual(10);
    });

    test('hints: refused when coins run short, never charged twice for one word', async ({
      page,
    }) => {
      await openGame(page, SLUG);
      await startRound(page, 'Easy');
      for (let k = 0; k < 2; k++) {
        await press(page.locator('.sw-hint'));
        await expect.poll(async () => (await round(page)).hintsUsed).toBe(k + 1);
        await page.waitForTimeout(450); // past the 400 ms double-tap guard
      }
      expect((await appState(page)).progress.coins).toBe(0);
      await expect(page.locator('.sw-hint')).toBeDisabled();
      // two words, two different lanterns in the engine (two words can share a first letter's tile)
      const hinted = (await round(page)).hinted;
      expect(new Set(hinted).size).toBe(2);
      expect(await page.locator('.sw-tile.is-hint').count()).toBeGreaterThanOrEqual(1);
    });

    test('a double tap on the hint spends once (400 ms guard)', async ({ page }) => {
      await openGame(page, SLUG);
      await startRound(page, 'Easy');
      const coins = (await appState(page)).progress.coins;
      // two clicks in one task: deterministic, no wall-clock race
      await page.locator('.sw-hint').evaluate((el: HTMLElement) => {
        el.click();
        el.click();
      });
      await expect.poll(async () => (await round(page)).hintsUsed).toBe(1);
      expect((await appState(page)).progress.coins).toBe(coins - 10);
    });
  });
}
