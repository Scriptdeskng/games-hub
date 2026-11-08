import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPack } from './loader';
import { validateQuizPack } from './validate';
import { quizPack } from './fixtures';

const json = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('loadPack', () => {
  it('returns the validated pack and asks the HTTP cache to revalidate', async () => {
    const f = vi.fn().mockResolvedValue(json(quizPack()));
    const r = await loadPack('./assets/packs/q.json', validateQuizPack, { fetchImpl: f });
    expect(r.ok && r.pack.id).toBe('sabi-quiz-en');
    expect(f.mock.calls[0]![1]).toMatchObject({ cache: 'no-cache' });
  });
  it('uses global fetch by default', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(quizPack())));
    expect((await loadPack('x', validateQuizPack)).ok).toBe(true);
  });
  it('reports missing fetch', async () => {
    vi.stubGlobal('fetch', undefined);
    const r = await loadPack('x', validateQuizPack);
    expect(!r.ok && r.reason).toBe('network');
  });
  it('reports http errors with the status', async () => {
    const r = await loadPack('x', validateQuizPack, { fetchImpl: async () => json({}, 404) });
    expect(r).toMatchObject({ ok: false, reason: 'http', status: 404 });
  });
  it('reports invalid JSON as parse', async () => {
    const bad = { ok: true, status: 200, json: async () => Promise.reject(new SyntaxError('x')) };
    const r = await loadPack('x', validateQuizPack, {
      fetchImpl: async () => bad as unknown as Response,
    });
    expect(!r.ok && r.reason).toBe('parse');
  });
  it('reports schema failures as invalid with the error list', async () => {
    const r = await loadPack('x', validateQuizPack, {
      fetchImpl: async () => json(quizPack({ version: 9 })),
    });
    expect(r).toMatchObject({ ok: false, reason: 'invalid' });
    expect(!r.ok && r.errors?.[0]).toContain('version');
  });
  it('treats a throwing validator as invalid', async () => {
    const r = await loadPack(
      'x',
      () => {
        throw new Error('boom');
      },
      { fetchImpl: async () => json({}) },
    );
    expect(!r.ok && r.reason).toBe('invalid');
  });
  it('reports network failures (Error and non-Error) without throwing', async () => {
    const a = await loadPack('x', validateQuizPack, {
      fetchImpl: async () => Promise.reject(new Error('offline')),
    });
    expect(a).toMatchObject({ ok: false, reason: 'network', message: 'offline' });
    const b = await loadPack('x', validateQuizPack, {
      fetchImpl: async () => Promise.reject('nope'),
    });
    expect(b).toMatchObject({ ok: false, reason: 'network', message: 'nope' });
  });
  it('times out a hung request', async () => {
    vi.useFakeTimers();
    const hung = (_u: unknown, init?: RequestInit) =>
      new Promise<Response>((_res, rej) =>
        init?.signal?.addEventListener('abort', () => rej(new Error('aborted'))),
      );
    const p = loadPack('x', validateQuizPack, { fetchImpl: hung as typeof fetch, timeoutMs: 50 });
    await vi.advanceTimersByTimeAsync(60);
    expect(await p).toMatchObject({ ok: false, reason: 'timeout' });
  });
  it('reports a timeout that hits while the body is downloading', async () => {
    vi.useFakeTimers();
    const slow = {
      ok: true,
      status: 200,
      json: () => new Promise((_r, rej) => setTimeout(() => rej(new Error('abort')), 100)),
    };
    const p = loadPack('x', validateQuizPack, {
      fetchImpl: async () => slow as unknown as Response,
      timeoutMs: 50,
    });
    await vi.advanceTimersByTimeAsync(120);
    expect(await p).toMatchObject({ ok: false, reason: 'timeout' });
  });
});
