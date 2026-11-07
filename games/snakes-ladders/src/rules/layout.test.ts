import { describe, expect, it } from 'vitest';
import { LayoutError, type BoardLayout } from './config';
import { DEFAULT_LAYOUT, LAYOUT_DATA, jumpMap, loadLayout, validateLayout } from './layout';

const ok = (): BoardLayout => ({
  size: 10,
  ladders: [
    { id: 'l1', from: 4, to: 14 },
    { id: 'l2', from: 30, to: 80 },
  ],
  snakes: [{ id: 's1', from: 50, to: 20 }],
});

const withProblem = (patch: Partial<BoardLayout>): string[] =>
  validateLayout({ ...ok(), ...patch });

describe('shipped layout', () => {
  it('has no problems: no chains, no overlaps, every start reachable', () => {
    expect(validateLayout(DEFAULT_LAYOUT)).toEqual([]);
    expect(DEFAULT_LAYOUT.size).toBe(10);
  });

  it('has a sensible mix of ladders and snakes and survives a JSON round trip', () => {
    expect(DEFAULT_LAYOUT.ladders.length).toBeGreaterThanOrEqual(6);
    expect(DEFAULT_LAYOUT.snakes.length).toBeGreaterThanOrEqual(6);
    expect(loadLayout(JSON.parse(JSON.stringify(LAYOUT_DATA)))).toEqual(DEFAULT_LAYOUT);
  });

  it('every ladder goes up and every snake goes down, nothing starts on 1 or 100', () => {
    for (const l of DEFAULT_LAYOUT.ladders) expect(l.to).toBeGreaterThan(l.from);
    for (const s of DEFAULT_LAYOUT.snakes) expect(s.to).toBeLessThan(s.from);
    const starts = [...DEFAULT_LAYOUT.ladders, ...DEFAULT_LAYOUT.snakes].map((j) => j.from);
    expect(new Set(starts).size).toBe(starts.length);
    expect(starts).not.toContain(1);
    expect(starts).not.toContain(100);
  });

  it('no end square is also a start square (chain avoidance)', () => {
    const jumps = [...DEFAULT_LAYOUT.ladders, ...DEFAULT_LAYOUT.snakes];
    const starts = new Set(jumps.map((j) => j.from));
    for (const j of jumps) expect(starts.has(j.to)).toBe(false);
  });

  it('jumpMap indexes by start square with the kind', () => {
    const m = jumpMap(DEFAULT_LAYOUT);
    expect(m.size).toBe(DEFAULT_LAYOUT.ladders.length + DEFAULT_LAYOUT.snakes.length);
    for (const l of DEFAULT_LAYOUT.ladders) expect(m.get(l.from)?.kind).toBe('ladder');
    for (const s of DEFAULT_LAYOUT.snakes) expect(m.get(s.from)?.kind).toBe('snake');
  });
});

describe('layout validation', () => {
  it('accepts a small valid table', () => {
    expect(validateLayout(ok())).toEqual([]);
  });

  it('rejects direction mistakes', () => {
    expect(
      withProblem({ ladders: [{ id: 'l1', from: 14, to: 4 }, ...ok().ladders.slice(1)] }).join(),
    ).toMatch(/ladder must go up/);
    expect(withProblem({ snakes: [{ id: 's1', from: 20, to: 50 }] }).join()).toMatch(
      /snake must go down/,
    );
  });

  it('themes are optional but must be real strings', () => {
    expect(withProblem({ snakes: [{ id: 's1', from: 50, to: 20, theme: '' }] }).join()).toMatch(
      /theme/,
    );
    expect(withProblem({ snakes: [{ id: 's1', from: 50, to: 20, theme: 'goslow' }] })).toEqual([]);
    expect(
      loadLayout({
        size: 10,
        ladders: [],
        snakes: [{ id: 's1', from: 50, to: 20, theme: 'goslow' }],
      }).snakes[0]!.theme,
    ).toBe('goslow');
  });

  it('every shipped connector has a theme the art and sound know', () => {
    const themes = new Set([
      'brt',
      'okada',
      'keke',
      'bridge',
      'pothole',
      'goslow',
      'nepa',
      'tollqueue',
    ]);
    for (const j of [...DEFAULT_LAYOUT.ladders, ...DEFAULT_LAYOUT.snakes]) {
      expect(themes.has(j.theme ?? '')).toBe(true);
    }
  });

  it('rejects out of range squares and tiny jumps', () => {
    expect(withProblem({ snakes: [{ id: 's1', from: 100, to: 50 }] }).join()).toMatch(/start 100/);
    expect(withProblem({ snakes: [{ id: 's1', from: 1, to: 0 }] }).join()).toMatch(/start 1 /);
    expect(withProblem({ snakes: [{ id: 's1', from: 50, to: 0 }] }).join()).toMatch(/end 0/);
    expect(withProblem({ snakes: [{ id: 's1', from: 50, to: 49 }] }).join()).toMatch(/too short/);
    expect(withProblem({ snakes: [{ id: 's1', from: 50.5, to: 20 }] }).join()).toMatch(
      /whole numbers/,
    );
  });

  it('rejects overlapping starts and duplicate or missing ids', () => {
    expect(withProblem({ snakes: [{ id: 's1', from: 4, to: 1 }] }).join()).toMatch(/overlap/);
    expect(withProblem({ snakes: [{ id: 'l1', from: 50, to: 20 }] }).join()).toMatch(
      /duplicate id/,
    );
    expect(withProblem({ snakes: [{ id: '', from: 50, to: 20 }] }).join()).toMatch(/missing id/);
  });

  it('rejects chains: a ladder top on a snake head and a snake tail on a ladder base', () => {
    const a = withProblem({
      ladders: [{ id: 'l1', from: 4, to: 50 }],
      snakes: [{ id: 's1', from: 50, to: 20 }],
    });
    expect(a.join()).toMatch(/chain/);
    const b = withProblem({
      ladders: [{ id: 'l1', from: 4, to: 30 }],
      snakes: [{ id: 's1', from: 50, to: 4 }],
    });
    expect(b.join()).toMatch(/chain/);
  });

  it('rejects absurd sizes', () => {
    expect(validateLayout({ size: 2, ladders: [], snakes: [] }).join()).toMatch(/size/);
  });

  it('finds unreachable ladder starts and a board that can never be finished', () => {
    // six snake heads in a row make a wall that nothing can cross
    const wall: BoardLayout = {
      size: 10,
      ladders: [{ id: 'l1', from: 60, to: 90 }],
      snakes: [10, 11, 12, 13, 14, 15].map((from, i) => ({ id: `w${i}`, from, to: from - 8 })),
    };
    const problems = validateLayout(wall);
    expect(problems.join()).toMatch(/start 60 is unreachable/);
    expect(problems.join()).toMatch(/square 100 is unreachable/);
  });

  it('finds squares a player could get stuck on', () => {
    // a ladder drops pawns into a pocket whose exit is a wall of six snake heads;
    // a second ladder bypasses the wall so the board is finishable for some pawns
    const pocket: BoardLayout = {
      size: 10,
      ladders: [
        { id: 'in', from: 10, to: 60 },
        { id: 'bypass', from: 30, to: 80 },
      ],
      snakes: [66, 67, 68, 69, 70, 71].map((from, i) => ({ id: `p${i}`, from, to: 58 + i })),
    };
    expect(validateLayout(pocket).join()).toMatch(/could never finish/);
  });

  it('loadLayout throws a LayoutError that lists every problem', () => {
    try {
      loadLayout({ size: 10, ladders: [{ id: 'x', from: 20, to: 10 }], snakes: 'nope' });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(LayoutError);
      expect((e as LayoutError).problems.join()).toMatch(/ladder must go up/);
      expect((e as Error).message).toMatch(/invalid board layout/);
    }
    expect(() => loadLayout(null)).toThrow(LayoutError);
    expect(() => loadLayout({ size: 10, ladders: [null], snakes: [] })).toThrow(LayoutError);
  });
});
