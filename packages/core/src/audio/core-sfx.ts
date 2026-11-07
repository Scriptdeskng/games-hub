/**
 * STUB (neutral placeholder written by the senior-developer so core compiles).
 * The asset-designer REPLACES this file with the real SFX map.
 * Contract: `export const coreSfx: SfxMap` covering every name in CORE_SFX_EVENTS (./types.ts).
 */
import type { SfxMap } from './types';

export const coreSfx: SfxMap = {
  tap: { voice: 'ekwe' },
  select: { voice: 'agogo', gain: 0.7 },
  back: { voice: 'ekwe', pitch: 0.8 },
  success: [{ voice: 'agogo' }, { voice: 'agogo', pitch: 1.5, when: 0.1 }],
  fail: { voice: 'udu', pitch: 0.8 },
  coin: { voice: 'agogo', pitch: 1.5 },
  card: { voice: 'ekwe', pitch: 1.2 },
  dice: { voice: 'shekere' },
  move: { voice: 'ekwe' },
  drop: { voice: 'udu' },
  turn: { voice: 'talkingDrum' },
  tick: { voice: 'shekere', gain: 0.5 },
  start: { voice: 'talkingDrum', pitch: 1.3 },
  win: [{ voice: 'ogene' }, { voice: 'agogo', pitch: 1.5, when: 0.15 }],
  lose: { voice: 'udu', pitch: 0.7 },
  unlock: { voice: 'fanfare' },
};
