/**
 * Namespaced storage over localStorage with an in-memory fallback (private mode, quota,
 * blocked third-party storage in iframes). Never stores identifiers: keys that look like
 * phone numbers or tokens are rejected.
 */
export interface Store {
  get<T>(key: string, fallback: T): T;
  set(key: string, value: unknown): boolean;
  remove(key: string): void;
  /** true if the browser store works; false when running on the memory fallback */
  readonly persistent: boolean;
}

const FORBIDDEN_KEY = /(\d{7,}|token|msisdn|phone|mobile|auth|secret)/i;

export function assertSafeKey(key: string): void {
  if (!/^[\w.:-]{1,64}$/.test(key) || FORBIDDEN_KEY.test(key)) {
    throw new Error(`storage: unsafe key "${key.slice(0, 20)}"`);
  }
}

export function createStorage(namespace: string): Store {
  assertSafeKey(namespace);
  const mem = new Map<string, string>();
  let backend: globalThis.Storage | null = null;
  try {
    const probe = '__naija_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    backend = window.localStorage;
  } catch {
    backend = null;
  }
  const k = (key: string): string => {
    assertSafeKey(key);
    return `naija:${namespace}:${key}`;
  };
  return {
    persistent: backend !== null,
    get<T>(key: string, fallback: T): T {
      const full = k(key);
      let raw: string | null | undefined;
      try {
        raw = backend ? backend.getItem(full) : mem.get(full);
      } catch {
        raw = mem.get(full);
      }
      if (raw === null || raw === undefined) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      const full = k(key);
      const raw = JSON.stringify(value);
      mem.set(full, raw);
      try {
        backend?.setItem(full, raw);
        return backend !== null;
      } catch {
        return false;
      }
    },
    remove(key) {
      const full = k(key);
      mem.delete(full);
      try {
        backend?.removeItem(full);
      } catch {
        /* ignore */
      }
    },
  };
}
