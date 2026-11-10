// Penalty King HUD art: aim, power, curve, dive zones, phase chips, role icons, kick-result dots, banners, scoreboard frame, bracket.
// Every state has its own SHAPE (not only a colour): see docs/assets/penalty-king-brief.md section 3.
import { INK, CREAM, PAPER, GOLD, GOLD2, PLANTAIN, GREEN, GREEN2, LEAF, WINE, TERRA2, INDIGO2, ORANGE, SKY, GOOD, BAD, f1, svg, scallop } from './penalty-king-common.mjs';

const oln = (d, w, col, extra = '') =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 3.4}" stroke-linecap="round" stroke-linejoin="round"${extra}/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const shp = (d, fill, sw = 2.6) => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
const icon = (body, n = 32) => svg(`0 0 ${n} ${n}`, body, ` width="${n}" height="${n}"`);

// ---------- aim, power, curve ----------
const ticks4 = (c, r0, r1, col) => [0, 90, 180, 270].map((a) => oln(`M${f1(c + r0 * Math.cos((a * Math.PI) / 180))} ${f1(c + r0 * Math.sin((a * Math.PI) / 180))}L${f1(c + r1 * Math.cos((a * Math.PI) / 180))} ${f1(c + r1 * Math.sin((a * Math.PI) / 180))}`, 3, col)).join('');
export const HUD = {
  'aim-reticle': () => icon(oln('M32 8a24 24 0 1 0 .01 0z', 3.4, CREAM, ' stroke-dasharray="9 5"') + ticks4(32, 14, 26, PLANTAIN) + shp('M32 27 37 32 32 37 27 32z', 'none', 2), 64),
  'aim-reticle-lock': () => icon(oln('M32 8a24 24 0 1 0 .01 0z', 3.4, PLANTAIN) + ['M12 22V12h10', 'M42 12h10v10', 'M12 42v10h10', 'M42 52h10V42'].map((d) => oln(d, 3.4, CREAM)).join('') + shp('M32 24 40 32 32 40 24 32z', PLANTAIN, 3), 64),
  'aim-arrow': () => svg('0 0 40 136', oln('M20 126V44', 5, CREAM, ' stroke-dasharray="3 11"') + shp('M20 4 36 40H24V50H16V40H4z', PLANTAIN, 3) + oln('M10 58 20 50 30 58', 3, CREAM) + oln('M10 74 20 66 30 74', 3, CREAM), ' width="40" height="136"'),
  'aim-grid': () => {
    let o = '';
    for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) o += `<rect x="${2 + c * 59}" y="${2 + r * 29}" width="57" height="27" rx="3" fill="none" stroke="${CREAM}" stroke-width="1.6" stroke-dasharray="5 4" opacity=".9"/>`;
    return svg('0 0 180 60', o, ' width="180" height="60"');
  },
  // tap-to-dive zones: arrows point where the keeper goes (shape = direction); each cell has a plate so arrows read on any scene
  'dive-grid': () => {
    const A = { ul: 'M22 8 8 8 8 22M8 8 26 26', u: 'M30 22V6M22 14 30 6 38 14', ur: 'M38 8h14v14M52 8 34 26', dl: 'M22 26H8V12M8 26 26 8', d: 'M30 6v16M22 14 30 22 38 14', dr: 'M38 26h14V12M52 26 34 8' };
    const cells = ['ul', 'u', 'ur', 'dl', 'd', 'dr'];
    return svg('0 0 180 60', cells.map((k, i) => `<g transform="translate(${(i % 3) * 60} ${Math.floor(i / 3) * 30})"><rect x="3" y="2" width="54" height="26" rx="5" fill="${GREEN2}" fill-opacity=".72" stroke="${INK}" stroke-width="2"/><g transform="translate(0 -1) scale(.86) translate(2.4 1.6)">${oln(A[k], 3.2, PLANTAIN)}</g></g>`).join(''), ' width="180" height="60"');
  },
  // power meter: frame with 5 zones; zone glyphs: 1 dot, 2 dots, diamond (sweet), 2 chevrons, warning triangle (over)
  'power-frame': () => {
    let o = `<rect x="2" y="2" width="36" height="196" rx="10" fill="${GREEN2}" stroke="${INK}" stroke-width="3"/><rect x="2" y="2" width="36" height="196" rx="10" fill="none" stroke="${CREAM}" stroke-width="1.6" stroke-dasharray="7 4" transform="translate(0 0)" opacity=".7"/>`;
    for (const y of [40, 80, 120, 160]) o += `<path d="M8 ${y}H32" stroke="${CREAM}" stroke-width="2.4"/>`;
    const cy = [180, 140, 100, 60, 20];
    o += `<circle cx="20" cy="180" r="4" fill="${CREAM}" stroke="${INK}" stroke-width="1.6"/>`;
    o += `<circle cx="14" cy="140" r="4" fill="${CREAM}" stroke="${INK}" stroke-width="1.6"/><circle cx="26" cy="140" r="4" fill="${CREAM}" stroke="${INK}" stroke-width="1.6"/>`;
    o += shp('M20 90 30 100 20 110 10 100z', PLANTAIN, 2.2);
    o += oln('M10 66 20 56 30 66', 3, CREAM) + oln('M10 56 20 46 30 56', 3, CREAM);
    o += shp('M20 8 32 31H8z', ORANGE, 2.4) + `<path d="M20 15v8" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><circle cx="20" cy="27" r="1.4" fill="${INK}"/>`;
    // sweet-zone bracket
    o += ['M4 84v-4h6', 'M36 84v-4h-6', 'M4 116v4h6', 'M36 116v4h-6'].map((d) => oln(d, 2.4, GOLD)).join('');
    return svg('0 0 40 200', o, ' width="40" height="200"');
  },
  // power fill: aso-oke stripes (revealed from the bottom by clipping with transform)
  'power-fill': () => svg('0 0 40 200', `<defs><clipPath id="pf"><rect x="7" y="7" width="26" height="186" rx="6"/></clipPath></defs><g clip-path="url(#pf)"><rect width="40" height="200" fill="${GOOD}"/>${Array.from({ length: 12 }, (_, i) => `<rect y="${i * 17}" width="40" height="5" fill="${i % 2 ? PLANTAIN : LEAF}"/>`).join('')}<path d="M0 0v200" stroke="${INK}" stroke-width="0"/></g>`, ' width="40" height="200"'),
  'curve-left': () => icon(oln('M34 42C36 30 28 22 14 20', 4, PLANTAIN) + shp('M8 20 20 10V30z', PLANTAIN, 2.4) + oln('M40 44H30', 3, CREAM, ' stroke-dasharray="2 5"'), 48),
  'curve-none': () => icon(oln('M24 44V16', 4, PLANTAIN) + shp('M24 4 34 20H14z', PLANTAIN, 2.4), 48),
  'curve-right': () => icon(oln('M14 42C12 30 20 22 34 20', 4, PLANTAIN) + shp('M40 20 28 10V30z', PLANTAIN, 2.4) + oln('M8 44H18', 3, CREAM, ' stroke-dasharray="2 5"'), 48),
  'curve-dial': () => svg('0 0 128 44', oln('M10 38A54 30 0 0 1 118 38', 5, CREAM) + [0, 1, 2, 3, 4].map((i) => { const a = Math.PI * (1 + i / 4); return `<circle cx="${f1(64 + 54 * Math.cos(a))}" cy="${f1(38 + 30 * Math.sin(a))}" r="${i === 2 ? 5.4 : 3.4}" fill="${i === 2 ? PLANTAIN : CREAM}" stroke="${INK}" stroke-width="1.8"/>`; }).join('') + shp('M3 40 13 33V47z', PLANTAIN, 2) + shp('M125 40 115 33V47z', PLANTAIN, 2), ' width="128" height="44"'),
  // phase chips: aim (reticle), power (bars), curve (hook arrow), go (ball with motion lines)
  'phase-aim': () => icon(oln('M16 4a12 12 0 1 0 .01 0z', 2.6, CREAM) + ticks4(16, 6, 13, PLANTAIN) + shp('M16 12 20 16 16 20 12 16z', PLANTAIN, 1.6)),
  'phase-power': () => icon([6, 12, 18, 24].map((x, i) => shp(`M${x} ${26} V${22 - i * 5}h5v${4 + i * 5}z`, i === 3 ? ORANGE : PLANTAIN, 2)).join('')),
  'phase-curve': () => icon(oln('M8 28C6 16 14 8 26 8', 3.4, PLANTAIN) + shp('M30 8 21 2V14z', PLANTAIN, 2)),
  'phase-go': () => icon(`<circle cx="21" cy="16" r="9" fill="${CREAM}" stroke="${INK}" stroke-width="2.4"/>` + shp('M21 11 26 16 21 21 16 16z', GOLD, 1.6) + oln('M3 10H11M1 16H9M3 22H11', 2.4, PLANTAIN)),
  // role icons: shooting (boot and ball), keeping (glove)
  'role-shoot': () => icon(shp('M4 8h10v10l8 3h5v6H4z', CREAM, 2.4) + `<path d="M8 24h16" stroke="${INK}" stroke-width="2"/>` + `<circle cx="26" cy="9" r="4.6" fill="${PLANTAIN}" stroke="${INK}" stroke-width="2"/>`),
  'role-keep': () => icon(shp('M9 28V15L6 10 9 7l4 5V4h4v8l1-9h4l-1 9 3-6 4 2-3 11v9z', PLANTAIN, 2.2) + `<path d="M10 24h13" stroke="${INK}" stroke-width="2"/>`),
  // kick results (scoreboard dots): goal = circle + tick, saved = hexagon + 3 bars, miss = square + cross, post = diamond + bar, pending = dashed ring, next = ring + dot + brackets
  'kick-goal': () => icon(`<circle cx="16" cy="16" r="13" fill="${LEAF}" stroke="${INK}" stroke-width="2.6"/>` + oln('M9 16.5 14 21.5 23 11', 3.4, INK)),
  'kick-saved': () => icon(shp('M16 2 28 9V23L16 30 4 23V9z', SKY, 2.6) + `<path d="M11 21V12M16 21V10M21 21V12" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`),
  'kick-miss': () => icon(`<rect x="3" y="3" width="26" height="26" rx="4" fill="${CREAM}" stroke="${INK}" stroke-width="2.6"/>` + oln('M10 10 22 22M22 10 10 22', 3, INK)),
  'kick-post': () => icon(shp('M16 2 30 16 16 30 2 16z', PLANTAIN, 2.6) + `<path d="M16 9V23" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`),
  'kick-pending': () => icon(`<circle cx="16" cy="16" r="12" fill="none" stroke="${CREAM}" stroke-width="2.6" stroke-dasharray="4 4" opacity=".9"/>`),
  'kick-next': () => icon(`<circle cx="16" cy="16" r="9" fill="none" stroke="${PLANTAIN}" stroke-width="2.6"/><circle cx="16" cy="16" r="3.4" fill="${PLANTAIN}"/>` + ['M3 10V3h7', 'M22 3h7v7', 'M3 22v7h7', 'M29 22v7h-7'].map((d) => oln(d, 2, PLANTAIN)).join('')),
  'badge-sudden': () => icon(shp(scallop(24, 24, 22, 14, 8), PLANTAIN, 2.6) + `<path d="M24 12V27" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/><circle cx="24" cy="35" r="2.8" fill="${INK}"/>`, 48),
  // round chips: quarter (quarter disc), semi (half disc), final (full disc with a diamond)
  'chip-qf': () => icon(`<circle cx="20" cy="20" r="17" fill="none" stroke="${CREAM}" stroke-width="2.4" stroke-dasharray="3 4"/>` + shp('M20 20V3A17 17 0 0 1 37 20z', PLANTAIN, 2.4), 40),
  'chip-sf': () => icon(`<circle cx="20" cy="20" r="17" fill="none" stroke="${CREAM}" stroke-width="2.4" stroke-dasharray="3 4"/>` + shp('M3 20A17 17 0 0 1 37 20z', PLANTAIN, 2.4), 40),
  'chip-final': () => icon(`<circle cx="20" cy="20" r="17" fill="${PLANTAIN}" stroke="${INK}" stroke-width="2.6"/>` + shp('M20 9 29 20 20 31 11 20z', WINE, 2.2), 40),
  // cup bracket state badges (20 x 20)
  'badge-won': () => icon(`<circle cx="10" cy="10" r="8.4" fill="${LEAF}" stroke="${INK}" stroke-width="2"/>` + oln('M5.6 10.4 9 13.8 14.6 6.8', 2.2, INK), 20),
  'badge-out': () => icon(`<rect x="2" y="2" width="16" height="16" rx="3" fill="${CREAM}" stroke="${INK}" stroke-width="2"/>` + oln('M6.4 6.4 13.6 13.6M13.6 6.4 6.4 13.6', 2.2, INK), 20),
  'badge-next': () => icon(shp('M3 3 17 10 3 17z', PLANTAIN, 2.2), 20),
  'badge-you': () => icon(shp('M10 1.6 12.6 7.4 19 8 14.2 12.2 15.6 18.4 10 15.2 4.4 18.4 5.8 12.2 1 8 7.4 7.4z', GOLD, 1.8), 20),
};

// ---------- banners: solid plate for text (cream on plate >= 7:1), medallion with a distinct shape ----------
const medal = (g) => `<circle cx="52" cy="48" r="38" fill="${CREAM}" stroke="${INK}" stroke-width="4"/><circle cx="52" cy="48" r="31" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="4 4"/>${g}`;
const ribbon = (plate, g, id) =>
  svg('0 0 320 96', `<defs><clipPath id="r${id}"><path d="M4 12H316L304 48 316 84H4L16 48z"/></clipPath></defs><path d="M4 12H316L304 48 316 84H4L16 48z" fill="${plate}"/><g clip-path="url(#r${id})"><rect x="0" y="12" width="320" height="7" fill="${GOLD}"/><rect x="0" y="77" width="320" height="7" fill="${GOLD}"/>${Array.from({ length: 32 }, (_, i) => `<rect x="${i * 10}" y="${i % 2 ? 12 : 77}" width="5" height="7" fill="${INK}"/>`).join('')}</g><path d="M4 12H316L304 48 316 84H4L16 48z" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>${medal(g)}`, ' width="320" height="96"');
const glyph = {
  goal: `<path d="M26 66V40h52v26" fill="none" stroke="${INK}" stroke-width="3.4"/>` + [34, 42, 50, 58, 66, 74].map((x) => `<path d="M${x} 40V66" stroke="${INK}" stroke-width="1.2"/>`).join('') + `<path d="M26 48H78M26 56H78" stroke="${INK}" stroke-width="1.2"/><circle cx="52" cy="54" r="9" fill="${PLANTAIN}" stroke="${INK}" stroke-width="2.6"/>`,
  saved: shp('M52 24 76 38V62L52 74 28 62V38z', SKY, 3.4) + `<path d="M42 58V42M52 58V38M62 58V42" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  miss: `<circle cx="40" cy="62" r="9" fill="${PLANTAIN}" stroke="${INK}" stroke-width="2.6"/>` + `<path d="M44 54C52 38 64 32 78 30" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="3 6"/>` + shp('M82 30 70 22V38z', INK, 2),
  post: `<rect x="44" y="22" width="9" height="52" rx="2" fill="${CREAM}" stroke="${INK}" stroke-width="3"/>` + `<path d="M62 34 74 30M62 48H78M62 62 74 66" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><path d="M34 34 26 30M34 48H22M34 62 26 66" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`,
  sudden: shp(scallop(52, 48, 28, 18, 8), PLANTAIN, 3.2) + `<path d="M52 36V52" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="52" cy="62" r="3.4" fill="${INK}"/>`,
  round: `<path d="M38 28h28v14a14 14 0 0 1-28 0z" fill="${GOLD2}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M46 56h12v6H46zM40 62h24v6H40z" fill="${GOLD2}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
};
export const BANNERS = {
  'result-goal': () => ribbon(GREEN, glyph.goal, 'g'),
  'result-saved': () => ribbon(INDIGO2, glyph.saved, 's'),
  'result-miss': () => ribbon('#5E1228', glyph.miss, 'm'),
  'result-post': () => ribbon(TERRA2, glyph.post, 'p'),
  'banner-sudden': () => ribbon('#241A4D', glyph.sudden, 'd'),
  'banner-round': () => ribbon('#08454E', glyph.round, 'r'),
};
/** Plate colours (text area x 96..300, y 24..72). The CSS sets cream text; checker verifies the contrast. */
export const PLATES = { 'result-goal': GREEN, 'result-saved': INDIGO2, 'result-miss': '#5E1228', 'result-post': TERRA2, 'banner-sudden': '#241A4D', 'banner-round': '#08454E' };

// ---------- scoreboard frame (340 x 92): two rows of five slot wells (player on top, CPU below) and a total well ----------
export const SB = { w: 340, h: 92, rows: [34, 66], slotX: [148, 180, 212, 244, 276], totalX: 314, slotR: 13 };
export const scoreboard = () => {
  let o = `<rect x="2" y="2" width="336" height="88" rx="14" fill="${GREEN2}" stroke="${INK}" stroke-width="3"/><rect x="2" y="2" width="336" height="9" fill="${GOLD2}"/>${Array.from({ length: 34 }, (_, i) => `<rect x="${2 + i * 10}" y="2" width="5" height="9" fill="${INK}" opacity=".7"/>`).join('')}<rect x="2" y="2" width="336" height="88" rx="14" fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-dasharray="6 4" transform="translate(0 0)" opacity=".0"/>`;
  for (const y of SB.rows) {
    o += `<rect x="8" y="${y - 13}" width="130" height="26" rx="13" fill="${GREEN}" stroke="${INK}" stroke-width="2"/>`;
    for (const x of SB.slotX) o += `<circle cx="${x}" cy="${y}" r="${SB.slotR}" fill="#04170F" stroke="${INK}" stroke-width="2"/>`;
    o += `<rect x="${SB.totalX - 15}" y="${y - 13}" width="30" height="26" rx="8" fill="${GREEN}" stroke="${INK}" stroke-width="2"/>`;
  }
  return svg('0 0 340 92', o, ' width="340" height="92"');
};

// ---------- cup bracket (360 x 420): QF 8 slots, SF 4, Final 2, winner ----------
export const BR = { w: 360, h: 420, slotW: 82, slotH: 34, cols: [4, 106, 208], winnerX: 304 };
BR.r1 = Array.from({ length: 8 }, (_, i) => 34 + 17 + i * 46);
BR.r2 = [0, 1, 2, 3].map((j) => (BR.r1[2 * j] + BR.r1[2 * j + 1]) / 2);
BR.r3 = [0, 1].map((k) => (BR.r2[2 * k] + BR.r2[2 * k + 1]) / 2);
BR.win = (BR.r3[0] + BR.r3[1]) / 2;
export const bracket = () => {
  const { slotW: sw, slotH: sh, cols } = BR;
  const line = (d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${CREAM}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 3"/>`;
  let o = '';
  const link = (from, to, c0, c1) => {
    for (let j = 0; j < to.length; j++) {
      const xr = cols[c0] + sw,
        xl = (cols[c1] ?? BR.winnerX) ,
        xm = xr + (xl - xr) / 2;
      o += line(`M${xr} ${from[2 * j]}H${xm}V${from[2 * j + 1]}H${xr}M${xm} ${to[j]}H${xl}`);
    }
  };
  link(BR.r1, BR.r2, 0, 1);
  link(BR.r2, BR.r3, 1, 2);
  o += line(`M${cols[2] + sw} ${BR.r3[0]}H${cols[2] + sw + 9}V${BR.r3[1]}H${cols[2] + sw}M${cols[2] + sw + 9} ${BR.win}H${BR.winnerX}`);
  const slot = (x, cy) => `<rect x="${x}" y="${f1(cy - sh / 2)}" width="${sw}" height="${sh}" rx="9" fill="${PAPER}" stroke="${INK}" stroke-width="2.4"/><rect x="${x + 4}" y="${f1(cy - sh / 2 + 4)}" width="26" height="${sh - 8}" rx="6" fill="#DCEFE1"/>`;
  [BR.r1, BR.r2, BR.r3].forEach((ys, c) => ys.forEach((cy) => (o += slot(cols[c], cy))));
  // winner well + column header chips
  o += `<rect x="${BR.winnerX}" y="${f1(BR.win - 34)}" width="52" height="68" rx="12" fill="${GREEN2}" stroke="${GOLD}" stroke-width="3" stroke-dasharray="6 3"/>`;
  return svg('0 0 360 420', o, ' width="360" height="420"');
};
