import { expect, type Page } from '@playwright/test';
import { expectScreen, press } from './helpers';

export const SLUG = 'sabi-words';

export interface Word {
  word: string;
  display: string;
  hint: string;
  r: number;
  c: number;
  dir: string;
}
export interface RoundState {
  status: 'playing' | 'won' | 'lost';
  difficulty: string;
  durationMs: number;
  timeLeftMs: number;
  found: { index: number; lane: number }[];
  hinted: number[];
  hintsUsed: number;
  wrongs: number;
  puzzle: { size: number; letters: string; packId: string; seed: number; words: Word[] };
}
export interface AppState {
  screen: string;
  mode: string;
  difficulty: string;
  packId: string;
  seed: number | null;
  progress: {
    coins: number;
    plays: number;
    wins: number;
    wordsFound: number;
    hintsUsed: number;
    best: Record<string, { score: number; stars: number; fastestMs: number }>;
    packs: Record<string, { plays: number; wins: number }>;
  };
  daily: { date: string; score: number; stars: number; finished: boolean } | null;
  packsLoaded: string[];
  round: RoundState | null;
}

export const appState = (page: Page): Promise<AppState> =>
  page.evaluate(() => window.__naijaTest!.getState() as never);
export const round = async (page: Page): Promise<RoundState> =>
  (await appState(page)).round as RoundState;

const STEP: Record<string, [number, number]> = {
  E: [0, 1],
  S: [1, 0],
  SE: [1, 1],
  NE: [-1, 1],
  W: [0, -1],
  N: [-1, 0],
  SW: [1, -1],
  NW: [-1, -1],
};

/** First and last cell index of word `i` as placed. */
export function ends(r: RoundState, i: number): [number, number] {
  const w = r.puzzle.words[i] as Word;
  const [dr, dc] = STEP[w.dir] as [number, number];
  const n = r.puzzle.size;
  const k = w.word.length - 1;
  return [w.r * n + w.c, (w.r + dr * k) * n + (w.c + dc * k)];
}

/** Viewport centre of tile `i`. */
export async function tileCentre(page: Page, i: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('.sw-tile').nth(i).boundingBox();
  if (!box) throw new Error(`tile ${i} not visible`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A real pointer swipe from tile `a` to tile `b`, through every tile between them. */
export async function swipe(page: Page, a: number, b: number): Promise<void> {
  const from = await tileCentre(page, a);
  const to = await tileCentre(page, b);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

/** A tap on tile `i`: a touch tap on touch projects, a mouse click on desktop. */
export async function tapTile(page: Page, i: number): Promise<void> {
  const c = await tileCentre(page, i);
  const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  if (touch) await page.touchscreen.tap(c.x, c.y);
  else await page.mouse.click(c.x, c.y);
}

export async function foundCount(page: Page): Promise<number> {
  return (await round(page)).found.length;
}

export async function choosePack(page: Page, id: string): Promise<void> {
  await press(page.locator('#menu-pack'));
  await expectScreen(page, 'packs');
  await press(page.locator(`[data-pack="${id}"]`));
  await expectScreen(page, 'menu');
}

export async function chooseDifficulty(page: Page, label: string): Promise<void> {
  await press(page.locator('.ng-seg label', { hasText: label }));
}

/** Start a Classic round from the menu and wait for the grid. */
export async function startRound(page: Page, label?: string): Promise<RoundState> {
  if (label) await chooseDifficulty(page, label);
  await press(page.locator('#menu-play'));
  await expectScreen(page, 'play');
  await expect(page.locator('.sw-tile').first()).toBeVisible();
  return round(page);
}

/** Solve word `i` with a real swipe and wait until the engine has it. */
export async function swipeWord(page: Page, i: number, reverse = false): Promise<void> {
  const r = await round(page);
  const [a, b] = ends(r, i);
  const before = r.found.length;
  await swipe(page, reverse ? b : a, reverse ? a : b);
  await expect.poll(() => foundCount(page)).toBe(before + 1);
}
