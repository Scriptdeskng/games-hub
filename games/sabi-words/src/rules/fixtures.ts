import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { WordPack } from '@naija/core/content';

/** Test-only: the real shipped packs, from disk. */
const DIR = join(__dirname, '../../assets/packs');
export const PACKS_ON_DISK: WordPack[] = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as WordPack);

export const toyPack = (words: string[], blocklist?: string[]): WordPack => ({
  version: 1,
  id: 'toy',
  title: 'Toy',
  lang: 'en',
  theme: 'toy',
  words: words.map((word) => ({ word, hint: `about ${word.length}` })),
  ...(blocklist ? { blocklist } : {}),
});
