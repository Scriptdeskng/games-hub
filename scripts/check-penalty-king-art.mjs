#!/usr/bin/env node
// Checks Penalty King art: no empty files, SVG hygiene (no <text>/<image>/external refs/scripts, viewBox, xmlns, unique ids, refs resolve),
// every url() in the CSS resolves, ship.json entries exist, total art gzip <= 800 KB, every promised file exists, distinct state icons,
// unique crests/patterns, WCAG contrast of kit pairs, banner plates, chalk lines and ball, and a "no real club name" guard.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { TEAMS, KEEPER, contrast, CREAM, INK } from './penalty-king-common.mjs';
import { HUD, BANNERS } from './penalty-king-hud.mjs';
import { PLATES } from './gen-penalty-king-art.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = join(ROOT, 'games', 'penalty-king', 'assets');
let fail = 0;
const ok = (c, m) => {
  console.log((c ? 'ok   ' : 'FAIL ') + m);
  if (!c) fail = 1;
};
const walk = (d) =>
  readdirSync(d).flatMap((f) =>
    statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)],
  );
const files = walk(A);
ok(
  files.every((f) => statSync(f).size > 0),
  `no empty files (${files.length} files)`,
);
const bytes = files.reduce((n, f) => n + gzipSync(readFileSync(f)).length, 0);
ok(bytes <= 800 * 1024, `total assets ${(bytes / 1024).toFixed(1)} KB gzip (<= 800 KB)`);
for (const f of files.filter((f) => f.endsWith('.svg'))) {
  const s = readFileSync(f, 'utf8'),
    rel = relative(A, f);
  if (/<text|<image|https?:\/\/(?!www\.w3\.org)|<script|<foreignObject/.test(s))
    ok(false, `${rel} has text/image/external/script`);
  if (!s.includes('viewBox')) ok(false, `${rel} has no viewBox`);
  const idl = [...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  if (new Set(idl).size !== idl.length) ok(false, `${rel} duplicate ids`);
  const bad = [...s.matchAll(/(?:href="|url\()#([^")]+)/g)]
    .map((m) => m[1])
    .filter((i) => !idl.includes(i));
  if (bad.length) ok(false, `${rel} dangling refs ${bad}`);
  if (!/^<svg[^>]*xmlns=/.test(s)) ok(false, `${rel} lacks xmlns`);
}
ok(true, 'svgs: hygiene scan done');

const NEED = [
  ...['community', 'stadium'].flatMap((v) =>
    ['portrait', 'landscape'].map((o) => `scene/${v}-${o}.svg`),
  ),
  'scene/crowd-cheer.svg',
  'goal/goal-back.svg',
  'goal/goal-front.svg',
  'goal/goal-front-wood.svg',
  'ball/ball.svg',
  'ball/ball-shadow.svg',
  ...['dark', 'mid', 'light'].map((k) => `keeper/keeper-${k}.svg`),
  ...TEAMS.flatMap((t) => [
    `striker/striker-${t.id}.svg`,
    `teams/crest-${t.id}.svg`,
    `teams/kit-${t.id}.svg`,
  ]),
  ...Object.keys(HUD).map((k) => `hud/${k}.svg`),
  ...Object.keys(BANNERS).map((k) => `banners/${k}.svg`),
  'scoreboard/board-frame.svg',
  'cup/bracket-8.svg',
  'cup/trophy.svg',
  ...['net-bulge', 'goal-ribbons', 'save-ring', 'post-clang', 'dust', 'floodlight-glow'].map(
    (k) => `fx/${k}.svg`,
  ),
  'icon/menu-mark.svg',
  'avatars/ozavize.svg',
  'avatars/ndako.svg',
  'avatars/hamman.svg',
  'thumb/thumb-512x512.svg',
  'thumb/thumb-1024x500.svg',
  'geometry.json',
  'audio/voice-manifest.json',
  'audio/music/penalty-menu-chant.mp3',
  'audio/music/penalty-play-chant.mp3',
  'penalty-art.css',
  'penalty-art-hud.css',
  'penalty-art-fx.css',
  'ship.json',
  'CREDITS.md',
];
for (const f of NEED) if (!existsSync(join(A, f))) ok(false, `missing ${f}`);
ok(
  NEED.every((f) => existsSync(join(A, f))),
  `all ${NEED.length} promised files exist`,
);

for (const css of ['penalty-art.css', 'penalty-art-hud.css', 'penalty-art-fx.css']) {
  const s = readFileSync(join(A, css), 'utf8');
  const miss = [...s.matchAll(/url\('\.\/([^']+)'\)/g)]
    .map((m) => m[1])
    .filter((u) => !existsSync(join(A, u)));
  ok(miss.length === 0, `${css}: every url() resolves ${miss.join(',')}`);
}
const ship = JSON.parse(readFileSync(join(A, 'ship.json'), 'utf8'));
// an entry is a file, or a glob with one `*` inside a folder (striker/striker-*.svg) that must match at least one file
const shipHas = (p) => {
  if (!p.includes('*')) return existsSync(join(A, p));
  const re = new RegExp('^' + p.replace(/[.]/g, '\\.').replace(/\*/g, '[^/]*') + '$');
  return files.some((f) => re.test(relative(A, f).split('\\').join('/')));
};
ok(ship.include.every(shipHas), 'ship.json include entries exist');

const uniq = (list) =>
  new Set(list.map((f) => readFileSync(join(A, f), 'utf8'))).size === list.length;
ok(uniq(TEAMS.map((t) => `teams/crest-${t.id}.svg`)), 'eight distinct crests');
ok(
  new Set(TEAMS.map((t) => t.pattern)).size === 8,
  'eight distinct kit patterns (greyscale-distinguishable)',
);
ok(
  uniq(['goal', 'saved', 'miss', 'post', 'pending', 'next'].map((k) => `hud/kick-${k}.svg`)),
  'six distinct kick-result shapes',
);
ok(uniq(['left', 'none', 'right'].map((k) => `hud/curve-${k}.svg`)), 'three distinct curve icons');
ok(
  uniq(['aim-reticle', 'aim-reticle-lock'].map((k) => `hud/${k}.svg`)),
  'aim free and locked differ by shape',
);
ok(
  uniq(
    ['result-goal', 'result-saved', 'result-miss', 'result-post'].map((k) => `banners/${k}.svg`),
  ),
  'four distinct result banners',
);
ok(new Set(TEAMS.map((t) => t.name)).size === 8, 'eight distinct team names');

for (const t of TEAMS)
  ok(
    contrast(t.shirt, t.trim) >= 3,
    `${t.id}: shirt vs trim ${contrast(t.shirt, t.trim).toFixed(2)}:1 (>= 3)`,
  );
ok(contrast(KEEPER.shirt, '#0B1F14') >= 3, 'keeper shirt vs ink');
for (const [k, c] of Object.entries(PLATES))
  ok(
    contrast(CREAM, c) >= 7,
    `${k}: cream text on plate ${contrast(CREAM, c).toFixed(1)}:1 (>= 7)`,
  );
ok(
  contrast('#FFF3DA', '#B07045') >= 3 && contrast('#F3FAF4', '#23863F') >= 3,
  'chalk lines vs dust and vs light grass >= 3',
);
ok(contrast(INK, '#F3FAF4') >= 4.5, 'ink text on .pk-plate');

// no real club names anywhere in art, docs of this game or sfx (guard list, partial: a human must complete the check)
const REAL = [
  'enyimba',
  'pillars',
  'rangers',
  'rivers united',
  'shooting stars',
  'remo stars',
  'plateau united',
  'lobi',
  'heartland',
  'abia warriors',
  'akwa united',
  'insurance',
  'sunshine',
  'tornadoes',
  'wikki',
  'kwara',
  'super eagles',
  'barcelona',
  'chelsea',
  'arsenal',
  'real madrid',
];
const text = [...files.filter((f) => /\.(svg|css|json)$/.test(f))]
  .map((f) => readFileSync(f, 'utf8').toLowerCase())
  .join('\n');
ok(!REAL.some((n) => text.includes(n)), 'no real club names in the art, css or json');

// every generator/script file stays <= 400 lines
for (const f of readdirSync(join(ROOT, 'scripts')).filter((f) => /penalty-king/.test(f)))
  ok(readFileSync(join(ROOT, 'scripts', f), 'utf8').split('\n').length <= 400, `${f} <= 400 lines`);
process.exit(fail);
