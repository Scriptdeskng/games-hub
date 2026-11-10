import { describe, expect, it, vi } from 'vitest';
import type { AimFrame } from '../input';
import { makeCore } from '../test-utils';
import { createControls, type Intents } from './controls';

const F: AimFrame = { spotX: 180, spotY: 510, goalCx: 180, goalGroundY: 316, upm: 24.6, gain: 1.6 };

const setup = () => {
  const { core } = makeCore();
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const calls = {
    shoot: vi.fn(),
    dive: vi.fn(),
    pause: vi.fn(),
    aimMoved: vi.fn(),
    aimLocked: vi.fn(),
    powerTick: vi.fn(),
    cancelled: vi.fn(),
  };
  const c = createControls(core, canvas, calls as Intents);
  document.body.append(c.el);
  c.setFrame(F, 360, 640);
  return { c, canvas, calls };
};

/** a pointer event with a controlled time stamp */
const ptr = (type: string, x: number, y: number, t: number, id = 1): Event => {
  // jsdom has no PointerEvent: a mouse event carrying the same fields is what the handlers read
  const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(e, 'timeStamp', { value: t });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
};
const swipe = (canvas: HTMLElement, dx: number, dy: number, ms: number, steps = 8): void => {
  canvas.dispatchEvent(ptr('pointerdown', 180, 510, 0));
  for (let i = 1; i <= steps; i++)
    canvas.dispatchEvent(
      ptr(
        i === steps ? 'pointerup' : 'pointermove',
        180 + (dx * i) / steps,
        510 + (dy * i) / steps,
        (ms * i) / steps,
      ),
    );
};

describe('striker controls (pointer)', () => {
  it("ignores swipes unless it is the striker's turn", () => {
    const { c, canvas, calls } = setup();
    c.setMode('idle');
    swipe(canvas, 0, -140, 100);
    expect(calls.shoot).not.toHaveBeenCalled();
    c.setMode('keep');
    swipe(canvas, 0, -140, 100);
    expect(calls.shoot).not.toHaveBeenCalled();
  });

  it('a good swipe shoots with aim, power and curve, and locks the aim', () => {
    const { c, canvas, calls } = setup();
    c.setMode('shoot');
    swipe(canvas, 30, -140, 100);
    expect(calls.shoot).toHaveBeenCalledTimes(1);
    const input = calls.shoot.mock.calls[0]![0];
    expect(input.aimX).toBeGreaterThan(0);
    expect(input.power).toBeGreaterThan(0.2);
    expect(calls.aimLocked).toHaveBeenCalledTimes(1);
  });

  it('shows the reticle, power and curve while the finger moves, and clears them after', () => {
    const { c, canvas } = setup();
    c.setMode('shoot');
    canvas.dispatchEvent(ptr('pointerdown', 180, 510, 0));
    canvas.dispatchEvent(ptr('pointermove', 190, 430, 30));
    canvas.dispatchEvent(ptr('pointermove', 200, 380, 60));
    expect((c.el.querySelector('.pk-aim') as HTMLElement).hidden).toBe(false);
    expect((c.el.querySelector('.pk-power') as HTMLElement).hidden).toBe(false);
    expect((c.el.querySelector('.pk-power__label') as HTMLElement).textContent).toMatch(
      /Soft|Good|Sweet|Hard|Over/,
    );
    expect((c.el.querySelector('.pk-curve') as HTMLElement).dataset.curve).toMatch(/-1|0|1/);
    canvas.dispatchEvent(ptr('pointerup', 200, 380, 90));
    expect((c.el.querySelector('.pk-aim') as HTMLElement).hidden).toBe(true);
  });

  it('cancels a tap, a slip and a sideways drag without a shot, and reports it', () => {
    const { c, canvas, calls } = setup();
    c.setMode('shoot');
    swipe(canvas, 2, -3, 30, 2);
    swipe(canvas, 0, -20, 30, 3);
    swipe(canvas, 140, -10, 100);
    expect(calls.shoot).not.toHaveBeenCalled();
    expect(calls.cancelled).toHaveBeenCalledTimes(3); // each one tells the player what to do instead
  });

  it('a cancelled pointer (a phone call, a palm) leaves nothing half done', () => {
    const { c, canvas, calls } = setup();
    c.setMode('shoot');
    canvas.dispatchEvent(ptr('pointerdown', 180, 510, 0));
    canvas.dispatchEvent(ptr('pointermove', 180, 400, 40));
    canvas.dispatchEvent(ptr('pointercancel', 180, 400, 50));
    canvas.dispatchEvent(ptr('pointerup', 180, 300, 60));
    expect(calls.shoot).not.toHaveBeenCalled();
    swipe(canvas, 0, -140, 100);
    expect(calls.shoot).toHaveBeenCalledTimes(1);
  });

  it('a layout change in the middle of a swipe drops it (rotation never leaves a stuck swipe)', () => {
    const { c, canvas, calls } = setup();
    c.setMode('shoot');
    canvas.dispatchEvent(ptr('pointerdown', 180, 510, 0));
    canvas.dispatchEvent(ptr('pointermove', 180, 400, 40));
    c.setFrame({ ...F, spotX: 400 }, 812, 375);
    canvas.dispatchEvent(ptr('pointerup', 180, 300, 60));
    expect(calls.shoot).not.toHaveBeenCalled();
  });

  it('ignores a second finger', () => {
    const { c, canvas, calls } = setup();
    c.setMode('shoot');
    canvas.dispatchEvent(ptr('pointerdown', 180, 510, 0, 1));
    canvas.dispatchEvent(ptr('pointerdown', 50, 510, 5, 2));
    canvas.dispatchEvent(ptr('pointerup', 50, 300, 50, 2));
    expect(calls.shoot).not.toHaveBeenCalled();
  });
});

describe('striker controls (keyboard)', () => {
  it('arrows move the aim, Space starts the power meter, Space again kicks with that power', () => {
    const { c, calls } = setup();
    c.setMode('shoot');
    expect(c.key('ArrowRight')).toBe(true);
    expect(c.key('ArrowUp')).toBe(true);
    expect(c.key('x')).toBe(true);
    expect(calls.aimMoved).toHaveBeenCalledTimes(3);
    expect(c.key(' ')).toBe(true);
    for (let i = 0; i < 20; i++) c.tick(1 / 60); // a third of a second: the meter is climbing
    expect(calls.powerTick).toHaveBeenCalled();
    expect(c.key('ArrowLeft')).toBe(true); // the aim is locked while the meter runs
    expect(c.key('Enter')).toBe(true);
    expect(calls.shoot).toHaveBeenCalledTimes(1);
    const s = calls.shoot.mock.calls[0]![0];
    expect(s.aimX).toBeCloseTo(0.5, 9);
    expect(s.aimY).toBeCloseTo(1.6, 9);
    expect(s.curve).toBe(0.5);
    expect(s.power).toBeGreaterThan(0.3);
    expect(s.power).toBeLessThan(0.7);
  });

  it('keys do nothing out of turn and unknown keys are not swallowed', () => {
    const { c } = setup();
    expect(c.key('ArrowRight')).toBe(false);
    c.setMode('shoot');
    expect(c.key('q')).toBe(false);
  });
});

describe('keeper controls', () => {
  it('shows six real buttons with names, and a tap dives', () => {
    const { c, calls } = setup();
    c.setMode('keep');
    const grid = c.el.querySelector('.pk-dive') as HTMLElement;
    expect(grid.hidden).toBe(false);
    const buttons = [...grid.querySelectorAll<HTMLButtonElement>('button.pk-dive__zone')];
    expect(buttons.map((b) => b.dataset.zone)).toEqual(['ul', 'u', 'ur', 'dl', 'd', 'dr']);
    expect(new Set(buttons.map((b) => b.getAttribute('aria-label'))).size).toBe(6);
    buttons[2]!.click();
    expect(calls.dive).toHaveBeenCalledWith('ur');
  });

  it('a swipe across the grid dives the zone it points to, and the click that follows is swallowed', () => {
    const { c, calls } = setup();
    c.setMode('keep');
    const grid = c.el.querySelector('.pk-dive') as HTMLElement;
    const b = grid.querySelector('[data-zone="u"]') as HTMLElement;
    b.dispatchEvent(ptr('pointerdown', 180, 400, 0));
    b.dispatchEvent(ptr('pointerup', 120, 360, 80));
    expect(calls.dive).toHaveBeenCalledWith('ul');
    b.click();
    expect(calls.dive).toHaveBeenCalledTimes(1);
    b.click();
    expect(calls.dive).toHaveBeenCalledTimes(2);
  });

  it('keyboard: arrows move the highlighted button, Enter or Space dives it', () => {
    const { c, calls } = setup();
    c.setMode('keep');
    expect(c.key('ArrowLeft')).toBe(true);
    expect(c.el.querySelector('.is-pick')?.getAttribute('data-zone')).toBe('ul');
    expect(c.key('ArrowDown')).toBe(true);
    expect(c.el.querySelector('.is-pick')?.getAttribute('data-zone')).toBe('dl');
    expect(c.key('Enter')).toBe(true);
    expect(calls.dive).toHaveBeenCalledWith('dl');
    expect(c.key('q')).toBe(false);
  });

  it("the grid is hidden when it is not the keeper's turn, and can be placed under the goal", () => {
    const { c } = setup();
    c.setMode('keep');
    c.placeDive(330);
    expect((c.el.querySelector('.pk-dive') as HTMLElement).style.top).toBe('330px');
    c.setMode('shoot');
    expect((c.el.querySelector('.pk-dive') as HTMLElement).hidden).toBe(true);
  });

  it('showShot displays the power zone word and the curve word; null hides them', () => {
    const { c } = setup();
    c.showShot({ power: 0.6, curve: -0.8 });
    expect((c.el.querySelector('.pk-power__label') as HTMLElement).textContent).toBe('Sweet');
    expect((c.el.querySelector('.pk-curve') as HTMLElement).dataset.curve).toBe('-1');
    expect((c.el.querySelector('.pk-curve .pk-plate') as HTMLElement).textContent).toBe(
      'Curl left',
    );
    c.showShot(null);
    expect((c.el.querySelector('.pk-power') as HTMLElement).hidden).toBe(true);
  });

  it('the same mode again changes nothing: the shot just taken stays on the meters until the next kick', () => {
    const { c } = setup();
    c.setMode('shoot');
    c.setMode('idle');
    c.showShot({ power: 0.6, curve: 0 });
    c.setMode('idle');
    c.setMode('idle');
    expect((c.el.querySelector('.pk-power') as HTMLElement).hidden).toBe(false);
    c.setMode('shoot'); // a new kick: the meters are cleared
    expect((c.el.querySelector('.pk-power') as HTMLElement).hidden).toBe(true);
  });

  it('destroy removes its listeners (no handler runs afterwards)', () => {
    const { c, canvas, calls } = setup();
    c.setMode('shoot');
    c.destroy();
    swipe(canvas, 0, -140, 100);
    expect(calls.shoot).not.toHaveBeenCalled();
  });
});
