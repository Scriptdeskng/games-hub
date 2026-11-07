import type { Scope } from '../lifecycle';

/**
 * Shake-to-roll. `devicemotion` exists on most phones; desktops and some browsers never fire it,
 * so every shake action also has a tap/keyboard path (the dice view always keeps its button).
 */
export interface Accel {
  x: number | null;
  y: number | null;
  z: number | null;
}

export interface ShakeDetector {
  /** Feed one accelerometer sample (m/s2, gravity included) with a timestamp in ms. */
  feed(a: Accel | null | undefined, now: number): void;
}

export interface ShakeOptions {
  onShake(): void;
  /** change in acceleration (m/s2) between samples that counts as a jolt (default 14) */
  threshold?: number;
  /** jolts needed within `windowMs` (default 3) */
  jolts?: number;
  windowMs?: number;
  /** ignore further shakes for this long after one fires (default 1200) */
  cooldownMs?: number;
}

export function createShakeDetector(o: ShakeOptions): ShakeDetector {
  const threshold = o.threshold ?? 14;
  const need = o.jolts ?? 3;
  const windowMs = o.windowMs ?? 700;
  const cooldown = o.cooldownMs ?? 1200;
  let last: [number, number, number] | null = null;
  let hits: number[] = [];
  let firedAt = -Infinity;
  return {
    feed(a, now) {
      if (!a || a.x === null || a.y === null || a.z === null) return;
      const cur: [number, number, number] = [a.x, a.y, a.z];
      const prev = last;
      last = cur;
      if (!prev) return;
      const delta = Math.hypot(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2]);
      if (delta < threshold) return;
      hits = hits.filter((t) => now - t <= windowMs);
      hits.push(now);
      if (hits.length >= need && now - firedAt >= cooldown) {
        firedAt = now;
        hits = [];
        o.onShake();
      }
    },
  };
}

export interface ShakeBinding {
  /** false when the browser has no devicemotion, or the page may not use it (tap fallback only) */
  readonly supported: boolean;
  /**
   * iOS asks for motion permission and only from a user gesture: call this inside the first tap.
   * Resolves true when shake events may arrive. Never rejects.
   */
  requestPermission(): Promise<boolean>;
}

/**
 * Inside a portal iframe the accelerometer is blocked unless the iframe has
 * `allow="accelerometer; gyroscope"`; attaching a `devicemotion` listener anyway logs a console error.
 * So: attach only when the permissions policy allows it (no policy API means allowed).
 */
export function motionAllowed(doc: Document = document): boolean {
  const d = doc as Document & {
    permissionsPolicy?: { allowsFeature?: (f: string) => boolean };
    featurePolicy?: { allowsFeature?: (f: string) => boolean };
  };
  const policy = d.permissionsPolicy ?? d.featurePolicy;
  try {
    // devicemotion needs both sensors: either one blocked makes the browser log an error
    return (
      (policy?.allowsFeature?.('accelerometer') ?? true) &&
      (policy?.allowsFeature?.('gyroscope') ?? true)
    );
  } catch {
    return true;
  }
}

interface MotionCtor {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

/** Listen for shakes while `enabled()` is true. Cleaned up with the scope. */
export function bindShake(
  scope: Scope,
  o: ShakeOptions & { enabled(): boolean; now?: () => number },
): ShakeBinding {
  const Ctor = (globalThis as { DeviceMotionEvent?: MotionCtor }).DeviceMotionEvent;
  const supported = typeof Ctor !== 'undefined' && motionAllowed();
  const now = o.now ?? ((): number => performance.now());
  if (supported) {
    const det = createShakeDetector({
      ...o,
      onShake: () => {
        if (o.enabled()) o.onShake();
      },
    });
    scope.on(window, 'devicemotion', (e: DeviceMotionEvent) => {
      if (o.enabled()) det.feed(e.accelerationIncludingGravity, now());
    });
  }
  return {
    supported,
    async requestPermission() {
      if (!supported) return false;
      if (typeof Ctor?.requestPermission !== 'function') return true;
      try {
        return (await Ctor.requestPermission()) === 'granted';
      } catch {
        return false;
      }
    },
  };
}
