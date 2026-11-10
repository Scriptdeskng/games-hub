import { expect, test, type Page } from '@playwright/test';
import {
  expectScreen,
  inViewport,
  layoutProblems,
  openGame,
  press,
  settled,
  stickyOverlaps,
} from './helpers';
import { FAST, REAL, SLUG, round, seedFor, startFromMenu, waitRound } from './penalty-king.helpers';

/** Rows (stat tiles, how-to steps, bracket lines) that sit under a sticky action bar at rest. */
const barOverlaps = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const bar = document.querySelector('.ng-sticky-actions');
    if (!bar || getComputedStyle(bar).position !== 'sticky') return [];
    const b = bar.getBoundingClientRect();
    const out: string[] = [];
    for (const t of document.querySelectorAll('.ng-stat, .ng-howto__step, .pk-cupline')) {
      const r = t.getBoundingClientRect();
      if (
        Math.min(r.right, b.right) - Math.max(r.left, b.left) > 1 &&
        Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top) > 1
      )
        out.push((t.textContent ?? '').trim().slice(0, 24));
    }
    return out;
  });

const rect = (page: Page, sel: string) =>
  page
    .locator(sel)
    .first()
    .evaluate((e) => {
      const r = e.getBoundingClientRect();
      return { l: r.left, t: r.top, r: r.right, b: r.bottom };
    });
const overlap = (
  a: { l: number; t: number; r: number; b: number },
  b: { l: number; t: number; r: number; b: number },
): boolean =>
  Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1;

/** Every screen at the project's viewport (portrait phones, landscape phone, desktop), in English and Pidgin. */
export function layoutTests(): void {
  test.describe('penalty-king: layout', () => {
    for (const lang of ['en', 'pcm']) {
      test(`menu, how-to, stats and the cup bracket: no overflow or clipped text, nothing under a sticky bar [${lang}]`, async ({
        page,
      }) => {
        await openGame(page, SLUG, `?lang=${lang}&tempo=0.2`);
        expect(await layoutProblems(page)).toEqual([]);
        for (const [id, screen] of [
          ['#menu-howto', 'howto'],
          ['#menu-stats', 'stats'],
        ] as const) {
          await press(page.locator(id));
          await expectScreen(page, screen);
          expect(await layoutProblems(page), screen).toEqual([]);
          expect(await barOverlaps(page), screen).toEqual([]);
          await press(page.locator('.ng-sticky-actions button, .pk-actions button').first());
          await expectScreen(page, 'menu');
        }
        await startFromMenuByValue(page, 'cup');
        await expectScreen(page, 'cup');
        await settled(page);
        // the badge on each slot corner sticks out of its slot by design (art CSS), so slots are checked by geometry below
        expect(await layoutProblems(page, { skip: '.pk-bslot' })).toEqual([]);
        const vp = page.viewportSize()!;
        const br = await rect(page, '.pk-bracket');
        expect(br.l).toBeGreaterThanOrEqual(0);
        expect(br.r).toBeLessThanOrEqual(vp.width + 0.5);
        expect(br.r - br.l).toBeGreaterThanOrEqual(220);
        // every slot is inside the bracket art and none sits on another
        const slots = await page.locator('.pk-bslot').evaluateAll((els) =>
          els.map((e) => {
            const r = e.getBoundingClientRect();
            return { l: r.left, t: r.top, r: r.right, b: r.bottom };
          }),
        );
        slots.forEach((s, i) => {
          expect(s.l).toBeGreaterThanOrEqual(br.l - 1);
          expect(s.r).toBeLessThanOrEqual(br.r + 1);
          slots.slice(i + 1).forEach((o) => expect(overlap(s, o)).toBe(false));
        });
        expect(await barOverlaps(page)).toEqual([]);
        // the action buttons can always be reached
        await page.locator('.pk-actions button').last().scrollIntoViewIfNeeded();
        expect(await inViewport(page.locator('.pk-actions button').last())).toBe(true);
      });

      test(`results: nothing sits under the sticky action bar at rest, status words are on solid plates [${lang}]`, async ({
        page,
      }) => {
        await openGame(page, SLUG, `?lang=${lang}`);
        await page.evaluate(() => window.__naijaTest!.setSeed(11));
        await page.evaluate(() =>
          window.__naijaTest!.autoplay({ mode: 'quick', difficulty: 'easy', win: true }),
        );
        await expectScreen(page, 'results');
        await settled(page);
        expect(await stickyOverlaps(page)).toEqual([]);
        expect(await barOverlaps(page)).toEqual([]);
        expect(await layoutProblems(page)).toEqual([]);
        // a lost match too (the longer "Nearly there" title)
        await press(page.locator('.ng-sticky-actions button').last());
        await page.evaluate(() =>
          window.__naijaTest!.autoplay({ mode: 'quick', difficulty: 'hard', win: false }),
        );
        await expectScreen(page, 'results');
        await settled(page);
        expect(await stickyOverlaps(page)).toEqual([]);
        expect(await barOverlaps(page)).toEqual([]);
        expect(await layoutProblems(page)).toEqual([]);
      });
    }

    for (const lang of ['en', 'pcm']) {
      test(`play screen: HUD, controls and bubble fit and do not cover each other; the pitch is square-on [${lang}]`, async ({
        page,
      }) => {
        await openGame(page, SLUG, `?lang=${lang}&tempo=1`);
        await page.evaluate((s) => window.__naijaTest!.setSeed(s), seedFor(1));
        await startFromMenu(page, 'Quick match');
        await waitRound(page, (r) => r.phase === 'runup' && r.striker === 1);
        const vp = page.viewportSize()!;
        expect(await layoutProblems(page, { skip: '.pk-stage, .pk-fxlayer' })).toEqual([]);
        for (const sel of ['.pk-scoreboard', '.pk-bar', '.pk-dive', '.pk-canvas'])
          expect(await inViewport(page.locator(sel)), sel).toBe(true);
        const board = await rect(page, '.pk-scoreboard');
        const bar = await rect(page, '.pk-bar');
        const dive = await rect(page, '.pk-dive');
        expect(overlap(board, bar)).toBe(false);
        expect(overlap(bar, dive)).toBe(false);
        expect(overlap(board, dive)).toBe(false);
        expect(dive.r - dive.l).toBeGreaterThanOrEqual(300 > vp.width ? vp.width * 0.8 : 300);
        // the page does not scroll while playing
        expect(
          await page.evaluate(
            () => document.documentElement.scrollHeight <= window.innerHeight + 1,
          ),
        ).toBe(true);
        // the canvas matches the stage and the scene art is placed by the same numbers
        const sizes = await page.evaluate(() => {
          const c = document.querySelector('.pk-canvas') as HTMLCanvasElement;
          const st = document.querySelector('.pk-stage') as HTMLElement;
          return {
            cw: c.getBoundingClientRect().width,
            sw: st.getBoundingClientRect().width,
            bw: st.style.getPropertyValue('--pk-bw'),
            dpr: c.width / c.getBoundingClientRect().width,
          };
        });
        expect(Math.abs(sizes.cw - sizes.sw)).toBeLessThan(1.5);
        expect(parseFloat(sizes.bw)).toBeGreaterThanOrEqual(vp.width - 1);
        expect(sizes.dpr).toBeLessThanOrEqual(2.01);
      });
    }

    test('rotating the phone in the middle of a round loses nothing and the layout follows', async ({
      page,
    }) => {
      await openGame(page, SLUG, REAL);
      await page.evaluate((s) => window.__naijaTest!.setSeed(s), seedFor(0));
      await startFromMenu(page, 'Quick match');
      await waitRound(page, (r) => r.phase === 'ready' && r.striker === 0);
      const before = await round(page);
      const vp = page.viewportSize()!;
      await page.setViewportSize({ width: vp.height, height: vp.width });
      await expect
        .poll(async () => (await round(page)).frames.landscape)
        .toBe(vp.height > vp.width);
      const mid = await round(page);
      expect(mid.state.kicks).toEqual(before.state.kicks);
      expect(mid.state.first).toBe(before.state.first);
      expect(mid.phase).toBe('ready');
      const cv = await rect(page, '.pk-canvas');
      expect(cv.r - cv.l).toBeCloseTo(vp.height, 0);
      expect(await layoutProblems(page, { skip: '.pk-stage, .pk-fxlayer' })).toEqual([]);
      // the swipe still works after the rotation
      const { swipe } = await import('./penalty-king.helpers');
      await swipe(page, { dx: 20, dy: -120, ms: 60 });
      await waitRound(page, (r) => r.state.kicks.length === 1);
      await page.setViewportSize(vp);
      await expect
        .poll(async () => (await round(page)).frames.landscape)
        .toBe(vp.width > vp.height);
      expect((await round(page)).state.kicks).toHaveLength(1);
      expect(await layoutProblems(page, { skip: '.pk-stage, .pk-fxlayer' })).toEqual([]);
    });

    test('the pitch art fills the screen at every size and the HUD stays clear of the goal', async ({
      page,
    }) => {
      await openGame(page, SLUG, FAST);
      await startFromMenu(page, 'Quick match');
      await expectScreen(page, 'play');
      const vp = page.viewportSize()!;
      const stage = await rect(page, '.pk-stage');
      expect(stage.r - stage.l).toBeCloseTo(vp.width, 0);
      expect(stage.b - stage.t).toBeGreaterThanOrEqual(vp.height - 1);
      const board = await rect(page, '.pk-scoreboard');
      const frame = (await round(page)).frames;
      // the goal is in the middle: on a wide screen the scoreboard sits at the left, clear of it
      if (frame.landscape && vp.height <= 520) expect(board.r).toBeLessThan(vp.width / 2 - 40);
      expect(board.t).toBeGreaterThanOrEqual(0);
    });

    test('perf hook reports real frames while playing', async ({ page }) => {
      await openGame(page, SLUG, REAL);
      await startFromMenu(page, 'Quick match');
      await expectScreen(page, 'play');
      await page.waitForTimeout(900);
      const p = await page.evaluate(() => window.__naijaTest!.perf());
      expect(p).not.toBeNull();
      expect(p!.frames).toBeGreaterThan(10);
    });
  });
}

async function startFromMenuByValue(
  page: Page,
  value: 'cup' | 'quick' | 'practice',
): Promise<void> {
  await press(page.locator(`.ng-seg input[value="${value}"]`).locator('xpath=ancestor::label'));
  await press(page.locator('#menu-play'));
}
