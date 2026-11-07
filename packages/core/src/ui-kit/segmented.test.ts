import { describe, expect, it, vi } from 'vitest';
import { leakCounters } from '../lifecycle';
import { createSegmented } from './segmented';

const t = (k: string): string => k;

describe('segmented control', () => {
  const opts = [
    { value: 1, label: 'One', pips: 1 },
    { value: 2, label: 'Two', pips: 2 },
    { value: 3, label: 'Three' },
  ];

  it('renders native radios with the current value checked and an accessible group name', () => {
    const seg = createSegmented(
      { t },
      { label: 'Opponents', options: opts, value: 2, onChange: vi.fn() },
    );
    const radios = seg.el.querySelectorAll<HTMLInputElement>('input[type=radio]');
    expect(radios).toHaveLength(3);
    expect([...radios].map((r) => r.checked)).toEqual([false, true, false]);
    expect(seg.el.querySelector('[role=radiogroup]')?.getAttribute('aria-label')).toBe('Opponents');
    expect(seg.el.querySelectorAll('.ng-pips')).toHaveLength(2);
    expect(new Set([...radios].map((r) => r.name)).size).toBe(1);
    expect(seg.value).toBe(2);
    seg.destroy();
  });

  it('reports a change once, plays the select sound and keeps the typed value', () => {
    const onChange = vi.fn();
    const play = vi.fn();
    const seg = createSegmented(
      { t, audio: { playSfx: play } },
      { label: 'x', options: opts, value: 1, onChange },
    );
    const radios = seg.el.querySelectorAll<HTMLInputElement>('input');
    radios[2]!.checked = true;
    radios[2]!.dispatchEvent(new Event('change'));
    radios[2]!.dispatchEvent(new Event('change')); // same value again: ignored
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(3);
    expect(play).toHaveBeenCalledWith('select');
    expect(seg.value).toBe(3);
    // an unchecked radio firing change is ignored
    radios[0]!.checked = false;
    radios[0]!.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledTimes(1);
    seg.destroy();
  });

  it('set() updates the checked radio without calling onChange; destroy removes listeners', () => {
    const before = leakCounters().listeners;
    const onChange = vi.fn();
    const seg = createSegmented({ t }, { label: 'x', options: opts, value: 1, onChange });
    expect(leakCounters().listeners).toBe(before + 3);
    seg.set(3);
    expect([...seg.el.querySelectorAll<HTMLInputElement>('input')].map((r) => r.checked)).toEqual([
      false,
      false,
      true,
    ]);
    expect(onChange).not.toHaveBeenCalled();
    expect(seg.value).toBe(3);
    seg.destroy();
    expect(leakCounters().listeners).toBe(before);
  });

  it('works with string values', () => {
    const seg = createSegmented(
      { t },
      {
        label: 'x',
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
        value: 'a',
        onChange: vi.fn(),
      },
    );
    expect(seg.value).toBe('a');
    seg.destroy();
  });
});
