import { validateWordPack } from '@naija/core/content';
import { describe, expect, it } from 'vitest';
import { scanBlocked } from './blocklist';
import { MIN_BLOCKLIST, mergeBlocklist, unsafeWord } from './blocklist';
import { DIFFICULTIES, PROFILES } from './config';
import {
  MAX_ATTEMPTS,
  blockedOutsideWords,
  generatePuzzle,
  generateWithFallback,
  verifyPuzzle,
} from './generator';
import { PACKS_ON_DISK, toyPack } from './fixtures';
import { findWord } from './solver';

const packs = PACKS_ON_DISK;
/** A fixed list of vulgar strings, independent of any shipped blocklist (QA SW-01). */
const NASTY = mergeBlocklist(
  `ASS POO HOE TIT TITS SLAG THOT NIGG KNOB SHAG BOOB BUTT HOMO PIMP TWAT WANK PRICK JIZZ PISS CRAP TURD
  SEX SEXY PORN FAG FAGS DYKE SPIC KIKE GOOK RAPE YANSH FUCK SHIT CUNT DICK COCK BITCH SLUT WHORE PENIS ARSE
  ANAL JEW WOP GYP DAGO CLIT MILF SEMEN BOOTY ORAL GAY BET SLOT DICE ODDS STAKE WAGER POKER GUN COKE DRUG
  HEMP AKATA OLODO SHEGE OYINBO OYIBO NEGRO SAMBO WETBACK HONKY JAP SPAZ LESBO TRANNY INCEST ORGY ORGASM
  WEED DOPE METH HEROIN OPIUM CANNABIS JACKPOT ROULETTE BOOKIE PUNTER GAMBLE LOTTERY GUNS KILL GORE STAB
  NYASH MUMU OLOSHO IDIOT MORON STUPID VOMIT POOP FART`.split(/\s+/),
);

describe('generator over every shipped pack', () => {
  it('has six packs that validate', () => {
    expect(packs).toHaveLength(6);
    for (const p of packs) expect(validateWordPack(p).ok, p.id).toBe(true);
  });
  it('the built-in and pack blocklists never remove a real pack word', () => {
    const b = mergeBlocklist(undefined);
    for (const p of packs) {
      const own = mergeBlocklist(p.blocklist);
      for (const w of p.words) {
        expect(unsafeWord(w.word.toUpperCase(), b), w.word).toBe(false);
        expect(unsafeWord(w.word.toUpperCase(), own), w.word).toBe(false);
      }
    }
    expect(MIN_BLOCKLIST.length).toBeGreaterThan(40);
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
          // QA SW-01 regression: none of these ever appears except inside a placed word (PASS, BRASS)
          expect(blockedOutsideWords(pz, NASTY), `seed ${seed}`).toEqual([]);
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
      'XFUCKERX',
    ];
    for (let seed = 1; seed <= 20; seed++) {
      const r = generatePuzzle({ pack: toyPack(words), difficulty: 'easy', seed });
      if (!r.ok) throw new Error('gen');
      expect(r.puzzle.words.map((w) => w.word)).not.toContain('XFUCKERX');
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

describe('short blocked strings and pack words (QA SW-01)', () => {
  const words = [
    'PASS',
    'BRASS',
    'CLASS',
    'SHOES',
    'BUTTON',
    'LAGOS',
    'ABUJA',
    'KANO',
    'ENUGU',
    'OSUN',
    'ONDO',
    'BENUE',
    'YOBE',
    'ABIA',
    'DELTA',
    'RIVERS',
  ];
  it('ASS may appear inside PASS and friends but never through a filler letter', () => {
    let inside = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const r = generatePuzzle({ pack: toyPack(words), difficulty: 'hard', seed, size: 12 });
      if (!r.ok) throw new Error('gen');
      expect(blockedOutsideWords(r.puzzle, mergeBlocklist(undefined)), `seed ${seed}`).toEqual([]);
      const placed = r.puzzle.words.map((w) => w.word);
      if (placed.includes('PASS') || placed.includes('BRASS') || placed.includes('CLASS')) inside++;
    }
    expect(inside).toBeGreaterThan(20);
  });
  it('a pack word that is, or holds, a long blocked string is never picked; short ones are allowed', () => {
    const b = mergeBlocklist(['LAGOSX']);
    expect(unsafeWord('PASS', b)).toBe(false);
    expect(unsafeWord('BUTTON', b)).toBe(false);
    expect(unsafeWord('ASS', b)).toBe(true);
    expect(unsafeWord('XLAGOSXY', b)).toBe(true);
    expect(unsafeWord('YXSOGAL', b)).toBe(true);
  });
  it('two placed words that meet so that together they spell a blocked string never ship (constructed pack)', () => {
    // blocklist QZX; the words AQZ and XBC placed end to end in one line would spell QZX with letters
    // that are all "placed": redrawing filler cannot fix that, so the generator must discard the attempt
    const six = ['AQZ', 'XBC', 'MNO', 'PDE', 'FGH', 'IJL'];
    const block = mergeBlocklist(['QZX']);
    let retried = 0;
    for (let seed = 1; seed <= 600; seed++) {
      const r = generatePuzzle({ pack: toyPack(six, ['QZX']), difficulty: 'easy', seed, size: 6 });
      if (!r.ok) throw new Error('gen');
      if (r.attempts > 1) retried++;
      expect(r.puzzle.words.map((w) => w.word).sort(), `seed ${seed}`).toEqual([...six].sort());
      expect(blockedOutsideWords(r.puzzle, block), `seed ${seed}`).toEqual([]);
    }
    expect(retried).toBeGreaterThan(0); // the meeting did happen: those attempts were thrown away
  });
  it('the contested strings are in the built-in list as filler-avoid entries', () => {
    const all = mergeBlocklist(undefined).all;
    for (const w of 'GAY ORAL BET GUN COKE DRUG HEMP AKATA OLODO SHEGE OYINBO ANAL JEW WOP GYP DAGO CLIT MILF SEMEN BOOTY SLOT DICE ODDS STAKE WAGER POKER'.split(
      ' ',
    ))
      expect(all.has(w), w).toBe(true);
  });
});

describe('generateWithFallback (QA WARN-3)', () => {
  it('football-terms at Hard 8x8 builds for 300 seeds', () => {
    const pack = packs.find((p) => p.id === 'football-terms')!;
    for (let seed = 1; seed <= 300; seed++) {
      const r = generateWithFallback({ pack, difficulty: 'hard', seed, size: 8 });
      expect(r.ok, `seed ${seed}`).toBe(true);
      if (r.ok) expect(verifyPuzzle(r.puzzle, pack.blocklist)).toEqual([]);
    }
  });
  it('steps up to a bigger grid when a small one cannot hold the words, and is deterministic', () => {
    const long = [
      'ABCDEFGH',
      'IJKLMNOP',
      'QRSTUVWX',
      'YZABCDEF',
      'GHIJKLMN',
      'OPQRSTUV',
      'WXYZABCD',
      'EFGHIJKL',
      'MNOPQRST',
      'UVWXYZAB',
      'CDEFGHIJ',
      'KLMNOPQR',
    ];
    const a = generateWithFallback({ pack: toyPack(long), difficulty: 'hard', seed: 3, size: 8 });
    const b = generateWithFallback({ pack: toyPack(long), difficulty: 'hard', seed: 3, size: 8 });
    expect(a).toEqual(b);
    expect(a.ok).toBe(true);
    if (a.ok) expect(a.puzzle.size).toBeGreaterThanOrEqual(8);
  });
  it('reports a pack with too few words instead of throwing', () => {
    const r = generateWithFallback({
      pack: toyPack(['LAGOS', 'KANO']),
      difficulty: 'easy',
      seed: 1,
    });
    expect(r.ok).toBe(false);
  });
});
