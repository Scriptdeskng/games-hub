import { describe, expect, it } from 'vitest';
import { PACKS_ON_DISK } from './fixtures';
import { displayOf, gridWord, titleCase } from './words';

describe('word-list display: one casing rule (QA DEF-20)', () => {
  it('titleCase makes BANGA into Banga and leaves one letter alone', () => {
    expect(titleCase('BANGA')).toBe('Banga');
    expect(titleCase('A')).toBe('A');
  });
  it('an untagged word is Title case; a tagged word shows its tag exactly as written', () => {
    expect(displayOf({ word: 'BANGA' })).toBe('Banga');
    expect(displayOf({ word: 'banga' })).toBe('Banga');
    expect(displayOf({ word: 'ASOOKE', tags: ['display:Aṣọ òkè', 'uncertain'] })).toBe('Aṣọ òkè');
    expect(displayOf({ word: 'FCT', tags: ['display:FCT'] })).toBe('FCT');
    expect(displayOf({ word: 'EBA', tags: ['display: '] })).toBe('Eba');
  });
  it('in every shipped pack no word is shown in capitals unless its tag says so (acronyms)', () => {
    const caps: string[] = [];
    for (const p of PACKS_ON_DISK) {
      for (const w of p.words) {
        const shown = displayOf(w);
        expect(/^\p{Lu}/u.test(shown), `${p.id} ${shown}`).toBe(true);
        const tagged = w.tags?.some((t) => t.startsWith('display:'));
        if (!tagged) expect(shown, w.word).toBe(titleCase(gridWord(w)));
        else if (shown === shown.toUpperCase() && shown.length > 1) caps.push(shown);
      }
    }
    // the acronyms, and nothing else, are all-capitals
    expect(caps.sort()).toEqual(['FCT', 'NEPA', 'VAR']);
  });
});
