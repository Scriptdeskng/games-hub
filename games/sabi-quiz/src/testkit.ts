import type { QuizPack, QuizQuestion } from '@naija/core/content';
import pack from '../assets/packs/sabi-core-en.json';

/** The shipped 300-question pack, typed. Tests use the real content, not a toy pool. */
export const PACK = pack as unknown as QuizPack;
export const POOL: readonly QuizQuestion[] = PACK.questions;

/** A tiny hand-made question whose answer is always `answer`. */
export const mkQ = (
  id: string,
  answer: 0 | 1 | 2 | 3,
  difficulty: QuizQuestion['difficulty'] = 'easy',
  category = 'general',
): QuizQuestion => ({
  id,
  category,
  difficulty,
  q: `Question ${id}?`,
  options: ['A text', 'B text', 'C text', 'D text'],
  answer,
  source: 'test',
  reviewed: false,
});
