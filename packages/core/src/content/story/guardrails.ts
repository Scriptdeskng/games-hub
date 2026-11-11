/**
 * Guardrail linter: scans every player-visible string of a campaign for words and phrases that
 * break the SCRIPT.md cultural guardrails or the telco content rules.
 *
 * Configuration (documented in docs/games/akoni-dike/ARCHITECTURE.md, section "Content tooling"):
 *  - `DEFAULT_GUARDRAILS` below is the baseline. A project file
 *    `games/akoni-dike/content/guardrails.json` is MERGED over it with `mergeGuardrails`:
 *    a rule with the same `id` replaces the default, a new `id` is added, `severity: "off"`
 *    disables a rule, `ethnicGroups` and `realPeople` are unioned, `allow` entries are appended.
 *  - Patterns are regular-expression sources, matched case-insensitively with the `u` flag.
 *    `{ETHNIC}` expands to an alternation of `ethnicGroups`.
 *  - `severity: "error"` fails `content:check`; `"warning"` is printed only.
 *  - `allow` silences one rule at one location prefix, with a mandatory reason, for a deliberate
 *    exception (e.g. a codex sentence that must say "slave raiding").
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

const COLONIAL =
  'soldiers?|troops?|constables?|constabulary|policemen|police|riflemen|sepoys?|askaris?|mercenar\\w+|force';

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
        `\\b(?:{ETHNIC})[- ](?:speaking\\s+)?(?:${COLONIAL})\\b`,
        `\\b(?:${COLONIAL})\\s+(?:of|from)\\s+(?:the\\s+)?(?:{ETHNIC})\\b`,
      ],
      message:
        'colonial forces are "the Company" and its constabulary, never labelled by ethnicity',
    },
    {
      id: 'yoruba-igbo-enemies',
      severity: 'error',
      patterns: [
        '\\b(?:yoruba|igbo|ibo)\\s+(?:enem(?:y|ies)|villains?|invaders?|raiders?)\\b',
        '\\braiders?\\b[^.]{0,40}\\b(?:igbo|ibo)\\b',
        '\\b(?:igbo|ibo)\\b[^.]{0,40}\\braiders?\\b',
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
        '\\b(?:flames?|burn(?:ed|t|ing)?)\\b[^.]{0,30}\\b(?:people|villagers|children|child|man|woman|him|her|them)\\b',
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
        for (const p of r.patterns) {
          try {
            new RegExp(p.replace('{ETHNIC}', 'x'), 'iu');
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
  for (const r of over.rules ?? []) rules.set(r.id, r);
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
      if (cfg.allow.some((a) => a.rule === r.id && at.startsWith(a.at))) continue;
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
