import { describe, expect, it } from 'vitest';
import { PERSONAS } from '../ai';
import en from './en.json';
import pcm from './pcm.json';

type Entry = string | { text: string; _review?: boolean };
const text = (e: Entry | undefined): string => (typeof e === 'string' ? e : (e?.text ?? ''));
const review = (e: Entry | undefined): boolean => typeof e === 'object' && e._review === true;
const E = en as Record<string, Entry>;
const P = pcm as Record<string, Entry>;

describe('Sabi Quiz copy', () => {
  it('every banter line a persona can say exists in English and Pidgin', () => {
    for (const p of PERSONAS) {
      expect(E[p.nameKey], `${p.id} name`).toBeDefined();
      for (const [event, keys] of Object.entries(p.banter)) {
        for (const k of keys ?? []) {
          expect(text(E[k]).length, `en ${p.id}.${event} ${k}`).toBeGreaterThan(3);
          expect(text(P[k]).length, `pcm ${p.id}.${event} ${k}`).toBeGreaterThan(3);
        }
      }
    }
  });

  it('the host, Dung and Aisha lines are all there: Etim 8, Dung 8, Aisha 12, Chidi 6', () => {
    for (let n = 1; n <= 8; n++) {
      expect(E[`persona.etim.${n}`], `etim ${n}`).toBeDefined();
      expect(E[`persona.dung.${n}`], `dung ${n}`).toBeDefined();
      expect(E[`persona.aisha.${n}`], `aisha ${n}`).toBeDefined();
    }
    for (let n = 9; n <= 12; n++) expect(E[`persona.aisha.${n}`], `aisha ${n}`).toBeDefined();
    for (let n = 1; n <= 6; n++) expect(E[`sq.banter.chidi.${n}`], `chidi ${n}`).toBeDefined();
  });

  it('Pidgin lines the brief marks uncertain, and the Igbo "Ndo", are flagged for a human', () => {
    for (const k of [
      'persona.etim.1',
      'persona.etim.4',
      'persona.dung.1',
      'persona.aisha.5',
      'sq.banter.chidi.5',
    ]) {
      expect(review(P[k]), `pcm ${k}`).toBe(true);
    }
    expect(text(E['sq.banter.chidi.5'])).toContain('Ndo');
  });

  it('the how-to names the streak tiers, the lifeline keys and the duel', () => {
    const all = [1, 2, 3, 4, 5].map((n) => text(E[`game.howto.${n}`])).join(' ');
    expect(all).toMatch(/x2 at 3/);
    expect(all).toMatch(/x5 at 8/);
    expect(all).toMatch(/50\/50/);
    expect(all).toMatch(/Quiz Duel/);
    expect(all).toMatch(/Daily Challenge/);
  });

  it('nothing tells the player about review status', () => {
    const all = Object.values(E).map(text).join(' ').toLowerCase();
    expect(all).not.toMatch(/reviewed|fact-check|unverified/);
  });
});
