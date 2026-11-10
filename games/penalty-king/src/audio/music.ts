import type { CueStep, MusicTrack } from '@naija/core/audio';

const loop = (bpm: number, steps: (CueStep | CueStep[] | null)[]): MusicTrack => ({
  kind: 'pattern',
  bpm,
  steps,
});

/**
 * Football-chant synth stand-ins (guide: drums and call-and-response claps). A marching ekwe "clap", a talking-drum accent and
 * a shekere pulse, 120 BPM, until the composed loops (assets/audio/music/penalty-*.mp3, silent placeholders now) arrive.
 * The play loop is thin so it never masks the strike, post and save cues.
 */
const S = (gain = 0.14): CueStep => ({ voice: 'shekere', gain });
const E = (pitch = 1, gain = 0.2): CueStep => ({ voice: 'ekwe', pitch, gain });
const D = (pitch = 0.8, gain = 0.2): CueStep => ({ voice: 'talkingDrum', pitch, gain });
const A = (pitch: number, gain = 0.1): CueStep => ({ voice: 'agogoTing', pitch, gain });

export const menuMusic = loop(120, [
  [D(0.7, 0.24), S()],
  null,
  E(1.2, 0.2),
  S(0.1),
  [E(1, 0.22), S()],
  null,
  [E(1.2, 0.2), A(1.5)],
  null,
  [D(0.7, 0.24), S()],
  null,
  E(1.2, 0.2),
  S(0.1),
  [E(1, 0.22), S()],
  A(1.33),
  [E(1.2, 0.2), A(2, 0.08)],
  null,
]);

export const playMusic = loop(124, [
  [D(0.7, 0.16), S(0.08)],
  null,
  S(0.06),
  null,
  [E(1, 0.16), S(0.08)],
  null,
  S(0.06),
  null,
  [D(0.7, 0.16), S(0.08)],
  null,
  S(0.06),
  E(1.2, 0.12),
  [E(1, 0.16), S(0.08)],
  null,
  S(0.06),
  A(1.5, 0.06),
]);
