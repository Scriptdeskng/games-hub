import { describe, expect, it } from 'vitest';
import { instruments } from '../../../../packages/core/src/audio/instruments';
import { QUIZ_CELEBRATION_CUES, quizSfx } from './sfx';

const steps = (c: unknown) =>
  (Array.isArray(c) ? c : [c]) as { voice: string; when?: number; gain?: number; pitch?: number }[];
const span = (c: unknown): number =>
  Math.max(...steps(c).map((s) => (s.when ?? 0) + instruments[s.voice]!.duration));
const CELEBRATION: readonly string[] = QUIZ_CELEBRATION_CUES;

describe('quizSfx', () => {
  it('uses only core instrument voices (no generic ids)', () => {
    for (const [name, cue] of Object.entries(quizSfx))
      for (const s of steps(cue)) expect(instruments[s.voice], `${name}:${s.voice}`).toBeDefined();
  });
  it('keeps every interaction cue at or under 300 ms and celebrations under 1.5 s', () => {
    for (const [name, cue] of Object.entries(quizSfx))
      expect(span(cue), name).toBeLessThanOrEqual(CELEBRATION.includes(name) ? 1.5 : 0.3001);
  });
  it('defines every cue the brief promises', () => {
    for (const k of [
      'questionIn',
      'roundStart',
      'secondTick',
      'timerLow',
      'timerLast',
      'select',
      'lock',
      'correct',
      'wrong',
      'timeUp',
      'streak2',
      'streak3',
      'streakBig',
      'streakBreak',
      'lifeline5050',
      'lifelineSkip',
      'lifelinePadi',
      'padiBar',
      'lifelineUsed',
      'duelBuzz',
      'duelCpuBuzz',
      'duelLead',
      'hostIn',
      'scoreTick',
      'roundWin',
      'roundLose',
      'dailyDone',
    ])
      expect(quizSfx[k], k).toBeDefined();
  });
  it('lists exactly the celebration cues that exceed 300 ms', () => {
    for (const name of CELEBRATION) expect(span(quizSfx[name]), name).toBeGreaterThan(0.3);
    for (const [name, cue] of Object.entries(quizSfx))
      if (!CELEBRATION.includes(name)) expect(span(cue), name).toBeLessThanOrEqual(0.3001);
  });
  it('maps correct to agogo plus ogene and wrong to a falling drum plus udu', () => {
    expect(
      steps(quizSfx.correct)
        .map((s) => s.voice)
        .sort(),
    ).toEqual(['agogo', 'ogene']);
    expect(
      steps(quizSfx.wrong)
        .map((s) => s.voice)
        .sort(),
    ).toEqual(['talkingDrumDown', 'udu']);
    expect(steps(quizSfx.secondTick)[0]!.voice).toBe('ekwe');
  });
});
