// Naija Ludo game SFX (asset-designer; spec in docs/assets/naija-ludo-brief.md section 5).
// Core voices only (shekere, ekwe, udu, agogo, talking drum, ogene), so Ludo sounds like the other games.
// Register: core.audio.registerSfx({ ...coreSfx, ...ludoSfx }); soft mix: softSfx({ ...coreSfx, ...ludoSfx }).
// Every cue span (max of `when` + voice duration) is <= 0.3 s except `homeReached` (0.95 s).
import type { SfxMap } from '@naija/core/audio';

export const ludoSfx: SfxMap = {
  diceLand: [
    { voice: 'ekwe', pitch: 0.77 },
    { voice: 'udu', pitch: 1.2, when: 0.02, gain: 0.6 },
  ],
  /** Six: agogo double bell plus a high agogo ting. */
  six: [
    { voice: 'agogo', pitch: 1.2 },
    { voice: 'agogoTing', pitch: 1.8, when: 0.09, gain: 0.6 },
  ],
  bonusRoll: [{ voice: 'agogoTing' }, { voice: 'agogoTing', pitch: 4 / 3, when: 0.08, gain: 0.8 }],
  /** A seed leaves the yard: talking drum rises, udu bloop as it lands on the start square. */
  release: [
    { voice: 'talkingDrum', pitch: 1.3, gain: 0.8 },
    { voice: 'udu', pitch: 1.4, when: 0.03, gain: 0.5 },
  ],
  /** One hop; the caller raises `pitch` by 2 percent per hop (cap +12 percent). */
  step: { voice: 'ekwe', pitch: 1.22, gain: 0.7 },
  pick: { voice: 'ekwe', pitch: 1.4, gain: 0.7 },
  cpuTurn: { voice: 'ekwe', pitch: 0.77, gain: 0.6 },
  stack: [
    { voice: 'udu', pitch: 1.4, gain: 0.5 },
    { voice: 'ekwe', pitch: 1.22, when: 0.02, gain: 0.6 },
  ],
  /** Landing on a star square: a bright agogo ting over a soft ekwe. */
  safe: [
    { voice: 'agogoTing', pitch: 1.5, gain: 0.8 },
    { voice: 'ekwe', pitch: 0.77, when: 0.06, gain: 0.5 },
  ],
  /** Capture: agogo double bell with a low udu under it (the seed goes home). */
  capture: [
    { voice: 'agogo' },
    { voice: 'agogoTing', pitch: 1.5, when: 0.08, gain: 0.7 },
    { voice: 'udu', pitch: 0.6, when: 0.03, gain: 0.8 },
  ],
  /** The human's seed was captured: gentle, never mocking. */
  seedLost: [
    { voice: 'talkingDrumDown', pitch: 0.9, gain: 0.7 },
    { voice: 'udu', pitch: 0.55, when: 0.02, gain: 0.7 },
  ],
  homeColumn: { voice: 'talkingDrumSqueeze', gain: 0.7 },
  /** Seed reaches home: rising agogo run into a soft ogene ring (celebration class, 0.95 s). */
  homeReached: [
    { voice: 'agogoTing', pitch: 1 },
    { voice: 'agogoTing', pitch: 1.25, when: 0.08, gain: 0.9 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.16, gain: 0.9 },
    { voice: 'agogoTing', pitch: 2, when: 0.24, gain: 0.8 },
    { voice: 'ogeneRing', when: 0.3, gain: 0.6 },
  ],
  tripleSix: [
    { voice: 'talkingDrumSqueeze', pitch: 0.8, gain: 0.8 },
    { voice: 'ekwe', pitch: 0.6, when: 0.18, gain: 0.7 },
  ],
  /** No legal move, or an exact number is needed. */
  noMove: [
    { voice: 'ekwe', pitch: 0.77 },
    { voice: 'ekwe', pitch: 0.6, when: 0.11, gain: 0.8 },
  ],
};
