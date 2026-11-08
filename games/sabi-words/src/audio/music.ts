import type { CueStep, MusicTrack } from '@naija/core/audio';

const loop = (bpm: number, steps: (CueStep | CueStep[] | null)[]): MusicTrack => ({
  kind: 'pattern',
  bpm,
  steps,
});

/**
 * Light Afrobeats stand-ins made from synth voices (asset brief section 8). A 3-3-2 syncopated ekwe pattern,
 * shekere on the off-beats and a sparse agogo answer. They stand in until the composed loops
 * (assets/audio/music/words-*.mp3, silent placeholders now) arrive. Kept sparse and high so the ekwe letter
 * taps and the agogo "word found" cue stay clear. A faster, drier variant plays for the last 5 seconds.
 */
const E = (pitch: number, gain = 0.24): CueStep => ({ voice: 'ekwe', pitch, gain });
const S = (gain = 0.15): CueStep => ({ voice: 'shekere', gain });
const A = (pitch: number, gain = 0.12): CueStep => ({ voice: 'agogoTing', pitch, gain });

export const menuMusic = loop(104, [
  [E(1, 0.3), S()],
  null,
  null,
  [E(1.2, 0.26), S(0.1)],
  null,
  null,
  [E(1.125, 0.26), A(1.5)],
  null,
  [E(1, 0.3), S()],
  null,
  null,
  [E(0.9, 0.26), S(0.1)],
  null,
  A(1.33),
  [E(1.125, 0.26), S(0.1)],
  null,
]);

export const playMusic = loop(108, [
  [E(1), S(0.1)],
  null,
  null,
  E(1.2, 0.2),
  null,
  null,
  [E(1.125, 0.2), S(0.1)],
  null,
  [E(1), S(0.1)],
  null,
  null,
  E(0.9, 0.2),
  null,
  A(1.5, 0.09),
  [E(1.125, 0.2), S(0.1)],
  null,
]);

/** Last 5 seconds: 136 BPM, shekere on every step, higher wood click. */
export const tenseMusic = loop(136, [
  [E(1.4, 0.28), S(0.2)],
  S(0.12),
  S(0.18),
  S(0.12),
  [E(1.4, 0.28), S(0.2)],
  S(0.12),
  S(0.18),
  A(1.5, 0.12),
]);
