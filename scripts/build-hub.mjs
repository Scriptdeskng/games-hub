// Usage: node scripts/build-hub.mjs [--no-build] [--dist dist] [--out dist-hub]
// Builds the public hub into dist-hub/: the hub page at the root and every `deploy:true` game
// (production build from dist/<slug>/) at dist-hub/<slug>/. Never deploys anything.
//   1. validate hub/games.json against games/registry.json
//   2. production build of those games (scripts/build-all.mjs, which also runs the prod gate)
//   3. assemble, write _headers, run the safety scan and the prod gate on dist-hub
//   4. check sizes: every game <= 3 MB gzip, hub shell <= 40 KB gzip
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './lib.mjs';
import {
  assembleHub,
  GAME_LIMIT,
  HUB_LIMIT,
  hubSlugs,
  reviewLines,
  sizeReport,
  validateHub,
} from './hub-lib.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => (args.includes(name) ? args[args.indexOf(name) + 1] : def);
const dist = path.resolve(ROOT, opt('--dist', 'dist'));
const outDir = path.resolve(ROOT, opt('--out', 'dist-hub'));
const slugs = hubSlugs(ROOT);
const fail = (title, list) => {
  console.error(`build-hub FAILED: ${title}`);
  list.forEach((p) => console.error(`  - ${p}`));
  process.exit(1);
};

const early = validateHub(ROOT, slugs);
if (early.length) fail('hub/games.json is out of step with the registry', early);

if (!args.includes('--no-build')) {
  const r = spawnSync('node', ['scripts/build-all.mjs', '--only', slugs.join(',')], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (r.status) process.exit(r.status);
}

const res = assembleHub({ root: ROOT, dist, outDir, slugs });
if (res.problems.length) fail('assembly / safety scan', res.problems);

const gate = spawnSync('node', ['scripts/prod-gate.mjs', path.relative(ROOT, outDir)], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (gate.status) process.exit(gate.status);

const rep = sizeReport(outDir, slugs);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`\n${path.basename(outDir)}/ size (gzip -9)`);
for (const [s, v] of Object.entries(rep.games)) {
  console.log(`  ${s.padEnd(16)} ${kb(v.gzip).padStart(10)}  (${kb(v.raw)} raw, ${v.files} files)`);
}
console.log(
  `  ${'hub shell'.padEnd(16)} ${kb(rep.hub.gzip).padStart(10)}  (budget ${kb(HUB_LIMIT)})`,
);
console.log(
  `  ${'TOTAL'.padEnd(16)} ${kb(rep.total.gzip).padStart(10)}  (${kb(rep.total.raw)} raw, ${rep.total.files} files)`,
);
const over = [
  ...Object.entries(rep.games)
    .filter(([, v]) => v.gzip > GAME_LIMIT)
    .map(([s]) => `${s} is over the 3 MB gzip budget`),
  ...(rep.hub.gzip > HUB_LIMIT ? [`hub shell is over ${kb(HUB_LIMIT)} gzip`] : []),
];
if (over.length) fail('size budget', over);
const review = reviewLines(res.src);
console.log(`\nPidgin lines flagged for human review: ${review.length}`);
console.log('Deploy folder ready. Nothing was uploaded.');
