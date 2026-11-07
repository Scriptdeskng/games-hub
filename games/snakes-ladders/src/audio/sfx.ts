// Snakes & Ladders game SFX (asset-designer; spec in docs/assets/snakes-ladders-brief.md section 6).
// Register: core.audio.registerInstruments(snakesInstruments); core.audio.registerSfx({ ...snakesSfx });
import type { InstrumentPreset, SfxMap } from '@naija/core/audio';

/** Game-specific everyday-sound voices, same preset format as core instruments.ts. Each <= 0.3 s. */
export const snakesInstruments: Record<string, InstrumentPreset> = {
  okadaRev: {
    id: 'okadaRev',
    description:
      'Okada engine pulling away: sawtooth 70 to 150 Hz, 26 Hz flutter, low engine noise.',
    duration: 0.3,
    layers: [
      {
        kind: 'osc',
        wave: 'sawtooth',
        freq: 70,
        freqEnd: 150,
        glide: 0.26,
        gain: 0.3,
        lfo: { rate: 26, depth: 0.12, target: 'gain' },
        env: { attack: 0.01, decay: 0.28 },
      },
      {
        kind: 'noise',
        filter: 'lowpass',
        freq: 420,
        q: 0.7,
        gain: 0.25,
        env: { attack: 0.01, decay: 0.22 },
      },
    ],
  },
  kekePutPut: {
    id: 'kekePutPut',
    description: 'Keke napep three-wheeler: three quick low square pulses ("put-put-put"), 120 Hz.',
    duration: 0.3,
    layers: [0, 0.09, 0.18].map((delay, i) => ({
      kind: 'osc' as const,
      wave: 'square' as const,
      freq: 120 + i * 8,
      gain: 0.3,
      delay,
      env: { attack: 0.004, decay: 0.07 },
    })),
  },
  engineStall: {
    id: 'engineStall',
    description: 'Engine dying in a go-slow: sawtooth falling 130 to 45 Hz with a slowing stutter.',
    duration: 0.3,
    layers: [
      {
        kind: 'osc',
        wave: 'sawtooth',
        freq: 130,
        freqEnd: 45,
        glide: 0.28,
        gain: 0.3,
        lfo: { rate: 14, depth: 0.12, target: 'gain' },
        env: { attack: 0.008, decay: 0.28 },
      },
      {
        kind: 'noise',
        filter: 'lowpass',
        freq: 300,
        q: 0.7,
        gain: 0.2,
        env: { attack: 0.008, decay: 0.2 },
      },
    ],
  },
};

/** Event name -> cue. Core cues (tap, start, turn, drop, win, lose) come from coreSfx. */
export const snakesSfx: SfxMap = {
  roll: [
    { voice: 'shekere', gain: 0.9 },
    { voice: 'ekwe', pitch: 0.6, when: 0.2, gain: 0.8 },
  ],
  diceLand: [
    { voice: 'ekwe', pitch: 0.77 },
    { voice: 'udu', pitch: 1.2, when: 0.02, gain: 0.6 },
  ],
  six: { voice: 'agogo', pitch: 1.2 },
  step: { voice: 'ekwe', pitch: 1.22, gain: 0.7 },
  cpuTurn: { voice: 'ekwe', pitch: 0.77, gain: 0.6 },
  ladderBrt: { voice: 'danfoHorn', gain: 0.9 },
  ladderOkada: { voice: 'okadaRev', gain: 0.9 },
  ladderKeke: { voice: 'kekePutPut', gain: 0.9 },
  ladderBridge: [
    { voice: 'talkingDrum', pitch: 1.1 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.12, gain: 0.6 },
  ],
  snakePothole: [
    { voice: 'udu', pitch: 0.55 },
    { voice: 'talkingDrumDown', when: 0.04, gain: 0.7 },
  ],
  snakeGoslow: [{ voice: 'engineStall' }, { voice: 'danfoHorn', pitch: 0.8, gain: 0.5 }],
  snakeNepa: [
    { voice: 'talkingDrumDown', gain: 0.8 },
    { voice: 'agogoTing', pitch: 1.2, when: 0.04, gain: 0.5 },
    { voice: 'agogoTing', pitch: 0.9, when: 0.14, gain: 0.4 },
  ],
  snakeToll: [
    { voice: 'danfoHorn', pitch: 0.8, gain: 0.7 },
    { voice: 'talkingDrumDown', when: 0.04, gain: 0.7 },
  ],
  diceChoice: [{ voice: 'agogoTing' }, { voice: 'agogoTing', pitch: 4 / 3, when: 0.08, gain: 0.8 }],
  reroll: [
    { voice: 'shekereShuffle', gain: 0.7 },
    { voice: 'talkingDrumSqueeze', gain: 0.8 },
  ],
  finishBounce: [
    { voice: 'ekwe', pitch: 0.77 },
    { voice: 'ekwe', pitch: 0.6, when: 0.11, gain: 0.8 },
  ],
};
