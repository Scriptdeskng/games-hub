// Penalty King SFX (asset-designer; spec in docs/assets/penalty-king-brief.md section 6).
// Core instrument voices only (ekwe, udu, ogene, agogo, shekere, talking drum, crowd, kakaki-goje fanfare). No generic whistle, blip or coin.
// The referee-signal substitute `whistleSub` is a double high agogo ting plus an ekwe knock (a bell-and-wood call), not the core `whistle` voice.
// Register: core.audio.registerSfx({ ...coreSfx, ...penaltySfx }); soft mix: softSfx({ ...coreSfx, ...penaltySfx }).
// Caller contracts:
//  - `powerTick` plays every ~120 ms while the power bar charges; raise `pitch` by 4 percent per tick (cap +40 percent) so it climbs.
//  - `aimTick` plays when the aim crosses a new target zone (never more than 8 per second).
//  - `crowdGoal` follows `netIn` after about 150 ms; `crowdGroan` follows a miss, a post or a CPU goal.
// Every cue span is <= 0.3 s except the celebration class below (<= 1.5 s).
import type { SfxMap } from '@naija/core/audio';

/** Cues allowed to run up to 1.5 s. Everything else must stay <= 0.3 s. */
export const PENALTY_CELEBRATION_CUES = [
  'crowdGoal',
  'crowdGroan',
  'suddenDeath',
  'bracketAdvance',
  'shootoutWin',
  'shootoutLose',
] as const;

export const penaltySfx: SfxMap = {
  /** Aim crosses a target zone: a bead tick and a soft wood knock. */
  aimTick: [
    { voice: 'shekereTick', pitch: 1.1, gain: 0.35 },
    { voice: 'ekwe', pitch: 1.3, when: 0.01, gain: 0.3 },
  ],
  /** Aim locked: bright ekwe click and a high agogo ting. */
  aimLock: [
    { voice: 'ekwe', pitch: 1.1, gain: 0.6 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.03, gain: 0.5 },
  ],
  /** Power bar charging (loop tick, caller raises pitch): low ekwe knock with a bead. */
  powerTick: [
    { voice: 'ekwe', pitch: 0.9, gain: 0.4 },
    { voice: 'shekereTick', pitch: 0.9, when: 0.01, gain: 0.3 },
  ],
  /** Referee-signal substitute: two high agogo tings and a wood knock (a bell-and-wood call). */
  whistleSub: [
    { voice: 'agogoTing', pitch: 2.5, gain: 0.55 },
    { voice: 'agogoTing', pitch: 2.5, when: 0.1, gain: 0.55 },
    { voice: 'ekwe', pitch: 1.5, when: 0.1, gain: 0.35 },
  ],
  /** The strike: clay-pot thump of the boot and a hollow wood crack. */
  shotStrike: [
    { voice: 'ekwe', pitch: 0.77, gain: 0.7 },
    { voice: 'udu', pitch: 1.6, when: 0.02, gain: 0.5 },
  ],
  /** Ball into the net: a soft udu bloop and a rustle of beads (the net). */
  netIn: [
    { voice: 'udu', pitch: 0.8, gain: 0.5 },
    { voice: 'shekereShuffle', when: 0.04, gain: 0.45 },
  ],
  /** Ball hits the post or bar: an ogene clang. */
  postHit: [{ voice: 'ogene', pitch: 1.2, gain: 0.65 }],
  /** Keeper saves: a talking-drum thud (low, short) and a clay-pot bloop. */
  saveStop: [
    { voice: 'talkingDrum', pitch: 0.6, gain: 0.7 },
    { voice: 'udu', pitch: 0.7, when: 0.03, gain: 0.45 },
  ],
  /** Keeper dives: a talking-drum glide and a shaken-bead whoosh made from shekere. */
  dive: [
    { voice: 'talkingDrum', pitch: 0.8, gain: 0.45 },
    { voice: 'shekereShuffle', when: 0.05, gain: 0.35 },
  ],
  /** Round or kick begins: wood knocks, an agogo ting and a rising drum. */
  roundStart: [
    { voice: 'ekwe', pitch: 1, gain: 0.55 },
    { voice: 'ekwe', pitch: 1, when: 0.08, gain: 0.55 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.1, gain: 0.45 },
    { voice: 'talkingDrum', pitch: 1, when: 0.04, gain: 0.35 },
  ],
  /** Goal (celebration class): crowd swell with a shekere rattle, drum rise and agogo. */
  crowdGoal: [
    { voice: 'crowd', gain: 0.8 },
    { voice: 'shekere', gain: 0.4 },
    { voice: 'talkingDrum', pitch: 1, when: 0.05, gain: 0.6 },
    { voice: 'talkingDrum', pitch: 1.25, when: 0.13, gain: 0.6 },
    { voice: 'agogo', when: 0.22, gain: 0.7 },
  ],
  /** Miss, post or CPU goal (celebration class, gentle): a lower crowd groan and a falling drum. */
  crowdGroan: [
    { voice: 'crowd', pitch: 0.6, gain: 0.5 },
    { voice: 'talkingDrumDown', pitch: 0.9, gain: 0.5 },
  ],
  /** Sudden death begins (celebration class): ogene strike, a squeezing drum and a low udu. */
  suddenDeath: [
    { voice: 'ogene', gain: 0.6 },
    { voice: 'talkingDrumSqueeze', pitch: 1, when: 0.12, gain: 0.5 },
    { voice: 'udu', pitch: 0.6, when: 0.4, gain: 0.5 },
    { voice: 'agogoTing', pitch: 2, when: 0.55, gain: 0.45 },
  ],
  /** Bracket advance (celebration class): drum fill, agogo pair and the short goje-kakaki phrase. */
  bracketAdvance: [
    { voice: 'talkingDrum', pitch: 1, gain: 0.6 },
    { voice: 'talkingDrum', pitch: 1.2, when: 0.08, gain: 0.6 },
    { voice: 'agogo', when: 0.18, gain: 0.7 },
    { voice: 'fanfareShort', when: 0.3, gain: 0.6 },
  ],
  /** Shootout won (celebration class): drum fill, fanfare, ogene ring and crowd. */
  shootoutWin: [
    { voice: 'talkingDrum', pitch: 1, gain: 0.7 },
    { voice: 'talkingDrum', pitch: 1.2, when: 0.09, gain: 0.7 },
    { voice: 'talkingDrum', pitch: 1.5, when: 0.18, gain: 0.7 },
    { voice: 'fanfareShort', when: 0.3, gain: 0.7 },
    { voice: 'ogeneRing', when: 0.6, gain: 0.5 },
    { voice: 'crowd', when: 0.3, gain: 0.5 },
  ],
  /** Shootout lost (celebration class, gentle): falling squeeze and a low udu. */
  shootoutLose: [
    { voice: 'talkingDrumSqueeze', pitch: 0.85, gain: 0.55 },
    { voice: 'udu', pitch: 0.6, when: 0.3, gain: 0.5 },
  ],
};
