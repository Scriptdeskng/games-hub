import type { Flow } from '@naija/core/board-kit';
import { LIGHT } from '../rules/board';
import type { GameState, MoveRecord } from '../rules/engine';
import type { BoardView } from './board';

/** One slide of a piece, ms (the CSS animation is 220 ms; this is the pause until the next hop). */
const HOP_MS = 230;
/** A multi-capture climbs 6 percent per hop, up to +36 percent (the asset brief). */
export const hopPitch = (hop: number): number => 1 + Math.min(0.36, 0.06 * hop);

export interface AnimatorDeps {
  board: BoardView;
  flow: Flow;
  sfx(name: string, o?: { pitch?: number }): void;
  reducedMotion(): boolean;
}

export interface Animator {
  /** The movie of one move: slide, jumps one by one (numbered stones, ripple, ribbons), crown. */
  playMove(m: MoveRecord, after: GameState): Promise<void>;
}

/**
 * Animation only changes what the board SHOWS: `after` has already been computed by the engine, and
 * the board is re-rendered from it at the end, so a skipped or interrupted movie can never leave the
 * screen out of step with the rules. Every wait goes through the flow (pause freezes it at the next
 * gate, destroy ends it). Under reduced motion the move is shown at once, with its sounds.
 */
export function createAnimator(d: AnimatorDeps): Animator {
  const { board, flow, sfx } = d;

  async function playMove(m: MoveRecord, after: GameState): Promise<void> {
    const mine = m.side === LIGHT;
    const reduced = d.reducedMotion();
    if (m.caps.length === 0) {
      sfx(mine ? 'pieceMove' : 'cpuMove');
      if (!reduced) {
        board.slide(m.from, m.to);
        await flow.sleep(HOP_MS);
      }
    } else {
      let at = m.from;
      for (let i = 0; i < m.caps.length; i++) {
        const to = m.path[i] as number;
        const cap = m.caps[i] as number;
        if (!reduced) {
          board.slide(at, to);
          board.showPath(m, i + 1);
          await flow.sleep(HOP_MS * 0.75);
        }
        board.take(cap);
        if (!reduced && i === m.caps.length - 1) board.fx('ribbons', to);
        if (m.caps.length === 1) sfx('capture');
        else sfx('captureHop', { pitch: hopPitch(i) });
        at = to;
        if (!reduced) await flow.sleep(HOP_MS * 0.5);
      }
      if (m.caps.length >= 3) sfx('chainEnd');
    }
    if (m.crowned) {
      board.crown(m.to);
      sfx('crown');
      if (!reduced) await flow.sleep(380);
    }
    board.showPath(null);
    // end of the movie: leave the screen exactly as the rules have it
    const p = board.pieceAt(m.to);
    p?.classList.remove('is-sliding', 'is-crowned');
    board.render(after);
  }

  return { playMove };
}
