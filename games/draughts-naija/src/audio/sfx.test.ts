import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { instruments } from '../../../../packages/core/src/audio/instruments';
import { menuMusic, playMusic } from './music';
import { DRAUGHTS_CELEBRATION_CUES, DRAUGHTS_OPTIONAL_CUES, draughtsSfx } from './sfx';

const steps = (c: unknown) =>
  (Array.isArray(c) ? c : [c]) as { voice: string; when?: number; gain?: number; pitch?: number }[];
const span = (c: unknown): number =>
  Math.max(...steps(c).map((s) => (s.when ?? 0) + instruments[s.voice]!.duration));
const CELEBRATION: readonly string[] = DRAUGHTS_CELEBRATION_CUES;
const voices = (name: string) =>
  steps(draughtsSfx[name])
    .map((s) => s.voice)
    .sort();

const PROMISED = [
  'boardIn',
  'pieceSelect',
  'pieceDeselect',
  'pieceMove',
  'cpuMove',
  'capture',
  'captureHop',
  'chainEnd',
  'crown',
  'illegal',
  'mustCapture',
  'lastPiece',
  'yourTurn',
  'hint',
  'undo',
  'thinkTick',
  'modePick',
  'personaIn',
  'matchWin',
  'matchLose',
  'matchDraw',
];

describe('draughtsSfx', () => {
  it('uses only core instrument voices (no generic ids)', () => {
    for (const [name, cue] of Object.entries(draughtsSfx))
      for (const s of steps(cue)) expect(instruments[s.voice], `${name}:${s.voice}`).toBeDefined();
  });
  it('keeps every interaction cue at or under 300 ms and celebrations under 1.5 s', () => {
    for (const [name, cue] of Object.entries(draughtsSfx))
      expect(span(cue), name).toBeLessThanOrEqual(CELEBRATION.includes(name) ? 1.5 : 0.3001);
  });
  it('defines every cue the brief promises, and nothing else', () => {
    for (const k of PROMISED) expect(draughtsSfx[k], k).toBeDefined();
    expect(Object.keys(draughtsSfx).sort()).toEqual([...PROMISED].sort());
  });
  it('lists exactly the celebration cues that exceed 300 ms', () => {
    for (const name of CELEBRATION) expect(span(draughtsSfx[name]), name).toBeGreaterThan(0.3);
    for (const [name, cue] of Object.entries(draughtsSfx))
      if (!CELEBRATION.includes(name)) expect(span(cue), name).toBeLessThanOrEqual(0.3001);
  });
  it('maps moves to ekwe, captures to agogo, crowning to ogene and illegal to a falling drum, gain never above 1', () => {
    expect(voices('pieceSelect')).toContain('ekwe');
    expect(voices('pieceMove')).toContain('ekwe');
    expect(voices('cpuMove')).toContain('ekwe');
    expect(voices('capture')).toContain('agogo');
    expect(voices('captureHop')).toContain('agogoTing');
    expect(voices('crown')).toContain('ogene');
    expect(voices('illegal')).toContain('talkingDrumDown');
    expect(voices('hint')).toContain('udu');
    expect(voices('thinkTick')).toEqual(['shekereTick']);
    expect(voices('matchWin')).toContain('fanfareShort');
    for (const [name, cue] of Object.entries(draughtsSfx))
      for (const s of steps(cue)) expect(s.gain ?? 1, name).toBeLessThanOrEqual(1);
  });
  it('makes the player move and the CPU move sound different', () => {
    expect(steps(draughtsSfx.pieceMove)[0]!.pitch).not.toBe(steps(draughtsSfx.cpuMove)[0]!.pitch);
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
      expect(draughtsSfx[k], k).toBeUndefined();
  });
  it('music stand-ins use only core voices', () => {
    for (const track of [menuMusic, playMusic])
      for (const st of track.steps)
        for (const s of st === null ? [] : Array.isArray(st) ? st : [st])
          expect(instruments[s.voice], s.voice).toBeDefined();
  });
  // Enforced as soon as the view registers `draughtsSfx` (the scaffold has no draughts UI yet): a defined but silent
  // cue is a defect. Optional cues (`undo`) may be unused only if the feature does not ship (delete the cue then).
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
  it.skipIf(!code.includes('draughtsSfx'))(
    'every cue is played from game code once the sfx map is wired',
    () => {
      const silent = Object.keys(draughtsSfx).filter((name) => !code.includes(`'${name}'`));
      expect(silent).toEqual([]);
    },
  );
  it('documents which cues are optional', () => {
    for (const k of DRAUGHTS_OPTIONAL_CUES) expect(draughtsSfx[k], k).toBeDefined();
  });
});
