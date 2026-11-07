#!/usr/bin/env node
// Generates the original SVG art for Snakes & Ladders: Lagos Edition (asset-designer, in-repo).
// Output: games/snakes-ladders/assets/{board,pawns,dice,icons,thumb}. Re-run after editing the layout.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME = join(dirname(fileURLToPath(import.meta.url)), '..', 'games', 'snakes-ladders');
// ART_OUT lets you render into a scratch dir (to diff against the committed art) without touching it.
const OUT = process.env.ART_OUT ?? join(GAME, 'assets');
const INK = '#1D1D20',
  YEL = '#FFC20E',
  RED = '#D91F26',
  CREAM = '#FFF5CC';
const GREY = '#6B6B73',
  LGREY = '#C4C4CC',
  WHITE = '#FFFFFF',
  GREEN = '#0E6B3A',
  BLUE = '#2A5CAA',
  BROWN = '#8A5A2B',
  ORANGE = '#F58A24';
const w = (p, s) => {
  mkdirSync(dirname(join(OUT, p)), { recursive: true });
  writeFileSync(join(OUT, p), s);
};
const svg = (vb, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${extra}>${body}</svg>`;
const g = (inner) =>
  `<g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${inner}</g>`;
const r1 = (n) => Math.round(n * 10) / 10;

// ---------------- layout: one source of truth, games/snakes-ladders/src/rules/layout.json ----------------
const layoutJson = JSON.parse(readFileSync(join(GAME, 'src', 'rules', 'layout.json'), 'utf8'));
export const LAYOUT = [
  ...layoutJson.ladders.map((l) => [l.from, l.to, 'ladder', l.theme]),
  ...layoutJson.snakes.map((l) => [l.from, l.to, 'snake', l.theme]),
];
const LANDMARKS = {
  3: 'danfo',
  6: 'ferry',
  16: 'stalls',
  18: 'generator',
  21: 'suya',
  23: 'recharge',
  46: 'football',
  57: 'canteen',
  63: 'pole',
  69: 'bread',
  79: 'brtstop',
  82: 'tollgate',
  90: 'bridge',
  97: 'keke',
};
const cellXY = (n) => {
  const r = Math.floor((n - 1) / 10),
    c0 = (n - 1) % 10,
    c = r % 2 ? 9 - c0 : c0;
  return [c * 100, (9 - r) * 100];
};

// ---------------- landmark symbols (viewBox 0 0 64 64) ----------------
const lm = {
  danfo: g(
    `<path d="M16 24l4-10h24l5 10z" fill="${YEL}"/><rect x="6" y="23" width="52" height="24" rx="5" fill="${YEL}"/><rect x="6" y="33" width="52" height="5" fill="${INK}"/><rect x="21" y="17" width="9" height="6" fill="${CREAM}" stroke-width="2"/><rect x="34" y="17" width="9" height="6" fill="${CREAM}" stroke-width="2"/><circle cx="18" cy="48" r="6" fill="${INK}"/><circle cx="46" cy="48" r="6" fill="${INK}"/><circle cx="18" cy="48" r="2" fill="${LGREY}" stroke="none"/><circle cx="46" cy="48" r="2" fill="${LGREY}" stroke="none"/>`,
  ),
  ferry: g(
    `<path d="M6 40h52l-8 10H14z" fill="${RED}"/><rect x="18" y="27" width="28" height="13" fill="${CREAM}"/><rect x="38" y="18" width="6" height="9" fill="${YEL}"/><rect x="22" y="31" width="5" height="5" fill="${BLUE}" stroke-width="2"/><rect x="31" y="31" width="5" height="5" fill="${BLUE}" stroke-width="2"/><path d="M4 55q6-5 12 0t12 0 12 0 12 0 12 0" fill="none" stroke="${BLUE}" stroke-width="4"/>`,
  ),
  stalls: [4, 34]
    .map((x) =>
      g(
        `<rect x="${x + 3}" y="36" width="20" height="16" fill="${BROWN}"/><circle cx="${x + 9}" cy="34" r="3.5" fill="${YEL}" stroke-width="2"/><circle cx="${x + 17}" cy="34" r="3.5" fill="${ORANGE}" stroke-width="2"/><path d="M${x} 18h26l-3 12H${x + 3}z" fill="${RED}"/><path d="M${x + 7} 18l-1 12M${x + 13} 18v12M${x + 19} 18l1 12" stroke="${CREAM}" stroke-width="3" fill="none"/>`,
      ),
    )
    .join(''),
  generator: g(
    `<rect x="8" y="26" width="42" height="22" rx="3" fill="${RED}"/><path d="M14 26v-7h30v7" fill="none"/><rect x="14" y="31" width="14" height="10" fill="${CREAM}" stroke-width="2"/><circle cx="40" cy="36" r="5" fill="${CREAM}" stroke-width="2"/><path d="M50 32h7v-8" fill="none"/><circle cx="57" cy="19" r="4" fill="${LGREY}" stroke-width="2"/><circle cx="53" cy="11" r="3" fill="${LGREY}" stroke-width="2"/><rect x="11" y="48" width="6" height="5" fill="${INK}"/><rect x="41" y="48" width="6" height="5" fill="${INK}"/>`,
  ),
  suya: g(
    `<path d="M12 28l34 10M20 25l34 10M12 36l30 8" fill="none" stroke="${BROWN}"/><circle cx="26" cy="33" r="3.5" fill="${ORANGE}" stroke-width="2"/><circle cx="36" cy="36" r="3.5" fill="${ORANGE}" stroke-width="2"/><circle cx="44" cy="31" r="3.5" fill="${ORANGE}" stroke-width="2"/><rect x="8" y="42" width="48" height="8" fill="${INK}"/><path d="M12 50l-2 7M52 50l2 7" fill="none"/><path d="M16 42q2-5 4 0t4 0 4 0" fill="${RED}" stroke-width="2"/><path d="M30 20q-5-5 0-9t0-7M42 20q-5-5 0-9t0-7" fill="none" stroke="${GREY}" stroke-width="2.5"/>`,
  ),
  recharge: g(
    `<path d="M6 28a26 26 0 0 1 52 0z" fill="${YEL}"/><path d="M19 28a13 20 0 0 1 8-23M45 28a13 20 0 0 0-8-23M32 28V5" fill="none" stroke-width="2.5"/><path d="M32 28v28" fill="none"/><rect x="12" y="42" width="40" height="5" fill="${BROWN}"/><path d="M16 47v9M48 47v9" fill="none"/><rect x="16" y="33" width="9" height="9" fill="${CREAM}" stroke-width="2" transform="rotate(-8 20 38)"/><rect x="38" y="33" width="9" height="9" fill="${WHITE}" stroke-width="2" transform="rotate(8 42 38)"/>`,
  ),
  bread: g(
    `<rect x="6" y="44" width="52" height="6" rx="2" fill="${BROWN}"/><rect x="8" y="24" width="48" height="20" rx="10" fill="#D9953A"/><path d="M19 28l4 12M30 27l3 14M41 28l3 12" fill="none" stroke="#F4C77A" stroke-width="3"/>`,
  ),
  football: g(
    `<ellipse cx="32" cy="54" rx="28" ry="5" fill="#D8B77A"/><path d="M6 52V20h12v32M6 20h12" fill="none" stroke-width="3"/><circle cx="40" cy="38" r="12" fill="${WHITE}"/><path d="M40 33l5 4-2 6h-6l-2-6z" fill="${INK}" stroke-width="2"/><path d="M52 52q4-3 8 0" fill="none" stroke="${GREY}" stroke-width="2.5"/>`,
  ),
  canteen: g(
    `<rect x="6" y="44" width="52" height="6" fill="${BROWN}"/><path d="M10 50v8M54 50v8" fill="none"/><path d="M14 28h30v8q0 8-15 8t-15-8z" fill="${RED}"/><rect x="12" y="24" width="34" height="5" rx="2" fill="${YEL}"/><path d="M14 31h-5M44 31h5" fill="none"/><path d="M24 20q-4-5 0-9M34 20q-4-5 0-9" fill="none" stroke="${GREY}" stroke-width="2.5"/><path d="M54 44V14" fill="none"/><rect x="46" y="8" width="16" height="9" rx="2" fill="${CREAM}"/>`,
  ),
  pole: g(
    `<rect x="29" y="5" width="6" height="53" fill="${BROWN}"/><rect x="12" y="13" width="40" height="4" fill="${BROWN}"/><rect x="18" y="23" width="28" height="4" fill="${BROWN}"/><path d="M14 17v-3M24 17v-3M40 17v-3M50 17v-3M20 27v-3M44 27v-3" fill="none" stroke-width="3"/><path d="M12 15Q6 24 2 22M52 15Q58 24 62 22M18 25Q9 32 3 29M46 25Q55 32 61 29" fill="none" stroke="${GREY}" stroke-width="2"/><rect x="38" y="33" width="9" height="12" rx="2" fill="${LGREY}" stroke-width="2"/>`,
  ),
  brtstop: g(
    `<rect x="4" y="15" width="56" height="7" rx="2" fill="${INK}"/><path d="M8 22v34M56 22v34" fill="none"/><rect x="8" y="24" width="48" height="18" fill="#BFD8EE" stroke-width="2"/><rect x="12" y="44" width="40" height="5" fill="${BROWN}"/><rect x="15" y="50" width="4" height="6" fill="${INK}"/><rect x="45" y="50" width="4" height="6" fill="${INK}"/><rect x="26" y="8" width="12" height="7" rx="2" fill="${YEL}" stroke-width="2"/>`,
  ),
  tollgate: g(
    `<rect x="4" y="14" width="30" height="7" fill="${RED}"/><rect x="8" y="21" width="22" height="31" fill="${CREAM}"/><rect x="12" y="27" width="14" height="10" fill="#BFD8EE" stroke-width="2"/><rect x="4" y="52" width="30" height="5" fill="${GREY}"/><rect x="30" y="35" width="30" height="6" fill="${WHITE}"/><path d="M38 35v6M46 35v6M54 35v6" fill="none" stroke="${RED}" stroke-width="4"/><rect x="30" y="35" width="30" height="6" fill="none"/>`,
  ),
  bridge: g(
    `<path d="M2 28h60" fill="none" stroke-width="5"/><path d="M10 31v16M26 31v16M42 31v16M58 31v16" fill="none" stroke="${GREY}" stroke-width="5"/><path d="M6 28v-8M20 28v-8M34 28v-8M48 28v-8M60 28v-8" fill="none" stroke-width="2.5"/><path d="M2 49h60v10H2z" fill="${BLUE}"/><path d="M4 53q5-4 10 0t10 0 10 0 10 0 10 0" fill="none" stroke="${WHITE}" stroke-width="2"/>`,
  ),
  keke: g(
    `<path d="M18 24h26q7 0 7 7v12H12V30q0-6 6-6z" fill="${YEL}"/><path d="M6 44q0-9 8-12v12z" fill="${YEL}"/><rect x="12" y="34" width="39" height="5" fill="${INK}"/><rect x="21" y="28" width="12" height="5" fill="${CREAM}" stroke-width="2"/><circle cx="14" cy="48" r="6" fill="${INK}"/><circle cx="44" cy="48" r="6" fill="${INK}"/><circle cx="14" cy="48" r="2" fill="${LGREY}" stroke="none"/><circle cx="44" cy="48" r="2" fill="${LGREY}" stroke="none"/><path d="M20 24v-6h22v6" fill="none"/>`,
  ),
  start: g(
    `<rect x="29" y="6" width="6" height="50" rx="2" fill="${CREAM}"/><rect x="14" y="10" width="36" height="16" rx="4" fill="${CREAM}"/><path d="M20 18h18M33 12l7 6-7 6z" fill="${INK}" stroke-width="3"/><rect x="22" y="56" width="20" height="4" rx="2" fill="${INK}"/>`,
  ),
  finish: g(
    `<path d="M16 6v50" fill="none" stroke="${INK}" stroke-width="4"/><rect x="16" y="8" width="32" height="24" fill="${WHITE}"/><path d="M16 8h8v8h-8zM32 8h8v8h-8zM24 16h8v8h-8zM40 16h8v8h-8zM16 24h8v8h-8zM32 24h8v8h-8z" fill="${INK}" stroke="none"/><path d="M34 56V46l9-8 9 8v10z" fill="${CREAM}"/>`,
  ),
};
const sym = (id, body) => `<symbol id="${id}" viewBox="0 0 64 64">${body}</symbol>`;
const lmSymbols = (ids) => ids.map((k) => sym('lm-' + k, lm[k])).join('');

// ---------------- connector badges ----------------
const chipUp = `<circle cx="47" cy="47" r="15" fill="${INK}"/><path d="M47 37l9 14H38z" fill="${WHITE}"/>`;
const chipDown = `<circle cx="47" cy="47" r="15" fill="${WHITE}" stroke="${INK}" stroke-width="3"/><path d="M47 57l-9-14h18z" fill="${INK}"/>`;
const ladderBase = `<rect x="3" y="3" width="58" height="58" rx="12" fill="${YEL}" stroke="${INK}" stroke-width="4"/>`;
const snakeBase = `<path d="M21 3h22l18 18v22L43 61H21L3 43V21z" fill="${RED}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
const gl = (s) => `<g transform="translate(5 5) scale(.62)">${s}</g>`;
const badges = {
  'badge-brt':
    ladderBase +
    gl(
      `<rect x="2" y="12" width="60" height="30" rx="5" fill="${WHITE}" stroke="${INK}" stroke-width="4"/><rect x="2" y="26" width="60" height="6" fill="${BLUE}"/><rect x="9" y="17" width="10" height="8" fill="${INK}"/><rect x="27" y="17" width="10" height="8" fill="${INK}"/><rect x="45" y="17" width="10" height="8" fill="${INK}"/><circle cx="16" cy="44" r="7" fill="${INK}"/><circle cx="48" cy="44" r="7" fill="${INK}"/>`,
    ) +
    chipUp,
  'badge-okada':
    ladderBase +
    gl(
      `<circle cx="12" cy="46" r="10" fill="none" stroke="${INK}" stroke-width="5"/><circle cx="52" cy="46" r="10" fill="none" stroke="${INK}" stroke-width="5"/><path d="M12 46l14-14h18l8 14M26 32l-4-8h-6M44 32l-2-12" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><circle cx="34" cy="10" r="7" fill="${INK}"/><path d="M26 34l6-18h6l4 14" fill="${INK}" stroke="${INK}" stroke-width="4"/>`,
    ) +
    chipUp,
  'badge-keke':
    ladderBase +
    gl(
      `<path d="M16 8h32q8 0 8 9v26H8V18q0-10 8-10z" fill="${WHITE}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><rect x="8" y="26" width="48" height="7" fill="${INK}"/><rect x="18" y="14" width="26" height="8" fill="${INK}"/><circle cx="18" cy="47" r="8" fill="${INK}"/><circle cx="46" cy="47" r="8" fill="${INK}"/>`,
    ) +
    chipUp,
  'badge-bridge':
    ladderBase +
    gl(
      `<path d="M0 24h64" stroke="${INK}" stroke-width="7"/><path d="M12 24v22M32 24v22M52 24v22" stroke="${INK}" stroke-width="7"/><path d="M0 52q8-6 16 0t16 0 16 0 16 0" fill="none" stroke="${BLUE}" stroke-width="6"/><path d="M8 24v-12M26 24v-12M44 24v-12M60 24v-12" stroke="${INK}" stroke-width="4"/>`,
    ) +
    chipUp,
  'badge-pothole':
    snakeBase +
    gl(
      `<path d="M0 22h64" stroke="${WHITE}" stroke-width="6"/><ellipse cx="32" cy="36" rx="24" ry="13" fill="${INK}"/><path d="M6 36l-6-6M58 36l6-8M32 49v9M14 45l-6 6M50 45l6 6" stroke="${WHITE}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    ) +
    chipDown,
  'badge-goslow':
    snakeBase +
    gl(
      `<rect x="0" y="20" width="28" height="18" rx="5" fill="${WHITE}" stroke="${INK}" stroke-width="4"/><rect x="34" y="20" width="28" height="18" rx="5" fill="${WHITE}" stroke="${INK}" stroke-width="4"/><circle cx="8" cy="42" r="5" fill="${INK}"/><circle cx="22" cy="42" r="5" fill="${INK}"/><circle cx="42" cy="42" r="5" fill="${INK}"/><circle cx="56" cy="42" r="5" fill="${INK}"/><path d="M6 8h52" stroke="${WHITE}" stroke-width="4" stroke-dasharray="8 7"/>`,
    ) +
    chipDown,
  'badge-nepa':
    snakeBase +
    gl(
      `<circle cx="32" cy="24" r="19" fill="${WHITE}" stroke="${INK}" stroke-width="4"/><rect x="24" y="42" width="16" height="12" rx="2" fill="${INK}"/><path d="M23 16l18 16M41 16L23 32" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
    ) +
    chipDown,
  'badge-tollqueue':
    snakeBase +
    gl(
      `<rect x="0" y="18" width="20" height="30" fill="${WHITE}" stroke="${INK}" stroke-width="4"/><rect x="0" y="8" width="26" height="10" fill="${INK}"/><rect x="20" y="28" width="44" height="8" fill="${WHITE}" stroke="${INK}" stroke-width="4"/><path d="M34 28v8M44 28v8M54 28v8" stroke="${INK}" stroke-width="4"/><rect x="34" y="42" width="26" height="12" rx="4" fill="${INK}"/>`,
    ) +
    chipDown,
};
const caps = {
  'end-up': `<rect x="2" y="2" width="36" height="36" rx="9" fill="${YEL}" stroke="${INK}" stroke-width="3.5"/><path d="M20 9l11 14H9z" fill="${INK}"/><rect x="15" y="22" width="10" height="9" fill="${INK}"/>`,
  'end-down': `<path d="M13 2h14l11 11v14L27 38H13L2 27V13z" fill="${RED}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M20 31L9 17h22z" fill="${WHITE}"/><rect x="15" y="9" width="10" height="9" fill="${WHITE}"/>`,
};
const badgeSyms = (ids) =>
  ids.map((k) => `<symbol id="${k}" viewBox="0 0 64 64">${badges[k]}</symbol>`).join('');
const capSyms = Object.entries(caps)
  .map(([k, v]) => `<symbol id="${k}" viewBox="0 0 40 40">${v}</symbol>`)
  .join('');

// ---------------- sprites ----------------
w(
  'board/landmarks.svg',
  svg('0 0 64 64', lmSymbols(Object.keys(lm)), ' width="0" height="0" style="position:absolute"'),
);
w(
  'board/connectors.svg',
  svg(
    '0 0 64 64',
    badgeSyms(Object.keys(badges)) + capSyms,
    ' width="0" height="0" style="position:absolute"',
  ),
);

// ---------------- board background ----------------
{
  const checker = [];
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++)
      if ((r + c) % 2) checker.push(`M${c * 100} ${r * 100}h100v100h-100z`);
  const lines = [];
  for (let i = 1; i < 10; i++) lines.push(`M${i * 100} 0V1000M0 ${i * 100}H1000`);
  const [sx, sy] = cellXY(1),
    [fx, fy] = cellXY(100);
  let chq = '';
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      if ((i + j) % 2 === 0) chq += `M${fx + 4 + i * 23} ${fy + 4 + j * 23}h23v23h-23z`;
  const uses = Object.entries(LANDMARKS)
    .map(([n, k]) => {
      const [x, y] = cellXY(+n);
      return `<use href="#lm-${k}" x="${x + 33}" y="${y + 31}" width="64" height="64"/>`;
    })
    .join('');
  const body =
    `<defs>${lmSymbols([...new Set(Object.values(LANDMARKS)), 'start', 'finish'])}</defs>` +
    `<rect width="1000" height="1000" fill="${CREAM}"/><path d="${checker.join('')}" fill="#F5E6A8"/>` +
    `<rect x="${sx}" y="${sy}" width="100" height="100" fill="${GREEN}"/><rect x="${fx}" y="${fy}" width="100" height="100" fill="${YEL}"/><path d="${chq}" fill="${INK}"/>` +
    `<path d="${lines.join('')}" stroke="${INK}" stroke-opacity=".28" stroke-width="3" fill="none"/>` +
    uses +
    `<use href="#lm-start" x="${sx + 33}" y="${sy + 31}" width="64" height="64"/><use href="#lm-finish" x="${fx + 33}" y="${fy + 33}" width="64" height="64"/>` +
    `<rect x="1.5" y="1.5" width="997" height="997" fill="none" stroke="${INK}" stroke-width="3"/>`;
  w('board/board-bg.svg', svg('0 0 1000 1000', body, ' width="1000" height="1000"'));
}

// ---------------- default overlay ----------------
const centre = (n) => {
  const [x, y] = cellXY(n);
  return [x + 50, y + 50];
};
function connector([a, b, kind, theme]) {
  const [x1, y1] = centre(a),
    [x2, y2] = centre(b);
  const dx = x2 - x1,
    dy = y2 - y1,
    len = Math.hypot(dx, dy),
    ux = dx / len,
    uy = dy / len,
    nx = -uy,
    ny = ux;
  const pad = 34,
    sx = x1 + ux * pad,
    sy = y1 + uy * pad,
    ex = x2 - ux * pad,
    ey = y2 - uy * pad,
    L = len - 2 * pad;
  let out = '';
  if (kind === 'ladder') {
    const o = 14,
      rails = [1, -1]
        .map(
          (s) =>
            `M${r1(sx + nx * o * s)} ${r1(sy + ny * o * s)}L${r1(ex + nx * o * s)} ${r1(ey + ny * o * s)}`,
        )
        .join('');
    let rungs = '';
    const n = Math.max(2, Math.round(L / 28));
    for (let i = 0; i <= n; i++) {
      const t = i / n,
        px = sx + (ex - sx) * t,
        py = sy + (ey - sy) * t;
      rungs += `M${r1(px + nx * o)} ${r1(py + ny * o)}L${r1(px - nx * o)} ${r1(py - ny * o)}`;
    }
    out += `<path d="${rails}${rungs}" stroke="${INK}" stroke-width="10" stroke-linecap="round" fill="none"/><path d="${rails}${rungs}" stroke="${YEL}" stroke-width="5.5" stroke-linecap="round" fill="none"/>`;
  } else {
    const seg = Math.max(2, Math.round(L / 36)),
      step = L / seg,
      A = 15;
    let d = `M${r1(sx)} ${r1(sy)}`;
    for (let i = 0; i < seg; i++) {
      const mx = sx + ux * step * (i + 0.5) + nx * 2 * A * (i % 2 ? -1 : 1),
        my = sy + uy * step * (i + 0.5) + ny * 2 * A * (i % 2 ? -1 : 1);
      d += `Q${r1(mx)} ${r1(my)} ${r1(sx + ux * step * (i + 1))} ${r1(sy + uy * step * (i + 1))}`;
    }
    out += `<path d="${d}" stroke="${INK}" stroke-width="15" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${RED}" stroke-width="10" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${WHITE}" stroke-width="3" stroke-dasharray="7 11" fill="none"/>`;
  }
  out += `<use href="#end-${kind === 'ladder' ? 'up' : 'down'}" x="${x2 - 22}" y="${y2 - 22}" width="44" height="44"/>`;
  out += `<use href="#badge-${theme}" x="${x1 - 36 + 4}" y="${y1 - 36 + 14}" width="72" height="72"/>`;
  return out;
}
{
  const used = [...new Set(LAYOUT.map((l) => 'badge-' + l[3]))];
  const lines = LAYOUT.map(connector);
  // lines first, then end caps and badges on top
  const paths = lines.map((s) => s.replace(/<use[^>]*\/>/g, '')).join('');
  const uses = lines.map((s) => (s.match(/<use[^>]*\/>/g) || []).join('')).join('');
  w(
    'board/overlay-default.svg',
    svg(
      '0 0 1000 1000',
      `<defs>${badgeSyms(used)}${capSyms}</defs>${paths}${uses}`,
      ' width="1000" height="1000"',
    ),
  );
}

// ---------------- pawns (48x48, viewBox -2 -2 52 52) ----------------
// SL-14: every pawn has its own SILHOUETTE (circle, square, triangle, diamond, hexagon), a white halo, an
// ink outline and a big inner mark, so they differ in greyscale at 16 px. SL-18: this section is the single
// source for pawn-you/tari/efe/aisha/funmi.svg and the thumbnails, so running the script never reverts them.
const PAWNS = {
  you: {
    hex: '#1D3A9E',
    body: '<circle cx="24" cy="24" r="15.5"/>',
    mark: `<circle cx="24" cy="24" r="8.5" fill="none" stroke="#fff" stroke-width="3.5"/><circle cx="24" cy="24" r="3.4" fill="#fff"/>`,
  },
  tari: {
    hex: '#0B7F8A',
    body: '<rect x="6.5" y="6.5" width="35" height="35" rx="2.5"/>',
    mark: `<rect x="15" y="15" width="18" height="18" fill="none" stroke="#fff" stroke-width="3.5"/>`,
  },
  efe: {
    hex: RED,
    body: '<path d="M24 7L42 41H6z"/>',
    mark: `<path d="M16 33h16" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`,
  },
  aisha: {
    hex: '#7B2D8E',
    body: '<path d="M24 2.5L45.5 24 24 45.5 2.5 24z"/>',
    mark: `<path d="M24 14L34 24 24 34 14 24z" fill="none" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/>`,
  },
  funmi: {
    hex: '#0E7A3B',
    body: '<path d="M24 4.5L40.5 14v20L24 43.5 7.5 34V14z"/>',
    mark: `<circle cx="16" cy="24" r="3.2" fill="#fff"/><circle cx="24" cy="24" r="3.2" fill="#fff"/><circle cx="32" cy="24" r="3.2" fill="#fff"/>`,
  },
};
const pawnLayers = (id) => {
  const p = PAWNS[id];
  return `<g fill="#fff" stroke="#fff" stroke-width="9" stroke-linejoin="round">${p.body}</g><g fill="${INK}" stroke="${INK}" stroke-width="5" stroke-linejoin="round">${p.body}</g><g fill="${p.hex}">${p.body}</g>${p.mark}`;
};
for (const id of Object.keys(PAWNS))
  w(`pawns/pawn-${id}.svg`, svg('-2 -2 52 52', pawnLayers(id), ' width="48" height="48"'));
// small off-board start tray (the developer decides placement): four pits in an aso-oke striped bar
w(
  'pawns/start-tray.svg',
  svg(
    '0 0 160 48',
    `<rect x="2" y="2" width="156" height="44" rx="12" fill="${CREAM}" stroke="${INK}" stroke-width="4"/><rect x="8" y="6" width="144" height="5" rx="2.5" fill="${YEL}"/><rect x="8" y="37" width="144" height="5" rx="2.5" fill="${RED}"/>${[0, 1, 2, 3].map((i) => `<circle cx="${32 + i * 32}" cy="24" r="12" fill="${LGREY}" stroke="${INK}" stroke-width="3" stroke-dasharray="4 3"/>`).join('')}`,
    ' width="160" height="48"',
  ),
);

// ---------------- dice (64x64) ----------------
const PIPS = {
  1: [[32, 32]],
  2: [
    [19, 19],
    [45, 45],
  ],
  3: [
    [19, 19],
    [32, 32],
    [45, 45],
  ],
  4: [
    [19, 19],
    [45, 19],
    [19, 45],
    [45, 45],
  ],
  5: [
    [19, 19],
    [45, 19],
    [32, 32],
    [19, 45],
    [45, 45],
  ],
  6: [
    [19, 17],
    [19, 32],
    [19, 47],
    [45, 17],
    [45, 32],
    [45, 47],
  ],
};
const dieBody = (n) =>
  `<rect x="6" y="9" width="54" height="52" rx="11" fill="${INK}"/><rect x="4" y="3" width="54" height="54" rx="11" fill="${WHITE}" stroke="${INK}" stroke-width="4"/>` +
  PIPS[n].map(([x, y]) => `<circle cx="${x - 2}" cy="${y - 3}" r="6.5" fill="${INK}"/>`).join('');
for (let n = 1; n <= 6; n++)
  w(`dice/die-${n}.svg`, svg('0 0 64 64', dieBody(n), ' width="64" height="64"'));
w(
  'dice/die-roll.svg',
  svg(
    '0 0 64 64',
    `<path d="M3 20h12M1 32h14M4 44h11M52 18h9M54 30h9M52 42h9" stroke="${GREY}" stroke-width="3.5" stroke-linecap="round"/><g transform="rotate(18 32 32) translate(6 4) scale(.82)">${dieBody(3)}</g>`,
    ' width="64" height="64"',
  ),
);
w(
  'dice/dice-pick-two.svg',
  svg(
    '0 0 144 64',
    `<g transform="translate(0 2) scale(.9)">${dieBody(5)}</g><g transform="translate(86 2) scale(.9)">${dieBody(2)}</g><path d="M60 32h-0M62 32l8-9v6h4v-6l8 9-8 9v-6h-4v6z" fill="${YEL}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" transform="translate(-6 0) scale(1)"/>`,
    ' width="144" height="64"',
  ),
);
{
  const hand = (fill) =>
    `<path d="M16 66C16 46 28 36 46 38l18 5v50c0 12-12 20-24 18C26 109 16 92 16 66z" fill="${fill}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M26 56c6-1 12 0 18 2M24 70c7-1 14 0 20 3M26 84c6-1 12 0 17 3" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".55"/><ellipse cx="46" cy="38" rx="11" ry="6" transform="rotate(-18 46 38)" fill="${fill}" stroke="${INK}" stroke-width="4"/>`;
  w(
    'dice/hands-cup.svg',
    svg(
      '0 0 128 128',
      `<g transform="translate(36 6) rotate(12 28 28) scale(.88)">${dieBody(4)}</g><g transform="rotate(-22 40 100)">${hand('#5E3822')}</g><g transform="matrix(-1 0 0 1 128 0)"><g transform="rotate(-22 40 100)">${hand('#8A5A3A')}</g></g><path d="M7 62q-5 10 0 20M2 56q-5 16 0 32M121 62q5 10 0 20M126 56q5 16 0 32" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`,
      ' width="128" height="128"',
    ),
  );
}

// ---------------- power-up icons (64x64) ----------------
const arrows = (c) =>
  `<path d="M14 30a19 19 0 0 1 32-11" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M50 8v16H35z" fill="${c}"/><path d="M50 34a19 19 0 0 1-32 11" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M14 56V40h15z" fill="${c}"/>`;
const mini = `<rect x="22" y="22" width="20" height="20" rx="4" fill="${WHITE}" stroke="${INK}" stroke-width="2.5"/><circle cx="28" cy="28" r="2.4" fill="${INK}"/><circle cx="36" cy="36" r="2.4" fill="${INK}"/><circle cx="36" cy="28" r="2.4" fill="${INK}"/><circle cx="28" cy="36" r="2.4" fill="${INK}"/>`;
w(
  'icons/reroll.svg',
  svg(
    '0 0 64 64',
    `<circle cx="32" cy="32" r="29" fill="${YEL}" stroke="${INK}" stroke-width="4"/>${arrows(INK)}${mini}`,
    ' width="64" height="64"',
  ),
);
w(
  'icons/reroll-used.svg',
  svg(
    '0 0 64 64',
    `<circle cx="32" cy="32" r="29" fill="${LGREY}" stroke="${GREY}" stroke-width="4"/>${arrows(GREY)}${mini.replace(INK, GREY)}<path d="M12 52L52 12" stroke="${WHITE}" stroke-width="9" stroke-linecap="round"/><path d="M12 52L52 12" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
    ' width="64" height="64"',
  ),
);

// ---------------- thumbnails ----------------
function scene(W, H, k) {
  // k: layout of a 5x5 mini board + props; placeholder hero art (a human replaces it)
  const cs = 66,
    bx = k.bx,
    by = k.by;
  let cells = '';
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 5; c++)
      cells += `<rect x="${bx + c * cs}" y="${by + r * cs}" width="${cs}" height="${cs}" fill="${(r + c) % 2 ? '#F5E6A8' : CREAM}"/>`;
  const cc = (c, r) => [bx + c * cs + cs / 2, by + r * cs + cs / 2];
  const [a1, b1] = cc(0, 4),
    [a2, b2] = cc(2, 0),
    [s1, t1] = cc(4, 0),
    [s2, t2] = cc(3, 4);
  const lad = (() => {
    const dx = a2 - a1,
      dy = b2 - b1,
      L = Math.hypot(dx, dy),
      nx = -dy / L,
      ny = dx / L;
    let d = '';
    for (const s of [1, -1])
      d += `M${r1(a1 + nx * 14 * s)} ${r1(b1 + ny * 14 * s)}L${r1(a2 + nx * 14 * s)} ${r1(b2 + ny * 14 * s)}`;
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const px = a1 + dx * t,
        py = b1 + dy * t;
      d += `M${r1(px + nx * 14)} ${r1(py + ny * 14)}L${r1(px - nx * 14)} ${r1(py - ny * 14)}`;
    }
    return d;
  })();
  const snk = (() => {
    const dx = s2 - s1,
      dy = t2 - t1,
      L = Math.hypot(dx, dy),
      ux = dx / L,
      uy = dy / L,
      nx = -uy,
      ny = ux,
      seg = 6,
      st = L / seg;
    let d = `M${r1(s1)} ${r1(t1)}`;
    for (let i = 0; i < seg; i++) {
      const q = i % 2 ? -1 : 1;
      d += `Q${r1(s1 + ux * st * (i + 0.5) + nx * 30 * q)} ${r1(t1 + uy * st * (i + 0.5) + ny * 30 * q)} ${r1(s1 + ux * st * (i + 1))} ${r1(t1 + uy * st * (i + 1))}`;
    }
    return d;
  })();
  const bgDefs = `<defs>${badgeSyms(['badge-brt', 'badge-pothole'])}${capSyms}${lmSymbols(['danfo'])}<pattern id="hz" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="20" height="40" fill="${YEL}"/><rect x="20" width="20" height="40" fill="${INK}"/></pattern></defs>`;
  return svg(
    `0 0 ${W} ${H}`,
    bgDefs +
      `<rect width="${W}" height="${H}" fill="${INK}"/><rect y="${H - 36}" width="${W}" height="36" fill="url(#hz)"/><rect width="${W}" height="14" fill="url(#hz)"/>` +
      `<rect x="${bx - 8}" y="${by - 8}" width="${cs * 5 + 16}" height="${cs * 5 + 16}" rx="14" fill="${YEL}" stroke="${CREAM}" stroke-width="4"/>${cells}` +
      `<path d="${lad}" stroke="${INK}" stroke-width="10" stroke-linecap="round" fill="none"/><path d="${lad}" stroke="${YEL}" stroke-width="5.5" stroke-linecap="round" fill="none"/>` +
      `<path d="${snk}" stroke="${INK}" stroke-width="15" stroke-linecap="round" fill="none"/><path d="${snk}" stroke="${RED}" stroke-width="10" stroke-linecap="round" fill="none"/><path d="${snk}" stroke="${WHITE}" stroke-width="3" stroke-dasharray="7 11" fill="none"/>` +
      `<use href="#end-down" x="${s2 - 24}" y="${t2 - 24}" width="48" height="48"/><use href="#end-up" x="${a2 - 24}" y="${b2 - 24}" width="48" height="48"/><use href="#badge-brt" x="${a1 - 30}" y="${b1 - 26}" width="64" height="64"/><use href="#badge-pothole" x="${s1 - 30}" y="${t1 - 30}" width="64" height="64"/>` +
      k.props,
    ' width="' + W + '" height="' + H + '"',
  );
}
{
  const pw = (id, x, y, s) =>
    `<g transform="translate(${x} ${y}) scale(${s / 52}) translate(2 2)">${pawnLayers(id)}</g>`;
  const pawnDefs = '';
  const die = (x, y, s, n) =>
    `<g transform="translate(${x} ${y}) rotate(14 ${s / 2} ${s / 2}) scale(${s / 64})">${dieBody(n)}</g>`;
  const t1 = scene(512, 512, {
    bx: 91,
    by: 71,
    props:
      pawnDefs +
      pw('you', 160, 140, 40) +
      pw('efe', 290, 214, 36) +
      `<circle cx="390" cy="440" r="62" fill="${CREAM}"/><use href="#lm-danfo" x="338" y="388" width="104" height="104"/>` +
      die(60, 405, 70, 6),
  });
  // pawns/die defs must sit in the same document: inject the pawn defs before the scene body
  w('thumb/thumb-512x512.svg', t1);
  const t2 = scene(1024, 500, {
    bx: 150,
    by: 62,
    props:
      pawnDefs +
      pw('you', 230, 140, 40) +
      pw('efe', 360, 214, 36) +
      `<circle cx="770" cy="310" r="150" fill="${CREAM}"/><use href="#lm-danfo" x="650" y="190" width="240" height="240"/>` +
      die(760, 62, 110, 5) +
      die(900, 90, 80, 2),
  });
  w('thumb/thumb-1024x500.svg', t2);
}
console.log('done');
