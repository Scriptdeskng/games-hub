/** Asset URLs and pit-marker names of the board (asset brief section 4). */
export const ART = {
  landscape: './assets/board/board-landscape.svg',
  portrait: './assets/board/board-portrait.svg',
} as const;
export const SEED_URL = {
  a: './assets/seeds/seed-a.svg',
  b: './assets/seeds/seed-b.svg',
  c: './assets/seeds/seed-c.svg',
  d: './assets/seeds/seed-d.svg',
} as const;
export const COUNTER_URL = {
  1: './assets/counters/counter-1.svg',
  5: './assets/counters/counter-5.svg',
  10: './assets/counters/counter-10.svg',
} as const;

/** A pit marker (asset brief section 4, states). The highest priority one is drawn. */
export type Mark = 'capture' | 'skip' | 'hint' | 'select' | 'last' | 'danger';
export const MARKS: readonly Mark[] = ['capture', 'skip', 'hint', 'select', 'last', 'danger'];
export const MARK_URL: Record<Mark, string> = {
  capture: './assets/states/pit-capture.svg',
  skip: './assets/states/pit-skip.svg',
  hint: './assets/states/pit-hint.svg',
  select: './assets/states/pit-select.svg',
  last: './assets/states/pit-last.svg',
  danger: './assets/states/pit-danger.svg',
};
