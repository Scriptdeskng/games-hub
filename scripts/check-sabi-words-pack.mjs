#!/usr/bin/env node
// Validates the Sabi Words packs in games/sabi-words/assets/packs/ on top of scripts/pack-check.mjs
// (which owns schema, unique-word and exact-blocklist rules; run `npm run packs:check` too).
// Rules checked here (the grid-friendly "word form"):
//  - word: uppercase A-Z only, 3 to 12 letters (spaces, hyphens, apostrophes and diacritics stripped)
//  - tag "display:<text>" (optional) carries the pretty form; its letters, uppercased, must START with `word` (qualifiers like "rice" or "Market" may follow)
//  - every word has a plain-English hint (<= 90 chars) that does not contain the word itself
//  - every pack has the SAME blocklist (A-Z, 3 to 20 letters), and NO word contains a blocklisted string,
//    forwards or backwards (otherwise the puzzle could never be generated)
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
      const letters = disp
        .slice(8)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/[^A-Z]/g, '');
      if (!letters.startsWith(W))
        bad.push(`${W}: display "${disp.slice(8)}" does not start with the word`);
    }
    for (const b of block)
      if (W.includes(b) || rev(W).includes(b)) bad.push(`${W}: contains blocklisted "${b}"`);
    if (w.reviewed !== false) bad.push(`${W}: reviewed must be false until a human flips it`);
    else unreviewed++;
    if ((w.tags ?? []).includes('uncertain')) uncertain.push(`${id}: ${W}`);
  }
  ok(
    bad.length === 0,
    `${id}: ${p.words.length} words, ${block.length} blocklisted${bad.length ? '\n  - ' + bad.slice(0, 20).join('\n  - ') : ''}`,
  );
}
console.log(`words with reviewed:false: ${unreviewed}; tagged uncertain: ${uncertain.length}`);
if (LIST_U) console.log(uncertain.join('\n'));
if (RELEASE && unreviewed > 0) {
  console.error(`release check FAILED: ${unreviewed} word(s) still have reviewed:false`);
  fail = 1;
}
process.exit(fail);
