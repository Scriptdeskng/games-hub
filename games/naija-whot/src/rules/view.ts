import type { GameState, LogEntry } from './engine';
import type { CallLevel, PlayContext } from './legal';

/**
 * Everything a seated player may know: its own hand, the face-up pile, how many cards the market
 * and every hand hold, who has announced, and the public history. It deliberately has NO other
 * hand and NO market order. The AI only ever receives this type, so it cannot read hidden state.
 */
export interface PublicView extends PlayContext {
  seat: number;
  seats: number;
  hand: readonly number[];
  /** cards in every seat's hand (index = seat) */
  sizes: readonly number[];
  drawCount: number;
  calls: readonly CallLevel[];
  log: readonly LogEntry[];
  /** completed turns so far */
  turn: number;
}

export function viewFor(s: GameState, seat: number): PublicView {
  return {
    seat,
    seats: s.turns.seats.length,
    hand: (s.hands[seat] as number[]).slice(),
    sizes: s.hands.map((h) => h.length),
    drawCount: s.draw.length,
    calls: s.calls.slice(),
    log: s.log.slice(),
    turn: s.turns.turn,
    rules: s.rules,
    discard: s.discard.slice(),
    called: s.called,
    pending: s.pending,
  };
}
