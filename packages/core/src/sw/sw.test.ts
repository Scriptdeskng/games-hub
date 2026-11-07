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
});
