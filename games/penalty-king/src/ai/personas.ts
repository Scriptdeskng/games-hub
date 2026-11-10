import type { Persona } from '@naija/core/ai-kit';
import { PERSONA_OF, type Difficulty } from '../rules/config';

/**
 * The CPU rivals (asset brief section 6): Ozavize (Ebira, Okene: Easy), Ndako (Nupe, Bida: Medium),
 * Hamman (Fulani, Yola: Hard). Each is both the CPU keeper and the CPU striker. Eight lines each,
 * `persona.<id>.1..8` in the locale files. Events the match raises:
 * start, humanGoal (you scored), cpuSave, cpuGoal, post, idle (you are slow), sudden, repeat (you
 * shot at the same corner again), cpuTurn (your turn to keep), win (the rival won), lose (you won).
 */
const lines = (id: string, map: Record<string, number[]>): Persona['banter'] =>
  Object.fromEntries(
    Object.entries(map).map(([ev, ns]) => [ev, ns.map((n) => `persona.${id}.${n}`)]),
  );

export const PERSONAS: readonly Persona[] = [
  {
    id: 'ozavize',
    nameKey: 'persona.ozavize.name',
    avatar: './assets/avatars/ozavize.svg',
    think: [500, 900],
    banter: lines('ozavize', {
      start: [1],
      humanGoal: [2, 3],
      idle: [4],
      cpuSave: [5],
      cpuTurn: [6],
      cpuGoal: [7],
      post: [7],
      sudden: [7],
      win: [8],
      lose: [8],
    }),
  },
  {
    id: 'ndako',
    nameKey: 'persona.ndako.name',
    avatar: './assets/avatars/ndako.svg',
    think: [700, 1100],
    banter: lines('ndako', {
      start: [1],
      repeat: [2, 3],
      idle: [4],
      humanGoal: [5],
      cpuTurn: [6],
      post: [7],
      cpuGoal: [6],
      cpuSave: [2],
      sudden: [4],
      win: [8],
      lose: [8],
    }),
  },
  {
    id: 'hamman',
    nameKey: 'persona.hamman.name',
    avatar: './assets/avatars/hamman.svg',
    think: [800, 1200],
    banter: lines('hamman', {
      start: [1],
      cpuSave: [2, 7],
      idle: [3],
      humanGoal: [4],
      sudden: [5],
      cpuGoal: [6],
      post: [3],
      repeat: [7],
      cpuTurn: [1],
      win: [8],
      lose: [8],
    }),
  },
];

export const personaById = (id: string): Persona =>
  PERSONAS.find((p) => p.id === id) ?? (PERSONAS[0] as Persona);
export const personaFor = (d: Difficulty): Persona => personaById(PERSONA_OF[d]);
