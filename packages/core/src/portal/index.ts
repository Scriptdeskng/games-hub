import type { Store } from '../storage';

/**
 * Portal bridge. Talks to the GameSplash portal only when `?portal=<origin>` is present, and
 * only to that exact origin. The `token` is opaque, kept in memory, sent only as a Bearer header
 * to the portal API, and never written to storage, URLs or logs.
 *
 * API contract (to confirm with the portal team), Authorization: Bearer <token>:
 *   GET  {portal}/api/games/{slug}/progress -> 200 { "data": <json> }, or 200 { "data": null } when
 *        the player has no saved progress yet. Return 200 (not 404): browsers log every 404 as a
 *        console error, which counts against the "0 console errors" budget. A 404 is still tolerated
 *        and treated as "no progress".
 *   PUT  {portal}/api/games/{slug}/progress  body { "data": <json> } -> 2xx
 *
 * The portal origin must be allowed. By default that is `DEFAULT_PORTAL_ORIGIN`
 * (https://m.gamesplash.com.ng, the portal named in CLAUDE.md) plus localhost / 127.0.0.1 / [::1]
 * for development (the only http origins ever accepted). No wildcards. A game or test that talks
 * to another portal passes `allowedOrigins` (exact origins, or `https://*.example.com`), which
 * REPLACES the default. A disallowed origin gets no events and never sees the token.
 */
export const DEFAULT_PORTAL_ORIGIN = 'https://m.gamesplash.com.ng';

export type PortalEventType = 'ready' | 'start' | 'level_complete' | 'score' | 'end' | 'error';

export interface PortalMessage {
  source: 'naija-games';
  game: string;
  type: PortalEventType;
  data: unknown;
}

export interface PortalParams {
  token: string | null;
  lang: string | null;
  /** validated origin (scheme + host + port) or null */
  portalOrigin: string | null;
}

/** Is `origin` (already normalised by URL) acceptable as a portal? */
export function isAllowedOrigin(origin: string, allowed?: readonly string[]): boolean {
  let u: URL;
  try {
    u = new URL(origin);
  } catch {
    return false;
  }
  if (allowed && allowed.length) {
    return allowed.some((a) => {
      const star = a.match(/^(https?):\/\/\*\.(.+)$/);
      if (!star) return a === origin;
      return u.protocol === `${star[1]}:` && u.host.endsWith(`.${star[2]}`);
    });
  }
  if (origin === DEFAULT_PORTAL_ORIGIN) return true;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  return local && (u.protocol === 'http:' || u.protocol === 'https:');
}

export function parsePortalParams(search: string, allowed?: readonly string[]): PortalParams {
  const q = new URLSearchParams(search);
  let portalOrigin: string | null = null;
  const raw = q.get('portal');
  if (raw) {
    try {
      const u = new URL(raw);
      if (isAllowedOrigin(u.origin, allowed)) portalOrigin = u.origin;
    } catch {
      portalOrigin = null;
    }
  }
  const token = q.get('token');
  return { token: token && token.length <= 2048 ? token : null, lang: q.get('lang'), portalOrigin };
}

export interface PortalOptions {
  game: string;
  storage: Store;
  search?: string;
  /** exact origins or `https://*.example.com` patterns; default: the GameSplash portal + localhost for dev */
  allowedOrigins?: readonly string[];
  /** injectable for tests */
  win?: Pick<Window, 'parent'> & { top?: unknown };
  fetchFn?: typeof fetch;
}

export interface Portal {
  readonly params: Omit<PortalParams, 'token'> & { hasToken: boolean };
  emit(type: PortalEventType, data?: unknown): void;
  /** Every event emitted this session, in order (read by the test hook / mock portal tests). */
  readonly log: readonly { type: PortalEventType; data: unknown; at: number }[];
  saveProgress(data: unknown): Promise<void>;
  loadProgress<T>(fallback: T): Promise<T>;
}

const LOG_CAP = 500;

export function createPortal(opts: PortalOptions): Portal {
  const p = parsePortalParams(opts.search ?? window.location.search, opts.allowedOrigins);
  const token = p.token;
  const win = opts.win ?? window;
  const doFetch = opts.fetchFn ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const log: { type: PortalEventType; data: unknown; at: number }[] = [];
  const url = p.portalOrigin
    ? `${p.portalOrigin}/api/games/${encodeURIComponent(opts.game)}/progress`
    : null;
  const remote = !!(token && url);

  return {
    params: { lang: p.lang, portalOrigin: p.portalOrigin, hasToken: !!token },
    log,
    emit(type, data = {}) {
      // diagnostics for the test hook only: never accumulate in production
      if (__NAIJA_TEST__) {
        log.push({ type, data, at: Date.now() });
        if (log.length > LOG_CAP) log.shift();
      }
      if (!p.portalOrigin || win.parent === (win as unknown as Window)) return;
      const msg: PortalMessage = { source: 'naija-games', game: opts.game, type, data };
      try {
        win.parent.postMessage(msg, p.portalOrigin);
      } catch {
        /* never let the bridge break the game */
      }
    },
    async saveProgress(data) {
      opts.storage.set('progress', data);
      if (!remote) return;
      try {
        await doFetch(url as string, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ data }),
        });
      } catch {
        /* offline: local copy already saved */
      }
    },
    async loadProgress<T>(fallback: T): Promise<T> {
      const local = opts.storage.get<T>('progress', fallback);
      if (!remote) return local;
      try {
        const res = await doFetch(url as string, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return local;
        const body = (await res.json()) as { data?: T };
        return body.data ?? local;
      } catch {
        return local;
      }
    },
  };
}
