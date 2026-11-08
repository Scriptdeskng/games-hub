// Sabi Words game SFX (asset-designer; spec in docs/assets/sabi-words-brief.md section 7).
// Core voices only (ekwe, agogo, ogene, udu, shekere, talking drum, fanfare) so the game sounds like the family.
// Register: core.audio.registerSfx({ ...coreSfx, ...wordsSfx }); soft mix: softSfx({ ...coreSfx, ...wordsSfx }).
// Names do not shadow core events (`tap`, `select`, `coin`, `fail`, `win`, `lose`, `tick` stay the core cues).
// Pitch contracts for the caller:
//  - `letterSwipe` plays once per NEW letter added to the swipe; raise `pitch` by 4 percent per letter (cap +40 percent)
//    so a long swipe climbs like a talking drum "speaking" the word.
//  - `star` plays once per star as it lands: pitch 1, 1.25, 1.5 for stars 1, 2, 3.
//  - `timerLow` plays once per second for the last 5 s; the final second uses `timerLast`.
//  - `wordFound` for words under 8 letters, `wordFoundLong` (celebration class) for 8 letters or more.
// Every cue span (max of `when` + voice duration) is <= 0.3 s except the celebration class below.
import type { SfxMap } from '@naija/core/audio';

/** Cues allowed to run up to 1.5 s (fanfares and results). Everything else must stay <= 0.3 s. */
export const WORDS_CELEBRATION_CUES = ['wordFoundLong', 'levelComplete', 'levelFail'] as const;

export const wordsSfx: SfxMap = {
  /** A new puzzle board is laid on the market table: dry shekere shuffle and a low wood knock. */
  gridIn: [
    { voice: 'shekereShuffle', gain: 0.5 },
    { voice: 'ekwe', pitch: 0.77, when: 0.1, gain: 0.6 },
  ],
  /** Pressing down on the first letter: bright ekwe slit-drum click. */
  letterTap: { voice: 'ekwe', pitch: 1.22, gain: 0.7 },
  /** Each new letter dragged over: a softer wood click with a bead tick (caller raises pitch 4 percent per letter). */
  letterSwipe: [
    { voice: 'ekwe', pitch: 1, gain: 0.45 },
    { voice: 'shekereTick', when: 0.01, gain: 0.25 },
  ],
  /** Word found: agogo double bell, a high agogo ting on top and a soft ogene ring under it. */
  wordFound: [
    { voice: 'ogene', gain: 0.25 },
    { voice: 'agogo', when: 0.02, gain: 0.8 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.09, gain: 0.55 },
  ],
  /** Long word (8+ letters, celebration class): talking-drum rise, agogo and an ogene ring. */
  wordFoundLong: [
    { voice: 'talkingDrum', pitch: 1, gain: 0.6 },
    { voice: 'talkingDrum', pitch: 1.25, when: 0.08, gain: 0.6 },
    { voice: 'agogo', when: 0.16, gain: 0.8 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.24, gain: 0.55 },
    { voice: 'ogeneRing', when: 0.3, gain: 0.45 },
  ],
  /** Not a word: a low wood knock and a soft falling drum (gentle, never mocking). */
  wordWrong: [
    { voice: 'ekwe', pitch: 0.77, gain: 0.6 },
    { voice: 'talkingDrumDown', pitch: 1.2, when: 0.04, gain: 0.35 },
  ],
  /** Swipe cancelled or selection cleared: a bead tick and a low wood click. */
  selectionClear: [
    { voice: 'shekereTick', gain: 0.7 },
    { voice: 'ekwe', pitch: 0.9, when: 0.02, gain: 0.4 },
  ],
  /** Hint used (lantern lit): a high clay-pot bloop and an agogo ting. */
  hint: [
    { voice: 'udu', pitch: 1.5, gain: 0.5 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.08, gain: 0.5 },
  ],
  /** Coins paid for a hint: a low ting and a wood click (a small "spend", not a jackpot). */
  coinSpend: [
    { voice: 'agogoTing', pitch: 1.25, gain: 0.5 },
    { voice: 'ekwe', pitch: 0.77, when: 0.05, gain: 0.5 },
  ],
  /** Cosmetic coins earned: two rising agogo tings. */
  coinEarn: [
    { voice: 'agogoTing', pitch: 1.5, gain: 0.8 },
    { voice: 'agogoTing', pitch: 2, when: 0.06, gain: 0.5 },
  ],
  /** One star lands (caller sets pitch 1, 1.25, 1.5 for stars 1 to 3): agogo ting and a bead tick. */
  star: [
    { voice: 'agogoTing', pitch: 1.25, gain: 0.8 },
    { voice: 'shekereTick', when: 0.02, gain: 0.3 },
  ],
  /** Last 5 s: beaded shekere tick over a higher wood click (urgency without alarm). */
  timerLow: [
    { voice: 'shekereTick', gain: 0.9 },
    { voice: 'ekwe', pitch: 1.4, when: 0.01, gain: 0.4 },
  ],
  /** The final second: the same tick, pitched up. */
  timerLast: [
    { voice: 'shekereTick', pitch: 1.25, gain: 1 },
    { voice: 'ekwe', pitch: 1.65, when: 0.01, gain: 0.5 },
  ],
  /** Pack chosen on the pack picker: ekwe click and a low agogo ting. */
  packPick: [
    { voice: 'ekwe', pitch: 1.1, gain: 0.6 },
    { voice: 'agogoTing', pitch: 1.25, when: 0.05, gain: 0.5 },
  ],
  /** Guide (Osas) banter bubble pops in. */
  hostIn: [
    { voice: 'ekwe', pitch: 1.1, gain: 0.5 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.05, gain: 0.4 },
  ],
  /** Results: score counts up, one tick per step. */
  scoreTick: { voice: 'agogoTing', pitch: 1.5, gain: 0.5 },
  /** Every word found (celebration class, about 1.25 s): drum fill, kakaki-goje fanfare, ogene ring. */
  levelComplete: [
    { voice: 'talkingDrum', pitch: 1, gain: 0.7 },
    { voice: 'talkingDrum', pitch: 1.2, when: 0.09, gain: 0.7 },
    { voice: 'talkingDrum', pitch: 1.5, when: 0.18, gain: 0.7 },
    { voice: 'fanfareShort', when: 0.3, gain: 0.7 },
    { voice: 'ogeneRing', when: 0.6, gain: 0.5 },
  ],
  /** Time ran out (celebration class, gentle): falling squeeze and a low udu. */
  levelFail: [
    { voice: 'talkingDrumSqueeze', pitch: 0.85, gain: 0.55 },
    { voice: 'udu', pitch: 0.6, when: 0.3, gain: 0.5 },
  ],
};
