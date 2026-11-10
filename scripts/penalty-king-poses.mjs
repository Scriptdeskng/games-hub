// Penalty King sprite poses (128 x 128 cell): keeper and striker joint positions, mirrored for the right-hand poses.
export const mirror = (pose) => {
  const o = {};
  for (const [k, v] of Object.entries(pose)) {
    const key =
      k.length === 2 && k.endsWith('l')
        ? k[0] + 'r'
        : k.length === 2 && k.endsWith('r')
          ? k[0] + 'l'
          : k;
    o[key] = Array.isArray(v) ? [128 - v[0], v[1]] : v;
  }
  return o;
};

// ---------- poses (128 x 128 cell) ----------
const sym = (hd, nk, hp, kn, ft, el, ha) => ({
  head: hd,
  neck: nk,
  hip: hp,
  kl: kn[0],
  kr: kn[1],
  fl: ft[0],
  fr: ft[1],
  el: el[0],
  er: el[1],
  hl: ha[0],
  hr: ha[1],
});
const diveLowL = {
  head: [22, 96],
  neck: [34, 99],
  hip: [70, 105],
  el: [20, 110],
  er: [18, 88],
  hl: [5, 112],
  hr: [4, 86],
  kl: [90, 113],
  kr: [92, 99],
  fl: [110, 117],
  fr: [113, 104],
};
const diveHighL = {
  head: [27, 47],
  neck: [38, 57],
  hip: [70, 87],
  el: [20, 56],
  er: [31, 33],
  hl: [6, 50],
  hr: [20, 18],
  kl: [92, 100],
  kr: [97, 88],
  fl: [112, 113],
  fr: [118, 100],
};
export const KEEPER_POSES = {
  ready: sym(
    [64, 47],
    [64, 60],
    [64, 87],
    [
      [48, 103],
      [80, 103],
    ],
    [
      [42, 118],
      [86, 118],
    ],
    [
      [40, 74],
      [88, 74],
    ],
    [
      [32, 90],
      [96, 90],
    ],
  ),
  stand: sym(
    [64, 36],
    [64, 50],
    [64, 80],
    [
      [58, 100],
      [70, 100],
    ],
    [
      [56, 118],
      [72, 118],
    ],
    [
      [46, 66],
      [82, 66],
    ],
    [
      [40, 82],
      [88, 82],
    ],
  ),
  'dive-low-l': diveLowL,
  'dive-high-l': diveHighL,
  'dive-low-r': mirror(diveLowL),
  'dive-high-r': mirror(diveHighL),
  'dive-centre': sym(
    [64, 28],
    [64, 42],
    [64, 74],
    [
      [58, 94],
      [70, 94],
    ],
    [
      [56, 110],
      [72, 106],
    ],
    [
      [50, 24],
      [78, 24],
    ],
    [
      [46, 6],
      [82, 6],
    ],
  ),
  save: {
    ...sym(
      [64, 48],
      [64, 61],
      [64, 89],
      [
        [52, 106],
        [76, 106],
      ],
      [
        [46, 118],
        [82, 118],
      ],
      [
        [48, 76],
        [80, 76],
      ],
      [
        [58, 72],
        [70, 72],
      ],
    ),
    ball: [64, 74],
  },
  beaten: sym(
    [64, 60],
    [64, 70],
    [64, 95],
    [
      [52, 111],
      [76, 111],
    ],
    [
      [44, 118],
      [84, 118],
    ],
    [
      [44, 90],
      [84, 90],
    ],
    [
      [40, 108],
      [88, 108],
    ],
  ),
};
export const KEEPER_ORDER = [
  'ready',
  'stand',
  'dive-low-l',
  'dive-high-l',
  'dive-low-r',
  'dive-high-r',
  'dive-centre',
  'save',
  'beaten',
];

const run1 = {
  head: [64, 38],
  neck: [64, 52],
  hip: [64, 81],
  kl: [56, 92],
  kr: [73, 99],
  fl: [51, 110],
  fr: [82, 114],
  el: [50, 68],
  er: [80, 66],
  hl: [46, 82],
  hr: [86, 80],
};
const sym2 = sym;
export const STRIKER_POSES = {
  idle: sym2(
    [64, 36],
    [64, 50],
    [64, 80],
    [
      [58, 100],
      [70, 100],
    ],
    [
      [56, 118],
      [72, 118],
    ],
    [
      [50, 66],
      [78, 66],
    ],
    [
      [48, 82],
      [80, 82],
    ],
  ),
  run1,
  run2: mirror(run1),
  plant: {
    head: [60, 38],
    neck: [60, 52],
    hip: [61, 82],
    kl: [57, 101],
    kr: [75, 97],
    fl: [54, 118],
    fr: [87, 105],
    el: [42, 62],
    er: [86, 66],
    hl: [28, 66],
    hr: [96, 58],
  },
  strike: {
    head: [62, 40],
    neck: [62, 54],
    hip: [62, 82],
    kl: [56, 101],
    kr: [72, 84],
    fl: [54, 118],
    fr: [74, 66],
    el: [42, 62],
    er: [88, 62],
    hl: [30, 56],
    hr: [98, 54],
  },
  follow: {
    head: [58, 38],
    neck: [59, 52],
    hip: [60, 80],
    kl: [55, 100],
    kr: [73, 72],
    fl: [53, 118],
    fr: [80, 54],
    el: [40, 58],
    er: [88, 56],
    hl: [28, 48],
    hr: [98, 44],
  },
  celebrate: {
    head: [64, 30],
    neck: [64, 44],
    hip: [64, 74],
    kl: [58, 94],
    kr: [70, 94],
    fl: [56, 108],
    fr: [72, 106],
    el: [48, 30],
    er: [80, 30],
    hl: [42, 12],
    hr: [86, 12],
  },
  dejected: {
    head: [64, 48],
    neck: [64, 60],
    hip: [64, 85],
    kl: [58, 103],
    kr: [70, 103],
    fl: [56, 118],
    fr: [72, 118],
    el: [42, 72],
    er: [86, 72],
    hl: [52, 84],
    hr: [76, 84],
  },
  salute: {
    head: [64, 36],
    neck: [64, 50],
    hip: [64, 80],
    kl: [58, 100],
    kr: [70, 100],
    fl: [56, 118],
    fr: [72, 118],
    el: [46, 70],
    er: [90, 54],
    hl: [52, 82],
    hr: [96, 34],
  },
};
export const STRIKER_ORDER = [
  'idle',
  'run1',
  'run2',
  'plant',
  'strike',
  'follow',
  'celebrate',
  'dejected',
  'salute',
];

/** 3 x 3 sprite sheet, 128-unit cells, 384 x 384. Cell i is at column i % 3, row floor(i / 3). */
