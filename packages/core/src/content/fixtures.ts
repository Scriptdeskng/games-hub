import type { QuizPack, QuizQuestion, WordPack } from './types';

export const question = (n: number, over: Partial<QuizQuestion> = {}): QuizQuestion => ({
  id: `q${n}`,
  category: 'food',
  difficulty: 'easy',
  q: `Question ${n}?`,
  options: ['A', 'B', 'C', 'D'],
  answer: 1,
  source: 'test',
  reviewed: true,
  ...over,
});

export const quizPack = (over: Record<string, unknown> = {}): QuizPack =>
  ({
    version: 1,
    id: 'sabi-quiz-en',
    title: 'Sabi Quiz',
    lang: 'en',
    questions: [question(1), question(2, { difficulty: 'hard', tags: ['x'] })],
    ...over,
  }) as QuizPack;

export const wordPack = (over: Record<string, unknown> = {}): WordPack =>
  ({
    version: 1,
    id: 'words-food',
    title: 'Food',
    lang: 'pcm',
    theme: 'food',
    words: [
      { word: 'jollof', hint: 'party rice', tags: ['rice'] },
      { word: 'Ẹ̀bà', reviewed: false },
    ],
    blocklist: ['badword'],
    ...over,
  }) as WordPack;
