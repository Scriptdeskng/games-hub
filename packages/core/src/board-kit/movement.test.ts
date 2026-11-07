import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScope } from '../lifecycle';
import { createMover, trackSteps, type PathStep } from './movement';

interface FakeAnim {
  onfinish: (() => void) | null;
  cancel: ReturnType<typeof vi.fn>;
  frames: Keyframe[];
}

function fakeEl(): { el: HTMLElement; anims: FakeAnim[] } {
  const el = document.createElement('div');
  const anims: FakeAnim[] = [];
  (el as unknown as { animate: unknown }).animate = (frames: Keyframe[]) => {
    const a: FakeAnim = { onfinish: null, cancel: vi.fn(), frames };
    anims.push(a);
    return a;
  };
  return { el, anims };
}

const steps: PathStep[] = [
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 2, y: 3, kind: 'slide' },
];

afterEach(() => vi.restoreAllMocks());

describe('mover (animated)', () => {
  it('hops square by square, slides for ladders, reports each landing, then resolves', async () => {
    const { el, anims } = fakeEl();
    const scope = createScope();
    const m = createMover(el, { scope });
    const landed: number[] = [];
    let done = false;
    const p = m.run(steps, { onStep: (i) => landed.push(i) }).then(() => (done = true));
    expect(m.busy).toBe(true);
    expect(anims).toHaveLength(1);
    expect(anims[0]!.frames).toHaveLength(3); // from, lifted middle, to
    anims[0]!.onfinish!();
    expect(el.style.transform).toBe('translate3d(1px,0px,0)');
    expect(anims).toHaveLength(2);
    anims[1]!.onfinish!();
    expect(anims[2]!.frames).toHaveLength(2); // slide: from, to
    anims[2]!.onfinish!();
    await p;
    expect(done).toBe(true);
    expect(landed).toEqual([0, 1, 2]);
    expect(m.busy).toBe(false);
    expect(m.position).toEqual({ x: 2, y: 3 });
    expect(el.style.transform).toBe('translate3d(2px,3px,0)');
    scope.destroy();
  });

  it('uses a custom transform format (percent units)', () => {
    const { el } = fakeEl();
    const m = createMover(el, {
      scope: createScope(),
      format: (x, y) => `translate(${x * 100}%,${y * 100}%)`,
    });
    m.place({ x: 3, y: 1 });
    expect(el.style.transform).toBe('translate(300%,100%)');
  });

  it('finish() jumps to the end and resolves', async () => {
    const { el, anims } = fakeEl();
    const m = createMover(el, { scope: createScope() });
    const p = m.run(steps);
    m.finish();
    await p;
    expect(anims[0]!.cancel).toHaveBeenCalled();
    expect(m.position).toEqual({ x: 2, y: 3 });
    expect(m.busy).toBe(false);
    m.finish(); // nothing running: harmless
  });

  it('destroying the scope cancels the animation and resolves the promise', async () => {
    const { el, anims } = fakeEl();
    const scope = createScope();
    const m = createMover(el, { scope });
    const p = m.run(steps);
    scope.destroy();
    await p;
    expect(anims[0]!.cancel).toHaveBeenCalled();
    expect(m.busy).toBe(false);
  });

  it('a new run or place replaces the old one', async () => {
    const { el, anims } = fakeEl();
    const m = createMover(el, { scope: createScope() });
    const first = m.run(steps);
    const second = m.run([{ x: 9, y: 9 }]);
    await first;
    anims[1]!.onfinish!();
    await second;
    expect(m.position).toEqual({ x: 9, y: 9 });
    const third = m.run(steps);
    m.place({ x: 0, y: 0 });
    await third;
    expect(m.position).toEqual({ x: 0, y: 0 });
    await m.run([]);
  });
});

describe('mover (no animation)', () => {
  it('reduced motion lands every step immediately', async () => {
    const { el, anims } = fakeEl();
    const m = createMover(el, { scope: createScope(), reducedMotion: () => true });
    const landed: number[] = [];
    await m.run(steps, { onStep: (i) => landed.push(i) });
    expect(anims).toHaveLength(0);
    expect(landed).toEqual([0, 1, 2]);
    expect(m.position).toEqual({ x: 2, y: 3 });
  });

  it('works where the Web Animations API is missing', async () => {
    const el = document.createElement('div');
    const m = createMover(el, { scope: createScope() });
    await m.run(steps);
    expect(el.style.transform).toBe('translate3d(2px,3px,0)');
  });
});

describe('trackSteps', () => {
  const cell = (n: number): { x: number; y: number } => ({ x: n, y: 0 });
  it('walks forward and backward one square at a time', () => {
    expect(trackSteps(3, 6, cell).map((s) => s.x)).toEqual([4, 5, 6]);
    expect(trackSteps(6, 4, cell).map((s) => s.x)).toEqual([5, 4]);
    expect(trackSteps(5, 5, cell)).toEqual([]);
    expect(trackSteps(0, 1, cell, 'slide')[0]!.kind).toBe('slide');
  });
});
