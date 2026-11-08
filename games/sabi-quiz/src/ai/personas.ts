import type { Persona } from '@naija/core/ai-kit';
import aisha from '@naija/core/assets/avatars/aisha.svg?url';
import chidi from '@naija/core/assets/avatars/chidi.svg?url';
import type { Difficulty } from '../rules/config';

/**
 * The people of the quiz show (asset brief section 9). Uncle Etim hosts and never plays; one
 * contestant per difficulty runs the Quiz Duel: Chidi (Igbo, Owerri) Easy, Dung (Berom, Jos)
 * Medium, Aisha (Hausa, Kaduna) Hard. Etim and Dung's portraits live in this game's assets and
 * are named literally so the ship check can see them; Chidi and Aisha come from core.
 *
 * Banter lines are keys into the game's i18n bundle (`persona.<id>.<n>` and
 * `sq.banter.<id>.<n>`; numbers follow docs/assets/PERSONAS.md and the asset brief).
 * Events for the host: start, ready, correct, wrong, streak, padi, low, win, lose.
 * Events for a contestant: start, buzz (it answered first), good (it scored), bad (it missed),
 * humanGood, humanBad, idle, win (it won the duel), lose (the player won).
 */
const keys = (prefix: string, ...n: number[]): string[] => n.map((i) => `${prefix}.${i}`);
const P = (id: string, ...n: number[]): string[] => keys(`persona.${id}`, ...n);

export const HOST: Persona = {
  id: 'etim',
  nameKey: 'persona.etim.name',
  avatar: './assets/avatars/etim.svg',
  banter: {
    start: P('etim', 1),
    ready: P('etim', 2),
    correct: [...P('etim', 3, 8)],
    wrong: P('etim', 4),
    streak: P('etim', 5),
    padi: P('etim', 6),
    low: P('etim', 7),
    win: P('etim', 8),
    lose: ['sq.host.lose'],
  },
};

const CHIDI: Persona = {
  id: 'chidi',
  nameKey: 'persona.chidi.name',
  avatar: chidi,
  banter: {
    start: keys('sq.banter.chidi', 1),
    buzz: keys('sq.banter.chidi', 2),
    bad: keys('sq.banter.chidi', 3),
    good: keys('sq.banter.chidi', 4),
    humanBad: keys('sq.banter.chidi', 5),
    humanGood: keys('sq.banter.chidi', 3),
    win: keys('sq.banter.chidi', 4),
    lose: keys('sq.banter.chidi', 6),
  },
};

const DUNG: Persona = {
  id: 'dung',
  nameKey: 'persona.dung.name',
  avatar: './assets/avatars/dung.svg',
  banter: {
    start: P('dung', 1),
    idle: P('dung', 2, 6, 7),
    buzz: P('dung', 3),
    good: P('dung', 3),
    bad: P('dung', 5),
    humanGood: P('dung', 4),
    humanBad: P('dung', 2),
    win: P('dung', 8),
    lose: P('dung', 8),
  },
};

const AISHA: Persona = {
  id: 'aisha',
  nameKey: 'persona.aisha.name',
  avatar: aisha,
  banter: {
    start: P('aisha', 1),
    buzz: [...P('aisha', 6), ...P('aisha', 10)],
    good: [...P('aisha', 2), ...P('aisha', 9)],
    bad: [...P('aisha', 5), ...P('aisha', 12)],
    humanGood: [...P('aisha', 4), ...P('aisha', 11)],
    humanBad: P('aisha', 3, 7),
    idle: P('aisha', 8),
    win: P('aisha', 6),
    lose: P('aisha', 4),
  },
};

export const PERSONAS: readonly Persona[] = [HOST, CHIDI, DUNG, AISHA];

/** The contestant for each difficulty. */
export const CONTESTANT_OF: Readonly<Record<Difficulty, string>> = {
  easy: 'chidi',
  medium: 'dung',
  hard: 'aisha',
};

export const personaById = (id: string): Persona =>
  PERSONAS.find((p) => p.id === id) ?? (HOST as Persona);
