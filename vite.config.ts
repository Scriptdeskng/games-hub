import path from 'node:path';
import { defineConfig } from 'vite';
import { naijaPlugin } from './scripts/vite-naija-plugin';

/**
 * One shared config for every game. Select the game with NAIJA_GAME=<slug> (the scripts in
 * scripts/ do this). NAIJA_OUT overrides the output root (default `dist`; e2e uses `dist-e2e`).
 * `--mode production` (default for build) strips the test hook; any other mode keeps it.
 */
const slug = process.env.NAIJA_GAME ?? '_template';
const root = path.resolve(__dirname);

export default defineConfig(({ mode }) => ({
  root: path.join(root, 'games', slug),
  base: './',
  publicDir: false,
  define: { __NAIJA_TEST__: JSON.stringify(mode !== 'production') },
  server: { host: true },
  build: {
    outDir: path.join(root, process.env.NAIJA_OUT ?? 'dist', slug),
    emptyOutDir: true,
    target: 'es2019',
    assetsDir: 'chunks',
    sourcemap: false,
    modulePreload: { polyfill: false },
    reportCompressedSize: false,
  },
  plugins: [
    naijaPlugin({
      slug,
      gameDir: path.join(root, 'games', slug),
      outDir: path.join(root, process.env.NAIJA_OUT ?? 'dist', slug),
      coreDir: path.join(root, 'packages/core'),
    }),
  ],
}));
