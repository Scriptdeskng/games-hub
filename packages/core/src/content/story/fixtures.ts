/**
 * Test-only fixtures: a tiny Kiriji Chapter 1 SKELETON. Facts come only from docs/games/akoni-dike
 * SCRIPT.md and LEARNING.md (Kiriji 1877-1893, treaty 23 Sep 1886, ajele, the Ekitiparapo, the
 * Saro title). Everything else is a "TODO historian" placeholder and every item is reviewed:false.
 * Each call returns a fresh deep copy so tests can mutate it.
 */
import type { CampaignBundle, ChapterManifest, FeatureConfig } from './types';

const todo = (what: string): string => `TODO historian: ${what}`;
const review = { source: 'SCRIPT.md, LEARNING.md', reviewedBy: 'TODO historian', reviewed: false };

export const chapterOne = (): ChapterManifest => ({
  version: 1,
  kind: 'chapter',
  id: 'kiriji-1',
  campaign: 'kiriji',
  order: 1,
  title: { en: "The Ajele's Due", pcm: "Di Ajele's Tax" },
  tag: 'History',
  goals: [
    {
      en: 'Learn how Ibadan ruled other towns through resident officials (ajele), and why towns revolted.',
    },
  ],
  environment: 'oke-imesi-town',
  hero: 'bisi',
  companions: ['akin'],
  cast: ['iya-morenike'],
  objectives: [
    {
      id: 'escort-villagers',
      kind: 'escort',
      amount: 6,
      text: {
        en: 'Escort 6 villagers to the hill path.',
        pcm: 'Carry 6 villagers reach di hill path.',
      },
    },
  ],
  heroMoment: {
    type: 'brawl',
    text: { en: 'A street brawl with the guard captain: strike, dodge, parry, counter.' },
  },
  dates: {
    start: { year: 1877 },
    end: { year: 1893 },
    sourcesDisagree:
      'Some sources end the war with the 1886 treaty, others with the 1893 dispersal.',
  },
  dependencies: [],
  delivery: 'initial',
  content: {
    scenes: ['k1-museum', 'k1-market'],
    facts: ['k1-fact-ajele', 'k1-fact-dates', 'k1-fact-treaty'],
    sources: ['k1-src-johnson'],
    twoSides: ['k1-sides-revolt'],
    pins: ['k1-pin-war', 'k1-pin-treaty'],
    checks: ['k1-q-ajele', 'k1-q-start', 'k1-q-treaty'],
  },
  ...review,
});

export const kirijiOneBundle = (): CampaignBundle => ({
  chapters: [chapterOne()],
  dialogue: [
    {
      version: 1,
      kind: 'dialogue',
      id: 'kiriji-1-dialogue',
      campaign: 'kiriji',
      chapter: 'kiriji-1',
      scenes: [
        {
          id: 'k1-museum',
          tag: 'Story',
          lines: [
            {
              id: 'k1-m-1',
              speaker: 'guide',
              text: { en: 'Let me tell you what happened here.' },
              langs: ['en'],
            },
          ],
        },
        {
          id: 'k1-market',
          tag: 'History',
          lines: [
            {
              id: 'k1-t-1',
              speaker: 'iya-morenike',
              text: {
                en: 'A town that carries another’s load forever forgets how to stand.',
              },
              langs: ['en'],
            },
            {
              id: 'k1-t-2',
              speaker: 'bisi',
              text: { en: 'The ajele has come for the tribute again. TODO writer: Bisi line.' },
              langs: ['en'],
              glossary: ['ajele'],
            },
            {
              id: 'k1-t-3',
              speaker: 'akin',
              text: { en: 'Ẹ jẹ́ ká lọ!', pcm: 'Oya, make we go!' },
              langs: ['yo'],
              native_review: true,
            },
          ],
        },
      ],
    },
  ],
  learning: [
    {
      version: 1,
      kind: 'learning',
      id: 'kiriji-1-learning',
      campaign: 'kiriji',
      chapter: 'kiriji-1',
      facts: [
        {
          id: 'k1-fact-ajele',
          trigger: 'villagers-escorted',
          tag: 'History',
          sourceRef: 'k1-src-johnson',
          text: {
            en: 'In the 19th century, Ibadan ruled other towns through resident officials called ajele.',
            pcm: 'For 19th century, Ibadan dey rule oda towns with resident officials wey dem dey call ajele.',
          },
          ...review,
        },
        {
          id: 'k1-fact-dates',
          trigger: 'hill-path-reached',
          tag: 'History',
          sourceRef: 'k1-src-johnson',
          text: {
            en: 'The Kiriji War is dated 1877 to 1893.',
            pcm: 'Dem date Kiriji War from 1877 reach 1893.',
          },
          ...review,
        },
        {
          id: 'k1-fact-treaty',
          trigger: 'chapter-won',
          tag: 'History',
          sourceRef: 'k1-src-johnson',
          text: { en: 'The Kiriji treaty is dated 23 September 1886.' },
          ...review,
        },
      ],
      sources: [
        {
          id: 'k1-src-johnson',
          title: 'The History of the Yorubas',
          author: 'Samuel Johnson',
          when: '1921',
          why: { en: todo('why this source matters for Chapter 1') },
          citation: `Johnson, S. (1921). The History of the Yorubas. ${todo('edition and page')}`,
          codex: { shelf: 'books', slot: 1 },
          tag: 'History',
          ...review,
        },
      ],
      twoSides: [
        {
          id: 'k1-sides-revolt',
          event: { en: 'The ajele system' },
          tag: 'History',
          sides: [
            {
              id: 'ibadan',
              label: 'Ibadan',
              account: { en: todo('how Ibadan remembers the ajele system') },
              basis: 'tradition',
            },
            {
              id: 'ekitiparapo',
              label: 'Ekitiparapo towns',
              account: { en: todo('how the Ekiti towns remember the ajele system') },
              basis: 'tradition',
            },
          ],
          ...review,
        },
      ],
      pins: [
        {
          id: 'k1-pin-war',
          kind: 'both',
          label: { en: 'Oke-Imesi' },
          date: { start: { year: 1877 }, end: { year: 1893 } },
          place: { name: 'Oke-Imesi', x: 0.5, y: 0.5 },
          tag: 'History',
          ...review,
          source: todo('map coordinates are placeholders'),
        },
        {
          id: 'k1-pin-treaty',
          kind: 'timeline',
          label: { en: 'Kiriji treaty' },
          date: { start: { year: 1886, month: 9, day: 23 } },
          tag: 'History',
          ...review,
        },
      ],
      checks: [
        {
          id: 'k1-q-ajele',
          category: 'kiriji',
          difficulty: 'easy',
          q: 'Through which resident officials did Ibadan rule other towns?',
          options: ['Ajele', 'Balogun', 'Seriki', 'Saro'],
          answer: 0,
          explanation: 'Ibadan ruled other towns through resident officials called ajele.',
          ...review,
        },
        {
          id: 'k1-q-start',
          category: 'kiriji',
          difficulty: 'easy',
          q: 'In which year does the Kiriji War begin?',
          options: ['1877', '1886', '1893', '1909'],
          answer: 0,
          explanation: 'The Kiriji War is dated 1877 to 1893.',
          ...review,
        },
        {
          id: 'k1-q-treaty',
          category: 'kiriji',
          difficulty: 'medium',
          q: 'What is the date of the Kiriji treaty?',
          options: [
            '23 September 1877',
            '23 September 1886',
            '23 September 1893',
            '1 October 1886',
          ],
          answer: 1,
          explanation: 'The Kiriji treaty is dated 23 September 1886.',
          ...review,
        },
      ],
    },
  ],
  glossary: [
    {
      version: 1,
      kind: 'glossary',
      id: 'kiriji-glossary',
      campaign: 'kiriji',
      terms: [
        {
          id: 'ajele',
          term: 'Ajele',
          language: 'yo',
          definition: { en: 'A resident official through whom Ibadan ruled a town.' },
          diacriticChecked: false,
          ...review,
        },
        {
          id: 'ekitiparapo',
          term: 'Ekitiparapo',
          language: 'yo',
          definition: {
            en: 'A confederacy: towns joining forces under one command in the Kiriji War.',
          },
          diacriticChecked: false,
          ...review,
        },
      ],
    },
  ],
});

export const featuresFixture = (): FeatureConfig => ({
  version: 1,
  features: { moremiPrologue: false },
});
