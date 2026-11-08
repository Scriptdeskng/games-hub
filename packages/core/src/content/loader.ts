import type { PackLoadResult, Validator } from './types';

export interface LoadPackOptions {
  /** Abort and report `timeout` after this many ms (default 6000: patchy mobile data). */
  timeoutMs?: number;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
}

/**
 * Fetch a JSON content pack and validate it. NEVER throws: every failure is a typed result.
 *
 * Freshness policy: this function adds no cache of its own. The per-game service worker serves
 * `assets/packs/*.json` network-first with a cache fallback (see sw-template.js), so online
 * players get the newest pack without a code release and offline players get the last one seen
 * (or the build-time precached copy). `cache: 'no-cache'` makes the browser HTTP cache
 * revalidate too, so a CDN's long max-age cannot pin an old pack.
 */
export async function loadPack<T>(
  url: string,
  validator: Validator<T>,
  opts: LoadPackOptions = {},
): Promise<PackLoadResult<T>> {
  const doFetch = opts.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
  if (!doFetch) return { ok: false, reason: 'network', message: 'fetch is not available' };
  const ctl = typeof AbortController === 'function' ? new AbortController() : undefined;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctl?.abort();
  }, opts.timeoutMs ?? 6000);
  try {
    const res = await doFetch(url, { cache: 'no-cache', signal: ctl?.signal });
    if (!res.ok) {
      return { ok: false, reason: 'http', status: res.status, message: `HTTP ${res.status}` };
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { ok: false, reason: timedOut ? 'timeout' : 'parse', message: 'not valid JSON' };
    }
    let v;
    try {
      v = validator(data);
    } catch (e) {
      return { ok: false, reason: 'invalid', message: String(e) };
    }
    if (!v.ok) {
      return { ok: false, reason: 'invalid', message: 'pack failed validation', errors: v.errors };
    }
    return { ok: true, pack: v.value };
  } catch (e) {
    if (timedOut) return { ok: false, reason: 'timeout', message: 'request timed out' };
    return { ok: false, reason: 'network', message: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}
