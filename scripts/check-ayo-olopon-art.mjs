#!/usr/bin/env node
// Checks Ayo Olopon art: no empty files, SVG well-formedness, pit geometry and tap targets,
// layout contract, ship.json globs, size budget (<= 800 KB). No browser needed.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

process.env.ART_OUT = join(tmpdir(), 'ayo-olopon-check-gen'); // generator writes on import
const { PIT_R, PITCH, SIZES, pitCentre, TRAYS } = await import('./gen-ayo-olopon-art.mjs');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = join(ROOT, 'games', 'ayo-olopon', 'assets');
let fail = 0;
const ok = (c, m) => {
  console.log((c ? 'ok   ' : 'FAIL ') + m);
  if (!c) fail = 1;
};
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)],
  );
const files = walk(A);
ok(
  files.every((f) => statSync(f).size > 0),
  `no empty files (${files.length} files)`,
);
let total = 0;
for (const f of files) total += statSync(f).size;
ok(total <= 800 * 1024, `total art ${(total / 1024).toFixed(1)} KB <= 800 KB`);

for (const f of files.filter((f) => f.endsWith('.svg'))) {
  const s = readFileSync(f, 'utf8');
  const tags = [...s.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)];
  const st = [];
  let good = /^<svg[^>]*viewBox="[^"]+"/.test(s) && s.trimEnd().endsWith('</svg>');
  for (const [, close, name, , self] of tags) {
    if (self) continue;
    if (close) {
      if (st.pop() !== name) good = false;
    } else st.push(name);
  }
  ok(good && st.length === 0 && !/NaN|undefined/.test(s), `well-formed ${relative(A, f)}`);
  const ids = [...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  ok(new Set(ids).size === ids.length, `unique ids ${relative(A, f)}`);
}

for (const orient of ['landscape', 'portrait']) {
  const [W, H] = SIZES[orient];
  const pts = Array.from({ length: 12 }, (_, i) => pitCentre(orient, i));
  let minD = 1e9;
  for (let i = 0; i < 12; i++)
    for (let j = i + 1; j < 12; j++)
      minD = Math.min(minD, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
  ok(
    minD >= PIT_R * 2 + 16,
    `${orient}: pits do not overlap (min centre gap ${minD}, need ${PIT_R * 2 + 16})`,
  );
  // counter-clockwise: signed area of the 12-pit loop in screen coords (y down) is negative for CCW
  let area = 0;
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = pts[i],
      [x2, y2] = pts[(i + 1) % 12];
    area += x1 * y2 - x2 * y1;
  }
  ok(area < 0, `${orient}: index+1 mod 12 runs counter-clockwise on screen`);
  const steps = pts.map((p, i) =>
    Math.hypot(p[0] - pts[(i + 1) % 12][0], p[1] - pts[(i + 1) % 12][1]),
  );
  ok(
    steps.every((d) => d <= PITCH * 2.4),
    `${orient}: neighbouring pit indices are neighbours on the board`,
  );
  const [x0, y0, w0, h0] = TRAYS[orient].human;
  ok(
    pts.every(
      ([x, y]) => x - PIT_R > 20 && y - PIT_R > 20 && x + PIT_R < W - 20 && y + PIT_R < H - 20,
    ),
    `${orient}: pits inside the frame`,
  );
  const overlapTray = Object.values(TRAYS[orient]).some(([x, y, w, h]) =>
    pts.some(
      ([px, py]) => px + PIT_R > x && px - PIT_R < x + w && py + PIT_R > y && py - PIT_R < y + h,
    ),
  );
  ok(!overlapTray && w0 > 0 && h0 > 0, `${orient}: pits clear of the trays`);
  const widths = orient === 'portrait' ? [360, 412] : [640, 800, 1024];
  for (const vw of widths) {
    const px = ((PIT_R * 2) / W) * vw;
    ok(px >= 44, `${orient}: pit tap target at ${vw}px board width = ${px.toFixed(0)} px (>= 44)`);
  }
}
const L = JSON.parse(readFileSync(join(A, 'board', 'layout.json'), 'utf8'));
ok(
  L.landscape.pits.length === 12 && L.portrait.pits.length === 12,
  'layout.json has 12 pits per orientation',
);
ok(
  L.landscape.trays.human.slots.length === 48 && L.portrait.trays.opponent.slots.length === 48,
  'tray slot grids hold 48 seeds',
);

const ship = JSON.parse(readFileSync(join(A, 'ship.json'), 'utf8'));
const re = (g) =>
  new RegExp(
    '^' +
      g
        .split('**')
        .map((p) =>
          p
            .split('*')
            .map((l) => l.replace(/[.+^${}()|[\]\\]/g, '\\$&'))
            .join('[^/]*'),
        )
        .join('.*') +
      '$',
  );
const rel = files.map((f) => relative(A, f));
for (const g of [...ship.include, ...ship.dynamic, ...ship.keep])
  ok(
    rel.some((f) => re(g).test(f)),
    `ship.json pattern "${g}" matches a file`,
  );
if (fail) process.exit(1);
