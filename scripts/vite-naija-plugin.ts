import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

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

const globToRegExp = (g: string): RegExp => {
  const parts = g.split('**').map((part) =>
    part
      .split('*')
      .map((lit) => lit.replace(/[.+^${}()|[\]\\]/g, '\\$&'))
      .join('[^/]*'),
  );
  return new RegExp(`^${parts.join('.*')}$`);
};

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

/**
 * - Splits everything under packages/core into one `core-*.js/css` chunk so size-budget can
 *   measure the shared core separately from game code.
 * - Copies games/<slug>/assets/** (except *.md) to dist/<slug>/assets/. If the game has
 *   `assets/ship.json` (`{ "include": ["board/*.svg", "pawns/**"] }`, `*` = within a folder, `**` = any
 *   depth) ONLY matching files are shipped: unused art, thumbnails and placeholder audio stay out
 *   of the download. To ship a portal catalogue asset, add its path to `include`. The build fails
 *   if the bundle references a literal `./assets/...` file that is not shipped.
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
      const include: RegExp[] | null = fs.existsSync(shipFile)
        ? (JSON.parse(fs.readFileSync(shipFile, 'utf8')).include as string[]).map(globToRegExp)
        : null;
      if (fs.existsSync(assets)) {
        for (const f of walk(assets)) {
          if (f.endsWith('.md') || f === 'ship.json') continue;
          if (include && !include.some((re) => re.test(f))) continue;
          const dest = path.join(o.outDir, 'assets', f);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(path.join(assets, f), dest);
        }
      }
      if (include) assertReferencedAssetsShipped(o.outDir);
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
