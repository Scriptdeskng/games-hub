#!/usr/bin/env node
// Generates the original SVG art for Sabi Quiz (asset-designer, in-repo).
// World: a Lagos TV quiz night in a buka bar: adire-indigo wall, aso-oke gold spotlights, ankara bunting,
// string lights, wine stage floor. No real show, brand or logo. Letters and digits are stroked paths (no <text>).
// Output: games/sabi-quiz/assets/{bg,ui,plates,timer,lifelines,streak,poll,duel,icons,fx,avatars,icon,thumb,audio}.
// ART_OUT overrides the output directory (used by the check script).
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.ART_OUT ?? join(ROOT, 'games', 'sabi-quiz', 'assets');
export const INK = '#1D1D20',
  CREAM = '#FFF3DA',
  CREAM2 = '#F5DEB0',
  WINE = '#4A1020',
  WINE2 = '#8C1D3D',
  GOLD = '#E8AE32',
  BRIGHT = '#FFC933',
  ORANGE = '#E4702A',
  INDIGO = '#122055',
  INDIGO2 = '#0A1233',
  ADIRE = '#1D3A9E',
  GOOD = '#0E6B3A',
  BAD = '#B3261E';
const w = (p, s) => {
  mkdirSync(dirname(join(OUT, p)), { recursive: true });
  writeFileSync(join(OUT, p), s);
};
const svg = (vb, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${extra}>${body}</svg>`;
const f1 = (n) => +n.toFixed(1);

// ---- the four answer keys: shape + letter + colour (never colour alone) ----
export const KEYS = {
  a: { shape: 'circle', hex: '#D91F26', name: 'circle' },
  b: { shape: 'triangle', hex: '#2548B8', name: 'triangle' },
  c: { shape: 'square', hex: '#E4702A', name: 'square' },
  d: { shape: 'star', hex: '#14703A', name: 'star' },
};
export const ORDER = Object.keys(KEYS);
const starPath = (cx, cy, R, r) => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2,
      rr = i % 2 ? r : R;
    p.push(`${f1(cx + rr * Math.cos(a))} ${f1(cy + rr * Math.sin(a))}`);
  }
  return `M${p.join('L')}z`;
};
// stroke glyphs on a 10 x 16 box
const GL = {
  A: 'M1.5 14.5 5 1.5l3.5 13M2.8 10h4.4',
  B: 'M2 1.5v13M2 1.5h3.5c3.2 0 3.2 5.5 0 5.5H2M5.8 7c3.6 0 3.6 7.5 0 7.5H2',
  C: 'M8.5 3.5C6 .5 1.5 2 1.5 8s4.5 8.5 7 5',
  D: 'M2 1.5v13h2.5c4.5 0 5-3 5-6.5s-.5-6.5-5-6.5z',
  2: 'M1.5 5C2 1 9 1 8.5 5.5 8.3 8 1.5 11 1.5 14.5H9',
  3: 'M1.5 2H8.5L5 7C9.5 6.5 9.5 14.5 4.8 14.5 3 14.5 2 13.8 1.5 12.5',
  5: 'M8.5 1.5H2.5L2 7C6 5.5 9.5 7.5 9 11 8.5 15 4 15.5 1.5 13',
  x: 'M2 5l6 6M8 5l-6 6',
  V: 'M1.5 1.5 5 14.5l3.5-13',
  S: 'M8.5 3C7 .5 1.5 1.5 2 4.5S8.5 8 8.5 11 3 16 1.5 13',
};
/** sign-painter letter: ink outline under a cream core (readable on any fill, also in greyscale) */
const glyph = (k, x, y, s, core = CREAM, edge = INK) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${GL[k]}" stroke="${edge}" stroke-width="4.6"/><path d="${GL[k]}" stroke="${core}" stroke-width="2.2"/></g>`;
const glyphs = (str, cx, y, s, core, edge, gap = 11) => {
  const total = str.length * gap - (gap - 10);
  return [...str]
    .map((c, i) => glyph(c, cx - (total * s) / 2 + i * gap * s, y, s, core, edge))
    .join('');
};
const shapeD = (shape, cx, cy, R) => {
  if (shape === 'circle') return `<circle cx="${cx}" cy="${cy}" r="${R}"/>`;
  if (shape === 'triangle')
    return `<path d="M${cx} ${f1(cy - R)} ${f1(cx + R * 1.1)} ${f1(cy + R * 0.9)} ${f1(cx - R * 1.1)} ${f1(cy + R * 0.9)}z"/>`;
  if (shape === 'square')
    return `<rect x="${f1(cx - R * 0.92)}" y="${f1(cy - R * 0.92)}" width="${f1(R * 1.84)}" height="${f1(R * 1.84)}" rx="${f1(R * 0.12)}"/>`;
  return `<path d="${starPath(cx, cy, R * 1.08, R * 0.52)}"/>`;
};
/** badge = coloured outlined shape with a sign-painted letter on it */
const badge = (k, cx, cy, R) => {
  const { shape, hex } = KEYS[k];
  const s = (R * 1.0) / 16,
    ly = cy - 8 * s + (shape === 'triangle' ? R * 0.18 : 0);
  return `<g fill="${hex}" stroke="${INK}" stroke-width="${f1(R * 0.1)}" stroke-linejoin="round">${shapeD(shape, cx, cy, R)}</g>${glyph(k.toUpperCase(), cx - 5 * s, ly, s)}`;
};

// ---- shared motifs ----
const asoStripe = (x, y, wd, h = 12) => {
  const cols = [GOLD, WINE2, ORANGE, CREAM, GOLD, WINE2];
  const bw = wd / cols.length;
  return `<g>${cols.map((c, i) => `<rect x="${f1(x + i * bw)}" y="${y}" width="${f1(bw + 0.4)}" height="${h}" fill="${c}"/>`).join('')}</g>`;
};
const diamonds = (x, y, n, s, fill, stroke) =>
  Array.from(
    { length: n },
    (_, i) =>
      `<path d="M${f1(x + i * s * 1.5)} ${y}l${s / 1.2} ${s / 1.2}-${s / 1.2} ${s / 1.2}-${s / 1.2}-${s / 1.2}z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
  ).join('');
const scallop = (cx, cy, R, r, n) => {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const rr = i % 2 ? r : R;
    pts.push(`${f1(cx + rr * Math.cos(a))} ${f1(cy + rr * Math.sin(a))}`);
  }
  return `M${pts.join('L')}z`;
};
/** adire-style ring and dot tile (original) */
const adireTile = (id, size, col, op) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g fill="none" stroke="${col}" stroke-width="2" opacity="${op}"><circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.3}"/><circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.16}"/><circle cx="0" cy="0" r="${size * 0.14}"/><circle cx="${size}" cy="0" r="${size * 0.14}"/><circle cx="0" cy="${size}" r="${size * 0.14}"/><circle cx="${size}" cy="${size}" r="${size * 0.14}"/></g><g fill="${col}" opacity="${op}"><circle cx="${size / 2}" cy="${size / 2}" r="2.4"/><circle cx="${size * 0.1}" cy="${size / 2}" r="1.6"/><circle cx="${size * 0.9}" cy="${size / 2}" r="1.6"/></g></pattern>`;

// ---------- 1. stage background (buka-bar quiz night) ----------
const stage = (W, H) => {
  const floorY = H * 0.78;
  const bunting = [];
  const cols = [GOLD, WINE2, ORANGE, '#2D8C7A', CREAM2];
  const n = Math.round(W / 36);
  for (let i = 0; i < n; i++) {
    const x0 = (W / n) * i + 2,
      x1 = (W / n) * (i + 1) - 2;
    const sag = Math.sin(((i + 0.5) / n) * Math.PI) * 14;
    bunting.push(
      `<path d="M${f1(x0)} ${f1(30 + sag * 0.4)}L${f1(x1)} ${f1(30 + sag * 0.4)}L${f1((x0 + x1) / 2)} ${f1(58 + sag * 0.4)}z" fill="${cols[i % 5]}" stroke="${INK}" stroke-width="1.2" opacity=".95"/><circle cx="${f1((x0 + x1) / 2)}" cy="${f1(38 + sag * 0.4)}" r="2.2" fill="${CREAM}"/>`,
    );
  }
  const bulbs = [];
  const nb = Math.round(W / 60);
  for (let i = 0; i < nb; i++) {
    const x = (W / nb) * (i + 0.5);
    const y = 86 + Math.sin(((i + 0.5) / nb) * Math.PI * 2) * 10 + 20;
    bulbs.push(
      `<path d="M${f1(x)} ${y - 26}V${y - 6}" stroke="${INK}" stroke-width="1.5"/><circle cx="${f1(x)}" cy="${y}" r="14" fill="url(#glow)"/><circle cx="${f1(x)}" cy="${y}" r="5.5" fill="${BRIGHT}" stroke="${INK}" stroke-width="1.2"/>`,
    );
  }
  const stools = [0.1, 0.9]
    .map((p) => {
      const x = W * p,
        y = H * 0.9;
      return `<g fill="${INK}" opacity=".55"><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="22" ry="7"/><path d="M${f1(x - 16)} ${f1(y)}l-4 34h6l4-32zM${f1(x + 16)} ${f1(y)}l4 34h-6l-4-32z"/></g>`;
    })
    .join('');
  return svg(
    `0 0 ${W} ${H}`,
    `<defs><linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INDIGO}"/><stop offset="1" stop-color="${INDIGO2}"/></linearGradient><linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${WINE}"/><stop offset="1" stop-color="#2C0813"/></linearGradient><linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BRIGHT}" stop-opacity=".34"/><stop offset="1" stop-color="${BRIGHT}" stop-opacity="0"/></linearGradient><radialGradient id="glow"><stop offset="0" stop-color="${BRIGHT}" stop-opacity=".55"/><stop offset="1" stop-color="${BRIGHT}" stop-opacity="0"/></radialGradient>${adireTile('ad', 72, CREAM, 0.1)}</defs>` +
      `<rect width="${W}" height="${H}" fill="url(#wall)"/><rect width="${W}" height="${H}" fill="url(#ad)"/>` +
      `<path d="M${W * 0.08} 0L${W * 0.42} ${floorY}H${W * 0.1}z" fill="url(#beam)"/><path d="M${W * 0.92} 0L${W * 0.58} ${floorY}H${W * 0.9}z" fill="url(#beam)"/>` +
      `${bunting.join('')}${bulbs.join('')}` +
      `<rect y="${f1(floorY)}" width="${W}" height="${f1(H - floorY)}" fill="url(#floor)"/>${asoStripe(0, f1(floorY), W, 10)}${asoStripe(0, f1(floorY + 10), W, 3)}` +
      `<g opacity=".5">${diamonds(4, f1(floorY + 22), Math.round(W / 30), 16, WINE2, GOLD)}</g>` +
      stools +
      `<circle cx="${W - 26}" cy="${f1(floorY - 34)}" r="9" fill="${ORANGE}" stroke="${CREAM}" stroke-width="2.5"/><circle cx="${W - 26}" cy="${f1(floorY - 34)}" r="15" fill="none" stroke="${GOLD}" stroke-width="2" stroke-dasharray="3 5"/>`,
  );
};

// ---------- 2. question card (text goes on top in the DOM) ----------
const questionCard = () =>
  svg(
    '0 0 340 190',
    `<rect x="4" y="8" width="332" height="178" rx="22" fill="#00000040"/><rect x="2" y="2" width="332" height="178" rx="22" fill="${CREAM}" stroke="${GOLD}" stroke-width="4"/><path d="M24 2h288a20 20 0 0 1 20 20v2H4v-2A20 20 0 0 1 24 2z" fill="${WINE}"/>${asoStripe(4, 16, 328, 10)}<g opacity=".9">${diamonds(24, 160, 20, 12, CREAM2, WINE2)}</g><g fill="${WINE2}" opacity=".55"><circle cx="18" cy="48" r="3"/><circle cx="18" cy="62" r="2"/><circle cx="318" cy="48" r="3"/><circle cx="318" cy="62" r="2"/></g><circle cx="30" cy="22" r="19" fill="${WINE}" stroke="${GOLD}" stroke-width="3"/><circle cx="30" cy="22" r="14" fill="none" stroke="${BRIGHT}" stroke-width="1.5" stroke-dasharray="2 4"/>`,
    // the card is a 100% x 100% CSS background: without "none" the art letterboxes on a wide, short card
    ' preserveAspectRatio="none"',
  );

// ---------- 3. answer plates ----------
const plate = (k) =>
  svg(
    '0 0 320 64',
    `<rect x="2" y="6" width="316" height="56" rx="18" fill="#00000050"/><rect x="2" y="2" width="316" height="56" rx="18" fill="${CREAM}" stroke="${INK}" stroke-width="2.4"/><path d="M20 55h280" stroke="${CREAM2}" stroke-width="5" stroke-linecap="round"/><rect x="66" y="9" width="2.4" height="42" rx="1.2" fill="${GOLD}"/><g fill="${KEYS[k].hex}" opacity=".9"><circle cx="304" cy="14" r="2.2"/><circle cx="304" cy="22" r="1.6"/></g>${badge(k, 34, 30, 22)}`,
  );
const check = (cx, cy, s, c = '#fff') =>
  `<path d="M${cx - 9 * s} ${cy}l${6 * s} ${6 * s} ${12 * s}-${13 * s}" fill="none" stroke="${c}" stroke-width="${f1(4 * s)}" stroke-linecap="round" stroke-linejoin="round"/>`;
const stateOverlay = (kind) => {
  const frame = (col, extra = '') =>
    `<rect x="2" y="2" width="316" height="56" rx="18" fill="none" stroke="${col}" stroke-width="5" ${extra}/>`;
  if (kind === 'correct')
    return svg(
      '0 0 320 64',
      `<rect x="2" y="2" width="316" height="56" rx="18" fill="${GOOD}" opacity=".16"/>${frame(GOOD)}<circle cx="290" cy="30" r="15" fill="${GOOD}" stroke="${CREAM}" stroke-width="2.5"/>${check(290, 28, 1)}`,
    );
  if (kind === 'wrong')
    return svg(
      '0 0 320 64',
      `<rect x="2" y="2" width="316" height="56" rx="18" fill="${BAD}" opacity=".14"/>${frame(BAD, 'stroke-dasharray="9 6"')}<path d="M290 14.5 306 45H274z" fill="${BAD}" stroke="${CREAM}" stroke-width="2.5" stroke-linejoin="round"/><path d="M290 24v10" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><circle cx="290" cy="40" r="2" fill="#fff"/>`,
    );
  if (kind === 'eliminated') {
    const hatch = Array.from(
      { length: 18 },
      (_, i) => `<path d="M${i * 20 - 20} 62l40-62" stroke="${INK}" stroke-width="2"/>`,
    ).join('');
    return svg(
      '0 0 320 64',
      `<defs><clipPath id="c"><rect x="2" y="2" width="316" height="56" rx="18"/></clipPath></defs><g clip-path="url(#c)"><rect width="320" height="64" fill="${INK}" opacity=".5"/><g opacity=".35">${hatch}</g></g><path d="M80 30h210" stroke="${CREAM}" stroke-width="4" stroke-linecap="round"/><circle cx="290" cy="30" r="14" fill="${INK}" stroke="${CREAM}" stroke-width="2.5"/><path d="M283 23l14 14M297 23l-14 14" stroke="${CREAM}" stroke-width="3.4" stroke-linecap="round"/>`,
    );
  }
  return svg(
    '0 0 320 64',
    `${frame(BRIGHT)}<rect x="2" y="2" width="316" height="56" rx="18" fill="none" stroke="${INK}" stroke-width="1.5" transform="translate(0 0)" opacity=".5"/><path d="M276 18l22 12-22 12z" fill="${BRIGHT}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`,
  );
};

// ---------- 4. timer ring ----------
const timerRing = () => {
  const ticks = Array.from({ length: 15 }, (_, i) => {
    const a = (i / 15) * Math.PI * 2 - Math.PI / 2;
    const r0 = 56,
      r1 = i % 5 === 0 ? 62 : 59;
    return `<path d="M${f1(60 + r0 * Math.cos(a))} ${f1(60 + r0 * Math.sin(a))}L${f1(60 + r1 * Math.cos(a))} ${f1(60 + r1 * Math.sin(a))}" stroke="${CREAM}" stroke-width="${i % 5 === 0 ? 3 : 2}" stroke-linecap="round" opacity=".85"/>`;
  }).join('');
  return svg(
    '-4 -4 128 128',
    `<circle cx="60" cy="60" r="50" fill="${WINE}" stroke="${GOLD}" stroke-width="3"/><circle cx="60" cy="60" r="43" fill="${INDIGO}" opacity=".6"/><circle cx="60" cy="60" r="50" fill="none" stroke="${CREAM}" stroke-opacity=".22" stroke-width="9"/>${ticks}`,
  );
};
const timerArc = (low) => {
  const col = low ? ORANGE : BRIGHT;
  const beads = low
    ? Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2 + 0.3;
        return `<circle cx="${f1(60 + 38 * Math.cos(a))}" cy="${f1(60 + 38 * Math.sin(a))}" r="2.6" fill="${CREAM}" stroke="${INK}" stroke-width="1"/>`;
      }).join('')
    : '';
  const warn = low
    ? `<path d="M60 -3 70 12H50z" fill="${ORANGE}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M60 3v4" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`
    : '';
  return svg(
    '-4 -4 128 128',
    `<circle cx="60" cy="60" r="50" fill="none" stroke="${INK}" stroke-width="12" opacity=".35" stroke-linecap="round" pathLength="100" stroke-dasharray="100 0" transform="rotate(-90 60 60)"/><circle class="sq-arc" cx="60" cy="60" r="50" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round" pathLength="100" stroke-dasharray="100 100" transform="rotate(-90 60 60)"/>${beads}${warn}`,
  );
};

// ---------- 5. lifelines (64x64) ----------
const llBase = (inner) =>
  svg(
    '0 0 64 64',
    `<circle cx="32" cy="34" r="29" fill="#00000050"/><circle cx="32" cy="31" r="29" fill="${CREAM}" stroke="${GOLD}" stroke-width="3.5"/><circle cx="32" cy="31" r="24" fill="none" stroke="${WINE2}" stroke-width="1.2" stroke-dasharray="2 4"/>${inner}`,
  );
const ll5050 = () =>
  llBase(
    `<clipPath id="l"><rect x="8" y="12" width="24" height="40"/></clipPath><circle cx="32" cy="31" r="15" fill="${ADIRE}" stroke="${INK}" stroke-width="2.4"/><g clip-path="url(#l)"><circle cx="32" cy="31" r="15" fill="${CREAM}"/></g><path d="M32 16v30" stroke="${INK}" stroke-width="2.4"/><circle cx="32" cy="31" r="15" fill="none" stroke="${INK}" stroke-width="2.4"/><path d="M20 24l8 14M28 24l-8 14" stroke="${BAD}" stroke-width="2.6" stroke-linecap="round" transform="translate(-1 -1)"/>`,
  );
const llSkip = () =>
  llBase(
    `<path d="M16 19l15 12-15 12zM32 19l15 12-15 12z" fill="${ORANGE}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M50 18v26" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  );
const llPadi = () =>
  llBase(
    `<g stroke="${INK}" stroke-width="2.2"><path d="M12 47c0-8 6-11 12-11s12 3 12 11z" fill="${WINE2}"/><circle cx="24" cy="29" r="6.5" fill="#7B4A2E"/><path d="M30 47c0-7 5-10 10-10s10 3 10 10z" fill="${ADIRE}"/><circle cx="40" cy="30.5" r="5.5" fill="#A8744C"/></g><rect x="22" y="9" width="3.6" height="9" rx="1" fill="${GOLD}" stroke="${INK}" stroke-width="1.2"/><rect x="28" y="6" width="3.6" height="12" rx="1" fill="${GOLD}" stroke="${INK}" stroke-width="1.2"/><rect x="34" y="11" width="3.6" height="7" rx="1" fill="${GOLD}" stroke="${INK}" stroke-width="1.2"/>`,
  );
const llUsed = () =>
  svg(
    '0 0 64 64',
    `<circle cx="32" cy="31" r="29" fill="${INK}" opacity=".6"/><circle cx="32" cy="31" r="22" fill="none" stroke="${CREAM}" stroke-width="4"/><path d="M16 47 48 15" stroke="${CREAM}" stroke-width="4.4" stroke-linecap="round"/>`,
  );

// ---------- 6. streak ----------
const flame = () =>
  svg(
    '0 0 64 80',
    `<path d="M32 3c3 14 20 22 20 44a20 20 0 0 1-40 0c0-9 4-14 8-19 1 5 3 8 6 9-1-14 2-24 6-34z" fill="${ORANGE}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M32 30c2 9 12 14 12 26a12 12 0 0 1-24 0c0-6 3-9 6-12 0 3 1 5 3 6-1-8 1-14 3-20z" fill="${BRIGHT}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M32 54c1 5 6 7 6 12a6 6 0 0 1-12 0c0-3 2-5 4-6z" fill="${CREAM}"/>`,
  );
const streakBadge = (n) => {
  const pts = { 2: 8, 3: 10, 5: 12 }[n];
  return svg(
    '0 0 96 96',
    `<path d="${scallop(48, 49, 44, 37, pts)}" fill="#00000050" transform="translate(0 3)"/><path d="${scallop(48, 48, 44, 37, pts)}" fill="${GOLD}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="48" cy="48" r="30" fill="${WINE}" stroke="${CREAM}" stroke-width="2.4"/>${glyphs('x' + n, 48, 33, 1.8, CREAM, INK, 11)}${n === 5 ? `<path d="M48 4c2 6 8 8 8 14a8 8 0 0 1-16 0c0-3 1-5 3-6 0 2 1 3 2 3-1-4 1-8 3-11z" fill="${ORANGE}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` : ''}`,
  );
};

// ---------- 7. padi poll ----------
const pollPanel = () => {
  const bars = ORDER.map((k, i) => {
    const x = 18 + i * 68;
    return `<rect x="${x}" y="40" width="48" height="130" rx="10" fill="${INK}" opacity=".35"/><rect x="${x}" y="40" width="48" height="130" rx="10" fill="none" stroke="${CREAM}" stroke-opacity=".5" stroke-width="2"/>${badge(k, x + 24, 192, 14)}`;
  }).join('');
  const heads = [96, 150, 204]
    .map(
      (x, i) =>
        `<g stroke="${INK}" stroke-width="1.8"><path d="M${x - 10} 28c0-6 5-8 10-8s10 2 10 8z" fill="${[WINE2, ADIRE, '#2D8C7A'][i]}"/><circle cx="${x}" cy="12" r="6" fill="${['#7B4A2E', '#5E3822', '#A8744C'][i]}"/></g>`,
    )
    .join('');
  return svg(
    '0 0 300 214',
    `<rect x="2" y="2" width="296" height="210" rx="20" fill="${WINE}" stroke="${GOLD}" stroke-width="3.5"/>${asoStripe(8, 202, 284, 6)}${heads}${bars}`,
  );
};
const barFill = () =>
  svg(
    '0 0 48 130',
    `<defs><clipPath id="r"><rect width="48" height="130" rx="10"/></clipPath></defs><g clip-path="url(#r)">${[
      GOLD,
      WINE2,
      ORANGE,
      CREAM,
      GOLD,
      WINE2,
      ORANGE,
      CREAM,
    ]
      .map((c, i) => `<rect x="${i * 6}" width="6.3" height="130" fill="${c}"/>`)
      .join(
        '',
      )}</g><rect x=".75" y=".75" width="46.5" height="128.5" rx="9.5" fill="none" stroke="${INK}" stroke-width="1.5"/>`,
    ' preserveAspectRatio="none"',
  );

// ---------- 8. duel ----------
const podium = () => {
  const block = (x, col, label) =>
    `<ellipse cx="${x + 70}" cy="26" rx="46" ry="46" fill="url(#sp)"/><circle cx="${x + 70}" cy="42" r="37" fill="${INK}" opacity=".3"/><circle cx="${x + 70}" cy="38" r="35" fill="none" stroke="${GOLD}" stroke-width="4"/><circle cx="${x + 70}" cy="38" r="30" fill="${CREAM}" opacity=".12"/>` +
    `<path d="M${x} 92h140l8 14H${x - 8}z" fill="${col}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><rect x="${x - 8}" y="106" width="156" height="58" fill="${WINE}" stroke="${INK}" stroke-width="2.4"/>${asoStripe(x - 6, 108, 152, 8)}<rect x="${x + 22}" y="124" width="96" height="30" rx="8" fill="${CREAM}" stroke="${GOLD}" stroke-width="2.4"/>${label}`;
  const you = `<path d="M${14} 140l8-8 8 8-8 8z" fill="${ORANGE}" stroke="${INK}" stroke-width="1.5"/>`;
  const cpu = `<path d="M${324 - 14 + 0} 140l8-8 8 8-8 8z" fill="${ADIRE}" stroke="${INK}" stroke-width="1.5"/>`;
  return svg(
    '0 0 340 170',
    `<defs><radialGradient id="sp"><stop offset="0" stop-color="${BRIGHT}" stop-opacity=".4"/><stop offset="1" stop-color="${BRIGHT}" stop-opacity="0"/></radialGradient></defs>${block(14, ORANGE, '')}${block(186, ADIRE, '')}${you}${cpu}`,
  );
};
const buzzer = () =>
  svg(
    '0 0 96 96',
    `<ellipse cx="48" cy="82" rx="42" ry="10" fill="#00000055"/><path d="M8 62h80v14a40 12 0 0 1-80 0z" fill="#7A4220" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M12 68h72M12 74h72" stroke="#A56532" stroke-width="2"/><ellipse cx="48" cy="62" rx="40" ry="11" fill="${GOLD}" stroke="${INK}" stroke-width="2.6"/><path d="M18 62C18 30 78 30 78 62z" fill="${ORANGE}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M28 54c2-10 12-14 20-14" fill="none" stroke="${CREAM}" stroke-width="4" stroke-linecap="round" opacity=".7"/>`,
  );
const vsMedal = () =>
  svg(
    '0 0 72 72',
    `<path d="${scallop(36, 37, 33, 28, 8)}" fill="#00000050"/><path d="${scallop(36, 36, 33, 28, 8)}" fill="${GOLD}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><circle cx="36" cy="36" r="22" fill="${WINE}" stroke="${CREAM}" stroke-width="2"/>${glyphs('VS', 36, 24, 1.5, CREAM, INK, 12)}`,
  );
const leadMarker = () =>
  svg(
    '0 0 40 40',
    `<path d="${starPath(20, 20, 17, 8)}" fill="${BRIGHT}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><circle cx="20" cy="20" r="4" fill="${WINE}"/>`,
  );

// ---------- 9. category sprite ----------
const CATS = {
  nollywood: `<rect x="6" y="19" width="36" height="22" rx="3"/><path d="M6 19l3-9 32-1 1 10M16 10l-4 10M26 10l-4 10M36 9l-4 11"/><path d="M21 25v10l9-5z" fill="currentColor"/>`,
  afrobeats: `<path d="M10 8h28M10 40h28M12 8c2 8 9 11 9 16s-7 8-9 16M36 8c-2 8-9 11-9 16s7 8 9 16"/><path d="M14 16l20 4M14 32l20-4M16 24h16" stroke-width="2"/>`,
  football: `<circle cx="24" cy="24" r="17"/><path d="M24 15l8 6-3 9H19l-3-9z" fill="currentColor"/><path d="M24 15V7M32 21l8-3M29 30l5 7M19 30l-5 7M16 21l-8-3" stroke-width="2.4"/>`,
  history: `<path d="M12 8h26a5 5 0 0 1 0 10H18v18a5 5 0 0 1-10 0V13a5 5 0 0 1 4-5z"/><path d="M18 18v18a5 5 0 0 0 10 0V32h14v4a5 5 0 0 1-10 0" stroke-width="2.6"/><path d="M24 14h8M24 22h6M24 27h6" stroke-width="2.4"/>`,
  food: `<path d="M5 24h38a19 17 0 0 1-38 0z" fill="currentColor" fill-opacity=".18"/><path d="M5 24h38M16 40h16"/><path d="M15 17c-3-3 3-5 0-9M24 17c-3-3 3-5 0-9M33 17c-3-3 3-5 0-9" stroke-width="2.4"/>`,
  general: `<path d="M24 5a13 13 0 0 1 7 24v5H17v-5A13 13 0 0 1 24 5z"/><path d="M18 38h12M20 43h8M24 14v10M20 18l4 4 4-4" stroke-width="2.6"/>`,
  pidgin: `<path d="M5 8h24a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H16l-7 6v-6H5a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" transform="translate(2 0)"/><path d="M22 28h16l6 6v-6h2a2 2 0 0 0 0-2v-8" stroke-width="2.4"/><circle cx="12" cy="17" r="1.8" fill="currentColor"/><circle cx="19" cy="17" r="1.8" fill="currentColor"/><circle cx="26" cy="17" r="1.8" fill="currentColor"/>`,
  geography: `<path d="M24 5a11 11 0 0 1 11 11c0 9-11 22-11 22S13 25 13 16A11 11 0 0 1 24 5z"/><circle cx="24" cy="16" r="4.2" fill="currentColor"/><path d="M8 40c5-3 11-3 16-1s11 2 16-1" stroke-width="2.6"/>`,
  daily: `<rect x="6" y="9" width="36" height="32" rx="5"/><path d="M6 19h36M15 5v8M33 5v8" /><path d="${starPath(24, 31, 8, 3.6)}" fill="currentColor"/>`,
};
export const CAT_IDS = Object.keys(CATS);
const catSprite = () =>
  svg(
    '0 0 48 48',
    CAT_IDS.map(
      (id) =>
        `<symbol id="cat-${id}" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${CATS[id]}</g></symbol>`,
    ).join(''),
    ' width="0" height="0" style="position:absolute" aria-hidden="true"',
  );

// ---------- 10. fx ----------
const fxCorrect = () => {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return `<path d="M${f1(100 + 36 * Math.cos(a))} ${f1(100 + 36 * Math.sin(a))}L${f1(100 + 92 * Math.cos(a))} ${f1(100 + 92 * Math.sin(a))}" stroke="${i % 2 ? ORANGE : BRIGHT}" stroke-width="${i % 2 ? 6 : 9}" stroke-linecap="round"/>`;
  }).join('');
  const ribbons = [30, 150, 210, 330]
    .map((d) => {
      const a = (d * Math.PI) / 180;
      return `<path d="M${f1(100 + 52 * Math.cos(a))} ${f1(100 + 52 * Math.sin(a))}q${f1(14 * Math.cos(a + 1.2))} ${f1(14 * Math.sin(a + 1.2))} ${f1(30 * Math.cos(a))} ${f1(30 * Math.sin(a))}" fill="none" stroke="${i2(d)}" stroke-width="5" stroke-linecap="round"/>`;
    })
    .join('');
  return svg(
    '0 0 200 200',
    `${rays}${ribbons}<circle cx="100" cy="100" r="30" fill="${GOOD}" stroke="${CREAM}" stroke-width="4"/>${check(100, 98, 1.5)}`,
  );
};
const i2 = (d) => [WINE2, '#2D8C7A', ORANGE, CREAM][((d / 30) % 4) | 0] ?? GOLD;
const fxWrong = () =>
  svg(
    '0 0 200 200',
    `<g fill="none" stroke="${INDIGO}" stroke-linecap="round"><circle cx="100" cy="100" r="34" stroke-width="7" stroke="${CREAM}" opacity=".8"/><circle cx="100" cy="100" r="58" stroke-width="5" stroke-dasharray="12 10" stroke="${CREAM}" opacity=".6"/><circle cx="100" cy="100" r="82" stroke-width="4" stroke-dasharray="6 12" stroke="${CREAM}" opacity=".4"/></g><path d="M100 78 124 120H76z" fill="${BAD}" stroke="${CREAM}" stroke-width="4" stroke-linejoin="round"/><path d="M100 92v14" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="114" r="3" fill="#fff"/>`,
  );
const fxStreak = () => {
  const fl = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * 360;
    return `<g transform="rotate(${a} 100 100) translate(100 14)"><path d="M0 -4c3 10 12 14 12 28a12 12 0 0 1-24 0c0-6 3-9 5-12 1 3 2 5 4 5-1-9 1-15 3-21z" fill="${i % 2 ? BRIGHT : ORANGE}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/></g>`;
  }).join('');
  return svg(
    '0 0 200 200',
    `${fl}<circle cx="100" cy="100" r="40" fill="${WINE}" stroke="${GOLD}" stroke-width="5"/><path d="M100 70c3 12 17 18 17 36a17 17 0 0 1-34 0c0-8 3-12 6-16 1 4 3 7 5 8-1-12 2-20 6-28z" fill="${ORANGE}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`,
  );
};
const fxLifeline = () =>
  svg(
    '0 0 160 160',
    `<defs><radialGradient id="g"><stop offset="0" stop-color="${BRIGHT}" stop-opacity=".8"/><stop offset="1" stop-color="${BRIGHT}" stop-opacity="0"/></radialGradient></defs><circle cx="80" cy="80" r="76" fill="url(#g)"/>${[
      [40, 40],
      [120, 36],
      [128, 116],
      [34, 120],
    ]
      .map(
        ([x, y]) =>
          `<path d="${starPath(x, y, 12, 4.5)}" fill="${CREAM}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
      )
      .join('')}`,
  );
const fxTimeUp = () =>
  svg(
    '0 0 160 160',
    `<g stroke="${ORANGE}" stroke-width="6" stroke-linecap="round"><path d="M22 70l-12-8M138 70l12-8M30 40l-9-10M130 40l9-10"/></g><path d="M58 26h44l10 58H48z" fill="${GOLD}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M48 84h64l12 40H36z" fill="${BRIGHT}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M58 52h44M52 100h56" stroke="${WINE}" stroke-width="3" opacity=".6"/><path d="M64 128c0 8 7 12 16 12s16-4 16-12" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  );

// ---------- 11. menu mark and avatars ----------
const menuMark = () =>
  svg(
    '0 0 128 128',
    `<path d="${scallop(64, 66, 60, 50, 12)}" fill="#00000050"/><path d="${scallop(64, 64, 60, 50, 12)}" fill="${GOLD}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="64" cy="64" r="40" fill="${WINE}" stroke="${CREAM}" stroke-width="3"/><circle cx="64" cy="64" r="34" fill="none" stroke="${BRIGHT}" stroke-width="2" stroke-dasharray="3 6"/><path d="M48 52c0-12 10-18 18-18 10 0 16 7 16 15 0 12-14 12-16 24" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M48 52c0-12 10-18 18-18 10 0 16 7 16 15 0 12-14 12-16 24" fill="none" stroke="${CREAM}" stroke-width="7" stroke-linecap="round"/><circle cx="66" cy="94" r="7" fill="${CREAM}" stroke="${INK}" stroke-width="3"/>`,
  );
/** bust avatar: shapes only, 128x128, square (CSS rounds it). */
const bust = ({ bg, skin, shirt, hair, extra = '', brow = '#1a0f0a', title }) =>
  svg(
    '0 0 128 128',
    `<title>${title}</title><path fill="${bg}" d="M0 0h128v128H0z"/><circle cx="64" cy="62" r="50" fill="#fff" opacity=".2"/><path fill="${shirt}" d="M8 128c0-28 26-38 56-38s56 10 56 38Z"/><rect width="20" height="24" x="54" y="74" fill="${skin}" rx="7"/><path fill="#000" opacity=".15" d="M54 82h20v6q-10 6-20 0z"/>${hair.back ?? ''}<ellipse cx="64" cy="58" rx="24" ry="28" fill="${skin}"/>${hair.front ?? ''}<ellipse cx="54" cy="58" rx="4.2" ry="3.8" fill="#fff"/><circle cx="54" cy="58.4" r="2.5" fill="#1a0f0a"/><circle cx="55" cy="57.4" r=".9" fill="#fff"/><ellipse cx="74" cy="58" rx="4.2" ry="3.8" fill="#fff"/><circle cx="74" cy="58.4" r="2.5" fill="#1a0f0a"/><circle cx="75" cy="57.4" r=".9" fill="#fff"/><path d="M48 49q6-5 12-1m8 0q6-4 12 1" fill="none" stroke="${brow}" stroke-width="3" stroke-linecap="round"/><path d="M58 72q6 6 12 0" fill="none" stroke="#7a2a1a" stroke-width="3" stroke-linecap="round"/>${extra}`,
    ' width="128" height="128"',
  );
// Uncle Etim: quiz host, Efik (Calabar). Ankara bow tie, hand microphone, warm grin, short hair.
const etim = () =>
  bust({
    title: 'Uncle Etim',
    bg: '#E4702A',
    skin: '#5A3520',
    shirt: '#FFF3DA',
    hair: {
      front: `<path d="M41 52c0-18 10-26 23-26s23 8 23 26c-6-8-14-12-23-12s-17 4-23 12z" fill="#1a0f0a"/>`,
    },
    extra: `<path d="M64 92 52 100l12 6 12-6z" fill="${WINE2}" stroke="#1D1D20" stroke-width="2"/><path d="M52 94 40 88l2 18zM76 94l12-6-2 18z" fill="${GOLD}" stroke="#1D1D20" stroke-width="2" stroke-linejoin="round"/><circle cx="64" cy="98" r="4" fill="${BRIGHT}" stroke="#1D1D20" stroke-width="1.6"/><rect x="96" y="82" width="9" height="24" rx="4" transform="rotate(18 100 94)" fill="#2C2C31" stroke="#1D1D20" stroke-width="1.5"/><circle cx="106" cy="80" r="8" fill="#BDBDC4" stroke="#1D1D20" stroke-width="2"/><path d="M56 68q8 10 16 0" fill="#fff" stroke="#7a2a1a" stroke-width="2.4"/>`,
  });
// Dung: duel contestant, Berom (Jos, Plateau). Calm, observant: camera strap, round cap-free low cut, short beard.
const dung = () =>
  bust({
    title: 'Dung',
    bg: '#2D8C7A',
    skin: '#6E4128',
    shirt: '#2548B8',
    hair: {
      front: `<path d="M41 54c0-16 9-23 23-23s23 7 23 23c-7-6-14-9-23-9s-16 3-23 9z" fill="#1a0f0a"/>`,
    },
    extra: `<path d="M50 74q14 16 28 0v6q-14 14-28 0z" fill="#1a0f0a" opacity=".85"/><path d="M30 112l22-20M98 112L76 92" stroke="#1D1D20" stroke-width="5" stroke-linecap="round"/><rect x="46" y="104" width="36" height="22" rx="5" fill="#2C2C31" stroke="#1D1D20" stroke-width="2.4"/><circle cx="64" cy="115" r="7" fill="#9AA3B8" stroke="#1D1D20" stroke-width="2.4"/><circle cx="64" cy="115" r="3" fill="#1D1D20"/>`,
  });

// ---------- 12. thumbs (placeholder hero art, no text) ----------
const thumb = (W, H) => {
  const s = Math.min(W, H) / 512,
    cx = W / 2;
  const plates = ORDER.map((k, i) => {
    const px = cx - 130 * s + (i % 2) * 140 * s;
    const py = H * 0.62 + Math.floor(i / 2) * 58 * s;
    return `<g transform="translate(${f1(px)} ${f1(py)}) scale(${f1(0.84 * s)})">${plate(k).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`;
  }).join('');
  const inner = stage(W, H).replace(/^<svg[^>]*>|<\/svg>$/g, '');
  return svg(
    `0 0 ${W} ${H}`,
    `${inner}<g transform="translate(${f1(cx - 60 * s)} ${f1(H * 0.12)}) scale(${f1(0.95 * s)})">${menuMark().replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g><g transform="translate(${f1(cx - 130 * s)} ${f1(H * 0.38)}) scale(${f1(0.78 * s)})">${questionCard().replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>${plates}`,
  );
};

// ---------- run ----------
export const build = () => {
  w('bg/stage-portrait.svg', stage(360, 640));
  w('bg/stage-landscape.svg', stage(640, 360));
  w('ui/question-card.svg', questionCard());
  ORDER.forEach((k) => w(`plates/plate-${k}.svg`, plate(k)));
  ['correct', 'wrong', 'eliminated', 'picked'].forEach((s) =>
    w(`plates/state-${s}.svg`, stateOverlay(s)),
  );
  w('timer/ring.svg', timerRing());
  w('timer/arc.svg', timerArc(false));
  w('timer/arc-low.svg', timerArc(true));
  w('lifelines/ll-5050.svg', ll5050());
  w('lifelines/ll-skip.svg', llSkip());
  w('lifelines/ll-padi.svg', llPadi());
  w('lifelines/ll-used.svg', llUsed());
  w('streak/flame.svg', flame());
  [2, 3, 5].forEach((n) => w(`streak/badge-${n}.svg`, streakBadge(n)));
  w('poll/panel.svg', pollPanel());
  w('poll/bar-fill.svg', barFill());
  w('duel/podium.svg', podium());
  w('duel/buzzer.svg', buzzer());
  w('duel/vs.svg', vsMedal());
  w('duel/lead-marker.svg', leadMarker());
  w('icons/categories.svg', catSprite());
  w('fx/correct-burst.svg', fxCorrect());
  w('fx/wrong-ripple.svg', fxWrong());
  w('fx/streak-burst.svg', fxStreak());
  w('fx/lifeline-glow.svg', fxLifeline());
  w('fx/time-up.svg', fxTimeUp());
  w('icon/menu-mark.svg', menuMark());
  w('avatars/etim.svg', etim());
  w('avatars/dung.svg', dung());
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
  for (const m of ['quiz-menu-highlife', 'quiz-play-highlife', 'quiz-tense-highlife'])
    cp(join(SRC, 'music', 'ludo-menu-highlife.mp3'), `audio/music/${m}.mp3`);
  for (const v of VOICE) cp(join(SRC, 'voice', 'vo-ld-six.mp3'), `audio/voice/vo-${v.id}.mp3`);
  const lines = VOICE.map((v) => ({
    id: v.id,
    speaker: v.who,
    text: { pcm: v.pcm, en: v.en },
    files: { mp3: `voice/vo-${v.id}.mp3`, ogg: null },
    ...(v.review ? { _review: true } : {}),
  }));
  w(
    'audio/voice-manifest.json',
    JSON.stringify(
      {
        _readme:
          'Sabi Quiz voice placeholders (silent mp3, ogg null until human delivery). Host = Uncle Etim. Shared lines (oya, madalla, e-ku-ise, you-don-win, e-don-do) live in packages/core/assets/audio/voice-manifest.json.',
        lines,
      },
      null,
      2,
    ) + '\n',
  );
};
export const VOICE = [
  {
    id: 'sq-start',
    who: 'etim',
    pcm: 'Oya, make we see who sabi!',
    en: "Come on, let's see who knows!",
    review: true,
  },
  {
    id: 'sq-correct',
    who: 'etim',
    pcm: 'Correct! You sabi o!',
    en: 'Correct! You really know it!',
    review: true,
  },
  {
    id: 'sq-wrong',
    who: 'etim',
    pcm: 'Ah ah, nearly! Na so e dey go.',
    en: "So close! That's how it goes.",
    review: true,
  },
  {
    id: 'sq-streak',
    who: 'etim',
    pcm: 'Fire dey burn! Na three in a row!',
    en: "You're on fire! Three in a row!",
    review: true,
  },
  {
    id: 'sq-padi',
    who: 'etim',
    pcm: 'Make we hear wetin your padi dem talk.',
    en: 'Let us hear what your friends say.',
    review: true,
  },
  {
    id: 'sq-last5',
    who: 'etim',
    pcm: 'Time dey go o! Five seconds!',
    en: 'Time is running! Five seconds!',
    review: true,
  },
  {
    id: 'sq-daily',
    who: 'etim',
    pcm: 'Today questions don land!',
    en: "Today's questions have arrived!",
    review: true,
  },
  {
    id: 'sq-duel',
    who: 'etim',
    pcm: 'Quiz Duel! Who go press first?',
    en: 'Quiz Duel! Who will buzz first?',
    review: true,
  },
  {
    id: 'sq-win',
    who: 'etim',
    pcm: 'Sabi person! You don win!',
    en: 'A true know-it-all! You win!',
    review: true,
  },
  {
    id: 'sq-lose',
    who: 'etim',
    pcm: 'No vex. Next round go better.',
    en: 'No worries. The next round will be better.',
    review: true,
  },
];
if (process.argv[1] === fileURLToPath(import.meta.url)) build();
