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

/**
 * - Splits everything under packages/core into one `core-*.js/css` chunk so size-budget can
 *   measure the shared core separately from game code.
 * - Copies games/<slug>/assets/** (except *.md) to dist/<slug>/assets/.
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
      if (fs.existsSync(assets)) {
        for (const f of walk(assets)) {
          if (f.endsWith('.md')) continue;
          const dest = path.join(o.outDir, 'assets', f);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(path.join(assets, f), dest);
        }
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
