#!/usr/bin/env node
// Generates the original SVG art for Naija Whot (asset-designer, in-repo).
// ONE generator: five shape symbols + stroke-drawn digits are defined once, and the 54 faces are tiny
// <symbol>s that <use> them (deck.svg sprite, inline it once in the page). Numbers are paths, not text,
// so no font is needed and the cards also work as <img>. Original layout: do not trace any real deck.
// Output: games/naija-whot/assets/{cards,table,fx,ui,thumb,audio}. ART_OUT overrides the output dir.
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.ART_OUT ?? join(ROOT, 'games', 'naija-whot', 'assets');
export const INK = '#1D1D20',
  CREAM = '#FFF3DA',
  WINE = '#4A1020',
  WINE2 = '#8C1D3D',
  GOLD = '#E8AE32',
  BRIGHT = '#FFC933',
  ORANGE = '#E4702A';
const w = (p, s) => {
  mkdirSync(dirname(join(OUT, p)), { recursive: true });
  writeFileSync(join(OUT, p), s);
};
const svg = (vb, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${extra}>${body}</svg>`;

// shape + colour: greyscale luminance differs too (see check script), but shape + number always carry the meaning
export const SHAPES = {
  circle: { hex: '#D91F26', nums: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14] },
  triangle: { hex: '#2548B8', nums: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14] },
  cross: { hex: '#14703A', nums: [1, 2, 3, 5, 7, 10, 11, 13, 14] },
  square: { hex: '#E4702A', nums: [1, 2, 3, 5, 7, 10, 11, 13, 14] },
  star: { hex: '#F2B21A', nums: [1, 2, 3, 4, 5, 7, 8] },
};
export const ORDER = Object.keys(SHAPES);
const star = (() => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2,
      r = i % 2 ? 4.9 : 11;
    p.push(`${(12 + r * Math.cos(a)).toFixed(1)} ${(12 + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${p.join('L')}z`;
})();
const SHAPE_D = {
  circle: `<circle cx="12" cy="12" r="9.4"/>`,
  triangle: `<path d="M12 2.6 22 21H2z"/>`,
  cross: `<path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z"/>`,
  square: `<rect x="2.4" y="2.4" width="19.2" height="19.2" rx=".8"/>`,
  star: `<path d="${star}"/>`,
};
const shapeSym = (s) =>
  `<symbol id="s-${s}" viewBox="0 0 24 24"><g fill="${SHAPES[s].hex}" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round">${SHAPE_D[s]}</g></symbol>`;
/** standalone shape (inline, for files that are used as <img>) */
const shapeInline = (s, x, y, size) =>
  `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="${SHAPES[s].hex}" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round">${SHAPE_D[s]}</g>`;

// stroke digits on a 10 x 16 box (ink spans x 1.5..9.5, y 1.5..14.5)
const DIG = [
  'M5 1.5c-3.2 0-3.2 13 0 13s3.2-13 0-13z',
  'M2.5 4.5 6 1.5v13M2.5 14.5h7',
  'M1.5 5C2 1 9 1 8.5 5.5 8.3 8 1.5 11 1.5 14.5H9',
  'M1.5 2H8.5L5 7C9.5 6.5 9.5 14.5 4.8 14.5 3 14.5 2 13.8 1.5 12.5',
  'M7 14.5V1.5L1.5 10.5H9.5',
  'M8.5 1.5H2.5L2 7C6 5.5 9.5 7.5 9 11 8.5 15 4 15.5 1.5 13',
  'M8 2C5 1 1.5 4 1.5 10 1.5 16 9 16 9 10.5 9 6.5 3 6 1.5 10',
  'M1.5 1.5H9L4.5 14.5',
  'M5 1.5C1.5 1.5 1.5 7.5 5 7.5S8.5 1.5 5 1.5zM5 7.5C1 7.5 1 14.5 5 14.5S9 7.5 5 7.5z',
];
const digDefs = () =>
  DIG.map((d, i) => `<path id="d${i}" d="${d}"/>`).join('') +
  `<use id="d9" href="#d6" transform="rotate(180 5 8)"/>`;
const numUses = (n, ink = INK) =>
  `<g fill="none" stroke="${ink}" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.3">${String(
    n,
  )
    .split('')
    .map((c, i) => `<use href="#d${c}" x="${i * 11}"/>`)
    .join('')}</g>`;
/** number at ink box top-left (x,y), scale s */
const num = (n, x, y, s, ink) =>
  `<g transform="translate(${(x - 1.5 * s).toFixed(1)} ${(y - 1.5 * s).toFixed(1)}) scale(${s})">${numUses(n, ink)}</g>`;

const rosette = (cx, cy, ro, ri, n, fill, extra = '') => {
  const p = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI / n) * i - Math.PI / 2,
      r = i % 2 ? ri : ro;
    p.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `<path d="M${p.join('L')}z" fill="${fill}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" ${extra}/>`;
};

// ---------- cards ----------
const HEXES = ORDER.map((s) => SHAPES[s].hex);
const segs = (x, y, wd, h, vertical) =>
  HEXES.map(
    (c, i) =>
      `<rect x="${vertical ? x : x + (wd / 5) * i}" y="${vertical ? y + (h / 5) * i : y}" width="${vertical ? wd : wd / 5 + 0.2}" height="${vertical ? h / 5 + 0.2 : h}" fill="${c}"/>`,
  ).join('');
const miniCard = (x, y) =>
  `<rect x="${x}" y="${y}" width="7" height="10" rx="1.3" fill="${WINE}" stroke="${INK}" stroke-width="1"/><rect x="${x + 1.6}" y="${y + 1.6}" width="3.8" height="6.8" rx=".6" fill="none" stroke="${BRIGHT}" stroke-width=".8"/>`;
const plusN = (n, x, cy) =>
  `<g transform="translate(${x} ${cy - 4.5})"><path d="M0 4.5h5M2.5 2v5" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/><g transform="translate(6.8 0) scale(.56)">${numUses(n)}</g></g>`;
const RIB_Y = 84,
  RIB_H = 16,
  CX = 43;
/** special-card marker ribbon: icons and counts only (no words), so it works in en and pcm */
const ribbon = (wd, body) =>
  `<rect x="${CX - wd / 2}" y="${RIB_Y}" width="${wd}" height="${RIB_H}" rx="8" fill="${BRIGHT}" stroke="${INK}" stroke-width="1.6"/>${body}`;
const MARK = {
  1: () =>
    ribbon(
      34,
      `<path d="M47 90.6A5.4 5.4 0 1 0 48 94.4" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><path d="M44.4 86.6 49.6 90.4 43.6 91.6z" fill="${INK}"/>`,
    ),
  2: () => ribbon(46, `${miniCard(22, 87)}${miniCard(27.5, 87)}${plusN(2, 38, 92)}`),
  5: () =>
    ribbon(54, `${miniCard(17.5, 87)}${miniCard(23, 87)}${miniCard(28.5, 87)}${plusN(3, 41, 92)}`),
  8: () =>
    ribbon(
      34,
      `<circle cx="43" cy="92" r="5.6" fill="none" stroke="${INK}" stroke-width="1.8"/><path d="M40.5 92h5" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/><path d="M39.6 88.2 46.4 95.8" stroke="${INK}" stroke-width="1.6"/>`,
    ),
  14: () =>
    ribbon(
      46,
      `<path d="M23 94.5v-3.2L25.4 87.5h8.2L36 91.3v3.2z" fill="${WINE2}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/><path d="M23 91.3h13M28.5 87.5v3.8" stroke="${CREAM}" stroke-width="1.1"/>${plusN(1, 40, 92)}`,
    ),
};
const WHOT_MARK = () =>
  ribbon(56, ORDER.map((s, i) => shapeInline(s, 17 + i * 10.4, 87, 9.4)).join(''));
const W_PATH = (cx, cy, k, c) =>
  `<path d="M${cx - 7 * k} ${cy - 5 * k}l${3.5 * k} ${10 * k} ${3.5 * k}-${7 * k} ${3.5 * k} ${7 * k} ${3.5 * k}-${10 * k}" fill="none" stroke="${c}" stroke-width="${3.2 * k}" stroke-linecap="round" stroke-linejoin="round"/>`;

const frame = (strips) =>
  `<rect x="1" y="1" width="98" height="138" rx="10" fill="${CREAM}" stroke="#3A2A1A" stroke-width="2"/>${strips}`;
const solidStrips = (c) =>
  `<rect x="3.5" y="9" width="4.5" height="122" rx="2" fill="${c}"/><rect x="92" y="9" width="4.5" height="122" rx="2" fill="${c}"/><rect x="8.5" y="9" width="1.1" height="122" fill="${GOLD}"/><rect x="90.4" y="9" width="1.1" height="122" fill="${GOLD}"/><rect x="14" y="3.4" width="72" height="3" rx="1.5" fill="${c}"/><rect x="14" y="133.6" width="72" height="3" rx="1.5" fill="${c}"/>`;
const whotStrips = () =>
  `<g>${segs(3.5, 9, 4.5, 122, true)}${segs(92, 9, 4.5, 122, true)}${segs(14, 3.4, 72, 3, false)}${segs(14, 133.6, 72, 3, false)}</g><rect x="8.5" y="9" width="1.1" height="122" fill="${GOLD}"/><rect x="90.4" y="9" width="1.1" height="122" fill="${GOLD}"/>`;

const cardSym = (s, n) => {
  const id = `${s}-${n}`;
  const c = SHAPES[s].hex;
  const index = `<g id="ix-${id}">${num(n, 12, 8, 1.9)}<use href="#s-${s}" x="11" y="37" width="18" height="18"/></g>`;
  return `<symbol id="c-${id}" viewBox="0 0 100 140">${frame(solidStrips(c))}<circle cx="50" cy="58" r="25" fill="none" stroke="${c}" stroke-opacity=".4" stroke-width="2.6" stroke-dasharray=".1 5.2" stroke-linecap="round"/><use href="#s-${s}" x="30" y="38" width="40" height="40"/>${MARK[n] ? MARK[n]() : ''}${index}<use href="#ix-${id}" transform="rotate(180 50 70)"/></symbol>`;
};
const whotSym = () => {
  const index = `<g id="ix-whot">${num(20, 12, 8, 1.9)}${rosette(20, 46, 9.4, 6.6, 10, BRIGHT)}${W_PATH(20, 46, 0.5, WINE)}</g>`;
  return `<symbol id="c-whot-20" viewBox="0 0 100 140">${frame(whotStrips())}<circle cx="50" cy="58" r="27" fill="none" stroke="${WINE2}" stroke-opacity=".35" stroke-width="2.6" stroke-dasharray=".1 5.2" stroke-linecap="round"/>${rosette(50, 58, 22, 16.5, 12, BRIGHT)}<circle cx="50" cy="58" r="12.5" fill="${WINE}" stroke="${INK}" stroke-width="1.4"/>${W_PATH(50, 58, 1, CREAM)}${WHOT_MARK()}${index}<use href="#ix-whot" transform="rotate(180 50 70)"/></symbol>`;
};

// card back: aso-oke strips + an akwete diamond band, wine and gold (no letters, no logos)
const backBody = () => {
  const cols = [
    GOLD,
    WINE2,
    CREAM,
    ORANGE,
    WINE2,
    GOLD,
    CREAM,
    WINE2,
    ORANGE,
    GOLD,
    WINE2,
    CREAM,
    ORANGE,
  ];
  const widths = [6, 4, 2, 5, 4, 6, 2, 4, 5, 6, 4, 2, 5];
  let x = 11;
  const strips = cols
    .map((c, i) => {
      const r = `<rect x="${x}" y="11" width="${widths[i]}" height="118" fill="${c}"/>`;
      x += widths[i];
      return r;
    })
    .join('');
  const k = (100 - 22) / (x - 11);
  const diamonds = Array.from({ length: 5 }, (_, i) => {
    const cx = 17 + i * 16.5;
    return `<path d="M${cx} 56.5 ${cx + 8.25} 70 ${cx} 83.5 ${cx - 8.25} 70z" fill="${CREAM}" stroke="${WINE}" stroke-width="1.4"/><path d="M${cx} 62 ${cx + 4} 70 ${cx} 78 ${cx - 4} 70z" fill="${i % 2 ? ORANGE : WINE2}"/>`;
  }).join('');
  return `<rect x="1" y="1" width="98" height="138" rx="10" fill="${WINE}" stroke="#2C0813" stroke-width="2"/><g transform="translate(11 0) scale(${k.toFixed(3)} 1) translate(-11 0)">${strips}</g><rect x="11" y="52" width="78" height="36" fill="${WINE}" opacity=".92"/>${diamonds}<rect x="11" y="11" width="78" height="118" rx="2" fill="none" stroke="${BRIGHT}" stroke-width="2.4"/><rect x="5.5" y="5.5" width="89" height="129" rx="6.5" fill="none" stroke="${BRIGHT}" stroke-width="1" opacity=".8"/>${rosette(50, 70, 9, 6.4, 8, BRIGHT)}<circle cx="50" cy="70" r="2.6" fill="${WINE}"/>`;
};

const defs = () => `<defs>${digDefs()}</defs>`;
const deckSprite = () => {
  const syms = [ORDER.map(shapeSym).join('')];
  for (const s of ORDER) for (const n of SHAPES[s].nums) syms.push(cardSym(s, n));
  syms.push(whotSym());
  syms.push(`<symbol id="c-back" viewBox="0 0 100 140">${backBody()}</symbol>`);
  return svg(
    '0 0 100 140',
    defs() + syms.join(''),
    ' width="0" height="0" style="position:absolute"',
  );
};

// ---------- called-shape indicator: gold ring + shape, with a small pointer ----------
const callIcon = (s) =>
  svg(
    '0 0 96 104',
    `<path d="M40 88h16l-8 14z" fill="${BRIGHT}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="48" cy="46" r="42" fill="${CREAM}" stroke="${INK}" stroke-width="5"/><circle cx="48" cy="46" r="36" fill="none" stroke="${BRIGHT}" stroke-width="6" stroke-dasharray="14 5"/><circle cx="48" cy="46" r="30" fill="${WINE}"/>${shapeInline(s, 26, 24, 44)}<path d="M40 88h16" stroke="${CREAM}" stroke-width="3"/>`,
  );

// ---------- piles ----------
const pileDraw = () =>
  svg(
    '0 0 120 170',
    [0, 1, 2]
      .map(
        (i) =>
          `<g transform="translate(${2 + i * 3} ${10 - i * 4}) scale(1.08)" ><g>${backBody()}</g></g>`,
      )
      .join(''),
  );
const pileDiscard = () =>
  svg(
    '0 0 120 170',
    `<rect x="6" y="6" width="108" height="158" rx="14" fill="${WINE}" fill-opacity=".35" stroke="${CREAM}" stroke-width="3" stroke-dasharray="10 8" stroke-linecap="round"/><circle cx="60" cy="85" r="26" fill="none" stroke="${CREAM}" stroke-opacity=".5" stroke-width="4" stroke-dasharray=".1 11" stroke-linecap="round"/>`,
  );

// ---------- table: iroko wood in front of an original ankara wax-print cloth ----------
const ankaraTile = () =>
  `<pattern id="ak" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="#5A1230"/><circle cx="30" cy="30" r="17" fill="none" stroke="${GOLD}" stroke-width="3.5"/><circle cx="30" cy="30" r="10" fill="${ORANGE}"/><circle cx="30" cy="30" r="4" fill="${CREAM}"/>${[0, 90, 180, 270].map((a) => `<ellipse cx="30" cy="9" rx="3.6" ry="7" fill="#0E8A7A" transform="rotate(${a} 30 30)"/>`).join('')}${[45, 135, 225, 315].map((a) => `<circle cx="30" cy="8.5" r="2.4" fill="${CREAM}" transform="rotate(${a} 30 30)"/>`).join('')}<path d="M0 0h60M0 60h60" stroke="${BRIGHT}" stroke-width="1.6" stroke-dasharray="3 4"/></pattern>`;
const grain = (W, H, n, seed) => {
  let s = seed;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: n }, () => {
    const y = r() * H,
      x = r() * W * 0.3,
      l = W * (0.4 + r() * 0.6);
    return `M${x.toFixed(0)} ${y.toFixed(0)}c${(l / 3).toFixed(0)} ${(r() * 6 - 3).toFixed(1)} ${((2 * l) / 3).toFixed(0)} ${(r() * 6 - 3).toFixed(1)} ${l.toFixed(0)} ${(r() * 4 - 2).toFixed(1)}`;
  }).join('');
};
const table = (W, H) => {
  const x = W * 0.045,
    y = H * 0.09,
    tw = W - 2 * x,
    th = H - y - H * 0.06;
  return svg(
    `0 0 ${W} ${H}`,
    `<defs>${ankaraTile()}<clipPath id="tc"><rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="26"/></clipPath></defs><rect width="${W}" height="${H}" fill="url(#ak)"/><rect width="${W}" height="${H}" fill="#2C0813" opacity=".45"/><rect x="${x - 4}" y="${y - 4 + 10}" width="${tw + 8}" height="${th + 8}" rx="30" fill="#1F0A00" opacity=".55"/><rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="26" fill="#7A4220"/><g clip-path="url(#tc)"><path d="${grain(W, H, 46, 7)}" fill="none" stroke="#5C2F14" stroke-width="1.6" opacity=".55" transform="translate(${x} ${y})"/><path d="${grain(W, H, 26, 19)}" fill="none" stroke="#9C5E32" stroke-width="1.2" opacity=".5" transform="translate(${x} ${y})"/><rect x="${x}" y="${y}" width="${tw}" height="${th * 0.5}" fill="#FFFFFF" opacity=".04"/></g><rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="26" fill="none" stroke="#3A1B09" stroke-width="5"/><rect x="${x + 9}" y="${y + 9}" width="${tw - 18}" height="${th - 18}" rx="19" fill="none" stroke="${GOLD}" stroke-width="2.5"/><rect x="${x + 14}" y="${y + 14}" width="${tw - 28}" height="${th - 28}" rx="15" fill="none" stroke="${WINE2}" stroke-width="2" stroke-dasharray="14 6"/>`,
    ' preserveAspectRatio="xMidYMid slice"',
  );
};

// ---------- fx ----------
const ray = (n, r0, r1, cx, cy, wd) =>
  Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n;
    const p = (r, t) => `${(cx + r * Math.cos(t)).toFixed(1)} ${(cy + r * Math.sin(t)).toFixed(1)}`;
    return `M${p(r0, a - wd)}L${p(r1, a)}L${p(r0, a + wd)}z`;
  }).join('');
const fxFlick = () =>
  svg(
    '0 0 160 64',
    `<path d="M4 20Q60 14 150 30Q60 28 4 20z" fill="${CREAM}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M14 34Q70 30 140 36Q70 40 14 34z" fill="${BRIGHT}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M8 46Q50 44 100 48Q50 52 8 46z" fill="${CREAM}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
    ' width="160" height="64"',
  );
const fxSlam = () =>
  svg(
    '0 0 192 192',
    `<ellipse cx="96" cy="96" rx="88" ry="30" fill="none" stroke="${CREAM}" stroke-width="5" opacity=".8"/><ellipse cx="96" cy="96" rx="64" ry="20" fill="none" stroke="${BRIGHT}" stroke-width="6"/><path d="${ray(10, 24, 86, 96, 96, 0.13)}" fill="${BRIGHT}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="96" cy="96" r="26" fill="${CREAM}" stroke="${INK}" stroke-width="5"/>`,
    ' width="192" height="192"',
  );
const fxMarket = () =>
  svg(
    '0 0 220 220',
    `<path d="${ray(14, 40, 104, 110, 118, 0.1)}" fill="${BRIGHT}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" opacity=".9"/>${ORDER.map(
      (s, i) => {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        return shapeInline(s, 110 + 74 * Math.cos(a) - 17, 118 + 74 * Math.sin(a) - 17, 34);
      },
    ).join(
      '',
    )}<path d="M54 74h112l12 34H42z" fill="${WINE2}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M${42 + i * 27.2} 108a13.6 13.6 0 0 0 27.2 0z" fill="${i % 2 ? CREAM : BRIGHT}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`).join('')}<path d="M66 74 62 108M110 74v34M154 74l4 34" stroke="${INK}" stroke-width="3" opacity=".6"/><path d="M60 122v54M160 122v54" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><rect x="52" y="150" width="116" height="14" rx="4" fill="#7A4220" stroke="${INK}" stroke-width="4"/>`,
    ' width="220" height="220"',
  );
const fxPenalty = () =>
  svg(
    '0 0 160 160',
    `<path d="${ray(12, 34, 76, 80, 80, 0.14)}" fill="${ORANGE}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><g transform="translate(80 84) rotate(-18) translate(-44 -34) scale(.5)">${backBody()}</g><g transform="translate(80 84) rotate(2) translate(-44 -36) scale(.5)">${backBody()}</g><g transform="translate(80 84) rotate(20) translate(-44 -34) scale(.5)">${backBody()}</g><path d="M80 138 62 118h12V100h12v18h12z" fill="${CREAM}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
    ' width="160" height="160"',
  );
const fxSkip = () =>
  svg(
    '0 0 128 128',
    `<circle cx="64" cy="64" r="54" fill="${WINE}" stroke="${INK}" stroke-width="6"/><circle cx="64" cy="64" r="46" fill="none" stroke="${BRIGHT}" stroke-width="6" stroke-dasharray="16 6"/><path d="M50 40v48M78 40v48" stroke="${CREAM}" stroke-width="12" stroke-linecap="round"/><path d="M30 98 98 30" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M30 98 98 30" stroke="${BRIGHT}" stroke-width="6" stroke-linecap="round"/>`,
    ' width="128" height="128"',
  );
const fxWhotGlow = () =>
  svg(
    '0 0 192 192',
    `<path d="${ray(16, 38, 92, 96, 96, 0.1)}" fill="${BRIGHT}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>${rosette(96, 96, 40, 30, 12, CREAM)}<circle cx="96" cy="96" r="22" fill="${WINE}" stroke="${INK}" stroke-width="4"/>${W_PATH(96, 96, 1.7, CREAM)}`,
    ' width="192" height="192"',
  );

// ---------- last card button and banner (no text: copy comes from t('whot.lastCard')) ----------
const agogoIcon = (x, y, k) =>
  `<g transform="translate(${x} ${y}) scale(${k})" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"><path d="M4 28 10 8a6 6 0 0 1 12 0l6 20z" fill="${BRIGHT}"/><ellipse cx="16" cy="28" rx="12.5" ry="3.4" fill="${GOLD}"/></g>`;
const lastBtn = () =>
  svg(
    '0 0 260 76',
    `<rect x="4" y="9" width="252" height="64" rx="32" fill="#2C0813" stroke="${INK}" stroke-width="3"/><rect x="4" y="2" width="252" height="64" rx="32" fill="${BRIGHT}" stroke="${INK}" stroke-width="4"/><rect x="14" y="11" width="232" height="46" rx="23" fill="${WINE}" stroke="${INK}" stroke-width="2"/><rect x="22" y="14" width="216" height="5" rx="2.5" fill="${GOLD}"/><rect x="22" y="49" width="216" height="5" rx="2.5" fill="${GOLD}"/>${agogoIcon(26, 12, 1)}${agogoIcon(204, 12, 1)}`,
    ' width="260" height="76"',
  );
const lastBanner = () =>
  svg(
    '0 0 340 104',
    `<path d="M0 28h26v52H0l14-26z" fill="${WINE2}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M340 28h-26v52h26l-14-26z" fill="${WINE2}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><rect x="20" y="10" width="300" height="84" rx="10" fill="${WINE}" stroke="${INK}" stroke-width="5"/><rect x="20" y="16" width="300" height="9" fill="${BRIGHT}"/><rect x="20" y="25" width="300" height="3" fill="${ORANGE}"/><rect x="20" y="76" width="300" height="3" fill="${ORANGE}"/><rect x="20" y="79" width="300" height="9" fill="${BRIGHT}"/><path d="M20 10h300v84H20z" fill="none" stroke="${INK}" stroke-width="5"/>${agogoIcon(34, 34, 1.15)}${agogoIcon(266, 34, 1.15)}`,
    ' width="340" height="104"',
  );

// ---------- thumbs (placeholder hero art, no text) ----------
const thumb = (W, H) => {
  const fan = [
    ['circle', 5, -34],
    ['triangle', 14, -17],
    ['whot', 20, 0],
    ['star', 7, 17],
    ['cross', 11, 34],
  ];
  const k = W === H ? 1 : 0.95;
  const cw = 100 * 1.5 * k;
  const cards = fan
    .map(([s, n, a]) => {
      const id = s === 'whot' ? 'c-whot-20' : `c-${s}-${n}`;
      return `<g transform="translate(${W / 2} ${H * 1.12}) rotate(${a} 0 0) translate(${-cw / 2} ${-cw * 1.4 * 0.95}) scale(${1.5 * k})"><use href="#${id}" width="100" height="140"/></g>`;
    })
    .join('');
  const used = fan.map(([s, n]) => (s === 'whot' ? whotSym() : cardSym(s, n))).join('');
  return svg(
    `0 0 ${W} ${H}`,
    `<defs>${digDefs()}${ORDER.map(shapeSym).join('')}${used}${ankaraTile()}</defs><rect width="${W}" height="${H}" fill="url(#ak)"/><rect width="${W}" height="${H}" fill="#2C0813" opacity=".4"/><ellipse cx="${W / 2}" cy="${H * 0.98}" rx="${W * 0.5}" ry="${H * 0.3}" fill="#7A4220" stroke="${GOLD}" stroke-width="5"/>${cards}${rosette(W / 2, H * 0.2, H * 0.09, H * 0.065, 12, BRIGHT)}`,
  );
};

// ---------- run ----------
export const build = () => {
  w('cards/deck.svg', deckSprite());
  w('cards/back.svg', svg('0 0 100 140', backBody(), ' width="100" height="140"'));
  w('cards/pile-draw.svg', pileDraw());
  w('cards/pile-discard.svg', pileDiscard());
  ORDER.forEach((s) => w(`ui/call-${s}.svg`, callIcon(s)));
  w('ui/last-card-btn.svg', lastBtn());
  w('ui/last-card-banner.svg', lastBanner());
  w('table/table-portrait.svg', table(360, 640));
  w('table/table-landscape.svg', table(640, 360));
  w('fx/flick.svg', fxFlick());
  w('fx/slam.svg', fxSlam());
  w('fx/market-burst.svg', fxMarket());
  w('fx/pick-penalty.svg', fxPenalty());
  w('fx/skip-ring.svg', fxSkip());
  w('fx/whot-glow.svg', fxWhotGlow());
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
  cp(join(SRC, 'music', 'ludo-menu-highlife.mp3'), 'audio/music/whot-menu-highlife.mp3');
  cp(join(SRC, 'music', 'ludo-play-highlife.mp3'), 'audio/music/whot-play-highlife.mp3');
  for (const id of VOICE.map((v) => v.id))
    cp(join(SRC, 'voice', 'vo-ld-six.mp3'), `audio/voice/vo-${id}.mp3`);
  const lines = VOICE.map((v) => ({
    id: v.id,
    text: { pcm: v.pcm, en: v.en },
    files: { mp3: `voice/vo-${v.id}.mp3`, ogg: null },
    ...(v.review ? { _review: true } : {}),
  }));
  w(
    'audio/voice-manifest.json',
    JSON.stringify(
      {
        _readme:
          'Naija Whot voice placeholders (silent mp3, ogg null until human delivery). Shared lines (last-card, semi-last-card, pick-two, pick-three, hold-on, suspension, market-don-open, whot, oya, your-turn, you-don-win) live in packages/core/assets/audio/voice-manifest.json.',
        lines,
      },
      null,
      2,
    ) + '\n',
  );
};
export const VOICE = [
  {
    id: 'wh-shuffle',
    pcm: 'Make I shuffle well well.',
    en: 'Let me shuffle properly.',
    review: true,
  },
  { id: 'wh-call', pcm: 'Na this shape I need!', en: 'This is the shape I need!', review: true },
  {
    id: 'wh-caught',
    pcm: 'You no talk o! Pick two!',
    en: 'You did not call it! Pick two!',
    review: true,
  },
  {
    id: 'wh-defend',
    pcm: 'Ehen! Pick two for you too!',
    en: 'Ha! Pick two right back at you!',
    review: true,
  },
  {
    id: 'wh-market-empty',
    pcm: 'Market don finish. Shuffle again!',
    en: 'The market is empty. Reshuffling!',
    review: true,
  },
  {
    id: 'wh-safe',
    pcm: 'Hold am! Card still plenty.',
    en: 'Easy! Plenty of cards left.',
    review: true,
  },
  { id: 'wh-win', pcm: 'Hand don empty! You win!', en: 'Hand empty! You win!', review: true },
  {
    id: 'wh-close',
    pcm: 'Ah ah! Na one card remain!',
    en: 'Oh! Only one card left!',
    review: true,
  },
];
if (process.argv[1] === fileURLToPath(import.meta.url)) build();
