import { expect, type Page } from '@playwright/test';

/** The slice of the engine state the specs read (see games/draughts-naija/src/rules/engine.ts). */
export interface GameState {
  rules: { size: number; maxCapture: boolean; flyingKings: boolean; cpuStarts: boolean };
  board: number[];
  turn: number;
  plies: number;
  result: { winner: number | null; reason: string } | null;
  lastMove: { side: number; from: number; to: number; caps: number[]; crowned: boolean } | null;
}
export interface Move {
  from: number;
  to: number;
  path: number[];
  caps: number[];
}
export const movable = (moves: readonly Move[]): number[] => [...new Set(moves.map((m) => m.from))];
import { press } from './helpers';

export const SLUG = 'draughts-naija';
/** test builds: `?tempo=` speeds animations and the CPU pause up */
export const FAST = '?tempo=0.15';

export interface Snapshot {
  screen: string;
  difficulty: string;
  size: number;
  round: GameState | null;
  legal: Move[];
  stats: { moves: number; captured: number; lost: number; hints: number } | null;
  ai: {
    mode: string;
    workerAnswers: number;
    mainAnswers: number;
    timeouts: number;
    workerFailures: number;
    maxMs: number;
    cancelled: number;
  } | null;
  thinkTimes: number[];
  progress: { plays: number; wins: number; toggles: Record<string, boolean>; lastSize: number };
  autoplay: { rounds: number; rescues: unknown[] };
}

export const snap = (page: Page): Promise<Snapshot> =>
  page.evaluate(() => window.__naijaTest!.getState() as never);

export const sq = (page: Page, i: number) => page.locator(`.dn-sq[data-i="${i}"]`);

/** Wait until it is the human's (light's) turn and the board has settled, or the game is over. */
export async function waitForHuman(page: Page): Promise<GameState> {
  let s: GameState | null = null;
  await expect
    .poll(
      async () => {
        s = (await snap(page)).round;
        if (!s) return false;
        if (s.result) return true;
        return (
          s.turn === 0 &&
          (await page.locator('.dn-seat:not(.dn-seat--cpu).is-turn').count()) === 1 &&
          (await page.locator('.dn-piece.is-sliding,.dn-piece.is-taken').count()) === 0
        );
      },
      { timeout: 60_000, intervals: [100, 200, 400] },
    )
    .toBe(true);
  return s as unknown as GameState;
}

/** Tap a piece, then its destination (stones when several captures end on one square). */
export async function playMove(page: Page, m: Move, selected = false): Promise<void> {
  const s = (await snap(page)).round as GameState;
  const only = movable((await snap(page)).legal).length === 1;
  if (!only && !selected) await press(sq(page, m.from));
  await press(sq(page, m.to));
  // several captures end here: tap the stones where the paths part
  for (let k = 0; k < 4; k++) {
    const now = (await snap(page)).round as GameState;
    if (now.plies > s.plies) return;
    const stone = page.locator('.dn-sq.is-path .dn-step');
    if ((await stone.count()) === 0) break;
    const next = m.path[k]!;
    await press(sq(page, next));
  }
  await expect.poll(async () => ((await snap(page)).round?.plies ?? 0) > s.plies).toBe(true);
}

/** One human move through the real UI: the first legal move (or the `pick`th). */
export async function humanTurn(page: Page, pick = 0): Promise<Move | null> {
  const s = await waitForHuman(page);
  if (s.result) return null;
  const moves = (await snap(page)).legal;
  const m = moves[Math.min(pick, moves.length - 1)] as Move;
  await playMove(page, m);
  return m;
}

export const startPlay = async (page: Page): Promise<void> => {
  await press(page.locator('#menu-play'));
  await expect.poll(() => page.evaluate(() => window.__naijaTest!.screen())).toBe('play');
};

/** What the screen shows against what the engine says: the problems (empty when they agree). */
export const boardProblems = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const s = (
      window.__naijaTest!.getState() as {
        round: { board: number[]; rules: { size: number } } | null;
      }
    ).round;
    if (!s) return ['no round'];
    const out: string[] = [];
    const n = s.rules.size;
    s.board.forEach((v, i) => {
      const b = document.querySelector(`.dn-sq[data-i="${i}"]`);
      if (!b) {
        if (v !== 0) out.push(`piece on a light square ${i}`);
        return;
      }
      const p = b.querySelector('.dn-piece:not(.is-taken)');
      const want = v === 0 ? '' : `${v > 0 ? 'light' : 'dark'}${Math.abs(v) === 2 ? '-king' : ''}`;
      const got = !p
        ? ''
        : `${p.classList.contains('dn-piece--light') ? 'light' : 'dark'}${p.classList.contains('dn-piece--king') ? '-king' : ''}`;
      if (want !== got)
        out.push(`square ${i}: engine ${want || 'empty'}, screen ${got || 'empty'}`);
    });
    if (document.querySelectorAll('.dn-sq').length !== (n * n) / 2) out.push('wrong square count');
    return out;
  });
