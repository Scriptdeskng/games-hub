import { allLines, reverse } from './grid';

/**
 * Built-in minimum blocklist, merged with the pack's own `blocklist`. Uppercase A-Z, long enough
 * that a real pack word never contains one (a test proves it for every shipped pack). The packs
 * carry the full 149-entry list; this is the floor that holds even for a pack with no list.
 */
export const MIN_BLOCKLIST: readonly string[] = [
  'FUCK',
  'FUCKER',
  'SHIT',
  'BITCH',
  'CUNT',
  'PENIS',
  'VAGINA',
  'NIGGER',
  'NIGGA',
  'WHORE',
  'SLUT',
  'PUSSY',
  'RAPIST',
  'PEDO',
  'FAGGOT',
  'RETARD',
  'DILDO',
  'NAZI',
  'HITLER',
  'BOKOHARAM',
  'ENDSARS',
  'TERRORIST',
  'KILLER',
  'MURDER',
  // short vulgar strings (QA SW-01): the generator keeps every one of them out of the filler
  'ASS',
  'POO',
  'HOE',
  'TIT',
  'TITS',
  'SLAG',
  'THOT',
  'NIGG',
  'KNOB',
  'SHAG',
  'BOOB',
  'BUTT',
  'HOMO',
  'PIMP',
  'TWAT',
  'WANK',
  'PRICK',
  'JIZZ',
  'PISS',
  'CRAP',
  'TURD',
  'SEX',
  'SEXY',
  'PORN',
  'FAG',
  'FAGS',
  'DYKE',
  'SPIC',
  'KIKE',
  'GOOK',
  'RAPE',
  'YANSH',
];

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
