#!/usr/bin/env node
// Validates the Sabi Words packs in games/sabi-words/assets/packs/ on top of scripts/pack-check.mjs
// (which owns schema, unique-word and exact-blocklist rules; run `npm run packs:check` too).
// Rules checked here (the grid-friendly "word form"):
//  - word: uppercase A-Z only, 3 to 12 letters (spaces, hyphens, apostrophes and diacritics stripped)
//  - tag "display:<text>" (optional) carries the pretty form; its letters, uppercased, must START with `word` (qualifiers like "rice" or "Market" may follow)
//  - every word has a plain-English hint (<= 90 chars) that does not contain the word itself
//  - every pack has the SAME blocklist (A-Z, 3 to 20 letters); no word IS a blocklisted string or contains one of 5+
//    letters, forwards or backwards. Shorter ones (3 to 4 letters) may sit inside a word: the generator guards them.
//  - minimum word counts per pack, no duplicates, every word reviewed:false until a human flips it
// Usage: node scripts/check-sabi-words-pack.mjs [--release] [--uncertain]
//   --release    also FAILS while any word has reviewed:false (human fact and language review pending)
//   --uncertain  prints every word tagged "uncertain"
// Grid-generator contract (for the developer, see docs/assets/sabi-words-brief.md section 6): reject or re-draw any
// filler letter that makes a blocklisted string appear in ANY row, column or diagonal, in both directions.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'games', 'sabi-words', 'assets', 'packs');
const RELEASE = process.argv.includes('--release');
const LIST_U = process.argv.includes('--uncertain');
export const MIN_WORDS = {
  'naija-food': 60,
  'lagos-places': 50,
  'football-terms': 50,
  'pidgin-words': 60,
  'states-capitals': 67,
  'cloth-markets': 50,
};
const FORM = /^[A-Z]{3,12}$/;
// the game's built-in floor (src/rules/min-blocklist.json): every pack carries the same list, and the
// generator merges both, so a word holding a 5+ letter entry of either would be dropped at run time
const MIN_LIST = JSON.parse(
  readFileSync(join(ROOT, 'games', 'sabi-words', 'src', 'rules', 'min-blocklist.json'), 'utf8'),
);
// Hooked Hausa letters have no Unicode decomposition: map them to their base letter by name, so a display
// form like "Ɗanwake" is compared to the plain word DANWAKE. Everything else must decompose to A-Z.
const HOOKED = { Ɗ: 'D', ɗ: 'd', Ɓ: 'B', ɓ: 'b', Ƙ: 'K', ƙ: 'k', Ƴ: 'Y', ƴ: 'y' };
const strip = (t) =>
  t
    .replace(/[̀-ͯ]/g, '') // tone marks and underdots (combining marks)
    .replace(/[ƊɗƁɓƘƙƳƴ]/g, (c) => HOOKED[c]);
/**
 * The plain-letter readings of a display form. Yoruba ṣ (s with an underdot) is English "sh", but a
 * pack word may spell it S (ASOOKE for Aṣọ òkè) or SH (TATASHE for Tátáṣé), so both readings are
 * returned and the form passes the prefix rule if either starts with the word.
 */
export const plainForms = (text) => {
  const nfd = text.normalize('NFD');
  return [strip(nfd), strip(nfd.replace(/s\u0323/g, 'sh').replace(/S\u0323/g, 'Sh'))];
};
/** Does the display form carry at least one combining mark (tone mark, underdot) or hooked letter? */
export const hasMark = (text) =>
  /[\u0300-\u036f\u018a\u0257\u0181\u0253\u0198\u0199\u01b3\u01b4]/.test(text.normalize('NFD'));
// Words whose hint names Yoruba, Igbo, Hausa or Edo must carry a mark in their display tag (the cultural
// guide: "always with correct diacritics"). These stay PLAIN on purpose, each with its reason; a native
// reviewer decides (they are listed in games/sabi-words/README.md):
export const PLAIN_OK = {
  AKWETE:
    'Igbo cloth name; standard spelling has no dot-below letters, tone is not written in everyday orthography',
  ABACHA:
    'Igbo; standard spelling has no dot-below letters, tone is not written in everyday orthography (a tone-marked Àbàchà is for the reviewer)',
  MIYAN:
    'Hausa; standard spelling has no hooked letters, tone and vowel length are not written in everyday orthography',
  BENINCITY: 'English place name (policy: English spellings of places stay as is)',
};
// Every plain-left native word, and every word whose display gained marks, carries the tag `uncertain` so
// `node scripts/check-sabi-words-pack.mjs --uncertain` lists it for the native reviewer (QA DEF-24).
// Also kept plain by design and tagged: GARRI (loanword), ISIEWU and UGU (no dot-below letters).
export const PLAIN_TAGGED = ['GARRI', 'ISIEWU', 'UGU'];
const NAMES_REGION = /\b(Yoruba|Igbo|Hausa|Edo)\b/i;
export const EMBED_MAX = 4;
const embedded = [];
const rev = (s) => [...s].reverse().join('');
let fail = 0;
const ok = (c, m) => {
  console.log((c ? 'ok   ' : 'FAIL ') + m);
  if (!c) fail = 1;
};
const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();
ok(files.length === Object.keys(MIN_WORDS).length, `${files.length} packs present`);
let firstBlock = null;
let unreviewed = 0;
const uncertain = [];
for (const f of files) {
  const p = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  const id = f.replace('.json', '');
  const bad = [];
  if (p.id !== id) bad.push(`id "${p.id}" != filename`);
  const min = MIN_WORDS[id];
  if (min === undefined) bad.push('pack not listed in MIN_WORDS');
  else if (p.words.length < min) bad.push(`only ${p.words.length} words, need ${min}`);
  const block = p.blocklist ?? [];
  if (block.length < 100) bad.push(`blocklist has ${block.length} entries, need >= 100`);
  if (block.some((b) => !/^[A-Z]{3,20}$/.test(b)))
    bad.push('blocklist entries must be A-Z, 3 to 20');
  if (JSON.stringify(block) !== JSON.stringify(MIN_LIST))
    bad.push('blocklist differs from src/rules/min-blocklist.json (they must be identical)');
  if (firstBlock === null) firstBlock = JSON.stringify(block);
  else if (JSON.stringify(block) !== firstBlock) bad.push('blocklist differs from the other packs');
  const seen = new Set();
  for (const w of p.words) {
    const W = w.word;
    if (!FORM.test(W)) bad.push(`${W}: must be A-Z, 3 to 12 letters`);
    if (seen.has(W)) bad.push(`${W}: duplicate`);
    seen.add(W);
    if (!w.hint || w.hint.length > 90) bad.push(`${W}: hint missing or over 90 chars`);
    else if (
      w.hint
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .includes(W) ||
      w.hint
        .toUpperCase()
        .split(/[^A-Z]+/)
        .includes(W)
    )
      bad.push(`${W}: hint contains the word`);
    const disp = (w.tags ?? []).find((t) => t.startsWith('display:'));
    if (disp) {
      const forms = plainForms(disp.slice(8)).map((f) => f.replace(/[ '’-]/g, ''));
      const odd = forms[0].match(/[^A-Za-z]/);
      if (odd)
        bad.push(`${W}: display "${disp.slice(8)}" has an unsupported character "${odd[0]}"`);
      else if (!forms.some((f) => f.toUpperCase().startsWith(W)))
        bad.push(`${W}: display "${disp.slice(8)}" does not start with the word`);
    }
    if ((PLAIN_OK[W] || PLAIN_TAGGED.includes(W)) && !(w.tags ?? []).includes('uncertain'))
      bad.push(
        `${W}: left plain on purpose, so it must carry the tag "uncertain" for the native reviewer`,
      );
    if (NAMES_REGION.test(w.hint ?? '') && !PLAIN_OK[W]) {
      const shown = disp ? disp.slice(8) : '';
      if (!hasMark(shown))
        bad.push(
          `${W}: hint names Yoruba/Igbo/Hausa/Edo but the display form has no tone mark, underdot or hooked letter`,
        );
    }
    // a word may be a blocklisted string or contain one of 5+ letters: never. A SHORT blocked string (3 or 4 letters:
    // ASS in PASS, TIT in STITCH, BUTT in BUTTON) may sit inside a reviewed pack word; the generator then refuses
    // every occurrence of it that uses a filler letter (games/sabi-words/src/rules/generator.ts), so it can only ever
    // appear inside the word itself. Those embedded cases are listed so the reviewer sees them.
    for (const b of new Set([...block, ...MIN_LIST])) {
      const hit = W.includes(b) || rev(W).includes(b);
      if (!hit) continue;
      if (b.length >= EMBED_MAX + 1 || W === b || W === rev(b))
        bad.push(`${W}: contains blocklisted "${b}"`);
      else embedded.push(`${id}: ${W} contains "${b}"`);
    }
    if (w.reviewed !== false) bad.push(`${W}: reviewed must be false until a human flips it`);
    else unreviewed++;
    if ((w.tags ?? []).includes('uncertain')) uncertain.push(`${id}: ${W}`);
  }
  ok(
    bad.length === 0,
    `${id}: ${p.words.length} words, ${block.length} blocklisted${bad.length ? '\n  - ' + bad.slice(0, 20).join('\n  - ') : ''}`,
  );
}
console.log(
  `short blocked strings embedded in pack words (allowed, generator-guarded): ${embedded.length}`,
);
if (LIST_U) console.log(embedded.join('\n'));
console.log(`words with reviewed:false: ${unreviewed}; tagged uncertain: ${uncertain.length}`);
if (LIST_U) console.log(uncertain.join('\n'));
if (RELEASE && unreviewed > 0) {
  console.error(`release check FAILED: ${unreviewed} word(s) still have reviewed:false`);
  fail = 1;
}
process.exit(fail);
