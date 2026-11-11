import type { TextRef } from './guardrails';
import type { CampaignBundle, LocalizedText } from './types';

function* loc(at: string, t: LocalizedText | undefined): Generator<TextRef> {
  if (!t) return;
  for (const [k, v] of Object.entries(t))
    if (typeof v === 'string') yield { at: `${at}.${k}`, text: v };
}

/** Every player-visible string of a campaign bundle (not the `source`/`reviewedBy` metadata on each item). */
export function* collectTexts(b: CampaignBundle): Generator<TextRef> {
  for (const c of b.chapters) {
    yield* loc(`${c.id}.title`, c.title);
    for (const [i, g] of c.goals.entries()) yield* loc(`${c.id}.goals[${i}]`, g);
    for (const [i, o] of c.objectives.entries()) yield* loc(`${c.id}.objectives[${i}]`, o.text);
    yield* loc(`${c.id}.heroMoment`, c.heroMoment.text);
    if (c.dates.sourcesDisagree) yield { at: `${c.id}.dates`, text: c.dates.sourcesDisagree };
  }
  for (const d of b.dialogue) {
    for (const [si, sc] of d.scenes.entries()) {
      for (const [li, l] of sc.lines.entries())
        yield* loc(`${d.id}.scenes[${si}].lines[${li}]`, l.text);
    }
  }
  for (const p of b.learning) {
    for (const [i, f] of p.facts.entries()) yield* loc(`${p.id}.facts[${i}]`, f.text);
    for (const [i, s] of p.sources.entries()) {
      const at = `${p.id}.sources[${i}]`;
      yield { at: `${at}.title`, text: s.title };
      yield { at: `${at}.author`, text: s.author };
      yield { at: `${at}.citation`, text: s.citation };
      yield* loc(`${at}.why`, s.why);
      if (s.quote) yield { at: `${at}.quote`, text: s.quote };
    }
    for (const [i, t] of p.twoSides.entries()) {
      const at = `${p.id}.twoSides[${i}]`;
      yield* loc(`${at}.event`, t.event);
      for (const [k, sd] of t.sides.entries()) {
        yield { at: `${at}.sides[${k}].label`, text: sd.label };
        yield* loc(`${at}.sides[${k}].account`, sd.account);
      }
    }
    for (const [i, pin] of p.pins.entries()) yield* loc(`${p.id}.pins[${i}]`, pin.label);
    for (const [i, q] of p.checks.entries()) {
      const at = `${p.id}.checks[${i}]`;
      yield { at: `${at}.q`, text: q.q };
      for (const [k, o] of q.options.entries()) yield { at: `${at}.options[${k}]`, text: o };
      yield { at: `${at}.explanation`, text: q.explanation };
    }
  }
  for (const g of b.glossary) {
    for (const [i, t] of g.terms.entries()) {
      yield { at: `${g.id}.terms[${i}].term`, text: t.term };
      yield* loc(`${g.id}.terms[${i}].definition`, t.definition);
    }
  }
}
