// Draughts Naija art: shared palette, SVG helpers and piece drawings (asset-designer, in-repo, original shapes only).
// Imported by gen-draughts-naija-art.mjs, draughts-naija-people.mjs and check-draughts-naija-art.mjs.
export const INK = '#0F1B4A', // adire indigo ink
  CREAM = '#FFF3DA',
  SAND = '#F2E1BD', // light squares (unused by pieces)
  SAND2 = '#E3C98F',
  INDIGO = '#22347F', // dark squares (pieces sit here)
  INDIGO2 = '#16235F',
  INDIGO3 = '#0A1233',
  SKY = '#6F93E8',
  TERRA = '#9A4A27', // Zaria terracotta
  TERRA2 = '#7A3A20',
  TERRA3 = '#552716',
  OCHRE = '#E0A030',
  GOLD = '#E8AE32',
  PLANTAIN = '#F7D348',
  IROKO = '#4A1D0E', // dark piece body (carved iroko / burnt clay)
  GOOD = '#0E6B52',
  BAD = '#B3261E';

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

/** WCAG relative luminance and contrast, used by the checker. */
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

// ---- pieces (64 x 64, disc centre 32,30). Shape + pattern + body lightness all differ, never colour alone. ----
// Light man: ivory disc, indigo adire ring in the middle.   Dark man: carved-iroko disc with a cream rim and a gold akwete diamond.
// Light king: two stacked ivory discs, gold rim and a crown.  Dark king: two stacked iroko discs, cream rim and a crown.
export const CROWN = `<path d="M18 40V21l8 8 6-12 6 12 8-8v19z" fill="${PLANTAIN}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/><path d="M18 40h28" stroke="${INK}" stroke-width="3.4"/><g fill="${PLANTAIN}" stroke="${INK}" stroke-width="2"><circle cx="18" cy="20" r="2.8"/><circle cx="32" cy="15.5" r="2.8"/><circle cx="46" cy="20" r="2.8"/></g>`;
const shadow = `<ellipse cx="32" cy="58" rx="22" ry="4" fill="#000" opacity=".3"/>`;
const discLight = (cy, r = 26) =>
  `<circle cx="32" cy="${cy}" r="${r}" fill="${INK}"/><circle cx="32" cy="${cy}" r="${r - 2.4}" fill="${CREAM}"/><circle cx="32" cy="${cy}" r="${r - 7}" fill="none" stroke="${SAND2}" stroke-width="2"/>`;
const discDark = (cy, r = 26) =>
  `<circle cx="32" cy="${cy}" r="${r}" fill="${CREAM}"/><circle cx="32" cy="${cy}" r="${r - 3}" fill="${IROKO}"/><circle cx="32" cy="${cy}" r="${r - 8}" fill="none" stroke="${TERRA2}" stroke-width="2"/>`;
export const PIECES = {
  'man-light': () =>
    `${shadow}${discLight(30)}<circle cx="32" cy="30" r="9" fill="none" stroke="${INDIGO}" stroke-width="5"/><circle cx="32" cy="30" r="2.6" fill="${INDIGO}"/>`,
  'man-dark': () =>
    `${shadow}${discDark(30)}<path d="M32 17.5 44.5 30 32 42.5 19.5 30z" fill="${PLANTAIN}" stroke="#2A0F06" stroke-width="2.6" stroke-linejoin="round"/><path d="M32 25 37 30 32 35 27 30z" fill="${IROKO}"/>`,
  'king-light': () =>
    `${shadow}${discLight(34, 24)}<circle cx="32" cy="26" r="24" fill="${INK}"/><circle cx="32" cy="26" r="21.6" fill="${CREAM}"/><circle cx="32" cy="26" r="18" fill="none" stroke="${GOLD}" stroke-width="3"/><g transform="translate(0 -4)">${CROWN}</g>`,
  'king-dark': () =>
    `${shadow}${discDark(34, 24)}<circle cx="32" cy="26" r="24" fill="${CREAM}"/><circle cx="32" cy="26" r="21" fill="${IROKO}"/><circle cx="32" cy="26" r="17.4" fill="none" stroke="${GOLD}" stroke-width="3"/><g transform="translate(0 -4)">${CROWN}</g>`,
};
export const pieceSvg = (k) => svg('0 0 64 64', PIECES[k](), ' width="64" height="64"');

/** Arewa wall-relief tile (star-in-square, lit edge) used on the board frame, stage wall and thumbs. */
export const reliefTile = (id, size = 28, dark = TERRA3, light = '#C4693F') => {
  const s = size,
    h = s / 2;
  const d = `M${h} 2 ${s - 2} ${h} ${h} ${s - 2} 2 ${h}z M${h - 5} ${h - 5}h10v10h-10z`;
  return `<pattern id="${id}" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><path d="${d}" transform="translate(-.8 -.8)" fill="none" stroke="${light}" stroke-width="2" opacity=".6"/><path d="${d}" fill="none" stroke="${dark}" stroke-width="2" opacity=".6"/></pattern>`;
};
/** Adire resist tile (ring, dots) in a light stroke, for indigo cloth and dark squares. */
export const adireTile = (id, size = 20, op = 0.2) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g fill="none" stroke="${SKY}" stroke-width="1.6" opacity="${op}"><circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.28}"/><circle cx="0" cy="0" r="${size * 0.14}"/><circle cx="${size}" cy="0" r="${size * 0.14}"/><circle cx="0" cy="${size}" r="${size * 0.14}"/><circle cx="${size}" cy="${size}" r="${size * 0.14}"/></g><circle cx="${size / 2}" cy="${size / 2}" r="1.6" fill="${SKY}" opacity="${op}"/></pattern>`;
