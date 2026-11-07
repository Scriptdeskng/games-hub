#!/usr/bin/env node
// Generates the original SVG art + layout contract for Ayo Olopon (asset-designer, in-repo).
// Output: games/ayo-olopon/assets/{board,seeds,counters,states,fx,icon,bg,thumb} and board/layout.json.
// ART_OUT overrides the output dir. Pure shapes and paths; no traced or downloaded art.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.ART_OUT ?? join(ROOT, 'games', 'ayo-olopon', 'assets');
const w = (p, s) => {
  mkdirSync(dirname(join(OUT, p)), { recursive: true });
  writeFileSync(join(OUT, p), s);
};
const n = (v) => String(Math.round(v * 10) / 10);
const svg = (vb, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${extra}>${body}</svg>`;

// Palette: Adire Indigo tokens (STYLE_GUIDE section 2) plus iroko wood and brass.
const C = {
  indigo: '#1D3A9E',
  indigoDeep: '#122055',
  indigoInk: '#0A1233',
  cream: '#F4F1E8',
  sky: '#6F93E8',
  gold: '#FFC933',
  ink: '#1D1D20',
  clay: '#FF7A63',
  wood1: '#B07A45',
  wood2: '#8A5A2B',
  wood3: '#6A4220',
  woodDk: '#2A1308',
};

// ---- geometry contract (board units) -------------------------------------------------
export const PIT_R = 66;
export const PITCH = 170;
const MID = 275; // first pit centre along the long axis
export const SIZES = { landscape: [1400, 520], portrait: [520, 1400] };

/** pit i (0..5 human, 6..11 opponent), sowing is i -> (i+1) % 12 = counter-clockwise */
export function pitCentre(orient, i) {
  if (orient === 'landscape') {
    // human bottom row left to right; opponent top row right to left
    return i < 6 ? [MID + PITCH * i, 375] : [MID + PITCH * (11 - i), 145];
  }
  // human right column bottom to top; opponent left column top to bottom
  return i < 6 ? [375, MID + PITCH * (5 - i)] : [145, MID + PITCH * (i - 6)];
}
export const TRAYS = {
  landscape: { opponent: [28, 28, 132, 464], human: [1240, 28, 132, 464] },
  portrait: { opponent: [28, 28, 464, 132], human: [28, 1240, 464, 132] },
};
export const chipCentre = (orient, i) => {
  const [x, y] = pitCentre(orient, i);
  const human = i < 6;
  return orient === 'landscape' ? [x, human ? 478 : 44] : [human ? 478 : 44, y];
};
function traySlots(orient, who) {
  const [x, y, tw, th] = TRAYS[orient][who];
  const cols = orient === 'landscape' ? 4 : 12;
  const rows = orient === 'landscape' ? 12 : 4;
  const ix = x + 14,
    iy = y + 14,
    iw = tw - 28,
    ih = th - 28;
  const out = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push([n(ix + (c + 0.5) * (iw / cols)), n(iy + (r + 0.5) * (ih / rows))]);
  return out;
}

// ---- deterministic RNG for wood grain -----------------------------------------------
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---- shared defs (ids are prefixed so several SVGs can be inlined together) ----------
const defs = (p) => `<defs>
<linearGradient id="${p}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.wood1}"/><stop offset=".5" stop-color="${C.wood2}"/><stop offset="1" stop-color="${C.wood3}"/></linearGradient>
<radialGradient id="${p}b" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#1F0F06"/><stop offset=".65" stop-color="#3E2210"/><stop offset="1" stop-color="#6B4021"/></radialGradient>
<linearGradient id="${p}l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D9A66B"/><stop offset="1" stop-color="#4A2A12"/></linearGradient>
<linearGradient id="${p}br" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6DB8A"/><stop offset=".5" stop-color="#C58E2A"/><stop offset="1" stop-color="#8A5E14"/></linearGradient>
<linearGradient id="${p}sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".6" stop-color="#000" stop-opacity="0"/></linearGradient>
<pattern id="${p}c" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="${C.indigoDeep}"/><circle cx="30" cy="30" r="13" fill="none" stroke="${C.cream}" stroke-width="3" opacity=".85"/><circle cx="30" cy="30" r="5" fill="${C.cream}" opacity=".85"/><circle cx="0" cy="0" r="4" fill="${C.sky}"/><circle cx="60" cy="0" r="4" fill="${C.sky}"/><circle cx="0" cy="60" r="4" fill="${C.sky}"/><circle cx="60" cy="60" r="4" fill="${C.sky}"/><path d="M30 6v6M30 48v6M6 30h6M48 30h6" stroke="${C.cream}" stroke-width="2.5" stroke-linecap="round" opacity=".7"/></pattern>
</defs>`;

/** One carved pit: bevelled lip, deep bowl, inner shadow, indigo inlay ring with cream dots. */
function pit(p, cx, cy, r = PIT_R) {
  cx = Math.round(cx * 10) / 10;
  cy = Math.round(cy * 10) / 10;
  const arc = (rad, a0, a1) => {
    const t = (a) => [
      cx + rad * Math.cos((a * Math.PI) / 180),
      cy + rad * Math.sin((a * Math.PI) / 180),
    ];
    const [x0, y0] = t(a0),
      [x1, y1] = t(a1);
    return `M${n(x0)} ${n(y0)}A${rad} ${rad} 0 0 1 ${n(x1)} ${n(y1)}`;
  };
  return `<g><circle cx="${cx}" cy="${cy}" r="${r + 11}" fill="none" stroke="${C.indigo}" stroke-width="5"/><circle cx="${cx}" cy="${cy}" r="${r + 11}" fill="none" stroke="${C.cream}" stroke-width="3" stroke-dasharray="1 9" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="none" stroke="url(#${p}l)" stroke-width="6"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${p}b)" stroke="${C.woodDk}" stroke-width="3"/><path d="${arc(r - 5, 190, 290)}" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="9" stroke-linecap="round"/><path d="${arc(r - 3, 10, 100)}" fill="none" stroke="#E0B27A" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/></g>`;
}

function grain(orient, W, H) {
  const rand = rng(orient === 'landscape' ? 11 : 12);
  let d = '';
  const lines = 46;
  for (let k = 0; k < lines; k++) {
    const t = (k + rand() * 0.8) / lines;
    const wob = () => (rand() - 0.5) * 22;
    const len = orient === 'landscape' ? W : H;
    const cross = (orient === 'landscape' ? H : W) * t;
    const pts = [0, 1, 2, 3, 4].map((j) => [(len * j) / 4, cross + wob()]);
    const P = (a, b) => (orient === 'landscape' ? `${n(a)} ${n(b)}` : `${n(b)} ${n(a)}`);
    d += `<path d="M${P(pts[0][0], pts[0][1])}Q${P(pts[1][0], pts[1][1])} ${P(pts[2][0], pts[2][1])}T${P(pts[4][0], pts[4][1])}" stroke-width="${n(0.8 + rand() * 2)}" stroke-opacity="${n(0.1 + rand() * 0.14)}"/>`;
  }
  return `<g fill="none" stroke="${C.woodDk}" stroke-linecap="round">${d}</g>`;
}

function tray(p, [x, y, tw, th]) {
  const rivets = [
    [x + 12, y + 12],
    [x + tw - 12, y + 12],
    [x + 12, y + th - 12],
    [x + tw - 12, y + th - 12],
  ]
    .map(
      ([a, b]) =>
        `<circle cx="${a}" cy="${b}" r="4" fill="url(#${p}br)" stroke="${C.woodDk}" stroke-width="1"/>`,
    )
    .join('');
  return `<g><rect x="${x - 4}" y="${y - 4}" width="${tw + 8}" height="${th + 8}" rx="22" fill="${C.woodDk}" opacity=".55"/><rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="18" fill="url(#${p}c)" stroke="url(#${p}br)" stroke-width="8"/><rect x="${x + 4}" y="${y + 4}" width="${tw - 8}" height="${th - 8}" rx="14" fill="url(#${p}sh)"/>${rivets}</g>`;
}

function board(orient) {
  const [W, H] = SIZES[orient];
  const p = orient === 'landscape' ? 'bl' : 'bp';
  let b = `${defs(p)}<rect width="${W}" height="${H}" rx="34" fill="url(#${p}w)"/>${grain(orient, W, H)}`;
  // adire/aso-oke border: indigo band with a cream dot line and a thin gold keyline
  b += `<rect x="13" y="13" width="${W - 26}" height="${H - 26}" rx="26" fill="none" stroke="${C.indigo}" stroke-width="10"/><rect x="13" y="13" width="${W - 26}" height="${H - 26}" rx="26" fill="none" stroke="${C.cream}" stroke-width="4" stroke-dasharray="1 13" stroke-linecap="round"/><rect x="7" y="7" width="${W - 14}" height="${H - 14}" rx="30" fill="none" stroke="${C.woodDk}" stroke-width="3" opacity=".6"/><rect x="21" y="21" width="${W - 42}" height="${H - 42}" rx="21" fill="none" stroke="${C.gold}" stroke-width="1.5" opacity=".7"/>`;
  b += tray(p, TRAYS[orient].opponent) + tray(p, TRAYS[orient].human);
  // engraved direction chevrons in the middle channel (counter-clockwise)
  let ch = '';
  for (let k = 0; k < 6; k++) {
    const a = MID + PITCH * k;
    const mk = (cx, cy, dir) => {
      const t =
        dir === 'L'
          ? [
              [6, -7],
              [-4, 0],
              [6, 7],
            ]
          : dir === 'R'
            ? [
                [-6, -7],
                [4, 0],
                [-6, 7],
              ]
            : dir === 'U'
              ? [
                  [-7, 6],
                  [0, -4],
                  [7, 6],
                ]
              : [
                  [-7, -6],
                  [0, 4],
                  [7, -6],
                ];
      const d = (o) => `M${t.map(([u, v]) => `${n(cx + u + o)} ${n(cy + v + o)}`).join('L')}`;
      return `<path d="${d(0)}" stroke="${C.woodDk}" stroke-opacity=".65" stroke-width="4"/><path d="${d(1.5)}" stroke="#E0B27A" stroke-opacity=".5" stroke-width="1.6"/>`;
    };
    ch +=
      orient === 'landscape'
        ? mk(a, 243, 'L') + mk(a, 277, 'R')
        : mk(243, a, 'D') + mk(277, a, 'U');
  }
  b += `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${ch}</g>`;
  for (let i = 0; i < 12; i++) {
    const [cx, cy] = pitCentre(orient, i);
    b += pit(p, cx, cy);
  }
  return svg(`0 0 ${W} ${H}`, b, ` width="${W}" height="${H}"`);
}
w('board/board-landscape.svg', board('landscape'));
w('board/board-portrait.svg', board('portrait'));

// ---- layout contract ------------------------------------------------------------------
const lay = (orient) => {
  const [W, H] = SIZES[orient];
  const pc = (x, y) => [n((x / W) * 100), n((y / H) * 100)];
  return {
    file: `board/board-${orient}.svg`,
    viewBox: [W, H],
    pitDiameterPct: n(((PIT_R * 2) / W) * 100),
    overlaySizePct: n((200 / W) * 100),
    pits: Array.from({ length: 12 }, (_, i) => {
      const [cx, cy] = pitCentre(orient, i);
      const [xp, yp] = pc(cx, cy);
      const [chx, chy] = chipCentre(orient, i);
      return {
        i,
        owner: i < 6 ? 'human' : 'opponent',
        cx,
        cy,
        xPct: xp,
        yPct: yp,
        chip: { cx: chx, cy: chy, xPct: pc(chx, chy)[0], yPct: pc(chx, chy)[1] },
      };
    }),
    trays: Object.fromEntries(
      ['human', 'opponent'].map((who) => {
        const [x, y, tw, th] = TRAYS[orient][who];
        return [
          who,
          {
            x,
            y,
            w: tw,
            h: th,
            xPct: pc(x, y)[0],
            yPct: pc(x, y)[1],
            wPct: n((tw / W) * 100),
            hPct: n((th / H) * 100),
            seedSize: 24,
            slots: traySlots(orient, who),
          },
        ];
      }),
    ),
  };
};
w(
  'board/layout.json',
  JSON.stringify({
    version: 1,
    doc: 'docs/assets/ayo-olopon-brief.md section 3. All numbers are board SVG units; *Pct are percent of the board box (use for absolute positioning).',
    pitIndex: {
      human: [0, 1, 2, 3, 4, 5],
      opponent: [6, 7, 8, 9, 10, 11],
      sowing: 'index+1 mod 12 is counter-clockwise on screen; pit 5 -> pit 6 turns the corner',
      landscape:
        'human row = bottom, left to right = 0..5; opponent row = top, right to left = 6..11 (pit 6 sits above pit 5)',
      portrait:
        'human column = right, bottom to top = 0..5; opponent column = left, top to bottom = 6..11 (pit 6 sits left of pit 5)',
    },
    pitRadius: PIT_R,
    overlayBox: 200,
    overlayNote:
      'State overlays in states/ are 200x200, centred on the pit centre: size = overlaySizePct of the board width, left/top = pit xPct/yPct with translate(-50%,-50%).',
    seedLayout: {
      seedArtBox: 32,
      radiusFrac: 0.72,
      formula:
        'for k in 0..n-1: r = pitRadius*radiusFrac*sqrt((k+0.5)/n); a = k*2.39996 + jitter(pitIndex,k); pos = centre + r*(cos a, sin a)',
      sizeByCount: [
        [6, 30],
        [12, 26],
        [24, 20],
        [48, 15],
      ],
      note: 'Seed size in board units for counts up to the first number. Seed variants: seed-a (round, most common), seed-b, seed-c, seed-d; pick by (pitIndex*7+k) % 6 -> 0,1,2 a; 3 b; 4 c; 5 d.',
    },
    tapTarget:
      'a pit button is 2*pitRadius = 132 board units; on a 360 px wide portrait board that is 91 px, on a 640 px wide landscape board 60 px (min 44 px).',
    landscape: lay('landscape'),
    portrait: lay('portrait'),
  }) + '\n',
);

// ---- seeds (32x32) ---------------------------------------------------------------------
const seedDefs = (id, a, b) =>
  `<defs><radialGradient id="${id}" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs>`;
const hl = (x, y, rx, ry, rot = 0) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="#fff" opacity=".4"/>`;
export const SEEDS = {
  a: svg(
    '0 0 32 32',
    `${seedDefs('a', '#D29A62', '#7A4A22')}<circle cx="16" cy="16" r="13" fill="url(#a)" stroke="${C.woodDk}" stroke-width="1.6"/>${hl(11, 10, 4, 2.6, -30)}`,
  ),
  b: svg(
    '0 0 32 32',
    `${seedDefs('b', '#B7C0B5', '#5E6A60')}<ellipse cx="16" cy="16" rx="14" ry="10.5" transform="rotate(-28 16 16)" fill="url(#b)" stroke="${C.woodDk}" stroke-width="1.6"/><path d="M6 21Q16 16 26 11" stroke="${C.woodDk}" stroke-opacity=".6" stroke-width="1.4" fill="none"/>${hl(11, 12, 4, 2.2, -28)}`,
  ),
  c: svg(
    '0 0 32 32',
    `${seedDefs('c', '#EE8A52', '#A03C18')}<path d="M7 20C3 13 9 5 17 6C25 7 29 14 25 21C22 26 15 24 14 20C13 17 10 17 7 20Z" fill="url(#c)" stroke="${C.woodDk}" stroke-width="1.6" stroke-linejoin="round"/>${hl(15, 10, 4, 2.2, -10)}`,
  ),
  d: svg(
    '0 0 32 32',
    `${seedDefs('d', '#FAF0D6', '#BFA977')}<path d="M16 3C22 11 27 16 27 20A11 11 0 0 1 5 20C5 16 10 11 16 3Z" fill="url(#d)" stroke="${C.woodDk}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="14" cy="21" r="2" fill="${C.indigo}"/><circle cx="20" cy="18" r="1.4" fill="${C.indigo}"/>${hl(12, 14, 3, 2, -40)}`,
  ),
};
for (const k of Object.keys(SEEDS)) w(`seeds/seed-${k}.svg`, SEEDS[k]);
w(
  'seeds/seed-lift.svg',
  svg(
    '0 0 44 44',
    `${seedDefs('lf', '#D9A06A', '#7A4A22')}<ellipse cx="22" cy="38" rx="11" ry="3.5" fill="#000" opacity=".35"/><circle cx="22" cy="19" r="15" fill="none" stroke="${C.gold}" stroke-width="3"/><circle cx="22" cy="19" r="13" fill="url(#lf)" stroke="${C.woodDk}" stroke-width="1.6"/>${hl(17, 13, 4, 2.6, -30)}`,
  ),
);
w(
  'seeds/seed-ghost.svg',
  svg(
    '0 0 32 32',
    `<circle cx="16" cy="16" r="12" fill="${C.cream}" fill-opacity=".12" stroke="${C.cream}" stroke-width="2.5" stroke-dasharray="4 4"/>`,
  ),
);

// ---- capture counters (64x64): shape + pips, never colour alone ----------------------------
const brassDef = (id) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6DB8A"/><stop offset=".5" stop-color="#C58E2A"/><stop offset="1" stop-color="#8A5E14"/></linearGradient></defs>`;
const pip = (x, y, r = 5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.woodDk}"/>`;
w(
  'counters/counter-1.svg',
  svg(
    '0 0 64 64',
    `${brassDef('g1')}<circle cx="32" cy="32" r="28" fill="url(#g1)" stroke="${C.woodDk}" stroke-width="3"/><circle cx="32" cy="32" r="21" fill="none" stroke="${C.woodDk}" stroke-opacity=".45" stroke-width="2"/>${pip(32, 32, 7)}`,
  ),
);
w(
  'counters/counter-5.svg',
  svg(
    '0 0 64 64',
    `${brassDef('g5')}<path d="M32 3L61 32L32 61L3 32Z" fill="url(#g5)" stroke="${C.woodDk}" stroke-width="3" stroke-linejoin="round"/>${pip(32, 32)}${pip(32, 17)}${pip(32, 47)}${pip(17, 32)}${pip(47, 32)}`,
  ),
);
w(
  'counters/counter-10.svg',
  svg(
    '0 0 64 64',
    `${brassDef('g10')}<path d="M32 3L58 18V46L32 61L6 46V18Z" fill="url(#g10)" stroke="${C.woodDk}" stroke-width="3" stroke-linejoin="round"/><rect x="16" y="19" width="6" height="26" rx="2" fill="${C.woodDk}"/><ellipse cx="42" cy="32" rx="9" ry="13" fill="none" stroke="${C.woodDk}" stroke-width="6"/>`,
  ),
);

// ---- pit highlight and hint states (200x200 overlays centred on the pit) -------------------
const O = (body) => svg('0 0 200 200', body);
w(
  'states/pit-select.svg',
  O(
    `<g fill="none" stroke-linecap="round"><circle cx="100" cy="100" r="82" stroke="${C.ink}" stroke-opacity=".6" stroke-width="13"/><circle cx="100" cy="100" r="82" stroke="${C.gold}" stroke-width="8"/><path d="M100 4v16M100 180v16M4 100h16M180 100h16" stroke="${C.ink}" stroke-opacity=".6" stroke-width="10"/><path d="M100 4v16M100 180v16M4 100h16M180 100h16" stroke="${C.gold}" stroke-width="5"/></g>`,
  ),
);
w(
  'states/pit-hint.svg',
  O(
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="100" cy="100" r="82" stroke="${C.ink}" stroke-opacity=".55" stroke-width="12"/><circle cx="100" cy="100" r="82" stroke="${C.cream}" stroke-width="6" stroke-dasharray="14 10"/><path d="M82 14L100 34L118 14" stroke="${C.ink}" stroke-opacity=".6" stroke-width="12"/><path d="M82 14L100 34L118 14" stroke="${C.gold}" stroke-width="7"/></g>`,
  ),
);
w(
  'states/pit-last.svg',
  O(
    `<g fill="none"><circle cx="100" cy="100" r="80" stroke="${C.ink}" stroke-opacity=".5" stroke-width="11"/><circle cx="100" cy="100" r="80" stroke="${C.cream}" stroke-width="5"/><circle cx="100" cy="100" r="92" stroke="${C.ink}" stroke-opacity=".5" stroke-width="8"/><circle cx="100" cy="100" r="92" stroke="${C.cream}" stroke-width="3"/></g>`,
  ),
);
w(
  'states/pit-danger.svg',
  O(
    `<g fill="none" stroke-linecap="round"><circle cx="100" cy="100" r="80" stroke="${C.ink}" stroke-opacity=".6" stroke-width="12"/><circle cx="100" cy="100" r="80" stroke="${C.clay}" stroke-width="6"/><path d="M100 10V34" stroke="${C.ink}" stroke-opacity=".6" stroke-width="13"/><path d="M100 10V34" stroke="${C.clay}" stroke-width="8"/></g><circle cx="100" cy="46" r="5" fill="${C.clay}" stroke="${C.ink}" stroke-opacity=".6" stroke-width="2"/>`,
  ),
);
w(
  'states/pit-capture.svg',
  O(
    `<g fill="none" stroke-linecap="round"><circle cx="100" cy="100" r="80" stroke="${C.ink}" stroke-opacity=".6" stroke-width="12"/><circle cx="100" cy="100" r="80" stroke="${C.clay}" stroke-width="6"/><path d="M68 68L132 132M132 68L68 132" stroke="${C.ink}" stroke-opacity=".6" stroke-width="16"/><path d="M68 68L132 132M132 68L68 132" stroke="${C.cream}" stroke-width="9"/></g>`,
  ),
);
w(
  'states/pit-disabled.svg',
  O(
    `<defs><pattern id="h" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="14" fill="#000" opacity=".5"/></pattern></defs><circle cx="100" cy="100" r="70" fill="#000" opacity=".28"/><circle cx="100" cy="100" r="70" fill="url(#h)"/>`,
  ),
);
w(
  'states/pit-skip.svg',
  O(
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M52 52A68 68 0 0 1 148 52" stroke="${C.ink}" stroke-opacity=".6" stroke-width="12"/><path d="M52 52A68 68 0 0 1 148 52" stroke="${C.cream}" stroke-width="6"/><path d="M134 36L150 54L128 62" stroke="${C.ink}" stroke-opacity=".6" stroke-width="12"/><path d="M134 36L150 54L128 62" stroke="${C.cream}" stroke-width="6"/></g>`,
  ),
);

// ---- fx ---------------------------------------------------------------------------------------
{
  let star = '';
  for (let k = 0; k < 24; k++) {
    const r = k % 2 ? 56 : 108,
      a = (k * Math.PI) / 12;
    star += `${k ? 'L' : 'M'}${n(120 + r * Math.cos(a))} ${n(120 + r * Math.sin(a))}`;
  }
  let chips = '';
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + 0.3;
    chips += `<circle cx="${n(120 + 94 * Math.cos(a))}" cy="${n(120 + 94 * Math.sin(a))}" r="7" fill="#8A5A2B" stroke="${C.woodDk}" stroke-width="2"/>`;
  }
  w(
    'fx/capture-burst.svg',
    svg(
      '0 0 240 240',
      `<path d="${star}Z" fill="${C.gold}" stroke="${C.woodDk}" stroke-width="3" stroke-linejoin="round"/><circle cx="120" cy="120" r="44" fill="none" stroke="${C.woodDk}" stroke-width="4"/><circle cx="120" cy="120" r="30" fill="${C.cream}" opacity=".9"/>${chips}`,
    ),
  );
}
w(
  'fx/sow-ripple.svg',
  svg(
    '0 0 120 120',
    `<g fill="none" stroke="${C.cream}"><circle cx="60" cy="60" r="20" stroke-width="5" opacity=".9"/><circle cx="60" cy="60" r="38" stroke-width="4" opacity=".6"/><circle cx="60" cy="60" r="55" stroke-width="3" opacity=".35"/></g>`,
  ),
);
w(
  'fx/tray-glow.svg',
  svg(
    '0 0 160 160',
    `<defs><radialGradient id="tg"><stop offset="0" stop-color="${C.gold}" stop-opacity=".85"/><stop offset=".6" stop-color="${C.gold}" stop-opacity=".25"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient></defs><circle cx="80" cy="80" r="78" fill="url(#tg)"/><circle cx="80" cy="80" r="44" fill="none" stroke="${C.cream}" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>`,
  ),
);
w(
  'fx/chain-link.svg',
  svg(
    '0 0 96 48',
    `<g fill="none" stroke-width="7"><rect x="8" y="10" width="46" height="28" rx="14" stroke="${C.woodDk}" stroke-width="11"/><rect x="42" y="10" width="46" height="28" rx="14" stroke="${C.woodDk}" stroke-width="11"/><rect x="8" y="10" width="46" height="28" rx="14" stroke="${C.gold}"/><rect x="42" y="10" width="46" height="28" rx="14" stroke="${C.cream}"/></g>`,
  ),
);
w(
  'fx/turn-drum.svg',
  svg(
    '0 0 64 64',
    `<defs><linearGradient id="td" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#A06A3C"/><stop offset="1" stop-color="#6A4220"/></linearGradient></defs><path d="M14 12H46Q40 32 46 52H14Q20 32 14 12Z" fill="url(#td)" stroke="${C.woodDk}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="30" cy="12" rx="16" ry="5" fill="${C.cream}" stroke="${C.woodDk}" stroke-width="3"/><ellipse cx="30" cy="52" rx="16" ry="5" fill="${C.cream}" stroke="${C.woodDk}" stroke-width="3"/><path d="M18 14L26 50M30 15V50M42 14L34 50" stroke="${C.cream}" stroke-width="2.5" opacity=".85"/><path d="M52 8Q60 18 54 30" fill="none" stroke="${C.woodDk}" stroke-width="7" stroke-linecap="round"/><path d="M52 8Q60 18 54 30" fill="none" stroke="${C.gold}" stroke-width="3.5" stroke-linecap="round"/><circle cx="52" cy="8" r="5" fill="${C.gold}" stroke="${C.woodDk}" stroke-width="2"/>`,
  ),
);

// ---- menu mark (96) and table cloth tile (160) -------------------------------------------------
{
  let pits = '';
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 3; c++) {
      const x = 22 + c * 26,
        y = 36 + r * 28;
      pits += `<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="${C.cream}" stroke-width="2" stroke-dasharray="1 4" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="10" fill="url(#mmb)" stroke="${C.woodDk}" stroke-width="2"/>`;
    }
  w(
    'icon/menu-mark.svg',
    svg(
      '0 0 96 96',
      `${defs('mm')}<rect x="2" y="18" width="92" height="66" rx="12" fill="url(#mmw)" stroke="${C.woodDk}" stroke-width="3"/><rect x="6" y="22" width="84" height="58" rx="9" fill="none" stroke="${C.indigo}" stroke-width="4"/>${pits}<circle cx="22" cy="36" r="3.5" fill="#D29A62"/><circle cx="48" cy="64" r="3.5" fill="#B7C0B5"/><circle cx="74" cy="36" r="3.5" fill="#EE8A52"/><circle cx="48" cy="36" r="3.5" fill="#FAF0D6"/>`,
    ),
  );
}
{
  let sun = '';
  const motif = (cx, cy) => {
    let s = `<circle cx="${cx}" cy="${cy}" r="24" fill="none" stroke="${C.cream}" stroke-width="3" opacity=".85"/><circle cx="${cx}" cy="${cy}" r="9" fill="${C.cream}" opacity=".85"/>`;
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6;
      s += `<path d="M${n(cx + 32 * Math.cos(a))} ${n(cy + 32 * Math.sin(a))}L${n(cx + 42 * Math.cos(a))} ${n(cy + 42 * Math.sin(a))}" stroke="${C.cream}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
    }
    return s;
  };
  sun = motif(80, 80) + motif(0, 0) + motif(160, 0) + motif(0, 160) + motif(160, 160);
  sun += `<g fill="${C.sky}"><circle cx="80" cy="12" r="3.5"/><circle cx="80" cy="148" r="3.5"/><circle cx="12" cy="80" r="3.5"/><circle cx="148" cy="80" r="3.5"/></g>`;
  w(
    'bg/table-cloth.svg',
    svg(
      '0 0 160 160',
      `<rect width="160" height="160" fill="${C.indigoDeep}"/>${sun}`,
      ' width="160" height="160"',
    ),
  );
}

// ---- thumbnails (placeholder hero art; SVG sources, no text) -------------------------------------
function thumb(W, H, cols, pr, pitch, ang, name) {
  const p = 't';
  const sw = cols * pitch + 60,
    sh = 2 * pitch + 50;
  const ox = (W - sw) / 2,
    oy = (H - sh) / 2;
  const seedUse = ['a', 'a', 'a', 'b', 'c', 'd'];
  let rings = '';
  const rr = rng(5);
  for (let k = 0; k < 14; k++) {
    const x = rr() * W,
      y = rr() * H,
      r = 18 + rr() * 30;
    rings += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="none" stroke="${C.cream}" stroke-width="4" opacity=".1"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.35)}" fill="${C.cream}" opacity=".1"/>`;
  }
  let pits = '',
    seeds = '';
  const sd = `<defs>${Object.entries(SEEDS)
    .map(
      ([k, s]) =>
        `<g id="s${k}">${s
          .replace(/^<svg[^>]*>/, '')
          .replace('</svg>', '')
          .replace(/id="(\w)"/g, `id="sd$1"`)
          .replace(/url\(#(\w)\)/g, 'url(#sd$1)')}</g>`,
    )
    .join('')}</defs>`;
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < cols; c++) {
      const cx = ox + 30 + pitch * (c + 0.5),
        cy = oy + 25 + pitch * (r + 0.5);
      pits += pit(p, cx, cy, pr);
      for (let k = 0; k < 4; k++) {
        const a = k * 1.7 + c + r,
          d = pr * 0.4,
          s = (pr * 0.4) / 16;
        const ux = cx + d * Math.cos(a) - 16 * s,
          uy = cy + d * Math.sin(a) - 16 * s;
        seeds += `<use href="#s${seedUse[(c * 3 + r * 5 + k) % 6]}" transform="translate(${n(ux)} ${n(uy)}) scale(${n(s)})"/>`;
      }
    }
  const slab = `<g transform="rotate(${ang} ${W / 2} ${H / 2})"><rect x="${n(ox)}" y="${n(oy)}" width="${sw}" height="${sh}" rx="${n(pitch * 0.2)}" fill="url(#${p}w)" stroke="${C.woodDk}" stroke-width="4"/>${grain('landscape', W, H).replace(/<g /, `<g transform="translate(${n(ox)} ${n(oy)}) scale(${n(sw / W)} ${n(sh / H)})" `)}<rect x="${n(ox + 9)}" y="${n(oy + 9)}" width="${sw - 18}" height="${sh - 18}" rx="${n(pitch * 0.15)}" fill="none" stroke="${C.indigo}" stroke-width="8"/><rect x="${n(ox + 9)}" y="${n(oy + 9)}" width="${sw - 18}" height="${sh - 18}" rx="${n(pitch * 0.15)}" fill="none" stroke="${C.cream}" stroke-width="3" stroke-dasharray="1 11" stroke-linecap="round"/>${pits}${seeds}</g>`;
  const drum = `<g transform="translate(${W - 120} ${H - 120}) scale(1.6)"><path d="M14 12H46Q40 32 46 52H14Q20 32 14 12Z" fill="#D29A62" stroke="${C.woodDk}" stroke-width="3"/><ellipse cx="30" cy="12" rx="16" ry="5" fill="${C.cream}" stroke="${C.woodDk}" stroke-width="3"/><ellipse cx="30" cy="52" rx="16" ry="5" fill="${C.cream}" stroke="${C.woodDk}" stroke-width="3"/></g>`;
  w(
    name,
    svg(
      `0 0 ${W} ${H}`,
      `${defs(p)}${sd}<defs><linearGradient id="bgg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.indigo}"/><stop offset="1" stop-color="${C.indigoInk}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#bgg)"/>${rings}${slab}${drum}`,
      ` width="${W}" height="${H}"`,
    ),
  );
}
thumb(512, 512, 3, 56, 136, -6, 'thumb/thumb-512x512.svg');
thumb(1024, 500, 6, 52, 142, -2.5, 'thumb/thumb-1024x500.svg');
console.log('ayo-olopon art written to', OUT);
