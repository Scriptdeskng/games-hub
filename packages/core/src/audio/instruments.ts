/**
 * Nigerian instrument voices for the Naija Games synth (asset-designer; design in
 * docs/assets/STYLE_GUIDE.md section 9). Every preset models a Nigerian instrument or everyday
 * sound: no generic blip / coin / whoosh.
 *
 * Rules: SFX voices <= 0.3 s; fanfare-class voices (see LONG_VOICES) <= 1.5 s. Per-voice layer gains
 * sum to <= ~1.1 so, with the engine's 0.6 voice cap, one voice peaks well under 0 dBFS.
 * Frequencies are at pitch 1; the engine multiplies them by `pitch`.
 */
import type { FmLayer, InstrumentPreset, NoiseLayer, OscLayer } from './types';

/** Voices allowed to run longer than 0.3 s (fanfare class, <= 1.5 s). */
export const LONG_VOICES: readonly string[] = ['fanfare', 'fanfareShort', 'ogeneRing', 'crowd'];

const noise = (
  freq: number,
  q: number,
  decay: number,
  gain: number,
  delay = 0,
  filter: NoiseLayer['filter'] = 'bandpass',
  attack = 0.002,
): NoiseLayer => ({ kind: 'noise', filter, freq, q, delay, gain, env: { attack, decay } });

const sine = (freq: number, decay: number, gain: number, delay = 0, freqEnd?: number, glide?: number, attack = 0.003): OscLayer => ({
  kind: 'osc',
  wave: 'sine',
  freq,
  freqEnd,
  glide,
  delay,
  gain,
  env: { attack, decay },
});

/** Metallic bell: 2-operator FM with an inharmonic (1.41) modulator, index falling as it rings. */
const bell = (freq: number, decay: number, gain: number, delay = 0, index = 1.4, ratio = 1.41): FmLayer => ({
  kind: 'fm',
  freq,
  ratio,
  index,
  indexDecay: decay,
  delay,
  gain,
  env: { attack: 0.002, decay },
});

/** Brass/reed note for the kakaki-goje phrase: FM 1:1 (brassy) + a quiet vibrato saw (reedy goje). */
const hausaNote = (freq: number, delay: number, decay: number): [FmLayer, OscLayer] => [
  { kind: 'fm', freq, ratio: 1, index: 1.1, indexDecay: decay, delay, gain: 0.5, env: { attack: 0.025, decay } },
  {
    kind: 'osc',
    wave: 'sawtooth',
    freq,
    delay,
    gain: 0.07,
    lfo: { rate: 5.5, depth: freq * 0.006, target: 'pitch' },
    env: { attack: 0.03, decay },
  },
];

/** Shekere shake: swung (long-short) bursts of beaded-gourd noise; `gains` per burst. */
const shake = (offsets: number[], gains: number[], freq = 6000): NoiseLayer[] =>
  offsets.map((d, i) => noise(freq, 2, 0.024, gains[i] ?? 0.5, d, 'bandpass', 0.003));

export const instruments: Record<string, InstrumentPreset> = {
  // ---- Talking drum (gangan / dundun): pressure drum that "speaks" with pitch bends ----
  talkingDrum: {
    id: 'talkingDrum',
    description: 'Gangan hit, pitch glides UP 180 to 300 Hz. Turn, start, combo, drum fills.',
    duration: 0.24,
    layers: [
      sine(180, 0.2, 0.6, 0, 300, 0.12),
      { kind: 'osc', wave: 'triangle', freq: 360, freqEnd: 600, glide: 0.12, gain: 0.15, env: { decay: 0.13 } },
      noise(1200, 1, 0.014, 0.2),
    ],
  },
  talkingDrumDown: {
    id: 'talkingDrumDown',
    description: 'Gangan hit, pitch glides DOWN 300 to 150 Hz. "No" / fail / lose.',
    duration: 0.26,
    layers: [
      sine(300, 0.22, 0.6, 0, 150, 0.14),
      { kind: 'osc', wave: 'triangle', freq: 600, freqEnd: 300, glide: 0.14, gain: 0.15, env: { decay: 0.13 } },
      noise(900, 1, 0.014, 0.2),
    ],
  },
  talkingDrumSqueeze: {
    id: 'talkingDrumSqueeze',
    description: 'Gangan squeeze: two-step glide 160 to 240 then 240 to 200 Hz (arm squeezing the cords).',
    duration: 0.29,
    layers: [sine(160, 0.11, 0.55, 0, 240, 0.08), sine(240, 0.17, 0.55, 0.1, 200, 0.1), noise(1200, 1, 0.012, 0.2)],
  },

  // ---- Agogo: double iron bell, two FM tones a fifth apart ----
  agogo: {
    id: 'agogo',
    description: 'Agogo double bell: 880 Hz then 1320 Hz (a fifth), struck 60 ms apart.',
    duration: 0.2,
    layers: [bell(880, 0.12, 0.65), bell(1320, 0.14, 0.6, 0.06)],
  },
  agogoTing: {
    id: 'agogoTing',
    description: 'Single agogo bell strike (menu select, coin at pitch 1.5).',
    duration: 0.16,
    layers: [bell(1175, 0.12, 0.7, 0, 1.2)],
  },

  // ---- Ogene: Igbo iron gong-bell ----
  ogene: {
    id: 'ogene',
    description: 'Ogene short strike (special card, boss moment).',
    duration: 0.3,
    layers: [bell(520, 0.28, 0.55, 0, 1.6, 2.76), bell(1040, 0.2, 0.18, 0, 0.7, 1.5)],
  },
  ogeneRing: {
    id: 'ogeneRing',
    description: 'Ogene long ring for fanfares (win finish).',
    duration: 0.65,
    layers: [bell(520, 0.6, 0.55, 0, 1.6, 2.76), bell(1040, 0.4, 0.18, 0, 0.7, 1.5)],
  },

  // ---- Shekere: beaded gourd rattle ----
  shekere: {
    id: 'shekere',
    description: 'Shekere shake: 5 swung bursts (40/65 ms long-short) for dice shake and shuffle.',
    duration: 0.26,
    layers: shake([0, 0.04, 0.105, 0.145, 0.21], [0.7, 1, 1, 0.9, 0.8]),
  },
  shekereShuffle: {
    id: 'shekereShuffle',
    description: 'Short 3-burst shekere swing for dealing / shuffling cards.',
    duration: 0.15,
    layers: shake([0, 0.04, 0.105], [0.8, 1, 0.8]),
  },
  shekereTick: {
    id: 'shekereTick',
    description: 'Single dry shekere tick for the last-5-seconds timer (pitch up on the last tick).',
    duration: 0.06,
    layers: [noise(7000, 2, 0.03, 1, 0, 'bandpass', 0.002)],
  },

  // ---- Udu: Igbo clay-pot drum ----
  udu: {
    id: 'udu',
    description: 'Udu bloop: 200 to 90 Hz pitch drop, soft 8 ms attack, pot ring at 1.5x.',
    duration: 0.27,
    layers: [
      sine(200, 0.22, 0.6, 0, 90, 0.12, 0.008),
      sine(300, 0.12, 0.15, 0, 135, 0.12, 0.008),
      noise(500, 0.7, 0.04, 0.12, 0, 'lowpass', 0.006),
    ],
  },

  // ---- Ekwe: wooden slit drum ----
  ekwe: {
    id: 'ekwe',
    description: 'Ekwe slit-drum click: hollow wood, two resonances 620 / 1180 Hz plus a 310 Hz thump.',
    duration: 0.1,
    layers: [
      sine(310, 0.05, 0.5),
      sine(620, 0.045, 0.2),
      noise(620, 12, 0.05, 0.9),
      noise(1180, 10, 0.04, 0.55),
    ],
  },

  // ---- Everyday sounds ----
  danfoHorn: {
    id: 'danfoHorn',
    description: 'Danfo horn "poom-poom": two blasts of a major-third pair (349 + 440 Hz), second lower.',
    duration: 0.3,
    layers: [
      { kind: 'osc', wave: 'square', freq: 349, gain: 0.2, env: { attack: 0.01, decay: 0.1 } },
      { kind: 'osc', wave: 'square', freq: 440, gain: 0.2, env: { attack: 0.01, decay: 0.1 } },
      { kind: 'osc', wave: 'triangle', freq: 175, gain: 0.25, env: { attack: 0.01, decay: 0.1 } },
      { kind: 'osc', wave: 'square', freq: 311, gain: 0.2, delay: 0.14, env: { attack: 0.01, decay: 0.14 } },
      { kind: 'osc', wave: 'square', freq: 392, gain: 0.2, delay: 0.14, env: { attack: 0.01, decay: 0.14 } },
      { kind: 'osc', wave: 'triangle', freq: 156, gain: 0.25, delay: 0.14, env: { attack: 0.01, decay: 0.14 } },
    ],
  },
  crowd: {
    id: 'crowd',
    description: 'Stadium cheer: formant-filtered noise swell (500 Hz / 1.5 kHz / 2.8 kHz), no vuvuzela.',
    duration: 1.2,
    layers: [
      noise(500, 1, 0.9, 0.8, 0, 'bandpass', 0.15),
      noise(1500, 1, 0.8, 0.7, 0.05, 'bandpass', 0.15),
      noise(2800, 1.2, 0.7, 0.45, 0.1, 'bandpass', 0.15),
      noise(900, 1, 0.5, 0.5, 0.3, 'bandpass', 0.1),
    ],
  },
  whistle: {
    id: 'whistle',
    description: 'Pitch whistle (sine 2.8 kHz with fast tremolo).',
    duration: 0.25,
    layers: [
      {
        kind: 'osc',
        wave: 'sine',
        freq: 2800,
        gain: 0.4,
        lfo: { rate: 40, depth: 0.25, target: 'gain' },
        env: { attack: 0.01, decay: 0.22 },
      },
    ],
  },

  // ---- Goje / kakaki fanfare (Hausa royal fanfare), pentatonic D F G A D ----
  fanfare: {
    id: 'fanfare',
    description: 'Kakaki brass + goje reed phrase D4 F4 G4 A4 D5 (about 1.1 s). Trophy, cup win, unlock.',
    duration: 1.15,
    layers: [
      ...hausaNote(293.7, 0, 0.12),
      ...hausaNote(349.2, 0.12, 0.12),
      ...hausaNote(392, 0.24, 0.12),
      ...hausaNote(440, 0.36, 0.12),
      ...hausaNote(587.3, 0.48, 0.62),
    ],
  },
  fanfareShort: {
    id: 'fanfareShort',
    description: 'Shorter kakaki-goje phrase G4 A4 D5 (about 0.8 s) for unlocks.',
    duration: 0.8,
    layers: [...hausaNote(392, 0, 0.12), ...hausaNote(440, 0.12, 0.12), ...hausaNote(587.3, 0.24, 0.5)],
  },
};
