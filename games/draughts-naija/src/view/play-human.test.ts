import { createScope } from '@naija/core/lifecycle';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LIGHT, parseBoard } from '../rules/board';
import { makeRules } from '../rules/config';
import { createFromBoard, legalMoves } from '../rules/engine';
import type { Move } from '../rules/movegen';
import { createBoard, type BoardView } from './board';
import { centreOf } from './geometry';
import { createHuman, type Human } from './play-human';

/** the circuit: a man on (6,3) jumps four men and lands back on (6,3) */
const rows = [
  '. . . . . . . . . .',
  '. . . . . . . . . .',
  '. . . . . . . . . .',
  '. . . . . . . . . .',
  '. . . . . . . . . .',
  '. . . . b . b . . .',
  '. . . w . . . . . .',
  '. . . . b . b . . .',
  '. . . . . . . . . .',
  '. . . . . . . . . .',
];

describe('entering a move that ends on its own start square (full interaction, jsdom)', () => {
  let scope = createScope();
  let board: BoardView;
  let human: Human;
  let moves: Move[];
  const ORIGIN = 6 * 10 + 3;
  const ev = (type: string, x: number, y: number): MouseEvent => {
    const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
    Object.defineProperty(e, 'pointerId', { value: 1 });
    Object.defineProperty(e, 'pointerType', { value: 'touch' });
    return e;
  };
  const at = (sq: number): { x: number; y: number } => {
    const m = board.metrics();
    const c = centreOf(sq, m);
    return { x: m.inset + c.x, y: m.inset + c.y };
  };
  beforeEach(() => {
    scope = createScope();
    board = createBoard({ size: 10, scope, boardLabel: 'b', label: (n) => n });
    document.body.append(board.el);
    const s = createFromBoard({ board: parseBoard(rows), turn: LIGHT, rules: makeRules(10) });
    board.render(s);
    moves = legalMoves(s);
    human = createHuman({
      board,
      scope,
      onIllegal: () => undefined,
      onSelect: () => undefined,
      onStep: () => undefined,
    });
  });
  afterEach(() => {
    human.destroy();
    board.destroy();
    scope.destroy();
  });

  it('the only legal move is the four-piece circuit back to the start', () => {
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ from: ORIGIN, to: ORIGIN });
    expect(moves[0]!.caps).toHaveLength(4);
  });
  it('tap on the auto-selected piece plays the circuit (pointer events)', async () => {
    const played = human.ask(moves, [ORIGIN]);
    expect(board.square(ORIGIN)?.classList.contains('is-select')).toBe(true);
    expect(board.square(ORIGIN)?.classList.contains('is-move')).toBe(true);
    const p = at(ORIGIN);
    board.el.dispatchEvent(ev('pointerdown', p.x, p.y));
    board.el.dispatchEvent(ev('pointerup', p.x, p.y));
    expect(await played).toEqual(moves[0]);
  });
  it('a press near the square (hit-slop) also plays it', async () => {
    const played = human.ask(moves, [ORIGIN]);
    const p = at(ORIGIN);
    board.el.dispatchEvent(ev('pointerdown', p.x + 14, p.y));
    board.el.dispatchEvent(ev('pointerup', p.x + 14, p.y));
    expect(await played).toEqual(moves[0]);
  });
  it('dragging the piece away and dropping it back on its own square plays it', async () => {
    const played = human.ask(moves, [ORIGIN]);
    const p = at(ORIGIN);
    board.el.dispatchEvent(ev('pointerdown', p.x, p.y));
    board.el.dispatchEvent(ev('pointermove', p.x + 40, p.y - 40));
    expect(board.square(ORIGIN)?.classList.contains('is-drag')).toBe(true);
    board.el.dispatchEvent(ev('pointermove', p.x + 2, p.y));
    board.el.dispatchEvent(ev('pointerup', p.x + 2, p.y));
    expect(await played).toEqual(moves[0]);
  });
  it('the keyboard (Enter on the square) plays it too', async () => {
    const played = human.ask(moves, [ORIGIN]);
    board.square(ORIGIN)!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    expect(await played).toEqual(moves[0]);
  });
});
