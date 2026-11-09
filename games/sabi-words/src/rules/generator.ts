import type { WordPack } from '@naija/core/content';
import { createRng, type Rng } from '@naija/core/rng';
import { mergeBlocklist, scanBlocked, type Blocked } from './blocklist';
import { PROFILES, type Difficulty, type DirId, type Profile } from './config';
import { runCells } from './grid';
import { findWord } from './solver';
import { displayOf, eligibleWords, gridWord, overlapsAsText } from './words';

export interface PlacedWord {
  /** the letters in the grid, A-Z */
  word: string;
  /** what the word list shows ("Port Harcourt"); equals `word` when the pack has no display form */
  display: string;
  hint: string;
  /** first letter's cell, and the direction the word runs in */
  r: number;
  c: number;
  dir: DirId;
}

/** A finished puzzle: plain data, JSON-safe. `letters` is row-major, size x size. */
export interface Puzzle {
  packId: string;
  seed: number;
  difficulty: Difficulty;
  size: number;
  letters: string;
  words: PlacedWord[];
}

export interface GenInput {
  pack: WordPack;
  difficulty: Difficulty;
  seed: number;
  /** grid size; defaults to the difficulty's own (the view may step a big grid down on a tiny screen) */
  size?: number;
}

export type GenResult =
  { ok: true; puzzle: Puzzle; attempts: number } | { ok: false; reason: string };

/** Whole-grid attempts (new words and placement each time) and filler redraws inside one attempt. */
export const MAX_ATTEMPTS = 40;
export const REDRAW_CAP = 400;

const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** The profile a grid of this size is built with (words never longer than the grid). */
export function profileFor(difficulty: Difficulty, size?: number): Profile {
  const p = PROFILES[difficulty];
  const n = size ?? p.size;
  return { ...p, size: n, maxLen: Math.min(p.maxLen, n) };
}

function pickWords(pack: WordPack, p: Profile, rng: Rng, blocked: Blocked): string[] {
  const pool = rng.shuffle(eligibleWords(pack, p.minLen, p.maxLen, blocked).map(gridWord));
  const chosen: string[] = [];
  for (const w of pool) {
    if (chosen.length === p.words) break;
    if (chosen.some((o) => overlapsAsText(w, o))) continue;
    chosen.push(w);
  }
  return chosen;
}

/** Place longest first, each in a random allowed direction, where letters agree on shared cells. */
function place(words: string[], p: Profile, rng: Rng): { grid: string[]; at: PlacedWord[] } | null {
  const n = p.size;
  const grid: string[] = Array<string>(n * n).fill('');
  const at: PlacedWord[] = [];
  for (const w of [...words].sort((a, b) => b.length - a.length)) {
    let done = false;
    for (const dir of rng.shuffle(p.dirs)) {
      const options: { r: number; c: number; cells: number[] }[] = [];
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const cells = runCells(n, r, c, dir, w.length);
          if (cells && cells.every((cell, k) => grid[cell] === '' || grid[cell] === w[k])) {
            options.push({ r, c, cells });
          }
        }
      }
      if (!options.length) continue;
      const o = rng.pick(options);
      o.cells.forEach((cell, k) => (grid[cell] = w[k] as string));
      at.push({ word: w, display: w, hint: '', r: o.r, c: o.c, dir });
      done = true;
      break;
    }
    if (!done) return null;
  }
  return { grid, at };
}

/** One attempt: place, fill, then repair blocked strings and duplicate words by redrawing filler only. */
function attempt(
  pack: WordPack,
  p: Profile,
  blocked: Blocked,
  rng: Rng,
): Pick<Puzzle, 'letters' | 'words'> | null {
  const n = p.size;
  const words = pickWords(pack, p, rng, blocked);
  if (words.length < p.words) return null;
  const placed = place(words, p, rng);
  if (!placed) return null;
  const { grid, at } = placed;
  const locked = new Set<number>();
  for (const w of at) {
    for (const cell of runCells(n, w.r, w.c, w.dir, w.word.length) as number[]) locked.add(cell);
  }
  const fillerPool = words.join('');
  const draw = (): string => (rng.chance(0.55) ? rng.pick([...fillerPool]) : rng.pick([...A]));
  for (let i = 0; i < n * n; i++) if (grid[i] === '') grid[i] = draw();

  const ownKey = new Map(
    at.map((w) => [
      w.word,
      (runCells(n, w.r, w.c, w.dir, w.word.length) as number[]).sort((a, b) => a - b).join(','),
    ]),
  );
  for (let iter = 0; iter < REDRAW_CAP; iter++) {
    const letters = grid.join('');
    const bad: number[][] = scanBlocked(letters, n, blocked);
    for (const w of at) {
      for (const occ of findWord(letters, n, w.word)) {
        if ([...occ.cells].sort((a, b) => a - b).join(',') !== ownKey.get(w.word)) {
          bad.push(occ.cells);
        }
      }
    }
    if (!bad.length) {
      const shown = at
        .map((w) => {
          const e = pack.words.find((x) => gridWord(x) === w.word);
          return { ...w, display: e ? displayOf(e) : w.word, hint: e?.hint ?? '' };
        })
        .sort((a, b) => a.display.localeCompare(b.display, 'en'));
      return { letters, words: shown };
    }
    for (const cells of bad) {
      const free = cells.filter((cell) => !locked.has(cell));
      // a bad string made only of placed letters cannot be fixed by redrawing filler: new attempt
      if (!free.length) return null;
      const cell = rng.pick(free);
      let next = draw();
      if (next === grid[cell]) next = rng.pick([...A]);
      grid[cell] = next;
    }
  }
  return null;
}

/**
 * Build a puzzle. Deterministic for the same pack, difficulty, size and seed. Every word is placed
 * exactly once (an exhaustive search of the finished grid finds one occurrence of each), and no
 * blocked string (built-in list + the pack's `blocklist`, forwards or backwards, in any row,
 * column or diagonal) appears anywhere. Filler is redrawn; placed words are never moved except by
 * starting a whole new attempt.
 */
export function generatePuzzle(input: GenInput): GenResult {
  const p = profileFor(input.difficulty, input.size);
  const blocked = mergeBlocklist(input.pack.blocklist);
  if (eligibleWords(input.pack, p.minLen, p.maxLen, blocked).length < p.words) {
    return { ok: false, reason: 'pack has too few usable words for this level' };
  }
  for (let k = 0; k < MAX_ATTEMPTS; k++) {
    const rng = createRng((input.seed ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0);
    const built = attempt(input.pack, p, blocked, rng);
    if (built) {
      const puzzle: Puzzle = {
        packId: input.pack.id,
        seed: input.seed >>> 0,
        difficulty: input.difficulty,
        size: p.size,
        ...built,
      };
      return { ok: true, attempts: k + 1, puzzle };
    }
  }
  return { ok: false, reason: 'no valid grid within the attempt cap' };
}

/** Everything wrong with a puzzle, for tests and for a defensive check of loaded saves. Empty = fine. */
export function verifyPuzzle(puzzle: Puzzle, blocklist?: readonly string[]): string[] {
  const n = puzzle.size;
  const problems: string[] = [];
  if (puzzle.letters.length !== n * n || !/^[A-Z]+$/.test(puzzle.letters)) {
    problems.push('letters are not an n x n block of A-Z');
    return problems;
  }
  for (const w of puzzle.words) {
    const cells = runCells(n, w.r, w.c, w.dir, w.word.length);
    if (!cells) problems.push(`${w.word} leaves the grid`);
    else if (cells.some((cell, k) => puzzle.letters[cell] !== w.word[k]))
      problems.push(`${w.word} is not spelled where it was placed`);
    const found = findWord(puzzle.letters, n, w.word);
    if (found.length !== 1) problems.push(`${w.word} appears ${found.length} times`);
  }
  const hits = scanBlocked(puzzle.letters, n, mergeBlocklist(blocklist));
  if (hits.length) problems.push(`blocked string at ${hits[0]?.join(',')}`);
  return problems;
}
