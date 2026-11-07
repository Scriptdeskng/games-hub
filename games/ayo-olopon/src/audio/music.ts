import type { CueStep, MusicTrack } from '@naija/core/audio';

const loop = (bpm: number, steps: (CueStep | CueStep[] | null)[]): MusicTrack => ({
  kind: 'pattern',
  bpm,
  steps,
});

/**
 * Juju-flavoured synth loops (asset brief section 8: menu 104 BPM, play 116 BPM; shekere on the
 * off-beats, agogo answering). They stand in until the composed loops (assets/audio/music/ayo-*.mp3,
 * silent placeholders now) are delivered. The play loop stays sparse so it never masks the udu seed
 * drops (150 to 400 Hz): no low drum voices, only ekwe, shekere and a soft agogo. Nothing here is
 * downloaded: the audio engine synthesises it.
 */
const E = (pitch: number, gain = 0.3): CueStep => ({ voice: 'ekwe', pitch, gain });
const S = (gain = 0.2): CueStep => ({ voice: 'shekere', gain });
const A = (pitch: number, gain = 0.16): CueStep => ({ voice: 'agogo', pitch, gain });

export const menuMusic = loop(104, [
  [E(0.75, 0.4), S()],
  null,
  S(0.14),
  A(1.5),
  [E(1, 0.34), S()],
  null,
  S(0.14),
  null,
  [E(1.125, 0.34), S()],
  null,
  S(0.14),
  A(1.33),
  [E(0.9, 0.34), S()],
  null,
  S(0.14),
  null,
]);

export const playMusic = loop(116, [
  S(0.16),
  null,
  [E(1, 0.22), S(0.12)],
  null,
  S(0.16),
  A(1.5, 0.12),
  [E(1.125, 0.22), S(0.12)],
  null,
  S(0.16),
  null,
  [E(0.9, 0.22), S(0.12)],
  null,
  S(0.16),
  A(1.33, 0.12),
  [E(1, 0.22), S(0.12)],
  null,
]);
