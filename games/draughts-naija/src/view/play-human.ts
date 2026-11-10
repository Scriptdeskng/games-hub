import type { Scope } from '@naija/core/lifecycle';
import type { Move } from '../rules/movegen';
import type { BoardView } from './board';
import { createBoardInput } from './board-input';
import {
  movable,
  preview,
  pressable,
  startEntry,
  takeable,
  tap,
  targets,
  type Entry,
} from './entry';

export interface HumanDeps {
  board: BoardView;
  scope: Scope;
  /** reaction to a press that cannot be played */
  onIllegal(reason: 'must' | 'blocked' | 'empty', sq: number): void;
  /** a piece was picked up or put down (sound) */
  onSelect(picked: boolean): void;
  /** a path with several choices needs its numbered stones tapped (hint line) */
  onStep(): void;
}

export interface Human {
  /** let the player choose one of `moves`; resolves with the move they play */
  ask(moves: readonly Move[], own: readonly number[]): Promise<Move>;
  /** stop asking (pause, destroy, the CPU's turn) and clear every mark */
  cancel(): void;
  /** deselect the piece (Escape); true if there was something to cancel */
  back(): boolean;
  /** show the suggested move (cosmetic) */
  hint(m: Move): void;
  /** press a square as if tapped (keyboard, tests) */
  press(sq: number): void;
  readonly active: boolean;
  readonly entry: Entry | null;
  destroy(): void;
}

/**
 * Drives one human move: input (tap, drag, keys with hit-slop) feeds the pure entry model in
 * entry.ts; this file draws its state on the board (selection, destinations, must-capture
 * triangles, "can be taken" crosses, the previewed path and numbered stones).
 */
export function createHuman(d: HumanDeps): Human {
  const { board } = d;
  let entry: Entry | null = null;
  let done: ((m: Move) => void) | null = null;
  let hover: number | null = null;
  let hinted = false;

  function draw(): void {
    board.setMarks('capturable', []);
    if (!entry) {
      board.setMarks('select', []);
      board.setMarks('move', []);
      board.setMust([]);
      board.showPath(null);
      return;
    }
    const mustTake = (entry.moves[0]?.caps.length ?? 0) > 0;
    board.setMust(mustTake ? movable(entry.moves) : []);
    board.setMarks('select', entry.from === null ? [] : [entry.from]);
    if (entry.at >= 0) {
      // several captures end on the same square: tap the stone where they part
      board.setMarks('move', []);
      board.showStones(targets(entry).map((sq) => ({ sq, n: (entry as Entry).at + 1 })));
    } else {
      board.setMarks('move', targets(entry));
      board.setMarks('capturable', takeable(entry));
      board.showPath(preview(entry, hover));
    }
    const first = entry.from ?? movable(entry.moves)[0];
    if (first !== undefined && board.cursor < 0) board.setCursor(first);
  }

  function press(sq: number): void {
    if (!entry || !done) return;
    if (hinted) clearHint();
    const r = tap(entry, sq);
    if (r.kind === 'play') {
      const finish = done;
      done = null;
      entry = null;
      hover = null;
      draw();
      finish(r.move);
      return;
    }
    if (r.kind === 'illegal') {
      d.onIllegal(r.reason, sq);
      board.shake(sq);
      return;
    }
    entry = r.entry;
    hover = null;
    if (r.kind === 'select') {
      d.onSelect(true);
      board.setCursor(r.entry.from as number);
    } else if (r.kind === 'deselect') d.onSelect(false);
    else d.onStep();
    draw();
  }

  function clearHint(): void {
    hinted = false;
    board.setMarks('hint', []);
  }

  const input = createBoardInput({
    board,
    scope: d.scope,
    pressable: () => (entry ? pressable(entry) : []),
    dropTargets: () => (entry ? targets(entry) : []),
    onDown(sq) {
      if (!entry) return 'none';
      if (sq === entry.from) return 'again';
      if (!movable(entry.moves).includes(sq)) return 'none';
      press(sq);
      return 'picked';
    },
    onPress: press,
    onHover(sq) {
      if (!entry || sq === hover) return;
      hover = sq;
      if (entry.at < 0) board.showPath(preview(entry, hover));
    },
  });

  return {
    ask(moves, own) {
      entry = startEntry(moves, own);
      hover = null;
      draw();
      if (entry.from !== null) d.onSelect(true);
      return new Promise<Move>((resolve) => (done = resolve));
    },
    cancel() {
      entry = null;
      done = null;
      hover = null;
      clearHint();
      draw();
    },
    back() {
      if (!entry || entry.from === null) return false;
      entry = { ...entry, from: null, cands: [], at: -1 };
      hover = null;
      d.onSelect(false);
      draw();
      return true;
    },
    hint(m) {
      hinted = true;
      board.setMarks('hint', [m.from, m.to]);
    },
    press,
    get active() {
      return entry !== null && done !== null;
    },
    get entry() {
      return entry;
    },
    destroy() {
      input.destroy();
    },
  };
}
