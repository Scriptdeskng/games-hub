// Usage: npm run e2e -- [slug...]        (mobile 375x812 + 360x640)
//        npm run e2e:extra -- [slug...]  (landscape + desktop)
//        npm run e2e:perf -- [slug...]   (4x CPU + Fast 3G: time to menu, fps, heap)
//        npm run e2e:soak -- [slug...]   (SOAK_MINUTES, default 10; SOAK_SAMPLE_S, default 30)
// Builds the requested games in test mode (dist-e2e/) first, then runs Playwright.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { listGames, ROOT } from './lib.mjs';

const args = process.argv.slice(2);
const mode = args.includes('--soak')
  ? 'soak'
  : args.includes('--perf')
    ? 'perf'
    : args.includes('--extra')
      ? 'extra'
      : 'e2e';
const rest = args.filter((a) => !['--extra', '--perf', '--soak'].includes(a));
const slugs = rest.filter((a) => !a.startsWith('-'));
const passthrough = rest.filter((a) => a.startsWith('-'));
const perfMode = mode === 'perf' || mode === 'soak';
// perf specs are generic (they only need the game's __naijaTest hook), so any built game works
const all = perfMode
  ? listGames()
  : listGames().filter((g) => fs.existsSync(path.join(ROOT, 'tests/e2e', `${g}.spec.ts`)));
for (const s of slugs) {
  if (!all.includes(s)) {
    console.error(`e2e: unknown or untested game "${s}" (known: ${all.join(', ')})`);
    process.exit(1);
  }
}
const targets = slugs.length ? slugs : all;

// A laptop that idles into macOS "Maintenance Sleep" suspends every process for about 15 minutes
// (pmset log: `Sleep ... 933 secs`). That froze a 10-minute soak for 15.7 minutes and made timing
// tests fail with no defect in the game, so hold the machine awake for as long as this run lives.
if (process.platform === 'darwin') {
  try {
    spawn('caffeinate', ['-i', '-m', '-s', '-w', String(process.pid)], {
      stdio: 'ignore',
      detached: true,
    }).unref();
  } catch {
    /* no caffeinate: nothing to hold */
  }
}
const run = (cmd, a, env = {}) =>
  spawnSync(cmd, a, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });

let r = run('node', ['scripts/build-all.mjs', '--test', '--only', targets.join(',')]);
if (r.status) process.exit(r.status);

if (perfMode) {
  const spec = mode === 'soak' ? 'tests/perf/soak.spec.ts' : 'tests/perf/perf.spec.ts';
  for (const slug of targets) {
    r = run(
      'npx',
      ['playwright', 'test', '-c', 'playwright.perf.config.ts', spec, ...passthrough],
      {
        PERF_SLUG: slug,
      },
    );
    if (r.status) process.exit(r.status);
  }
  process.exit(0);
}
const cfg = mode === 'extra' ? 'playwright.extra.config.ts' : 'playwright.config.ts';
r = run('npx', [
  'playwright',
  'test',
  '-c',
  cfg,
  ...targets.map((s) => `tests/e2e/${s}.spec.ts`),
  ...passthrough,
]);
process.exit(r.status ?? 1);
