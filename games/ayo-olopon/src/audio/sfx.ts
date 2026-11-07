// Ayo Olopon game SFX (asset-designer; spec in docs/assets/ayo-olopon-brief.md section 6).
// Core voices only (udu, ekwe, shekere, agogo, talking drum, ogene) so Ayo sounds like the family.
// Register: core.audio.registerSfx({ ...coreSfx, ...ayoSfx }); soft mix: softSfx({ ...coreSfx, ...ayoSfx }).
// Sowing pitch contract: the caller raises `pitch` of `seedDrop` by 2 percent per seed (cap +12 percent)
// and spaces seeds 110 to 140 ms apart, so a long sow reads as a rising run of udu bloops.
// Every cue span (max of `when` + voice duration) is <= 0.3 s except `bigCapture` and `sweep` (celebration class).
import type { SfxMap } from '@naija/core/audio';

export const ayoSfx: SfxMap = {
  /** Lift the seeds out of a pit: a dry ekwe tap and a short shekere tick (the handful of seeds). */
  pickUp: [
    { voice: 'ekwe', pitch: 1.4, gain: 0.7 },
    { voice: 'shekereTick', when: 0.03, gain: 0.7 },
  ],
  /** Start of a sow: the beaded rattle of seeds shifting in the hand. */
  sowRattle: { voice: 'shekereShuffle', gain: 0.6 },
  /** One seed into one pit: clay bloop with a wood click (the board is carved wood). */
  seedDrop: [
    { voice: 'udu', pitch: 1.1, gain: 0.7 },
    { voice: 'ekwe', pitch: 1.22, when: 0.01, gain: 0.6 },
  ],
  /** Capture: agogo double bell, a bright ting, and an ekwe sweep as the seeds are raked into the tray. */
  capture: [
    { voice: 'agogo' },
    { voice: 'agogoTing', pitch: 1.5, when: 0.08, gain: 0.7 },
    { voice: 'ekwe', pitch: 1.0, when: 0.1, gain: 0.5 },
    { voice: 'ekwe', pitch: 1.2, when: 0.14, gain: 0.5 },
    { voice: 'ekwe', pitch: 1.4, when: 0.18, gain: 0.5 },
  ],
  /** Each extra pit in a capture chain: rising agogo ting (call 0, 1, 2 with pitch steps by the caller). */
  chain: [
    { voice: 'agogoTing', pitch: 1, gain: 0.8 },
    { voice: 'agogoTing', pitch: 1.25, when: 0.07, gain: 0.8 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.14, gain: 0.8 },
  ],
  /** Capture of 8 or more seeds: ogene gong over the agogo (celebration class, 0.5 s). */
  bigCapture: [
    { voice: 'ogene', gain: 0.7 },
    { voice: 'agogo', when: 0.05, gain: 0.8 },
    { voice: 'agogoTing', pitch: 2, when: 0.2, gain: 0.6 },
  ],
  /** A captured seed lands in a tray: clay bloop, low and soft. */
  trayDrop: [
    { voice: 'udu', pitch: 0.9, gain: 0.6 },
    { voice: 'ekwe', pitch: 0.77, when: 0.02, gain: 0.5 },
  ],
  /** Your turn: talking drum rises. */
  yourTurn: { voice: 'talkingDrum', gain: 0.8 },
  /** CPU turn: a lower, quieter two-step drum squeeze (never nagging). */
  cpuTurn: { voice: 'talkingDrumSqueeze', pitch: 0.9, gain: 0.5 },
  /** Tap a pit that can be played. */
  pitSelect: { voice: 'ekwe', pitch: 1.4, gain: 0.7 },
  /** Hint from the persona: a single high agogo. */
  hint: { voice: 'agogoTing', pitch: 1.5, gain: 0.7 },
  /** 12+ seeds: the origin pit is skipped. A quick double ekwe tick, rising. */
  skipOrigin: [
    { voice: 'ekwe', pitch: 0.9, gain: 0.6 },
    { voice: 'ekwe', pitch: 1.3, when: 0.07, gain: 0.6 },
  ],
  /** Illegal tap (pit empty or not yours): two low ekwe clicks. */
  noMove: [
    { voice: 'ekwe', pitch: 0.77 },
    { voice: 'ekwe', pitch: 0.6, when: 0.11, gain: 0.8 },
  ],
  /** Rule: you must give the opponent seeds. Squeeze, then a soft click. */
  mustFeed: [
    { voice: 'talkingDrumSqueeze', pitch: 0.8, gain: 0.6 },
    { voice: 'ekwe', pitch: 0.9, when: 0.16, gain: 0.5 },
  ],
  /** Game end: leftover seeds swept to their owners (shekere + low udu; 0.35 s). */
  sweep: [
    { voice: 'shekere', gain: 0.6 },
    { voice: 'udu', pitch: 0.7, when: 0.08, gain: 0.5 },
  ],
  /** A pit of yours was captured: gentle, never mocking. */
  seedsLost: [
    { voice: 'talkingDrumDown', pitch: 0.9, gain: 0.6 },
    { voice: 'udu', pitch: 0.6, when: 0.02, gain: 0.6 },
  ],
};
