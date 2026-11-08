// Usage: node scripts/pack-check.mjs [--release] [--root <dir>]
// Validates every games/*/assets/packs/*.json against packages/core/content/schemas/*.json
// (a small JSON Schema subset: type, const, enum, pattern, min/max, min/maxItems, uniqueItems,
// required, additionalProperties, items) plus the rules a schema cannot express (unique ids,
// unique words, blocklist). `--release` additionally FAILS while any question (or word with an
// explicit flag) has reviewed:false, and prints the count. Not part of `npm run check`.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const args = process.argv.slice(2);
const release = args.includes('--release');
const root = path.resolve(args.includes('--root') ? args[args.indexOf('--root') + 1] : ROOT);
const schemaDir = path.join(ROOT, 'packages/core/content/schemas');
const schemas = {
  quiz: JSON.parse(fs.readFileSync(path.join(schemaDir, 'quiz-pack.schema.json'), 'utf8')),
  word: JSON.parse(fs.readFileSync(path.join(schemaDir, 'word-pack.schema.json'), 'utf8')),
};

const typeOf = (v) =>
  v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
const typeOk = (t, v) => (t === 'number' ? typeof v === 'number' : typeOf(v) === t);

function validate(schema, v, at, out) {
  if ('const' in schema && v !== schema.const) out.push(`${at}: must be ${schema.const}`);
  if (schema.enum && !schema.enum.includes(v)) out.push(`${at}: must be one of ${schema.enum}`);
  if (schema.type && !typeOk(schema.type, v)) return void out.push(`${at}: must be ${schema.type}`);
  if (typeof v === 'string') {
    if (schema.minLength !== undefined && v.trim().length < schema.minLength) {
      out.push(`${at}: must not be empty`);
    }
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(v)) {
      out.push(`${at}: does not match ${schema.pattern}`);
    }
  }
  if (typeof v === 'number') {
    if (schema.minimum !== undefined && v < schema.minimum) out.push(`${at}: < ${schema.minimum}`);
    if (schema.maximum !== undefined && v > schema.maximum) out.push(`${at}: > ${schema.maximum}`);
  }
  if (Array.isArray(v)) {
    if (schema.minItems !== undefined && v.length < schema.minItems) {
      out.push(`${at}: needs >= ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && v.length > schema.maxItems) {
      out.push(`${at}: needs <= ${schema.maxItems} items`);
    }
    if (
      schema.uniqueItems &&
      new Set(v.map((x) => String(x).trim().toLowerCase())).size < v.length
    ) {
      out.push(`${at}: items must be distinct`);
    }
    if (schema.items) v.forEach((x, i) => validate(schema.items, x, `${at}[${i}]`, out));
  }
  if (schema.type === 'object' && typeOf(v) === 'object') {
    for (const k of schema.required ?? []) if (!(k in v)) out.push(`${at}: missing "${k}"`);
    for (const [k, val] of Object.entries(v)) {
      const sub = schema.properties?.[k];
      if (sub) validate(sub, val, `${at}.${k}`, out);
      else if (schema.additionalProperties === false) out.push(`${at}: unknown field "${k}"`);
    }
  }
}

function semantic(kind, pack, out) {
  const seen = new Set();
  if (kind === 'quiz') {
    for (const q of pack.questions ?? []) {
      if (seen.has(q.id)) out.push(`duplicate question id "${q.id}"`);
      seen.add(q.id);
    }
  } else {
    const blocked = new Set((pack.blocklist ?? []).map((w) => String(w).toLowerCase()));
    for (const w of pack.words ?? []) {
      const k = String(w.word).toLowerCase();
      if (seen.has(k)) out.push(`duplicate word "${k}"`);
      if (blocked.has(k)) out.push(`word "${k}" is on the blocklist`);
      seen.add(k);
    }
  }
}

const gamesDir = path.join(root, 'games');
const files = fs.existsSync(gamesDir)
  ? fs
      .readdirSync(gamesDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .flatMap((e) => {
        const dir = path.join(gamesDir, e.name, 'assets/packs');
        return fs.existsSync(dir)
          ? fs
              .readdirSync(dir)
              .filter((f) => f.endsWith('.json'))
              .sort()
              .map((f) => path.join(dir, f))
          : [];
      })
  : [];

let failed = false;
let unreviewed = 0;
for (const file of files) {
  const rel = path.relative(root, file);
  const out = [];
  let pack;
  try {
    pack = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    out.push(`not valid JSON: ${e.message}`);
  }
  if (pack) {
    const kind = Array.isArray(pack.questions) ? 'quiz' : Array.isArray(pack.words) ? 'word' : null;
    if (!kind) out.push('neither a quiz pack (questions[]) nor a word pack (words[])');
    else {
      validate(schemas[kind], pack, '$', out);
      semantic(kind, pack, out);
      const items = kind === 'quiz' ? pack.questions : pack.words;
      unreviewed += items.filter((x) => x.reviewed === false).length;
    }
  }
  if (out.length) {
    failed = true;
    console.error(`FAIL ${rel}\n  - ${out.slice(0, 20).join('\n  - ')}`);
  } else console.log(`ok   ${rel}`);
}
console.log(`packs: ${files.length} file(s) checked, ${unreviewed} item(s) with reviewed:false`);
if (release && unreviewed > 0) {
  failed = true;
  console.error(`release check FAILED: ${unreviewed} item(s) still have reviewed:false`);
}
process.exit(failed ? 1 : 0);
