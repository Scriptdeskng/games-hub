#!/usr/bin/env node
// Generates the original SVG art for Draughts Naija (asset-designer, in-repo). No <text>, no <image>, no external refs.
// World: a terracotta Arewa-relief frame (Zaria / Kano wall geometry), an adire-indigo board with sand light squares,
// ivory vs carved-iroko pieces, an aso-oke seam, a night-indigo adire cloth table. Pieces sit on the DARK squares only.
// Output: games/draughts-naija/assets/{bg,board,pieces,states,fx,hud,icon,avatars,thumb,audio}. ART_OUT overrides the folder.
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from './draughts-naija-common.mjs';
import { AVATARS, VOICE } from './draughts-naija-people.mjs';

const {
  INK,
  CREAM,
  SAND,
  INDIGO,
  INDIGO2,
  INDIGO3,
  SKY,
  TERRA,
  TERRA2,
  TERRA3,
  OCHRE,
  GOLD,
  PLANTAIN,
} = C;
const { svg, f1, inner, scallop, reliefTile, adireTile, PIECES, pieceSvg } = C;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.ART_OUT ?? join(ROOT, 'games', 'draughts-naija', 'assets');
const w = (p, s) => {
  mkdirSync(dirname(join(OUT, p)), { recursive: true });
  writeFileSync(join(OUT, p), s);
};
export const FRAME = 14; // frame width in board units (viewBox 340)
export const dark = (r, c) => (r + c) % 2 === 1; // bottom-left square is dark for every N

// ---------- board (340 x 340) ----------
export const boardSvg = (n) => {
  const cell = (340 - FRAME * 2) / n;
  let d = '';
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (dark(r, c))
        d += `M${f1(FRAME + c * cell)} ${f1(FRAME + r * cell)}h${f1(cell)}v${f1(cell)}h${f1(-cell)}z`;
  const akwete = (x, y) =>
    `<path d="M${x} ${y - 5.5} ${x + 5.5} ${y} ${x} ${y + 5.5} ${x - 5.5} ${y}z" fill="${PLANTAIN}" stroke="${INK}" stroke-width="1.6"/>`;
  const a = FRAME / 2;
  return svg(
    '0 0 340 340',
    `<defs>${reliefTile('rf')}${adireTile('ad', 20, 0.22)}<pattern id="ak" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M8 2 14 8 8 14 2 8z" fill="none" stroke="${TERRA}" stroke-width="1.4" opacity=".22"/></pattern></defs>` +
      `<rect width="340" height="340" rx="12" fill="${TERRA}"/><rect width="340" height="340" rx="12" fill="url(#rf)"/>` +
      `<rect x="1.5" y="1.5" width="337" height="337" rx="11" fill="none" stroke="${INK}" stroke-width="3"/>` +
      `<rect x="${FRAME - 3.5}" y="${FRAME - 3.5}" width="${340 - FRAME * 2 + 7}" height="${340 - FRAME * 2 + 7}" fill="none" stroke="${CREAM}" stroke-width="2.6" stroke-dasharray="7 3.5"/>` +
      `<rect x="${FRAME}" y="${FRAME}" width="${340 - FRAME * 2}" height="${340 - FRAME * 2}" fill="${SAND}"/>` +
      `<rect x="${FRAME}" y="${FRAME}" width="${340 - FRAME * 2}" height="${340 - FRAME * 2}" fill="url(#ak)"/>` +
      `<path d="${d}" fill="${INDIGO}"/><path d="${d}" fill="url(#ad)"/>` +
      `<rect x="${FRAME}" y="${FRAME}" width="${340 - FRAME * 2}" height="${340 - FRAME * 2}" fill="none" stroke="${INK}" stroke-width="2.4"/>` +
      akwete(a, a) +
      akwete(340 - a, a) +
      akwete(a, 340 - a) +
      akwete(340 - a, 340 - a),
  );
};

// ---------- stage backdrop ----------
const stage = (W, H) => {
  const wallH = Math.round(H * 0.4);
  const aw = Math.min(60, W / 6);
  const n = Math.floor(W / aw);
  const x0 = (W - n * aw) / 2;
  const arches = Array.from({ length: n }, (_, i) => {
    const x = x0 + i * aw + 5,
      ww = aw - 10,
      yb = wallH - 14,
      y1 = wallH * 0.42;
    return `<path d="M${f1(x)} ${yb}V${f1(y1)}Q${f1(x)} ${f1(y1 - ww * 0.55)} ${f1(x + ww / 2)} ${f1(y1 - ww * 0.8)}Q${f1(x + ww)} ${f1(y1 - ww * 0.55)} ${f1(x + ww)} ${f1(y1)}V${yb}z" fill="${TERRA3}" stroke="${OCHRE}" stroke-width="1.6" stroke-opacity=".45"/>`;
  }).join('');
  const spikes = Array.from(
    { length: Math.ceil(W / 24) },
    (_, i) => `M${i * 24} 0h24l-12 14z`,
  ).join('');
  const bands = [INDIGO, CREAM, SKY, TERRA, CREAM, INDIGO];
  const stripes = bands
    .map((c, i) => `<rect x="0" y="${wallH + i * 3}" width="${W}" height="3" fill="${c}"/>`)
    .join('');
  return svg(
    `0 0 ${W} ${H}`,
    `<defs><linearGradient id="gw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${TERRA2}"/><stop offset="1" stop-color="${TERRA3}"/></linearGradient><linearGradient id="gt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INDIGO2}"/><stop offset="1" stop-color="${INDIGO3}"/></linearGradient>${reliefTile('rs', 32, '#2E1409', '#B55F38')}${adireTile('at', 48, 0.16)}</defs>` +
      `<rect width="${W}" height="${H}" fill="url(#gt)"/><rect width="${W}" height="${H}" fill="url(#at)"/>` +
      `<rect width="${W}" height="${wallH}" fill="url(#gw)"/><rect width="${W}" height="${wallH}" fill="url(#rs)" opacity=".7"/>` +
      `<path d="${spikes}" fill="${TERRA3}"/>${arches}` +
      stripes +
      `<rect x="0" y="${wallH + 18}" width="${W}" height="10" fill="#000" opacity=".25"/>`,
  );
};

// ---------- square-state overlays (64 x 64, drawn on top of or under a piece; ink outline + light core, so never colour alone) ----------
const ringPair = (r, wd, col, extra = '') =>
  `<circle cx="32" cy="32" r="${r}" fill="none" stroke="${INK}" stroke-width="${wd + 3}"${extra}/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${col}" stroke-width="${wd}"${extra}/>`;
const brackets = (col) =>
  ['M4 15V4h11', 'M49 4h11v11', 'M4 49v11h11', 'M49 60h11V49']
    .map(
      (p) =>
        `<path d="${p}" fill="none" stroke="${INK}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="${p}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('');
const cross = `<path d="M15 15 49 49M49 15 15 49" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M15 15 49 49M49 15 15 49" stroke="${PLANTAIN}" stroke-width="5.4" stroke-linecap="round"/>`;
const tick4 = (col) =>
  ['M32 1v7', 'M32 56v7', 'M1 32h7', 'M56 32h7']
    .map(
      (p) =>
        `<path d="${p}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="${p}" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`,
    )
    .join('');
const STATES = {
  // piece chosen: solid double ring + four corner brackets (solid shapes)
  'sq-select': ringPair(28.5, 4, GOLD) + brackets(PLANTAIN),
  // legal destination: dashed ring around a solid dot
  'sq-move': `${ringPair(17, 3, PLANTAIN, ' stroke-dasharray="6 4.5"')}<circle cx="32" cy="32" r="6.4" fill="${PLANTAIN}" stroke="${INK}" stroke-width="2.6"/>`,
  // capture path landing stone: gold diamond with a dashed inner line (step number sits on it as DOM text)
  'sq-path': `<path d="M32 6 58 32 32 58 6 32z" fill="${PLANTAIN}" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/><path d="M32 14 50 32 32 50 14 32z" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="3 3" opacity=".7"/>`,
  // piece that can be taken: a cross over it
  'sq-capture': cross,
  // piece jumped on the previewed path: cross plus dashed ring
  'sq-jumped': `${ringPair(28.5, 2.4, CREAM, ' stroke-dasharray="3 4"')}${cross}`,
  // last move, from-square: dotted diamond
  'sq-last-from': `<path d="M32 7 57 32 32 57 7 32z" fill="none" stroke="${INK}" stroke-width="6.4" stroke-linejoin="round"/><path d="M32 7 57 32 32 57 7 32z" fill="none" stroke="${CREAM}" stroke-width="3" stroke-dasharray="1 5.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  // last move, to-square: four solid corner triangles
  'sq-last-to': ['M3 3h14L3 17z', 'M61 3H47l14 14z', 'M3 61h14L3 47z', 'M61 61H47l14-14z']
    .map(
      (p) =>
        `<path d="${p}" fill="${CREAM}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`,
    )
    .join(''),
  // hint: dashed double ring with four ticks
  'sq-hint': `${ringPair(28.5, 3, PLANTAIN, ' stroke-dasharray="6 5"')}<circle cx="32" cy="32" r="22" fill="none" stroke="${CREAM}" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>${tick4(PLANTAIN)}`,
};
// must-capture badge for a piece corner (24 x 24): warning triangle with an exclamation mark
const mustBadge = () =>
  svg(
    '0 0 24 24',
    `<path d="M12 2 23 21H1z" fill="${PLANTAIN}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 9v6" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/><circle cx="12" cy="18" r="1.6" fill="${INK}"/>`,
  );

// ---------- fx (200 x 200) ----------
const fxRing = () =>
  svg(
    '0 0 200 200',
    [28, 56, 84]
      .map(
        (r, i) =>
          `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${INK}" stroke-width="${10 - i * 2}" opacity="${1 - i * 0.2}"/><circle cx="100" cy="100" r="${r}" fill="none" stroke="${i === 1 ? CREAM : PLANTAIN}" stroke-width="${5 - i}"${i === 2 ? ' stroke-dasharray="9 7"' : ''}/>`,
      )
      .join(''),
  );
const fxRibbons = () => {
  const cols = [PLANTAIN, TERRA, SKY, CREAM, OCHRE, '#E4702A', GOLD, '#8FB4FF'];
  const rb = cols
    .map(
      (c, i) =>
        `<g transform="rotate(${i * 45} 100 100)"><path d="M100 76C110 62 98 48 108 32c6-8 14-6 12 2-2 8-10 14-10 28" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M100 76C110 62 98 48 108 32c6-8 14-6 12 2-2 8-10 14-10 28" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/></g>`,
    )
    .join('');
  return svg(
    '0 0 200 200',
    `${rb}<circle cx="100" cy="100" r="16" fill="${GOLD}" stroke="${INK}" stroke-width="4"/><path d="M100 90 110 100 100 110 90 100z" fill="${CREAM}"/>`,
  );
};
const fxCrown = () => {
  const sp = Array.from(
    { length: 8 },
    (_, i) =>
      `<path d="M100 18 106 44 100 40 94 44z" transform="rotate(${i * 45} 100 100)" fill="${PLANTAIN}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
  ).join('');
  const dm = Array.from(
    { length: 8 },
    (_, i) =>
      `<path d="M100 6 105 12 100 18 95 12z" transform="rotate(${i * 45 + 22.5} 100 100)" fill="${CREAM}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`,
  ).join('');
  return svg(
    '0 0 200 200',
    `${sp}${dm}<circle cx="100" cy="100" r="30" fill="${GOLD}" stroke="${INK}" stroke-width="4"/><g transform="translate(68 66) scale(1)">${C.CROWN}</g>`,
  );
};
// talking-drum (gangan) hourglass: the "whose turn" icon
const turnDrum = () =>
  svg(
    '0 0 32 32',
    `<path d="M5 5c8 2 14 2 22 0 1 4-2 8-8 11 6 3 9 7 8 11-8-2-14-2-22 0-1-4 2-8 8-11C7 13 4 9 5 5z" fill="${GOLD}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M8 7c5 1.2 11 1.2 16 0M8 25c5-1.2 11-1.2 16 0" stroke="${INK}" stroke-width="1.6" fill="none"/><path d="M7 5 25 27M25 5 7 27" stroke="${TERRA2}" stroke-width="1.2" opacity=".7"/>`,
  );
// capture-count / tray: reuse piece svgs. Menu mark: rosette, a corner of the board, one man and one king.
const menuMark = () =>
  svg(
    '0 0 128 128',
    `<path d="${scallop(64, 66, 60, 50, 12)}" fill="#00000050"/><path d="${scallop(64, 64, 60, 50, 12)}" fill="${GOLD}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="64" cy="64" r="42" fill="${TERRA2}" stroke="${CREAM}" stroke-width="3"/><rect x="34" y="34" width="60" height="60" fill="${SAND}"/><path d="M64 34h30v30H64zM34 64h30v30H34z" fill="${INDIGO}"/><rect x="34" y="34" width="60" height="60" fill="none" stroke="${INK}" stroke-width="3"/><g transform="translate(35 65) scale(.44)">${PIECES['man-light']()}</g><g transform="translate(65 35) scale(.44)">${PIECES['king-dark']()}</g>`,
  );

// ---------- thumbs: board corner, a capture path and a king ----------
const thumb = (W, H) => {
  const s = Math.min(W, H) / 512,
    size = 400 * s,
    gx = W / 2 - size / 2,
    gy = H / 2 - size / 2,
    k = size / 340,
    cell = (312 / 8) * k,
    o = FRAME * k;
  const at = (r, c) => [gx + o + c * cell, gy + o + r * cell];
  const pc = (kind, r, c) => {
    const [x, y] = at(r, c),
      sc = (cell * 0.84) / 64;
    return `<g transform="translate(${f1(x + cell * 0.08)} ${f1(y + cell * 0.08)}) scale(${f1(sc)})">${PIECES[kind]()}</g>`;
  };
  const ctr = (r, c) =>
    at(r, c)
      .map((v) => f1(v + cell / 2))
      .join(' ');
  const path = `<path d="M${ctr(5, 2)}L${ctr(3, 4)}L${ctr(1, 2)}" fill="none" stroke="${INK}" stroke-width="${f1(10 * s)}" stroke-linecap="round" stroke-linejoin="round"/><path d="M${ctr(5, 2)}L${ctr(3, 4)}L${ctr(1, 2)}" fill="none" stroke="${PLANTAIN}" stroke-width="${f1(5 * s)}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${f1(12 * s)} ${f1(9 * s)}"/>`;
  const dia = (r, c) => {
    const [x, y] = at(r, c);
    return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(cell / 64)})">${STATES['sq-path']}</g>`;
  };
  const crossAt = (r, c) => {
    const [x, y] = at(r, c);
    return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(cell / 64)})">${STATES['sq-capture']}</g>`;
  };
  return svg(
    `0 0 ${W} ${H}`,
    `${inner(stage(W, H))}<g transform="translate(${f1(gx)} ${f1(gy)}) scale(${f1(k)})">${inner(boardSvg(8))}</g>` +
      pc('man-light', 5, 2) +
      pc('man-dark', 4, 3) +
      pc('man-dark', 2, 3) +
      pc('man-dark', 6, 5) +
      pc('man-light', 7, 4) +
      pc('man-light', 6, 1) +
      pc('king-light', 3, 6) +
      pc('man-dark', 0, 1) +
      pc('king-dark', 2, 7) +
      path +
      dia(1, 2) +
      dia(3, 4) +
      crossAt(4, 3) +
      crossAt(2, 3),
  );
};

// ---------- run ----------
export { VOICE };
export const build = () => {
  w('bg/stage-portrait.svg', stage(360, 640));
  w('bg/stage-landscape.svg', stage(640, 360));
  w('board/board-10.svg', boardSvg(10));
  w('board/board-8.svg', boardSvg(8));
  for (const k of Object.keys(PIECES)) w(`pieces/${k}.svg`, pieceSvg(k));
  for (const [k, body] of Object.entries(STATES)) w(`states/${k}.svg`, svg('0 0 64 64', body));
  w('states/piece-must.svg', mustBadge());
  w('fx/capture-ring.svg', fxRing());
  w('fx/capture-ribbons.svg', fxRibbons());
  w('fx/crown-burst.svg', fxCrown());
  w('hud/turn-drum.svg', turnDrum());
  w('icon/menu-mark.svg', menuMark());
  for (const [id, fn] of Object.entries(AVATARS)) w(`avatars/${id}.svg`, fn());
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
  for (const m of ['draughts-menu-hausa', 'draughts-play-hausa'])
    cp(join(SRC, 'music', 'ludo-menu-highlife.mp3'), `audio/music/${m}.mp3`);
  for (const v of VOICE) cp(join(SRC, 'voice', 'vo-ld-six.mp3'), `audio/voice/vo-${v.id}.mp3`);
  w(
    'audio/voice-manifest.json',
    JSON.stringify(
      {
        _readme:
          'Draughts Naija voice placeholders (silent mp3, ogg null until human delivery). Speaker: the table umpire (neutral voice, not a persona). Shared lines (oya, madalla, e-ku-ise, you-don-win, e-don-do) live in packages/core/assets/audio/voice-manifest.json.',
        lines: VOICE.map((v) => ({
          id: v.id,
          speaker: 'umpire',
          text: { pcm: v.pcm, en: v.en },
          files: { mp3: `voice/vo-${v.id}.mp3`, ogg: null },
          emotion: v.note,
          usedFor: v.used,
          status: 'placeholder-silent-mp3',
          needsNativeReview: true,
          _review: true,
        })),
      },
      null,
      2,
    ) + '\n',
  );
};
if (process.argv[1] === fileURLToPath(import.meta.url)) build();
