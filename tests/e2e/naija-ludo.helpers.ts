import { expect, type Page } from '@playwright/test';
import { press } from './helpers';

export const SLUG = 'naija-ludo';

/** The slice of the game state the specs read (see games/naija-ludo/src/rules/engine.ts). */
export interface RoundState {
  phase: 'roll' | 'move' | 'over';
  winner: string | null;
  roll: number | null;
  sixes: number;
  rules: { quick: boolean; stacks: string; exactHome: boolean; captureBonus: boolean };
  players: { id: string; slot: number; seeds: number[] }[];
  turns: {
    index: number;
    taken: number[];
    seats: { id: string; kind: string; persona?: string }[];
  };
  lastRoll: { playerId: string; value: number; forfeit: boolean; stuck: boolean } | null;
  lastMove: { playerId: string; captures: unknown[]; again: string | null; home: boolean } | null;
}

export const round = (page: Page): Promise<RoundState | null> =>
  page.evaluate(() => (window.__naijaTest!.getState() as { round: RoundState | null }).round);

export const isHumanTurn = (s: RoundState): boolean =>
  s.turns.seats[s.turns.index]?.kind === 'human' && s.phase !== 'over';

const dieReady = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const b = document.querySelector<HTMLButtonElement>('.ng-dice');
    return !!b && !b.disabled;
  });

/** Wait until the die is live for the human's roll (CPUs play meanwhile) or the game is over. */
export async function waitForHuman(page: Page): Promise<RoundState> {
  let s: RoundState | null = null;
  await expect
    .poll(
      async () => {
        s = await round(page);
        if (!s) return false;
        if (s.phase === 'over') return true;
        return isHumanTurn(s) && s.phase === 'roll' && (await dieReady(page));
      },
      { timeout: 60_000, intervals: [100, 200, 400] },
    )
    .toBe(true);
  return s as unknown as RoundState;
}

export interface TurnOptions {
  via?: 'tap' | 'keys';
  /** which legal seed to pick (index into the movable seeds, default 0) */
  pick?: number;
}

export interface TurnLog {
  value: number | null;
  /** number of seeds the human had to choose between (0 = no choice asked) */
  choices: number;
  moved: boolean;
}

/** The seed numbers (1-based) of the glowing, tappable seeds right now. */
const movable = (page: Page): Promise<number[]> =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.ld-seed__hit:not([hidden])')].map((b) =>
      Number(/(\d)/.exec(b.getAttribute('aria-label') ?? '')?.[1]),
    ),
  );

/** One human roll step: roll, then choose a seed if the game asks, and wait for the step to end. */
export async function humanTurn(page: Page, o: TurnOptions = {}): Promise<TurnLog> {
  const before = await waitForHuman(page);
  if (before.phase === 'over') return { value: null, choices: 0, moved: false };
  const taken0 = before.turns.taken[before.turns.index] ?? 0;
  const log: TurnLog = { value: null, choices: 0, moved: false };
  if (o.via === 'keys') await page.keyboard.press('Space');
  else await press(page.locator('.ng-dice'));
  let chose = false;
  await expect
    .poll(
      async () => {
        const s = await round(page);
        if (!s) return true;
        if (s.lastRoll && s.phase !== 'roll') log.value = s.lastRoll.value;
        if (!chose) {
          const seeds = await movable(page);
          if (seeds.length) {
            chose = true;
            log.choices = seeds.length;
            const n = seeds[Math.min(o.pick ?? 0, seeds.length - 1)] as number;
            if (o.via === 'keys') {
              // arrows then Enter on one step in two, the number key on the others
              if ((await page.locator('.ld-seed.is-selected').count()) === 0 && n % 2 === 0) {
                await page.keyboard.press('ArrowRight');
                await page.keyboard.press('Enter');
              } else await page.keyboard.press(String(n));
            } else {
              // a lone seed may be moved by the auto-move setting before the tap lands: never wait
              // for a target that is gone (it would hang until the next choice appears)
              await press(page.locator('.ld-seed__hit:not([hidden])').nth(seeds.indexOf(n)), {
                timeout: 1500,
              }).catch(() => undefined);
            }
          }
        }
        return s.phase === 'over' || (s.turns.taken[0] ?? 0) > taken0;
      },
      { timeout: 30_000, intervals: [60, 120, 250] },
    )
    .toBe(true);
  const after = await round(page);
  log.moved = !!after?.lastMove && after.lastMove.playerId === 'you';
  return log;
}

export async function chooseMenu(
  page: Page,
  o: { difficulty?: string; cpus?: 1 | 3; mode?: 'Classic' | 'Quick' },
): Promise<void> {
  if (o.difficulty) await press(page.locator('.ng-seg label', { hasText: o.difficulty }).first());
  if (o.cpus) {
    await press(
      page
        .locator('.ng-field', { hasText: /Opponents|Who you wan play/ })
        .locator('label')
        .nth(o.cpus === 1 ? 0 : 1),
    );
  }
  if (o.mode) {
    await press(
      page.locator('.ng-field', { hasText: /^Mode/ }).locator('label', { hasText: o.mode }).first(),
    );
  }
}

/** First die a seed produces (mulberry32, the core rng): lets a test pick a seed with a 6 first. */
export function firstRoll(seed: number): number {
  let a = seed >>> 0;
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return 1 + Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * 6);
}

/** A seed whose first roll is `value`. */
export const seedWithFirstRoll = (value: number): number => {
  for (let s = 1; ; s++) if (firstRoll(s) === value) return s;
};

/**
 * An independent oracle for where a seed must stand, written from the asset brief (section 3) and
 * not from the game's geometry module: the track as 12 straight runs, columns and yards by hand.
 */
const run = (x0: number, y0: number, x1: number, y1: number): [number, number][] => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  return Array.from({ length: n + 1 }, (_, i) => [
    x0 + Math.sign(x1 - x0) * i,
    y0 + Math.sign(y1 - y0) * i,
  ]);
};
const BRIEF_TRACK: [number, number][] = [
  ...run(0, 6, 5, 6),
  ...run(6, 5, 6, 0),
  [7, 0],
  ...run(8, 0, 8, 5),
  ...run(9, 6, 14, 6),
  [14, 7],
  ...run(14, 8, 9, 8),
  ...run(8, 9, 8, 14),
  [7, 14],
  ...run(6, 14, 6, 9),
  ...run(5, 8, 0, 8),
  [0, 7],
];
const COLUMN: [number, number][][] = [
  run(7, 13, 7, 9),
  run(1, 7, 5, 7),
  run(7, 1, 7, 5),
  run(13, 7, 9, 7),
];
const YARD: [number, number][] = [
  [0, 9],
  [0, 0],
  [9, 0],
  [9, 9],
];
const expectedCentre = (slot: number, p: number, i: number, seeds: number): [number, number] => {
  if (p < 0) {
    const pit = seeds === 2 && i === 1 ? 3 : i;
    return [YARD[slot]![0] + 2 + (pit % 2) * 2, YARD[slot]![1] + 2 + Math.floor(pit / 2) * 2];
  }
  if (p >= 56) return [7.5, 7.5]; // somewhere in the centre: checked loosely below
  if (p > 50) return [COLUMN[slot]![p - 51]![0] + 0.5, COLUMN[slot]![p - 51]![1] + 0.5];
  const c = BRIEF_TRACK[(40 + 13 * slot + p) % 52]!;
  return [c[0] + 0.5, c[1] + 0.5];
};

/** Do the seeds on screen stand where the engine says (within a stack offset)? Waits for idle first. */
export async function seedPositionProblems(page: Page): Promise<string[]> {
  await waitForHuman(page); // idle: every hop and capture animation has finished
  const s = await round(page);
  if (!s) return ['no round'];
  const seedsPer = s.players[0]!.seeds.length;
  const data = await page.evaluate(() => {
    const b = document.querySelector('.ld-board')!.getBoundingClientRect();
    return {
      left: b.left,
      top: b.top,
      cell: b.width / 15,
      seeds: [...document.querySelectorAll<HTMLElement>('.ld-seed')].map((el) => {
        const r = el.getBoundingClientRect();
        return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      }),
    };
  });
  const out: string[] = [];
  if (data.seeds.length !== s.players.length * seedsPer) {
    out.push(
      `expected ${s.players.length * seedsPer} seeds on the board, found ${data.seeds.length}`,
    );
    return out;
  }
  let i = 0;
  for (const p of s.players) {
    p.seeds.forEach((progress, index) => {
      const [wx, wy] = expectedCentre(p.slot, progress, index, seedsPer);
      const want = { x: wx, y: wy };
      const got = data.seeds[i++]!;
      const dx = Math.abs(got.cx - (data.left + want.x * data.cell)) / data.cell;
      const dy = Math.abs(got.cy - (data.top + want.y * data.cell)) / data.cell;
      const tol = progress >= 56 ? 1.6 : 0.45; // home seeds sit in their centre triangle
      if (dx > tol || dy > tol) {
        out.push(
          `${p.id} seed ${index + 1} (progress ${progress}) is ${dx.toFixed(2)},${dy.toFixed(2)} cells off`,
        );
      }
    });
  }
  return out;
}

/** The 15x15 board must stay legible: cells of at least 22 px, square, and fully inside the viewport. */
export function boardProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const board = document.querySelector('.ld-board');
    if (!board) return ['no board'];
    const r = board.getBoundingClientRect();
    if (Math.abs(r.width - r.height) > 1) out.push(`board is ${r.width}x${r.height}, not square`);
    if (r.width / 15 < 22) out.push(`cells are ${(r.width / 15).toFixed(1)}px (< 22px)`);
    if (r.left < 0 || r.right > window.innerWidth) out.push('board leaves the viewport sideways');
    return out;
  });
}
