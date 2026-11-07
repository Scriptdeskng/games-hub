/**
 * STUB (neutral placeholder written by the senior-developer so core compiles).
 * The asset-designer REPLACES this file with the real instrument presets.
 * Contract: `export const instruments: Record<string, InstrumentPreset>` (see ./types.ts).
 * Expected ids: talkingDrum, agogo, ogene, shekere, udu, ekwe, danfoHorn, crowd, fanfare.
 */
import type { InstrumentPreset } from './types';

const tone = (id: string, freq: number, decay: number): InstrumentPreset => ({
  id,
  description: `stub ${id}`,
  duration: decay + 0.05,
  layers: [{ kind: 'osc', wave: 'triangle', freq, env: { decay }, gain: 0.6 }],
});

export const instruments: Record<string, InstrumentPreset> = {
  agogo: tone('agogo', 880, 0.18),
  ekwe: tone('ekwe', 520, 0.08),
  udu: tone('udu', 180, 0.2),
  ogene: tone('ogene', 660, 0.4),
  talkingDrum: tone('talkingDrum', 300, 0.2),
  shekere: {
    id: 'shekere',
    description: 'stub shekere',
    duration: 0.15,
    layers: [{ kind: 'noise', filter: 'bandpass', freq: 5000, q: 1, env: { decay: 0.1 }, gain: 0.4 }],
  },
  fanfare: tone('fanfare', 523, 0.6),
};
