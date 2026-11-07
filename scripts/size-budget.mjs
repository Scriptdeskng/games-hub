// Usage: node scripts/size-budget.mjs [dist-dir]
// Compresses (gzip -9 and brotli q11) every file under dist/<slug> and enforces:
//   - each game's total gzip <= 3 MB   (target 1.5 MB is reported as a warning)
//   - the shared core <= 60 KB gzip
// "Core" = the `core-*.js` and `core-*.css` chunks that vite.config.ts splits out of every
// game build (everything under packages/core: boot, loader, audio synth, i18n runtime, ui-kit JS
// and its CSS). Fonts and images referenced from core CSS are counted in the game total but not
// in the core code budget. Core is measured per game, and the worst case is checked.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { ROOT } from './lib.mjs';

const MB = 1024 * 1024;
const GAME_LIMIT = 3 * MB;
const GAME_TARGET = 1.5 * MB;
const CORE_LIMIT = 60 * 1024;

const dist = path.resolve(ROOT, process.argv[2] ?? 'dist');
if (!fs.existsSync(dist)) {
  console.error(`size: ${dist} not found. Run npm run build first.`);
  process.exit(1);
}

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
const kb = (n) => (n / 1024).toFixed(1).padStart(8);
const gz = (buf) => zlib.gzipSync(buf, { level: 9 }).length;
const br = (buf) =>
  zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;

let failed = false;
const summary = [];
for (const slug of fs
  .readdirSync(dist)
  .filter((d) => fs.statSync(path.join(dist, d)).isDirectory())) {
  const base = path.join(dist, slug);
  const rows = walk(base).map((f) => {
    const buf = fs.readFileSync(f);
    return { file: path.relative(base, f), raw: buf.length, gzip: gz(buf), brotli: br(buf) };
  });
  const sum = (arr, k) => arr.reduce((s, r) => s + r[k], 0);
  const core = rows.filter((r) => /(^|\/)core-[^/]*\.(js|css)$/.test(r.file));
  console.log(`\n${slug}`);
  console.log('  file'.padEnd(46) + '     raw      gzip    brotli');
  for (const r of rows.sort((a, b) => b.gzip - a.gzip)) {
    console.log(`  ${r.file.padEnd(42)}${kb(r.raw)}${kb(r.gzip)}${kb(r.brotli)}`);
  }
  const total = { raw: sum(rows, 'raw'), gzip: sum(rows, 'gzip'), brotli: sum(rows, 'brotli') };
  console.log(`  ${'TOTAL (KB)'.padEnd(42)}${kb(total.raw)}${kb(total.gzip)}${kb(total.brotli)}`);
  const coreGz = sum(core, 'gzip');
  const problems = [];
  if (total.gzip > GAME_LIMIT) problems.push(`game total ${kb(total.gzip).trim()} KB > 3 MB`);
  if (coreGz > CORE_LIMIT) problems.push(`core ${kb(coreGz).trim()} KB > 60 KB`);
  if (total.gzip > GAME_TARGET) console.log('  warning: above the 1.5 MB target');
  if (!core.length) console.log('  warning: no core-*.js chunk found, core budget not measured');
  console.log(
    `  core (gzip): ${kb(coreGz).trim()} KB / 60 KB   game total (gzip): ${kb(total.gzip).trim()} KB / 3072 KB`,
  );
  if (problems.length) {
    failed = true;
    console.log(`  FAIL: ${problems.join('; ')}`);
  }
  summary.push({ slug, total: total.gzip, coreGz, brotli: total.brotli });
}

console.log('\nSummary (gzip KB)');
console.log('  game'.padEnd(24) + '   total      core   brotli');
for (const s of summary) {
  console.log(`  ${s.slug.padEnd(20)}${kb(s.total)}${kb(s.coreGz)}${kb(s.brotli)}`);
}
if (!summary.length) {
  console.error('size: nothing to measure');
  process.exit(1);
}
console.log(failed ? '\nSIZE BUDGET FAILED' : '\nSize budget OK');
process.exit(failed ? 1 : 0);
