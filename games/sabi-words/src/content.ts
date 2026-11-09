import { validateWordPack, type ValidationResult, type WordPack } from '@naija/core/content';

/**
 * The six themed packs. Every URL is a literal so the build's ship check can see it is used.
 * `cls` and `icon` are the asset brief's pack-card hooks (`sw-pack--<cls>`, sprite `#pack-<icon>`).
 */
export const PACKS = [
  { id: 'naija-food', url: './assets/packs/naija-food.json', cls: 'food', icon: 'food' },
  { id: 'lagos-places', url: './assets/packs/lagos-places.json', cls: 'lagos', icon: 'lagos' },
  {
    id: 'football-terms',
    url: './assets/packs/football-terms.json',
    cls: 'football',
    icon: 'football',
  },
  { id: 'pidgin-words', url: './assets/packs/pidgin-words.json', cls: 'pidgin', icon: 'pidgin' },
  {
    id: 'states-capitals',
    url: './assets/packs/states-capitals.json',
    cls: 'states',
    icon: 'states',
  },
  {
    id: 'cloth-markets',
    url: './assets/packs/cloth-markets.json',
    cls: 'cloth',
    icon: 'cloth',
  },
] as const;
export type PackId = (typeof PACKS)[number]['id'];
export const PACK_IDS: readonly string[] = PACKS.map((p) => p.id);
export const packMeta = (id: string): (typeof PACKS)[number] =>
  PACKS.find((p) => p.id === id) ?? PACKS[0];

/** Fewest usable words a pack needs, and the grid-friendly word form (uppercase A-Z, 3 to 12). */
export const MIN_PACK_WORDS = 12;
const FORM = /^[A-Z]{3,12}$/;

/**
 * Core's schema check plus the grid's word form. One malformed word rejects the whole pack, so a
 * bad update never half-loads: the player gets the friendly retry screen instead.
 */
export function validateSabiWordPack(data: unknown): ValidationResult<WordPack> {
  const r = validateWordPack(data);
  if (!r.ok) return r;
  const errors: string[] = [];
  r.value.words.forEach((w, i) => {
    if (!FORM.test(w.word.toUpperCase())) {
      errors.push(`words[${i}].word must be 3 to 12 letters A-Z`);
    }
  });
  if (r.value.words.length < MIN_PACK_WORDS) {
    errors.push(`pack needs at least ${MIN_PACK_WORDS} words`);
  }
  return errors.length ? { ok: false, errors: errors.slice(0, 25) } : r;
}
