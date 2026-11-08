#!/usr/bin/env node
// Validates the Sabi Quiz question packs in games/sabi-quiz/assets/packs/.
// Shape: {version, id, title, lang, questions:[{id, category, difficulty, q, options:[4], answer, source, reviewed, tags?}]}
// Checks: counts, shape, duplicate ids and questions, option uniqueness, answer-index spread, length caps
// (q <= 140, option <= 48 so they fit at 360x640), difficulty mix (about 40/40/20), content-safety word list,
// daily-seed (10 questions, each identical to a core-pack question).
// Usage: node scripts/check-sabi-quiz-pack.mjs [--release]
//   --release also FAILS if any question still has reviewed:false (a human fact-checker must flip it first).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'games', 'sabi-quiz', 'assets', 'packs');
const RELEASE = process.argv.includes('--release');
export const CATEGORIES = [
  'nollywood',
  'afrobeats',
  'football',
  'history',
  'food',
  'general',
  'pidgin',
  'geography',
];
export const DIFFICULTIES = ['easy', 'medium', 'hard'];
const MAX_Q = 140,
  MAX_OPT = 48;
let fail = 0;
const ok = (c, m) => {
  console.log((c ? 'ok   ' : 'FAIL ') + m);
  if (!c) fail = 1;
};
const warn = (m) => console.log('warn ' + m);
const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const words = (s) =>
  new Set(
    norm(s)
      .split(' ')
      .filter((w) => w.length > 2),
  );
const jaccard = (a, b) => {
  const i = [...a].filter((x) => b.has(x)).length;
  return i / (a.size + b.size - i || 1);
};
const BANNED =
  /\b(gambl\w*|casino|lotter\w*|betting|jackpot|stake money|kill\w*|murder\w*|blood\w*|gore|rape\w*|suicide|sex\w*|porn\w*|cocaine|heroin|apc|pdp|labour party|boko haram)\b/i;

const load = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'));
const core = load('sabi-core-en.json');
const daily = load('daily-seed.json');

function shape(pack, name) {
  for (const k of ['version', 'id', 'title', 'lang', 'questions'])
    ok(pack[k] !== undefined, `${name}: has "${k}"`);
  ok(Number.isInteger(pack.version) && pack.version >= 1, `${name}: version is a positive integer`);
  ok(typeof pack.id === 'string' && /^[a-z0-9-]+$/.test(pack.id), `${name}: id is a slug`);
  ok(['en', 'pcm'].includes(pack.lang), `${name}: lang is en or pcm`);
  let bad = 0;
  const seenId = new Set();
  for (const q of pack.questions) {
    const p = `${name}/${q.id}`;
    const e = (c, m) => {
      if (!c) {
        console.log(`FAIL ${p}: ${m}`);
        bad++;
      }
    };
    const keys = Object.keys(q).sort().join(',');
    e(
      keys === 'answer,category,difficulty,id,options,q,reviewed,source' ||
        keys === 'answer,category,difficulty,id,options,q,reviewed,source,tags',
      `unexpected keys ${keys}`,
    );
    e(typeof q.id === 'string' && !seenId.has(q.id), 'id missing or duplicate');
    seenId.add(q.id);
    e(CATEGORIES.includes(q.category), `category ${q.category}`);
    e(DIFFICULTIES.includes(q.difficulty), `difficulty ${q.difficulty}`);
    e(typeof q.q === 'string' && q.q.trim().length >= 8, 'question text');
    e(q.q.length <= MAX_Q, `question ${q.q.length} chars > ${MAX_Q}`);
    e(Array.isArray(q.options) && q.options.length === 4, 'exactly 4 options');
    e(
      q.options.every((o) => typeof o === 'string' && o.trim().length > 0),
      'empty option',
    );
    e(
      q.options.every((o) => o.length <= MAX_OPT),
      `option over ${MAX_OPT} chars: ${q.options.find((o) => o.length > MAX_OPT)}`,
    );
    e(new Set(q.options.map(norm)).size === 4, 'duplicate options');
    e(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3, 'answer index 0..3');
    e(
      typeof q.source === 'string' && q.source.trim().length >= 8,
      'source must name a public source',
    );
    e(!/^(unknown|n\/a|tbd|none)$/i.test(q.source), 'source is a placeholder');
    e(typeof q.reviewed === 'boolean', 'reviewed must be boolean');
    e(!BANNED.test([q.q, ...q.options].join(' ')), 'banned word (content rules)');
    if (q.tags) {
      e(
        Array.isArray(q.tags) && q.tags.every((t) => ['pidgin', 'native-review'].includes(t)),
        'unknown tag',
      );
      e(
        !q.tags.includes('pidgin') || q.category === 'pidgin',
        'pidgin tag only on the pidgin category',
      );
    }
    // the correct option must not be named in the question ("Lagos ... Lagos")
    const ans = norm(q.options[q.answer] ?? '');
    e(
      !(
        ans.length >= 4 &&
        new RegExp('(^| )' + ans.replace(/[.*+?^${}()|[\]\\]/g, ' ') + '( |$)').test(norm(q.q))
      ),
      `answer "${ans}" appears in the question`,
    );
  }
  ok(
    bad === 0,
    `${name}: every question has valid shape, caps (q<=${MAX_Q}, option<=${MAX_OPT}), 4 unique options`,
  );
}
shape(core, 'core');
shape(daily, 'daily');

// counts
const n = core.questions.length;
ok(n === 300, `core has 300 questions (${n})`);
const by = (key) => core.questions.reduce((m, q) => ((m[q[key]] = (m[q[key]] ?? 0) + 1), m), {});
const cats = by('category'),
  diffs = by('difficulty');
console.log('     categories', JSON.stringify(cats));
console.log('     difficulty', JSON.stringify(diffs));
ok(
  CATEGORIES.every((c) => (cats[c] ?? 0) >= 30 && cats[c] <= 45),
  'each of 8 categories has 30 to 45 questions',
);
const pct = (d) => ((diffs[d] ?? 0) / n) * 100;
ok(
  Math.abs(pct('easy') - 40) <= 5 &&
    Math.abs(pct('medium') - 40) <= 5 &&
    Math.abs(pct('hard') - 20) <= 5,
  `difficulty mix about 40/40/20 (${pct('easy').toFixed(0)}/${pct('medium').toFixed(0)}/${pct('hard').toFixed(0)})`,
);
for (const c of CATEGORIES)
  ok(
    DIFFICULTIES.every((d) => core.questions.some((q) => q.category === c && q.difficulty === d)),
    `category ${c} has all 3 difficulties`,
  );

// duplicates
const seenQ = new Map();
let dupes = 0;
for (const q of core.questions) {
  const k = norm(q.q);
  if (seenQ.has(k)) {
    console.log(`FAIL duplicate question ${q.id} = ${seenQ.get(k)}`);
    dupes++;
  }
  seenQ.set(k, q.id);
}
const ws = core.questions.map((q) => ({ id: q.id, w: words(q.q), a: norm(q.options[q.answer]) }));
for (let i = 0; i < ws.length; i++)
  for (let j = i + 1; j < ws.length; j++)
    if (ws[i].a === ws[j].a && jaccard(ws[i].w, ws[j].w) >= 0.7) {
      console.log(`FAIL near-duplicate ${ws[i].id} ~ ${ws[j].id}`);
      dupes++;
    }
ok(dupes === 0, 'no duplicate or near-duplicate questions');

// answer index spread
const pos = [0, 1, 2, 3].map((i) => core.questions.filter((q) => q.answer === i).length);
console.log('     answer index counts', pos.join(' / '));
ok(
  pos.every((c) => c / n >= 0.2 && c / n <= 0.3),
  'answer index spread 20 to 30 percent each overall',
);
for (const d of DIFFICULTIES) {
  const g = core.questions.filter((q) => q.difficulty === d);
  const p = [0, 1, 2, 3].map((i) => g.filter((q) => q.answer === i).length / g.length);
  ok(
    p.every((x) => x >= 0.15 && x <= 0.35),
    `answer index spread within ${d} (${p.map((x) => (x * 100).toFixed(0)).join('/')}%)`,
  );
}
let run = 0,
  maxRun = 0;
core.questions.forEach((q, i) => {
  run = i && q.answer === core.questions[i - 1].answer ? run + 1 : 1;
  maxRun = Math.max(maxRun, run);
});
ok(maxRun <= 4, `no run of more than 4 identical answer indexes in file order (max ${maxRun})`);
const longest = core.questions.filter((q) => {
  const L = q.options.map((o) => o.length);
  return L[q.answer] === Math.max(...L) && L.filter((x) => x === Math.max(...L)).length === 1;
}).length;
ok(
  longest / n <= 0.4,
  `correct option is the strictly longest in ${((longest / n) * 100).toFixed(0)}% (<= 40%, avoids a length giveaway)`,
);

// pidgin-tagged
const pcmQ = core.questions.filter((q) => q.tags?.includes('pidgin')).length;
console.log(
  `     pidgin-phrased questions: ${pcmQ}; needing native speaker: ${core.questions.filter((q) => q.tags?.includes('native-review')).length}`,
);

// daily seed
ok(daily.questions.length === 10, 'daily-seed has exactly 10 questions');
const byId = new Map(core.questions.map((q) => [q.id, q]));
ok(
  daily.questions.every(
    (q) => byId.has(q.id) && JSON.stringify(byId.get(q.id)) === JSON.stringify(q),
  ),
  'daily-seed questions are identical copies of core questions (one fact-check covers both)',
);
ok(
  new Set(daily.questions.map((q) => q.category)).size >= 5,
  'daily-seed spans at least 5 categories',
);
const dd = daily.questions.map((q) => q.difficulty);
ok(
  JSON.stringify(dd) ===
    JSON.stringify([...dd].sort((a, b) => DIFFICULTIES.indexOf(a) - DIFFICULTIES.indexOf(b))),
  'daily-seed ramps easy to hard',
);

// review state
const unrev = core.questions.filter((q) => !q.reviewed).length;
if (unrev) {
  const msg = `${unrev} of ${n} questions still have reviewed:false (a human fact-checker must flip them)`;
  if (RELEASE) ok(false, msg);
  else warn(msg + '. Pass --release to make this a failure.');
} else ok(true, 'all questions reviewed');
process.exit(fail);
