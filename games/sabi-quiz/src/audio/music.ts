import type { CueStep, MusicTrack } from '@naija/core/audio';

const loop = (bpm: number, steps: (CueStep | CueStep[] | null)[]): MusicTrack => ({
  kind: 'pattern',
  bpm,
  steps,
});

/**
 * Calm quiz bed made from synth voices (asset brief section 8): soft highlife feel, ekwe on the beat,
 * shekere on the off-beats, a sparse agogo answer. A faster, drier variant plays for the last 5 seconds.
 * They stand in until the composed loops (assets/audio/music/quiz-*.mp3, silent placeholders now) arrive.
 * Kept sparse and high so it never masks the udu and talking-drum answer cues.
 */
const E = (pitch: number, gain = 0.26): CueStep => ({ voice: 'ekwe', pitch, gain });
const S = (gain = 0.16): CueStep => ({ voice: 'shekere', gain });
const A = (pitch: number, gain = 0.14): CueStep => ({ voice: 'agogoTing', pitch, gain });

export const menuMusic = loop(96, [
  [E(1, 0.34), S()],
  null,
  S(0.1),
  A(1.5),
  [E(1.2, 0.3), S()],
  null,
  S(0.1),
  null,
  [E(1.125, 0.3), S()],
  null,
  S(0.1),
  A(1.33),
  [E(0.9, 0.3), S()],
  null,
  S(0.1),
  null,
]);

export const playMusic = loop(100, [
  S(0.12),
  null,
  [E(1), S(0.1)],
  null,
  S(0.12),
  A(1.5, 0.1),
  [E(1.2), S(0.1)],
  null,
  S(0.12),
  null,
  [E(1.125), S(0.1)],
  null,
  S(0.12),
  A(1.33, 0.1),
  [E(0.9), S(0.1)],
  null,
]);

/** Last 5 seconds: 132 BPM, shekere on every step, higher wood click. */
export const tenseMusic = loop(132, [
  [E(1.4, 0.3), S(0.2)],
  S(0.12),
  S(0.18),
  S(0.12),
  [E(1.4, 0.3), S(0.2)],
  S(0.12),
  S(0.18),
  A(1.5, 0.12),
]);
