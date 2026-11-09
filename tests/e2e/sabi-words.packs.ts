import { expect, test } from '@playwright/test';
import { eventTypes, expectScreen, inViewport, openGame, press, watchErrors } from './helpers';
import {
  SLUG,
  appState,
  choosePack,
  round,
  startRound,
  type RoundState,
} from './sabi-words.helpers';

const PACKS = [
  'naija-food',
  'lagos-places',
  'football-terms',
  'pidgin-words',
  'states-capitals',
  'cloth-markets',
];

/** Word packs: every pack plays, a pack that does not load is handled, the Daily Puzzle counts once. */
export function packTests(): void {
  test.describe('sabi-words: the six word packs', () => {
    test('every pack loads, builds a clean grid and shows its words (display form when present)', async ({
      page,
    }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG);
      for (const id of PACKS) {
        await choosePack(page, id);
        const r = await startRound(page, 'Medium');
        expect(r.puzzle.packId).toBe(id);
        const shown = await page.locator('.sw-word span:not(.ng-sr)').allTextContents();
        expect(shown).toEqual(r.puzzle.words.map((w) => w.display));
        // every pack word is in the grid as letters only
        expect(r.puzzle.letters).toMatch(/^[A-Z]+$/);
        await press(page.getByRole('button', { name: 'Pause' }));
        await press(page.getByRole('button', { name: 'Quit' }));
      }
      expect((await appState(page)).packsLoaded.sort()).toEqual([...PACKS].sort());
      expect(watch.errors).toEqual([]);
    });
  });

  test.describe('sabi-words: words that do not load', () => {
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
      await openGame(page, SLUG);
      await expectScreen(page, 'menu');
      await press(page.locator('#menu-play'));
      await expectScreen(page, 'error');
      await expect(page.getByRole('alert')).toContainText('words');
      await expect(page.locator('#sw-retry')).toBeVisible();
      expect(await inViewport(page.locator('#sw-retry'))).toBe(true);
      await press(page.locator('#sw-retry'));
      await expect(page.getByRole('alert')).toBeVisible();
      await expectScreen(page, 'error');
      expect(await eventTypes(page)).toContain('error');
      await press(page.getByRole('button', { name: 'Main menu' }));
      await expectScreen(page, 'menu');
      await page.unroute('**/assets/packs/*.json');
      await press(page.locator('#menu-play'));
      await expectScreen(page, 'play');
      await expect(page.locator('.sw-tile').first()).toBeVisible();
      expect(errors).toEqual([]);
    });

    test('a pack that fails validation is refused politely (no console errors, no half-loaded round)', async ({
      page,
    }) => {
      const watch = watchErrors(page);
      const bad = encodeURIComponent(
        JSON.stringify({
          version: 1,
          id: 'x',
          title: 'x',
          lang: 'en',
          theme: 'x',
          words: [{ word: 'no way' }],
        }),
      );
      await openGame(page, SLUG, `?pack=data:application/json,${bad}`);
      await press(page.locator('#menu-play'));
      await expectScreen(page, 'error');
      await press(page.getByRole('button', { name: 'Main menu' }));
      await expectScreen(page, 'menu');
      expect(watch.errors).toEqual([]);
    });
  });

  test.describe('sabi-words: Daily Puzzle', () => {
    test('the first start of the day is scored; replays are practice and look unscored to the portal', async ({
      page,
    }) => {
      await openGame(page, SLUG);
      const first = (await page.evaluate(() =>
        window.__naijaTest!.autoplay({ mode: 'daily' }),
      )) as unknown as RoundState;
      await expectScreen(page, 'results');
      expect(first.puzzle.size).toBe(10);
      expect(first.difficulty).toBe('medium');
      const saved = (await appState(page)).daily!;
      expect(saved.finished).toBe(true);
      expect(saved.score).toBeGreaterThan(0);
      expect(saved.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const plays = (await appState(page)).progress.plays;
      const coins = (await appState(page)).progress.coins;

      // the same grid for everybody today; the replay is practice and changes nothing saved
      await press(page.getByRole('button', { name: 'Play again' }));
      await expectScreen(page, 'play');
      const again = await round(page);
      expect(again.puzzle.letters).toBe(first.puzzle.letters);
      await expect(page.locator('.sw-practice')).toBeVisible();
      await page.evaluate(() => window.__naijaTest!.autoplay({ mode: 'daily' }));
      await expectScreen(page, 'results');
      await expect(page.locator('.ng-results__sub')).toContainText('Practice');
      const after = await appState(page);
      expect(after.daily).toEqual(saved);
      expect(after.progress.plays).toBe(plays);
      expect(after.progress.coins).toBe(coins);
      const events = await page.evaluate(() => window.__naijaTest!.events());
      const practiceStart = events.filter(
        (e) => e.type === 'start' && (e.data as { practice?: boolean })?.practice,
      );
      expect(practiceStart.length).toBeGreaterThan(0);
      const lastStart = events.map((e) => e.type).lastIndexOf('start');
      const tail = events.slice(lastStart);
      expect(tail.map((e) => e.type)).toEqual(['start', 'end']);
      expect(JSON.stringify(tail)).not.toMatch(/score|stars/);
    });

    test('start, quit, start again: the second is practice and the saved score comes from the first', async ({
      page,
    }) => {
      await openGame(page, SLUG);
      await press(page.locator('#menu-daily'));
      await expectScreen(page, 'play');
      await press(page.getByRole('button', { name: 'Pause' }));
      await press(page.getByRole('button', { name: 'Quit' }));
      await expectScreen(page, 'menu');
      const marked = (await appState(page)).daily;
      expect(marked?.finished).toBe(false);
      await press(page.locator('#menu-daily'));
      await expectScreen(page, 'play');
      await expect(page.locator('.sw-practice')).toBeVisible();
      await page.evaluate(() => window.__naijaTest!.autoplay({ mode: 'daily' }));
      await expectScreen(page, 'results');
      const after = await appState(page);
      expect(after.daily).toEqual(marked);
      expect(after.progress.plays).toBe(0);
      expect(after.progress.wins).toBe(0);
    });
  });
}
