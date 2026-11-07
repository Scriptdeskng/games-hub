import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStorage } from '../storage';
import { createPortal, parsePortalParams } from './index';

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
      search: '?portal=https://p.example',
      win,
    });
    p.emit('ready', { v: 1 });
    p.emit('end', { score: 3 });
    expect(post).toHaveBeenNthCalledWith(
      1,
      { source: 'naija-games', game: 'g', type: 'ready', data: { v: 1 } },
      'https://p.example',
    );
    expect(post.mock.calls.every((c) => c[1] === 'https://p.example')).toBe(true);
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
      search: '?portal=https://p.example',
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
        search: '?portal=https://p.example',
        win: bad,
      }).emit('ready'),
    ).not.toThrow();
  });
  it('exposes params without leaking the token', () => {
    const p = createPortal({
      game: 'g',
      storage: createStorage('g'),
      search: '?token=secret&portal=https://p.example',
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
      search: '?token=tok1&portal=https://p.example',
      fetchFn,
    });
    expect(await p.loadProgress({ n: 0 })).toEqual({ n: 9 });
    await p.saveProgress({ n: 10 });
    const [loadUrl, loadInit] = fetchFn.mock.calls[0]!;
    expect(loadUrl).toBe('https://p.example/api/games/g/progress');
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
    const args = { game: 'g', storage: st, search: '?token=t&portal=https://p.example' };
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
