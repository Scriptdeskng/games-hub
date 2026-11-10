import { expect, type Page } from '@playwright/test';
import { press } from './helpers';

export const SLUG = 'penalty-king';
/** test builds: `?tempo=` is a duration scale (0.2 runs a match five times faster) */
export const FAST = '?tempo=0.2';
/** real speed: needed when a human tap has to land inside the 0.7 s keeper window */
export const REAL = '?tempo=1';

export interface Kick {
  side: 0 | 1;
  outcome: 'goal' | 'saved' | 'miss' | 'post';
  zone: string;
  power: number;
  curve: number;
  dive: string | null;
}
export interface Round {
  phase: string;
  striker: 0 | 1;
  paused: boolean;
  watchdog: number;
  state: {
    first: 0 | 1;
    kicks: Kick[];
    goals: [number, number];
    status: string;
    winner: number | null;
    quota: number;
  };
  practice: { kicks: number; goals: number; saves: number };
  frames: { w: number; h: number; landscape: boolean };
}
export interface Snapshot {
  screen: string;
  mode: string;
  difficulty: string;
  round: Round | null;
  cup: { stage: number; over: boolean; champion: string | null; won: number } | null;
  progress: {
    plays: number;
    wins: number;
    cups: number;
    cupsWon: number;
    bestRun: number;
    goals: number;
    saves: number;
    lastMode: string;
    lastDifficulty: string;
  };
  autoplay: { rounds: number; rescues: unknown[] };
}

export const snap = (page: Page): Promise<Snapshot> =>
  page.evaluate(() => window.__naijaTest!.getState() as never);
export const round = async (page: Page): Promise<Round> => (await snap(page)).round as Round;

/** The first kicker the engine draws for a seed (mulberry32, as core's createRng): 0 the human, 1 the CPU. */
export function firstKicker(seed: number): 0 | 1 {
  let a = seed >>> 0;
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296 < 0.5 ? 0 : 1;
}
/** A seed (from `from`) whose shootout opens with the given side. */
export const seedFor = (first: 0 | 1, from = 1): number => {
  let s = from;
  while (firstKicker(s) !== first) s++;
  return s;
};

export async function waitRound(
  page: Page,
  ok: (r: Round) => boolean,
  timeout = 30_000,
): Promise<Round> {
  let last: Round | null = null;
  await expect
    .poll(
      async () => {
        last = (await snap(page)).round;
        return last !== null && ok(last);
      },
      { timeout, intervals: [50, 100, 200] },
    )
    .toBe(true);
  return last as unknown as Round;
}

/** The human is up and the ball is on the spot. */
export const waitHumanShot = (page: Page): Promise<Round> =>
  waitRound(page, (r) => r.phase === 'ready' && r.striker === 0 && r.state.status === 'playing');

export const pickMode = async (page: Page, label: string): Promise<void> => {
  await press(page.locator('.ng-seg label', { hasText: label }).first());
};

export const startFromMenu = async (
  page: Page,
  mode: 'Cup' | 'Quick match' | 'Practice' = 'Quick match',
): Promise<void> => {
  await pickMode(page, mode);
  await press(page.locator('#menu-play'));
};

export interface SwipeOpts {
  dx?: number;
  dy?: number;
  /** total time in ms (a flick of 150 px in 70 ms is about 2 px/ms: a sweet shot) */
  ms?: number;
  steps?: number;
  /** bulge of the path as a fraction of its length: negative bulges left (a right curl) */
  bow?: number;
}

/** A real touch-style swipe on the canvas: pointer events with real time between them. */
export async function swipe(page: Page, o: SwipeOpts = {}): Promise<void> {
  const a = { dx: 30, dy: -150, ms: 70, steps: 6, bow: 0, ...o };
  await page.evaluate(async (p) => {
    const cv = document.querySelector('.pk-canvas') as HTMLElement;
    const r = cv.getBoundingClientRect();
    const x0 = r.left + r.width / 2;
    const y0 = r.top + r.height - 130;
    const len = Math.hypot(p.dx, p.dy);
    const fire = (type: string, x: number, y: number): void => {
      cv.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 7,
          pointerType: 'touch',
          isPrimary: true,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
        }),
      );
    };
    fire('pointerdown', x0, y0);
    for (let i = 1; i <= p.steps; i++) {
      await new Promise((res) => setTimeout(res, p.ms / p.steps));
      const f = i / p.steps;
      const off = p.bow * len * Math.sin(Math.PI * f);
      fire(
        i === p.steps ? 'pointerup' : 'pointermove',
        x0 + p.dx * f + (-p.dy / len) * off,
        y0 + p.dy * f + (p.dx / len) * off,
      );
    }
  }, a);
}

/** Console and page errors that are not just a blocked picture (the asset-failure test aborts requests on purpose). */
export const realErrors = (errors: string[]): string[] =>
  errors.filter((e) => !/Failed to load resource|requestfailed|net::ERR/.test(e));
