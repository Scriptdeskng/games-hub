import { expect, type Page } from '@playwright/test';
import { press } from './helpers';

export const SLUG = 'snakes-ladders';

/** The slice of the game state the specs read (see games/snakes-ladders/src/rules/engine.ts). */
export interface RoundState {
  phase: 'roll' | 'pick' | 'decide' | 'over';
  winner: string | null;
  roll: number | null;
  dice: [number, number] | null;
  players: { id: string; pos: number; rerollLeft: boolean }[];
  turns: { index: number; taken: number[]; seats: { id: string; kind: string }[] };
  lastMove: { playerId: string; roll: number; via: string | null; overshoot: boolean } | null;
}

export const round = (page: Page): Promise<RoundState | null> =>
  page.evaluate(() => (window.__naijaTest!.getState() as { round: RoundState | null }).round);

export const isHumanTurn = (s: RoundState): boolean =>
  s.turns.seats[s.turns.index]?.kind === 'human' && s.phase !== 'over';

/** Wait until it is the human's move (the CPUs take their turns meanwhile) or the game is over. */
export async function waitForHuman(page: Page): Promise<RoundState> {
  let s: RoundState | null = null;
  await expect
    .poll(
      async () => {
        s = await round(page);
        return !!s && (isHumanTurn(s) || s.phase === 'over') && !!(await dieReady(page));
      },
      { timeout: 45_000, intervals: [100, 200, 400] },
    )
    .toBe(true);
  return s as unknown as RoundState;
}

const dieReady = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const b = document.querySelector<HTMLButtonElement>('.ng-dice');
    return !!b && !b.disabled;
  });

export interface TurnOptions {
  /** how to give input */
  via?: 'tap' | 'keys';
  /** spend the re-roll on this turn if it is on offer */
  reroll?: boolean;
  /** which die to keep on a two-dice turn (default 0) */
  pick?: 0 | 1;
}

export interface TurnLog {
  sawPick: boolean;
  sawDecide: boolean;
  rerolled: boolean;
}

/** Play one human turn through the real controls. Returns what the turn showed. */
export async function humanTurn(page: Page, o: TurnOptions = {}): Promise<TurnLog> {
  const log: TurnLog = { sawPick: false, sawDecide: false, rerolled: false };
  let pickDone = false;
  let decideDone = false;
  const before = await waitForHuman(page);
  if (before.phase === 'over') return log;
  const taken = before.turns.taken[0] ?? 0;
  if (o.via === 'keys') await page.keyboard.press('Space');
  else await press(page.locator('.ng-dice'));
  // follow the turn until the human's own turn counter moves on
  await expect
    .poll(
      async () => {
        const s = await round(page);
        if (!s) return true;
        if (s.phase === 'over' || (s.turns.taken[0] ?? 0) > taken) return true;
        if (s.phase === 'pick' && !pickDone) {
          log.sawPick = true;
          pickDone = true;
          // the two dice appear once the cupped-hands shake has finished
          await expect(page.locator('.ng-dice__opt')).toHaveCount(2);
          if (o.via === 'keys') await page.keyboard.press(String((o.pick ?? 0) + 1));
          else await press(page.locator('.ng-dice__opt').nth(o.pick ?? 0));
        } else if (s.phase === 'decide' && !decideDone && s.turns.index === 0) {
          log.sawDecide = true;
          decideDone = true;
          await expect(page.locator('#sl-move')).toBeVisible();
          const canRe = s.players[0]?.rerollLeft;
          if (o.reroll && canRe) {
            log.rerolled = true;
            if (o.via === 'keys') await page.keyboard.press('r');
            else await press(page.locator('#sl-reroll'));
          } else if (o.via === 'keys') await page.keyboard.press('Enter');
          else await press(page.locator('#sl-move'));
        }
        return false;
      },
      { timeout: 20_000, intervals: [100, 150, 250] },
    )
    .toBe(true);
  return log;
}

/** Open the menu pickers: difficulty and number of opponents. */
export async function chooseMenu(
  page: Page,
  o: { difficulty?: string; cpus?: number },
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

/** Board squares are real text: each must fit inside its cell, at a readable size. */
export async function boardLabelProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const board = document.querySelector('.sl-board');
    if (!board) return ['no board'];
    const b = board.getBoundingClientRect();
    const cell = b.width / 10;
    const out: string[] = [];
    const labels = [...document.querySelectorAll<HTMLElement>('.sl-n')];
    if (labels.length !== 100) out.push(`expected 100 square labels, found ${labels.length}`);
    for (const el of labels) {
      const r = el.getBoundingClientRect();
      const n = Number(el.textContent);
      const col = Math.floor((r.left - b.left + 1) / cell);
      const row = Math.floor((r.top - b.top + 1) / cell);
      if (r.right > b.left + (col + 1) * cell + 0.5) out.push(`${n} runs past its cell (right)`);
      if (r.bottom > b.top + (row + 1) * cell + 0.5) out.push(`${n} runs past its cell (bottom)`);
      if (el.scrollWidth > el.clientWidth + 1) out.push(`${n} text overflows its box`);
      if (parseFloat(getComputedStyle(el).fontSize) < 10.5) out.push(`${n} is smaller than 10.5px`);
    }
    return out;
  });
}
