import { describe, expect, it } from 'vitest';
import { checkShipped, describeProblems, globToRegExp } from './ship-check';

const shipped = [
  'board/board.svg',
  'dice/die-1.svg',
  'dice/die-2.svg',
  'thumb/thumb-512x512.svg',
  'fx/unused.svg',
];
const code = 'img.src="./assets/board/board.svg";const d=`./assets/dice/die-${n}.svg`;';

describe('globToRegExp', () => {
  it('* stays inside a folder, ** crosses folders', () => {
    expect(globToRegExp('dice/*.svg').test('dice/die-1.svg')).toBe(true);
    expect(globToRegExp('dice/*.svg').test('dice/a/die-1.svg')).toBe(false);
    expect(globToRegExp('dice/**').test('dice/a/die-1.svg')).toBe(true);
    expect(globToRegExp('a.b').test('aXb')).toBe(false);
  });
});

describe('two-way ship check', () => {
  it('fails an unreferenced shipped file', () => {
    const p = checkShipped(shipped, code, { include: ['**'], dynamic: ['dice/die-*.svg'] });
    expect(p.unreferenced).toEqual(['thumb/thumb-512x512.svg', 'fx/unused.svg']);
    expect(describeProblems(p)[0]).toContain('thumb/thumb-512x512.svg');
  });
  it('literal references (plain or template-built) count, dynamic names need a pattern', () => {
    expect(checkShipped(['board/board.svg'], code, { include: [] }).unreferenced).toEqual([]);
    expect(checkShipped(['dice/die-1.svg'], code, { include: [] }).unreferenced).toEqual([
      'dice/die-1.svg',
    ]);
  });
  it('the keep list exempts catalogue assets, and a stale keep entry fails', () => {
    const ok = checkShipped(shipped, code, {
      include: ['**'],
      dynamic: ['dice/die-*.svg'],
      keep: ['thumb/*.svg', 'fx/unused.svg'],
    });
    expect(describeProblems(ok)).toEqual([]);
    const stale = checkShipped(shipped, code, {
      include: ['**'],
      dynamic: ['dice/die-*.svg'],
      keep: ['thumb/*.svg', 'fx/unused.svg', 'audio/*.mp3'],
    });
    expect(stale.staleKeep).toEqual(['audio/*.mp3']);
  });
  it('a dynamic pattern whose prefix is not in the code is stale', () => {
    const p = checkShipped(shipped, code, {
      include: ['**'],
      dynamic: ['dice/die-*.svg', 'fx/*.svg'],
      keep: ['thumb/*.svg'],
    });
    expect(p.staleDynamic).toEqual(['fx/*.svg']);
    expect(p.unreferenced).toEqual([]);
  });
});
