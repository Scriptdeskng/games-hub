// Penalty King: CPU rival persona busts and the commentator voice lines (asset-designer).
// Roster (Easy / Medium / Hard): Ozavize (Ebira, Okene, Kogi: North-Central), Ndako (Nupe, Bida, Niger State: North-Central),
// Hamman (Fulani, Yola, Adamawa: North-East). Regions are chosen to avoid repeating the personas the catalogue already has.
// Placeholder shape-built busts, 128 viewBox, same format as the core avatars. Skin tones stay in the guide's range.
import { svg, GOLD, CREAM, INK, PLANTAIN, ORANGE, f1 } from './penalty-king-common.mjs';

const HAIR = '#1a0f0a';
const bust = ({ bg, skin, shirt, hair, extra = '', title, beard = '' }) =>
  svg(
    '0 0 128 128',
    `<title>${title}</title><path fill="${bg}" d="M0 0h128v128H0z"/><circle cx="64" cy="62" r="50" fill="#fff" opacity=".2"/><path fill="${shirt}" d="M8 128c0-28 26-38 56-38s56 10 56 38Z"/><rect width="20" height="24" x="54" y="74" fill="${skin}" rx="7"/><path fill="#000" opacity=".15" d="M54 82h20v6q-10 6-20 0z"/>${hair.back ?? ''}<ellipse cx="64" cy="58" rx="24" ry="28" fill="${skin}"/>${beard}${hair.front ?? ''}<ellipse cx="54" cy="58" rx="4.2" ry="3.8" fill="#fff"/><circle cx="54" cy="58.4" r="2.5" fill="#1a0f0a"/><circle cx="55" cy="57.4" r=".9" fill="#fff"/><ellipse cx="74" cy="58" rx="4.2" ry="3.8" fill="#fff"/><circle cx="74" cy="58.4" r="2.5" fill="#1a0f0a"/><circle cx="75" cy="57.4" r=".9" fill="#fff"/><path d="M48 49q6-5 12-1m8 0q6-4 12 1" fill="none" stroke="#1a0f0a" stroke-width="3" stroke-linecap="round"/><path d="M58 72q6 6 12 0" fill="none" stroke="#7a2a1a" stroke-width="3" stroke-linecap="round"/>${extra}`,
    ' width="128" height="128"',
  );
const glove = (x, y) =>
  `<circle cx="${x}" cy="${y}" r="11" fill="${GOLD}" stroke="${INK}" stroke-width="3"/><path d="M${x - 5} ${y + 5}V${y - 3}M${x} ${y + 5}V${y - 5}M${x + 5} ${y + 5}V${y - 3}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;

// Ozavize: Ebira, Okene (Kogi), 40s. A physiotherapist who keeps goal in a community league: warm, chatty, dives early.
// Keeper top in the neutral keeper cyan, gold gloves held up, short natural hair with an aso-oke strip headband.
export const ozavize = () =>
  bust({
    title: 'Ozavize',
    bg: GOLD,
    skin: '#7A4A2D',
    shirt: '#59C8E8',
    hair: {
      front: `<path d="M40 56c-4-24 10-36 24-36s28 12 24 36c-6-10-14-14-24-14s-18 4-24 14z" fill="${HAIR}"/><path d="M40 47q24-10 48 0" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M40 47q24-10 48 0" fill="none" stroke="#8C1D3D" stroke-width="4" stroke-linecap="round"/><path d="M42 44q22-8 44 0" fill="none" stroke="${CREAM}" stroke-width="1.4" stroke-dasharray="4 3"/>`,
    },
    extra: `<path d="M44 94c6 8 14 12 20 12s14-4 20-12" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>${glove(20, 112)}${glove(108, 112)}<circle cx="40" cy="68" r="3.2" fill="none" stroke="${GOLD}" stroke-width="2.2"/><circle cx="88" cy="68" r="3.2" fill="none" stroke="${GOLD}" stroke-width="2.2"/>`,
  });
// Ndako: Nupe, Bida (Niger State), 20s. A junior surveyor who plays Saturday leagues; measures angles, reads patterns.
// Orange training bib with an akwete diamond over a white tee, low fade, short beard.
export const ndako = () =>
  bust({
    title: 'Ndako',
    bg: '#FF7A63',
    skin: '#A06A44',
    shirt: '#F3FAF4',
    hair: {
      front: `<path d="M42 50c0-15 9-24 22-24s22 9 22 24c-4-6-10-8-22-8s-18 2-22 8z" fill="${HAIR}"/>`,
    },
    beard: `<path d="M41 62c1 16 9 24 23 24s22-8 23-24c-4 8-10 12-23 12S45 70 41 62z" fill="${HAIR}" opacity=".85"/><path d="M56 74q8 4 16 0" fill="none" stroke="#a9644f" stroke-width="3" stroke-linecap="round"/>`,
    extra: `<path d="M34 128 44 98H84L94 128z" fill="${ORANGE}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M64 104 74 114 64 124 54 114z" fill="${CREAM}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M54 92q10 8 20 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  });
// Hamman: Fulani, Yola (Adamawa), 30s. The stadium groundsman who knows every bounce of the pitch; calm, sporting, never gloats.
// Cream pitch-side coat with two lawn-stripe greens on the shoulders, shaved head, neat goatee.
export const hamman = () =>
  bust({
    title: 'Hamman',
    bg: '#0E7C86',
    skin: '#47291A',
    shirt: '#F2E3A0',
    hair: {
      front: `<path d="M42 48c1-13 9-21 22-21s21 8 22 21c-4-5-11-8-22-8s-18 3-22 8z" fill="${HAIR}" opacity=".9"/>`,
    },
    beard: `<path d="M54 76c2 8 6 11 10 11s8-3 10-11c-3 3-6 4-10 4s-7-1-10-4z" fill="${HAIR}"/>`,
    extra: `<path d="M14 118c4-14 14-22 30-26M114 118c-4-14-14-22-30-26" fill="none" stroke="#0B3D22" stroke-width="9" stroke-linecap="round"/><path d="M10 124c4-14 14-22 30-26M118 124c-4-14-14-22-30-26" fill="none" stroke="#3DD680" stroke-width="9" stroke-linecap="round"/><path d="M64 92V128" stroke="${INK}" stroke-width="2.4"/><path d="M44 92 64 110 84 92" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
  });
export const AVATARS = { ozavize, ndako, hamman };

// Commentator lines (speaker: the pitch commentator, an invented generic voice; NOT modelled on any real commentator). All Pidgin `_review`.
export const VOICE = [
  {
    id: 'pk-start',
    pcm: 'Oya, penalty time!',
    en: 'Come on, penalty time!',
    note: 'Bright, quick, rising on "time".',
    used: 'shootout start',
  },
  {
    id: 'pk-goal',
    pcm: 'Goal! E don enter!',
    en: "Goal! It's in!",
    note: 'Long, rising "Goooal", then a delighted "E don enter".',
    used: 'player or CPU scores (rotate with shared `goal`)',
  },
  {
    id: 'pk-rocket',
    pcm: 'Chai! Na rocket be that!',
    en: 'Wow! What a rocket!',
    note: 'Impressed, big, short.',
    used: 'a goal from a hard, sweet-spot shot',
  },
  {
    id: 'pk-saved',
    pcm: 'Keeper don save am! Wetin be that!',
    en: 'The keeper saves it! What a stop!',
    note: 'Sharp, triumphant, punchy.',
    used: 'a save (rotate with shared `saved`)',
  },
  {
    id: 'pk-post',
    pcm: 'E knock the post! So close!',
    en: 'Off the post! So close!',
    note: 'A gasp, then a laugh of disbelief.',
    used: 'ball hits the post or bar',
  },
  {
    id: 'pk-over',
    pcm: 'E fly pass the bar o!',
    en: 'Over the bar!',
    note: 'Rueful, a little drawn out.',
    used: 'ball goes over',
  },
  {
    id: 'pk-wide',
    pcm: 'Wide! E miss the goal!',
    en: 'Wide of the goal!',
    note: 'Rueful, quick.',
    used: 'ball goes wide',
  },
  {
    id: 'pk-level',
    pcm: 'Score don level o!',
    en: 'The score is level!',
    note: 'Tense, building.',
    used: 'scores level after five kicks',
  },
  {
    id: 'pk-sudden',
    pcm: 'Sudden death! No room for mistake!',
    en: 'Sudden death! No room for error!',
    note: 'Low and tense, a pause before "No room".',
    used: 'sudden death begins',
  },
  {
    id: 'pk-qf',
    pcm: 'Quarter-final! Make we go!',
    en: 'Quarter-final! Here we go!',
    note: 'Announcing, upbeat.',
    used: 'cup quarter-final starts',
  },
  {
    id: 'pk-sf',
    pcm: 'Semi-final! Only four teams remain!',
    en: 'Semi-final! Only four teams remain!',
    note: 'Rising, a little awe.',
    used: 'cup semi-final starts',
  },
  {
    id: 'pk-final',
    pcm: 'Na the final be this!',
    en: 'This is the final!',
    note: 'Big, slow, dramatic.',
    used: 'cup final starts',
  },
  {
    id: 'pk-advance',
    pcm: 'You don waka enter next round!',
    en: 'You are through to the next round!',
    note: 'Warm, celebratory.',
    used: 'bracket advance',
  },
  {
    id: 'pk-win',
    pcm: 'You don win! Penalty King!',
    en: 'You win! Penalty King!',
    note: 'Big, warm, celebratory.',
    used: 'shootout won',
  },
  {
    id: 'pk-champion',
    pcm: 'Champion! Na your own cup!',
    en: 'Champions! The cup is yours!',
    note: 'The biggest line in the game: long, proud, rising.',
    used: 'cup won',
  },
  {
    id: 'pk-lose',
    pcm: 'No vex. Next time go better.',
    en: 'Tough one. Next time will be better.',
    note: 'Kind and encouraging, never pitying.',
    used: 'shootout lost',
  },
  {
    id: 'pk-knockout',
    pcm: 'Cup run don end. You go try again.',
    en: 'Your cup run ends here. Try again.',
    note: 'Gentle, steady, encouraging.',
    used: 'knocked out of the cup',
  },
];
export { f1, PLANTAIN };
