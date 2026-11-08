import { describe, expect, it } from 'vitest';
import { instruments } from '../../../../packages/core/src/audio/instruments';
import { WORDS_CELEBRATION_CUES, wordsSfx } from './sfx';

const steps = (c: unknown) =>
  (Array.isArray(c) ? c : [c]) as { voice: string; when?: number; gain?: number; pitch?: number }[];
const span = (c: unknown): number =>
  Math.max(...steps(c).map((s) => (s.when ?? 0) + instruments[s.voice]!.duration));
const CELEBRATION: readonly string[] = WORDS_CELEBRATION_CUES;
const voices = (name: string) =>
  steps(wordsSfx[name])
    .map((s) => s.voice)
    .sort();

describe('wordsSfx', () => {
  it('uses only core instrument voices (no generic ids)', () => {
    for (const [name, cue] of Object.entries(wordsSfx))
      for (const s of steps(cue)) expect(instruments[s.voice], `${name}:${s.voice}`).toBeDefined();
  });
  it('keeps every interaction cue at or under 300 ms and celebrations under 1.5 s', () => {
    for (const [name, cue] of Object.entries(wordsSfx))
      expect(span(cue), name).toBeLessThanOrEqual(CELEBRATION.includes(name) ? 1.5 : 0.3001);
  });
  it('defines every cue the brief promises', () => {
    for (const k of [
      'gridIn',
      'letterTap',
      'letterSwipe',
      'wordFound',
      'wordFoundLong',
      'wordWrong',
      'selectionClear',
      'hint',
      'coinSpend',
      'coinEarn',
      'star',
      'timerLow',
      'timerLast',
      'packPick',
      'hostIn',
      'scoreTick',
      'levelComplete',
      'levelFail',
    ])
      expect(wordsSfx[k], k).toBeDefined();
  });
  it('lists exactly the celebration cues that exceed 300 ms', () => {
    for (const name of CELEBRATION) expect(span(wordsSfx[name]), name).toBeGreaterThan(0.3);
    for (const [name, cue] of Object.entries(wordsSfx))
      if (!CELEBRATION.includes(name)) expect(span(cue), name).toBeLessThanOrEqual(0.3001);
  });
  it('maps taps to ekwe, found to agogo and wrong to a falling drum, with no gain above 1', () => {
    expect(voices('letterTap')).toEqual(['ekwe']);
    expect(voices('letterSwipe')).toContain('ekwe');
    expect(voices('wordFound')).toContain('agogo');
    expect(voices('wordWrong')).toEqual(['ekwe', 'talkingDrumDown']);
    expect(voices('hint')).toContain('udu');
    for (const [name, cue] of Object.entries(wordsSfx))
      for (const s of steps(cue)) expect(s.gain ?? 1, name).toBeLessThanOrEqual(1);
  });
  it('does not shadow core events', () => {
    for (const k of ['tap', 'select', 'coin', 'fail', 'win', 'lose', 'tick', 'start', 'success'])
      expect(wordsSfx[k], k).toBeUndefined();
  });
});
