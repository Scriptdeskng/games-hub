import { expect, type Page } from '@playwright/test';
import { press } from './helpers';

export const SLUG = 'naija-whot';

/** The slice of the game state the specs read (see games/naija-whot/src/rules/engine.ts). */
export interface RoundState {
  phase: 'play' | 'over';
  winner: string | null;
  endedBy: string | null;
  hands: number[][];
  draw: number[];
  discard: number[];
  called: string | null;
  pending: { kind: string; count: number } | null;
  calls: string[];
  rules: Record<string, boolean>;
  turns: {
    index: number;
    taken: number[];
    seats: { id: string; kind: string; persona?: string }[];
  };
  last: { type: string; kind?: string; seat?: number }[];
}

export const round = (page: Page): Promise<RoundState | null> =>
  page.evaluate(() => (window.__naijaTest!.getState() as { round: RoundState | null }).round);

export const isHumanTurn = (s: RoundState): boolean =>
  s.turns.seats[s.turns.index]?.kind === 'human' && s.phase !== 'over';

/** Is the UI waiting for the human (cards marked playable, or the market asking to be tapped)? */
const waiting = (page: Page): Promise<boolean> =>
  page.evaluate(
    () =>
      document.querySelectorAll('.wh-fan .whot-card.is-playable').length > 0 ||
      document.querySelector('.wh-market.is-take') !== null,
  );

/** Wait until the human can act (CPUs play meanwhile) or the game is over. */
export async function waitForHuman(page: Page): Promise<RoundState> {
  let s: RoundState | null = null;
  await expect
    .poll(
      async () => {
        s = await round(page);
        if (!s) {
          // the game ended while we waited: the results screen has taken the round away
          const onResults = (await page.evaluate(() => window.__naijaTest!.screen())) === 'results';
          if (onResults) s = { phase: 'over' } as RoundState;
          return onResults;
        }
        if (s.phase === 'over') return true;
        return isHumanTurn(s) && (await waiting(page));
      },
      { timeout: 60_000, intervals: [100, 200, 400] },
    )
    .toBe(true);
  return s as unknown as RoundState;
}

export interface TurnOptions {
  via?: 'tap' | 'keys';
  /** which playable card (index into the playable ones; default 0) */
  pick?: number;
  shape?: string;
}

export interface TurnLog {
  played: boolean;
  drew: boolean;
  whot: boolean;
  /** how many cards were playable when the human acted */
  choices: number;
}

/** One human action (play or draw), through the real UI, and wait until it has been taken. */
export async function humanTurn(page: Page, o: TurnOptions = {}): Promise<TurnLog> {
  const before = await waitForHuman(page);
  const log: TurnLog = { played: false, drew: false, whot: false, choices: 0 };
  if (before.phase === 'over') return log;
  const taken0 = before.turns.taken[0] ?? 0;
  const hand0 = before.hands[0]!.length;
  await expect
    .poll(
      async () => {
        const s = await round(page);
        if (!s || s.phase === 'over' || (s.turns.taken[0] ?? 0) > taken0) return true;
        if (!isHumanTurn(s)) return false;
        // a Whot 20: the shape picker is open
        const shapeBtn = page.locator(
          `.wh-picker:not([hidden]) .wh-shape[data-shape="${o.shape ?? 'star'}"]`,
        );
        if (await shapeBtn.count()) {
          log.whot = true;
          if (o.via === 'keys') await page.keyboard.press('3');
          else await press(shapeBtn, { timeout: 1500 }).catch(() => undefined);
          return false;
        }
        const selected = page.locator('.wh-fan .whot-card.is-selected');
        if (await selected.count()) {
          if (o.via === 'keys') await page.keyboard.press('Enter');
          else await press(selected.first(), { timeout: 1500 }).catch(() => undefined);
          return false;
        }
        const playable = page.locator('.wh-fan .whot-card.is-playable');
        const n = await playable.count();
        if (n > 0) {
          log.choices = Math.max(log.choices, n);
          log.played = true;
          const idx = Math.min(o.pick ?? 0, n - 1);
          if (o.via === 'keys') {
            const label = await playable.nth(idx).getAttribute('data-card');
            const at = await page.evaluate(
              (id) =>
                [...document.querySelectorAll('.wh-fan .whot-card')].findIndex(
                  (e) => (e as HTMLElement).dataset.card === id,
                ),
              label,
            );
            await page.keyboard.press(String(at + 1));
          } else await press(playable.nth(idx), { timeout: 1500 }).catch(() => undefined);
          return false;
        }
        const market = page.locator('.wh-market.is-take');
        if (await market.count()) {
          log.drew = true;
          await press(market, { timeout: 1500 }).catch(() => undefined);
          return false;
        }
        return false;
      },
      { timeout: 30_000, intervals: [60, 120, 250] },
    )
    .toBe(true);
  void hand0;
  return log;
}

export async function chooseMenu(
  page: Page,
  o: { difficulty?: string; cpus?: 1 | 2 | 3 },
): Promise<void> {
  if (o.difficulty) await press(page.locator('.ng-seg label', { hasText: o.difficulty }).first());
  if (o.cpus) {
    await press(
      page
        .locator('.ng-field', { hasText: /Opponents|Who you wan play/ })
        .locator('label')
        .nth(o.cpus - 1),
    );
  }
}

/** Start a game on `seed` and return its state when the human has a Whot 20 and the first move. */
export async function startWithWhot(page: Page, difficulty = 'Easy'): Promise<number> {
  await chooseMenu(page, { difficulty });
  for (let seed = 1; seed < 80; seed++) {
    await page.evaluate((n) => window.__naijaTest!.setSeed(n), seed);
    await press(page.locator('#menu-play'));
    await expect.poll(() => page.evaluate(() => window.__naijaTest!.screen())).toBe('play');
    const s = (await round(page))!;
    if (s.turns.index === 0 && s.hands[0]!.some((id) => id >= 49)) return seed;
    await press(page.getByRole('button', { name: 'Pause' }));
    await press(page.getByRole('button', { name: 'Quit' }));
    await expect.poll(() => page.evaluate(() => window.__naijaTest!.screen())).toBe('menu');
  }
  throw new Error('no seed with a Whot on the first move');
}
