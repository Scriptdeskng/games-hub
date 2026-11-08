import { DECK, type ShapeName } from './cards';
import { createGame, type GameState, type NewGame } from './engine';
import type { Rules } from './config';
import type { Pending } from './legal';

/** Test helpers (not shipped: only the tests import this file). */
export const id = (shape: ShapeName, n: number): number => {
  const c = DECK.find((x) => x.shape === shape && x.n === n);
  if (!c) throw new Error(`no such card ${shape} ${n}`);
  return c.id;
};
/** the k-th Whot 20 (0..4) */
export const whot = (k = 0): number => DECK.filter((c) => c.shape === 'whot')[k]!.id;

export const SEATS = (cpus: number): NewGame['cpus'] =>
  [
    { id: 'c1', name: 'One', persona: 'mama-nkechi' },
    { id: 'c2', name: 'Two', persona: 'tari' },
    { id: 'c3', name: 'Three', persona: 'aisha' },
  ].slice(0, cpus);

export interface Setup {
  cpus?: number;
  rules?: Partial<Rules>;
  hands: number[][];
  /** the face-up pile, top last */
  discard: number[];
  called?: ShapeName | null;
  pending?: Pending | null;
  /** the market (top = last); default: every remaining card in deck order */
  draw?: number[];
  turn?: number;
  seed?: number;
}

/** A game in an exactly known position. */
export function position(o: Setup): GameState {
  const cpus = o.cpus ?? o.hands.length - 1;
  const base = createGame({
    seed: o.seed ?? 7,
    human: { id: 'you', name: 'You' },
    cpus: SEATS(cpus),
    rules: o.rules,
  });
  const used = new Set([...o.hands.flat(), ...o.discard]);
  const draw = o.draw ?? DECK.map((c) => c.id).filter((c) => !used.has(c));
  return {
    ...base,
    hands: o.hands.map((h) => h.slice()),
    discard: o.discard.slice(),
    draw: draw.slice(),
    called: o.called ?? null,
    pending: o.pending ?? null,
    calls: o.hands.map(() => 'none'),
    turns: { ...base.turns, index: o.turn ?? 0 },
  };
}
