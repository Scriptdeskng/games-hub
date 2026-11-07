import type { CueStep, MusicTrack } from '@naija/core/audio';

const loop = (bpm: number, steps: (CueStep | CueStep[] | null)[]): MusicTrack => ({
  kind: 'pattern',
  bpm,
  steps,
});

/**
 * Highlife-flavoured synth loops (asset brief section 7: 108 and 112 BPM, relaxed two-beat swing,
 * shekere on the off-beats, a walking ekwe "bass", agogo answering). They stand in until the
 * composed guitar loops (assets/audio/music/ludo-*.mp3, silent placeholders now) are delivered.
 * Nothing here is downloaded: the audio engine synthesises it.
 */
const E = (pitch: number, gain = 0.4): CueStep => ({ voice: 'ekwe', pitch, gain });
const S = (gain = 0.22): CueStep => ({ voice: 'shekere', gain });
const A = (pitch: number, gain = 0.2): CueStep => ({ voice: 'agogo', pitch, gain });

export const menuMusic = loop(108, [
  [E(0.75), S()],
  null,
  S(0.16),
  A(1.5),
  [E(1), S()],
  null,
  S(0.16),
  null,
  [E(1.125), S()],
  null,
  S(0.16),
  A(1.33),
  [E(1), S()],
  null,
  S(0.16),
  A(1.5, 0.14),
]);

export const playMusic = loop(112, [
  [E(0.75), S(0.2)],
  null,
  S(0.14),
  null,
  [E(1), S(0.2)],
  A(2, 0.12),
  S(0.14),
  null,
  [E(1.125), S(0.2)],
  null,
  S(0.14),
  A(1.5, 0.14),
  [E(1.33), S(0.2)],
  null,
  S(0.14),
  null,
]);
