import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker, swUrl } from './index';

afterEach(() => vi.unstubAllGlobals());

describe('swUrl', () => {
  it('resolves sw.js next to the page, with or without a trailing slash or file', () => {
    expect(swUrl('https://cdn.example/games/html/whot/index.html?token=x')).toBe(
      'https://cdn.example/games/html/whot/sw.js',
    );
    expect(swUrl('https://cdn.example/games/html/whot/')).toBe(
      'https://cdn.example/games/html/whot/sw.js',
    );
    expect(swUrl('https://cdn.example/games/html/whot')).toBe(
      'https://cdn.example/games/html/whot/sw.js',
    );
  });
});

describe('registerServiceWorker', () => {
  // vitest runs with import.meta.env.DEV = true, so the dev guard is what we can observe here.
  it('is skipped on the Vite dev server (no sw.js there)', async () => {
    expect(await registerServiceWorker()).toBe('skipped');
  });
  describe('in a production build', () => {
    const setSw = (value: unknown): void =>
      void Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value });
    afterEach(() => {
      vi.unstubAllEnvs();
      delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    });
    it('registers sw.js next to the page', async () => {
      vi.stubEnv('DEV', false);
      const register = vi.fn().mockResolvedValue({});
      setSw({ register });
      expect(await registerServiceWorker()).toBe('registered');
      expect(register).toHaveBeenCalledWith(expect.stringMatching(/\/sw\.js$/));
    });
    it('reports unsupported when there is no serviceWorker API', async () => {
      vi.stubEnv('DEV', false);
      expect(await registerServiceWorker()).toBe('unsupported');
    });
    it('never throws when registration is refused (private mode, blocked storage)', async () => {
      vi.stubEnv('DEV', false);
      setSw({ register: vi.fn().mockRejectedValue(new Error('SecurityError')) });
      expect(await registerServiceWorker()).toBe('failed');
    });
  });
});

/** Execute the real worker template in a sandbox with fake caches and check its behaviour. */
describe('sw-template.js', () => {
  const src = readFileSync(resolve(process.cwd(), 'packages/core/src/sw/sw-template.js'), 'utf8')
    .replace('__VERSION__', 'v2')
    .replace('__SLUG__', 'demo')
    .replace('__FILES__', JSON.stringify(['./index.html', './chunks/a.js']));

  const boot = () => {
    const handlers: Record<string, (e: unknown) => void> = {};
    const stores = new Map<string, Map<string, string>>();
    stores.set('naija-demo-v1', new Map());
    stores.set('naija-other-v1', new Map());
    const mkCache = (name: string) => {
      const m = stores.get(name) ?? new Map<string, string>();
      stores.set(name, m);
      return {
        addAll: async (files: string[]) => files.forEach((f) => m.set(f, `body:${f}`)),
        add: async (f: string) => void m.set(f, 'dir'),
        put: async (k: string, res: { body: string }) => {
          const u = new URL(k, 'https://x.test/demo/');
          m.set('./' + u.pathname.replace('/demo/', ''), res.body);
        },
        match: async (req: { url: string } | string, opts?: { ignoreSearch?: boolean }) => {
          const url = typeof req === 'string' ? req : req.url;
          const u = new URL(url, 'https://x.test/demo/');
          const key = './' + u.pathname.replace('/demo/', '');
          return opts?.ignoreSearch || !u.search ? m.get(key) : undefined;
        },
      };
    };
    const sandbox = {
      self: {
        addEventListener: (t: string, fn: (e: unknown) => void) => (handlers[t] = fn),
        location: { origin: 'https://x.test' },
        skipWaiting: vi.fn(),
        clients: { claim: vi.fn(async () => undefined) },
      },
      caches: {
        open: async (n: string) => mkCache(n),
        keys: async () => [...stores.keys()],
        delete: vi.fn(async (n: string) => stores.delete(n)),
      },
      fetch: vi.fn(async () => 'network'),
      URL,
      Promise,
    };
    vm.runInNewContext(src, sandbox);
    return { handlers, sandbox, stores };
  };
  const wait = async (h: (e: unknown) => void): Promise<unknown> => {
    let p: Promise<unknown> = Promise.resolve();
    h({ waitUntil: (x: Promise<unknown>) => (p = x) });
    return p;
  };
  const fetchEv = (url: string, mode = 'cors', method = 'GET') => {
    let res: Promise<unknown> | undefined;
    return {
      ev: { request: { url, mode, method }, respondWith: (p: Promise<unknown>) => (res = p) },
      res: () => res,
    };
  };

  it('precaches the build and deletes only older caches of the same game', async () => {
    const { handlers, stores, sandbox } = boot();
    await wait(handlers.install!);
    expect([...stores.get('naija-demo-v2')!.keys()].sort()).toEqual([
      './',
      './chunks/a.js',
      './index.html',
    ]);
    expect(sandbox.self.skipWaiting).toHaveBeenCalled();
    await wait(handlers.activate!);
    expect(stores.has('naija-demo-v1')).toBe(false);
    expect(stores.has('naija-other-v1')).toBe(true);
    expect(stores.has('naija-demo-v2')).toBe(true);
  });
  it('serves cache-first, ignores the query string, and falls back to the network', async () => {
    const { handlers, sandbox } = boot();
    await wait(handlers.install!);
    const a = fetchEv('https://x.test/demo/chunks/a.js');
    handlers.fetch!(a.ev);
    expect(await a.res()).toBe('body:./chunks/a.js');
    const q = fetchEv('https://x.test/demo/index.html?token=abc&lang=pcm', 'navigate');
    handlers.fetch!(q.ev);
    expect(await q.res()).toBe('body:./index.html');
    const miss = fetchEv('https://x.test/demo/other.json');
    handlers.fetch!(miss.ev);
    expect(await miss.res()).toBe('network');
    expect(sandbox.fetch).toHaveBeenCalledTimes(1);
  });
  it('ignores non-GET and cross-origin requests; offline navigation falls back to index.html', async () => {
    const { handlers, sandbox } = boot();
    await wait(handlers.install!);
    const post = fetchEv('https://x.test/demo/api', 'cors', 'POST');
    handlers.fetch!(post.ev);
    expect(post.res()).toBeUndefined();
    const cross = fetchEv('https://other.test/x.js');
    handlers.fetch!(cross.ev);
    expect(cross.res()).toBeUndefined();
    sandbox.fetch.mockRejectedValue(new Error('offline'));
    const nav = fetchEv('https://x.test/demo/unknown-route', 'navigate');
    handlers.fetch!(nav.ev);
    expect(await nav.res()).toBe('body:./index.html');
    const asset = fetchEv('https://x.test/demo/nope.png');
    handlers.fetch!(asset.ev);
    await expect(asset.res()).rejects.toThrow('offline');
  });

  describe('content packs (assets/packs/*.json) are network-first', () => {
    const pack = 'https://x.test/demo/assets/packs/q.json';
    const res = (body: string, ok = true) => ({ ok, body, clone: () => ({ ok, body }) });
    it('serves the fresh network copy and refreshes the cache (no code release needed)', async () => {
      const { handlers, sandbox, stores } = boot();
      await wait(handlers.install!);
      stores.get('naija-demo-v2')!.set('./assets/packs/q.json', 'old');
      sandbox.fetch.mockResolvedValue(res('fresh') as never);
      const e = fetchEv(pack);
      handlers.fetch!(e.ev);
      expect(((await e.res()) as { body: string }).body).toBe('fresh');
      expect(stores.get('naija-demo-v2')!.get('./assets/packs/q.json')).toBe('fresh');
    });
    it('falls back to the cached pack offline, or on a server error, and never caches a token', async () => {
      const { handlers, sandbox, stores } = boot();
      await wait(handlers.install!);
      stores.get('naija-demo-v2')!.set('./assets/packs/q.json', 'cached');
      sandbox.fetch.mockRejectedValue(new Error('offline'));
      const off = fetchEv(pack + '?token=secret');
      handlers.fetch!(off.ev);
      expect(await off.res()).toBe('cached');
      sandbox.fetch.mockResolvedValue(res('boom', false) as never);
      const bad = fetchEv(pack);
      handlers.fetch!(bad.ev);
      expect(await bad.res()).toBe('cached');
      expect([...stores.get('naija-demo-v2')!.keys()].some((k) => k.includes('token'))).toBe(false);
    });
    it('returns the error response when nothing is cached, and rejects when offline with no copy', async () => {
      const { handlers, sandbox } = boot();
      const other = 'https://x.test/demo/assets/packs/none.json';
      sandbox.fetch.mockResolvedValue(res('404', false) as never);
      const a = fetchEv(other);
      handlers.fetch!(a.ev);
      expect(((await a.res()) as { body: string }).body).toBe('404');
      sandbox.fetch.mockRejectedValue(new Error('offline'));
      const b = fetchEv(other);
      handlers.fetch!(b.ev);
      await expect(b.res()).rejects.toThrow('offline');
    });
  });
});
