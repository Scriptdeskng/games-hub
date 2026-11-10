import { describe, expect, it } from 'vitest';
import { applyToCells, generateMoves, mustCapture, pieceAfter, type Move } from './movegen';
import { LIGHT, DARK, initialBoard, parseBoard, type Side } from './board';
import { makeRules, type Rules } from './config';

const R10 = makeRules(10);
const R8 = makeRules(8); // majority on, one-step kings
const R8_FLY = makeRules(8, { maxCapture: true, flyingKingsShort: true, cpuStarts: false });
const R8_FREE = makeRules(8, { maxCapture: false, flyingKingsShort: false, cpuStarts: false });
const sq = (r: number, c: number, n = 8): number => r * n + c;
const moves8 = (rows: string[], side: Side = LIGHT, rules: Rules = R8): Move[] =>
  generateMoves(parseBoard(rows), side, rules);
const key = (m: Move): string => `${m.from}>${m.to}[${m.caps.slice().sort((a, b) => a - b)}]`;

/** Number of move sequences of `depth` plies from the start (a perft count). */
function perft(board: number[], side: Side, depth: number, rules: Rules): number {
  if (depth === 0) return 1;
  const list = generateMoves(board, side, rules);
  if (depth === 1) return list.length;
  let total = 0;
  for (const m of list) {
    const b = board.slice();
    applyToCells(b, m, rules.size);
    total += perft(b, (1 - side) as Side, depth - 1, rules);
  }
  return total;
}

describe('start position', () => {
  it('10x10: 20 men each, the bottom-left square is dark, 9 opening moves', () => {
    const b = initialBoard(10);
    expect(b.filter((v) => v === 1)).toHaveLength(20);
    expect(b.filter((v) => v === -1)).toHaveLength(20);
    expect(b[sq(9, 0, 10)]).toBe(1);
    expect(b[sq(0, 1, 10)]).toBe(-1);
    expect(generateMoves(b, LIGHT, R10)).toHaveLength(9);
    expect(generateMoves(b, DARK, R10)).toHaveLength(9);
  });
  it('8x8: 12 men each, the bottom-left square is dark, 7 opening moves', () => {
    const b = initialBoard(8);
    expect(b.filter((v) => v === 1)).toHaveLength(12);
    expect(b.filter((v) => v === -1)).toHaveLength(12);
    expect(b[sq(7, 0)]).toBe(1);
    expect(generateMoves(b, LIGHT, R8)).toHaveLength(7);
  });
});

describe('perft (known move counts from the start position)', () => {
  it('10x10 international: 9, 81, 658, 4265, 27117', () => {
    const b = initialBoard(10);
    expect([1, 2, 3, 4, 5].map((d) => perft(b, LIGHT, d, R10))).toEqual([9, 81, 658, 4265, 27117]);
  });
  it('8x8, men capture backwards (Russian/Brazilian count): 7, 49, 302, 1469, 7473', () => {
    // 7361 is the English-checkers value at depth 5 (men capture forwards only). With backward
    // capture and the majority rule the count is 7473; without the majority rule it is 7482.
    const b = initialBoard(8);
    expect([1, 2, 3, 4, 5].map((d) => perft(b, LIGHT, d, R8))).toEqual([7, 49, 302, 1469, 7473]);
    expect(perft(b, LIGHT, 5, R8_FREE)).toBe(7482); // no majority rule (Russian count)
  });
  it('flying kings change nothing in the opening (no king exists yet)', () => {
    const b = initialBoard(8);
    expect(perft(b, LIGHT, 4, R8_FLY)).toBe(perft(b, LIGHT, 4, R8));
  });
});

describe('mandatory capture and men capturing backwards', () => {
  const rows = [
    '. . . . . . . .',
    '. . . . . . . .',
    '. . . . . . . .',
    '. . . . . . . .',
    '. . . w . . . .',
    '. . . . b . . .',
    '. . . . . . . .',
    'w . . . . . . .',
  ];
  it('a man must take backwards, and quiet moves of other pieces are not offered', () => {
    const list = moves8(rows);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ from: sq(4, 3), to: sq(6, 5), caps: [sq(5, 4)] });
    expect(mustCapture(parseBoard(rows), LIGHT, R8)).toBe(true);
    expect(mustCapture(parseBoard(rows), DARK, R8)).toBe(true); // the dark man can also take backwards
  });
  it('without a capture the same pieces just move', () => {
    const quiet = rows.map((r) => r.replace('b', '.'));
    const list = moves8(quiet);
    expect(list.every((m) => m.caps.length === 0)).toBe(true);
    expect(mustCapture(parseBoard(quiet), LIGHT, R8)).toBe(false);
  });
  it('men move forward only: light up, dark down', () => {
    const b = parseBoard([
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . w . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
    ]);
    expect(
      generateMoves(b, LIGHT, R8)
        .map((m) => m.to)
        .sort(),
    ).toEqual([sq(3, 2), sq(3, 4)]);
    const d = parseBoard([
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . b . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
    ]);
    expect(
      generateMoves(d, DARK, R8)
        .map((m) => m.to)
        .sort(),
    ).toEqual([sq(4, 1), sq(4, 3)]);
  });
  it('a man at the edge or a blocked man has no move', () => {
    const b = parseBoard([
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . b . . . . .',
      '. b . . . . . .',
      'w . . . . . . .',
    ]);
    expect(generateMoves(b, LIGHT, R8)).toEqual([]);
  });
});

describe('maximum capture (majority rule)', () => {
  const rows = [
    '. . . . . . . .',
    '. . . . . . . .',
    '. . . . . . . .',
    '. . b . . . . .',
    '. . . . . . . .',
    '. . b . . . b .',
    '. w . . . . . w',
    '. . . . . . . .',
  ];
  it('must take the two-piece sequence, not the one-piece capture', () => {
    const list = moves8(rows);
    expect(list.map(key)).toEqual([`${sq(6, 1)}>${sq(2, 1)}[${[sq(3, 2), sq(5, 2)]}]`]);
  });
  it('the 8x8 toggle off allows the shorter capture too', () => {
    const list = moves8(rows, LIGHT, R8_FREE);
    expect(list).toHaveLength(2);
    expect(list.map((m) => m.caps.length).sort()).toEqual([1, 2]);
  });
  it('10x10 always applies it, whatever the toggle says', () => {
    expect(
      makeRules(10, { maxCapture: false, flyingKingsShort: false, cpuStarts: false }).maxCapture,
    ).toBe(true);
  });
  it('men and kings count as one piece each in the majority rule', () => {
    const c = parseBoard([
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . B . . . b .',
      '. w . . . w . .',
      '. . . . . . . .',
    ]);
    // w(6,1) takes the king (5,2); w(6,5) takes the man (5,6): one piece each, so both are legal
    expect(generateMoves(c, LIGHT, R8)).toHaveLength(2);
  });
});

describe('flying kings', () => {
  const open = [
    '. . . . . . . .',
    '. . . . . . . .',
    '. . . . . . . .',
    '. . . . . . . .',
    '. . . b . . . .',
    '. . . . . . . .',
    '. . . . . . . .',
    'W . . . . . . .',
  ];
  it('capture from a distance and may land on any free square beyond', () => {
    const list = moves8(open, LIGHT, R8_FLY);
    expect(list.map((m) => m.to).sort((a, b) => a - b)).toEqual([
      sq(0, 7),
      sq(1, 6),
      sq(2, 5),
      sq(3, 4),
    ]);
    expect(list.every((m) => m.caps.length === 1 && m.caps[0] === sq(4, 3))).toBe(true);
  });
  it('one-step kings (8x8 default) cannot capture from a distance', () => {
    expect(moves8(open, LIGHT, R8).every((m) => m.caps.length === 0)).toBe(true);
  });
  it('one-step kings step once in every direction and capture like a man', () => {
    const b = parseBoard([
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . W . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
    ]);
    expect(generateMoves(b, LIGHT, R8)).toHaveLength(4);
    const c = parseBoard([
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . W . . . .',
      '. . . . b . . .',
      '. . . . . . . .',
      '. . . . . . . .',
    ]);
    expect(generateMoves(c, LIGHT, R8).map(key)).toEqual([`${sq(4, 3)}>${sq(6, 5)}[${sq(5, 4)}]`]);
  });
  it('a flying king slides any distance on 10x10', () => {
    const b = parseBoard([
      '. . . . . . . . . .',
      '. . . . . . . . . .',
      '. . . . . . . . . .',
      '. . . . . . . . . .',
      '. . . . . . . . . .',
      '. . . . . . . . . .',
      '. . . . . . . . . .',
      '. . . . . . . . . .',
      '. . . . . . . . . .',
      'W . . . . . . . . .',
    ]);
    expect(generateMoves(b, LIGHT, R10)).toHaveLength(9);
  });
  it('must land where it can keep capturing, even with the majority rule off', () => {
    const rows = [
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . b . . . .',
      '. . . . . . . .',
      '. . . b . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      'W . . . . . . .',
    ];
    // W(7,0) takes (4,3); from (3,4) it can also take (2,3) and land on (1,2) or (0,1)
    const free = makeRules(8, { maxCapture: false, flyingKingsShort: true, cpuStarts: false });
    for (const rules of [R8_FLY, free]) {
      const list = moves8(rows, LIGHT, rules);
      expect(list.map((m) => m.to).sort((a, b) => a - b)).toEqual([sq(0, 1), sq(1, 2)]);
      expect(list.every((m) => m.caps.length === 2)).toBe(true);
    }
  });
});

describe('crowning', () => {
  it('a man that reaches the back row mid-capture and can continue is not crowned', () => {
    const b = parseBoard([
      '. . . . . . . .',
      '. . b . b . . .',
      '. w . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
    ]);
    const [m] = generateMoves(b, LIGHT, R8);
    expect(m).toMatchObject({ from: sq(2, 1), to: sq(2, 5), caps: [sq(1, 2), sq(1, 4)] });
    expect(m!.path).toEqual([sq(0, 3), sq(2, 5)]);
    const after = b.slice();
    expect(applyToCells(after, m!, 8)).toBe(false);
    expect(after[sq(2, 5)]).toBe(1);
    expect(pieceAfter(1, m!, 8)).toBe(1);
  });
  it('a man that ends its move on the back row is crowned', () => {
    const b = parseBoard([
      '. . . . . . . .',
      '. . b . . . . .',
      '. w . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
    ]);
    const [m] = generateMoves(b, LIGHT, R8);
    const after = b.slice();
    expect(applyToCells(after, m!, 8)).toBe(true);
    expect(after[sq(0, 3)]).toBe(2);
    expect(after[sq(1, 2)]).toBe(0);
  });
  it('a plain step onto the back row crowns, for dark at the bottom', () => {
    const b = parseBoard([
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. b . . . . . .',
      '. . . . . . . .',
    ]);
    const [m] = generateMoves(b, DARK, R8);
    const after = b.slice();
    expect(applyToCells(after, m!, 8)).toBe(true);
    expect(after[m!.to]).toBe(-2);
  });
});

describe('capture details', () => {
  it('captured pieces stay until the end: a four-piece circuit lands back on the start square (one move)', () => {
    const b = parseBoard([
      '. . . . . . . .',
      '. . . . . . . .',
      '. b . b . . . .',
      '. . . . . . . .',
      '. b . b . . . .',
      '. . w . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
    ]);
    // (2,1) (2,3) (4,1) (4,3) are dark men; the man on (5,2) loops over all four and returns
    const list = generateMoves(b, LIGHT, R8);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ from: sq(5, 2), to: sq(5, 2) });
    expect(new Set(list[0]!.caps).size).toBe(4);
  });
  it('a piece is never jumped twice', () => {
    const b = parseBoard([
      '. . . . . . . .',
      '. . . . . . . .',
      '. b . b . . . .',
      '. . . . . . . .',
      '. b . b . . . .',
      '. . w . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
    ]);
    for (const m of generateMoves(b, LIGHT, R8)) expect(new Set(m.caps).size).toBe(m.caps.length);
  });
  it('a piece of your own colour blocks a jump', () => {
    const b = parseBoard([
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
      '. . . . . . . .',
    ]);
    b[sq(5, 2)] = 1;
    b[sq(4, 3)] = -1;
    b[sq(3, 4)] = -1; // landing square is occupied
    expect(generateMoves(b, LIGHT, R8).every((m) => m.caps.length === 0)).toBe(true);
  });
  it('rejects a diagram with a piece on a light square', () => {
    expect(() =>
      parseBoard(['w . . . . . . .', ...Array<string>(7).fill('. . . . . . . .')]),
    ).toThrow();
  });
});
