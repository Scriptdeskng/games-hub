import { describe, expect, it } from 'vitest';
import { OSAS } from '../ai/personas';
import { PACK_IDS } from '../content';
import en from './en.json';
import pcm from './pcm.json';

type Entry = string | { text: string; _review?: boolean };
const text = (e: Entry | undefined): string => (typeof e === 'string' ? e : (e?.text ?? ''));
const review = (e: Entry | undefined): boolean => typeof e === 'object' && e._review === true;
const E = en as Record<string, Entry>;
const P = pcm as Record<string, Entry>;

describe('Sabi Words copy', () => {
  it('every banter line Osas can say exists in English and Pidgin', () => {
    expect(E[OSAS.nameKey]).toBeDefined();
    for (const [event, keys] of Object.entries(OSAS.banter)) {
      for (const k of keys ?? []) {
        expect(text(E[k]).length, `en ${event} ${k}`).toBeGreaterThan(3);
        expect(text(P[k]).length, `pcm ${event} ${k}`).toBeGreaterThan(3);
      }
    }
  });
  it('persona.osas.1 to 8 are all there, and the lines the brief marks uncertain are flagged', () => {
    for (let n = 1; n <= 8; n++) expect(E[`persona.osas.${n}`], `osas ${n}`).toBeDefined();
    for (const n of [1, 2, 3, 5, 8]) expect(review(P[`persona.osas.${n}`]), `pcm ${n}`).toBe(true);
    for (const n of [4, 6, 7]) expect(review(P[`persona.osas.${n}`]), `pcm ${n}`).toBe(false);
    expect(text(E['persona.osas.1'])).toContain('Kóyo');
  });
  it('every pack has a name and a description in both languages', () => {
    for (const id of PACK_IDS)
      for (const part of ['name', 'desc']) {
        expect(text(E[`pack.${id}.${part}`]).length).toBeGreaterThan(2);
        expect(text(P[`pack.${id}.${part}`]).length).toBeGreaterThan(2);
      }
  });
  it('the how-to names swipe, tap, keyboard, hints, stars and the daily puzzle', () => {
    const all = [1, 2, 3, 4, 5].map((n) => text(E[`game.howto.${n}`])).join(' ');
    for (const w of [/Swipe/, /Tap/, /arrow keys/, /lantern/, /3 stars/, /Daily Puzzle/])
      expect(all).toMatch(w);
  });
  it('nothing tells the player about review status or money', () => {
    const all = Object.values(E).map(text).join(' ').toLowerCase();
    expect(all).not.toMatch(/reviewed|fact-check|unverified|naira|buy|purchase|prize/);
  });
});
