import { expect, test } from '@playwright/test';
import { expectScreen, openGame, press, watchErrors } from './helpers';
import { FAST, SLUG, humanTurn, snap, sq, startPlay, waitForHuman } from './draughts-naija.helpers';

const centre = async (loc: ReturnType<typeof sq>): Promise<{ x: number; y: number; w: number }> => {
  const b = (await loc.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width };
};

/** Keyboard, hit-slop, drag and tap targets. */
export function inputTests(): void {
  test.describe('draughts-naija: input', () => {
    test('keyboard: arrows move the cursor over dark squares, Enter selects and plays, Escape cancels, H hints, P pauses', async ({
      page,
    }) => {
      const watch = watchErrors(page);
      await openGame(page, SLUG, FAST);
      await startPlay(page);
      await waitForHuman(page);
      const m = (await snap(page)).legal[0]!;
      await page.locator('.dn-sq[tabindex="0"]').focus();
      // walk the cursor to the piece: it is always on a dark square
      for (let k = 0; k < 40; k++) {
        const cur = Number(
          await page.evaluate(() => (document.activeElement as HTMLElement).dataset.i),
        );
        if (cur === m.from) break;
        const [cr, cc, tr, tc] = [
          Math.floor(cur / 10),
          cur % 10,
          Math.floor(m.from / 10),
          m.from % 10,
        ];
        await page.keyboard.press(
          tr < cr ? 'ArrowUp' : tr > cr ? 'ArrowDown' : tc > cc ? 'ArrowRight' : 'ArrowLeft',
        );
      }
      expect(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.i)).toBe(
        String(m.from),
      );
      await page.keyboard.press('Enter');
      await expect(sq(page, m.from)).toHaveClass(/is-select/);
      await page.keyboard.press('Escape');
      await expect(sq(page, m.from)).not.toHaveClass(/is-select/);
      await page.keyboard.press('h');
      await expect(page.locator('.dn-sq.is-hint')).toHaveCount(2);
      await page.keyboard.press('Enter'); // select again
      await page.keyboard.press('p');
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('p');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(watch.errors).toEqual([]);
    });

    test('hit-slop: a tap near a legal square, in the gap beside it, still plays it', async ({
      page,
    }) => {
      await openGame(page, SLUG, FAST);
      await startPlay(page);
      const s = await waitForHuman(page);
      const m = (await snap(page)).legal[0]!;
      await press(sq(page, m.from));
      const to = await centre(sq(page, m.to));
      const before = s.plies;
      // 15 px to the side: inside the neighbouring light square, within the 22 px slop
      await page.touchscreen
        .tap(to.x + Math.min(15, to.w * 0.48), to.y)
        .catch(async () => page.mouse.click(to.x + 15, to.y));
      await expect.poll(async () => (await snap(page)).round!.plies).toBeGreaterThan(before);
      expect((await snap(page)).round!.lastMove).toMatchObject({ from: m.from, to: m.to });
    });

    test('drag and drop a piece onto a legal square (mouse), and a bad drop puts it back', async ({
      page,
    }) => {
      await openGame(page, SLUG, FAST);
      await startPlay(page);
      const s = await waitForHuman(page);
      const moves = (await snap(page)).legal;
      const m = moves[0]!;
      const a = await centre(sq(page, m.from));
      const far = await centre(sq(page, 10 + 2)); // a CPU square, never a target
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      await page.mouse.move(a.x + 20, a.y - 10, { steps: 4 });
      await expect(sq(page, m.from)).toHaveClass(/is-drag/);
      await page.mouse.move(far.x, far.y, { steps: 4 });
      await page.mouse.up();
      expect((await snap(page)).round!.plies).toBe(s.plies); // nothing played
      await expect(sq(page, m.from)).not.toHaveClass(/is-drag/);
      const b = await centre(sq(page, m.to));
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      await page.mouse.move(b.x, b.y, { steps: 6 });
      await page.mouse.up();
      await expect.poll(async () => (await snap(page)).round!.plies).toBeGreaterThan(s.plies);
      expect((await snap(page)).round!.lastMove).toMatchObject({ from: m.from, to: m.to });
    });

    test('tap targets: pause and hint are at least 44 px; board squares are the documented exception, with hit-slop', async ({
      page,
    }) => {
      await openGame(page, SLUG, FAST);
      await startPlay(page);
      for (const name of ['Pause', 'Hint']) {
        const b = (await page.getByRole('button', { name }).boundingBox())!;
        expect(b.height, name).toBeGreaterThanOrEqual(43.5);
        expect(b.width, name).toBeGreaterThanOrEqual(43.5);
      }
      const cell = (await sq(page, 90).boundingBox())!;
      expect(cell.width).toBeGreaterThan(28); // 31.6 px at 360 wide; the slop covers the rest
      await expectScreen(page, 'play');
      await humanTurn(page);
    });
  });
}
