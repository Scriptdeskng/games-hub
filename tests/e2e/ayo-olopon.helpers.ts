import { expect, type Page } from '@playwright/test';
import { press } from './helpers';

export const SLUG = 'ayo-olopon';

/** The slice of the game state the specs read (see games/ayo-olopon/src/rules/engine.ts). */
export interface RoundState {
  pits: number[];
  store: [number, number];
  plies: number;
  winner: string | null;
  draw: boolean;
  end: { reason: string; swept: [number, number] } | null;
  rules: {
    skipOrigin: boolean;
    captureChain: boolean;
    capture: string;
    mustFeed: boolean;
    endSeeds: string;
  };
  turns: { index: number; seats: { id: string; kind: string; persona?: string }[] };
  lastMove: {
    side: number;
    pit: number;
    count: number;
    gained: number;
    captures: unknown[];
  } | null;
}

export const round = (page: Page): Promise<RoundState | null> =>
  page.evaluate(() => (window.__naijaTest!.getState() as { round: RoundState | null }).round);

/** The pits (0-based) that glow and can be tapped right now. */
export const playable = (page: Page): Promise<number[]> =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.ayo-pit.is-playable')].map((b) =>
      Number(b.dataset.pit),
    ),
  );

/** Wait until the human may choose a pit (the CPU plays and every animation finishes meanwhile) or the game is over. */
export async function waitForHuman(page: Page): Promise<RoundState> {
  let s: RoundState | null = null;
  await expect
    .poll(
      async () => {
        s = await round(page);
        if (!s) return false;
        if (s.end) return true;
        return (await playable(page)).length > 0;
      },
      { timeout: 60_000, intervals: [100, 200, 400] },
    )
    .toBe(true);
  return s as unknown as RoundState;
}

export interface TurnOptions {
  via?: 'tap' | 'keys';
  /** which glowing pit to pick (index into the playable list, default 0) */
  pick?: number;
}

/** One human move: wait for the turn, choose a pit, wait for the sow to finish. Returns the pit played (0-based) or null when the game was over. */
export async function humanTurn(page: Page, o: TurnOptions = {}): Promise<number | null> {
  const before = await waitForHuman(page);
  if (before.end) return null;
  const options = await playable(page);
  const pit = options[Math.min(o.pick ?? 0, options.length - 1)] as number;
  if (o.via === 'keys') {
    // arrows then Enter on one move in two, the number key on the others
    if (pit % 2 === 1) {
      const start = options.indexOf(pit);
      for (let i = 0; i <= start; i++) await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
    } else await page.keyboard.press(String(pit + 1));
  } else {
    await press(page.locator(`.ayo-pit[data-pit="${pit}"]`));
  }
  await expect
    .poll(async () => ((await round(page))?.plies ?? 0) > before.plies, { timeout: 30_000 })
    .toBe(true);
  return pit;
}

/** What the board shows: every pit's chip, the seeds drawn in each pit and each tray. */
export interface Shown {
  chips: number[];
  drawn: number[];
  trays: [number, number];
  total: number;
}

export const shown = (page: Page): Promise<Shown> =>
  page.evaluate(() => {
    const chips = [...document.querySelectorAll('.ayo-chip')].map((c) => Number(c.textContent));
    const drawn = [...document.querySelectorAll('.ayo-cell')].map(
      (c) => c.querySelectorAll('.ayo-seed').length,
    );
    const trays = [...document.querySelectorAll('.ayo-tray')].map(
      (t) => t.querySelectorAll('.ayo-seed').length,
    );
    return {
      chips,
      drawn,
      // the DOM order is CPU tray, then human tray
      trays: [trays[1], trays[0]] as [number, number],
      total: document.querySelectorAll('.ayo-seed').length,
    };
  });

/** Does the board show exactly what the engine says? Waits for idle first. Returns the problems. */
export async function boardProblems(page: Page): Promise<string[]> {
  await waitForHuman(page);
  const s = await round(page);
  if (!s) return ['no round'];
  const v = await shown(page);
  const out: string[] = [];
  s.pits.forEach((n, i) => {
    if (v.chips[i] !== n) out.push(`pit ${i}: chip ${v.chips[i]}, engine ${n}`);
    if (v.drawn[i] !== n) out.push(`pit ${i}: ${v.drawn[i]} seeds drawn, engine ${n}`);
  });
  if (v.trays[0] !== s.store[0]) out.push(`human tray ${v.trays[0]}, engine ${s.store[0]}`);
  if (v.trays[1] !== s.store[1]) out.push(`cpu tray ${v.trays[1]}, engine ${s.store[1]}`);
  const sum = s.pits.reduce((a, b) => a + b, 0) + s.store[0] + s.store[1];
  if (sum !== 48) out.push(`engine has ${sum} seeds, not 48`);
  if (v.total !== 48) out.push(`${v.total} seeds on screen, not 48`);
  return out;
}

/**
 * An independent oracle for the screen order of the pits, written from the asset brief (section 3)
 * and not from the game's geometry module. Returns the problems for the current layout.
 */
export async function pitOrderProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const board = document.querySelector('.ayo-board') as HTMLElement | null;
    if (!board) return ['no board'];
    const layout = board.dataset.layout;
    const b = board.getBoundingClientRect();
    const out: string[] = [];
    // compare the pit cells (a cell is centred on its pit)
    const cells = [...document.querySelectorAll<HTMLElement>('.ayo-cell')].map((c) => {
      const r = c.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    const cx = b.left + b.width / 2;
    const cy = b.top + b.height / 2;
    if (layout === 'landscape') {
      for (let i = 0; i < 5; i++)
        if (!(cells[i + 1]!.x > cells[i]!.x))
          out.push(`landscape: pit ${i + 1} is not right of pit ${i}`);
      for (let i = 6; i < 11; i++)
        if (!(cells[i + 1]!.x < cells[i]!.x))
          out.push(`landscape: pit ${i + 1} is not left of pit ${i}`);
      if (!(cells[0]!.y > cy && cells[6]!.y < cy))
        out.push('landscape: the human row is not at the bottom');
    } else {
      for (let i = 0; i < 5; i++)
        if (!(cells[i + 1]!.y < cells[i]!.y))
          out.push(`portrait: pit ${i + 1} is not above pit ${i}`);
      for (let i = 6; i < 11; i++)
        if (!(cells[i + 1]!.y > cells[i]!.y))
          out.push(`portrait: pit ${i + 1} is not below pit ${i}`);
      if (!(cells[0]!.x > cx && cells[6]!.x < cx))
        out.push('portrait: the human column is not on the right');
    }
    return out;
  });
}

export async function chooseDifficulty(page: Page, label: string): Promise<void> {
  await press(page.locator('.ng-seg label', { hasText: label }).first());
}

export const rulesSwitches = (page: Page): ReturnType<Page['getByRole']> =>
  page.getByRole('switch');
