import type { Persona } from '@naija/core/ai-kit';
import babaAde from '@naija/core/assets/avatars/baba-ade.svg?url';
import funmi from '@naija/core/assets/avatars/funmi.svg?url';
import malamSani from '@naija/core/assets/avatars/malam-sani.svg?url';

/**
 * The CPU characters of this game (docs/assets/PERSONAS.md and the asset brief section 6): Funmi
 * (Yoruba, Lagos), Baba Ade (Yoruba, Ibadan) and Malam Sani (Hausa-Fulani, Kano: the third seat,
 * for regional balance). Against one CPU any of the three may sit opposite. Banter keys
 * point at the persona's own numbered lines (`persona.<id>.<n>`) or at the game's event lines
 * (`ludo.banter.<id>.<event>`). Funmi's banker job is never mentioned (no money banter).
 *
 * Events: start, six / capture / captured / home / forfeit (this CPU), humanCapture (the player
 * captured someone), idle (the player is slow), win (this CPU won), lose (the player won).
 */
const own = (id: string, ...n: number[]): string[] => n.map((i) => `persona.${id}.${i}`);
const ev = (id: string, name: string): string[] => [`ludo.banter.${id}.${name}`];
const events = (id: string): Persona['banter'] => ({
  six: ev(id, 'six'),
  capture: ev(id, 'capture'),
  captured: ev(id, 'captured'),
  humanCapture: ev(id, 'captured'),
  home: ev(id, 'home'),
  forfeit: ev(id, 'forfeit'),
  win: ev(id, 'win'),
  lose: ev(id, 'lose'),
});

export const PERSONAS: readonly Persona[] = [
  {
    id: 'funmi',
    nameKey: 'persona.funmi.name',
    avatar: funmi,
    think: [500, 900],
    banter: { ...events('funmi'), start: own('funmi', 1, 3), idle: own('funmi', 6) },
  },
  {
    id: 'baba-ade',
    nameKey: 'persona.baba-ade.name',
    avatar: babaAde,
    think: [800, 1200],
    banter: { ...events('baba-ade'), start: own('baba-ade', 1, 8), idle: own('baba-ade', 6, 5) },
  },
  {
    id: 'malam-sani',
    nameKey: 'persona.malam-sani.name',
    avatar: malamSani,
    // the brief asks for a think delay of at most 0.6 s in Ludo
    think: [400, 600],
    banter: { ...events('malam-sani'), start: own('malam-sani', 1, 3), idle: own('malam-sani', 6) },
  },
];

export const personaById = (id: string): Persona =>
  PERSONAS.find((p) => p.id === id) ?? (PERSONAS[0] as Persona);
