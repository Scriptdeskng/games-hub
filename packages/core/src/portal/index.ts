import type { Store } from '../storage';

/**
 * Portal bridge. Talks to the GameSplash portal only when `?portal=<origin>` is present, and
 * only to that exact origin. The `token` is opaque, kept in memory, sent only as a Bearer header
 * to the portal API, and never written to storage, URLs or logs.
 *
 * Assumed API (to confirm with the portal team):
 *   GET  {portal}/api/games/{slug}/progress   -> 200 { data: <json> } | 404
 *   PUT  {portal}/api/games/{slug}/progress   body { data: <json> }
 */
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

export function parsePortalParams(search: string): PortalParams {
  const q = new URLSearchParams(search);
  let portalOrigin: string | null = null;
  const raw = q.get('portal');
  if (raw) {
    try {
      const u = new URL(raw);
      if (u.protocol === 'https:' || u.protocol === 'http:') portalOrigin = u.origin;
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

export function createPortal(opts: PortalOptions): Portal {
  const p = parsePortalParams(opts.search ?? window.location.search);
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
      log.push({ type, data, at: Date.now() });
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
