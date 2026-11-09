// Draughts Naija: CPU persona busts and the voice-line texts (asset-designer). Kept apart from the art generator to keep files short.
// Roster (Easy / Medium / Hard): Doosuur (Tiv, Makurdi, Middle Belt), Falmata (Kanuri, Maiduguri, North-East),
// Damola (Yoruba, Abeokuta, campus rival). Placeholder shape-built busts, 128 viewBox, same format as the core avatars.
import { svg, GOLD, CREAM, SKY, TERRA, TERRA2, PLANTAIN, INK } from './draughts-naija-common.mjs';

const bust = ({ bg, skin, shirt, hair, extra = '', title }) =>
  svg(
    '0 0 128 128',
    `<title>${title}</title><path fill="${bg}" d="M0 0h128v128H0z"/><circle cx="64" cy="62" r="50" fill="#fff" opacity=".2"/><path fill="${shirt}" d="M8 128c0-28 26-38 56-38s56 10 56 38Z"/><rect width="20" height="24" x="54" y="74" fill="${skin}" rx="7"/><path fill="#000" opacity=".15" d="M54 82h20v6q-10 6-20 0z"/>${hair.back ?? ''}<ellipse cx="64" cy="58" rx="24" ry="28" fill="${skin}"/>${hair.front ?? ''}<ellipse cx="54" cy="58" rx="4.2" ry="3.8" fill="#fff"/><circle cx="54" cy="58.4" r="2.5" fill="#1a0f0a"/><circle cx="55" cy="57.4" r=".9" fill="#fff"/><ellipse cx="74" cy="58" rx="4.2" ry="3.8" fill="#fff"/><circle cx="74" cy="58.4" r="2.5" fill="#1a0f0a"/><circle cx="75" cy="57.4" r=".9" fill="#fff"/><path d="M48 49q6-5 12-1m8 0q6-4 12 1" fill="none" stroke="#1a0f0a" stroke-width="3" stroke-linecap="round"/><path d="M58 72q6 6 12 0" fill="none" stroke="#7a2a1a" stroke-width="3" stroke-linecap="round"/>${extra}`,
    ' width="128" height="128"',
  );
const HAIR = '#1a0f0a';

// Doosuur: Tiv, Makurdi, 40s. A nurse who plays on her break. Teal scrub top, a black-and-white striped shawl (plain stripes,
// inspired by the everyday Tiv striped cloth, not a copy of any weaver's design), short natural hair, small gold hoops.
export const doosuur = () =>
  bust({
    title: 'Doosuur',
    bg: '#B4532A',
    skin: '#4F2E1B',
    shirt: '#2E7D7A',
    hair: {
      front: `<path d="M40 56c-2-22 10-32 24-32s26 10 24 32c-6-10-14-14-24-14s-18 4-24 14z" fill="${HAIR}"/>`,
    },
    extra: `<g fill="none" stroke-linecap="round"><path d="M16 126c2-20 18-30 48-30" stroke="#fff" stroke-width="15"/><path d="M16 126c2-20 18-30 48-30" stroke="#1a1a1a" stroke-width="15" stroke-dasharray="3.2 3.2"/><path d="M112 126c-2-20-18-30-48-30" stroke="#fff" stroke-width="15"/><path d="M112 126c-2-20-18-30-48-30" stroke="#1a1a1a" stroke-width="15" stroke-dasharray="3.2 3.2"/></g><circle cx="40" cy="68" r="3.4" fill="none" stroke="${GOLD}" stroke-width="2.4"/><circle cx="88" cy="68" r="3.4" fill="none" stroke="${GOLD}" stroke-width="2.4"/>`,
  });
// Falmata: Kanuri, Maiduguri, 20s. Final-year engineering student, quick and tactical. Low bun with a pencil, grid-lined shirt, blank ID lanyard.
export const falmata = () =>
  bust({
    title: 'Falmata',
    bg: SKY,
    skin: '#855536',
    shirt: '#2D4F94',
    hair: {
      back: `<circle cx="64" cy="26" r="12" fill="${HAIR}"/><path d="M52 34l36-18" stroke="#1D1D20" stroke-width="5" stroke-linecap="round"/><path d="M52 34l36-18" stroke="${PLANTAIN}" stroke-width="3" stroke-linecap="round"/>`,
      front: `<path d="M40 56c-2-22 10-32 24-32s26 10 24 32c-6-10-14-14-24-14s-18 4-24 14z" fill="${HAIR}"/>`,
    },
    extra: `<g stroke="${CREAM}" stroke-width="1.4" opacity=".55"><path d="M30 100h68M24 112h80M36 124h56M46 96v32M64 94v34M82 96v32"/></g><path d="M52 92l8 28M76 92l-8 28" stroke="${CREAM}" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="54" y="116" width="20" height="12" rx="2.5" fill="${CREAM}" stroke="${INK}" stroke-width="2"/><path d="M58 122h12" stroke="${SKY}" stroke-width="2.4"/>`,
  });
// Damola: Yoruba, Abeokuta, 20s. The campus rival: sharp fade haircut, plain varsity-style jacket in adire indigo (no logo), cream collar stripes.
export const damola = () =>
  bust({
    title: 'Damola',
    bg: GOLD,
    skin: '#5B3A25',
    shirt: '#1D3A9E',
    hair: {
      front: `<path d="M42 50c0-15 9-24 22-24s22 9 22 24c-4-6-10-8-22-8s-18 2-22 8z" fill="${HAIR}"/><path d="M44 50c6-4 14-5 20-5" stroke="${TERRA2}" stroke-width="1.4" fill="none" opacity=".6"/>`,
    },
    extra: `<path d="M44 94c6 8 14 12 20 12s14-4 20-12" fill="none" stroke="${CREAM}" stroke-width="6" stroke-linecap="round"/><path d="M46 100c6 6 12 9 18 9s12-3 18-9" fill="none" stroke="${TERRA}" stroke-width="3" stroke-linecap="round"/><g fill="${CREAM}" opacity=".8"><circle cx="30" cy="112" r="3"/><circle cx="98" cy="112" r="3"/><circle cx="22" cy="122" r="2.4"/><circle cx="106" cy="122" r="2.4"/></g>`,
  });
export const AVATARS = { doosuur, falmata, damola };

// Voice lines (speaker: the table umpire, a neutral voice, not one of the personas). Every Pidgin line is review-flagged.
export const VOICE = [
  {
    id: 'dn-start',
    pcm: 'Oya, make we play!',
    en: "Come on, let's play!",
    note: 'Bright, quick, rising.',
    used: 'game start',
  },
  {
    id: 'dn-capture',
    pcm: 'Chop am!',
    en: 'Taken!',
    note: 'Short, punchy, a grin in the voice.',
    used: 'a piece is captured (rotate, sparingly)',
  },
  {
    id: 'dn-must',
    pcm: 'Capture first o!',
    en: 'You must capture first!',
    note: 'Friendly reminder, never scolding.',
    used: 'player taps a non-capturing move',
  },
  {
    id: 'dn-chain',
    pcm: 'Ehen! Jump, jump, jump!',
    en: 'Jump after jump!',
    note: 'Rising and delighted, three quick beats.',
    used: 'multi-capture of 3 or more',
  },
  {
    id: 'dn-king',
    pcm: 'King don show!',
    en: 'A king is crowned!',
    note: 'Proud announcement, a little drawn out on "king".',
    used: 'a piece is crowned',
  },
  {
    id: 'dn-illegal',
    pcm: 'No be that way o.',
    en: 'Not that way.',
    note: 'Gentle, kind, quick.',
    used: 'illegal move (sparingly)',
  },
  {
    id: 'dn-last',
    pcm: 'Last piece o!',
    en: 'One piece left!',
    note: 'Sharp table call, strong stress on "last".',
    used: 'a side is down to one piece',
  },
  {
    id: 'dn-win',
    pcm: 'You be correct player! You don win!',
    en: 'Well played! You win!',
    note: 'Big, warm, celebratory.',
    used: 'player wins',
  },
  {
    id: 'dn-lose',
    pcm: 'Small small, you go catch am next time.',
    en: "Little by little, you'll get it next time.",
    note: 'Kind and encouraging, never pitying.',
    used: 'player loses',
  },
  {
    id: 'dn-draw',
    pcm: 'E be like say we level o.',
    en: 'Looks like we are level.',
    note: 'Relaxed, a smile, even.',
    used: 'draw',
  },
];
