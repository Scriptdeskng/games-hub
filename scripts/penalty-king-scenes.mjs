// Penalty King scenes: perspective pitch + backdrop for two venues (community pitch at dusk, floodlit stadium) in portrait and
// landscape. The camera sits behind the ball looking at the goal; all lines converge on a vanishing point on the horizon.
// No text, no brand, no real stadium, no real club colours. Crowd is generic (dots).
import {
  INK,
  CREAM,
  GOLD,
  GOLD2,
  PLANTAIN,
  INDIGO,
  INDIGO2,
  NIGHT,
  SKY,
  TERRA,
  TERRA2,
  TERRA3,
  OCHRE,
  ORANGE,
  WINE,
  f1,
  svg,
  rng,
  dots,
  scallop,
} from './penalty-king-common.mjs';

/** Scene geometry in scene units. scale(y) = (y - horizon) / (goalLine - horizon). Exported to assets/geometry.json. */
export const GEO = {
  portrait: {
    W: 360,
    H: 640,
    horizon: 230,
    goalLine: 316,
    goalW: 180,
    spot: [180, 510],
    boxFront: 369,
    areaFront: 570,
    arc: [170, 100],
    boxHalf: 0.62,
  },
  landscape: {
    W: 640,
    H: 360,
    horizon: 108,
    goalLine: 180,
    goalW: 200,
    spot: [320, 292],
    boxFront: 225,
    areaFront: 338,
    arc: null,
    boxHalf: 0.62,
  },
};
const gh = (g) => g.goalW / 3;

const tuft = (x, y, s) =>
  `M${f1(x)} ${f1(y)}l${f1(-s)} ${f1(-s * 1.4)}M${f1(x)} ${f1(y)}v${f1(-s * 1.8)}M${f1(x)} ${f1(y)}l${f1(s)} ${f1(-s * 1.4)}`;

/** Pitch lines: goal line, six-yard box, penalty-area front line, arc and spot (stylised: boxes narrower than real so they read at 360 px). */
const pitchLines = (g, col) => {
  const {
    W,
    horizon: hz,
    goalLine: gl,
    goalW,
    spot,
    boxFront: bf,
    areaFront: af,
    arc,
    boxHalf,
  } = g;
  const c = W / 2,
    k = (y) => (y - hz) / (gl - hz),
    hw = goalW * boxHalf,
    hf = hw * k(bf);
  let o = `<g fill="none" stroke="${col}" stroke-linecap="round" stroke-linejoin="round">`;
  o += `<path d="M-10 ${gl}H${W + 10}" stroke-width="3"/>`;
  o += `<path d="M${f1(c - hw)} ${gl}L${f1(c - hf)} ${bf}H${f1(c + hf)}L${f1(c + hw)} ${gl}" stroke-width="3.4"/>`;
  o += `<path d="M-10 ${af}H${W + 10}" stroke-width="${f1(3.4 * k(af) * 0.5 + 1.6)}"/>`;
  if (arc) {
    const dy = af - spot[1],
      dx = arc[0] * Math.sqrt(1 - (dy / arc[1]) ** 2);
    o += `<path d="M${f1(c - dx)} ${af}A${arc[0]} ${arc[1]} 0 0 0 ${f1(c + dx)} ${af}" stroke-width="5"/>`;
  }
  o += `</g>`;
  const s = k(spot[1]);
  o += `<ellipse cx="${spot[0]}" cy="${spot[1]}" rx="${f1(2.4 * s)}" ry="${f1(0.9 * s)}" fill="${col}"/>`;
  return o;
};

const ground = (g, venue) => {
  const { W, H, horizon: hz, goalLine: gl } = g;
  const r = rng(venue === 'community' ? 11 : 23);
  let o = '';
  if (venue === 'stadium') {
    o += `<rect y="${hz}" width="${W}" height="${H - hz}" fill="#1B6E3A"/>`;
    // mow stripes: boundaries at depth steps of 3.66 m, perspective scale s = D / (D - d), D = 18 m
    const ys = [];
    for (let i = -6; i <= 6; i++) {
      const s = 18 / (18 - i * 2.2);
      if (s > 0 && s < 9) ys.push(hz + (gl - hz) * s);
    }
    ys.sort((a, b) => a - b);
    ys.forEach((y, i) => {
      if (i % 2 === 0)
        o += `<rect y="${f1(Math.max(y, hz))}" width="${W}" height="${f1((ys[i + 1] ?? H + 50) - y)}" fill="#23863F"/>`;
    });
    o += `<rect y="${hz}" width="${W}" height="${f1((gl - hz) * 0.5)}" fill="#000" opacity=".22"/>`;
  } else {
    o += `<defs><linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8C5230"/><stop offset="1" stop-color="#BD7A47"/></linearGradient><radialGradient id="gv" cx=".5" cy=".62" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#2A1409" stop-opacity=".5"/></radialGradient></defs>`;
    o += `<rect y="${hz}" width="${W}" height="${H - hz}" fill="url(#gd)"/>`;
    // dust patches (lighter), a worn spot ring (darker) and sparse grass tufts
    for (let i = 0; i < 9; i++) {
      const y = hz + 20 + r() * (H - hz - 30);
      o += `<ellipse cx="${f1(r() * W)}" cy="${f1(y)}" rx="${f1(30 + r() * 60)}" ry="${f1(5 + ((y - hz) / (H - hz)) * 14)}" fill="#D49A66" opacity=".32"/>`;
    }
    const tp = [];
    for (let i = 0; i < 46; i++) tp.push([r() * W, hz + 8 + r() * (H - hz - 14)]);
    o += `<path d="${tp.map(([x, y]) => tuft(x, y, 1.8 + ((y - hz) / (H - hz)) * 3.4)).join('')}" fill="none" stroke="#6B8E3A" stroke-width="1.8" stroke-linecap="round"/>`;
    o += dots(
      Array.from({ length: 30 }, () => [r() * W, hz + 10 + r() * (H - hz - 14)]),
      1.4,
      TERRA3,
      ' opacity=".5"',
    );
    o += `<rect y="${hz}" width="${W}" height="${H - hz}" fill="url(#gv)"/>`;
  }
  o += pitchLines(g, venue === 'stadium' ? '#F3FAF4' : CREAM);
  return o;
};

const floodlight = (x, top, base, wood, id) => {
  const pole = wood ? TERRA2 : '#2B3A6B';
  let o = `<rect x="${x - 3}" y="${top + 14}" width="6" height="${base - top - 14}" fill="${pole}" stroke="${INK}" stroke-width="1.4"/>`;
  o += `<circle cx="${x}" cy="${top + 6}" r="64" fill="url(#${id})"/>`;
  o += `<rect x="${x - 18}" y="${top}" width="36" height="17" rx="3" fill="#1D1D20" stroke="${INK}" stroke-width="1.6"/>`;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 2; j++)
      o += `<rect x="${x - 14.5 + i * 10}" y="${top + 2.5 + j * 6.5}" width="8" height="5" rx="1" fill="${CREAM}"/>`;
  return o;
};
const glowDef = (id) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${PLANTAIN}" stop-opacity=".55"/><stop offset=".5" stop-color="${GOLD}" stop-opacity=".16"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>`;

// ---------- community pitch at dusk ----------
const communityBack = (g) => {
  const { W, horizon: hz } = g;
  const r = rng(5);
  let o = `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NIGHT}"/><stop offset=".55" stop-color="#3B2A78"/><stop offset="1" stop-color="${ORANGE}"/></linearGradient>${glowDef('gl')}<pattern id="ad" width="18" height="12" patternUnits="userSpaceOnUse"><rect width="18" height="12" fill="${INDIGO2}"/><g fill="none" stroke="${CREAM}" stroke-width="1.3"><circle cx="9" cy="6" r="3.6"/><circle cx="0" cy="0" r="1.8"/><circle cx="18" cy="0" r="1.8"/><circle cx="0" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/></g><circle cx="9" cy="6" r=".9" fill="${CREAM}"/></pattern></defs>`;
  o += `<rect width="${W}" height="${hz + 2}" fill="url(#sk)"/>`;
  o += dots(
    Array.from({ length: Math.round(W / 9) }, () => [r() * W, r() * hz * 0.5]),
    0.9,
    CREAM,
    ' opacity=".8"',
  );
  // skyline of zinc-roofed houses (silhouette) with a few lit windows
  const hs = [];
  let x = -10;
  while (x < W) {
    const w = 26 + r() * 30,
      h = 34 + r() * 38;
    hs.push([x, w, h]);
    x += w + 2 + r() * 6;
  }
  o += hs
    .map(
      ([x0, w, h]) =>
        `<path d="M${f1(x0)} ${hz}V${f1(hz - h)}L${f1(x0 + w / 2)} ${f1(hz - h - 7)}L${f1(x0 + w)} ${f1(hz - h)}V${hz}z" fill="#1C1650"/>`,
    )
    .join('');
  o += dots(
    hs.flatMap(([x0, w, h]) =>
      r() < 0.6
        ? [
            [x0 + w * 0.3, hz - h * 0.55],
            [x0 + w * 0.7, hz - h * 0.3],
          ]
        : [],
    ),
    2.2,
    GOLD,
    ' opacity=".9"',
  );
  // mango tree (right) and a parked keke napep (left, behind the wall)
  o +=
    `<rect x="${W - 74}" y="${hz - 60}" width="7" height="60" fill="${TERRA3}"/>` +
    [
      [W - 70, hz - 70, 30],
      [W - 92, hz - 56, 22],
      [W - 48, hz - 56, 22],
      [W - 70, hz - 90, 20],
    ]
      .map(([cx, cy, rr]) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="#14391F"/>`)
      .join('');
  o += `<g transform="translate(34 ${hz - 40})"><path d="M2 8Q14 -2 28 8z" fill="#1D1D20"/><rect x="3" y="8" width="25" height="15" rx="3" fill="${PLANTAIN}" stroke="${INK}" stroke-width="1.6"/><rect x="3" y="14" width="25" height="3" fill="#1D1D20"/><circle cx="8" cy="26" r="4.4" fill="#1D1D20"/><circle cx="24" cy="26" r="4.4" fill="#1D1D20"/></g>`;
  // floodlight poles (timber)
  o += floodlight(32, 18, hz, true, 'gl') + floodlight(W - 32, 18, hz, true, 'gl');
  // wall with an adire band, spectators behind it
  const sp = [];
  for (let i = 0; i < Math.round(W / 14); i++)
    sp.push([
      6 + i * 14 + r() * 6,
      hz - 30 - r() * 4,
      [CREAM, GOLD, '#59C8E8', '#FF7A63', '#B6E04A', SKY, '#F8B6A0'][Math.floor(r() * 7)],
      ['#3B2314', '#5B3A25', '#855536', '#4A2C1A', '#A06A44'][Math.floor(r() * 5)],
    ]);
  o += sp
    .map(
      ([x0, y0, shirt, skin]) =>
        `<path d="M${f1(x0 - 6)} ${hz - 20}q0-9 6-9t6 9z" fill="${shirt}"/><circle cx="${f1(x0)}" cy="${f1(y0 + 2)}" r="4.2" fill="${skin}"/>`,
    )
    .join('');
  o += `<rect y="${hz - 22}" width="${W}" height="24" fill="#E8D9B0"/><path d="${Array.from({ length: Math.round(W / 16) }, (_, i) => `M${i * 16} ${hz - 22}v24`).join('')}" stroke="#C9B98A" stroke-width="1"/><rect y="${hz - 22}" width="${W}" height="12" fill="url(#ad)"/><rect y="${hz - 23.5}" width="${W}" height="3" fill="${INK}"/><rect y="${hz - 10}" width="${W}" height="2.6" fill="${INK}"/><rect y="${hz}" width="${W}" height="3" fill="#000" opacity=".25"/>`;
  return o;
};

// ---------- floodlit stadium ----------
const stadiumBack = (g) => {
  const { W, horizon: hz } = g;
  const r = rng(9);
  const tones = ['#3B2314', '#5B3A25', '#855536', '#4A2C1A', '#A06A44', '#6B3F26'];
  const tops = [
    CREAM,
    GOLD,
    '#59C8E8',
    '#FF7A63',
    '#B6E04A',
    SKY,
    '#F8B6A0',
    '#E4702A',
    '#A58BFF',
    '#0E7C86',
  ];
  const t0 = W > 400 ? 20 : 46,
    t1 = hz - 40; // stand span
  const rows = Math.round((t1 - t0) / 9.4);
  let o = `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03081A"/><stop offset="1" stop-color="#101C5E"/></linearGradient>${glowDef('gl')}<linearGradient id="st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A2766"/><stop offset="1" stop-color="#0E1745"/></linearGradient>`;
  const ads = [
    `<pattern id="a1" width="40" height="34" patternUnits="userSpaceOnUse"><rect width="40" height="34" fill="${INDIGO2}"/><g fill="none" stroke="${CREAM}" stroke-width="1.6"><circle cx="20" cy="17" r="8"/><circle cx="20" cy="17" r="4"/><circle cx="0" cy="0" r="4"/><circle cx="40" cy="0" r="4"/><circle cx="0" cy="34" r="4"/><circle cx="40" cy="34" r="4"/></g></pattern>`,
    `<pattern id="a2" width="40" height="34" patternUnits="userSpaceOnUse"><rect width="40" height="34" fill="${OCHRE}"/><g fill="none" stroke="${TERRA3}" stroke-width="2"><path d="M20 3 37 17 20 31 3 17z"/><path d="M20 10 30 17 20 24 10 17z"/></g></pattern>`,
    `<pattern id="a3" width="40" height="34" patternUnits="userSpaceOnUse"><rect width="40" height="34" fill="${WINE}"/><path d="M0 4h40M0 12h40M0 20h40M0 28h40" stroke="${GOLD2}" stroke-width="3"/><path d="M0 8h40M0 24h40" stroke="${CREAM}" stroke-width="1.4" stroke-dasharray="6 4"/></pattern>`,
    `<pattern id="a4" width="40" height="34" patternUnits="userSpaceOnUse"><rect width="40" height="34" fill="#0E7C86"/><g fill="${PLANTAIN}"><circle cx="20" cy="17" r="7"/><path d="M0 0h8v8H0zM32 26h8v8h-8z"/></g><circle cx="20" cy="17" r="3" fill="#0E7C86"/></pattern>`,
  ];
  o += ads.join('') + `</defs><rect width="${W}" height="${hz + 2}" fill="url(#sk)"/>`;
  o += dots(
    Array.from({ length: Math.round(W / 14) }, () => [r() * W, r() * 30]),
    0.9,
    CREAM,
    ' opacity=".7"',
  );
  o += `<rect y="${t0 - 10}" width="${W}" height="${t1 - t0 + 22}" fill="url(#st)"/>`;
  // seat rows (aso-oke-like alternating bands) and crowd
  for (let i = 0; i < rows; i++)
    o += `<rect y="${f1(t0 + i * 9.4 + 7)}" width="${W}" height="2.4" fill="${i % 3 === 0 ? '#2B3F94' : '#1E2D78'}"/>`;
  const byTop = {},
    heads = [];
  for (let i = 0; i < rows; i++) {
    const y = t0 + i * 9.4 + 4,
      sp = 8.2 + (i / rows) * 1.6;
    for (let x = (i % 2) * 4; x < W + 6; x += sp) {
      if (r() < 0.07) continue;
      const jx = x + r() * 2,
        c = tops[Math.floor(r() * tops.length)];
      (byTop[c] ??= []).push([jx, y + 3.6]);
      heads.push([jx, y - 0.6, tones[Math.floor(r() * tones.length)]]);
    }
  }
  for (const [c, pts] of Object.entries(byTop)) o += dots(pts, 3.7, c);
  const byTone = {};
  for (const [x, y, t] of heads) (byTone[t] ??= []).push([x, y]);
  for (const [t, pts] of Object.entries(byTone)) o += dots(pts, 2.5, t);
  // roof canopy edge, towers and glow
  o += `<path d="M0 ${t0 - 12}H${W}V${t0 - 24}H0z" fill="#0A1233"/><path d="M0 ${t0 - 12}H${W}" stroke="${CREAM}" stroke-width="1.6" stroke-dasharray="10 6" opacity=".6"/>`;
  const towers = W > 400 ? [26, W * 0.3, W * 0.7, W - 26] : [24, W - 24];
  for (const x of towers) o += floodlight(x, 6, t1 + 10, false, 'gl');
  // ad boards: patterned panels (no lettering, no brands)
  const pw = 40,
    n = Math.ceil(W / pw);
  o += `<rect y="${hz - 36}" width="${W}" height="38" fill="${INK}"/>`;
  for (let i = 0; i < n; i++)
    o += `<rect x="${i * pw + 1}" y="${hz - 34}" width="${pw - 2}" height="34" fill="url(#a${(i % 4) + 1})"/>`;
  o += `<rect y="${hz - 36}" width="${W}" height="2.4" fill="${CREAM}" opacity=".85"/><rect y="${hz}" width="${W}" height="3" fill="#000" opacity=".3"/>`;
  return o;
};

export const scene = (venue, orient) => {
  const g = GEO[orient];
  const back = venue === 'community' ? communityBack(g) : stadiumBack(g);
  return svg(`0 0 ${g.W} ${g.H}`, back + ground(g, venue), ` width="${g.W}" height="${g.H}"`);
};
export { gh, scallop, TERRA, SKY, INDIGO };
