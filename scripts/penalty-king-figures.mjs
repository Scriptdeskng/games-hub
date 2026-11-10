// Penalty King: skeleton-driven pseudo-3D figures (keeper in front view, striker in back view). Each pose is a set of joints in a
// 128 x 128 cell (feet on y about 118, centre x 64). Limbs are drawn as round-cap strokes with an ink outline, so a pose is data.
// l / r are SCREEN sides (l = the shoulder at the lower x for an upright torso). Mirroring swaps l and r.
import { INK, HAIR, GOLD, CREAM, f1, svg, shirtPattern } from './penalty-king-common.mjs';

const P = (a) => a.map(f1).join(' ');
const seg = (pts, w, col) =>
  `<path d="M${pts.map(P).join('L')}" fill="none" stroke="${col}" stroke-width="${f1(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
const ol = (pts, w, col) => seg(pts, w + 3.4, INK) + seg(pts, w, col);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export const mirror = (pose) => {
  const o = {};
  for (const [k, v] of Object.entries(pose)) {
    const key = k.length === 2 && k.endsWith('l') ? k[0] + 'r' : k.length === 2 && k.endsWith('r') ? k[0] + 'l' : k;
    o[key] = Array.isArray(v) ? [128 - v[0], v[1]] : v;
  }
  return o;
};

const hairDecor = (style, head, view, trim) => {
  const [x, y] = head;
  const back = view === 'back';
  let s = '';
  if (style === 'bun') s += `<circle cx="${f1(x)}" cy="${f1(y - 11)}" r="5" fill="${HAIR}" stroke="${INK}" stroke-width="1.6"/>`;
  if (style === 'twists') for (const dx of [-8, -3, 3, 8]) s += seg([[x + dx, y - 6], [x + dx * 1.25, y - 12.5]], 3.6, HAIR);
  if (style === 'headband' || style === 'cornrow') {
    if (style === 'cornrow') for (const dx of [-5, 0, 5]) s += seg([[x + dx, y - 9], [x + dx * 0.8, y - 1]], 1.4, '#3A2A22');
    else s += seg([[x - 9, y - 3], [x, y - 1.5], [x + 9, y - 3]], 4.2, trim) + seg([[x - 8.6, y - 3], [x, y - 1.5], [x + 8.6, y - 3]], 1.2, CREAM);
  }
  return back || style ? s : '';
};

/**
 * @param pose joints {head,neck,hip,el,er,hl,hr,kl,kr,fl,fr, ball?}
 * @param o {kit, skin, view:'front'|'back', sleeves:'short'|'long', gloves:boolean, uid}
 */
export const figure = (pose, o) => {
  const { kit, skin, view, sleeves, gloves, uid } = o;
  const n = pose.neck,
    h = pose.hip;
  const L = Math.hypot(h[0] - n[0], h[1] - n[1]) || 1;
  const a = [(h[0] - n[0]) / L, (h[1] - n[1]) / L];
  const p = [-a[1], a[0]]; // l side
  const at = (b, k) => [b[0] + p[0] * k, b[1] + p[1] * k];
  const sL = at(n, 10.5),
    sR = at(n, -10.5),
    hL = at(h, 6.5),
    hR = at(h, -6.5);
  const ang = (Math.atan2(a[1], a[0]) * 180) / Math.PI - 90;
  const mid = lerp(n, h, 0.5);
  const torso = `M${P(sL)}L${P(sR)}L${P(hR)}L${P(hL)}z`;
  let out = `<defs><clipPath id="t${uid}"><path d="${torso}"/></clipPath></defs>`;
  out += `<ellipse cx="64" cy="121" rx="24" ry="4.2" fill="#000" opacity=".28"/>`;
  // legs: skin thigh, shorts over the top 65 percent, sock over the lower shin, boot
  for (const [hip, k, f] of [[hL, pose.kl, pose.fl], [hR, pose.kr, pose.fr]]) {
    out += ol([hip, k], 9, skin);
    out += ol([hip, lerp(hip, k, 0.7)], 13, kit.shorts);
    out += ol([lerp(k, f, 0.18), f], 8, kit.trim === INK ? kit.shirt : kit.trim);
    out += `<circle cx="${f1(f[0])}" cy="${f1(f[1] + 1)}" r="5.4" fill="#1D1D20" stroke="${INK}" stroke-width="1.6"/>`;
  }
  out += `<path d="${torso}" fill="${kit.shirt}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>`;
  out += `<g clip-path="url(#t${uid})"><g transform="translate(${P(mid)}) rotate(${f1(ang)})">${shirtPattern(kit.pattern, kit.trim, 21, f1(L))}</g></g>`;
  out += `<path d="${torso}" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
  // arms
  for (const [sh, e, hd] of [[sL, pose.el, pose.hl], [sR, pose.er, pose.hr]]) {
    if (sleeves === 'long') out += ol([sh, e, hd], 7.4, kit.shirt);
    else {
      out += ol([sh, e, hd], 6.4, skin);
      out += ol([sh, lerp(sh, e, 0.62)], 8.2, kit.shirt);
    }
    out += gloves
      ? `<circle cx="${f1(hd[0])}" cy="${f1(hd[1])}" r="5.6" fill="${GOLD}" stroke="${INK}" stroke-width="2"/>`
      : `<circle cx="${f1(hd[0])}" cy="${f1(hd[1])}" r="3.4" fill="${skin}" stroke="${INK}" stroke-width="1.6"/>`;
  }
  if (pose.ball) out += `<circle cx="${pose.ball[0]}" cy="${pose.ball[1]}" r="8.5" fill="${CREAM}" stroke="${INK}" stroke-width="2.4"/><path d="M${pose.ball[0] - 3.5} ${pose.ball[1]}l3.5 -3.5 3.5 3.5 -3.5 3.5z" fill="${GOLD}" stroke="${INK}" stroke-width="1.2"/>`;
  // neck and head
  const hd = pose.head;
  out += ol([n, lerp(n, hd, 0.7)], 7, skin);
  if (view === 'back') {
    out += `<circle cx="${f1(hd[0] - 9.4)}" cy="${f1(hd[1] + 1)}" r="2.6" fill="${skin}" stroke="${INK}" stroke-width="1.4"/><circle cx="${f1(hd[0] + 9.4)}" cy="${f1(hd[1] + 1)}" r="2.6" fill="${skin}" stroke="${INK}" stroke-width="1.4"/>`;
    out += `<circle cx="${f1(hd[0])}" cy="${f1(hd[1])}" r="9.6" fill="${HAIR}" stroke="${INK}" stroke-width="2"/>`;
    out += `<path d="M${f1(hd[0] - 6)} ${f1(hd[1] + 8)}q6 3 12 0" fill="none" stroke="${skin}" stroke-width="2.6" stroke-linecap="round"/>`;
  } else {
    out += `<circle cx="${f1(hd[0])}" cy="${f1(hd[1])}" r="9.6" fill="${skin}" stroke="${INK}" stroke-width="2"/>`;
    out += `<path d="M${f1(hd[0] - 9.6)} ${f1(hd[1] - 1)}a9.6 9.6 0 0 1 19.2 0c-3-4-6-5.4-9.6-5.4s-6.6 1.4-9.6 5.4z" fill="${HAIR}"/>`;
    out += `<circle cx="${f1(hd[0] - 3.6)}" cy="${f1(hd[1] + 1.4)}" r="1.3" fill="${INK}"/><circle cx="${f1(hd[0] + 3.6)}" cy="${f1(hd[1] + 1.4)}" r="1.3" fill="${INK}"/><path d="M${f1(hd[0] - 3)} ${f1(hd[1] + 5.4)}q3 2.4 6 0" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`;
  }
  out += hairDecor(o.hair, hd, view, kit.trim);
  return out;
};

// ---------- poses (128 x 128 cell) ----------
const sym = (hd, nk, hp, kn, ft, el, ha) => ({ head: hd, neck: nk, hip: hp, kl: kn[0], kr: kn[1], fl: ft[0], fr: ft[1], el: el[0], er: el[1], hl: ha[0], hr: ha[1] });
const diveLowL = { head: [22, 96], neck: [34, 99], hip: [70, 105], el: [20, 110], er: [18, 88], hl: [5, 112], hr: [4, 86], kl: [90, 113], kr: [92, 99], fl: [110, 117], fr: [113, 104] };
const diveHighL = { head: [27, 47], neck: [38, 57], hip: [70, 87], el: [20, 56], er: [31, 33], hl: [6, 50], hr: [20, 18], kl: [92, 100], kr: [97, 88], fl: [112, 113], fr: [118, 100] };
export const KEEPER_POSES = {
  ready: sym([64, 47], [64, 60], [64, 87], [[48, 103], [80, 103]], [[42, 118], [86, 118]], [[40, 74], [88, 74]], [[32, 90], [96, 90]]),
  stand: sym([64, 36], [64, 50], [64, 80], [[58, 100], [70, 100]], [[56, 118], [72, 118]], [[46, 66], [82, 66]], [[40, 82], [88, 82]]),
  'dive-low-l': diveLowL,
  'dive-high-l': diveHighL,
  'dive-low-r': mirror(diveLowL),
  'dive-high-r': mirror(diveHighL),
  'dive-centre': sym([64, 28], [64, 42], [64, 74], [[58, 94], [70, 94]], [[56, 110], [72, 106]], [[50, 24], [78, 24]], [[46, 6], [82, 6]]),
  save: { ...sym([64, 48], [64, 61], [64, 89], [[52, 106], [76, 106]], [[46, 118], [82, 118]], [[48, 76], [80, 76]], [[58, 72], [70, 72]]), ball: [64, 74] },
  beaten: sym([64, 60], [64, 70], [64, 95], [[52, 111], [76, 111]], [[44, 118], [84, 118]], [[44, 90], [84, 90]], [[40, 108], [88, 108]]),
};
export const KEEPER_ORDER = ['ready', 'stand', 'dive-low-l', 'dive-high-l', 'dive-low-r', 'dive-high-r', 'dive-centre', 'save', 'beaten'];

const run1 = { head: [64, 38], neck: [64, 52], hip: [64, 81], kl: [56, 92], kr: [73, 99], fl: [51, 110], fr: [82, 114], el: [50, 68], er: [80, 66], hl: [46, 82], hr: [86, 80] };
const sym2 = sym;
export const STRIKER_POSES = {
  idle: sym2([64, 36], [64, 50], [64, 80], [[58, 100], [70, 100]], [[56, 118], [72, 118]], [[50, 66], [78, 66]], [[48, 82], [80, 82]]),
  run1,
  run2: mirror(run1),
  plant: { head: [60, 38], neck: [60, 52], hip: [61, 82], kl: [57, 101], kr: [75, 97], fl: [54, 118], fr: [87, 105], el: [42, 62], er: [86, 66], hl: [28, 66], hr: [96, 58] },
  strike: { head: [62, 40], neck: [62, 54], hip: [62, 82], kl: [56, 101], kr: [72, 84], fl: [54, 118], fr: [74, 66], el: [42, 62], er: [88, 62], hl: [30, 56], hr: [98, 54] },
  follow: { head: [58, 38], neck: [59, 52], hip: [60, 80], kl: [55, 100], kr: [73, 72], fl: [53, 118], fr: [80, 54], el: [40, 58], er: [88, 56], hl: [28, 48], hr: [98, 44] },
  celebrate: { head: [64, 30], neck: [64, 44], hip: [64, 74], kl: [58, 94], kr: [70, 94], fl: [56, 108], fr: [72, 106], el: [48, 30], er: [80, 30], hl: [42, 12], hr: [86, 12] },
  dejected: { head: [64, 48], neck: [64, 60], hip: [64, 85], kl: [58, 103], kr: [70, 103], fl: [56, 118], fr: [72, 118], el: [42, 72], er: [86, 72], hl: [52, 84], hr: [76, 84] },
  salute: { head: [64, 36], neck: [64, 50], hip: [64, 80], kl: [58, 100], kr: [70, 100], fl: [56, 118], fr: [72, 118], el: [46, 70], er: [90, 54], hl: [52, 82], hr: [96, 34] },
};
export const STRIKER_ORDER = ['idle', 'run1', 'run2', 'plant', 'strike', 'follow', 'celebrate', 'dejected', 'salute'];

/** 3 x 3 sprite sheet, 128-unit cells, 384 x 384. Cell i is at column i % 3, row floor(i / 3). */
export const sheet = (order, poses, o) =>
  svg(
    '0 0 384 384',
    order
      .map((k, i) => `<g transform="translate(${(i % 3) * 128} ${Math.floor(i / 3) * 128})">${figure(poses[k], { ...o, uid: `${o.id}${i}` })}</g>`)
      .join(''),
    ' width="384" height="384"',
  );
