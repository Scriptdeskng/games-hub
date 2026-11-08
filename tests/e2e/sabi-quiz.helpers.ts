import { expect, type Page } from '@playwright/test';
import { press } from './helpers';

export const SLUG = 'sabi-quiz';
/** `?tempo=` (test builds only) runs the game clock faster so real-tap rounds stay quick. */
export const FAST = '?tempo=0.25';

export interface Q {
  id: string;
  category: string;
  q: string;
  options: string[];
  answer: number;
  difficulty: string;
}
export interface RoundState {
  mode: string;
  difficulty: string;
  limitMs: number;
  phase: 'asking' | 'reveal' | 'done';
  index: number;
  timeLeftMs: number;
  score: number;
  streak: number;
  correct: number;
  wrong: number;
  timeouts: number;
  skips: number;
  used: { fifty: boolean; skip: boolean; padi: boolean };
  eliminated: number[];
  poll: number[] | null;
  picked: number | null;
  questions: Q[];
  spares: Q[];
  cpu: { score: number; picked: number | null } | null;
  history: { result: string }[];
}
export interface AppState {
  screen: string;
  progress: {
    plays: number;
    wins: number;
    bestStreak: number;
    best: Record<string, number>;
    categories: Record<string, { asked: number; correct: number }>;
    duel: Record<string, { won: number; lost: number; drawn: number }>;
  };
  daily: { date: string; score: number; correct: number; finished: boolean } | null;
  round: RoundState | null;
  packLoaded: boolean;
}

export const appState = (page: Page): Promise<AppState> =>
  page.evaluate(() => window.__naijaTest!.getState() as never);
export const round = async (page: Page): Promise<RoundState | null> => (await appState(page)).round;

/** Wait for an open question (phase asking) and return it with its index. */
export async function waitForQuestion(page: Page, index?: number): Promise<RoundState> {
  let r: RoundState | null = null;
  await expect
    .poll(
      async () => {
        r = await round(page);
        return (
          !!r &&
          r.phase === 'asking' &&
          r.picked === null &&
          (index === undefined || r.index === index)
        );
      },
      { timeout: 20_000, intervals: [50, 100, 200] },
    )
    .toBe(true);
  return r as unknown as RoundState;
}

/** Tap the plate for option `i`. */
export const tapPlate = (page: Page, i: number): Promise<void> =>
  press(page.locator('.sq-plate').nth(i));

/** Answer the open question right (or wrong) with a real tap. */
export async function answerBy(page: Page, ok: boolean, index?: number): Promise<RoundState> {
  const r = await waitForQuestion(page, index);
  const q = r.questions[r.index] as Q;
  await tapPlate(page, ok ? q.answer : (q.answer + 1) % 4);
  return r;
}

/** Start a Classic round from the menu and wait for the first question. */
export async function startClassic(page: Page): Promise<void> {
  await press(page.locator('#menu-play'));
  await expect.poll(() => page.evaluate(() => window.__naijaTest!.screen())).toBe('play');
}

export async function chooseDifficulty(page: Page, label: string): Promise<void> {
  await press(page.locator('.ng-seg label', { hasText: label }));
}

/**
 * Answer whichever question is open right now (no index lock): a stalled test runner can never
 * wait for a question that has already closed. Returns the question it answered.
 */
export async function answerOpen(page: Page, ok = true): Promise<RoundState> {
  const r = await waitForQuestion(page);
  const q = r.questions[r.index] as Q;
  await tapPlate(page, ok ? q.answer : (q.answer + 1) % 4);
  return r;
}

/** Keep answering the open question until the results screen shows. Returns how many were answered. */
export async function playOut(page: Page, ok = true): Promise<number> {
  const seen = new Set<string>();
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    const screen = await page.evaluate(() => window.__naijaTest!.screen());
    if (screen !== 'play') break;
    const r = await round(page);
    if (r && r.phase === 'asking' && r.picked === null) {
      const q = r.questions[r.index] as Q;
      if (!seen.has(q.id)) {
        seen.add(q.id);
        await tapPlate(page, ok ? q.answer : (q.answer + 1) % 4).catch(() => undefined);
      }
    }
    await page.waitForTimeout(60);
  }
  return seen.size;
}
