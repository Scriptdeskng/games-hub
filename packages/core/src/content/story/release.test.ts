import { describe, expect, it } from 'vitest';
import { kirijiOneBundle } from './fixtures';
import { collectReviewItems, describeRelease, isReleaseMode, releaseReport } from './release';

const reviewAll = (b: ReturnType<typeof kirijiOneBundle>): void => {
  const ok = (x: { reviewed: boolean; reviewedBy: string }): void => {
    x.reviewed = true;
    x.reviewedBy = 'Dr A. Historian';
  };
  b.chapters.forEach(ok);
  b.learning.forEach((p) => {
    [...p.facts, ...p.sources, ...p.twoSides, ...p.pins, ...p.checks].forEach(ok);
  });
  b.glossary.forEach((g) => g.terms.forEach(ok));
};

describe('isReleaseMode', () => {
  it('is explicit: 1, true, yes and --release turn it on', () => {
    for (const v of ['1', 'true', 'TRUE', 'yes', ' 1 '])
      expect(isReleaseMode({ NAIJA_RELEASE: v })).toBe(true);
    expect(isReleaseMode({}, ['--release'])).toBe(true);
  });
  it('unset, empty, 0, false and no mean a dev/preview build', () => {
    for (const v of [undefined, '', '0', 'false', 'no'])
      expect(isReleaseMode({ NAIJA_RELEASE: v })).toBe(false);
    expect(isReleaseMode({}, ['--other'])).toBe(false);
  });
  it('THROWS on anything else, so a typo can never fall back to the permissive mode', () => {
    expect(() => isReleaseMode({ NAIJA_RELEASE: 'ture' })).toThrow(/NAIJA_RELEASE must be 1 or 0/);
  });
});

describe('release report', () => {
  it('counts every learning item kind, including chapters and glossary terms', () => {
    const items = collectReviewItems(kirijiOneBundle());
    const kinds = new Set(items.map((i) => i.kind));
    expect([...kinds].sort()).toEqual([
      'chapter',
      'check',
      'fact',
      'glossary',
      'pin',
      'source',
      'twoSides',
    ]);
    expect(items).toHaveLength(1 + 3 + 1 + 1 + 2 + 3 + 2);
  });
  it('a dev/preview build passes with unreviewed items but reports them', () => {
    const r = releaseReport(kirijiOneBundle());
    expect(r.unreviewed).toHaveLength(r.total);
    expect(r.nativePending).toBe(1);
    expect(r.pcmPending).toBe(1);
    expect(r.diacriticsPending).toBe(2);
    const d = describeRelease(r, false);
    expect(d.ok).toBe(true);
    expect(d.lines.join('\n')).toContain('dev/preview');
    expect(d.lines.join('\n')).toContain('1 awaiting Pidgin review');
  });
  it('a release build FAILS while one item is unreviewed and lists it', () => {
    const b = kirijiOneBundle();
    reviewAll(b);
    expect(describeRelease(releaseReport(b), true)).toMatchObject({ ok: true });
    b.learning[0]!.checks[1]!.reviewed = false;
    const d = describeRelease(releaseReport(b), true);
    expect(d.ok).toBe(false);
    expect(d.lines.join('\n')).toContain('check kiriji-1-learning.k1-q-start');
    expect(d.lines.join('\n')).toContain('RELEASE GATE FAILED: 1 item(s)');
  });
  it('truncates a long list to 25 lines', () => {
    const b = kirijiOneBundle();
    const f = b.learning[0]!.facts[0]!;
    for (let i = 0; i < 30; i++) b.learning[0]!.facts.push({ ...f, id: `extra-${i}` });
    const d = describeRelease(releaseReport(b), true);
    expect(d.ok).toBe(false);
    expect(d.lines.join('\n')).toMatch(/and \d+ more/);
  });
});
