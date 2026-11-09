import { DIRS } from './config';
import { cellIndex, runCells } from './grid';

export interface Occurrence {
  /** cells in reading order of the word as found in the grid */
  cells: number[];
}

/**
 * Exhaustive solver: every place `word` can be read in the grid, in any of the eight directions.
 * Independent of how the puzzle was built. A palindrome (or a single read that is the reverse of
 * another) is the same placement, so occurrences are de-duplicated by their set of cells.
 */
export function findWord(letters: string, n: number, word: string): Occurrence[] {
  const out: Occurrence[] = [];
  const seen = new Set<string>();
  const len = word.length;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (letters[cellIndex(n, r, c)] !== word[0]) continue;
      for (const d of DIRS) {
        const cells = runCells(n, r, c, d.id, len);
        if (!cells) continue;
        let ok = true;
        for (let k = 1; k < len && ok; k++) ok = letters[cells[k] as number] === word[k];
        if (!ok) continue;
        const key = [...cells].sort((a, b) => a - b).join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ cells });
      }
    }
  }
  return out;
}

/** Occurrences of every word: `result[i]` belongs to `words[i]`. */
export const solveAll = (letters: string, n: number, words: readonly string[]): Occurrence[][] =>
  words.map((w) => findWord(letters, n, w));
