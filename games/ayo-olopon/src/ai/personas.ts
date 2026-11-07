import type { Persona } from '@naija/core/ai-kit';
import babaAde from '@naija/core/assets/avatars/baba-ade.svg?url';
import efe from '@naija/core/assets/avatars/efe.svg?url';
import malamSani from '@naija/core/assets/avatars/malam-sani.svg?url';
import type { Difficulty } from '@naija/core/ui-kit';

/**
 * The CPU characters of this game (asset brief section 2): one per difficulty, from four regions.
 * Efe (Urhobo, Warri) plays Easy, Baba Ade (Yoruba, Ibadan) Medium, Malam Sani (Hausa-Fulani,
 * Kano) Hard. Banter keys are `ayo.banter.<persona>.<event>`. Capture lines are about the seeds,
 * never the player, and there is no money talk.
 *
 * Events: start, capture (this CPU captured), captured (the player captured from this CPU),
 * chain (a capture of 2+ pits, either side), win (this CPU won), lose (the player won),
 * draw, idle (the player is slow).
 */
const ev = (id: string, name: string): string[] => [`ayo.banter.${id}.${name}`];
const events = (id: string): Persona['banter'] => ({
  start: ev(id, 'start'),
  capture: ev(id, 'capture'),
  captured: ev(id, 'captured'),
  chain: ev(id, 'chain'),
  win: ev(id, 'win'),
  lose: ev(id, 'lose'),
  draw: ev(id, 'draw'),
  idle: ev(id, 'idle'),
});

export const PERSONAS: readonly Persona[] = [
  { id: 'efe', nameKey: 'persona.efe.name', avatar: efe, think: [400, 700], banter: events('efe') },
  {
    id: 'baba-ade',
    nameKey: 'persona.baba-ade.name',
    avatar: babaAde,
    think: [700, 1100],
    banter: events('baba-ade'),
  },
  {
    id: 'malam-sani',
    nameKey: 'persona.malam-sani.name',
    avatar: malamSani,
    think: [800, 1200],
    banter: events('malam-sani'),
  },
];

/** The persona set: Efe = Easy, Baba Ade = Medium, Malam Sani = Hard. */
export const PERSONA_OF: Readonly<Record<Difficulty, string>> = {
  easy: 'efe',
  medium: 'baba-ade',
  hard: 'malam-sani',
};

export const personaById = (id: string): Persona =>
  PERSONAS.find((p) => p.id === id) ?? (PERSONAS[0] as Persona);
