import type { SfxMap } from '@naija/core/audio';

/** Game-specific cues, layered over core's `tap`, `coin`, `fail`, `win`, `lose`, `tick`, `start`. */
export const gameSfx: SfxMap = {};

/** Calm highlife-flavoured loop made from synth voices (no audio file download). */
export const menuMusic = {
  kind: 'pattern' as const,
  bpm: 96,
  steps: [
    { voice: 'ekwe', pitch: 1, gain: 0.5 },
    null,
    { voice: 'agogo', pitch: 1, gain: 0.25 },
    null,
    { voice: 'ekwe', pitch: 1.2, gain: 0.4 },
    { voice: 'shekere', gain: 0.3 },
    { voice: 'agogo', pitch: 1.5, gain: 0.25 },
    null,
    { voice: 'ekwe', pitch: 1, gain: 0.5 },
    null,
    { voice: 'agogo', pitch: 1.33, gain: 0.25 },
    { voice: 'shekere', gain: 0.3 },
    { voice: 'ekwe', pitch: 1.5, gain: 0.4 },
    null,
    { voice: 'agogo', pitch: 1.2, gain: 0.25 },
    { voice: 'shekere', gain: 0.3 },
  ],
};
