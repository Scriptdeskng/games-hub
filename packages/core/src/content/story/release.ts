/**
 * Release gate. A DEV or PREVIEW build tolerates `reviewed: false` (writers and historians work in
 * the open) and only reports the count. A RELEASE build (NAIJA_RELEASE=1 or `--release`) fails
 * while ANY learning or quiz item is unreviewed. Pure functions; the file scanning is in
 * scripts/content-gate.ts.
 */
import type { CampaignBundle } from './types';

export interface ReviewItem {
  kind: 'chapter' | 'fact' | 'source' | 'twoSides' | 'pin' | 'check' | 'glossary';
  id: string;
  at: string;
  reviewed: boolean;
  reviewedBy: string;
}

export interface ReleaseReport {
  total: number;
  unreviewed: ReviewItem[];
  /** Dialogue lines still flagged `native_review: true` (reported, not blocking). */
  nativePending: number;
  /** Dialogue lines still flagged `pcm_review: true` (reported, not blocking). */
  pcmPending: number;
  /** Glossary terms with `diacriticChecked: false` (reported, not blocking). */
  diacriticsPending: number;
}

const TRUTHY = ['1', 'true', 'yes'];
const FALSY = ['', '0', 'false', 'no'];

/**
 * Is this a release build? Explicit on purpose: `NAIJA_RELEASE=1|true|yes` or `--release`.
 * `0|false|no|` (empty) or unset means a dev/preview build. Any other value THROWS: a typo such as
 * `NAIJA_RELEASE=ture` must never silently fall back to the permissive mode.
 */
export function isReleaseMode(
  env: Readonly<Record<string, string | undefined>>,
  argv: readonly string[] = [],
): boolean {
  if (argv.includes('--release')) return true;
  const v = (env.NAIJA_RELEASE ?? '').trim().toLowerCase();
  if (TRUTHY.includes(v)) return true;
  if (FALSY.includes(v)) return false;
  throw new Error(`NAIJA_RELEASE must be 1 or 0 (got "${env.NAIJA_RELEASE}")`);
}

export function collectReviewItems(b: CampaignBundle): ReviewItem[] {
  const out: ReviewItem[] = [];
  const add = (
    kind: ReviewItem['kind'],
    at: string,
    x: { id: string; reviewed: boolean; reviewedBy: string },
  ): void => void out.push({ kind, id: x.id, at, reviewed: x.reviewed, reviewedBy: x.reviewedBy });
  for (const c of b.chapters) add('chapter', c.id, c);
  for (const p of b.learning) {
    p.facts.forEach((x) => add('fact', `${p.id}.${x.id}`, x));
    p.sources.forEach((x) => add('source', `${p.id}.${x.id}`, x));
    p.twoSides.forEach((x) => add('twoSides', `${p.id}.${x.id}`, x));
    p.pins.forEach((x) => add('pin', `${p.id}.${x.id}`, x));
    p.checks.forEach((x) => add('check', `${p.id}.${x.id}`, x));
  }
  for (const g of b.glossary) g.terms.forEach((x) => add('glossary', `${g.id}.${x.id}`, x));
  return out;
}

export function releaseReport(b: CampaignBundle): ReleaseReport {
  const items = collectReviewItems(b);
  return {
    total: items.length,
    unreviewed: items.filter((i) => !i.reviewed),
    nativePending: b.dialogue
      .flatMap((d) => d.scenes.flatMap((s) => s.lines))
      .filter((l) => l.native_review === true).length,
    pcmPending: b.dialogue
      .flatMap((d) => d.scenes.flatMap((s) => s.lines))
      .filter((l) => l.pcm_review === true).length,
    diacriticsPending: b.glossary.flatMap((g) => g.terms).filter((t) => !t.diacriticChecked).length,
  };
}

/** Lines for the console. `ok` is false only in release mode with unreviewed items. */
export function describeRelease(
  r: ReleaseReport,
  release: boolean,
): { ok: boolean; lines: string[] } {
  const lines = [
    `content: ${r.total} learning item(s), ${r.unreviewed.length} with reviewed:false`,
    `content: ${r.nativePending} dialogue line(s) awaiting native review, ${r.pcmPending} awaiting Pidgin review, ${r.diacriticsPending} glossary term(s) with diacriticChecked:false (reported only)`,
  ];
  if (!release) {
    lines.push(
      'content: dev/preview build, reviewed:false is allowed (set NAIJA_RELEASE=1 for a release build)',
    );
    return { ok: true, lines };
  }
  if (r.unreviewed.length === 0)
    return { ok: true, lines: [...lines, 'content: release gate passed'] };
  const shown = r.unreviewed
    .slice(0, 25)
    .map((i) => `  - ${i.kind} ${i.at} (reviewedBy: ${i.reviewedBy})`);
  if (r.unreviewed.length > 25) shown.push(`  ... and ${r.unreviewed.length - 25} more`);
  return {
    ok: false,
    lines: [
      ...lines,
      `RELEASE GATE FAILED: ${r.unreviewed.length} item(s) still have reviewed:false`,
      ...shown,
    ],
  };
}
