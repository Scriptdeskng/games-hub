/**
 * Core SFX map (asset-designer). Every event is voiced by a Nigerian instrument or everyday sound
 * (guide section 3). Cue spans: <= 0.3 s, except win / lose / unlock / crowd (<= 1.5 s).
 * Extra non-core cues (deal, special, horn, crowd, whistle, build) are available to every game.
 * Aliases: menu -> select, shuffle -> deal.
 */
import type { SfxMap } from './types';

/** Talking-drum fill: four rising hits (150, 180, 220, 300 Hz equivalents). */
const fill = (gain: number, when = 0) =>
  [150, 180, 220, 300].map((hz, i) => ({
    voice: 'talkingDrum',
    pitch: hz / 180,
    gain,
    when: when + i * 0.08,
  }));

export const coreSfx: SfxMap = {
  tap: { voice: 'ekwe' },
  select: { voice: 'agogoTing' },
  back: { voice: 'ekwe', pitch: 0.77, gain: 0.8 },
  success: [{ voice: 'agogo' }, { voice: 'agogo', pitch: 1.5, when: 0.09, gain: 0.8 }],
  fail: [{ voice: 'talkingDrumDown' }, { voice: 'ekwe', pitch: 0.6, when: 0.12, gain: 0.7 }],
  coin: { voice: 'agogoTing', pitch: 1.5, gain: 0.8 },
  card: [{ voice: 'ekwe', pitch: 0.77 }, { voice: 'shekereShuffle', gain: 0.35 }],
  dice: [{ voice: 'shekere', gain: 0.9 }, { voice: 'ekwe', pitch: 0.6, when: 0.2, gain: 0.8 }],
  move: { voice: 'ekwe', pitch: 1.22 },
  drop: { voice: 'udu' },
  turn: { voice: 'talkingDrum' },
  tick: { voice: 'shekereTick', gain: 0.8 },
  start: [{ voice: 'talkingDrum', pitch: 1.1 }, { voice: 'talkingDrum', pitch: 1.5, when: 0.05, gain: 0.8 }],
  win: [
    ...fill(0.5),
    { voice: 'fanfare', when: 0.3 },
    { voice: 'ogeneRing', when: 0.78, gain: 0.7 },
  ],
  lose: [
    { voice: 'talkingDrumDown', gain: 0.8 },
    { voice: 'talkingDrumDown', pitch: 0.85, when: 0.14, gain: 0.7 },
    { voice: 'talkingDrumDown', pitch: 0.7, when: 0.28, gain: 0.6 },
    { voice: 'udu', pitch: 0.6, when: 0.4, gain: 0.8 },
  ],
  unlock: [
    { voice: 'fanfareShort' },
    { voice: 'agogoTing', pitch: 2, when: 0.5, gain: 0.5 },
    { voice: 'agogoTing', pitch: 2.5, when: 0.58, gain: 0.4 },
  ],

  // ---- extras (not in CORE_SFX_EVENTS) ----
  menu: { voice: 'agogoTing' },
  deal: [{ voice: 'shekereShuffle' }, { voice: 'ekwe', pitch: 0.77, when: 0.1, gain: 0.7 }],
  shuffle: { voice: 'shekere', gain: 0.8 },
  special: { voice: 'ogene' },
  horn: { voice: 'danfoHorn' },
  crowd: { voice: 'crowd' },
  whistle: { voice: 'whistle' },
  build: fill(0.6),
};

/**
 * "Soft" mix for quiet mode / headphones / low-priority games: every cue at `factor` (default 0.5)
 * of its level. The engine has no soft/full switch of its own, so use
 * `audio.registerSfx(softSfx(coreSfx))` to swap, and `registerSfx(coreSfx)` to restore full.
 */
export function softSfx(map: SfxMap = coreSfx, factor = 0.5): SfxMap {
  const out: SfxMap = {};
  for (const [k, cue] of Object.entries(map)) {
    out[k] = (Array.isArray(cue) ? cue : [cue]).map((s) => ({ ...s, gain: (s.gain ?? 1) * factor }));
  }
  return out;
}
