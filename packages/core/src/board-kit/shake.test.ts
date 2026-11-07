import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScope } from '../lifecycle';
import { bindShake, createShakeDetector, motionAllowed } from './shake';

const a = (x: number, y = 0, z = 0): { x: number; y: number; z: number } => ({ x, y, z });

describe('shake detector', () => {
  it('fires after several hard jolts, then respects the cooldown', () => {
    const onShake = vi.fn();
    const d = createShakeDetector({ onShake });
    let t = 0;
    const jolt = (n: number): void => {
      for (let i = 0; i < n; i++) d.feed(a(i % 2 ? 30 : -30), (t += 80));
    };
    jolt(3); // first sample only primes, so 2 deltas
    expect(onShake).not.toHaveBeenCalled();
    jolt(2);
    expect(onShake).toHaveBeenCalledTimes(1);
    jolt(6); // still inside the cooldown
    expect(onShake).toHaveBeenCalledTimes(1);
    t += 2000;
    jolt(5);
    expect(onShake).toHaveBeenCalledTimes(2);
  });

  it('ignores gentle movement, slow jolts and missing data', () => {
    const onShake = vi.fn();
    const d = createShakeDetector({ onShake });
    for (let i = 0; i < 20; i++) d.feed(a(i % 2 ? 2 : 0), i * 50);
    for (let i = 0; i < 6; i++) d.feed(a(i % 2 ? 40 : -40), i * 2000); // too slow to count
    d.feed(null, 0);
    d.feed(undefined, 0);
    d.feed({ x: null, y: 1, z: 1 }, 0);
    expect(onShake).not.toHaveBeenCalled();
  });
});

describe('motion permissions policy', () => {
  const withPolicy = (key: string, allows: (f: string) => boolean): Document =>
    ({ [key]: { allowsFeature: allows } }) as unknown as Document;

  it('is allowed when there is no policy API, and follows the policy when there is one', () => {
    expect(motionAllowed({} as Document)).toBe(true);
    expect(motionAllowed(withPolicy('featurePolicy', () => false))).toBe(false);
    expect(
      motionAllowed(
        withPolicy('permissionsPolicy', (f) => f === 'accelerometer' || f === 'gyroscope'),
      ),
    ).toBe(true);
    expect(
      motionAllowed(
        withPolicy('featurePolicy', () => {
          throw new Error('x');
        }),
      ),
    ).toBe(true);
  });

  it('stays completely silent when the accelerometer is blocked: no listener is attached', () => {
    (globalThis as { DeviceMotionEvent?: unknown }).DeviceMotionEvent = class {};
    const spy = vi.spyOn(window, 'addEventListener');
    Object.defineProperty(document, 'featurePolicy', {
      value: { allowsFeature: () => false },
      configurable: true,
    });
    const scope = createScope();
    const b = bindShake(scope, { enabled: () => true, onShake: () => undefined });
    expect(b.supported).toBe(false);
    expect(spy.mock.calls.filter((c) => c[0] === 'devicemotion')).toHaveLength(0);
    delete (document as unknown as { featurePolicy?: unknown }).featurePolicy;
    delete (globalThis as { DeviceMotionEvent?: unknown }).DeviceMotionEvent;
    spy.mockRestore();
    scope.destroy();
  });
});

describe('bindShake', () => {
  afterEach(() => {
    delete (globalThis as { DeviceMotionEvent?: unknown }).DeviceMotionEvent;
  });

  const motion = (x: number): Event => {
    const e = new Event('devicemotion');
    Object.defineProperty(e, 'accelerationIncludingGravity', { value: a(x) });
    return e;
  };

  it('reports no support and a false permission without devicemotion', async () => {
    const scope = createScope();
    const b = bindShake(scope, { enabled: () => true, onShake: () => undefined });
    expect(b.supported).toBe(false);
    expect(await b.requestPermission()).toBe(false);
    scope.destroy();
  });

  it('shakes trigger only while enabled, and the listener is removed with the scope', () => {
    (globalThis as { DeviceMotionEvent?: unknown }).DeviceMotionEvent = class {};
    const scope = createScope();
    let on = false;
    let t = 0;
    const onShake = vi.fn();
    const b = bindShake(scope, { enabled: () => on, onShake, now: () => (t += 80) });
    expect(b.supported).toBe(true);
    const burst = (): void => {
      for (let i = 0; i < 8; i++) window.dispatchEvent(motion(i % 2 ? 30 : -30));
    };
    burst();
    expect(onShake).not.toHaveBeenCalled();
    on = true;
    burst();
    expect(onShake).toHaveBeenCalled();
    scope.destroy();
    const n = onShake.mock.calls.length;
    t += 5000;
    burst();
    expect(onShake).toHaveBeenCalledTimes(n);
  });

  it('asks iOS-style permission and survives a refusal', async () => {
    const scope = createScope();
    const req = vi.fn().mockResolvedValue('granted');
    (globalThis as { DeviceMotionEvent?: unknown }).DeviceMotionEvent = { requestPermission: req };
    const b = bindShake(scope, { enabled: () => true, onShake: () => undefined });
    expect(await b.requestPermission()).toBe(true);
    req.mockResolvedValueOnce('denied');
    expect(await b.requestPermission()).toBe(false);
    req.mockRejectedValueOnce(new Error('no'));
    expect(await b.requestPermission()).toBe(false);
    scope.destroy();
  });

  it('platforms without a permission API are allowed straight away', async () => {
    (globalThis as { DeviceMotionEvent?: unknown }).DeviceMotionEvent = class {};
    const scope = createScope();
    expect(
      await bindShake(scope, { enabled: () => true, onShake: () => undefined }).requestPermission(),
    ).toBe(true);
    scope.destroy();
  });
});
