#!/usr/bin/env node
// Generates the original SVG art for Naija Ludo (asset-designer, in-repo).
// Output: games/naija-ludo/assets/{board,seeds,dice,fx,thumb}. ART_OUT overrides the output dir.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.ART_OUT ?? join(ROOT, 'games', 'naija-ludo', 'assets');
const INK = '#1D1D20',
  BG = '#0B3D22',
  BG2 = '#06281A',
  CREAM = '#F3FAF4',
  GOLD = '#FFC933',
  INDIGO = '#1D3A9E';
const w = (p, s) => {
  mkdirSync(dirname(join(OUT, p)), { recursive: true });
  writeFileSync(join(OUT, p), s);
};
const svg = (vb, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${extra}>${body}</svg>`;

// seat order is clockwise: 0 bottom-left, 1 top-left, 2 top-right, 3 bottom-right
export const SEATS = [
  {
    id: 'red',
    name: 'Pepper Red',
    hex: '#D91F26',
    yard: [0, 9],
    tag: 'P',
    start: [6, 13],
    home: [
      [7, 13],
      [7, 12],
      [7, 11],
      [7, 10],
      [7, 9],
    ],
    dir: 'up',
  },
  {
    id: 'green',
    name: 'Ugu Green',
    hex: '#6DBA3F',
    yard: [0, 0],
    tag: 'U',
    start: [1, 6],
    home: [
      [1, 7],
      [2, 7],
      [3, 7],
      [4, 7],
      [5, 7],
    ],
    dir: 'right',
  },
  {
    id: 'yellow',
    name: 'Danfo Yellow',
    hex: '#FFC20E',
    yard: [9, 0],
    tag: 'D',
    start: [8, 1],
    home: [
      [7, 1],
      [7, 2],
      [7, 3],
      [7, 4],
      [7, 5],
    ],
    dir: 'down',
  },
  {
    id: 'indigo',
    name: 'Adire Indigo',
    hex: '#1D3A9E',
    yard: [9, 9],
    tag: 'A',
    start: [13, 8],
    home: [
      [13, 7],
      [12, 7],
      [11, 7],
      [10, 7],
      [9, 7],
    ],
    dir: 'left',
  },
];
export const STARS = [
  [6, 2],
  [12, 6],
  [8, 12],
  [2, 8],
];

// ---- 52-cell clockwise track starting (0,6)
export const TRACK = [];
for (let c = 0; c <= 5; c++) TRACK.push([c, 6]);
for (let r = 5; r >= 0; r--) TRACK.push([6, r]);
TRACK.push([7, 0]);
for (let r = 0; r <= 5; r++) TRACK.push([8, r]);
for (let c = 9; c <= 14; c++) TRACK.push([c, 6]);
TRACK.push([14, 7]);
for (let c = 14; c >= 9; c--) TRACK.push([c, 8]);
for (let r = 9; r <= 14; r++) TRACK.push([8, r]);
TRACK.push([7, 14]);
for (let r = 14; r >= 9; r--) TRACK.push([6, r]);
for (let c = 5; c >= 0; c--) TRACK.push([c, 8]);
TRACK.push([0, 7]);

// ---- seed shapes (48x48): path/shape element strings + inner mark
const SHAPES = {
  red: {
    body: '<circle cx="24" cy="24" r="15.5"/>',
    mark: `<circle cx="24" cy="24" r="9" fill="none" stroke="#fff" stroke-width="3.5"/><circle cx="24" cy="24" r="3.5" fill="#fff"/>`,
  },
  green: {
    body: '<path d="M24 2.5L45.5 24 24 45.5 2.5 24z"/>',
    mark: `<path d="M24 15L33 24 24 33 15 24z" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="24" r="2.4" fill="${INK}"/>`,
  },
  yellow: {
    body: '<rect x="6.5" y="6.5" width="35" height="35" rx="2.5"/>',
    mark: `<rect x="14" y="14.5" width="20" height="5" fill="${INK}"/><rect x="14" y="28.5" width="20" height="5" fill="${INK}"/>`,
  },
  indigo: {
    body: '<path d="M24 7L42 41H6z"/>',
    mark: `<path d="M24 20L32.5 36h-17z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`,
  },
};
const seedSvg = (s) => {
  const sh = SHAPES[s.id];
  return svg(
    '-2 -2 52 52',
    `<defs><g id="s">${sh.body}</g></defs><use href="#s" fill="#fff" stroke="#fff" stroke-width="9" stroke-linejoin="round"/><use href="#s" fill="${INK}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><use href="#s" fill="${s.hex}"/>${sh.mark}`,
    ' width="48" height="48"',
  );
};
// mini white copy of the silhouette for the centre triangles (cx, cy, size)
const miniShape = (id, cx, cy, sz) => {
  const k = sz / 48;
  return `<g transform="translate(${cx} ${cy}) scale(${k}) translate(-24 -24)" fill="#fff" stroke="${INK}" stroke-width="5" stroke-linejoin="round">${SHAPES[id].body}</g>`;
};

// ---- yard patterns (tone on tone over the seat plate)
const PAT = {
  red: `<pattern id="p-red" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="30" fill="none" stroke="#fff" stroke-width="7" opacity=".3"/><circle cx="50" cy="50" r="10" fill="#fff" opacity=".3"/></pattern>`,
  yellow: `<pattern id="p-yellow" width="100" height="40" patternUnits="userSpaceOnUse"><rect y="4" width="100" height="10" fill="${INK}" opacity=".22"/><rect y="22" width="100" height="4" fill="${INK}" opacity=".22"/></pattern>`,
  indigo: `<pattern id="p-indigo" width="100" height="60" patternUnits="userSpaceOnUse"><path d="M0 40L25 14 50 40 75 14 100 40" fill="none" stroke="#fff" stroke-width="7" opacity=".3" stroke-linejoin="round"/></pattern>`,
  green: `<pattern id="p-green" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M0 50q25-30 50 0t50 0" fill="none" stroke="${INK}" stroke-width="7" opacity=".25"/><path d="M50 12q16 12 0 26q-16-14 0-26" fill="${INK}" opacity=".25"/><circle cx="12" cy="86" r="6" fill="${INK}" opacity=".25"/><circle cx="62" cy="86" r="6" fill="${INK}" opacity=".25"/></pattern>`,
};
const LETTER = {
  P: 'M-14 24V-24H4a14 14 0 0 1 0 28H-14',
  D: 'M-14-24V24H0a24 24 0 0 0 0-48H-14',
  A: 'M-16 24L0-24 16 24M-9 6H9',
  U: 'M-14-24V6a14 14 0 0 0 28 0V-24',
};
const slotShape = (id, cx, cy) => {
  // dashed ghost of the seat silhouette inside a pit
  const k = 2.4;
  return `<g transform="translate(${cx} ${cy}) scale(${k}) translate(-24 -24)" fill="${BG2}" stroke="#DCEFE1" stroke-width="2.6" stroke-dasharray="4 3" stroke-linejoin="round">${SHAPES[id].body}</g>`;
};
// yard drawn in its own 600x600 coordinates
const yardBody = (s) => {
  const slots = [
    [200, 200],
    [400, 200],
    [200, 400],
    [400, 400],
  ]
    .map(([x, y]) => slotShape(s.id, x, y))
    .join('');
  return `<rect width="600" height="600" fill="${s.hex}"/><rect width="600" height="600" fill="url(#p-${s.id})"/><rect x="90" y="90" width="420" height="420" rx="36" fill="${BG}" stroke="${INK}" stroke-width="6"/>${slots}<rect x="265" y="10" width="70" height="70" rx="14" fill="#fff" stroke="${INK}" stroke-width="5"/><path transform="translate(300 45) scale(.9)" d="${LETTER[s.tag]}" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
};
const allPats = SEATS.map((s) => PAT[s.id]).join('');

// ---- board
const ADIRE = `<pattern id="adire" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="${CREAM}"/><g fill="none" stroke="${INDIGO}" stroke-width="6"><circle cx="0" cy="0" r="27"/><circle cx="100" cy="0" r="27"/><circle cx="0" cy="100" r="27"/><circle cx="100" cy="100" r="27"/></g><g fill="${INDIGO}"><circle cx="9" cy="9" r="7"/><circle cx="91" cy="9" r="7"/><circle cx="9" cy="91" r="7"/><circle cx="91" cy="91" r="7"/><circle cx="50" cy="8" r="4"/><circle cx="50" cy="92" r="4"/><circle cx="8" cy="50" r="4"/><circle cx="92" cy="50" r="4"/></g></pattern>`;
const STAR = (cx, cy, R = 44) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5,
      r = i % 2 ? R * 0.45 : R;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `<path d="M${pts.join('L')}z" fill="${GOLD}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
};
const CHEV = {
  right: 'M-12-22L14 0-12 22',
  left: 'M12-22L-14 0 12 22',
  up: 'M-22 12L0-14 22 12',
  down: 'M-22-12L0 14 22-12',
};
const chev = (c, r, dir) =>
  `<g transform="translate(${c * 100 + 50} ${r * 100 + 50})" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${CHEV[dir]}" stroke="${INK}" stroke-width="22"/><path d="${CHEV[dir]}" stroke="#fff" stroke-width="12"/></g>`;
const rect = (c, r, fill) =>
  `<rect x="${c * 100}" y="${r * 100}" width="100" height="100" fill="${fill}"/>`;

const boardInner = () => {
  const cellSet = new Set(TRACK.map(([c, r]) => c + ',' + r));
  SEATS.forEach((s) => s.home.forEach(([c, r]) => cellSet.add(c + ',' + r)));
  const cells = [...cellSet].map((k) => k.split(',').map(Number));
  const cream = 'M' + cells.map(([c, r]) => `${c * 100} ${r * 100}h100v100h-100z`).join('M');
  let s = `<rect width="1500" height="1500" fill="${BG}"/><path d="${cream}" fill="${CREAM}"/>`;
  // safe: adire star squares
  STARS.forEach(([c, r]) => (s += rect(c, r, 'url(#adire)')));
  // seat start squares and home columns
  SEATS.forEach((st) => {
    s += rect(st.start[0], st.start[1], st.hex);
    st.home.forEach(([c, r]) => (s += rect(c, r, st.hex)));
  });
  // grid lines for every cell
  s += `<path d="${cells.map(([c, r]) => `M${c * 100} ${r * 100}h100v100h-100z`).join('')}" fill="none" stroke="${BG}" stroke-width="5"/>`;
  STARS.forEach(([c, r]) => (s += STAR(c * 100 + 50, r * 100 + 50)));
  SEATS.forEach((st) => {
    s += STAR(st.start[0] * 100 + 50, st.start[1] * 100 + 50);
    st.home.forEach(([c, r]) => (s += chev(c, r, st.dir)));
  });
  // centre triangles (left = seat 1, top = seat 2, right = seat 3, bottom = seat 0)
  const tri = {
    green: ['600 600 600 900 750 750', 650, 750],
    yellow: ['600 600 900 600 750 750', 750, 650],
    indigo: ['900 600 900 900 750 750', 850, 750],
    red: ['600 900 900 900 750 750', 750, 850],
  };
  SEATS.forEach((st) => {
    const [pts, x, y] = tri[st.id];
    s += `<polygon points="${pts}" fill="${st.hex}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>${miniShape(st.id, x, y, 46)}`;
  });
  // yards
  SEATS.forEach(
    (st) =>
      (s += `<g transform="translate(${st.yard[0] * 100} ${st.yard[1] * 100})">${yardBody(st)}</g>`),
  );
  s += `<rect x="3" y="3" width="1494" height="1494" fill="none" stroke="${BG}" stroke-width="6"/>`;
  return `<defs>${ADIRE}${allPats}</defs>${s}`;
};

w('board/board.svg', svg('0 0 1500 1500', boardInner(), ' width="1500" height="1500"'));
w(
  'board/yards.svg',
  svg(
    '0 0 600 600',
    `<defs>${allPats}</defs>${SEATS.map((s) => `<symbol id="yard-${s.id}" viewBox="0 0 600 600">${yardBody(s)}</symbol>`).join('')}`,
    ' width="0" height="0" style="position:absolute"',
  ),
);
w(
  'board/legend.svg',
  svg(
    '0 0 100 100',
    `<defs>${ADIRE}</defs><symbol id="lg-safe" viewBox="0 0 100 100"><rect width="100" height="100" fill="url(#adire)" stroke="${BG}" stroke-width="5"/>${STAR(50, 50)}</symbol><symbol id="lg-start" viewBox="0 0 100 100"><rect width="100" height="100" fill="${SEATS[0].hex}" stroke="${BG}" stroke-width="5"/>${STAR(50, 50)}</symbol><symbol id="lg-homecol" viewBox="0 0 100 100"><rect width="100" height="100" fill="${SEATS[0].hex}" stroke="${BG}" stroke-width="5"/>${chev(0, 0, 'right')}</symbol><symbol id="lg-centre" viewBox="0 0 100 100"><rect width="100" height="100" fill="${CREAM}"/>${[
      'green:0 0 0 100 50 50',
      'yellow:0 0 100 0 50 50',
      'indigo:100 0 100 100 50 50',
      'red:0 100 100 100 50 50',
    ]
      .map((t) => {
        const [id, p] = t.split(':');
        return `<polygon points="${p}" fill="${SEATS.find((x) => x.id === id).hex}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
      })
      .join('')}</symbol>`,
    ' width="0" height="0" style="position:absolute"',
  ),
);

// ---- seeds + badges
SEATS.forEach((s) => w(`seeds/seed-${s.id}.svg`, seedSvg(s)));
const DIG = {
  2: 'M11 11.5a5 5 0 0 1 10 0c0 3-3.5 5.5-10 11.5h10.5',
  3: 'M11 9.5H21l-6 6.5c4 0 6 1.7 6 4.2 0 2.7-2.3 4-5 4-2 0-4-.6-5-2',
  4: 'M18.5 23V9L10.5 19.5H23',
};
[2, 3, 4].forEach((n) =>
  w(
    `seeds/badge-${n}.svg`,
    svg(
      '0 0 32 32',
      `<circle cx="16" cy="16" r="15" fill="#fff"/><circle cx="16" cy="16" r="12.5" fill="${INK}"/><path transform="translate(16 16) scale(1.1) translate(-16 -16)" d="${DIG[n]}" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
      ' width="32" height="32"',
    ),
  ),
);

// ---- dice copied from Snakes & Ladders (self-contained per game)
for (const f of ['die-1', 'die-2', 'die-3', 'die-4', 'die-5', 'die-6', 'die-roll', 'hands-cup']) {
  mkdirSync(join(OUT, 'dice'), { recursive: true });
  copyFileSync(
    join(ROOT, 'games', 'snakes-ladders', 'assets', 'dice', f + '.svg'),
    join(OUT, 'dice', f + '.svg'),
  );
}

// ---- effects
const burst = (n, R, r) => {
  const p = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n,
      rr = i % 2 ? r : R;
    p.push(`${(64 + rr * Math.cos(a)).toFixed(1)} ${(64 + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${p.join('L')}z`;
};
w(
  'fx/capture-burst.svg',
  svg(
    '0 0 128 128',
    `<path d="${burst(12, 60, 32)}" fill="${GOLD}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><circle cx="64" cy="64" r="22" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="64" cy="64" r="26" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="3 7" opacity=".0"/>`,
    ' width="128" height="128"',
  ),
);
const sixDots = [0, 1, 2, 3, 4, 5]
  .map((i) => {
    const a = (i * Math.PI) / 3 - Math.PI / 2;
    return `<circle cx="${(64 + 40 * Math.cos(a)).toFixed(1)}" cy="${(64 + 40 * Math.sin(a)).toFixed(1)}" r="10" fill="#fff" stroke="${INK}" stroke-width="4"/>`;
  })
  .join('');
const rays = [0, 1, 2, 3, 4, 5]
  .map((i) => {
    const a = (i * Math.PI) / 3 - Math.PI / 6;
    return `M${(64 + 50 * Math.cos(a)).toFixed(1)} ${(64 + 50 * Math.sin(a)).toFixed(1)}L${(64 + 61 * Math.cos(a)).toFixed(1)} ${(64 + 61 * Math.sin(a)).toFixed(1)}`;
  })
  .join('');
w(
  'fx/six-burst.svg',
  svg(
    '0 0 128 128',
    `<circle cx="64" cy="64" r="40" fill="none" stroke="${INK}" stroke-width="14"/><circle cx="64" cy="64" r="40" fill="none" stroke="${GOLD}" stroke-width="7"/><path d="${rays}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="${rays}" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/>${sixDots}`,
    ' width="128" height="128"',
  ),
);
w(
  'fx/move-ring.svg',
  svg(
    '0 0 64 64',
    `<circle cx="32" cy="32" r="27" fill="none" stroke="${INK}" stroke-width="9" stroke-dasharray="10 7"/><circle cx="32" cy="32" r="27" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="10 7"/>`,
    ' width="64" height="64"',
  ),
);
w(
  'fx/target-marker.svg',
  svg(
    '0 0 48 48',
    `<path d="M24 44L9 21a15 15 0 1 1 30 0z" fill="${GOLD}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="24" cy="18" r="5.5" fill="#fff" stroke="${INK}" stroke-width="3"/>`,
    ' width="48" height="48"',
  ),
);
const bands = ['#E8AE32', '#8C1D3D', '#F3FAF4', '#E4702A', '#0E7A3B', '#E8AE32'];
const rosette = bands
  .map(
    (c, i) =>
      `<circle cx="64" cy="64" r="${58 - i * 9}" fill="${c}" stroke="${INK}" stroke-width="2.5"/>`,
  )
  .join('');
w(
  'fx/home-rosette.svg',
  svg(
    '0 0 128 128',
    `${rosette}<circle cx="64" cy="64" r="5" fill="${INK}"/>`,
    ' width="128" height="128"',
  ),
);
const RB = {
  gold: '#E8AE32',
  wine: '#8C1D3D',
  orange: '#E4702A',
  green: '#0E7A3B',
  cream: '#F3FAF4',
};
w(
  'fx/confetti.svg',
  svg(
    '0 0 16 44',
    `${Object.entries(RB)
      .map(
        ([n, c]) =>
          `<symbol id="rb-${n}" viewBox="0 0 16 44"><path d="M4 2C13 10 3 16 12 22S3 34 8 42" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M4 2C13 10 3 16 12 22S3 34 8 42" fill="none" stroke="${c}" stroke-width="5.5" stroke-linecap="round"/></symbol>`,
      )
      .join('')}`,
    ' width="0" height="0" style="position:absolute"',
  ),
);
w(
  'fx/stripe-sweep.svg',
  svg(
    '0 0 256 48',
    `<rect width="256" height="48" fill="#8C1D3D"/><rect y="4" width="256" height="8" fill="#E8AE32"/><rect y="16" width="256" height="4" fill="#F3FAF4"/><rect y="24" width="256" height="10" fill="#E4702A"/><rect y="38" width="256" height="6" fill="#E8AE32"/><path d="M0 22h256M0 36h256" stroke="${INK}" stroke-width="1.5" stroke-dasharray="6 6" opacity=".5"/>`,
    ' width="256" height="48" preserveAspectRatio="none"',
  ),
);

// ---- thumbnails (no text)
const seedUse = (s, x, y, k) =>
  `<g transform="translate(${x} ${y}) scale(${k})">${(() => {
    const sh = SHAPES[s.id];
    return `<g fill="#fff" stroke="#fff" stroke-width="9" stroke-linejoin="round">${sh.body}</g><g fill="${INK}" stroke="${INK}" stroke-width="5" stroke-linejoin="round">${sh.body}</g><g fill="${s.hex}">${sh.body}</g>${sh.mark}`;
  })()}</g>`;
const thumb = (W, H, bs, bx, by) => {
  const sx = bs / 1500;
  return svg(
    `0 0 ${W} ${H}`,
    `<rect width="${W}" height="${H}" fill="${BG}"/><rect y="${H - 26}" width="${W}" height="26" fill="#E8AE32"/><rect y="${H - 20}" width="${W}" height="6" fill="#8C1D3D"/><rect y="${H - 10}" width="${W}" height="4" fill="#F3FAF4"/><g transform="translate(${bx} ${by}) scale(${sx})">${boardInner()}</g>${SEATS.map((s, i) => seedUse(s, bx + bs * [0.3, 0.55, 0.62, 0.3][i], by + bs * [0.5, 0.2, 0.62, 0.7][i], bs / 400)).join('')}`,
    ` width="${W}" height="${H}"`,
  );
};
w('thumb/thumb-512x512.svg', thumb(512, 512, 420, 46, 30));
const wide = thumb(1024, 500, 420, 560, 28).replace(
  '</svg>',
  `${SEATS.map((s, i) => seedUse(s, 70 + (i % 2) * 190, 90 + Math.floor(i / 2) * 190, 3.6)).join('')}</svg>`,
);
w('thumb/thumb-1024x500.svg', wide);
console.log('naija-ludo art done ->', OUT);
