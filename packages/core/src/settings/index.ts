import type { Store } from '../storage';

export interface SettingsData {
  sound: boolean;
  music: boolean;
  /** 0..1 */
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  lang: string;
  /** force reduced motion on (the OS prefers-reduced-motion setting always applies too) */
  reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: SettingsData = {
  sound: true,
  music: true,
  masterVolume: 0.8,
  sfxVolume: 1,
  musicVolume: 0.5,
  lang: 'en',
  reducedMotion: false,
};

export interface Settings {
  get<K extends keyof SettingsData>(key: K): SettingsData[K];
  set<K extends keyof SettingsData>(key: K, value: SettingsData[K]): void;
  all(): SettingsData;
  /** Returns an unsubscribe function. */
  subscribe(fn: (key: keyof SettingsData, value: unknown) => void): () => void;
  destroy(): void;
}

const clamp01 = (n: number): number => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

export function createSettings(storage: Store): Settings {
  const stored = storage.get<Partial<SettingsData>>('settings', {});
  const data: SettingsData = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SettingsData)[]) {
    const v = stored[key];
    if (typeof v === typeof DEFAULT_SETTINGS[key])
      (data as unknown as Record<string, unknown>)[key] = v;
  }
  const subs = new Set<(key: keyof SettingsData, value: unknown) => void>();
  return {
    get: (key) => data[key],
    set(key, value) {
      const v = typeof value === 'number' ? (clamp01(value) as typeof value) : value;
      if (data[key] === v) return;
      data[key] = v;
      storage.set('settings', data);
      subs.forEach((fn) => fn(key, v));
    },
    all: () => ({ ...data }),
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    destroy: () => subs.clear(),
  };
}
