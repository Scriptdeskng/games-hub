import type { CueStep, MusicTrack } from '@naija/core/audio';

const loop = (bpm: number, steps: (CueStep | CueStep[] | null)[]): MusicTrack => ({
  kind: 'pattern',
  bpm,
  steps,
});

/**
 * Highlife-flavoured synth loops standing in for the composed guitar loops (asset brief
 * section 6: 104 and 112 BPM; assets/audio/music/whot-*.mp3 are silent placeholders). A walking
 * ekwe "bass", shekere on the off-beats and an agogo answer; nothing in the 600 Hz to 1.2 kHz
 * card-slap range is held, so the card sounds stay clear. Nothing is downloaded.
 */
const E = (pitch: number, gain = 0.34): CueStep => ({ voice: 'ekwe', pitch, gain });
const S = (gain = 0.2): CueStep => ({ voice: 'shekere', gain });
const A = (pitch: number, gain = 0.16): CueStep => ({ voice: 'agogo', pitch, gain });

export const menuMusic = loop(104, [
  [E(0.75), S()],
  null,
  S(0.14),
  A(1.5),
  [E(1), S()],
  null,
  S(0.14),
  null,
  [E(1.125), S()],
  null,
  S(0.14),
  A(1.33),
  [E(0.89), S()],
  null,
  S(0.14),
  A(1.5, 0.12),
]);

export const playMusic = loop(112, [
  [E(0.75), S(0.18)],
  null,
  S(0.12),
  null,
  [E(0.89), S(0.18)],
  A(2, 0.1),
  S(0.12),
  null,
  [E(1), S(0.18)],
  null,
  S(0.12),
  A(1.5, 0.12),
  [E(1.125), S(0.18)],
  null,
  S(0.12),
  null,
]);
