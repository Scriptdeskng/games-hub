import { describe, expect, it } from 'vitest';
import { instruments } from '../../../../packages/core/src/audio/instruments';
import { ayoSfx } from './sfx';

const CELEBRATION = ['bigCapture', 'sweep'];
const span = (c: unknown): number => {
  const steps = (Array.isArray(c) ? c : [c]) as { voice: string; when?: number }[];
  return Math.max(...steps.map((s) => (s.when ?? 0) + instruments[s.voice]!.duration));
};

describe('ayoSfx', () => {
  it('uses only core voices and no generic ids', () => {
    for (const [name, cue] of Object.entries(ayoSfx)) {
      for (const s of (Array.isArray(cue) ? cue : [cue]) as { voice: string }[])
        expect(instruments[s.voice], `${name}:${s.voice}`).toBeDefined();
    }
  });
  it('keeps every interaction cue under 300 ms (celebrations under 1.5 s)', () => {
    for (const [name, cue] of Object.entries(ayoSfx))
      expect(span(cue), name).toBeLessThanOrEqual(CELEBRATION.includes(name) ? 1.5 : 0.3001);
  });
  it('defines the cues the brief promises', () => {
    for (const k of [
      'seedDrop',
      'capture',
      'chain',
      'yourTurn',
      'cpuTurn',
      'sowRattle',
      'trayDrop',
    ])
      expect(ayoSfx[k], k).toBeDefined();
  });
});
