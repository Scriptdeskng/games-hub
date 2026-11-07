import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStorage } from '../storage';
import { DEFAULT_PORTAL_ORIGIN, createPortal, isAllowedOrigin, parsePortalParams } from './index';

afterEach(() => localStorage.clear());

const iframeWin = () => {
  const post = vi.fn();
  return { win: { parent: { postMessage: post } } as unknown as Window, post };
};

describe('parsePortalParams', () => {
  it('reads token, lang and a validated portal origin', () => {
    const p = parsePortalParams('?token=abc&lang=pcm&portal=https://m.gamesplash.com.ng/some/path');
    expect(p).toEqual({ token: 'abc', lang: 'pcm', portalOrigin: 'https://m.gamesplash.com.ng' });
  });
  it('rejects non-http portals, garbage and oversize tokens', () => {
    expect(parsePortalParams('?portal=javascript:alert(1)').portalOrigin).toBeNull();
    expect(parsePortalParams('?portal=not a url').portalOrigin).toBeNull();
    expect(parsePortalParams(`?token=${'x'.repeat(3000)}`).token).toBeNull();
    expect(parsePortalParams('').portalOrigin).toBeNull();
  });
});

describe('portal events', () => {
  it('posts the contract payload to the portal origin only', () => {
    const { win, post } = iframeWin();
    const p = createPortal({
      game: 'g',
      storage: createStorage('g'),
      search: '?portal=https://m.gamesplash.com.ng',
      win,
    });
    p.emit('ready', { v: 1 });
    p.emit('end', { score: 3 });
    expect(post).toHaveBeenNthCalledWith(
      1,
      { source: 'naija-games', game: 'g', type: 'ready', data: { v: 1 } },
      'https://m.gamesplash.com.ng',
    );
    expect(post.mock.calls.every((c) => c[1] === 'https://m.gamesplash.com.ng')).toBe(true);
    expect(p.log.map((e) => e.type)).toEqual(['ready', 'end']);
  });
  it('never posts when the portal param is missing (no wildcard origin)', () => {
    const { win, post } = iframeWin();
    const p = createPortal({ game: 'g', storage: createStorage('g'), search: '?token=t', win });
    p.emit('start');
    expect(post).not.toHaveBeenCalled();
    expect(p.log).toHaveLength(1);
  });
  it('does not post when not inside an iframe, and swallows postMessage errors', () => {
    const self = { parent: null as unknown } as { parent: unknown };
    self.parent = self;
    const post = vi.fn();
    (self.parent as { postMessage: unknown }).postMessage = post;
    createPortal({
      game: 'g',
      storage: createStorage('g'),
      search: '?portal=https://m.gamesplash.com.ng',
      win: self as unknown as Window,
    }).emit('ready');
    expect(post).not.toHaveBeenCalled();
    const bad = {
      parent: {
        postMessage: () => {
          throw new Error('x');
        },
      },
    } as unknown as Window;
    expect(() =>
      createPortal({
        game: 'g',
        storage: createStorage('g'),
        search: '?portal=https://m.gamesplash.com.ng',
        win: bad,
      }).emit('ready'),
    ).not.toThrow();
  });
  it('exposes params without leaking the token', () => {
    const p = createPortal({
      game: 'g',
      storage: createStorage('g'),
      search: '?token=secret&portal=https://m.gamesplash.com.ng',
    });
    expect(p.params.hasToken).toBe(true);
    expect(JSON.stringify(p.params)).not.toContain('secret');
  });
});

describe('portal progress', () => {
  it('uses localStorage when there is no token', async () => {
    const fetchFn = vi.fn();
    const p = createPortal({ game: 'g', storage: createStorage('g'), search: '', fetchFn });
    expect(await p.loadProgress({ n: 0 })).toEqual({ n: 0 });
    await p.saveProgress({ n: 5 });
    expect(await p.loadProgress({ n: 0 })).toEqual({ n: 5 });
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it('calls the portal API with a bearer header (never the URL) when a token exists', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { n: 9 } }) });
    const p = createPortal({
      game: 'g',
      storage: createStorage('g'),
      search: '?token=tok1&portal=https://m.gamesplash.com.ng',
      fetchFn,
    });
    expect(await p.loadProgress({ n: 0 })).toEqual({ n: 9 });
    await p.saveProgress({ n: 10 });
    const [loadUrl, loadInit] = fetchFn.mock.calls[0]!;
    expect(loadUrl).toBe('https://m.gamesplash.com.ng/api/games/g/progress');
    expect(loadUrl).not.toContain('tok1');
    expect(loadInit.headers.Authorization).toBe('Bearer tok1');
    const [, saveInit] = fetchFn.mock.calls[1]!;
    expect(saveInit.method).toBe('PUT');
    expect(JSON.parse(saveInit.body)).toEqual({ data: { n: 10 } });
    expect(JSON.stringify(Object.entries(localStorage))).not.toContain('tok1');
  });
  it('falls back to the local copy when the API fails, errors or returns nothing', async () => {
    const st = createStorage('g');
    st.set('progress', { n: 1 });
    const args = { game: 'g', storage: st, search: '?token=t&portal=https://m.gamesplash.com.ng' };
    const down = createPortal({
      ...args,
      fetchFn: vi.fn().mockRejectedValue(new Error('offline')),
    });
    expect(await down.loadProgress({ n: 0 })).toEqual({ n: 1 });
    await expect(down.saveProgress({ n: 2 })).resolves.toBeUndefined();
    const nf = createPortal({ ...args, fetchFn: vi.fn().mockResolvedValue({ ok: false }) });
    expect(await nf.loadProgress({ n: 0 })).toEqual({ n: 2 });
    const empty = createPortal({
      ...args,
      fetchFn: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    });
    expect(await empty.loadProgress({ n: 0 })).toEqual({ n: 2 });
  });
});

describe('portal origin allow-list', () => {
  it('production default: only the GameSplash portal. No localhost of any kind, no https localhost', () => {
    for (const o of [
      'https://localhost',
      'https://localhost:8443',
      'https://127.0.0.1',
      'https://127.0.0.1:4180',
      'https://[::1]:3000',
      'http://localhost:4180',
      'http://127.0.0.1:3000',
      'http://[::1]:3000',
    ]) {
      expect(isAllowedOrigin(o, undefined, false), o).toBe(false);
    }
    expect(isAllowedOrigin(DEFAULT_PORTAL_ORIGIN, undefined, false)).toBe(true);
    expect(isAllowedOrigin('https://evil.example', undefined, false)).toBe(false);
  });
  it('local development: http localhost / 127.0.0.1 / [::1] only, and only when allowed', () => {
    for (const o of ['http://localhost:4180', 'http://127.0.0.1:3000', 'http://[::1]:3000']) {
      expect(isAllowedOrigin(o, undefined, true), o).toBe(true);
    }
    for (const o of ['https://localhost:8443', 'https://127.0.0.1', 'https://[::1]']) {
      expect(isAllowedOrigin(o, undefined, true), o).toBe(false); // https localhost is never a portal
    }
    expect(isAllowedOrigin('http://localhost.evil.example', undefined, true)).toBe(false);
    expect(isAllowedOrigin('http://127.0.0.1.evil.example', undefined, true)).toBe(false);
  });
  it('a production page ignores a localhost ?portal= (no events, no token) unless allowLocal is set', () => {
    const q = '?token=secret&portal=http://localhost:4180';
    expect(parsePortalParams(q, undefined, false).portalOrigin).toBeNull();
    expect(parsePortalParams(q, undefined, true).portalOrigin).toBe('http://localhost:4180');
    const { win, post } = iframeWin();
    const p = createPortal({
      game: 'g',
      storage: createStorage('g'),
      search: q,
      allowLocal: false,
      win,
      fetchFn: vi.fn(),
    });
    p.emit('ready');
    expect(post).not.toHaveBeenCalled();
  });
  it('default (non-production test build): localhost over http is accepted, https localhost is not', () => {
    expect(isAllowedOrigin('https://m.gamesplash.com.ng')).toBe(true);
    expect(isAllowedOrigin(DEFAULT_PORTAL_ORIGIN)).toBe(true);
    expect(isAllowedOrigin('http://m.gamesplash.com.ng')).toBe(false); // no downgrade
    expect(isAllowedOrigin('https://evil.example')).toBe(false);
    expect(isAllowedOrigin('https://gamesplash.com.ng')).toBe(false);
    expect(isAllowedOrigin('https://x.gamesplash.com.ng')).toBe(false); // no wildcard by default
    expect(isAllowedOrigin('https://m.gamesplash.com.ng.evil.example')).toBe(false);
    expect(isAllowedOrigin('https://localhost:8443')).toBe(false);
    expect(isAllowedOrigin('http://localhost:4180')).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:3000')).toBe(true);
    expect(isAllowedOrigin('http://[::1]:3000')).toBe(true);
    expect(isAllowedOrigin('http://evil.example')).toBe(false);
    expect(isAllowedOrigin('http://localhost.evil.example')).toBe(false);
    expect(isAllowedOrigin('ftp://localhost')).toBe(false);
    expect(isAllowedOrigin('not a url')).toBe(false);
  });
  it('explicit list: exact origins and https://*.domain patterns only', () => {
    const list = ['https://m.gamesplash.com.ng', 'https://*.example.com'];
    expect(isAllowedOrigin('https://m.gamesplash.com.ng', list)).toBe(true);
    expect(isAllowedOrigin('https://a.b.example.com', list)).toBe(true);
    expect(isAllowedOrigin('https://example.com', list)).toBe(false);
    expect(isAllowedOrigin('https://evilexample.com', list)).toBe(false);
    expect(isAllowedOrigin('http://a.example.com', list)).toBe(false);
    expect(isAllowedOrigin('https://other.org', list)).toBe(false);
    expect(isAllowedOrigin('http://localhost:4180', list)).toBe(false); // list replaces the default
  });
  it('with the DEFAULT list an evil origin gets no events and no token', async () => {
    for (const evil of [
      'https://evil.example',
      'http://m.gamesplash.com.ng',
      'https://m.gamesplash.com.ng.evil.example',
      'http://localhost.evil.example',
    ]) {
      const { win, post } = iframeWin();
      const fetchFn = vi.fn();
      const p = createPortal({
        game: 'g',
        storage: createStorage('g'),
        search: `?token=secret&portal=${evil}`,
        win,
        fetchFn,
      });
      p.emit('ready');
      await p.saveProgress({ n: 1 });
      await p.loadProgress({ n: 0 });
      expect(post, evil).not.toHaveBeenCalled();
      expect(fetchFn, evil).not.toHaveBeenCalled();
      expect(p.params.portalOrigin).toBeNull();
    }
    // the real portal still works with the default
    const { win, post } = iframeWin();
    const p = createPortal({
      game: 'g',
      storage: createStorage('g'),
      search: '?token=t&portal=https://m.gamesplash.com.ng',
      win,
      fetchFn: vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: null }) }),
    });
    p.emit('ready');
    expect(post).toHaveBeenCalledWith(expect.anything(), 'https://m.gamesplash.com.ng');
  });
  it('a disallowed origin gets no events and never sees the token', async () => {
    const { win, post } = iframeWin();
    const fetchFn = vi.fn();
    const p = createPortal({
      game: 'g',
      storage: createStorage('g'),
      search: '?token=secret&portal=https://evil.example',
      allowedOrigins: ['https://m.gamesplash.com.ng'],
      win,
      fetchFn,
    });
    p.emit('ready');
    await p.saveProgress({ n: 1 });
    await p.loadProgress({ n: 0 });
    expect(post).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(p.params.portalOrigin).toBeNull();
  });
  it('treats {data:null} and 404 as no progress; the log is bounded', async () => {
    const st = createStorage('g');
    st.set('progress', { n: 3 });
    const args = { game: 'g', storage: st, search: '?token=t&portal=https://m.gamesplash.com.ng' };
    const empty = createPortal({
      ...args,
      fetchFn: vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: null }) }),
    });
    expect(await empty.loadProgress({ n: 0 })).toEqual({ n: 3 });
    const nf = createPortal({
      ...args,
      fetchFn: vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    });
    expect(await nf.loadProgress({ n: 0 })).toEqual({ n: 3 });
    for (let i = 0; i < 700; i++) empty.emit('score', { i });
    expect(empty.log.length).toBe(500);
    expect((empty.log[499]!.data as { i: number }).i).toBe(699);
  });
});
