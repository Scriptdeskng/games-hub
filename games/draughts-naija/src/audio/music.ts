import type { CueStep, MusicTrack } from '@naija/core/audio';

const loop = (bpm: number, steps: (CueStep | CueStep[] | null)[]): MusicTrack => ({
  kind: 'pattern',
  bpm,
  steps,
});

/**
 * Hausa-inspired synth stand-ins (asset brief section 8; guide: calabash percussion and a goje-style melody).
 * A rolling calabash pulse (shekere, soft udu), a hollow ekwe knock and a sparse agogo melody on a D F G A pentatonic
 * (ratios 1, 1.19, 1.33, 1.5, 2). They stand in until the composed loops (assets/audio/music/draughts-*.mp3, silent
 * placeholders now) arrive. The play loop stays thin and low in level so it never masks the ekwe move and agogo capture cues.
 */
const S = (gain = 0.16): CueStep => ({ voice: 'shekere', gain });
const U = (pitch = 0.8, gain = 0.2): CueStep => ({ voice: 'udu', pitch, gain });
const E = (pitch = 0.9, gain = 0.2): CueStep => ({ voice: 'ekwe', pitch, gain });
const A = (pitch: number, gain = 0.12): CueStep => ({ voice: 'agogoTing', pitch, gain });

export const menuMusic = loop(96, [
  [U(0.8, 0.26), S()],
  null,
  S(0.1),
  A(1.5),
  [E(0.9, 0.22), S()],
  null,
  [S(0.1), A(1.33)],
  null,
  [U(0.7, 0.26), S()],
  null,
  S(0.1),
  A(1.19),
  [E(0.9, 0.22), S()],
  null,
  [S(0.1), A(1.5, 0.1)],
  A(2, 0.08),
]);

export const playMusic = loop(104, [
  [U(0.8, 0.18), S(0.1)],
  null,
  S(0.07),
  null,
  [E(0.9, 0.16), S(0.1)],
  null,
  S(0.07),
  A(1.33, 0.08),
  [U(0.7, 0.18), S(0.1)],
  null,
  S(0.07),
  null,
  [E(0.9, 0.16), S(0.1)],
  null,
  S(0.07),
  A(1.5, 0.07),
]);
