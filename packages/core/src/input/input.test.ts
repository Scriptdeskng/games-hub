import { describe, expect, it, vi } from 'vitest';
import { leakCounters } from '../lifecycle';
import { classifyGesture, createInput } from './index';

const o = { tapSlop: 12, tapMaxMs: 500, swipeMin: 36 };

describe('classifyGesture', () => {
  it('detects taps, swipes in four directions, and neither', () => {
    expect(classifyGesture(3, 4, 100, o).kind).toBe('tap');
    expect(classifyGesture(60, 5, 100, o)).toMatchObject({ kind: 'swipe', dir: 'right' });
    expect(classifyGesture(-60, 5, 100, o)).toMatchObject({ kind: 'swipe', dir: 'left' });
    expect(classifyGesture(5, 60, 100, o)).toMatchObject({ kind: 'swipe', dir: 'down' });
    expect(classifyGesture(5, -60, 100, o)).toMatchObject({ kind: 'swipe', dir: 'up' });
    expect(classifyGesture(3, 4, 900, o).kind).toBe('none'); // long press
    expect(classifyGesture(20, 0, 100, o).kind).toBe('none'); // drifted but not a swipe
  });
});

const ptr = (el: Element, type: string, x: number, y: number, id = 1): void => {
  const e = new Event(type, { bubbles: true }) as Event & Record<string, number>;
  Object.assign(e, { clientX: x, clientY: y, pointerId: id });
  el.dispatchEvent(e);
};

describe('createInput', () => {
  it('fires tap, swipe and keyboard handlers, then cleans up', () => {
    const base = leakCounters();
    const el = document.createElement('div');
    const onTap = vi.fn();
    const onSwipe = vi.fn();
    const space = vi.fn();
    const input = createInput(el, { onTap, onSwipe, keys: { ' ': space, P: space } });
    ptr(el, 'pointerdown', 10, 10);
    ptr(el, 'pointerup', 12, 11);
    expect(onTap).toHaveBeenCalledWith(12, 11, expect.anything());
    ptr(el, 'pointerdown', 10, 10);
    ptr(el, 'pointerup', 90, 12);
    expect(onSwipe).toHaveBeenCalledWith('right', expect.any(Number), expect.anything());
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', repeat: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', ctrlKey: true }));
    expect(space).toHaveBeenCalledTimes(2);
    input.destroy();
    ptr(el, 'pointerdown', 0, 0);
    ptr(el, 'pointerup', 0, 0);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(space).toHaveBeenCalledTimes(2);
    expect(leakCounters()).toEqual(base);
  });
  it('ignores pointerup without a matching down, and cancel resets', () => {
    const el = document.createElement('div');
    const onTap = vi.fn();
    const input = createInput(el, { onTap });
    ptr(el, 'pointerup', 1, 1);
    ptr(el, 'pointerdown', 1, 1, 1);
    ptr(el, 'pointercancel', 1, 1, 1);
    ptr(el, 'pointerup', 1, 1, 1);
    ptr(el, 'pointerdown', 1, 1, 1);
    ptr(el, 'pointerup', 1, 1, 2); // different pointer
    expect(onTap).not.toHaveBeenCalled();
    input.setHandlers({ onTap });
    ptr(el, 'pointerdown', 1, 1, 3);
    ptr(el, 'pointerup', 1, 1, 3);
    expect(onTap).toHaveBeenCalledTimes(1);
    input.destroy();
  });
});
