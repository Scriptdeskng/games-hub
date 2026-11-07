import type { Flow } from '@naija/core/board-kit';
import { ownerOf } from '../rules/board';
import { PITS } from '../rules/config';
import type { GameState, MoveRecord } from '../rules/engine';
import type { BoardView } from './board';
import type { Who } from './geometry';

/** Time between two seeds landing: 110 to 140 ms (asset brief), 125 on average. */
export const STEP_MS = 125;
const whoOf = (side: number): Who => (side === 0 ? 'human' : 'cpu');

export interface AnimatorDeps {
  board: BoardView;
  flow: Flow;
  sfx(name: string, o?: { pitch?: number; key?: string }): void;
  /** the human's seat is side 0 */
  reducedMotion(): boolean;
  onScore(side: 0 | 1, n: number): void;
}

export interface Animator {
  /** Play one move on the board: lift, sow seed by seed, then the captures. */
  playMove(m: MoveRecord): Promise<void>;
  /** The game ended with seeds left on the board: sweep them to the trays. */
  sweep(end: GameState): Promise<void>;
  /** Jump the view to a state (fast-forward, first paint). */
  snap(s: GameState): void;
}

/**
 * The movie of a move. It only changes what the board SHOWS; the engine state has already moved
 * on. Every wait goes through the flow (pause freezes it at the next gate, destroy ends it).
 */
export function createAnimator(d: AnimatorDeps): Animator {
  const { board, flow, sfx } = d;
  const { sleep } = flow;
  const step = (): number => (d.reducedMotion() ? 70 : STEP_MS);

  function snap(s: GameState): void {
    for (let pit = 0; pit < PITS; pit++) board.setCount(pit, s.pits[pit] as number);
    board.setTray('human', s.store[0]);
    board.setTray('cpu', s.store[1]);
    d.onScore(0, s.store[0]);
    d.onScore(1, s.store[1]);
  }

  async function playMove(m: MoveRecord): Promise<void> {
    board.clearMarks();
    board.setPlayable([]);
    sfx('pickUp');
    board.handTo(m.pit, 0);
    board.setCount(m.pit, 0);
    sfx('sowRattle');
    await sleep(170);
    let prev = m.pit;
    for (let i = 0; i < m.path.length; i++) {
      const pit = m.path[i] as number;
      if (pit !== (prev + 1) % PITS) {
        // the origin pit is skipped on a long sow
        board.mark(m.pit, 'skip', true);
        sfx('skipOrigin');
        await sleep(90);
      }
      board.handTo(pit, step());
      await sleep(step());
      board.setCount(pit, board.count(pit) + 1, true);
      sfx('seedDrop', { pitch: 1 + Math.min(0.12, i * 0.02), key: 'seedDrop' });
      board.ripple(pit);
      prev = pit;
    }
    board.handHide();
    board.mark(m.pit, 'skip', false);
    board.mark(m.last, 'last', true);
    if (m.captures.length) await capture(m);
  }

  async function capture(m: MoveRecord): Promise<void> {
    await sleep(120);
    const who = whoOf(m.side);
    for (let i = 0; i < m.captures.length; i++) {
      const c = m.captures[i] as { pit: number; count: number };
      board.mark(c.pit, 'capture', true);
      // the first pit rings the agogo, every further pit of a chain climbs a step
      if (i === 0) sfx('capture');
      else {
        sfx('chain', { pitch: 1 + i * 0.12 });
        board.chainLink((m.captures[i - 1] as { pit: number }).pit, c.pit);
      }
      board.burst(c.pit);
      await sleep(230);
      board.setCount(c.pit, 0);
      board.flyCounter(c.pit, who, c.count, 420);
      if (ownerOf(c.pit) === 0) sfx('seedsLost');
      await sleep(260);
      const n = board.tray(who) + c.count;
      board.setTray(who, n, true);
      d.onScore(m.side, n);
      sfx('trayDrop');
      board.mark(c.pit, 'capture', false);
    }
    if (m.gained >= 8) sfx('bigCapture');
    await sleep(120);
  }

  async function sweep(end: GameState): Promise<void> {
    sfx('sweep');
    board.clearMarks();
    const owners = end.rules.endSeeds === 'owners';
    const toHuman = (end.end?.swept[0] ?? 0) > 0;
    for (let pit = 0; pit < PITS; pit++) {
      const n = board.count(pit);
      if (n === 0) continue;
      const side = owners ? ownerOf(pit) : toHuman ? 0 : 1;
      board.setCount(pit, 0);
      board.flyCounter(pit, whoOf(side), n, 360);
      await sleep(150);
      board.setTray(whoOf(side), board.tray(whoOf(side)) + n, true);
      d.onScore(side as 0 | 1, board.tray(whoOf(side)));
    }
    // whatever the animation did, the trays show the engine's final count
    snap(end);
    await sleep(300);
  }

  return { playMove, sweep, snap };
}
