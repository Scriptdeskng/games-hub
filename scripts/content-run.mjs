// Shared runner for content-check.mjs / content-release-check.mjs. The gate is TypeScript (it reuses
// the validators in packages/core), so it is bundled in memory with esbuild (a declared devDependency,
// also used by Vite) and imported. No file is written.
import path from 'node:path';
import { build } from 'esbuild';
import { ROOT } from './lib.mjs';
import { readPackManifest } from './size-lib.mjs';

export async function loadGate() {
  const out = await build({
    entryPoints: [path.join(ROOT, 'scripts/content-gate.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    logLevel: 'silent',
  });
  const code = out.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

/** Pack ids from games/<slug>/packs.json, or undefined when it does not exist or is unreadable. */
export function declaredPackIds(root, slug) {
  const m = readPackManifest(root, slug);
  return m.ok && m.manifest ? m.manifest.packs.map((p) => p.id) : undefined;
}

/**
 * Run the gate. `forceRelease` (content-release-check) always gates reviewed:false; otherwise the
 * mode comes from NAIJA_RELEASE / --release via the same `isReleaseMode` the unit tests cover.
 * Returns the process exit code.
 */
export async function main({ argv, env, forceRelease = false, slug = 'akoni-dike' }) {
  const gate = await loadGate();
  const root = arg('--root', argv) ?? ROOT;
  let release = forceRelease;
  if (!release) {
    try {
      release = gate.isReleaseMode(env, argv);
    } catch (e) {
      console.error(`content: ${e.message}`);
      return 1;
    }
  }
  const r = gate.runContentCheck(root, {
    release,
    slug,
    declaredPacks: declaredPackIds(root, slug),
  });
  for (const l of r.lines)
    (l.startsWith('ERROR') || l.startsWith('RELEASE') ? console.error : console.log)(l);
  return r.code;
}

function arg(name, argv) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : undefined;
}
