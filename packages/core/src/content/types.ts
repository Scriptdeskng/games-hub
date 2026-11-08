/** Content-pack types. Packs are plain JSON fetched at run time so content can ship without a code release. */
export type Difficulty = 'easy' | 'medium' | 'hard';
export type PackLang = 'en' | 'pcm' | 'yo' | 'ig' | 'ha';

export interface QuizQuestion {
  id: string;
  category: string;
  difficulty: Difficulty;
  q: string;
  /** Exactly four distinct options. */
  options: [string, string, string, string];
  /** Index (0-3) of the correct option. */
  answer: 0 | 1 | 2 | 3;
  /** Where the fact was checked (book, site, "common knowledge"...). Required for review. */
  source: string;
  /** True once a human has fact-checked the question and its Pidgin wording. */
  reviewed: boolean;
  tags?: string[];
}

export interface QuizPack {
  version: 1;
  id: string;
  title: string;
  lang: PackLang;
  questions: QuizQuestion[];
}

export interface WordEntry {
  /** Letters only (any script letter), 2 to 20 code points long, combining tone marks allowed. Games normalise case themselves. */
  word: string;
  hint?: string;
  tags?: string[];
  /** Optional per-word human review flag (release check counts `reviewed: false`). */
  reviewed?: boolean;
}

export interface WordPack {
  version: 1;
  id: string;
  title: string;
  lang: PackLang;
  /** Theme key, e.g. "food", "naija-towns". */
  theme: string;
  words: WordEntry[];
  /** Words that must never be offered, even if another list adds them. Case-insensitive. */
  blocklist?: string[];
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };
export type Validator<T> = (data: unknown) => ValidationResult<T>;

export type PackErrorReason = 'network' | 'timeout' | 'http' | 'parse' | 'invalid';
export type PackLoadResult<T> =
  | { ok: true; pack: T }
  | { ok: false; reason: PackErrorReason; message: string; errors?: string[]; status?: number };
