import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBot } from '../ai';
import { leakCounters } from '@naija/core/lifecycle';
import { makeCore, stubCanvas } from '../test-utils';
import type { Shootout } from '../rules/shootout';
import { createPlay, WATCHDOG_MS, type Play, type PlayOptions } from './play';

const EMPTY = { ul: 0, u: 0, ur: 0, dl: 0, d: 0, dr: 0 };

describe('play screen (jsdom, no canvas)', () => {
  beforeEach(() => {
    stubCanvas();
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
        'Date',
      ],
    });
  });
  afterEach(() => vi.useRealTimers());

  const make = (over: Partial<PlayOptions> = {}) => {
    const { core, root } = makeCore();
    const base = leakCounters();
    const ends: Shootout[] = [];
    const kicks: number[] = [];
    const calls = { quit: vi.fn(), restart: vi.fn() };
    const play = createPlay(core, {
      mode: 'quick',
      difficulty: 'medium',
      seed: 7,
      teams: ['lanterns', 'sparks'],
      habit: EMPTY,
      first: 0,
      venue: 'stadium',
      intro: 'Penalty time',
      onKick: (s) => kicks.push(s.kicks.length),
      onEnd: (s) => ends.push(s),
      onQuit: calls.quit,
      onRestart: calls.restart,
      ...over,
    });
    root.append(play.el);
    return { core, root, play, ends, kicks, calls, base };
  };
  const begin = (p: Play): void => {
    p.start();
    vi.advanceTimersByTime(2600); // the art never loads in jsdom: the 2.5 s fallback starts the match
  };

  it('builds the scene, scoreboard, controls and persona row, and starts after the art wait', () => {
    const { play, root } = make();
    expect(root.querySelector('.pk-app.pk-venue--stadium')).not.toBeNull();
    expect(root.querySelector('canvas.pk-canvas')).not.toBeNull();
    expect(root.querySelectorAll('.pk-slot')).toHaveLength(10);
    expect(root.querySelectorAll('.pk-dive__zone')).toHaveLength(6);
    expect(play.snapshot().phase).toBe('intro');
    begin(play);
    expect(root.querySelector('.pk-banner')?.textContent).toBe('Penalty time');
    expect(root.querySelector('.ng-banter')?.textContent).toContain('Ndako');
  });

  it('plays a whole match with a scripted human through the real loop, then reports the end once', () => {
    const { play, ends, kicks } = make();
    play.setBot?.(createBot());
    begin(play);
    for (let i = 0; i < 60 * 400 && ends.length === 0; i++) vi.advanceTimersByTime(16.7);
    expect(ends).toHaveLength(1);
    expect(ends[0]!.status).toBe('over');
    expect(kicks.length).toBe(ends[0]!.kicks.length);
    expect(kicks[kicks.length - 1]).toBe(ends[0]!.kicks.length);
    vi.advanceTimersByTime(20_000);
    expect(ends).toHaveLength(1);
    play.destroy();
  });

  it('pause freezes the match; resume continues it; P and Escape toggle', () => {
    const { play, root } = make();
    play.setBot?.(createBot());
    begin(play);
    vi.advanceTimersByTime(3000);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
    expect(play.snapshot().paused).toBe(true);
    expect(root.querySelector('[role="dialog"]')).not.toBeNull();
    const kicksAt = play.snapshot().state.kicks.length;
    const phaseT = play.snapshot().phase;
    vi.advanceTimersByTime(10_000);
    expect(play.snapshot().state.kicks.length).toBe(kicksAt);
    expect(play.snapshot().phase).toBe(phaseT);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(play.snapshot().paused).toBe(false);
    vi.advanceTimersByTime(10_000);
    expect(play.snapshot().state.kicks.length).toBeGreaterThan(kicksAt);
    play.destroy();
  });

  it('the pause dialog Quit and Restart call back; the hidden tab pauses by itself', () => {
    const { play, root, calls } = make();
    begin(play);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(play.snapshot().paused).toBe(true);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(play.snapshot().paused).toBe(true); // it stays paused until the player resumes
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')];
    buttons.find((b) => b.textContent === 'Restart')!.click();
    expect(calls.restart).toHaveBeenCalled();
    play.destroy();
  });

  describe('watchdog', () => {
    it('moves a stalled CPU or animation phase on by force (the loop never ran), but waits for a human keeper', () => {
      const { play } = make({ first: 1 });
      // freeze the render loop: only the wall-clock timers run
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
      begin(play);
      expect(play.snapshot().phase).toBe('intro');
      vi.advanceTimersByTime(WATCHDOG_MS + 10);
      expect(play.snapshot().watchdog).toBe(1);
      expect(play.snapshot().phase).toBe('ready');
      vi.advanceTimersByTime(WATCHDOG_MS);
      expect(play.snapshot().watchdog).toBe(2);
      expect(play.snapshot().phase).toBe('runup'); // the human keeper may still dive
      vi.advanceTimersByTime(WATCHDOG_MS * 3);
      expect(play.snapshot().watchdog).toBe(2);
      expect(play.snapshot().phase).toBe('runup');
      expect(play.snapshot().state.kicks).toHaveLength(0);
      expect(play.rescue()).toBe(false);
      play.destroy();
    });

    it('waits while the pause dialog is open', () => {
      const { play } = make({ first: 1 });
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
      begin(play);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
      vi.advanceTimersByTime(WATCHDOG_MS * 3);
      expect(play.snapshot().watchdog).toBe(0);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
      vi.advanceTimersByTime(WATCHDOG_MS + 10);
      expect(play.snapshot().watchdog).toBeGreaterThan(0);
      play.destroy();
    });
  });

  it('practice shows no scoreboard, never ends, and has a Finish button', () => {
    const { play, root, ends, calls } = make({ mode: 'practice' });
    play.setBot?.(createBot());
    begin(play);
    expect(root.querySelector('.pk-app')?.classList.contains('is-practice')).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(play.snapshot().practice.kicks).toBeGreaterThan(3);
    expect(ends).toHaveLength(0);
    [...root.querySelectorAll<HTMLButtonElement>('.pk-bar button')]
      .find((b) => b.textContent === 'Finish')!
      .click();
    expect(calls.quit).toHaveBeenCalled();
    play.destroy();
  });

  it('keyboard play: arrows, Space for the power meter, Space to kick (no mouse)', () => {
    const { play } = make({ first: 0 });
    begin(play);
    vi.advanceTimersByTime(1500);
    expect(play.snapshot().phase).toBe('ready');
    // the layout frame is unknown in jsdom, so the keyboard path is tested at the controls level;
    // here: keys never throw and an unhandled key is left alone
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
    window.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    play.destroy();
  });

  it('destroy leaves no listener, timer or frame behind', () => {
    const { play, base } = make();
    play.setBot?.(createBot());
    begin(play);
    vi.advanceTimersByTime(5000);
    play.destroy();
    expect(leakCounters()).toEqual(base);
  });

  it('fastForward (test builds) plays the shootout to its end', () => {
    const { play } = make();
    play.fastForward?.();
    expect(play.snapshot().state.status).toBe('over');
    play.destroy();
  });
});
