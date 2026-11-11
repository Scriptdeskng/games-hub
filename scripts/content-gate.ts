/**
 * Content gate for games/<slug>/content (akoni-dike). Bundled and run by scripts/content-check.mjs
 * and scripts/content-release-check.mjs; unit-tested directly.
 *
 * Layout read: content/{chapters,dialogue,learning,glossary}/**.json, optional content/guardrails.json
 * (merged over the built-in guardrail defaults) and games/<slug>/features.json.
 * - structure: every file against its validator (required fields, lengths, unknown fields);
 * - campaign: duplicate ids, cross-references, feature flags, guardrail text lint (errors fail);
 * - release: in release mode `reviewed:false` anywhere fails (see packages/core story/release.ts).
 * A missing content folder is a clear no-op (exit 0), so `npm run check` works before content exists.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_GUARDRAILS,
  describeRelease,
  isReleaseMode,
  errorsOf,
  formatFinding,
  lintBundle,
  mergeGuardrails,
  releaseReport,
  validateChapter,
  validateDialoguePack,
  validateFeatureConfig,
  validateGlossaryPack,
  validateGuardrailOverride,
  validateLearningPack,
  type CampaignBundle,
  type FeatureConfig,
  type Finding,
} from '../packages/core/src/content';
import type { ValidationResult } from '../packages/core/src/content/types';

export const CONTENT_SLUG = 'akoni-dike';
const DEFAULT_FEATURES: FeatureConfig = { version: 1, features: { moremiPrologue: false } };

const KINDS = [
  { dir: 'chapters', key: 'chapters', kind: 'chapter', validate: validateChapter },
  { dir: 'dialogue', key: 'dialogue', kind: 'dialogue', validate: validateDialoguePack },
  { dir: 'learning', key: 'learning', kind: 'learning', validate: validateLearningPack },
  { dir: 'glossary', key: 'glossary', kind: 'glossary', validate: validateGlossaryPack },
] as const;

const walkJson = (dir: string): string[] =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((e) => {
          const p = path.join(dir, e.name);
          return e.isDirectory() ? walkJson(p) : e.name.endsWith('.json') ? [p] : [];
        })
        .sort()
    : [];

export interface GateOptions {
  release: boolean;
  slug?: string;
  /** Pack ids declared in games/<slug>/packs.json (cross-checked with chapters), if known. */
  declaredPacks?: readonly string[];
}
export interface GateResult {
  code: 0 | 1;
  lines: string[];
}

function readJson(file: string, problems: string[], root: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
  } catch (e) {
    problems.push(`${path.relative(root, file)}: not valid JSON (${(e as Error).message})`);
    return undefined;
  }
}

export function runContentCheck(root: string, o: GateOptions): GateResult {
  const slug = o.slug ?? CONTENT_SLUG;
  const gameDir = path.join(root, 'games', slug);
  const contentDir = path.join(gameDir, 'content');
  if (!fs.existsSync(contentDir)) {
    return { code: 0, lines: [`content: games/${slug}/content not found, nothing to check`] };
  }
  const problems: string[] = [];
  const lines: string[] = [];
  const bundle: CampaignBundle = { chapters: [], dialogue: [], learning: [], glossary: [] };
  let files = 0;
  for (const k of KINDS) {
    for (const file of walkJson(path.join(contentDir, k.dir))) {
      files++;
      const rel = path.relative(root, file);
      const data = readJson(file, problems, root);
      if (data === undefined) continue;
      const r = k.validate(data) as ValidationResult<never>;
      if (!r.ok) problems.push(...r.errors.map((e) => `${rel}: ${e}`));
      else (bundle[k.key] as unknown[]).push(r.value);
    }
  }
  let features = DEFAULT_FEATURES;
  const featFile = path.join(gameDir, 'features.json');
  if (fs.existsSync(featFile)) {
    const fr = validateFeatureConfig(readJson(featFile, problems, root));
    if (fr.ok) features = fr.value;
    else problems.push(...fr.errors.map((e) => `features.json: ${e}`));
  } else lines.push('content: features.json missing, using defaults (moremiPrologue off)');
  let guardrails = DEFAULT_GUARDRAILS;
  const gFile = path.join(contentDir, 'guardrails.json');
  if (fs.existsSync(gFile)) {
    const gr = validateGuardrailOverride(readJson(gFile, problems, root));
    if (gr.ok) guardrails = mergeGuardrails(DEFAULT_GUARDRAILS, gr.value);
    else problems.push(...gr.errors.map((e) => `guardrails.json: ${e}`));
  }
  const findings: Finding[] = lintBundle(bundle, { features, guardrails });
  if (o.declaredPacks) {
    const declared = new Set(o.declaredPacks);
    for (const c of bundle.chapters) {
      if (c.pack && !declared.has(c.pack)) {
        findings.push({
          severity: 'error',
          rule: 'xref/packs-json',
          at: c.id,
          message: `pack ${c.pack} is not declared in packs.json`,
        });
      }
    }
    const used = new Set(bundle.chapters.map((c) => c.pack));
    for (const d of declared) {
      if (!used.has(d))
        findings.push({
          severity: 'warning',
          rule: 'xref/packs-json',
          at: 'packs.json',
          message: `declares ${d} but no chapter uses it`,
        });
    }
  }
  const errors = errorsOf(findings);
  const warnings = findings.filter((f) => f.severity === 'warning');
  lines.push(`content: ${files} file(s), ${bundle.chapters.length} chapter(s)`);
  for (const p of problems) lines.push(`ERROR ${p}`);
  for (const f of errors) lines.push(formatFinding(f));
  for (const f of warnings) lines.push(formatFinding(f));
  lines.push(`content: ${problems.length + errors.length} error(s), ${warnings.length} warning(s)`);
  const rel = describeRelease(releaseReport(bundle), o.release);
  lines.push(...rel.lines);
  const ok = problems.length === 0 && errors.length === 0 && rel.ok;
  return { code: ok ? 0 : 1, lines };
}

export { isReleaseMode };
