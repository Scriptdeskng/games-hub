/**
 * Guardrail linter: scans every player-visible string of a campaign for words and phrases that
 * break the SCRIPT.md cultural guardrails or the telco content rules.
 *
 * Configuration (documented in docs/games/akoni-dike/ARCHITECTURE.md, section 2.4):
 *  - `DEFAULT_GUARDRAILS` below is the baseline. A project file
 *    `games/akoni-dike/content/guardrails.json` is MERGED over it with `mergeGuardrails`:
 *    a rule with the same `id` replaces the default, a new `id` is added, `severity: "off"`
 *    disables a rule, `ethnicGroups` and `realPeople` are unioned, `allow` entries are appended.
 *  - Patterns are regular-expression sources, matched case-insensitively with the `u` flag.
 *    `{ETHNIC}` expands to an alternation of `ethnicGroups`.
 *  - `severity: "error"` fails `content:check`; `"warning"` is printed only.
 *  - `allow` silences one rule at one location prefix (matched on a segment boundary, so `kiriji-1`
 *    does not silence `kiriji-10`), with a mandatory reason, for a deliberate exception (e.g. a codex
 *    sentence that must say "slave raiding").
 *  - The eight SCRIPT guardrail rules (`PROTECTED_RULES`) cannot be turned off, downgraded or have
 *    their patterns replaced by a project file; the override is rejected. Any other override of a
 *    built-in rule must carry a `reason`.
 */
import type { ValidationResult } from '../types';
import type { Finding } from './types';
import { isObj, isStr, sink } from './check';

export type RuleSeverity = 'error' | 'warning' | 'off';
export interface GuardrailRule {
  id: string;
  severity: RuleSeverity;
  patterns: string[];
  message: string;
  /** Why this project changes a built-in rule. Required when `id` is a built-in rule id. */
  reason?: string;
}
export interface GuardrailAllow {
  rule: string;
  /** Location prefix, e.g. `kiriji-1-learning.facts[2]`. */
  at: string;
  reason: string;
}
export interface GuardrailConfig {
  version: 1;
  rules: GuardrailRule[];
  allow: GuardrailAllow[];
  /** Names used to expand `{ETHNIC}` (lower case). */
  ethnicGroups: string[];
  /** Speaker ids of real people: their lines must carry `fictional: true`. */
  realPeople: string[];
}
export interface TextRef {
  at: string;
  text: string;
}

/** Armed forces that are colonial by their very name (the Company's constabulary, police, askaris). */
const COLONIAL_FORCE =
  'constables?|constabulary|policemen|police|riflemen|sepoys?|askaris?|mercenar\\w+';
/** Forces an indigenous army can also be called: an ethnic label on these is an error only beside a colonial word. */
const ANY_FORCE = 'soldiers?|troops?|forces?';
/** Words that put a clause in the colonial setting. */
const COLONIAL_CONTEXT =
  'company|constables?|constabulary|colonial\\w*|royal\\s+niger|crown|police|policemen|protectorate';
/** A clause: no sentence or clause-ending punctuation inside. */
const CL = '[^.;:!?]';
/** Negation words: a clause containing one is not asserting the thing. */
const NEG = "never|not|no|nor|neither|without|\\w+n['’]t";
/** Up to `n` characters of one clause that contain no negation word. */
const gap = (n: number): string => `(?:(?!\\b(?:${NEG})\\b)${CL}){0,${n}}`;
/** One word that is not a negation word. */
const WORD = `(?!(?:${NEG})\\b)\\w+`;
/** Not preceded, in the same clause, by a negation word. */
const NOT_NEGATED = `(?<!\\b(?:${NEG})\\b[^.;:!?,]*)`;

/** The eight SCRIPT guardrail rules. A project `guardrails.json` may not weaken them. */
export const PROTECTED_RULES: readonly string[] = [
  'blood',
  'skull',
  'beheading',
  'gore',
  'tribe-of',
  'colonial-ethnic-label',
  'yoruba-igbo-enemies',
  'ugbo-villain',
];

export const DEFAULT_GUARDRAILS: GuardrailConfig = {
  version: 1,
  ethnicGroups: [
    'hausa',
    'yoruba',
    'igbo',
    'ibo',
    'fulani',
    'fula',
    'nupe',
    'tiv',
    'kanuri',
    'efik',
    'ijaw',
    'edo',
    'urhobo',
    'itsekiri',
    'igala',
    'idoma',
    'ibibio',
    'ijesa',
    'ekiti',
    'anioma',
    'ugbo',
    'ilaje',
    'ebira',
  ],
  realPeople: [
    'ogedengbe',
    'fabunmi',
    'latoosa',
    'samuel-johnson',
    'johnson',
    'charles-phillips',
    'phillips',
  ],
  allow: [],
  rules: [
    {
      id: 'blood',
      severity: 'error',
      patterns: ['\\bblood(?:y|ied|stained|shed|bath)?\\b'],
      message: 'no blood: hits flash and knock back',
    },
    { id: 'skull', severity: 'error', patterns: ['\\bskulls?\\b'], message: 'no skulls or bones' },
    {
      id: 'beheading',
      severity: 'error',
      patterns: ['\\b(?:behead\\w*|decapitat\\w*|severed heads?)\\b'],
      message: 'no beheading: rivals are disarmed, never killed',
    },
    {
      id: 'gore',
      severity: 'error',
      patterns: ['\\b(?:gore|gory|gruesome|mutilat\\w*|disembowel\\w*|entrails)\\b'],
      message: 'no gore',
    },
    {
      id: 'tribe-of',
      severity: 'error',
      patterns: ['\\btribe\\s+of\\b'],
      message: 'do not write "tribe of X": name the town, kingdom or people',
    },
    {
      id: 'colonial-ethnic-label',
      severity: 'error',
      patterns: [
        // constables, police, askaris... are colonial by name: an ethnic label is always wrong
        `\\b(?:{ETHNIC})[- ](?:speaking\\s+)?(?:${COLONIAL_FORCE})\\b`,
        `\\b(?:${COLONIAL_FORCE})\\s+(?:of|from)\\s+(?:the\\s+)?(?:{ETHNIC})\\b`,
        // soldiers, troops, forces: an error only in the same clause as a colonial word
        `\\b(?:${COLONIAL_CONTEXT})\\b${CL}{0,80}\\b(?:{ETHNIC})[- ](?:speaking\\s+)?(?:${ANY_FORCE})\\b`,
        `\\b(?:{ETHNIC})[- ](?:speaking\\s+)?(?:${ANY_FORCE})\\b${CL}{0,80}\\b(?:${COLONIAL_CONTEXT})\\b`,
        `\\b(?:${COLONIAL_CONTEXT})\\b${CL}{0,80}\\b(?:${ANY_FORCE})\\s+(?:of|from)\\s+(?:the\\s+)?(?:{ETHNIC})\\b`,
      ],
      message:
        'colonial forces are "the Company" and its constabulary, never labelled by ethnicity',
    },
    {
      id: 'ethnic-army-label',
      severity: 'warning',
      patterns: [
        `\\b(?:{ETHNIC})[- ](?:speaking\\s+)?(?:${ANY_FORCE})\\b`,
        `\\b(?:${ANY_FORCE})\\s+(?:of|from)\\s+(?:the\\s+)?(?:{ETHNIC})\\b`,
      ],
      message:
        "an ethnic name beside soldiers/troops/forces: fine for an indigenous army, an error if it means the Company's men (colonial forces are never labelled by ethnicity)",
    },
    {
      id: 'yoruba-igbo-enemies',
      severity: 'error',
      patterns: [
        `${NOT_NEGATED}\\b(?:yoruba|igbo|ibo)\\s+(?:enem(?:y|ies)|villains?|invaders?|raiders?)\\b`,
        `${NOT_NEGATED}\\braiders?\\b${gap(40)}\\b(?:igbo|ibo)\\b`,
        `${NOT_NEGATED}\\b(?:igbo|ibo)\\b${gap(40)}\\braiders?\\b`,
        `${NOT_NEGATED}\\b(?:yoruba|igbo|ibo)\\b(?:\\s+${WORD}){0,3}?\\s+(?:were|was|are|is|as|be)\\s+(?:${WORD}\\s+){0,2}(?:enem(?:y|ies)|villains?)\\b`,
      ],
      message: 'Yoruba and Igbo are never enemies; the Moremi raiders are never called Igbo',
    },
    {
      id: 'ugbo-villain',
      severity: 'error',
      patterns: ['\\bugbo\\b[^.]{0,40}\\b(?:villains?|enem(?:y|ies)|raiders?)\\b'],
      message: 'the Ugbo people are never put on screen as villains',
    },
    {
      id: 'villain-city',
      severity: 'warning',
      patterns: [
        '\\bibadan\\b[^.]{0,60}\\b(?:villains?|evil|wicked|cruel|tyrant\\w*|barbaric)\\b',
        '\\b(?:villains?|evil|wicked|cruel|tyrant\\w*|barbaric)\\b[^.]{0,60}\\bibadan\\b',
      ],
      message: 'no villain city: Ibadan commanders are capable rivals',
    },
    {
      id: 'tribe-word',
      severity: 'warning',
      patterns: ['\\b(?:tribe|tribes|tribal)\\b'],
      message: 'prefer the specific name (kingdom, town, people, age-grade)',
    },
    {
      id: 'violence-words',
      severity: 'warning',
      patterns: [
        '\\b(?:kill\\w*|murder\\w*|slain|slay\\w*|massacre\\w*|slaughter\\w*|execut\\w*|torture\\w*|hanged)\\b',
      ],
      message: 'rivals are disarmed, never killed; keep real deaths to one codex sentence',
    },
    {
      id: 'trophy',
      severity: 'warning',
      patterns: ['\\btrophy\\b', '\\btrophies\\b', '\\bhead[- ]?(?:hunt\\w*|taking)\\b'],
      message: 'no trophies; head-taking is one codex sentence, never shown',
    },
    {
      id: 'enslavement',
      severity: 'warning',
      patterns: ['\\bslav\\w+'],
      message: 'slave-raiding history gets one codex sentence and is never shown',
    },
    {
      id: 'sacred-imagery',
      severity: 'warning',
      patterns: [
        '\\b(?:shrines?|sacrific\\w*|masquerades?|egungun|nsibidi|mbari|ofo|war[- ]charms?)\\b',
      ],
      message:
        'faith with care: no shrines, sacrifices, masquerades, nsibidi or war charms on screen',
    },
    {
      id: 'people-in-flames',
      severity: 'warning',
      patterns: [
        '\\b(?:flames?|burn(?:s|ed|t|ing)?)\\b[^.]{0,30}\\b(?:people|villagers|children|child|man|woman|him|her|them|his|their|chief|raiders?|captain|guards?|soldiers?|rivals?|elder)\\b',
      ],
      message: 'smoke only: no flames on people',
    },
    {
      id: 'anachronism',
      severity: 'warning',
      patterns: ['\\b(?:corrugated|zinc roof\\w*|searchlights?|railways?|railroads?)\\b'],
      message: 'check the asset-bible anachronism list for this chapter',
    },
  ],
};

const ruleOk = (r: unknown): r is GuardrailRule =>
  isObj(r) &&
  (r.reason === undefined || typeof r.reason === 'string') &&
  isStr(r.id) &&
  ['error', 'warning', 'off'].includes(r.severity as string) &&
  Array.isArray(r.patterns) &&
  r.patterns.every(isStr) &&
  isStr(r.message);

/** Validate a `guardrails.json` override. Patterns must compile. */
export function validateGuardrailOverride(
  data: unknown,
): ValidationResult<Partial<GuardrailConfig>> {
  const s = sink();
  if (!isObj(data)) return { ok: false, errors: ['guardrails must be an object'] };
  if (data.version !== 1) s.add('version', 'must be 1');
  if (data.rules !== undefined) {
    if (!Array.isArray(data.rules)) s.add('rules', 'must be an array');
    else {
      data.rules.forEach((r, i) => {
        if (!ruleOk(r)) return void s.add(`rules[${i}]`, 'needs id, severity, patterns[], message');
        const builtIn = DEFAULT_GUARDRAILS.rules.find((d) => d.id === r.id);
        if (builtIn && !isStr(r.reason))
          s.add(`rules[${i}]`, `overriding built-in rule "${r.id}" needs a reason`);
        if (PROTECTED_RULES.includes(r.id)) {
          if (r.severity !== 'error')
            s.add(`rules[${i}]`, `"${r.id}" is a SCRIPT guardrail: severity must stay "error"`);
          if (JSON.stringify(r.patterns) !== JSON.stringify(builtIn?.patterns))
            s.add(
              `rules[${i}]`,
              `"${r.id}" is a SCRIPT guardrail: its patterns cannot be replaced (add a new rule id, or an allow entry with a reason)`,
            );
        }
        for (const p of r.patterns) {
          try {
            new RegExp(p.split('{ETHNIC}').join('x'), 'iu');
          } catch {
            s.add(`rules[${i}]`, `pattern does not compile: ${p}`);
          }
        }
      });
    }
  }
  for (const k of ['ethnicGroups', 'realPeople'] as const) {
    const v = data[k];
    if (v !== undefined && (!Array.isArray(v) || !v.every(isStr)))
      s.add(k, 'must be an array of strings');
  }
  if (data.allow !== undefined) {
    const a = data.allow;
    if (
      !Array.isArray(a) ||
      !a.every((x) => isObj(x) && isStr(x.rule) && isStr(x.at) && isStr(x.reason))
    ) {
      s.add('allow', 'entries need rule, at and a reason');
    }
  }
  return s.errors.length
    ? { ok: false, errors: s.errors }
    : { ok: true, value: data as Partial<GuardrailConfig> };
}

export function mergeGuardrails(
  base: GuardrailConfig,
  over: Partial<GuardrailConfig> = {},
): GuardrailConfig {
  const rules = new Map(base.rules.map((r) => [r.id, r]));
  // Defence in depth: validateGuardrailOverride rejects this, and merge refuses it too.
  for (const r of over.rules ?? []) if (!PROTECTED_RULES.includes(r.id)) rules.set(r.id, r);
  const union = (a: string[], b: string[] = []): string[] => [
    ...new Set([...a, ...b.map((x) => x.toLowerCase())]),
  ];
  return {
    version: 1,
    rules: [...rules.values()],
    allow: [...base.allow, ...(over.allow ?? [])],
    ethnicGroups: union(base.ethnicGroups, over.ethnicGroups),
    realPeople: union(base.realPeople, over.realPeople),
  };
}

/** `at` is the allowed location or lies under it: `kiriji-1` allows `kiriji-1.facts[0]`, not `kiriji-10`. */
const atMatches = (at: string, prefix: string): boolean =>
  at === prefix || (at.startsWith(prefix) && /[.[]/.test(at.charAt(prefix.length)));

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Lint strings against the rules. Matching runs on NFC text, case-insensitive. */
export function lintTexts(
  texts: Iterable<TextRef>,
  cfg: GuardrailConfig = DEFAULT_GUARDRAILS,
): Finding[] {
  const ethnic = cfg.ethnicGroups.map(escapeRe).join('|');
  const compiled = cfg.rules
    .filter((r) => r.severity !== 'off')
    .map((r) => ({
      r,
      res: r.patterns.map((p) => new RegExp(p.split('{ETHNIC}').join(ethnic), 'giu')),
    }));
  const out: Finding[] = [];
  for (const { at, text } of texts) {
    const t = text.normalize('NFC');
    for (const { r, res } of compiled) {
      if (cfg.allow.some((a) => a.rule === r.id && atMatches(at, a.at))) continue;
      for (const re of res) {
        re.lastIndex = 0;
        const m = re.exec(t);
        if (m) {
          out.push({
            severity: r.severity as 'error' | 'warning',
            rule: `guardrail/${r.id}`,
            at,
            message: `"${m[0]}": ${r.message}`,
          });
          break;
        }
      }
    }
  }
  return out;
}
