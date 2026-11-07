/**
 * Audio synth API. Instruments are DATA (presets); the engine in `engine.ts` turns presets into
 * Web Audio nodes. To add an instrument, add a preset to `instruments.ts`; to map a game event to
 * sound, add a cue to `core-sfx.ts` (or a game's own `SfxMap` passed to `audio.registerSfx`).
 *
 * All frequencies are in Hz at pitch 1; `pitch` multiplies every frequency in the voice.
 * All times are in seconds relative to the voice start.
 */

export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth';

/** AD(R)-style envelope: linear attack to `gain`, exponential decay to silence over `decay`. */
export interface Envelope {
  attack?: number; // default 0.003
  decay: number;
}

interface LayerBase {
  /** seconds before this layer starts (for strikes and flams) */
  delay?: number;
  /** peak gain 0..1 for this layer (default 1) */
  gain?: number;
  env: Envelope;
}

/** Plain oscillator, with an optional pitch glide (talking drum, udu). */
export interface OscLayer extends LayerBase {
  kind: 'osc';
  wave: Wave;
  freq: number;
  /** glide target in Hz, reached after `glide` seconds (exponential) */
  freqEnd?: number;
  glide?: number;
  /** slow vibrato / tremolo */
  lfo?: { rate: number; depth: number; target: 'pitch' | 'gain' };
}

/** 2-operator FM: metallic bells (agogo, ogene). modulator freq = freq * ratio. */
export interface FmLayer extends LayerBase {
  kind: 'fm';
  freq: number;
  ratio: number;
  /** modulation index (Hz deviation = index * modulator freq) */
  index: number;
  /** index decays to 0 over this time (default = env.decay) */
  indexDecay?: number;
}

/** Filtered noise: shekere, crowd, wooden clicks. */
export interface NoiseLayer extends LayerBase {
  kind: 'noise';
  filter: 'bandpass' | 'lowpass' | 'highpass';
  freq: number;
  freqEnd?: number;
  q?: number;
}

export type VoiceLayer = OscLayer | FmLayer | NoiseLayer;

export interface InstrumentPreset {
  /** stable id, e.g. 'talkingDrum', 'agogo', 'ogene', 'shekere', 'udu', 'ekwe', 'danfoHorn' */
  id: string;
  description: string;
  /** hard stop (s). Guideline: SFX <= 0.3 s, fanfares <= 1.5 s. */
  duration: number;
  layers: VoiceLayer[];
}

export interface PlayOptions {
  /** frequency multiplier (1 = as written; 2 = one octave up) */
  pitch?: number;
  /** 0..1 multiplier on the voice */
  gain?: number;
  /** seconds from now */
  when?: number;
  /** if set, replaces any currently playing voice with the same key (retrigger protection) */
  key?: string;
}

/** One step of a cue: which voice, at which pitch, when. */
export interface CueStep extends PlayOptions {
  voice: string;
}
export type SfxCue = CueStep | CueStep[];

/** Semantic event name -> cue. Core events listed in CORE_SFX_EVENTS; games may add their own. */
export type SfxMap = Record<string, SfxCue>;

export const CORE_SFX_EVENTS = [
  'tap', // generic button press
  'select', // menu / option chosen
  'back', // close / cancel
  'success', // correct / good move
  'fail', // wrong / illegal
  'coin', // points, reward tick
  'card', // card played or dealt
  'dice', // dice shake / roll
  'move', // piece moved
  'drop', // thing lands
  'turn', // your turn
  'tick', // timer warning
  'start', // game start
  'win',
  'lose',
  'unlock', // trophy / fanfare
] as const;
export type CoreSfxEvent = (typeof CORE_SFX_EVENTS)[number];

export type MusicTrack =
  | { kind: 'file'; url: string }
  /** a looping step pattern played with instrument voices (no download) */
  | { kind: 'pattern'; bpm: number; steps: (CueStep | CueStep[] | null)[] };
