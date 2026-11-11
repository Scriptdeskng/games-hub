// Penalty King props: goal (back net and front frame, akwete-diamond net), ball, effects, cheering crowd strip, trophy.
// Goal sprite = 240 x 96 units for a 180-wide opening (x 30..210, y 20..80); the vanishing point is 6 units above the sprite.
import {
  INK,
  CREAM,
  GOLD,
  GOLD2,
  PLANTAIN,
  TERRA,
  TERRA2,
  TERRA3,
  OCHRE,
  ORANGE,
  WINE,
  SKY,
  INDIGO,
  f1,
  svg,
  rng,
  dots,
  scallop,
} from './penalty-king-common.mjs';

const VP = [120, -6];
const toVP = (p, k) => [VP[0] + (p[0] - VP[0]) * k, VP[1] + (p[1] - VP[1]) * k];
const poly = (pts) => `M${pts.map((p) => p.map(f1).join(' ')).join('L')}z`;

/** Net behind the keeper: rear panel, two side panels, a faint roof, an akwete diamond lattice. */
export const goalBack = () => {
  const [a, b, c, d] = [
    [30, 20],
    [210, 20],
    [210, 80],
    [30, 80],
  ];
  const [ra, rb, rc, rd] = [a, b, c, d].map((p) => toVP(p, 0.85));
  const lat = `<pattern id="nt" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M4.5 0 9 4.5 4.5 9 0 4.5z" fill="none" stroke="${CREAM}" stroke-width="1"/></pattern>`;
  return svg(
    '0 0 240 96',
    `<defs>${lat}</defs>` +
      `<path d="${poly([ra, rb, rc, rd])}" fill="#06281A" opacity=".55"/><path d="${poly([ra, rb, rc, rd])}" fill="url(#nt)" opacity=".8"/>` +
      `<path d="${poly([a, ra, rd, d])}" fill="#06281A" opacity=".45"/><path d="${poly([a, ra, rd, d])}" fill="url(#nt)" opacity=".6"/>` +
      `<path d="${poly([b, rb, rc, c])}" fill="#06281A" opacity=".45"/><path d="${poly([b, rb, rc, c])}" fill="url(#nt)" opacity=".6"/>` +
      `<path d="${poly([a, b, rb, ra])}" fill="${CREAM}" opacity=".25"/>` +
      `<path d="${poly([ra, rb, rc, rd])}" fill="none" stroke="${CREAM}" stroke-width="1.6"/>` +
      `<path d="M${f1(rd[0])} ${f1(rd[1])}L${d[0]} ${d[1]}M${f1(rc[0])} ${f1(rc[1])}L${c[0]} ${c[1]}" stroke="${CREAM}" stroke-width="1.4" opacity=".8"/>`,
    ' width="240" height="96"',
  );
};
/** Posts and crossbar. `wood` = community pitch (timber, rough), else painted stadium frame (cream with green bands). */
export const goalFront = (wood) => {
  const pf = wood ? TERRA : CREAM;
  const bands = wood
    ? ''
    : [24, 38, 52, 66]
        .map(
          (y) =>
            `<rect x="27.4" y="${y}" width="5.2" height="6" fill="#0B3D22"/><rect x="207.4" y="${y}" width="5.2" height="6" fill="#0B3D22"/>`,
        )
        .join('') +
      [48, 72, 96, 120, 144, 168, 192]
        .map((x) => `<rect x="${x}" y="17.4" width="6" height="5.2" fill="#0B3D22"/>`)
        .join('');
  const knots = wood
    ? `<path d="M30 30v3M30 52v3M210 40v3M210 64v3M70 20h3M150 20h3" stroke="${TERRA3}" stroke-width="1.6" stroke-linecap="round"/>`
    : '';
  return svg(
    '0 0 240 96',
    `<rect x="26" y="16" width="188" height="7.4" rx="2" fill="${pf}" stroke="${INK}" stroke-width="2.4"/><rect x="26" y="16" width="7.4" height="66" rx="2" fill="${pf}" stroke="${INK}" stroke-width="2.4"/><rect x="206.6" y="16" width="7.4" height="66" rx="2" fill="${pf}" stroke="${INK}" stroke-width="2.4"/>` +
      bands +
      knots +
      `<path d="M28 80h4M208 80h4" stroke="${INK}" stroke-width="3"/>`,
    ' width="240" height="96"',
  );
};

/** Plain match ball (no brand pattern): cream, ink seams, a gold akwete diamond centre and four adire-dot spokes. */
export const ball = () =>
  svg(
    '0 0 64 64',
    `<circle cx="32" cy="32" r="29" fill="${CREAM}" stroke="${INK}" stroke-width="3.6"/>` +
      `<path d="M32 22.5 41.5 32 32 41.5 22.5 32z" fill="${GOLD}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<path d="M32 22.5V8M32 41.5V56M22.5 32H8M41.5 32H56" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>` +
      `<path d="M10 20Q20 24 22.5 32M54 44Q44 40 41.5 32M20 54Q24 44 32 41.5M44 10Q40 20 32 22.5" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>` +
      dots(
        [
          [32, 7],
          [32, 57],
          [7, 32],
          [57, 32],
        ],
        2.4,
        INK,
      ) +
      `<path d="M14 14A26 26 0 0 1 30 5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>`,
    ' width="64" height="64"',
  );
export const ballShadow = () =>
  svg(
    '0 0 64 24',
    `<ellipse cx="32" cy="12" rx="28" ry="8" fill="#000" opacity=".35"/><ellipse cx="32" cy="12" rx="16" ry="4.4" fill="#000" opacity=".25"/>`,
    ' width="64" height="24"',
  );

// ---------- effects ----------
/** Net bulge where the ball lands: a lattice of diamonds pushed out in rings (drawn over the net). */
export const netBulge = () => {
  let o = '';
  for (const r of [14, 28, 42])
    o += `<circle cx="48" cy="48" r="${r}" fill="none" stroke="${INK}" stroke-width="${6 - r / 14}" opacity=".6"/><circle cx="48" cy="48" r="${r}" fill="none" stroke="${CREAM}" stroke-width="${3.4 - r / 22}" stroke-dasharray="${r === 28 ? '6 4' : 'none'}"/>`;
  for (let i = 0; i < 8; i++)
    o += `<path d="M48 48 ${f1(48 + 46 * Math.cos((i * Math.PI) / 4))} ${f1(48 + 46 * Math.sin((i * Math.PI) / 4))}" stroke="${CREAM}" stroke-width="1.6" opacity=".7"/>`;
  return svg(
    '0 0 96 96',
    o + `<path d="M48 40 56 48 48 56 40 48z" fill="${PLANTAIN}" stroke="${INK}" stroke-width="2"/>`,
    ' width="96" height="96"',
  );
};
/** Goal: gele-ribbon burst (celebratory, no gore) in aso-oke colours. */
export const goalRibbons = () => {
  const cols = [
    PLANTAIN,
    ORANGE,
    SKY,
    CREAM,
    OCHRE,
    '#FF7A63',
    GOLD2,
    '#B6E04A',
    '#F8B6A0',
    '#59C8E8',
  ];
  const rb = cols
    .map(
      (c, i) =>
        `<g transform="rotate(${i * 36} 100 100)"><path d="M100 70C112 56 98 42 110 26c6-8 15-5 12 3-3 8-12 12-11 28" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M100 70C112 56 98 42 110 26c6-8 15-5 12 3-3 8-12 12-11 28" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/></g>`,
    )
    .join('');
  return svg(
    '0 0 200 200',
    `${rb}<path d="${scallop(100, 100, 24, 18, 10)}" fill="${GOLD}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/><path d="M100 90 110 100 100 110 90 100z" fill="${CREAM}" stroke="${INK}" stroke-width="1.6"/>`,
    ' width="200" height="200"',
  );
};
/** Save: a glove star (hand with five fingers is too fiddly; a hexagonal glove-patch with ring and ticks, shape differs from goal). */
export const saveRing = () => {
  const tick = Array.from(
    { length: 12 },
    (_, i) =>
      `<path d="M100 14v18" transform="rotate(${i * 30} 100 100)" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M100 14v18" transform="rotate(${i * 30} 100 100)" stroke="${i % 2 ? CREAM : GOLD}" stroke-width="5" stroke-linecap="round"/>`,
  ).join('');
  return svg(
    '0 0 200 200',
    `${tick}<circle cx="100" cy="100" r="52" fill="none" stroke="${INK}" stroke-width="12"/><circle cx="100" cy="100" r="52" fill="none" stroke="${CREAM}" stroke-width="6" stroke-dasharray="3 8" stroke-linecap="round"/>`,
    ' width="200" height="200"',
  );
};
/** Post hit: jagged shock lines and ogene-style rings (a gong clang). */
export const postClang = () => {
  const sp = Array.from(
    { length: 10 },
    (_, i) =>
      `<path d="M100 100 ${f1(100 + 30 * Math.cos((i * Math.PI) / 5))} ${f1(100 + 30 * Math.sin((i * Math.PI) / 5))} ${f1(100 + 54 * Math.cos(((i + 0.5) * Math.PI) / 5))} ${f1(100 + 54 * Math.sin(((i + 0.5) * Math.PI) / 5))} ${f1(100 + 84 * Math.cos(((i + 0.1) * Math.PI) / 5))} ${f1(100 + 84 * Math.sin(((i + 0.1) * Math.PI) / 5))}" fill="none" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/><path d="M100 100 ${f1(100 + 30 * Math.cos((i * Math.PI) / 5))} ${f1(100 + 30 * Math.sin((i * Math.PI) / 5))} ${f1(100 + 54 * Math.cos(((i + 0.5) * Math.PI) / 5))} ${f1(100 + 54 * Math.sin(((i + 0.5) * Math.PI) / 5))} ${f1(100 + 84 * Math.cos(((i + 0.1) * Math.PI) / 5))} ${f1(100 + 84 * Math.sin(((i + 0.1) * Math.PI) / 5))}" fill="none" stroke="${i % 2 ? PLANTAIN : CREAM}" stroke-width="4.4" stroke-linejoin="round"/>`,
  ).join('');
  return svg(
    '0 0 200 200',
    `${sp}<circle cx="100" cy="100" r="18" fill="${GOLD2}" stroke="${INK}" stroke-width="4"/><circle cx="100" cy="100" r="8" fill="${INK}"/>`,
    ' width="200" height="200"',
  );
};
export const dust = () =>
  svg(
    '0 0 80 48',
    `<g fill="#D49A66" stroke="#8C5230" stroke-width="2"><circle cx="20" cy="30" r="14"/><circle cx="40" cy="22" r="18"/><circle cx="60" cy="30" r="13"/><circle cx="32" cy="36" r="11"/><circle cx="50" cy="36" r="11"/></g>`,
    ' width="80" height="48"',
  );
/** Cheering crowd strip (tileable 360 x 96): silhouettes with raised arms, drawn over the stands on a goal. */
export const crowdCheer = () => {
  const r = rng(77);
  const cols = [CREAM, GOLD, '#59C8E8', '#FF7A63', '#B6E04A', SKY, '#F8B6A0', ORANGE];
  const tones = ['#3B2314', '#5B3A25', '#855536', '#4A2C1A', '#A06A44'];
  let o = '';
  for (let i = 0; i < 18; i++) {
    const x = 10 + i * 20,
      y = 56 + (i % 3) * 8,
      c = cols[Math.floor(r() * cols.length)],
      sk = tones[Math.floor(r() * tones.length)];
    o += `<g><path d="M${x - 8} 96V${y + 14}q0-10 8-10t8 10V96z" fill="${c}" stroke="${INK}" stroke-width="1.6"/><path d="M${x - 6} ${y + 12} ${x - 12} ${y - 10}M${x + 6} ${y + 12} ${x + 12} ${y - 10}" stroke="${INK}" stroke-width="6.4" stroke-linecap="round"/><path d="M${x - 6} ${y + 12} ${x - 12} ${y - 10}M${x + 6} ${y + 12} ${x + 12} ${y - 10}" stroke="${sk}" stroke-width="3.4" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="6" fill="${sk}" stroke="${INK}" stroke-width="1.6"/></g>`;
  }
  return svg('0 0 360 96', o, ' width="360" height="96"');
};

/** Cup trophy: a two-handled brass cup with an akwete diamond on the bowl (original shape, not a copy of any real trophy). */
export const trophy = () =>
  svg(
    '0 0 96 128',
    `<ellipse cx="48" cy="122" rx="30" ry="5" fill="#000" opacity=".3"/><rect x="26" y="104" width="44" height="14" rx="3" fill="${TERRA2}" stroke="${INK}" stroke-width="3"/><rect x="34" y="96" width="28" height="9" fill="${GOLD2}" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M42 78h12l4 18H38z" fill="${GOLD2}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M26 40Q8 40 10 56Q12 68 30 70" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M26 40Q8 40 10 56Q12 68 30 70" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M70 40Q88 40 86 56Q84 68 66 70" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M70 40Q88 40 86 56Q84 68 66 70" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M22 20H74Q74 66 48 80Q22 66 22 20z" fill="${GOLD}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/><path d="M30 24H44Q44 56 36 66Q30 52 30 24z" fill="#fff" opacity=".35"/>` +
      `<path d="M48 30 62 46 48 62 34 46z" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M48 38 55 46 48 54 41 46z" fill="${WINE}" stroke="${INK}" stroke-width="2"/>`,
    ' width="96" height="128"',
  );
export { TERRA, INDIGO, dots };
