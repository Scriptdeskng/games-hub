import { expect, test } from '@playwright/test';
import { expectScreen, inViewport, openGame, press, watchErrors } from './helpers';
import {
  REAL,
  SLUG,
  round,
  seedFor,
  snap,
  startFromMenu,
  swipe,
  waitHumanShot,
  waitRound,
} from './penalty-king.helpers';

/** Real swipes (aim, power, curve), cancelled swipes, dive buttons of 44 px, the keyboard. */
export function inputTests(): void {
  test.describe('penalty-king: input', () => {
    const start = async (
      page: import('@playwright/test').Page,
      first: 0 | 1,
      query = REAL,
    ): Promise<void> => {
      await openGame(page, SLUG, query);
      await page.evaluate((s) => window.__naijaTest!.setSeed(s), seedFor(first));
      await startFromMenu(page, 'Quick match');
      await expectScreen(page, 'play');
    };

    test('a swipe sets aim, power and curve: a sweet flick is the Sweet zone, a slow drag is Soft, a curved path curls', async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const watch = watchErrors(page);
      await start(page, 0, '?tempo=0.2');
      await waitHumanShot(page);
      await swipe(page, { dx: 0, dy: -150, ms: 70 }); // 2.1 px/ms
      // the meter shows what you just did (power word, curve word) until the next kick
      await expect(page.locator('.pk-power__label')).toBeVisible({ timeout: 1500 });
      await waitRound(page, (r) => r.state.kicks.length >= 1);
      let k = (await round(page)).state.kicks[0]!;
      expect(k.power).toBe(3);
      expect(k.curve).toBe(0);
      await waitHumanShot(page);
      const base = (await round(page)).state.kicks.length;
      await swipe(page, { dx: 0, dy: -150, ms: 600, steps: 12 }); // 0.25 px/ms: Soft
      await waitRound(page, (r) => r.state.kicks.length > base);
      k = (await round(page)).state.kicks.filter((x) => x.side === 0)[1]!;
      expect(k.power).toBe(1);
      await waitHumanShot(page);
      const base2 = (await round(page)).state.kicks.length;
      await swipe(page, { dx: 0, dy: -150, ms: 80, steps: 12, bow: -0.2 }); // bulges left: a right curl
      await waitRound(page, (r) => r.state.kicks.length > base2);
      k = (await round(page)).state.kicks.filter((x) => x.side === 0)[2]!;
      expect(k.curve).toBe(1);
      expect(watch.errors).toEqual([]);
    });

    test('a tap, a short slip and a sideways drag do not shoot, and a hint is announced', async ({
      page,
    }) => {
      await start(page, 0);
      await waitHumanShot(page);
      for (const o of [
        { dx: 2, dy: -3, ms: 20 },
        { dx: 0, dy: -20, ms: 40 },
        { dx: 140, dy: -10, ms: 80 },
        { dx: 0, dy: 140, ms: 80 },
      ]) {
        await swipe(page, o);
        await page.waitForTimeout(120);
        const r = await round(page);
        expect(r.phase).toBe('ready');
        expect(r.state.kicks).toHaveLength(0);
      }
      await expect(page.locator('[role="status"][aria-live="polite"]').first()).toBeAttached();
      await swipe(page, { dx: 0, dy: -150, ms: 70 }); // a good one still works afterwards
      await waitRound(page, (r) => r.state.kicks.length === 1);
    });

    test('the dive grid: six real buttons, each 44 px or more, each named; a tap dives that zone', async ({
      page,
    }) => {
      await start(page, 1);
      await waitRound(page, (r) => r.phase === 'runup' && r.striker === 1);
      const buttons = page.locator('.pk-dive__zone');
      await expect(buttons).toHaveCount(6);
      for (let i = 0; i < 6; i++) {
        const box = (await buttons.nth(i).boundingBox())!;
        expect(box.width, `button ${i} width`).toBeGreaterThanOrEqual(44);
        expect(box.height, `button ${i} height`).toBeGreaterThanOrEqual(44);
        expect(await buttons.nth(i).getAttribute('aria-label')).toBeTruthy();
      }
      expect(await inViewport(page.locator('.pk-dive'))).toBe(true);
      await press(buttons.nth(0)); // up left
      const r = await waitRound(page, (x) => x.state.kicks.length >= 1);
      expect(r.state.kicks[0]!.dive).toBe('ul');
    });

    test('a swipe across the dive grid dives the way it points', async ({ page }) => {
      await start(page, 1);
      await waitRound(page, (r) => r.phase === 'runup' && r.striker === 1);
      await page.evaluate(async () => {
        const g = document.querySelector('.pk-dive__zone[data-zone="u"]') as HTMLElement;
        const r = g.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const fire = (type: string, px: number, py: number): void => {
          g.dispatchEvent(
            new PointerEvent(type, {
              pointerId: 9,
              pointerType: 'touch',
              clientX: px,
              clientY: py,
              bubbles: true,
            }),
          );
        };
        fire('pointerdown', x, y);
        await new Promise((res) => setTimeout(res, 30));
        fire('pointerup', x + 70, y - 40); // up and right
      });
      const r = await waitRound(page, (x) => x.state.kicks.length >= 1);
      expect(r.state.kicks[0]!.dive).toBe('ur');
    });

    test('too late is too late: a dive after the ball has gone is ignored and the keeper stays put', async ({
      page,
    }) => {
      await start(page, 1);
      await waitRound(page, (r) => r.phase === 'result' && r.state.kicks.length === 1, 20_000);
      await page.evaluate(() =>
        (document.querySelector('.pk-dive__zone[data-zone="u"]') as HTMLElement).click(),
      );
      expect((await round(page)).state.kicks[0]!.dive).toBeNull();
      await expect(page.locator('.pk-dive')).toBeHidden();
    });

    test('keyboard only: arrows aim, Space starts the meter and kicks; as keeper arrows pick a button and Enter dives; P pauses', async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const watch = watchErrors(page);
      await start(page, 0);
      await waitHumanShot(page);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('x');
      await expect(page.locator('.pk-aim__reticle')).toBeVisible();
      await page.keyboard.press('Space');
      await expect(page.locator('.pk-power')).toBeVisible();
      await page.waitForTimeout(350);
      await page.keyboard.press('Space');
      const r1 = await waitRound(page, (r) => r.state.kicks.length >= 1);
      expect(r1.state.kicks[0]!.side).toBe(0);
      expect(r1.state.kicks[0]!.curve).toBe(1);
      await waitRound(page, (r) => r.phase === 'runup' && r.striker === 1);
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      const r2 = await waitRound(page, (r) => r.state.kicks.length >= 2);
      expect(r2.state.kicks[1]!.dive).toBe('dl');
      await page.keyboard.press('p');
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('p');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect((await snap(page)).round!.paused).toBe(false);
      expect(watch.errors).toEqual([]);
    });

    test('the menu and results work with the keyboard alone (Tab, Enter, arrows on the radio groups)', async ({
      page,
    }) => {
      await openGame(page, SLUG, '?tempo=0.2');
      await expect(page.locator('#menu-play')).toBeFocused();
      await page.locator('.ng-seg input[value="quick"]').focus();
      await page.keyboard.press('ArrowRight'); // practice
      await expect(page.locator('.pk-help')).toContainText('Kick as many as you like');
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('.pk-help')).toContainText('One shootout');
      await page.locator('#menu-howto').focus();
      await page.keyboard.press('Enter');
      await expectScreen(page, 'howto');
      await page.keyboard.press('Escape');
      await expectScreen(page, 'menu');
    });
  });
}
