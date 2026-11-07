// Usage: node scripts/prod-gate.mjs [dist-dir]   (runs automatically after `npm run build`)
// Fails if a production bundle still contains test-only code. The test hook is stripped by the
// `__NAIJA_TEST__` define; this gate proves the stripping really happened (a bundler can silently
// keep code, e.g. if the guard is not a compile-time constant).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const FORBIDDEN = ['__naijaTest', '__NAIJA_TEST__', 'autoplay', 'setBot'];
const dist = path.resolve(ROOT, process.argv[2] ?? 'dist');
const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });

if (!fs.existsSync(dist)) {
  console.error(`prod-gate: ${dist} not found`);
  process.exit(1);
}
const bad = [];
let scanned = 0;
for (const f of walk(dist).filter((f) => /\.(js|mjs|html|css|json)$/.test(f))) {
  scanned++;
  const text = fs.readFileSync(f, 'utf8');
  for (const word of FORBIDDEN) {
    if (text.includes(word)) bad.push(`${path.relative(ROOT, f)} contains "${word}"`);
  }
}
if (bad.length) {
  console.error('prod-gate FAILED: test-only code shipped in a production bundle:');
  bad.forEach((b) => console.error(`  - ${b}`));
  process.exit(1);
}
console.log(
  `prod-gate OK: ${scanned} files scanned, no test hook or autoplay code in ${path.basename(dist)}/`,
);
