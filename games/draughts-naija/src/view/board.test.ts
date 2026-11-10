import { createScope } from '@naija/core/lifecycle';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRules } from '../rules/config';
import { applyMove, createGame, legalMoves } from '../rules/engine';
import { createBoard, type BoardView } from './board';

describe('board view (DOM)', () => {
  let scope = createScope();
  let board: BoardView;
  const make = (size: 10 | 8 = 10): BoardView =>
    createBoard({ size, scope, boardLabel: 'Board', label: (n, v) => `${n}:${v}` });
  beforeEach(() => {
    vi.useFakeTimers();
    scope = createScope();
    board = make();
    document.body.append(board.el);
  });
  afterEach(() => {
    board.destroy();
    scope.destroy();
    vi.useRealTimers();
  });

  it('draws only the dark squares, as buttons placed by row and column', () => {
    expect(board.el.querySelectorAll('button.dn-sq')).toHaveLength(50);
    expect(make(8).el.querySelectorAll('button.dn-sq')).toHaveLength(32);
    const bl = board.square(90) as HTMLButtonElement; // bottom-left
    expect(bl.style.gridRow).toBe('10');
    expect(bl.style.gridColumn).toBe('1');
    expect(bl.dataset.r).toBe('9');
    expect(board.square(0)).toBeUndefined(); // (0,0) is a light square
    expect(board.el.dataset.n).toBe('10');
  });
  it('renders the start position and follows the engine, with labels', () => {
    const s = createGame({ seed: 1, rules: makeRules(10) });
    board.render(s);
    expect(board.el.querySelectorAll('.dn-piece--light')).toHaveLength(20);
    expect(board.el.querySelectorAll('.dn-piece--dark')).toHaveLength(20);
    expect(board.square(90)?.getAttribute('aria-label')).toBe('a1:1');
    const m = legalMoves(s)[0]!;
    const next = applyMove(s, m);
    board.render(next);
    expect(board.pieceAt(m.to)).toBeDefined();
    expect(board.pieceAt(m.from)).toBeUndefined();
    expect(board.el.querySelectorAll('.dn-piece')).toHaveLength(40);
  });
  it('marks exactly the squares asked for and clears the rest', () => {
    board.setMarks('move', [61, 63]);
    expect(board.el.querySelectorAll('.is-move')).toHaveLength(2);
    board.setMarks('move', [63]);
    expect(board.square(61)?.classList.contains('is-move')).toBe(false);
    expect(board.square(63)?.classList.contains('is-move')).toBe(true);
    board.setMarks('move', []);
    expect(board.el.querySelectorAll('.is-move')).toHaveLength(0);
  });
  it('shows a capture path: legs, numbered stones, jumped pieces and a chain badge; then clears it', () => {
    const m = { from: 90, to: 50, path: [72, 50], caps: [81, 61] };
    board.showPath(m);
    expect(board.el.querySelectorAll('.dn-leg')).toHaveLength(2);
    expect(board.square(72)?.querySelector('.dn-step')?.textContent).toBe('1');
    expect(board.square(50)?.querySelector('.dn-step')?.textContent).toBe('2');
    expect(board.el.querySelectorAll('.is-path')).toHaveLength(2);
    expect(board.el.querySelectorAll('.is-jumped')).toHaveLength(2);
    expect(board.el.querySelector('.dn-chain')?.textContent).toBe('x2');
    board.showPath(m, 1); // part of the way: no badge yet
    expect(board.el.querySelectorAll('.dn-leg')).toHaveLength(1);
    expect(board.el.querySelector('.dn-chain')).toBeNull();
    board.showPath(null);
    expect(
      board.el.querySelectorAll('.dn-leg,.dn-step,.is-path,.is-jumped,.dn-chain'),
    ).toHaveLength(0);
  });
  it('numbered stones for choosing a path', () => {
    board.showStones([
      { sq: 61, n: 2 },
      { sq: 63, n: 2 },
    ]);
    expect(board.el.querySelectorAll('.dn-step')).toHaveLength(2);
    board.showStones([]);
    expect(board.el.querySelectorAll('.dn-step')).toHaveLength(0);
  });
  it('marks pieces that must capture', () => {
    board.render(createGame({ seed: 1, rules: makeRules(10) }));
    board.setMust([90, 92]);
    expect(board.el.querySelectorAll('.dn-piece.is-must')).toHaveLength(2);
    board.setMust([]);
    expect(board.el.querySelectorAll('.is-must')).toHaveLength(0);
  });
  it('slides, takes and crowns pieces, and render() repairs whatever the movie left', () => {
    const s = createGame({ seed: 1, rules: makeRules(10) });
    board.render(s);
    const from = 61; // row 6 col 1
    board.slide(from, 50);
    expect(board.pieceAt(50)?.classList.contains('is-sliding')).toBe(true);
    expect(board.pieceAt(50)?.style.getPropertyValue('--dx')).toMatch(/px$/);
    board.take(30);
    expect(board.el.querySelectorAll('.is-taken')).toHaveLength(1);
    expect(board.el.querySelectorAll('.dn-fx--ring')).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(board.el.querySelectorAll('.is-taken')).toHaveLength(0);
    expect(board.el.querySelectorAll('.dn-fx')).toHaveLength(0);
    board.crown(50);
    expect(board.pieceAt(50)?.classList.contains('dn-piece--king')).toBe(true);
    board.render(s);
    expect(board.el.querySelectorAll('.dn-piece')).toHaveLength(40);
    expect(board.el.querySelectorAll('.dn-piece--king')).toHaveLength(0);
  });
  it('limits the effects on screen and cleans them up by timer even when no animationend arrives', () => {
    for (let i = 0; i < 10; i++) board.fx('ribbons', 61);
    expect(board.el.querySelectorAll('.dn-fx').length).toBeLessThanOrEqual(6);
    vi.advanceTimersByTime(1000);
    expect(board.el.querySelectorAll('.dn-fx')).toHaveLength(0);
  });
  it('drags a piece with a transform and puts it back', () => {
    board.render(createGame({ seed: 1, rules: makeRules(10) }));
    board.drag(61, 10, -5);
    expect(board.square(61)?.classList.contains('is-drag')).toBe(true);
    expect(board.pieceAt(61)?.style.transform).toContain('translate(10.0px,-5.0px)');
    board.drop(61);
    expect(board.pieceAt(61)?.style.transform).toBe('');
  });
  it('keeps one roving tab stop', () => {
    board.setCursor(90);
    board.setCursor(61);
    const stops = [...board.el.querySelectorAll('.dn-sq')].filter(
      (b) => b.getAttribute('tabindex') === '0',
    );
    expect(stops).toHaveLength(1);
    expect(board.cursor).toBe(61);
  });
  it('shakes an illegal square and removes the shake', () => {
    board.shake(61);
    expect(board.square(61)?.classList.contains('is-illegal')).toBe(true);
    vi.advanceTimersByTime(400);
    expect(board.square(61)?.classList.contains('is-illegal')).toBe(false);
  });
});
