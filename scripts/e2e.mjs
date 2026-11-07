// Usage: npm run e2e -- [slug...]        (mobile 375x812 + 360x640)
//        npm run e2e:extra -- [slug...]  (landscape + desktop)
// Builds the requested games in test mode (dist-e2e/) first, then runs Playwright.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { listGames, ROOT } from './lib.mjs';

const args = process.argv.slice(2);
const extra = args.includes('--extra');
const rest = args.filter((a) => a !== '--extra');
const slugs = rest.filter((a) => !a.startsWith('-'));
const passthrough = rest.filter((a) => a.startsWith('-'));
const all = listGames().filter((g) => fs.existsSync(path.join(ROOT, 'tests/e2e', `${g}.spec.ts`)));
for (const s of slugs) {
  if (!all.includes(s)) {
    console.error(`e2e: no tests/e2e/${s}.spec.ts (known: ${all.join(', ')})`);
    process.exit(1);
  }
}
const targets = slugs.length ? slugs : all;
const run = (cmd, a) => spawnSync(cmd, a, { cwd: ROOT, stdio: 'inherit', env: process.env });

let r = run('node', ['scripts/build-all.mjs', '--test', '--only', targets.join(',')]);
if (r.status) process.exit(r.status);
const cfg = extra ? 'playwright.extra.config.ts' : 'playwright.config.ts';
r = run('npx', [
  'playwright',
  'test',
  '-c',
  cfg,
  ...targets.map((s) => `tests/e2e/${s}.spec.ts`),
  ...passthrough,
]);
process.exit(r.status ?? 1);
