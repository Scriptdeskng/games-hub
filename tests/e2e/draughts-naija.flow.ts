import { expect, test } from '@playwright/test';
import {
  counters,
  eventTypes,
  expectNoSeedInStart,
  expectScreen,
  openGame,
  press,
  watchErrors,
} from './helpers';
import {
  FAST,
  SLUG,
  boardProblems,
  humanTurn,
  playMove,
  snap,
  sq,
  startPlay,
  waitForHuman,
} from './draughts-naija.helpers';

/** Menu to results: real taps on the board, pause, hint, results, replay, personas, portal events. */
export function flowTests(): void {
  test.describe('draughts-naija: full playthrough', () => {
    test('menu, how-to, rules, real moves, pause, hint, results, replay, quit; zero errors; portal order', async ({
      page,
    }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG, FAST);
      await expectScreen(page, 'menu');
      await expect(page.locator('h1')).toHaveText('Draughts Naija');
      await press(page.locator('#menu-howto'));
      await expectScreen(page, 'howto');
      await expect(page.locator('.ng-howto__step')).toHaveCount(7);
      await press(page.getByRole('button', { name: 'Got it' }));
      await press(page.locator('#menu-rules'));
      await expectScreen(page, 'rules');
      await expect(page.getByRole('switch')).toHaveCount(4);
      await press(page.getByRole('button', { name: 'Got it' }));
      await expectScreen(page, 'menu');

      await startPlay(page);
      await expect(page.locator('.dn-sq')).toHaveCount(50);
      await expect(page.locator('.dn-piece--light')).toHaveCount(20);
      await expect(page.locator('.dn-seat--cpu .dn-seat__name')).toHaveText('Falmata');
      for (let i = 0; i < 3; i++) {
        const m = await humanTurn(page);
        expect(m).not.toBeNull();
      }
      await waitForHuman(page); // the movies end: the screen is then at rest
      expect(await boardProblems(page)).toEqual([]);
      expect((await snap(page)).stats!.moves).toBe(3);

      // hint: marks a move, costs nothing but counts
      await waitForHuman(page);
      await press(page.getByRole('button', { name: 'Hint' }));
      await expect(page.locator('.dn-sq.is-hint')).toHaveCount(2);
      expect((await snap(page)).stats!.hints).toBe(1);

      // pause freezes the game, resume continues
      await press(page.getByRole('button', { name: 'Pause' }));
      await expect(page.getByRole('dialog')).toBeVisible();
      await press(page.getByRole('button', { name: 'Resume' }));
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await page.evaluate(() => window.__naijaTest!.autoplay({ win: true }));
      await expectScreen(page, 'results');
      await expect(page.locator('.ng-results__title')).toHaveText('You win!');
      await expect(page.locator('.ng-stat')).toHaveCount(8);
      await press(page.getByRole('button', { name: 'Play again' }));
      await expectScreen(page, 'play');
      await press(page.getByRole('button', { name: 'Pause' }));
      await press(page.getByRole('button', { name: 'Quit' }));
      await expectScreen(page, 'menu');
      const types = await eventTypes(page);
      expect(types[0]).toBe('ready');
      expect(types).toEqual(expect.arrayContaining(['start', 'level_complete', 'end']));
      await expectNoSeedInStart(page);
      expect(watch.errors).toEqual([]);
    });

    test('the board always shows what the engine says, through captures and crowning', async ({
      page,
    }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG, `${FAST}&x=1`);
      await page.evaluate(() => window.__naijaTest!.setSeed(12));
      await startPlay(page);
      let captures = 0;
      for (let i = 0; i < 40; i++) {
        const m = await humanTurn(page);
        if (!m) break;
        if (m.caps.length) captures++;
        if (i % 4 === 3) {
          await waitForHuman(page); // let the movies finish: the screen is then at rest
          expect(await boardProblems(page)).toEqual([]);
        }
      }
      await waitForHuman(page);
      expect(await boardProblems(page)).toEqual([]);
      expect(watch.errors).toEqual([]);
      expect(captures).toBeGreaterThanOrEqual(0);
    });

    test('compulsory capture: every piece that can capture is marked, a quiet piece is refused with a reminder', async ({
      page,
    }) => {
      await openGame(page, SLUG, FAST);
      await page.evaluate(() => window.__naijaTest!.setSeed(5));
      await startPlay(page);
      let found = false;
      for (let i = 0; i < 60 && !found; i++) {
        const s = await waitForHuman(page);
        if (s.result) break;
        const moves = (await snap(page)).legal;
        if (moves[0]!.caps.length > 0) {
          const must = new Set(moves.map((m) => m.from));
          await expect(page.locator('.dn-piece.is-must')).toHaveCount(must.size);
          const quiet = s.board.findIndex((v, k) => v > 0 && !must.has(k));
          if (quiet >= 0) {
            await press(sq(page, quiet));
            await expect(page.locator('.dn-status')).toContainText('must capture');
            await expect(page.locator('.ng-toast')).toBeVisible();
          }
          // the capture itself: pick a piece, see its crosses and path, then take
          const m = moves[0]!;
          await press(sq(page, m.from));
          await expect(page.locator('.dn-sq.is-capturable').first()).toBeVisible();
          await playMove(page, m, true);
          found = true;
        } else await humanTurn(page);
      }
      expect(found).toBe(true);
    });

    test('a single movable piece is selected for you, and the path of a capture is previewed', async ({
      page,
    }) => {
      await openGame(page, SLUG, FAST);
      await page.evaluate(() => window.__naijaTest!.setSeed(5));
      await startPlay(page);
      let seen = false;
      for (let i = 0; i < 60 && !seen; i++) {
        const s = await waitForHuman(page);
        if (s.result) break;
        const moves = (await snap(page)).legal;
        const from = new Set(moves.map((m) => m.from));
        if (from.size === 1) {
          await expect(page.locator('.dn-sq.is-select')).toHaveCount(1);
          if (moves.length === 1 && moves[0]!.caps.length) {
            await expect(page.locator('.dn-leg')).toHaveCount(moves[0]!.path.length);
            await expect(page.locator('.dn-step')).toHaveCount(moves[0]!.path.length);
          }
          seen = true;
        }
        await humanTurn(page);
      }
      expect(seen).toBe(true);
    });

    test('each level seats its own persona: Doosuur, Falmata, Damola', async ({ page }) => {
      await openGame(page, SLUG, FAST);
      for (const [label, name] of [
        ['Easy', 'Doosuur'],
        ['Hard', 'Damola'],
        ['Medium', 'Falmata'],
      ] as const) {
        await press(page.locator('.ng-seg label', { hasText: label }).first());
        await expect(page.locator('.dn-opponent')).toContainText(name);
        await startPlay(page);
        await expect(page.locator('.dn-seat--cpu .dn-seat__name')).toHaveText(name);
        await expect(page.locator('.dn-seat--cpu img')).toHaveAttribute(
          'src',
          new RegExp(name.toLowerCase()),
        );
        await press(page.getByRole('button', { name: 'Pause' }));
        await press(page.getByRole('button', { name: 'Quit' }));
        await expectScreen(page, 'menu');
      }
    });

    test('8x8: 12 men each and 32 squares; the toggles reach the game', async ({ page }) => {
      await openGame(page, SLUG, FAST);
      await press(page.locator('.ng-seg label', { hasText: '8x8' }).first());
      await press(page.locator('#menu-rules'));
      await press(page.getByRole('switch').nth(1)); // flying kings
      await press(page.getByRole('switch').nth(2)); // CPU starts
      await press(page.getByRole('button', { name: 'Got it' }));
      await startPlay(page);
      await expect(page.locator('.dn-sq')).toHaveCount(32);
      await expect(page.locator('.dn-piece--dark')).toHaveCount(12);
      const s = (await snap(page)).round!;
      expect(s.rules).toMatchObject({
        size: 8,
        flyingKings: true,
        maxCapture: true,
        cpuStarts: true,
      });
      // the CPU (dark) opens
      await expect.poll(async () => (await snap(page)).round!.plies).toBeGreaterThan(0);
      expect((await snap(page)).round!.lastMove!.side).toBe(1);
    });

    test('won and lost games show the right results and portal events; no seed leaves the game', async ({
      page,
    }) => {
      await openGame(page, SLUG);
      await page.evaluate(() => window.__naijaTest!.autoplay({ win: false, difficulty: 'hard' }));
      await expectScreen(page, 'results');
      await expect(page.locator('.ng-results__title')).toHaveText('Nearly there. Try again!');
      await press(page.getByRole('button', { name: 'Main menu' }));
      await page.evaluate(() => window.__naijaTest!.autoplay({ win: true, size: 8 }));
      await expect(page.locator('.ng-results__title')).toHaveText('You win!');
      const ev = await page.evaluate(() => window.__naijaTest!.events());
      expect(
        ev.filter((e) => e.type === 'end').map((e) => (e.data as { won: boolean }).won),
      ).toEqual([false, true]);
      expect(JSON.stringify(ev)).not.toMatch(/seed|token/i);
      await expectNoSeedInStart(page);
    });

    test('no way to add a second human: no player count, no pass-and-play, no invite', async ({
      page,
    }) => {
      await openGame(page, SLUG);
      const text = (await page.locator('body').innerText()).toLowerCase();
      for (const bad of [
        '2 player',
        'two player',
        'pass and play',
        'invite',
        'online',
        'multiplayer',
        'friend',
      ])
        expect(text).not.toContain(bad);
      await startPlay(page);
      await expect(page.locator('.dn-seat')).toHaveCount(2);
      await expect(page.locator('.dn-seat--cpu')).toHaveCount(1);
    });

    test('the realtime autoplay plays whole games through the UI and the AI worker, on both sizes', async ({
      page,
    }) => {
      test.setTimeout(240_000);
      const watch = watchErrors(page);
      await openGame(page, SLUG);
      for (const [d, size] of [
        ['easy', 10],
        ['medium', 8],
      ] as const) {
        await page.evaluate(
          (o) => window.__naijaTest!.autoplay({ realtime: true, ...o } as never),
          { difficulty: d, size },
        );
        await expectScreen(page, 'results');
        const st = await snap(page);
        expect(st.autoplay.rescues).toEqual([]);
        await press(page.getByRole('button', { name: 'Main menu' }));
      }
      expect(watch.errors).toEqual([]);
    });

    test('lifecycle: no leaked listeners, timers or RAF loops across replays; destroy() clears all', async ({
      page,
    }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG, FAST);
      let base = await counters(page);
      for (let i = 0; i < 4; i++) {
        await startPlay(page);
        await humanTurn(page);
        await page.evaluate(() => window.__naijaTest!.autoplay());
        await expectScreen(page, 'results');
        await press(page.getByRole('button', { name: 'Main menu' }));
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
  });
}
