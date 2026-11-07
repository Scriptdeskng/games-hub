import type { Flow } from '@naija/core/board-kit';
import type { Move } from '../rules/engine';
import type { BoardView } from './board';

export interface ChooserOptions {
  board: BoardView;
  flow: Flow;
  /** true while the game is over (keys do nothing) */
  over(): boolean;
  /** sound when a seed is picked */
  onPick(): void;
}

export interface AskOptions {
  moves: readonly Move[];
  /** the die value, shown as the step count of every glowing seed */
  roll: number;
  /** move a lone legal seed after a short highlight, without a tap (setting) */
  auto: boolean;
  /** called once, when the lone seed is highlighted (status text) */
  onAuto(): void;
  /** called when the human has to choose (status text, idle banter timer) */
  onChoose(): () => void;
  /** pause helper for the highlight (`flow.sleep`) */
  sleep(ms: number): Promise<void>;
}

/**
 * The human's seed choice: tap a glowing seed, press its number (1 to 4), or move the selection
 * with the arrow keys and confirm with Space or Enter. One instance per game; the key handlers
 * are plain functions the play screen puts in its keyboard map.
 */
export interface Chooser {
  ask(o: AskOptions): Promise<number>;
  /** true while a choice is open (Space / Enter confirm it instead of rolling) */
  readonly waiting: boolean;
  confirm(): void;
  cycle(dir: number): void;
  pickNumber(n: number): void;
}

export function createChooser(o: ChooserOptions): Chooser {
  let waiter: ((seed: number) => void) | null = null;
  let choices: readonly Move[] = [];
  let selected: number | null = null;

  const select = (seed: number | null): void => {
    selected = seed;
    o.board.setSelected(seed);
  };

  return {
    get waiting() {
      return waiter !== null;
    },
    async ask(a) {
      o.board.setMovable(
        a.moves.map((m) => ({ seed: m.seed, to: m.to, steps: a.roll })),
        (seed) => {
          o.onPick();
          waiter?.(seed);
        },
      );
      choices = a.moves;
      try {
        if (a.moves.length === 1 && a.auto) {
          select((a.moves[0] as Move).seed);
          a.onAuto();
          await a.sleep(450);
          return (a.moves[0] as Move).seed;
        }
        const stopIdle = a.onChoose();
        try {
          return await o.flow.alive(new Promise<number>((r) => (waiter = r)));
        } finally {
          stopIdle();
        }
      } finally {
        waiter = null;
        choices = [];
        select(null);
        o.board.setMovable(null);
      }
    },
    confirm() {
      if (!waiter) return;
      if (selected !== null) waiter(selected);
      else if (choices.length === 1) waiter((choices[0] as Move).seed);
      else select((choices[0] as Move).seed);
    },
    cycle(dir) {
      if (!waiter || !choices.length) return;
      const at = choices.findIndex((m) => m.seed === selected);
      select((choices[(at + dir + choices.length * 2) % choices.length] as Move).seed);
    },
    pickNumber(n) {
      const m = choices.find((x) => x.seed === n - 1);
      if (waiter && m) waiter(m.seed);
    },
  };
}
