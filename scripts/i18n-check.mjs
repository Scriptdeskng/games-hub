// Usage: node scripts/i18n-check.mjs
// For core and every game: en.json and pcm.json must have identical keys, no empty values and
// identical {param} placeholders; every literal t('key') used in source must exist in en
// (game keys or core keys). Lines flagged `_review: true` are listed as a reminder.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const text = (v) => (typeof v === 'string' ? v : v?.text);
const params = (s) =>
  [...String(s).matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join(',');
const walk = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        return e.isDirectory() ? walk(p) : [p];
      })
    : [];
const load = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

const errors = [];
const reviews = [];
const bundles = [
  {
    name: 'core',
    dir: path.join(ROOT, 'packages/core/src/i18n'),
    src: path.join(ROOT, 'packages/core/src'),
  },
];
for (const g of fs.readdirSync(path.join(ROOT, 'games'), { withFileTypes: true })) {
  if (g.isDirectory()) {
    bundles.push({
      name: g.name,
      dir: path.join(ROOT, 'games', g.name, 'src/i18n'),
      src: path.join(ROOT, 'games', g.name, 'src'),
    });
  }
}

const coreEn = load(path.join(bundles[0].dir, 'en.json'));
for (const b of bundles) {
  const enFile = path.join(b.dir, 'en.json');
  const pcmFile = path.join(b.dir, 'pcm.json');
  if (!fs.existsSync(enFile) || !fs.existsSync(pcmFile)) {
    if (b.name !== 'core' && !fs.existsSync(path.join(ROOT, 'games', b.name, 'index.html')))
      continue;
    errors.push(`${b.name}: missing en.json or pcm.json`);
    continue;
  }
  const en = load(enFile);
  const pcm = load(pcmFile);
  for (const k of Object.keys(en)) {
    if (!(k in pcm)) errors.push(`${b.name}: key "${k}" missing in pcm.json`);
  }
  for (const k of Object.keys(pcm)) {
    if (!(k in en)) errors.push(`${b.name}: key "${k}" missing in en.json`);
  }
  for (const [lang, bundle] of [
    ['en', en],
    ['pcm', pcm],
  ]) {
    for (const [k, v] of Object.entries(bundle)) {
      if (!text(v)?.trim()) errors.push(`${b.name}/${lang}: "${k}" is empty`);
      if (typeof v === 'object' && v._review) reviews.push(`${b.name}/${lang}: ${k} = "${v.text}"`);
    }
  }
  for (const k of Object.keys(en)) {
    if (k in pcm && params(text(en[k])) !== params(text(pcm[k]))) {
      errors.push(`${b.name}: placeholders differ for "${k}"`);
    }
  }
  const known = new Set([...Object.keys(coreEn), ...Object.keys(en)]);
  for (const f of walk(b.src).filter((f) => /\.ts$/.test(f) && !/\.test\.ts$/.test(f))) {
    // ignore comments (docs mention t('key') as an example)
    const code = fs
      .readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const m of code.matchAll(/\bt\(\s*'([\w.-]+)'/g)) {
      if (!known.has(m[1]))
        errors.push(`${path.relative(ROOT, f)}: t('${m[1]}') has no entry in en.json`);
    }
  }
}

if (reviews.length) {
  console.log(`i18n: ${reviews.length} line(s) flagged _review for a human:`);
  reviews.forEach((r) => console.log(`  - ${r}`));
}
if (errors.length) {
  console.error('i18n check FAILED:');
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}
console.log('i18n check OK');
