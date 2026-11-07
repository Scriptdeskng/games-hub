// Usage: npm run new-game <slug> [-- --title "Game Title"]
// Copies games/_template to games/<slug>, renames slug/title everywhere, adds the game to
// games/registry.json (deploy: true) and creates tests/e2e/<slug>.spec.ts from the template spec.
// Refuses invalid names and existing slugs.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SLUG_RE } from './lib.mjs';

const args = process.argv.slice(2);
const titleIdx = args.indexOf('--title');
const titleArg = titleIdx >= 0 ? args[titleIdx + 1] : null;
const skip = titleIdx >= 0 ? titleIdx + 1 : -1;
const slug = args.find((a, i) => !a.startsWith('-') && i !== skip);

const fail = (msg) => {
  console.error(`new-game: ${msg}`);
  process.exit(1);
};

if (!slug) fail('usage: npm run new-game <slug> [-- --title "Game Title"]');
if (!SLUG_RE.test(slug) || slug.length < 3 || slug.length > 40) {
  fail(
    `invalid slug "${slug}". Use lowercase letters, digits and single hyphens, 3-40 chars, starting with a letter (e.g. naija-whot).`,
  );
}
if (['template', 'core', 'shared', 'tools'].includes(slug)) fail(`"${slug}" is reserved.`);
const dest = path.join(ROOT, 'games', slug);
if (fs.existsSync(dest)) fail(`games/${slug} already exists. Refusing to overwrite.`);
const spec = path.join(ROOT, 'tests/e2e', `${slug}.spec.ts`);
if (fs.existsSync(spec)) fail(`tests/e2e/${slug}.spec.ts already exists. Refusing to overwrite.`);

const title =
  titleArg ??
  slug
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
if (/["\\<>&\n]/.test(title))
  fail('title must not contain quotes, backslashes, angle brackets or "&".');

const src = path.join(ROOT, 'games/_template');
const TEXT = /\.(ts|json|html|css|md|svg|mjs)$/;
const SKIP = new Set(['node_modules', 'dist']);

const copy = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const f = path.join(from, e.name);
    const t = path.join(to, e.name);
    if (e.isDirectory()) copy(f, t);
    else if (TEXT.test(e.name)) fs.writeFileSync(t, rename(fs.readFileSync(f, 'utf8')));
    else fs.copyFileSync(f, t);
  }
};
const rename = (s) =>
  s
    .replaceAll('_template', slug)
    .replaceAll('Tap the Agogo', title)
    .replaceAll('Tap di Agogo', title);

copy(src, dest);
fs.writeFileSync(
  spec,
  rename(fs.readFileSync(path.join(ROOT, 'tests/e2e/_template.spec.ts'), 'utf8')),
);

const regFile = path.join(ROOT, 'games/registry.json');
const reg = JSON.parse(fs.readFileSync(regFile, 'utf8'));
reg.games.push({ slug, title, deploy: true });
fs.writeFileSync(regFile, JSON.stringify(reg, null, 2) + '\n');

console.log(`Created games/${slug} ("${title}")
  - registered in games/registry.json (deploy: true)
  - e2e spec: tests/e2e/${slug}.spec.ts (a copy of the template flow: adapt it to your game)

Next steps:
  1. npm install                 (refreshes the workspace lockfile)
  2. npm run dev ${slug}
  3. Replace src/rules, src/view and src/i18n with your game; keep every string in en.json + pcm.json.
  4. Ask the asset-designer for docs/assets/${slug}-brief.md, then log licences in games/${slug}/assets/CREDITS.md.
  5. npm run lint && npm run typecheck && npm run test && npm run build && npm run size && npm run e2e -- ${slug}`);
