import type { Persona } from '@naija/core/ai-kit';

/**
 * Osas (Edo, Benin City), the sign-painter who guides the player. She is not an opponent: she
 * greets, praises and nudges, and never mocks a wrong swipe (asset brief section 9). Banter keys
 * are `persona.osas.<n>` (docs/assets/PERSONAS.md); the results lines are `sw.banter.*`.
 * Events: start, ready, found, long, wrong, hint, low, star3, win, lose.
 */
export const OSAS: Persona = {
  id: 'osas',
  nameKey: 'persona.osas.name',
  avatar: './assets/avatars/osas.svg',
  banter: {
    start: ['persona.osas.1'],
    ready: ['persona.osas.2'],
    found: ['persona.osas.3'],
    long: ['persona.osas.4'],
    wrong: ['persona.osas.5'],
    hint: ['persona.osas.6'],
    low: ['persona.osas.7'],
    star3: ['persona.osas.8'],
    win: ['sw.banter.win.1', 'sw.banter.win.2'],
    lose: ['sw.banter.lose.1', 'sw.banter.lose.2'],
  },
};
