import { describe, expect, it } from 'vitest';
import en from './en.json';
import pcm from './pcm.json';

type Entry = string | { text: string; _review?: boolean };
const text = (e: Entry | undefined): string => (typeof e === 'string' ? e : (e?.text ?? ''));
const review = (e: Entry | undefined): boolean => typeof e === 'object' && e._review === true;
const E = en as Record<string, Entry>;
const P = pcm as Record<string, Entry>;

describe('Naija Whot copy (QA W-02, W-08, W-09)', () => {
  it('how-to step 4: a 2 defends a 2 and a 5 defends a 5, never "2 or 5"', () => {
    expect(text(E['game.howto.4'])).toMatch(/answer a 2 with another 2, or a 5 with another 5/);
    expect(text(P['game.howto.4'])).toMatch(/2 with another 2, or 5 with another 5/);
    for (const e of [E['game.howto.4'], P['game.howto.4']]) {
      expect(text(e)).not.toMatch(/another 2 or 5/);
    }
    expect(review(P['game.howto.4'])).toBe(true);
  });
  it('the results tile says whom the player caught, and the Pidgin line is flagged', () => {
    expect(text(E['results.catches'])).toBe('CPUs caught');
    expect(review(P['results.catches'])).toBe(true);
  });
  it('review markers: Tari suspension (pcm) and the Igbo "Ọ dị mma!" (en and pcm)', () => {
    expect(review(P['whot.banter.tari.suspension'])).toBe(true);
    expect(text(E['whot.banter.mama-nkechi.win'])).toContain('Ọ dị mma');
    expect(review(E['whot.banter.mama-nkechi.win'])).toBe(true);
    expect(review(P['whot.banter.mama-nkechi.win'])).toBe(true);
  });
  it('the calm late game and the count-up endings are explained in both languages', () => {
    for (const key of [
      'rules.calmLate',
      'rules.calmLate.help',
      'whot.calm',
      'results.endedBy.cap',
      'results.endedBy.market',
    ]) {
      expect(text(E[key]).length, `en ${key}`).toBeGreaterThan(5);
      expect(text(P[key]).length, `pcm ${key}`).toBeGreaterThan(5);
      expect(review(P[key]), `pcm ${key} flagged`).toBe(true);
    }
  });
});
