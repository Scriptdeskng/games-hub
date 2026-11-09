import type { WordEntry, WordPack } from '@naija/core/content';
import { containsBlocked, type Blocked } from './blocklist';
import { reverse } from './grid';

/** Letters of a pack word as the grid uses them: uppercase A-Z. */
export const gridWord = (e: WordEntry): string => e.word.toUpperCase();

/** The pretty form from a `display:` tag ("Port Harcourt"), or the plain word. */
export function displayOf(e: WordEntry): string {
  const tag = e.tags?.find((t) => t.startsWith('display:'));
  const text = tag ? tag.slice('display:'.length).trim() : '';
  return text || gridWord(e);
}

/** Words of a pack the grid can use at this length range: right form, none containing a blocked string. */
export function eligibleWords(
  pack: WordPack,
  minLen: number,
  maxLen: number,
  blocked: Blocked,
): WordEntry[] {
  const seen = new Set<string>();
  return pack.words.filter((e) => {
    const w = gridWord(e);
    if (!/^[A-Z]+$/.test(w) || w.length < minLen || w.length > maxLen) return false;
    if (seen.has(w) || containsBlocked(w, blocked)) return false;
    seen.add(w);
    return true;
  });
}

/** True when one word is hidden inside the other (either way round): they could not both be unique. */
export function overlapsAsText(a: string, b: string): boolean {
  return a.includes(b) || b.includes(a) || a.includes(reverse(b)) || reverse(b).includes(a);
}
