import { validateWordPack } from '@naija/core/content';
import { describe, expect, it } from 'vitest';
import { scanBlocked } from './blocklist';
import { MIN_BLOCKLIST, mergeBlocklist, containsBlocked } from './blocklist';
import { DIFFICULTIES, PROFILES } from './config';
import { generatePuzzle, verifyPuzzle, MAX_ATTEMPTS } from './generator';
import { PACKS_ON_DISK, toyPack } from './fixtures';
import { findWord } from './solver';

const packs = PACKS_ON_DISK;

describe('generator over every shipped pack', () => {
  it('has six packs that validate', () => {
    expect(packs).toHaveLength(6);
    for (const p of packs) expect(validateWordPack(p).ok, p.id).toBe(true);
  });
  it('the built-in blocklist never removes a real pack word', () => {
    const b = mergeBlocklist(undefined);
    for (const p of packs)
      for (const w of p.words) expect(containsBlocked(w.word.toUpperCase(), b), w.word).toBe(false);
    expect(MIN_BLOCKLIST.length).toBeGreaterThan(10);
  });
  for (const p of packs) {
    for (const d of DIFFICULTIES) {
      it(`${p.id} / ${d}: 200 seeded puzzles are solvable, clean and unique`, () => {
        const prof = PROFILES[d];
        for (let seed = 1; seed <= 200; seed++) {
          const r = generatePuzzle({ pack: p, difficulty: d, seed });
          if (!r.ok) throw new Error(`${p.id} ${d} seed ${seed}: ${r.reason}`);
          expect(r.attempts).toBeLessThanOrEqual(MAX_ATTEMPTS);
          const pz = r.puzzle;
          expect(pz.size).toBe(prof.size);
          expect(pz.words).toHaveLength(prof.words);
          expect(verifyPuzzle(pz, p.blocklist), `seed ${seed}`).toEqual([]);
          for (const w of pz.words) {
            expect(findWord(pz.letters, pz.size, w.word)).toHaveLength(1);
            expect(prof.dirs).toContain(w.dir);
          }
        }
      }, 120_000);
    }
  }
});

describe('generator behaviour', () => {
  const pack = packs[0]!;
  it('is deterministic for a seed and different for another', () => {
    const a = generatePuzzle({ pack, difficulty: 'hard', seed: 5 });
    const b = generatePuzzle({ pack, difficulty: 'hard', seed: 5 });
    const c = generatePuzzle({ pack, difficulty: 'hard', seed: 6 });
    expect(a).toEqual(b);
    expect(a.ok && c.ok && a.puzzle.letters !== c.puzzle.letters).toBe(true);
  });
  it('output is JSON-safe (serializable)', () => {
    const r = generatePuzzle({ pack, difficulty: 'medium', seed: 9 });
    if (!r.ok) throw new Error('gen');
    expect(JSON.parse(JSON.stringify(r.puzzle))).toEqual(r.puzzle);
  });
  it('honours a smaller grid size and never uses a word longer than it', () => {
    const r = generatePuzzle({ pack, difficulty: 'hard', seed: 3, size: 10 });
    if (!r.ok) throw new Error('gen');
    expect(r.puzzle.size).toBe(10);
    expect(r.puzzle.letters).toHaveLength(100);
    expect(Math.max(...r.puzzle.words.map((w) => w.word.length))).toBeLessThanOrEqual(10);
  });
  it('merges the pack blocklist: a pack-only entry never appears, even backwards', () => {
    const words = [
      'LAGOS',
      'ABUJA',
      'KANO',
      'ENUGU',
      'OYO',
      'EDO',
      'OSUN',
      'ONDO',
      'BENUE',
      'YOBE',
      'ABIA',
      'IMO',
      'DELTA',
      'RIVERS',
    ];
    const banned = ['QXZ', 'ZZZ', 'JQ' + 'V'];
    for (let seed = 1; seed <= 30; seed++) {
      const r = generatePuzzle({ pack: toyPack(words, banned), difficulty: 'easy', seed });
      if (!r.ok) throw new Error('gen');
      expect(verifyPuzzle(r.puzzle, banned)).toEqual([]);
      expect(
        scanBlocked(r.puzzle.letters, 8, { all: new Set(['QXZ', 'ZXQ']), lengths: [3] }),
      ).toEqual([]);
    }
  });
  it('drops a pack word that contains a built-in blocked string instead of placing it', () => {
    const words = [
      'LAGOS',
      'ABUJA',
      'KANO',
      'ENUGU',
      'OYO',
      'EDO',
      'OSUN',
      'ONDO',
      'BENUE',
      'YOBE',
      'ABIA',
      'IMO',
      'DELTA',
      'RIVERS',
      'XFUCKX',
    ];
    for (let seed = 1; seed <= 20; seed++) {
      const r = generatePuzzle({ pack: toyPack(words), difficulty: 'easy', seed });
      if (!r.ok) throw new Error('gen');
      expect(r.puzzle.words.map((w) => w.word)).not.toContain('XFUCKX');
    }
  });
  it('refuses a pack with too few usable words, and never throws', () => {
    const r = generatePuzzle({
      pack: toyPack(['LAGOS', 'KANO', 'OYO']),
      difficulty: 'easy',
      seed: 1,
    });
    expect(r.ok).toBe(false);
  });
  it('does not place two words where one hides inside the other', () => {
    const words = [
      'RICE',
      'JOLLOFRICE',
      'SOUP',
      'EGUSI',
      'OGBONO',
      'AMALA',
      'EBA',
      'FUFU',
      'AKARA',
      'MOIMOI',
      'SUYA',
      'EKURU',
      'GARRI',
    ];
    for (let seed = 1; seed <= 40; seed++) {
      const r = generatePuzzle({ pack: toyPack(words), difficulty: 'hard', seed, size: 12 });
      if (!r.ok) throw new Error('gen');
      const ws = r.puzzle.words.map((w) => w.word);
      expect(ws.includes('RICE') && ws.includes('JOLLOFRICE')).toBe(false);
      expect(verifyPuzzle(r.puzzle)).toEqual([]);
    }
  });
  it('verifyPuzzle flags a broken grid', () => {
    const r = generatePuzzle({ pack, difficulty: 'easy', seed: 2 });
    if (!r.ok) throw new Error('gen');
    expect(verifyPuzzle({ ...r.puzzle, letters: 'abc' })).not.toEqual([]);
    const w = r.puzzle.words[0]!;
    const broken = { ...r.puzzle, words: [{ ...w, word: w.word.replace(/^./, 'Q') }] };
    expect(verifyPuzzle(broken).length).toBeGreaterThan(0);
    expect(verifyPuzzle({ ...r.puzzle, letters: 'FUCK'.padEnd(64, 'A') }).join(' ')).toContain(
      'blocked',
    );
  });
  it('uses the display tag and the hint, and sorts the list', () => {
    const r = generatePuzzle({
      pack: packs.find((p) => p.id === 'lagos-places')!,
      difficulty: 'medium',
      seed: 4,
    });
    if (!r.ok) throw new Error('gen');
    for (const w of r.puzzle.words) expect(w.hint.length).toBeGreaterThan(0);
    const names = r.puzzle.words.map((w) => w.display);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
  });
});
