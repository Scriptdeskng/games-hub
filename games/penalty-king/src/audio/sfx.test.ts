import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { instruments } from '../../../../packages/core/src/audio/instruments';
import { menuMusic, playMusic } from './music';
import { PENALTY_CELEBRATION_CUES, penaltySfx } from './sfx';

const steps = (c: unknown) =>
  (Array.isArray(c) ? c : [c]) as { voice: string; when?: number; gain?: number; pitch?: number }[];
const span = (c: unknown): number =>
  Math.max(...steps(c).map((s) => (s.when ?? 0) + instruments[s.voice]!.duration));
const CELEBRATION: readonly string[] = PENALTY_CELEBRATION_CUES;
const voices = (name: string) =>
  steps(penaltySfx[name])
    .map((s) => s.voice)
    .sort();

const PROMISED = [
  'aimTick', 'aimLock', 'powerTick', 'whistleSub', 'shotStrike', 'netIn', 'postHit', 'saveStop',
  'dive', 'roundStart', 'crowdGoal', 'crowdGroan', 'suddenDeath', 'bracketAdvance', 'shootoutWin', 'shootoutLose',
];

describe('penaltySfx', () => {
  it('uses only core instrument voices (no generic ids)', () => {
    for (const [name, cue] of Object.entries(penaltySfx))
      for (const s of steps(cue)) expect(instruments[s.voice], `${name}:${s.voice}`).toBeDefined();
  });
  it('keeps every interaction cue at or under 300 ms and celebrations under 1.5 s', () => {
    for (const [name, cue] of Object.entries(penaltySfx))
      expect(span(cue), name).toBeLessThanOrEqual(CELEBRATION.includes(name) ? 1.5 : 0.3001);
  });
  it('defines every cue the brief promises, and nothing else', () => {
    for (const k of PROMISED) expect(penaltySfx[k], k).toBeDefined();
    expect(Object.keys(penaltySfx).sort()).toEqual([...PROMISED].sort());
  });
  it('lists exactly the celebration cues that exceed 300 ms', () => {
    for (const name of CELEBRATION) expect(span(penaltySfx[name]), name).toBeGreaterThan(0.3);
    for (const [name, cue] of Object.entries(penaltySfx))
      if (!CELEBRATION.includes(name)) expect(span(cue), name).toBeLessThanOrEqual(0.3001);
  });
  it('maps events to Nigerian instruments, with no referee whistle voice, and gain never above 1', () => {
    expect(voices('shotStrike')).toEqual(expect.arrayContaining(['ekwe', 'udu']));
    expect(voices('postHit')).toEqual(['ogene']);
    expect(voices('saveStop')).toContain('talkingDrum');
    expect(voices('crowdGoal')).toEqual(expect.arrayContaining(['crowd', 'shekere']));
    expect(voices('crowdGroan')).toContain('crowd');
    expect(voices('whistleSub')).toContain('agogoTing');
    expect(voices('powerTick')).toContain('ekwe');
    expect(voices('shootoutWin')).toContain('fanfareShort');
    for (const [name, cue] of Object.entries(penaltySfx))
      for (const s of steps(cue)) {
        expect(s.voice, name).not.toBe('whistle');
        expect(s.gain ?? 1, name).toBeLessThanOrEqual(1);
      }
  });
  it('does not shadow core events', () => {
    for (const k of [
      'tap',
      'select',
      'back',
      'move',
      'drop',
      'turn',
      'coin',
      'fail',
      'win',
      'lose',
      'tick',
      'start',
      'success',
      'unlock',
    ])
      expect(penaltySfx[k], k).toBeUndefined();
  });
  it('music stand-ins use only core voices', () => {
    for (const track of [menuMusic, playMusic]) {
      if (track.kind !== 'pattern') throw new Error('the stand-ins are pattern tracks');
      for (const st of track.steps)
        for (const s of st === null ? [] : Array.isArray(st) ? st : [st])
          expect(instruments[s.voice], s.voice).toBeDefined();
    }
  });
  // A defined but silent cue is a defect: every cue must be played from game code (fails until the view wires them).
  const src = join(__dirname, '..');
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : [p];
    });
  const code = files(src)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('audio/sfx.ts'))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
  it('is registered by main.ts', () => {
    expect(code).toContain('registerSfx(penaltySfx)');
  });
  it('every cue is played from game code', () => {
    const silent = Object.keys(penaltySfx).filter((name) => !code.includes(`'${name}'`));
    expect(silent).toEqual([]);
  });
});
