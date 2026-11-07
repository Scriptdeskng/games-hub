#!/usr/bin/env node
/* global Image, document */
// Checks Naija Ludo art: track geometry, contrast of marks, and greyscale distinguishability of the
// four seeds at 16 and 24 px (silhouette IoU + luminance). Needs Playwright Chromium.
// Usage: CHECK_OUT=<dir> node scripts/check-naija-ludo-art.mjs   (writes PNG sheets to CHECK_OUT)
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';

// the generator writes on import: send that to a throwaway dir
process.env.ART_OUT = join(tmpdir(), 'naija-ludo-check-gen');
const { SEATS, TRACK, STARS } = await import('./gen-naija-ludo-art.mjs');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = join(ROOT, 'games', 'naija-ludo', 'assets');
const OUT = process.env.CHECK_OUT ?? '/tmp';
mkdirSync(OUT, { recursive: true });
let fail = 0;
const ok = (c, m) => {
  console.log((c ? 'ok   ' : 'FAIL ') + m);
  if (!c) fail = 1;
};

// track: 52 unique, adjacent, closed; stars are 8 after each start
ok(
  TRACK.length === 52 && new Set(TRACK.map((c) => c + '')).size === 52,
  'track has 52 unique cells',
);
// adjacent cells; the 4 inner corners of the cross are diagonal steps (as on a standard Ludo board)
const steps = TRACK.map((c, i) => {
  const n = TRACK[(i + 1) % 52];
  return [Math.abs(c[0] - n[0]), Math.abs(c[1] - n[1])];
});
ok(
  steps.every(([a, b]) => Math.max(a, b) === 1),
  'track is a closed loop of neighbouring cells',
);
ok(
  steps.filter(([a, b]) => a + b === 2).length === 4,
  'exactly 4 diagonal steps (inner corners of the cross)',
);
const idx = (c) => TRACK.findIndex((t) => t[0] === c[0] && t[1] === c[1]);
for (const s of SEATS) {
  const i = idx(s.start);
  ok(
    i >= 0 &&
      TRACK[(i + 8) % 52] + '' === STARS.find((t) => t + '' === TRACK[(i + 8) % 52] + '') + '',
    `seat ${s.id}: star 8 squares after start ${s.start}`,
  );
  const mouth = TRACK[(i - 2 + 52) % 52];
  const h0 = s.home[0];
  ok(
    Math.abs(mouth[0] - h0[0]) + Math.abs(mouth[1] - h0[1]) === 1 &&
      s.home
        .slice(1)
        .every((h, k) => Math.abs(h[0] - s.home[k][0]) + Math.abs(h[1] - s.home[k][1]) === 1),
    `seat ${s.id}: home column mouth ${mouth} touches ${h0} (50 steps from start)`,
  );
}
// contrast
const lum = (h) => {
  const v = [1, 3, 5]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const cr = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
console.log(
  'contrast: ink/cream',
  cr('#1D1D20', '#F3FAF4').toFixed(1),
  ' white/inset',
  cr('#FFFFFF', '#06281A').toFixed(1),
  ' white/red',
  cr('#FFFFFF', '#D91F26').toFixed(1),
  ' white/indigo',
  cr('#FFFFFF', '#1D3A9E').toFixed(1),
  ' ink/yellow',
  cr('#1D1D20', '#FFC20E').toFixed(1),
  ' ink/green',
  cr('#1D1D20', '#6DBA3F').toFixed(1),
);
ok(
  cr('#FFFFFF', '#D91F26') >= 4.5 &&
    cr('#FFFFFF', '#1D3A9E') >= 4.5 &&
    cr('#1D1D20', '#FFC20E') >= 4.5 &&
    cr('#1D1D20', '#6DBA3F') >= 4.5,
  'seed marks meet 4.5:1 on their seed colour',
);
console.log(
  'grey luminance of seat colours:',
  SEATS.map((s) => `${s.id} ${(lum(s.hex) * 100).toFixed(0)}%`).join(', '),
);

// greyscale rendering of each seed at 16 and 24 px (device scale 1) on a mid-grey and a cream cell
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 700, height: 360 }, deviceScaleFactor: 1 });
const data = {};
for (const s of SEATS)
  data[s.id] =
    'data:image/svg+xml;base64,' +
    readFileSync(join(A, 'seeds', `seed-${s.id}.svg`)).toString('base64');
// Snakes & Ladders pawns (SL-14) get the same test
const SL = join(ROOT, 'games', 'snakes-ladders', 'assets', 'pawns');
const pawns = {};
for (const id of ['you', 'tari', 'efe', 'aisha', 'funmi'])
  pawns[id] =
    'data:image/svg+xml;base64,' + readFileSync(join(SL, `pawn-${id}.svg`)).toString('base64');
const render = (d) =>
  page.evaluate(async (data) => {
    const load = (u) =>
      new Promise((r) => {
        const i = new Image();
        i.onload = () => r(i);
        i.src = u;
      });
    const out = {};
    for (const size of [16, 24]) {
      out[size] = {};
      for (const [id, u] of Object.entries(data)) {
        const img = await load(u);
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0, size, size);
        const d = x.getImageData(0, 0, size, size).data;
        const g = [],
          m = [];
        for (let i = 0; i < d.length; i += 4) {
          m.push(d[i + 3] > 128 ? 1 : 0);
          g.push(d[i + 3] ? Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) : 255);
        }
        out[size][id] = { g, m };
      }
    }
    return out;
  }, d);
const pairwise = (res, ids, label) => {
  for (const size of ['16', '24']) {
    let worstIoU = 0,
      minDiff = 1e9;
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = res[size][ids[i]],
          b = res[size][ids[j]];
        let inter = 0,
          uni = 0,
          diff = 0;
        a.m.forEach((v, k) => {
          inter += v & b.m[k];
          uni += v | b.m[k];
          diff += Math.abs(a.g[k] - b.g[k]);
        });
        const iou = inter / uni,
          md = diff / a.m.length;
        worstIoU = Math.max(worstIoU, iou);
        minDiff = Math.min(minDiff, md);
        console.log(
          `  ${label} ${size}px ${ids[i]} vs ${ids[j]}: silhouette IoU ${iou.toFixed(2)}, mean grey difference ${md.toFixed(0)}/255`,
        );
      }
    ok(
      worstIoU < 0.85,
      `${label} ${size}px: every pair has a different silhouette (worst IoU ${worstIoU.toFixed(2)} < 0.85)`,
    );
    ok(
      minDiff > 18,
      `${label} ${size}px: every pair differs in greyscale pixels (min mean diff ${minDiff.toFixed(0)} > 18)`,
    );
  }
};
const ids = SEATS.map((s) => s.id);
pairwise(await render(data), ids, 'ludo seeds');
pairwise(await render(pawns), Object.keys(pawns), 'S&L pawns');
// contact sheet: colour row then greyscale row, 16 / 24 / 48 px, on cream and on the dark yard inset
const html = `<body style="margin:0;background:#888"><div id="s">${[['#F3FAF4'], ['#06281A']].map(([bg]) => [0, 1].map((gs) => `<div style="display:flex;gap:14px;align-items:center;padding:10px;background:${bg};${gs ? 'filter:grayscale(1)' : ''}">${[16, 24, 48].map((px) => ids.map((id) => `<img src="${data[id]}" width="${px}" height="${px}">`).join('')).join('<span style="width:24px"></span>')}</div>`).join('')).join('')}</div>`;
await page.setContent(html);
await page.locator('#s').screenshot({ path: join(OUT, 'ludo-seeds-greyscale.png') });
const pids = Object.keys(pawns);
await page.setContent(
  `<body style="margin:0"><div id="s">${[0, 1].map((gs) => `<div style="display:flex;gap:14px;align-items:center;padding:10px;background:#FFF5CC;${gs ? 'filter:grayscale(1)' : ''}">${[16, 24, 48].map((px) => pids.map((id) => `<img src="${pawns[id]}" width="${px}" height="${px}">`).join('')).join('<span style="width:24px"></span>')}</div>`).join('')}</div>`,
);
await page.locator('#s').screenshot({ path: join(OUT, 'sl-pawns-greyscale.png') });
// board at 360 px, colour and greyscale
await page.setViewportSize({ width: 360, height: 700 });
await page.setContent(
  `<body style="margin:0;background:#0B3D22"><img id="b" src="data:image/svg+xml;base64,${readFileSync(join(A, 'board', 'board.svg')).toString('base64')}" width="348" style="margin:6px;display:block"></body>`,
);
await page.screenshot({
  path: join(OUT, 'ludo-board-360.png'),
  clip: { x: 0, y: 0, width: 360, height: 360 },
});
await page.screenshot({
  path: join(OUT, 'ludo-board-360.png'),
  clip: { x: 0, y: 0, width: 360, height: 360 },
});
await page.addStyleTag({ content: 'body{filter:grayscale(1)}' });
await page.screenshot({
  path: join(OUT, 'ludo-board-360-grey.png'),
  clip: { x: 0, y: 0, width: 360, height: 360 },
});
await browser.close();
process.exit(fail);
