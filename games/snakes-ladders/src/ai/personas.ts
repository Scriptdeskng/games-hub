import type { Persona } from '@naija/core/ai-kit';
import aisha from '@naija/core/assets/avatars/aisha.svg?url';
import efe from '@naija/core/assets/avatars/efe.svg?url';
import tari from '@naija/core/assets/avatars/tari.svg?url';

/**
 * The CPU characters of this game (docs/assets/PERSONAS.md and the asset brief): Tari and Efe,
 * with Aisha joining when there are three opponents. Banter keys point at the persona's own
 * numbered lines (`persona.<id>.<n>`) or at the game's event lines (`snakes.banter.<id>.<event>`).
 * Events: start, ladder / snake / six (this CPU), humanLadder / humanSnake (the player),
 * idle (the player is slow), win (this CPU won), lose (the player won).
 */
const own = (id: string, ...n: number[]): string[] => n.map((i) => `persona.${id}.${i}`);
const ev = (id: string, name: string): string[] => [`snakes.banter.${id}.${name}`];

export const PERSONAS: readonly Persona[] = [
  {
    id: 'tari',
    nameKey: 'persona.tari.name',
    avatar: tari,
    think: [400, 700],
    banter: {
      start: own('tari', 2, 7),
      ladder: ev('tari', 'ladder'),
      snake: ev('tari', 'snake'),
      six: ev('tari', 'six'),
      humanLadder: own('tari', 3),
      humanSnake: ev('tari', 'snake'),
      idle: own('tari', 6, 4),
      win: ev('tari', 'win'),
      lose: ev('tari', 'lose'),
    },
  },
  {
    id: 'efe',
    nameKey: 'persona.efe.name',
    avatar: efe,
    think: [500, 900],
    banter: {
      start: own('efe', 1, 3),
      ladder: ev('efe', 'ladder'),
      snake: ev('efe', 'snake'),
      six: ev('efe', 'six'),
      humanLadder: own('efe', 4),
      humanSnake: own('efe', 6),
      idle: own('efe', 8, 4),
      win: ev('efe', 'win'),
      lose: ev('efe', 'lose'),
    },
  },
  {
    id: 'aisha',
    nameKey: 'persona.aisha.name',
    avatar: aisha,
    think: [700, 1100],
    banter: {
      start: own('aisha', 1),
      ladder: ev('aisha', 'ladder'),
      snake: ev('aisha', 'snake'),
      six: ev('aisha', 'six'),
      humanLadder: own('aisha', 4),
      humanSnake: own('aisha', 7),
      idle: own('aisha', 6),
      win: ev('aisha', 'win'),
      lose: ev('aisha', 'lose'),
    },
  },
];

export const personaById = (id: string): Persona =>
  PERSONAS.find((p) => p.id === id) ?? (PERSONAS[0] as Persona);
