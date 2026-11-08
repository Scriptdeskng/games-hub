import type { Persona } from '@naija/core/ai-kit';
import aisha from '@naija/core/assets/avatars/aisha.svg?url';
import mamaNkechi from '@naija/core/assets/avatars/mama-nkechi.svg?url';
import tari from '@naija/core/assets/avatars/tari.svg?url';

/**
 * The CPU characters of this game (asset brief section 8). A persona gives a CPU its name, its
 * think delay, its banter and its play STYLE. The player chooses the difficulty and it applies to
 * every CPU; the style only tilts how a CPU of that difficulty plays.
 *
 * - Mama Nkechi (Igbo, Enugu): cautious. Plays safe cards first, avoids leading with 2, 5 and 14,
 *   keeps a Whot in reserve. Think 0.8 s. Default seat 1 (Easy character).
 * - Tari (Ijaw, Port Harcourt): aggressive. Attacks with 2, 5, 14 and 8 early. Think 0.4 s.
 * - Aisha (Hausa, Kaduna): hoards Whot until three cards or fewer, counts cards. Think 0.7 s.
 *
 * Banter keys are `whot.banter.<persona>.<event>`; events: play, pickTwo, gotPickTwo, market,
 * suspension, holdOn, whotCall, lastCard, win, lose.
 */
export type Style = 'balanced' | 'cautious' | 'aggressive' | 'hoarder';

export interface WhotPersona extends Persona {
  style: Style;
}

const ev = (id: string, name: string): string[] => [`whot.banter.${id}.${name}`];
const events = (id: string): Persona['banter'] => ({
  play: ev(id, 'play'),
  pickTwo: ev(id, 'pickTwo'),
  gotPickTwo: ev(id, 'gotPickTwo'),
  market: ev(id, 'market'),
  suspension: ev(id, 'suspension'),
  holdOn: ev(id, 'holdOn'),
  whotCall: ev(id, 'whotCall'),
  lastCard: ev(id, 'lastCard'),
  win: ev(id, 'win'),
  lose: ev(id, 'lose'),
});

export const PERSONAS: readonly WhotPersona[] = [
  {
    id: 'mama-nkechi',
    nameKey: 'persona.mama-nkechi.name',
    avatar: mamaNkechi,
    think: [800, 900],
    style: 'cautious',
    banter: events('mama-nkechi'),
  },
  {
    id: 'tari',
    nameKey: 'persona.tari.name',
    avatar: tari,
    think: [400, 500],
    style: 'aggressive',
    banter: events('tari'),
  },
  {
    id: 'aisha',
    nameKey: 'persona.aisha.name',
    avatar: aisha,
    think: [700, 800],
    style: 'hoarder',
    banter: events('aisha'),
  },
];

export const personaById = (id: string): WhotPersona =>
  PERSONAS.find((p) => p.id === id) ?? (PERSONAS[0] as WhotPersona);
