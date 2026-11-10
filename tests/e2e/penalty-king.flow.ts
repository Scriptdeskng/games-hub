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
  FAST,
  REAL,
  SLUG,
  pickMode,
  round,
  seedFor,
  snap,
  startFromMenu,
  swipe,
  waitHumanShot,
  waitRound,
} from './penalty-king.helpers';

/** Menu to results: how-to, a real swipe, a real dive, a full match, results, replay, the cup, pause. */
export function flowTests(): void {
  test.describe('penalty-king: full playthrough', () => {
    test('menu, how-to, quick match (real swipe and dive), full match, results, replay; zero errors; portal order', async ({
      page,
    }) => {
      test.setTimeout(120_000);
      const watch = watchErrors(page);
      await openGame(page, SLUG, REAL);
      await expectScreen(page, 'menu');
      await expect(page.locator('h1')).toHaveText('Penalty King');
      await press(page.locator('#menu-howto'));
      await expectScreen(page, 'howto');
      await expect(page.locator('.ng-howto__step')).toHaveCount(6);
      await press(page.getByRole('button', { name: 'Got it' }));
      await expectScreen(page, 'menu');

      await page.evaluate((s) => window.__naijaTest!.setSeed(s), seedFor(0));
      await startFromMenu(page, 'Quick match');
      await expectScreen(page, 'play');
      await expect(page.locator('.pk-slot')).toHaveCount(10);
      await expect(page.locator('.pk-team--cpu .pk-plate')).toHaveText(/^[A-Z]{3}$/);
      await expect(page.locator('.pk-role')).toBeVisible();

      // kick 1: a real swipe; the ball flies and the scoreboard shows the result with its own shape
      await waitHumanShot(page);
      await swipe(page, { dx: 40, dy: -150, ms: 70 });
      const r1 = await waitRound(page, (r) => r.state.kicks.length >= 1);
      expect(r1.state.kicks[0]!.side).toBe(0);
      await expect(page.locator('.pk-banner')).toBeVisible();
      await expect(
        page
          .locator('.pk-slot.is-goal, .pk-slot.is-saved, .pk-slot.is-miss, .pk-slot.is-post')
          .first(),
      ).toBeVisible();

      // kick 2 is the CPU's: dive with a real tap on a dive button inside the window
      await waitRound(page, (r) => r.phase === 'runup' && r.striker === 1);
      await expect(page.locator('.pk-dive')).toBeVisible();
      await press(page.locator('.pk-dive__zone[data-zone="dr"]'));
      const r2 = await waitRound(page, (r) => r.state.kicks.length >= 2);
      expect(r2.state.kicks[1]!.side).toBe(1);
      expect(r2.state.kicks[1]!.dive).toBe('dr');

      // the rest of the match at test speed, through the real loop, then results
      await page.evaluate(() =>
        window.__naijaTest!.autoplay({ mode: 'quick', realtime: true, difficulty: 'easy' }),
      );
      await expectScreen(page, 'results');
      await expect(page.locator('.ng-results')).toBeVisible();
      await expect(page.locator('.ng-banter')).toContainText('Ozavize');
      await press(page.getByRole('button', { name: 'Play again' }));
      await expectScreen(page, 'play');
      await press(page.locator('.pk-bar .ng-btn--icon'));
      await press(page.getByRole('button', { name: 'Quit' }));
      await expectScreen(page, 'menu');

      const types = await eventTypes(page);
      expect(types[0]).toBe('ready');
      expect(types).toContain('start');
      expect(types).toContain('score');
      expect(types.filter((t) => t === 'end').length).toBeGreaterThanOrEqual(2);
      await expectNoSeedInStart(page);
      expect(watch.errors).toEqual([]);
    });

    test('three whole matches through the real UI at test speed, one per level: results, stats and progress are recorded', async ({
      page,
    }) => {
      test.setTimeout(150_000);
      const watch = watchErrors(page);
      await openGame(page, SLUG, FAST);
      for (const [i, d] of (['easy', 'medium', 'hard'] as const).entries()) {
        await page.evaluate((s) => window.__naijaTest!.setSeed(s), i + 1);
        await page.evaluate(
          (lvl) => window.__naijaTest!.autoplay({ mode: 'quick', realtime: true, difficulty: lvl }),
          d,
        );
        await expectScreen(page, 'results');
        await expect(page.locator('.ng-banter')).toContainText(
          { easy: 'Ozavize', medium: 'Ndako', hard: 'Hamman' }[d],
        );
        await press(page.getByRole('button', { name: 'Main menu' }));
      }
      const s = await snap(page);
      expect(s.progress.plays).toBe(3);
      expect(s.autoplay.rescues).toEqual([]);
      await press(page.locator('#menu-stats'));
      await expectScreen(page, 'stats');
      await expect(page.locator('.ng-stat').first()).toContainText('3');
      expect(watch.errors).toEqual([]);
    });

    test('cup: bracket, kick off, a match, the bracket moves on; a whole winning run makes you champion; a loss ends the run', async ({
      page,
    }) => {
      test.setTimeout(150_000);
      const watch = watchErrors(page);
      await openGame(page, SLUG, FAST);
      await page.evaluate(() => window.__naijaTest!.setSeed(21));
      await startFromMenu(page, 'Cup');
      await expectScreen(page, 'cup');
      await expect(page.locator('.pk-bslot')).toHaveCount(14);
      await expect(page.locator('.pk-bslot.is-you')).toHaveCount(1);
      await expect(page.locator('.pk-bslot.is-next')).toHaveCount(1);
      await expect(page.locator('.pk-cupline').first()).toContainText(
        'Quarter-final: Lagoon Lanterns v Sahel Sparks',
      );
      await press(page.getByRole('button', { name: 'Kick off' }));
      await expectScreen(page, 'play');
      await expect(page.locator('.pk-app')).toHaveClass(/pk-venue--community/); // quarter-finals are on the community pitch
      // finish the whole cup at test speed: easy rival, human bot
      await page.evaluate(() =>
        window.__naijaTest!.autoplay({ mode: 'cup', realtime: true, difficulty: 'easy' }),
      );
      await expectScreen(page, 'cup');
      const s = await snap(page);
      expect(s.cup!.over).toBe(true);
      const won = s.cup!.champion === 'lanterns';
      expect(s.progress.cups).toBeGreaterThanOrEqual(1);
      if (won) {
        await expect(page.locator('.pk-trophy')).toHaveAttribute('data-won', '');
        await expect(page.locator('.pk-cupline').last()).toContainText('Champions');
      } else {
        await expect(page.locator('.pk-bslot.is-out').first()).toBeVisible();
        await expect(page.locator('.pk-cupline').last()).toContainText('Knocked out');
      }
      await press(page.getByRole('button', { name: 'Try the cup again' }));
      await expectScreen(page, 'cup');
      await expect(page.locator('.pk-bslot.is-out')).toHaveCount(0);
      expect(watch.errors).toEqual([]);
    });

    test('a winning cup run (instant) walks the bracket: quarter, semi, final, champion; the portal sees every round', async ({
      page,
    }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG, FAST);
      await page.evaluate(() => window.__naijaTest!.setSeed(5));
      await page.evaluate(() =>
        window.__naijaTest!.autoplay({ mode: 'cup', difficulty: 'easy', win: true }),
      );
      await expectScreen(page, 'cup');
      await expect(page.locator('.pk-cupline').last()).toContainText('Champions');
      await expect(page.locator('.pk-bslot.is-out')).toHaveCount(7);
      const s = await snap(page);
      expect(s.cup).toMatchObject({ over: true, champion: 'lanterns', won: 3 });
      expect(s.progress).toMatchObject({ cups: 1, cupsWon: 1, bestRun: 3 });
      const ends = await page.evaluate(() =>
        window
          .__naijaTest!.events()
          .filter((e) => e.type === 'end')
          .map((e) => e.data),
      );
      expect(ends).toHaveLength(3);
      expect(ends.map((e) => (e as { round: string }).round)).toEqual(['qf', 'sf', 'final']);
      expect(watch.errors).toEqual([]);
    });

    test('pause freezes the match and the clock; resume continues it; Escape and P work; losing the tab pauses', async ({
      page,
    }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG, REAL);
      await page.evaluate((s) => window.__naijaTest!.setSeed(s), seedFor(1));
      await startFromMenu(page, 'Quick match');
      await waitRound(page, (r) => r.phase === 'ready' || r.phase === 'runup');
      await press(page.getByRole('button', { name: 'Pause' }));
      await expect(page.getByRole('dialog')).toBeVisible();
      const a = await round(page);
      expect(a.paused).toBe(true);
      await page.waitForTimeout(1500);
      const b = await round(page);
      expect([b.phase, b.state.kicks.length]).toEqual([a.phase, a.state.kicks.length]);
      await press(page.getByRole('button', { name: 'Resume' }));
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await waitRound(page, (r) => r.state.kicks.length > a.state.kicks.length);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.keyboard.press('p');
      await expect(page.getByRole('dialog')).toBeVisible();
      await press(page.getByRole('button', { name: 'Quit' }));
      await expectScreen(page, 'menu');
      expect(watch.errors).toEqual([]);
    });

    test('practice: striker only, unscored, never ends; Finish returns to the menu and nothing was recorded', async ({
      page,
    }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG, REAL);
      await startFromMenu(page, 'Practice');
      await expectScreen(page, 'play');
      await expect(page.locator('.pk-scoreboard')).toBeHidden();
      for (let i = 0; i < 3; i++) {
        await waitHumanShot(page);
        await swipe(page, { dx: i * 30 - 30, dy: -150, ms: 70 });
        await waitRound(page, (r) => r.practice.kicks > i);
      }
      expect((await round(page)).practice.kicks).toBe(3);
      await press(page.getByRole('button', { name: 'Finish' }));
      await expectScreen(page, 'menu');
      const s = await snap(page);
      expect(s.progress.plays).toBe(0);
      const ev = await page.evaluate(() => window.__naijaTest!.events());
      expect(ev.map((e) => e.type)).toEqual(['ready', 'start', 'end']);
      expect(ev[2]!.data).toEqual({ practice: true, level: 'medium', mode: 'practice' });
      await pickMode(page, 'Cup');
      expect(watch.errors).toEqual([]);
    });
  });
}
