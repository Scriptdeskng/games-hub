#!/usr/bin/env node
// Generates the original SVG art for Sabi Words (asset-designer, in-repo).
// World: a Lagos market stall at closing time. A striped tarpaulin awning, a wine-red wall with faint adire rings,
// a wooden table with an aso-oke runner, and a dark "notice board" panel on which cream sign-painter tiles sit.
// Letters in the PLAY grid are real DOM text (Bungee, `--ng-font-display`); only menu mark and thumbs use stroked
// glyph paths. No <text> in any SVG. Output: games/sabi-words/assets/{bg,ui,hud,lanes,icons,fx,icon,avatars,thumb,audio}.
// ART_OUT overrides the output directory (used by the check script).
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.ART_OUT ?? join(ROOT, 'games', 'sabi-words', 'assets');
export const INK = '#3A0E06',
  CREAM = '#FFF1DC',
  CREAM2 = '#F7D9AE',
  WALL = '#6B1A0E',
  WALL2 = '#430E07',
  PEPPER = '#D63A1F',
  OIL = '#F58A24',
  PLANTAIN = '#F7D348',
  UGU = '#6DBA3F',
  GOLD = '#E8AE32',
  ADIRE = '#1D3A9E',
  WOOD = '#8A5A2B',
  WOOD2 = '#6B431C',
  GOOD = '#2C6E12',
  BAD = '#B3261E';
/** light tints for the six found-word lanes; each lane ALSO has its own pattern (pat-1..6) so colour is never alone */
export const LANES = ['#FFB8A3', '#FFE27A', '#A9E08A', '#9DC2FF', '#E6B3F2', '#FFC98A'];
const w = (p, s) => {
  mkdirSync(dirname(join(OUT, p)), { recursive: true });
  writeFileSync(join(OUT, p), s);
};
const svg = (vb, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${extra}>${body}</svg>`;
const f1 = (n) => +n.toFixed(1);
const inner = (s) => s.replace(/^<svg[^>]*>|<\/svg>$/g, '');
const starPath = (cx, cy, R, r) => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2,
      rr = i % 2 ? r : R;
    p.push(`${f1(cx + rr * Math.cos(a))} ${f1(cy + rr * Math.sin(a))}`);
  }
  return `M${p.join('L')}z`;
};
const scallop = (cx, cy, R, r, n) => {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const rr = i % 2 ? r : R;
    pts.push(`${f1(cx + rr * Math.cos(a))} ${f1(cy + rr * Math.sin(a))}`);
  }
  return `M${pts.join('L')}z`;
};
// stroke glyphs on a 10 x 16 box (menu mark and thumbs only)
const GL = {
  A: 'M1.5 14.5 5 1.5l3.5 13M2.8 10h4.4',
  B: 'M2 1.5v13M2 1.5h3.5c3.2 0 3.2 5.5 0 5.5H2M5.8 7c3.6 0 3.6 7.5 0 7.5H2',
  D: 'M2 1.5v13h2.5c4.5 0 5-3 5-6.5s-.5-6.5-5-6.5z',
  I: 'M5 1.5v13M2.5 1.5h5M2.5 14.5h5',
  O: 'M5 1.5C1 1.5 1 14.5 5 14.5S9 1.5 5 1.5z',
  R: 'M2 14.5v-13h3.5c3.2 0 3.2 6 0 6H2M5.5 7.5 9 14.5',
  S: 'M8.5 3C7 .5 1.5 1.5 2 4.5S8.5 8 8.5 11 3 16 1.5 13',
  W: 'M1 1.5 3 14.5 5 5 7 14.5 9 1.5',
};
const glyph = (k, x, y, s, core = INK, edge = null) =>
  `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})" fill="none" stroke-linecap="round" stroke-linejoin="round">${edge ? `<path d="${GL[k]}" stroke="${edge}" stroke-width="4.6"/>` : ''}<path d="${GL[k]}" stroke="${core}" stroke-width="2.6"/></g>`;

// ---- the six lane patterns (24 x 24 tiles, ink strokes at 40 percent so letters stay readable) ----
const PS = `fill="none" stroke="${INK}" stroke-opacity=".42" stroke-linecap="round" stroke-linejoin="round"`;
export const PATS = [
  `<path d="M-2 26 26-2M-2 14 14-2M10 26 26 10" ${PS} stroke-width="3"/>`, // 1 diagonal stripes
  `<g fill="${INK}" fill-opacity=".42"><circle cx="6" cy="6" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><circle cx="18" cy="18" r="2.6"/></g>`, // 2 dots
  `<path d="M0 8l6-6 6 6 6-6 6 6M0 20l6-6 6 6 6-6 6 6" ${PS} stroke-width="2.6"/>`, // 3 zigzag
  `<path d="M12 2 22 12 12 22 2 12z" ${PS} stroke-width="2.2"/>`, // 4 diamonds (akwete)
  `<path d="M0 12H24M12 0V24" ${PS} stroke-width="2.6"/>`, // 5 grid
  `<path d="M0 7q6-6 12 0t12 0M0 19q6-6 12 0t12 0" ${PS} stroke-width="2.6"/>`, // 6 waves (adire ripple)
];
const patDef = (i, id) =>
  `<pattern id="${id}" width="24" height="24" patternUnits="userSpaceOnUse">${PATS[i]}</pattern>`;

// ---- shared motifs ----
const asoStripe = (
  x,
  y,
  wd,
  h = 12,
  cols = [GOLD, WALL, OIL, CREAM, GOLD, WALL, PEPPER, CREAM],
) => {
  const bw = wd / cols.length;
  return `<g>${cols.map((c, i) => `<rect x="${f1(x + i * bw)}" y="${y}" width="${f1(bw + 0.4)}" height="${h}" fill="${c}"/>`).join('')}</g>`;
};
const diamondRow = (x, y, n, s, fill, stroke) =>
  Array.from(
    { length: n },
    (_, i) =>
      `<path d="M${f1(x + i * s * 1.5)} ${y}l${f1(s / 1.2)} ${f1(s / 1.2)}-${f1(s / 1.2)} ${f1(s / 1.2)}-${f1(s / 1.2)}-${f1(s / 1.2)}z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
  ).join('');
const adireTile = (id, size, col, op) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g fill="none" stroke="${col}" stroke-width="2" opacity="${op}"><circle cx="${size / 2}" cy="${size / 2}" r="${f1(size * 0.3)}"/><circle cx="${size / 2}" cy="${size / 2}" r="${f1(size * 0.16)}"/><circle cx="0" cy="0" r="${f1(size * 0.14)}"/><circle cx="${size}" cy="0" r="${f1(size * 0.14)}"/><circle cx="0" cy="${size}" r="${f1(size * 0.14)}"/><circle cx="${size}" cy="${size}" r="${f1(size * 0.14)}"/></g><g fill="${col}" opacity="${op}"><circle cx="${size / 2}" cy="${size / 2}" r="2.4"/></g></pattern>`;

// ---------- 1. market stall backdrop ----------
const board = (W, H) => {
  const sw = W < 400 ? 30 : 40;
  const n = Math.ceil(W / sw);
  const aw = 46;
  const cols = [PEPPER, CREAM];
  const awning = Array.from(
    { length: n },
    (_, i) =>
      `<path d="M${i * sw} 0h${sw}v${aw}a${sw / 2} ${sw / 2} 0 0 1-${sw} 0z" fill="${cols[i % 2]}"/>`,
  ).join('');
  const ty = H - 64;
  const planks = Array.from(
    { length: 4 },
    (_, i) =>
      `<path d="M0 ${ty + 18 + i * 12}H${W}" stroke="${WOOD2}" stroke-width="2" opacity=".7"/>`,
  ).join('');
  const notice = (x, y, rot, c) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})"><rect width="46" height="58" rx="3" fill="${c}" stroke="${INK}" stroke-width="2"/><path d="M8 18h30M8 27h30M8 36h22M8 45h26" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity=".5"/><circle cx="23" cy="7" r="4" fill="${PEPPER}" stroke="${INK}" stroke-width="1.6"/></g>`;
  const side =
    W > H
      ? notice(f1(W * 0.06), 96, -6, CREAM) +
        notice(f1(W * 0.06) + 8, 176, 4, PLANTAIN) +
        notice(f1(W * 0.94 - 46), 100, 5, CREAM2) +
        notice(f1(W * 0.94 - 54), 184, -4, CREAM)
      : '';
  return svg(
    `0 0 ${W} ${H}`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${WALL}"/><stop offset="1" stop-color="${WALL2}"/></linearGradient>${adireTile('ad', 72, OIL, 0.13)}</defs><rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#ad)"/>${side}<rect y="${ty}" width="${W}" height="64" fill="${WOOD}"/>${planks}<rect y="${ty}" width="${W}" height="6" fill="${GOLD}"/>${asoStripe(0, ty + 6, W, 8)}<path d="M0 ${aw}h${W}" stroke="#00000040" stroke-width="10" opacity=".5"/>${awning}<path d="M0 0h${W}v6H0z" fill="${INK}" opacity=".35"/>`,
  );
};

// ---------- 2. grid board frame (340 x 340, stretches to a square board) ----------
const boardFrame = () => {
  const o = 'M0 18Q0 0 18 0H322Q340 0 340 18V322Q340 340 322 340H18Q0 340 0 322Z';
  const i = 'M16 28Q16 16 28 16H312Q324 16 324 28V312Q324 324 312 324H28Q16 324 16 312Z';
  const edge = (x, y, wd, h) => asoStripe(x, y, wd, h, [GOLD, WALL, OIL, CREAM, GOLD, PEPPER]);
  return svg(
    '0 0 340 340',
    `<defs>${adireTile('af', 40, OIL, 0.14)}</defs><path d="${o}${i}" fill="${WOOD}" fill-rule="evenodd" stroke="${INK}" stroke-width="3"/><path d="${i}" fill="${WALL2}" stroke="${INK}" stroke-width="3"/><path d="${i}" fill="url(#af)"/><g opacity=".95">${edge(34, 3, 272, 8)}${edge(34, 329, 272, 8)}</g><g>${[
      [8, 8],
      [332, 8],
      [8, 332],
      [332, 332],
    ]
      .map(
        ([x, y]) =>
          `<path d="M${x} ${y - 7}l7 7-7 7-7-7z" fill="${PLANTAIN}" stroke="${INK}" stroke-width="1.6"/>`,
      )
      .join('')}</g>`,
  );
};

// ---------- 3. pack card (320 x 84), icon slot at left ----------
const packCard = () =>
  svg(
    '0 0 320 84',
    `<rect x="2" y="2" width="316" height="80" rx="16" fill="${CREAM}" stroke="${INK}" stroke-width="3"/><path d="M18 2h-0a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h4V2z" fill="${CREAM2}"/><g transform="translate(2 2)"><clipPath id="c"><rect width="316" height="80" rx="16"/></clipPath><g clip-path="url(#c)">${asoStripe(0, 0, 316, 7, [GOLD, WALL, OIL, CREAM, GOLD, PEPPER, CREAM, WALL])}</g></g><circle cx="46" cy="44" r="29" fill="${CREAM2}" stroke="${INK}" stroke-width="2.4"/><circle cx="46" cy="44" r="24" fill="none" stroke="${OIL}" stroke-width="2" stroke-dasharray="3 5"/><g>${diamondRow(96, 69, 14, 8, OIL, INK)}</g>`,
  );

// ---------- 4. level banner (340 x 120) ----------
const banner = () =>
  svg(
    '0 0 340 120',
    `<defs>${adireTile('ad', 36, CREAM, 0.12)}</defs><path d="M0 28 24 56 0 84h20l10-14V42l-10-14z" fill="${WALL}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M340 28 316 56l24 28h-20l-10-14V42l10-14z" fill="${WALL}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><rect x="18" y="14" width="304" height="92" rx="10" fill="#122055" stroke="${INK}" stroke-width="3"/><rect x="18" y="14" width="304" height="92" rx="10" fill="url(#ad)"/>${asoStripe(18, 14, 304, 12, [GOLD, CREAM, OIL, PEPPER, GOLD, CREAM, OIL, PEPPER])}${asoStripe(18, 94, 304, 12, [OIL, PEPPER, GOLD, CREAM, OIL, PEPPER, GOLD, CREAM])}<path d="M18 26h304M18 94h304" stroke="${INK}" stroke-width="2"/>`,
  );

// ---------- 5. HUD ----------
const starOn = () =>
  svg(
    '0 0 64 64',
    `<path d="${starPath(32, 34, 28, 13)}" fill="#00000040" transform="translate(0 2)"/><path d="${starPath(32, 32, 28, 13)}" fill="${GOLD}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/><path d="${starPath(32, 32, 17, 8)}" fill="${PLANTAIN}"/>`,
  );
const starOff = () =>
  svg(
    '0 0 64 64',
    `<path d="${starPath(32, 32, 28, 13)}" fill="#00000030" stroke="${CREAM}" stroke-opacity=".75" stroke-width="3" stroke-dasharray="5 5" stroke-linejoin="round"/><path d="M22 22 42 42M42 22 22 42" stroke="${CREAM}" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>`,
  );
const lantern = () =>
  svg(
    '0 0 64 64',
    `<path d="M22 14c0-8 20-8 20 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><rect x="20" y="12" width="24" height="6" rx="2" fill="${GOLD}" stroke="${INK}" stroke-width="2.4"/><path d="M22 18h20l4 24H18z" fill="${PLANTAIN}" fill-opacity=".55" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M32 40c-7-4-6-10-1-16 1 5 7 6 6 12-.4 2-2 3-5 4z" fill="${OIL}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M32 40c-3-2-3-5-1-8 2 2 4 3 3 6z" fill="${PLANTAIN}"/><rect x="16" y="42" width="32" height="12" rx="4" fill="${PEPPER}" stroke="${INK}" stroke-width="3"/><path d="M22 48h20" stroke="${CREAM}" stroke-width="2.4" stroke-linecap="round"/><path d="M10 28 4 24M54 28l6-4M8 40H2M56 40h6" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`,
  );
const timeLow = () =>
  svg(
    '0 0 48 48',
    `<path d="M24 4 46 42H2z" fill="${OIL}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/><path d="M24 17v13" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/><circle cx="24" cy="36" r="2.8" fill="${INK}"/>`,
  );
const checkDisc = () =>
  svg(
    '0 0 32 32',
    `<circle cx="16" cy="16" r="14" fill="${GOOD}" stroke="${INK}" stroke-width="2.4"/><path d="M9 16.5 14 21.5 23 11" fill="none" stroke="${CREAM}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
const pin = () =>
  svg(
    '0 0 24 24',
    `<circle cx="12" cy="10" r="8" fill="${PEPPER}" stroke="${INK}" stroke-width="2"/><circle cx="9.5" cy="7.5" r="2.4" fill="${CREAM}" opacity=".7"/><path d="M12 18v5" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`,
  );
/** aso-oke strip, repeat-x; the time bar clips it with clip-path so the pattern never stretches */
const timeStrip = () =>
  svg(
    '0 0 48 16',
    `${asoStripe(0, 0, 48, 16, [GOLD, WALL, OIL, CREAM, GOLD, PEPPER])}<path d="M0 .5h48M0 15.5h48" stroke="${INK}" stroke-width="1" opacity=".5"/>`,
    ' width="48" height="16" preserveAspectRatio="none"',
  );

// ---------- 6. pack icons sprite (48 x 48, currentColor strokes) ----------
const S3 =
  'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
const sym = (id, body) => `<symbol id="${id}" viewBox="0 0 48 48"><g ${S3}>${body}</g></symbol>`;
const packSprite = () =>
  svg(
    '0 0 48 48',
    `<defs>${[
      sym(
        'pack-food',
        '<path d="M5 22h38c0 11-8 19-19 19S5 33 5 22z"/><path d="M3 22h42"/><path d="M15 16c-3-3 3-5 0-9M24 16c-3-3 3-5 0-9M33 16c-3-3 3-5 0-9"/>',
      ),
      sym(
        'pack-lagos',
        '<path d="M3 33V15h27l14 13v5z"/><path d="M8 20h8v7H8zM19 20h8v7h-8z"/><path d="M3 30h41"/><circle cx="14" cy="35" r="4.5" fill="currentColor"/><circle cx="35" cy="35" r="4.5" fill="currentColor"/>',
      ),
      sym(
        'pack-football',
        '<circle cx="24" cy="24" r="19"/><path d="M24 15l8 6-3 9H19l-3-9z"/><path d="M24 15V6M32 21l9-3M29 30l6 8M19 30l-6 8M16 21l-9-3"/>',
      ),
      sym(
        'pack-pidgin',
        '<path d="M5 8h24a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H17l-7 6v-6H5a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z"/><path d="M20 30v4a3 3 0 0 0 3 3h8l6 5v-5h2a3 3 0 0 0 3-3V21a3 3 0 0 0-3-3h-6"/><path d="M9 14h14M9 20h8"/>',
      ),
      sym(
        'pack-states',
        '<path d="M24 3C15.5 3 10 9.500 10 17c0 11 14 27 14 27s14-16 14-27C38 9.500 32.500 3 24 3z"/><path d="M24 11l2.500 5 5.500.8-4 3.900 1 5.500L24 23.500l-5 2.700 1-5.500-4-3.900 5.500-.8z"/>',
      ),
      sym(
        'pack-cloth',
        '<path d="M5 12h30v26H5z"/><path d="M5 19h30M5 26h30M5 33h30"/><path d="M35 12c8 0 8 13 0 13"/><path d="M41 42 29 30"/>',
      ),
      sym(
        'pack-lock',
        '<path d="M14 21v-6a10 10 0 0 1 20 0v6"/><path d="M9 21h30v21H9z"/><path d="M24 29v6"/>',
      ),
    ].join('')}</defs>`,
  );

// ---------- 7. fx ----------
const fxFound = () => {
  const cols = [GOLD, PEPPER, UGU, OIL, ADIRE, PLANTAIN, PEPPER, GOLD];
  const rb = cols
    .map((c, i) => {
      const a = (360 / 8) * i;
      return `<g transform="rotate(${a} 100 100)"><path d="M100 78C110 62 98 48 108 32c6-8 14-6 12 2-2 8-10 14-10 28" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M100 78C110 62 98 48 108 32c6-8 14-6 12 2-2 8-10 14-10 28" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/></g>`;
    })
    .join('');
  return svg(
    '0 0 200 200',
    `${rb}<circle cx="100" cy="100" r="18" fill="${GOLD}" stroke="${INK}" stroke-width="4"/><circle cx="100" cy="100" r="8" fill="${CREAM}"/>`,
  );
};
const fxHint = () =>
  svg(
    '0 0 96 96',
    `<circle cx="48" cy="48" r="42" fill="none" stroke="${INK}" stroke-width="9"/><circle cx="48" cy="48" r="42" fill="none" stroke="${PLANTAIN}" stroke-width="5" stroke-dasharray="7 6"/><circle cx="48" cy="48" r="30" fill="none" stroke="${CREAM}" stroke-width="2.4" stroke-dasharray="2 5" stroke-linecap="round"/><g stroke="${PLANTAIN}" stroke-width="4" stroke-linecap="round"><path d="M48 2v8M48 86v8M2 48h8M86 48h8"/></g>`,
  );
const trailBead = () =>
  svg(
    '0 0 32 32',
    `<circle cx="16" cy="16" r="14" fill="${GOLD}" stroke="${INK}" stroke-width="3"/><circle cx="16" cy="16" r="8" fill="${PLANTAIN}"/><circle cx="16" cy="16" r="3.4" fill="${PEPPER}"/>`,
  );

// ---------- 8. menu mark, avatar, thumbs ----------
const menuMark = () =>
  svg(
    '0 0 128 128',
    `<path d="${scallop(64, 66, 60, 50, 12)}" fill="#00000050"/><path d="${scallop(64, 64, 60, 50, 12)}" fill="${GOLD}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="64" cy="64" r="42" fill="${WALL}" stroke="${CREAM}" stroke-width="3"/><circle cx="64" cy="64" r="36" fill="none" stroke="${PLANTAIN}" stroke-width="2" stroke-dasharray="3 6"/><rect x="31" y="42" width="30" height="34" rx="5" fill="${CREAM}" stroke="${INK}" stroke-width="3"/><rect x="67" y="52" width="30" height="34" rx="5" fill="${CREAM}" stroke="${INK}" stroke-width="3"/>${glyph('S', 36, 48, 1.55)}${glyph('W', 71.5, 58, 1.55)}<path d="M40 88 58 96 90 96" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 88 58 96 90 96" fill="none" stroke="${PLANTAIN}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
const bust = ({ bg, skin, shirt, hair, extra = '', brow = '#1a0f0a', title }) =>
  svg(
    '0 0 128 128',
    `<title>${title}</title><path fill="${bg}" d="M0 0h128v128H0z"/><circle cx="64" cy="62" r="50" fill="#fff" opacity=".2"/><path fill="${shirt}" d="M8 128c0-28 26-38 56-38s56 10 56 38Z"/><rect width="20" height="24" x="54" y="74" fill="${skin}" rx="7"/><path fill="#000" opacity=".15" d="M54 82h20v6q-10 6-20 0z"/>${hair.back ?? ''}<ellipse cx="64" cy="58" rx="24" ry="28" fill="${skin}"/>${hair.front ?? ''}<ellipse cx="54" cy="58" rx="4.2" ry="3.8" fill="#fff"/><circle cx="54" cy="58.4" r="2.5" fill="#1a0f0a"/><circle cx="55" cy="57.4" r=".9" fill="#fff"/><ellipse cx="74" cy="58" rx="4.2" ry="3.8" fill="#fff"/><circle cx="74" cy="58.4" r="2.5" fill="#1a0f0a"/><circle cx="75" cy="57.4" r=".9" fill="#fff"/><path d="M48 49q6-5 12-1m8 0q6-4 12 1" fill="none" stroke="${brow}" stroke-width="3" stroke-linecap="round"/><path d="M58 72q6 6 12 0" fill="none" stroke="#7a2a1a" stroke-width="3" stroke-linecap="round"/>${extra}`,
    ' width="128" height="128"',
  );
// Osas: the guide. Edo, Benin City. A sign-painter: adire head tie, brush behind the ear, apron with paint dots.
const osas = () =>
  bust({
    title: 'Osas',
    bg: OIL,
    skin: '#6A4430',
    shirt: PLANTAIN,
    hair: {
      back: `<path d="M84 34c10-12 24-4 18 8-4 8-14 6-18-8z" fill="${ADIRE}" stroke="#1D1D20" stroke-width="2"/>`,
      front: `<path d="M38 56c0-22 11-32 26-32s26 10 26 32c-8-10-16-14-26-14s-18 4-26 14z" fill="${ADIRE}" stroke="#1D1D20" stroke-width="2"/><g fill="${CREAM}"><circle cx="50" cy="40" r="2.4"/><circle cx="64" cy="33" r="2.4"/><circle cx="78" cy="40" r="2.4"/><circle cx="57" cy="45" r="1.6"/><circle cx="71" cy="45" r="1.6"/></g>`,
    },
    extra: `<path d="M90 76l10-30" stroke="#1D1D20" stroke-width="7" stroke-linecap="round"/><path d="M90 76l10-30" stroke="${WOOD}" stroke-width="4" stroke-linecap="round"/><path d="M100 46l3-9" stroke="${PEPPER}" stroke-width="5" stroke-linecap="round"/><path d="M34 98h60l10 30H24z" fill="${CREAM}" stroke="#1D1D20" stroke-width="2"/><path d="M44 98 52 128M84 98 76 128" stroke="#1D1D20" stroke-width="2" opacity=".5"/><g><circle cx="50" cy="112" r="3.2" fill="${PEPPER}"/><circle cx="64" cy="108" r="3" fill="${UGU}"/><circle cx="78" cy="114" r="3.4" fill="${ADIRE}"/></g><path d="M56 68q8 10 16 0" fill="#fff" stroke="#7a2a1a" stroke-width="2.4"/>`,
  });
const thumb = (W, H) => {
  const s = Math.min(W, H) / 512;
  const size = 380 * s;
  const gx = W / 2 - size / 2,
    gy = H / 2 - size / 2 + 6 * s;
  const N = 5,
    pad = 22 * s,
    cell = (size - pad * 2) / N;
  const L = ['WORDA', 'SABIO', 'BISWR', 'DOASI', 'RWDBA'];
  const selSet = new Set(['2,0', '3,1', '4,2']);
  const tiles = L.flatMap((row, r) =>
    [...row].map((ch, c) => {
      const x = gx + pad + c * cell,
        y = gy + pad + r * cell;
      const found = r === 1 && c < 4,
        sel = selSet.has(`${r},${c}`);
      const base = sel ? 'none' : found ? LANES[3] : CREAM;
      const rect = `<rect x="${f1(x + 3)}" y="${f1(y + 3)}" width="${f1(cell - 6)}" height="${f1(cell - 6)}" rx="${f1(8 * s)}" fill="${base}" stroke="${INK}" stroke-width="${f1((sel ? 3.6 : 2.4) * s)}"/>`;
      const pat = found
        ? `<rect x="${f1(x + 3)}" y="${f1(y + 3)}" width="${f1(cell - 6)}" height="${f1(cell - 6)}" rx="${f1(8 * s)}" fill="url(#p4)"/><path d="M${f1(x + cell * 0.25)} ${f1(y + cell * 0.88)}h${f1(cell * 0.5)}" stroke="${INK}" stroke-width="${f1(3 * s)}" stroke-linecap="round"/>`
        : '';
      const sc = (cell * 0.6) / 16;
      return `${rect}${pat}${glyph(ch, x + cell / 2 - 5 * sc, y + cell * 0.2, sc, INK)}`;
    }),
  ).join('');
  const P = (r, c) => `${f1(gx + pad + cell * (c + 0.5))} ${f1(gy + pad + cell * (r + 0.5))}`;
  const trail = `<path d="M${P(2, 0)}L${P(4, 2)}" stroke="${INK}" stroke-width="${f1(cell * 0.86)}" stroke-linecap="round"/><path d="M${P(2, 0)}L${P(4, 2)}" stroke="${PLANTAIN}" stroke-width="${f1(cell * 0.74)}" stroke-linecap="round"/>`;
  return svg(
    `0 0 ${W} ${H}`,
    `<defs>${patDef(3, 'p4')}</defs>${inner(board(W, H))}<g transform="translate(${f1(gx)} ${f1(gy)}) scale(${f1(size / 340)})">${inner(boardFrame())}</g>${trail}${tiles}`,
  );
};

// ---------- run ----------
export const VOICE = [
  {
    id: 'sw-koyo',
    pcm: 'Kóyo! Welcome. Make we find some words.',
    en: 'Kóyo! Welcome. Let us find some words.',
  },
  { id: 'sw-start', pcm: 'Oya, make we find the words!', en: "Come on, let's find the words!" },
  { id: 'sw-found', pcm: 'Ehen! You see am!', en: 'There it is! You found it!' },
  { id: 'sw-long', pcm: 'Chai! Na big word be that!', en: 'Wow! That is a big word!' },
  {
    id: 'sw-wrong',
    pcm: 'Hmm, no be word o. Try again.',
    en: "Hmm, that's not a word. Try again.",
  },
  {
    id: 'sw-hint',
    pcm: 'Make I light lantern for you small.',
    en: 'Let me light a lantern for you.',
  },
  { id: 'sw-last5', pcm: 'Time dey go o! Five seconds!', en: 'Time is running! Five seconds!' },
  { id: 'sw-star3', pcm: 'Three stars! Sabi person!', en: 'Three stars! A real word master!' },
  {
    id: 'sw-win',
    pcm: 'All the words don show! Well done!',
    en: 'Every word is found! Well done!',
  },
  { id: 'sw-lose', pcm: 'No wahala. Make we try am again.', en: 'No problem. Let us try again.' },
  {
    id: 'sw-pack',
    pcm: 'Which pack you wan play today?',
    en: 'Which pack do you want to play today?',
  },
];
export const build = () => {
  w('bg/board-portrait.svg', board(360, 640));
  w('bg/board-landscape.svg', board(640, 360));
  w('ui/board-frame.svg', boardFrame());
  w('ui/pack-card.svg', packCard());
  w('ui/banner.svg', banner());
  w('ui/pin.svg', pin());
  w('hud/star-on.svg', starOn());
  w('hud/star-off.svg', starOff());
  w('hud/hint-lantern.svg', lantern());
  w('hud/time-low.svg', timeLow());
  w('hud/check-disc.svg', checkDisc());
  w('hud/time-strip.svg', timeStrip());
  PATS.forEach((_, i) =>
    w(`lanes/pat-${i + 1}.svg`, svg('0 0 24 24', PATS[i], ' width="24" height="24"')),
  );
  w('icons/packs.svg', packSprite());
  w('fx/found-burst.svg', fxFound());
  w('fx/hint-ring.svg', fxHint());
  w('fx/trail-bead.svg', trailBead());
  w('icon/menu-mark.svg', menuMark());
  w('avatars/osas.svg', osas());
  w('thumb/thumb-512x512.svg', thumb(512, 512));
  w('thumb/thumb-1024x500.svg', thumb(1024, 500));

  // silent audio placeholders (copied from the Ludo ones; awaiting composer and voice actors)
  const SRC = join(ROOT, 'games', 'naija-ludo', 'assets', 'audio');
  const cp = (from, to) => {
    if (existsSync(from)) {
      mkdirSync(dirname(join(OUT, to)), { recursive: true });
      copyFileSync(from, join(OUT, to));
    }
  };
  for (const m of ['words-menu-afrobeats', 'words-play-afrobeats', 'words-tense-afrobeats'])
    cp(join(SRC, 'music', 'ludo-menu-highlife.mp3'), `audio/music/${m}.mp3`);
  for (const v of VOICE) cp(join(SRC, 'voice', 'vo-ld-six.mp3'), `audio/voice/vo-${v.id}.mp3`);
  w(
    'audio/voice-manifest.json',
    JSON.stringify(
      {
        _readme:
          'Sabi Words voice placeholders (silent mp3, ogg null until human delivery). Guide = Osas (Edo, Benin City). Shared lines (oya, madalla, e-ku-ise, you-don-win, e-don-do) live in packages/core/assets/audio/voice-manifest.json.',
        lines: VOICE.map((v) => ({
          id: v.id,
          speaker: 'osas',
          text: { pcm: v.pcm, en: v.en },
          files: { mp3: `voice/vo-${v.id}.mp3`, ogg: null },
          _review: true,
        })),
      },
      null,
      2,
    ) + '\n',
  );
};
if (process.argv[1] === fileURLToPath(import.meta.url)) build();
