import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { checkShipped, describeProblems, globToRegExp, type ShipConfig } from './ship-check';

export interface NaijaPluginOptions {
  slug: string;
  gameDir: string;
  outDir: string;
  coreDir: string;
}

const walk = (dir: string, base = dir): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });

/** A literal "./assets/x.svg" in the built code must exist in the output (dynamic names are not checked). */
function assertReferencedAssetsShipped(outDir: string): void {
  const missing = new Set<string>();
  for (const f of walk(outDir).filter((f) => /\.(js|css|html)$/.test(f))) {
    const text = fs.readFileSync(path.join(outDir, f), 'utf8');
    for (const m of text.matchAll(
      /\.\/assets\/([\w\-./]+\.(?:svg|png|webp|jpg|mp3|ogg|json|woff2))/g,
    )) {
      if (!fs.existsSync(path.join(outDir, 'assets', m[1] as string))) missing.add(m[1] as string);
    }
  }
  if (missing.size) {
    throw new Error(
      `assets referenced by the code but not shipped (see assets/ship.json): ${[...missing].join(', ')}`,
    );
  }
}

/** Two-way: every shipped asset must be referenced by the built code, `dynamic` or `keep` (QA SL-15). */
function assertNoDeadAssets(outDir: string, ship: ShipConfig): void {
  const shipped = walk(path.join(outDir, 'assets'));
  const code = walk(outDir)
    .filter((f) => /\.(js|css|html)$/.test(f))
    .map((f) => fs.readFileSync(path.join(outDir, f), 'utf8'))
    .join('\n');
  const problems = describeProblems(checkShipped(shipped, code, ship));
  if (problems.length) {
    throw new Error(`assets/ship.json check failed:\n  - ${problems.join('\n  - ')}`);
  }
}

/*
 * DESIGN NOTES (not implemented, Phase A1): per-chapter packs for `akoni-dike`.
 * Full design: docs/games/akoni-dike/ARCHITECTURE.md, sections "Pack build" and "Service worker".
 *
 * 1. Declaration: games/akoni-dike/packs.json (read by scripts/size-lib.mjs, the same file the size
 *    budget uses). Folder convention `packs/chNN/` at the game root, NOT under `assets/`, so the
 *    `ship.json` include globs (relative to assets/) and the `./assets/...` literal check do not touch it.
 * 2. closeBundle gets a pack step, run after the normal asset copy: for each declared pack, assemble
 *    content JSON + art + audio into `dist/<slug>/packs/chNN/`, name files `<name>.<sha256-8>.<ext>`,
 *    write `packs/chNN/pack.<hash>.json` (file list, byte sizes, sha-256 of every file, schema
 *    version, `engine` compatibility) and emit the catalogue (`id -> literal ./packs/chNN/pack.<hash>.json`)
 *    as a generated module the loader imports, so the built JS names each pack by a literal path.
 * 3. The service-worker precache list (`files` below) MUST exclude `packs/**`, and the version hash
 *    must NOT include pack bytes: otherwise install would download every chapter (blowing the
 *    3 MB first-download promise) and any pack edit would invalidate the whole game cache.
 *    Packs get their own cache (`naija-packs-<slug>-v1`, see sw-template.js notes), because the
 *    per-version cache above is deleted on every activate.
 * 4. Build fails if: a declared pack folder is empty, a file sits in packs/ that no pack manifest
 *    lists (dead weight, same two-way rule as assertNoDeadAssets), a pack manifest lists a missing
 *    file, a hash does not match, or a pack is over budget (shared evaluateGame in size-lib.mjs).
 * 5. Release mode (NAIJA_RELEASE=1) refuses to build while any content item has reviewed:false
 *    (scripts/build-all.mjs runs the content gate first).
 */

/**
 * - Splits everything under packages/core into one `core-*.js/css` chunk so size-budget can
 *   measure the shared core separately from game code.
 * - Copies games/<slug>/assets/** (except *.md) to dist/<slug>/assets/. If the game has
 *   `assets/ship.json` (`{ "include": ["board/*.svg", "pawns/**"] }`, `*` = within a folder, `**` = any
 *   depth) ONLY matching files are shipped: unused art, thumbnails and placeholder audio stay out
 *   of the download. To ship a portal catalogue asset, add its path to `include` AND to `keep`.
 *   The check is two-way: the build fails if the bundle references a literal `./assets/...` file
 *   that is not shipped, and also if a shipped file is referenced by nothing, unless it matches
 *   `dynamic` (names built at run time) or `keep` (see scripts/ship-check.ts).
 * - Writes dist/<slug>/sw.js: cache-first service worker with a precache manifest of every
 *   built file, keyed by a content hash so old caches are deleted on update.
 */
export function naijaPlugin(o: NaijaPluginOptions): Plugin {
  return {
    name: 'naija-game',
    apply: 'build',
    config: () => ({
      build: {
        rollupOptions: {
          output: {
            manualChunks: (id: string) => (id.includes('/packages/core/') ? 'core' : undefined),
          },
        },
      },
    }),
    closeBundle() {
      const assets = path.join(o.gameDir, 'assets');
      const shipFile = path.join(assets, 'ship.json');
      const ship: ShipConfig | null = fs.existsSync(shipFile)
        ? (JSON.parse(fs.readFileSync(shipFile, 'utf8')) as ShipConfig)
        : null;
      const include: RegExp[] | null = ship ? ship.include.map(globToRegExp) : null;
      if (fs.existsSync(assets)) {
        for (const f of walk(assets)) {
          if (f.endsWith('.md') || f === 'ship.json') continue;
          if (include && !include.some((re) => re.test(f))) continue;
          const dest = path.join(o.outDir, 'assets', f);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(path.join(assets, f), dest);
        }
      }
      if (ship) {
        assertReferencedAssetsShipped(o.outDir);
        assertNoDeadAssets(o.outDir, ship);
      }
      const files = walk(o.outDir).filter((f) => f !== 'sw.js');
      const hash = createHash('sha1');
      for (const f of files.sort()) {
        hash.update(f).update(fs.readFileSync(path.join(o.outDir, f)));
      }
      const tpl = fs.readFileSync(path.join(o.coreDir, 'src/sw/sw-template.js'), 'utf8');
      const sw = tpl
        .replace('__VERSION__', () => hash.digest('hex').slice(0, 10))
        .replace('__SLUG__', () => o.slug)
        .replace('__FILES__', () => JSON.stringify(files.map((f) => `./${f}`)));
      fs.writeFileSync(path.join(o.outDir, 'sw.js'), sw);
    },
  };
}
