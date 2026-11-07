import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Every folder under games/ that has an index.html. */
export const listGames = () =>
  fs
    .readdirSync(path.join(ROOT, 'games'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(ROOT, 'games', e.name, 'index.html')))
    .map((e) => e.name)
    .sort();

/** Games that ship to the portal (the template is built and tested but never deployed). */
export const deployList = () => {
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'games/registry.json'), 'utf8'));
  return reg.games.filter((g) => g.deploy).map((g) => g.slug);
};

export const SLUG_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
