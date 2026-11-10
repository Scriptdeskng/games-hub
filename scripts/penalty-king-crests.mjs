// Penalty King: 8 invented team crests (96 x 96) and the menu mark. Each crest has its OWN outline (circle, hexagon, vesica, octagon,
// arch, rounded square, rosette, diamond) and a motif from adire, akwete, aso-oke or Arewa relief, so crests differ in greyscale too.
// Original geometry only: no real club badge, shield, animal or lettering is imitated.
import { INK, CREAM, GOLD, GOLD2, PLANTAIN, GREEN, GREEN2, TERRA2, f1, svg, scallop, dots, teamById } from './penalty-king-common.mjs';

const ng = (cx, cy, R, n, rot = -Math.PI / 2) => `M${Array.from({ length: n }, (_, i) => `${f1(cx + R * Math.cos(rot + (i * 2 * Math.PI) / n))} ${f1(cy + R * Math.sin(rot + (i * 2 * Math.PI) / n))}`).join('L')}z`;
const sh = (d, fill, sw = 4) => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
const ln = (d, col, w, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;

const DRAW = {
  // circle + adire ring of dots + a lantern
  lanterns: (t) =>
    `<circle cx="48" cy="48" r="44" fill="${t.shirt}" stroke="${INK}" stroke-width="4"/><circle cx="48" cy="48" r="37" fill="none" stroke="${CREAM}" stroke-width="2" stroke-dasharray="1 5.4" stroke-linecap="round"/>` +
    ln('M41 27Q48 14 55 27', INK, 5) + ln('M41 27Q48 14 55 27', CREAM, 2.4) +
    sh('M37 28h22l-4 7H41z', t.trim, 3) + sh('M41 35h14v26H41z', t.trim, 3) + `<path d="M48 40 52 47 48 54 44 47z" fill="${t.shirt}" stroke="${INK}" stroke-width="1.6"/>` + sh('M37 61h22v6H37z', t.trim, 3) +
    ['M26 40 31 42', 'M24 50H30', 'M26 60 31 58', 'M70 40 65 42', 'M72 50H66', 'M70 60 65 58'].map((d) => ln(d, t.trim, 2.6)).join(''),
  // hexagon + two plum hoops + Arewa star-in-square
  sparks: (t) =>
    sh(ng(48, 48, 46, 6, 0), t.shirt, 4) + `<path d="M10 28H86M10 68H86" stroke="${t.trim}" stroke-width="7"/>` + sh(ng(48, 48, 46, 6, 0), 'none', 4) +
    sh(scallop(48, 48, 24, 12, 8), t.trim, 3) + `<rect x="41" y="41" width="14" height="14" fill="${CREAM}" stroke="${INK}" stroke-width="2.4"/><path d="M48 44 52 48 48 52 44 48z" fill="${t.trim}"/>`,
  // vesica + canoe + adire waves
  drifters: (t) =>
    sh('M48 3Q95 48 48 93Q1 48 48 3z', t.shirt, 4) + `<circle cx="48" cy="30" r="9" fill="none" stroke="${t.trim}" stroke-width="3.4"/><circle cx="48" cy="30" r="2.6" fill="${t.trim}"/>` +
    sh('M20 50Q48 68 76 50Q70 62 48 64Q26 62 20 50z', t.trim, 3) + `<path d="M48 50V38" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` + ln('M22 72q6.5-5 13 0t13 0t13 0t13 0', t.trim, 3.4) + ln('M28 82q5-4 10 0t10 0t10 0t10 0', t.trim, 3),
  // octagon + comet (disc + three aso-oke stripes)
  comets: (t) =>
    sh(ng(48, 48, 46, 8, -Math.PI / 8), t.shirt, 4) +
    [['M56 42 16 70', t.trim, 7], ['M66 48 30 80', CREAM, 5], ['M50 34 14 56', CREAM, 4]].map(([d, c, w]) => ln(d, INK, w + 3) + ln(d, c, w)).join('') +
    `<circle cx="66" cy="34" r="14" fill="${t.trim}" stroke="${INK}" stroke-width="3.4"/><circle cx="66" cy="34" r="6" fill="none" stroke="${INK}" stroke-width="2"/>`,
  // pointed Arewa arch + stepped highlands + sun
  harriers: (t) =>
    sh('M10 90V42Q10 14 48 4Q86 14 86 42V90z', t.shirt, 4) + ln('M17 85V44Q17 22 48 12Q79 22 79 44V85', t.trim, 2, ' stroke-dasharray="5 3"') +
    `<circle cx="48" cy="38" r="9" fill="${GOLD}" stroke="${INK}" stroke-width="2.6"/>` + sh('M10 90 10 78 32 56 48 72 64 52 86 78V90z', t.trim, 3.4) + `<path d="M32 56 36 90M64 52 60 90" stroke="${INK}" stroke-width="1.6" opacity=".6"/>`,
  // rounded square + three stacked akwete diamonds
  embers: (t) =>
    `<rect x="6" y="6" width="84" height="84" rx="18" fill="${t.shirt}" stroke="${INK}" stroke-width="4"/>` + ln('M14 30 34 48 14 66M82 30 62 48 82 66', t.trim, 2, ' opacity=".7"') +
    [26, 48, 70].map((y, i) => sh(`M48 ${y - 13} 61 ${y} 48 ${y + 13} 35 ${y}z`, i === 1 ? GOLD : t.trim, 3)).join(''),
  // rosette + flame (teardrop)
  blazers: (t) =>
    sh(scallop(48, 48, 46, 40, 14), t.shirt, 4) + `<circle cx="48" cy="48" r="32" fill="${t.trim}" stroke="${INK}" stroke-width="3"/>` +
    sh('M48 15Q68 40 62 58Q58 74 48 74Q38 74 34 58Q28 40 48 15z', t.shirt, 3.4) + sh('M48 44Q56 54 53 62Q51 68 48 68Q45 68 43 62Q40 54 48 44z', GOLD, 2.4),
  // diamond + agogo double bell
  bells: (t) =>
    sh('M48 3 93 48 48 93 3 48z', t.shirt, 4) + ln('M18 48 48 18 78 48 48 78z', t.trim, 1.8, ' stroke-dasharray="4 3"') +
    ln('M38 34Q47 22 56 42', INK, 6) + ln('M38 34Q47 22 56 42', CREAM, 2.4) +
    sh('M33 34h10l9 32H24z', t.trim, 3) + sh('M52 42h8l9 24H46z', t.trim, 3) + dots([[38, 70], [57, 70]], 3, INK),
};
export const crest = (id) => svg('0 0 96 96', DRAW[id](teamById[id]), ' width="96" height="96"');
export const CREST_IDS = Object.keys(DRAW);

/** Menu mark: gold rosette, a goal with an akwete-diamond net, a crown and a ball. */
export const menuMark = () =>
  svg(
    '0 0 128 128',
    `<defs><clipPath id="mn"><rect x="34" y="50" width="60" height="40"/></clipPath><pattern id="mp" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M4.5 0 9 4.5 4.5 9 0 4.5z" fill="none" stroke="${CREAM}" stroke-width="1"/></pattern></defs>` +
      `<path d="${scallop(64, 66, 60, 50, 12)}" fill="#00000050"/><path d="${scallop(64, 64, 60, 50, 12)}" fill="${GOLD2}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
      `<circle cx="64" cy="64" r="42" fill="${GREEN}" stroke="${CREAM}" stroke-width="3"/>` +
      `<g clip-path="url(#mn)"><rect x="34" y="50" width="60" height="40" fill="${GREEN2}"/><rect x="34" y="50" width="60" height="40" fill="url(#mp)" opacity=".8"/></g>` +
      `<path d="M34 90V50H94V90" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M34 90V50H94V90" fill="none" stroke="${CREAM}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M44 44V28l10 9 10-15 10 15 10-9v16z" fill="${PLANTAIN}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>` +
      `<circle cx="64" cy="94" r="14" fill="${CREAM}" stroke="${INK}" stroke-width="3.4"/><path d="M64 87 71 94 64 101 57 94z" fill="${GOLD}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`,
    ' width="128" height="128"',
  );
export { TERRA2 };
