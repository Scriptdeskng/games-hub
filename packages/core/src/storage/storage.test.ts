import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertSafeKey, createStorage } from './index';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('storage', () => {
  it('namespaces keys and round-trips JSON', () => {
    const s = createStorage('game-a');
    expect(s.persistent).toBe(true);
    s.set('best', { easy: 5 });
    expect(s.get('best', null)).toEqual({ easy: 5 });
    expect(localStorage.getItem('naija:game-a:best')).toBe('{"easy":5}');
    expect(createStorage('game-b').get('best', 'none')).toBe('none');
    s.remove('best');
    expect(s.get('best', 'gone')).toBe('gone');
  });
  it('returns the fallback for corrupt JSON', () => {
    localStorage.setItem('naija:g:x', '{oops');
    expect(createStorage('g').get('x', 7)).toBe(7);
  });
  it('rejects keys that look like phone numbers or tokens', () => {
    for (const bad of [
      '08012345678',
      'user_token',
      'msisdn',
      'phone-no',
      'a b',
      '',
      'x'.repeat(70),
    ]) {
      expect(() => assertSafeKey(bad), bad).toThrow();
    }
    expect(() => assertSafeKey('settings')).not.toThrow();
    expect(() => createStorage('2348012345678')).toThrow();
    expect(() => createStorage('g').set('token', 1)).toThrow();
  });
  it('falls back to memory when localStorage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const s = createStorage('g');
    expect(s.persistent).toBe(false);
    expect(s.set('k', 1)).toBe(false);
    expect(s.get('k', 0)).toBe(1); // still readable this session
    s.remove('k');
    expect(s.get('k', 0)).toBe(0);
  });
  it('survives getItem/setItem throwing after a successful probe', () => {
    const s = createStorage('g');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('boom');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(s.set('k', 2)).toBe(false);
    expect(s.get('k', 0)).toBe(2);
    expect(() => s.remove('k')).not.toThrow();
  });
});
