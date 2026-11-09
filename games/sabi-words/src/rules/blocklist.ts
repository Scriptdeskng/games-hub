import { allLines, reverse } from './grid';
import minList from './min-blocklist.json';

/**
 * Built-in minimum blocklist (`min-blocklist.json`, the same 291 strings as every pack's own
 * `blocklist`; the pack checker keeps them in step), merged with the pack's list. Uppercase A-Z.
 * Over-blocking is harmless: a blocked string that uses a filler letter only makes the generator
 * redraw that letter. It covers vulgar, sexual, slur, drug, gambling and violence terms in English
 * and Pidgin. Contested entries (GAY, ORAL, BET, GUN, COKE, DRUG, HEMP, AKATA, OLODO, SHEGE,
 * OYINBO) are filler-avoid only: humans decide whether any should be hard-blocked as pack words.
 */
export const MIN_BLOCKLIST: readonly string[] = minList;

/**
 * Blocked strings of this many letters or fewer may sit INSIDE a pack word (ASS in PASS, TIT in
 * STITCH): pack words are reviewed by a human, and the generator refuses every occurrence that
 * uses a filler letter. Longer ones may not: a word containing one is never picked.
 */
export const EMBED_MAX = 4;

/** Uppercase A-Z only, 3 or more letters; anything else in a list is ignored. */
export function normalizeBlocklist(list: readonly string[] | undefined): string[] {
  const out = new Set<string>();
  for (const raw of list ?? []) {
    const w = String(raw).toUpperCase();
    if (/^[A-Z]{3,}$/.test(w)) out.add(w);
  }
  return [...out];
}

/** The set the generator checks: built-in floor + pack list, each in both reading directions. */
export interface Blocked {
  /** entries and their reversals */
  all: ReadonlySet<string>;
  /** distinct entry lengths, ascending */
  lengths: readonly number[];
}

export function mergeBlocklist(packList: readonly string[] | undefined): Blocked {
  const all = new Set<string>();
  for (const w of [...MIN_BLOCKLIST, ...normalizeBlocklist(packList)]) {
    all.add(w);
    all.add(reverse(w));
  }
  const lengths = [...new Set([...all].map((w) => w.length))].sort((a, b) => a - b);
  return { all, lengths };
}

/**
 * A pack word the grid must not use: it IS a blocked string, or it contains one longer than
 * EMBED_MAX letters (forwards or backwards). Short blocked strings inside a word are allowed.
 */
export function unsafeWord(word: string, b: Blocked): boolean {
  if (b.all.has(word)) return true;
  for (const len of b.lengths) {
    if (len <= EMBED_MAX) continue;
    for (let i = 0; i + len <= word.length; i++) if (b.all.has(word.substr(i, len))) return true;
  }
  return false;
}

/** Does `text` contain a blocked string, forwards or backwards? */
export function containsBlocked(text: string, b: Blocked): boolean {
  for (const len of b.lengths) {
    for (let i = 0; i + len <= text.length; i++) if (b.all.has(text.substr(i, len))) return true;
  }
  return false;
}

/** Every blocked occurrence in the grid: the cells of each one. Rows, columns and both diagonals. */
export function scanBlocked(letters: string, n: number, b: Blocked): number[][] {
  const hits: number[][] = [];
  for (const line of allLines(n)) {
    const text = line.map((i) => letters[i]).join('');
    for (const len of b.lengths) {
      for (let i = 0; i + len <= line.length; i++) {
        if (b.all.has(text.substr(i, len))) hits.push(line.slice(i, i + len));
      }
    }
  }
  return hits;
}
