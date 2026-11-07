// Usage: node scripts/build-all.mjs [--test] [--only slug,slug]
// Default: production build of every game into dist/<slug>/.
// --test: non-production mode (keeps window.__naijaTest) into dist-e2e/<slug>/ for Playwright.
import { build } from 'vite';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { listGames, ROOT } from './lib.mjs';

const args = process.argv.slice(2);
const test = args.includes('--test');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? args[onlyIdx + 1].split(',') : null;
const games = listGames().filter((g) => !only || only.includes(g));
if (!games.length) {
  console.error('No games to build.');
  process.exit(1);
}
process.env.NAIJA_OUT = test ? 'dist-e2e' : 'dist';

for (const slug of games) {
  process.env.NAIJA_GAME = slug;
  console.log(`\n> building ${slug} (${test ? 'test' : 'production'})`);
  await build({
    configFile: path.join(ROOT, 'vite.config.ts'),
    mode: test ? 'test' : 'production',
    logLevel: 'warn',
  });
}
console.log(`\nBuilt ${games.length} game(s) into ${process.env.NAIJA_OUT}/`);
if (!test) {
  const { status } = spawnSync('node', ['scripts/prod-gate.mjs'], { cwd: ROOT, stdio: 'inherit' });
  if (status) process.exit(status);
}
