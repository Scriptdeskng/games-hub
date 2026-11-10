// Penalty King art: shared palette, SVG helpers, invented teams and kit patterns (asset-designer, in-repo, original shapes only).
// Imported by gen-penalty-king-art.mjs, penalty-king-*.mjs and check-penalty-king-art.mjs.
export const INK = '#0B1F14', // deep forest-black ink (Naija Green family)
  CREAM = '#FFF3DA',
  PAPER = '#F3FAF4', // Naija Green surface
  GREEN = '#0B3D22',
  GREEN2 = '#06281A',
  LEAF = '#3DD680',
  GOLD = '#FFC933',
  GOLD2 = '#E8AE32',
  PLANTAIN = '#F7D348',
  INDIGO = '#22347F',
  INDIGO2 = '#16235F',
  NIGHT = '#0A1233',
  SKY = '#6F93E8',
  TERRA = '#9A4A27',
  TERRA2 = '#7A3A20',
  TERRA3 = '#552716',
  OCHRE = '#E0A030',
  ORANGE = '#E4702A',
  WINE = '#8C1D3D',
  GOOD = '#0E7A3B',
  BAD = '#B3261E',
  HAIR = '#1A0F0A';

export const f1 = (n) => +n.toFixed(1);
export const svg = (vb, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${extra}>${body}</svg>`;
export const inner = (s) => s.replace(/^<svg[^>]*>|<\/svg>$/g, '');
export const scallop = (cx, cy, R, r, n) => {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const rr = i % 2 ? r : R;
    pts.push(`${f1(cx + rr * Math.cos(a))} ${f1(cy + rr * Math.sin(a))}`);
  }
  return `M${pts.join('L')}z`;
};
/** Seeded PRNG so every generator run writes identical files. */
export const rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** Dots as zero-length round-cap segments, grouped per colour (tiny files). */
export const dots = (pts, r, col, extra = '') =>
  `<path d="${pts.map(([x, y]) => `M${f1(x)} ${f1(y)}h0`).join('')}" stroke="${col}" stroke-width="${f1(r * 2)}" stroke-linecap="round"${extra}/>`;

export const lum = (hex) => {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/**
 * The 8 invented teams (player's team first, then the 7 cup opponents in bracket order).
 * Names are invented from Nigerian landscape and city flavour; no animal mascots, no "United", "Stars", "Warriors", "Pillars",
 * "Tornadoes" or "Rangers" (words common in real Nigerian club names). Each team has a UNIQUE kit pattern and crest outline, so
 * teams stay distinguishable in greyscale. Kit colour pairs avoid red/white, blue/white, green/white and other familiar pairs.
 */
export const TEAMS = [
  { id: 'lanterns', name: 'Lagoon Lanterns', short: 'LAG', city: 'Lagos (the lagoon, evening lights)', zone: 'South-West', shirt: '#0E7C86', trim: '#FFC933', shorts: '#08454E', pattern: 'sash', skin: '#5B3A25', hair: 'low' },
  { id: 'sparks', name: 'Sahel Sparks', short: 'SAH', city: 'Sokoto and Katsina (the Sahel edge)', zone: 'North-West', shirt: '#E8AE32', trim: '#4B1A55', shorts: '#4B1A55', pattern: 'hoops', skin: '#855536', hair: 'bun' },
  { id: 'drifters', name: 'Delta Drifters', short: 'DEL', city: 'Yenagoa and Port Harcourt (creeks, canoes)', zone: 'South-South', shirt: '#FF7A63', trim: '#14264F', shorts: '#14264F', pattern: 'chevron', skin: '#3B2314', hair: 'twists' },
  { id: 'comets', name: 'Capital Comets', short: 'CAP', city: 'Abuja (wide roads, a monolith on the skyline)', zone: 'North-Central (FCT)', shirt: '#2C2C31', trim: '#B6E04A', shorts: '#1D1D20', pattern: 'halves', skin: '#6B3F26', hair: 'low' },
  { id: 'harriers', name: 'Highland Harriers', short: 'HIG', city: 'Jos and the Plateau highlands', zone: 'North-Central', shirt: '#B4532A', trim: '#FFF3DA', shorts: '#7A3A20', pattern: 'yoke', skin: '#A06A44', hair: 'headband' },
  { id: 'embers', name: 'Eastern Embers', short: 'EAS', city: 'Enugu, Owerri and Aba (the forge and the market)', zone: 'South-East', shirt: '#8C1D3D', trim: '#F8B6A0', shorts: '#5E1228', pattern: 'band', skin: '#4A2C1A', hair: 'low' },
  { id: 'blazers', name: 'Basin Blazers', short: 'BAS', city: 'Maiduguri and the Lake Chad basin', zone: 'North-East', shirt: '#C2185B', trim: '#FFD1E3', shorts: '#7A0F3B', pattern: 'quarters', skin: '#7B4A2E', hair: 'bun' },
  { id: 'bells', name: 'Brass City Bells', short: 'BRA', city: 'Benin City (brass casting heritage)', zone: 'South-South (Edo)', shirt: '#3B2A78', trim: '#E4702A', shorts: '#241A4D', pattern: 'pin', skin: '#5E3822', hair: 'cornrow' },
];
/** Neutral goalkeeper kit worn by whoever keeps goal (no team uses cyan); sleeves long. */
export const KEEPER = { shirt: '#59C8E8', trim: '#0B1F14', shorts: '#0B1F14', pattern: 'yoke', hair: 'low' };
export const KEEPER_SKINS = { dark: '#4F2E1B', mid: '#855536', light: '#A8744C' };
export const teamById = Object.fromEntries(TEAMS.map((t) => [t.id, t]));

/**
 * Shirt pattern in LOCAL torso coordinates: origin = torso centre, x across (w), y down the torso (h).
 * Used inside a clipPath of the torso (figures) or of the shirt silhouette (kit icons).
 */
export const shirtPattern = (kind, c, w, h) => {
  const x0 = -w / 2 - 3,
    x1 = w / 2 + 3,
    y0 = -h / 2 - 2,
    y1 = h / 2 + 2;
  const R = (x, y, ww, hh) => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(ww)}" height="${f1(hh)}" fill="${c}"/>`;
  switch (kind) {
    case 'sash':
      return `<path d="M${f1(x0)} ${f1(y0)}h${f1(w * 0.42)}L${f1(x1)} ${f1(y1)}h${f1(-w * 0.42)}z" fill="${c}"/>`;
    case 'hoops':
      return [-0.32, -0.04, 0.24].map((k) => R(x0, k * h, w + 6, h * 0.13)).join('');
    case 'chevron':
      return [0, 0.26].map((k) => `<path d="M${f1(x0)} ${f1(-h * 0.2 + k * h)}L0 ${f1(h * 0.04 + k * h)}L${f1(x1)} ${f1(-h * 0.2 + k * h)}" fill="none" stroke="${c}" stroke-width="${f1(h * 0.14)}"/>`).join('');
    case 'halves':
      return R(0, y0, x1, h + 4);
    case 'yoke':
      return R(x0, y0, w + 6, h * 0.32);
    case 'band':
      return R(x0, -h * 0.14, w + 6, h * 0.28) + `<path d="M0 ${f1(-h * 0.14)}l${f1(w * 0.12)} ${f1(h * 0.14)}l${f1(-w * 0.12)} ${f1(h * 0.14)}l${f1(-w * 0.12)} ${f1(-h * 0.14)}z" fill="none" stroke="${INK}" stroke-width="1.4"/>`;
    case 'quarters':
      return R(x0, y0, w / 2 + 3, h / 2 + 2) + R(0, 0, x1, y1);
    case 'pin':
      return [-0.36, -0.12, 0.12, 0.36].map((k) => R(k * w - w * 0.04, y0, w * 0.08, h + 4)).join('');
    default:
      return '';
  }
};
export const PATTERNS = ['sash', 'hoops', 'chevron', 'halves', 'yoke', 'band', 'quarters', 'pin'];

/** T-shirt silhouette (64 units wide) used by kit icons and crest-sized jerseys. */
export const SHIRT_PATH = 'M19 6 27 3Q32 9 37 3L45 6 60 18 53 28 46 23V54H18V23L11 28 4 18z';
export const kitIcon = (t, uid) =>
  svg(
    '0 0 64 76',
    `<defs><clipPath id="c${uid}"><path d="${SHIRT_PATH}"/></clipPath></defs>` +
      `<path d="M19 56h26l5 17H34l-2-8-2 8H14z" fill="${t.shorts}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="${SHIRT_PATH}" fill="${t.shirt}"/><g clip-path="url(#c${uid})"><g transform="translate(32 30)">${shirtPattern(t.pattern, t.trim, 28, 50)}</g></g>` +
      `<path d="${SHIRT_PATH}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M27 3Q32 9 37 3" fill="none" stroke="${t.trim}" stroke-width="2.6" stroke-linecap="round"/>`,
  );
