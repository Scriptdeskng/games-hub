import type { Persona } from '@naija/core/ai-kit';
import type { Difficulty } from '@naija/core/ui-kit';

/**
 * The CPU characters (asset brief section 5): Doosuur (Tiv, Makurdi) plays Easy, Falmata (Kanuri,
 * Maiduguri) Medium, Damola (Yoruba, Abeokuta) Hard. Banter lines are `persona.<id>.1..8` in the
 * locale files; every persona uses the eight lines for the moments that fit her voice:
 *
 * Events: start, idle (the player is slow), think (the CPU is thinking about a hard move),
 * cpuCapture (the CPU took a piece), humanCapture (the player took a piece), chain (the player took
 * 2 or more), mustCapture (the player tried a quiet move while a capture was compulsory),
 * humanCrown, cpuCrown, win (this CPU won), lose (the player won), draw.
 * Avatar paths are literal so the build can check that they ship.
 */
const lines = (id: string, map: Record<string, number>): Persona['banter'] =>
  Object.fromEntries(Object.entries(map).map(([ev, n]) => [ev, [`persona.${id}.${n}`]]));

export const PERSONAS: readonly Persona[] = [
  {
    id: 'doosuur',
    nameKey: 'persona.doosuur.name',
    avatar: './assets/avatars/doosuur.svg',
    think: [500, 900],
    banter: lines('doosuur', {
      start: 1,
      idle: 2,
      chain: 3,
      humanCapture: 4,
      mustCapture: 5,
      humanCrown: 6,
      think: 7,
      cpuCapture: 7,
      win: 8,
      lose: 8,
      draw: 8,
    }),
  },
  {
    id: 'falmata',
    nameKey: 'persona.falmata.name',
    avatar: './assets/avatars/falmata.svg',
    think: [700, 1100],
    banter: lines('falmata', {
      start: 1,
      think: 1,
      cpuCapture: 2,
      idle: 3,
      mustCapture: 4,
      humanCapture: 5,
      chain: 6,
      cpuCrown: 7,
      win: 8,
      lose: 8,
      draw: 8,
    }),
  },
  {
    id: 'damola',
    nameKey: 'persona.damola.name',
    avatar: './assets/avatars/damola.svg',
    think: [800, 1200],
    banter: lines('damola', {
      start: 1,
      think: 2,
      chain: 3,
      idle: 4,
      mustCapture: 4,
      humanCapture: 5,
      cpuCapture: 6,
      lose: 7,
      win: 8,
      draw: 8,
    }),
  },
];

export const PERSONA_OF: Readonly<Record<Difficulty, string>> = {
  easy: 'doosuur',
  medium: 'falmata',
  hard: 'damola',
};

export const personaById = (id: string): Persona =>
  PERSONAS.find((p) => p.id === id) ?? (PERSONAS[0] as Persona);
