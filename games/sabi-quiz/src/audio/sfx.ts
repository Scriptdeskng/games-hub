// Sabi Quiz game SFX (asset-designer; spec in docs/assets/sabi-quiz-brief.md section 6).
// Core voices only (ekwe, agogo, ogene, udu, shekere, talking drum) so the quiz sounds like the family.
// Register: core.audio.registerSfx({ ...coreSfx, ...quizSfx }); soft mix: softSfx({ ...coreSfx, ...quizSfx }).
// Names do not shadow core events (`tick`, `win`, `lose` stay the core cues).
// Pitch contracts for the caller:
//  - `timerLow` plays once per second for the last 5 s; the final second uses `timerLast`.
//  - `padiBar` plays once per revealed bar; raise `pitch` by 6 percent per bar (A, B, C, D).
//  - `streak` plays `streak2`, `streak3` for x2, x3 and `streakBig` from x5.
// Every cue span (max of `when` + voice duration) is <= 0.3 s except the celebration class below.
import type { SfxMap } from '@naija/core/audio';

/** Cues allowed to run up to 1.5 s (fanfares and results). Everything else must stay <= 0.3 s. */
export const QUIZ_CELEBRATION_CUES = ['streakBig', 'roundWin', 'roundLose', 'dailyDone'] as const;

export const quizSfx: SfxMap = {
  /** A new question drops in: a low wood knock and a dry shekere tick. */
  questionIn: [
    { voice: 'ekwe', pitch: 0.77, gain: 0.6 },
    { voice: 'shekereTick', when: 0.04, gain: 0.6 },
  ],
  /** Round or duel start: talking drum rises, then an agogo ting a fourth up. */
  roundStart: [
    { voice: 'talkingDrum', gain: 0.8 },
    { voice: 'agogoTing', pitch: 1.25, when: 0.12, gain: 0.6 },
  ],
  /** The question clock each second: a plain ekwe wood click (the calm quiz bed ticks along). */
  secondTick: { voice: 'ekwe', pitch: 1, gain: 0.4 },
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
  /** Tap a plate to pick it: bright wood click. */
  select: { voice: 'ekwe', pitch: 1.22, gain: 0.7 },
  /** Answer locked in: two wood knocks, second lower. */
  lock: [
    { voice: 'ekwe', pitch: 1, gain: 0.7 },
    { voice: 'ekwe', pitch: 0.77, when: 0.06, gain: 0.7 },
  ],
  /** Correct: ogene gong strike with an agogo double bell on top. */
  correct: [
    { voice: 'ogene', gain: 0.45 },
    { voice: 'agogo', when: 0.06, gain: 0.8 },
  ],
  /** Wrong: falling talking drum with a low udu bloop (gentle, never mocking). */
  wrong: [
    { voice: 'talkingDrumDown', pitch: 0.9, gain: 0.65 },
    { voice: 'udu', pitch: 0.6, when: 0.02, gain: 0.6 },
  ],
  /** Time is up: shekere shake and a low falling drum. */
  timeUp: [
    { voice: 'shekere', gain: 0.6 },
    { voice: 'talkingDrumDown', pitch: 0.85, when: 0.04, gain: 0.5 },
  ],
  /** Streak x2: two rising agogo tings. */
  streak2: [
    { voice: 'agogoTing', pitch: 1, gain: 0.8 },
    { voice: 'agogoTing', pitch: 1.25, when: 0.07, gain: 0.8 },
  ],
  /** Streak x3: three rising agogo tings (fifth at the top). */
  streak3: [
    { voice: 'agogoTing', pitch: 1, gain: 0.8 },
    { voice: 'agogoTing', pitch: 1.25, when: 0.07, gain: 0.8 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.14, gain: 0.8 },
  ],
  /** Streak x5 and beyond (celebration class): talking-drum fill into an ogene ring and agogo. */
  streakBig: [
    { voice: 'talkingDrum', pitch: 1, gain: 0.7 },
    { voice: 'talkingDrum', pitch: 1.2, when: 0.09, gain: 0.7 },
    { voice: 'talkingDrum', pitch: 1.5, when: 0.18, gain: 0.7 },
    { voice: 'ogeneRing', when: 0.27, gain: 0.5 },
    { voice: 'agogo', pitch: 1.5, when: 0.3, gain: 0.6 },
  ],
  /** Streak lost: one soft falling drum, no sting. */
  streakBreak: { voice: 'talkingDrumDown', pitch: 1.2, gain: 0.4 },
  /** Lifeline 50/50: a shekere shuffle and two wood clicks as two plates are struck out. */
  lifeline5050: [
    { voice: 'shekereShuffle', gain: 0.6 },
    { voice: 'ekwe', pitch: 1.4, when: 0.1, gain: 0.6 },
    { voice: 'ekwe', pitch: 0.9, when: 0.16, gain: 0.6 },
  ],
  /** Lifeline Skip: a two-step talking-drum squeeze (the question slides away). */
  lifelineSkip: { voice: 'talkingDrumSqueeze', gain: 0.6 },
  /** Lifeline Ask your padi: three rising wood taps (votes coming in) and a ting. */
  lifelinePadi: [
    { voice: 'ekwe', pitch: 1, gain: 0.5 },
    { voice: 'ekwe', pitch: 1.2, when: 0.05, gain: 0.5 },
    { voice: 'ekwe', pitch: 1.4, when: 0.09, gain: 0.5 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.12, gain: 0.6 },
  ],
  /** One poll bar rises: a soft clay bloop (the caller raises `pitch` 6 percent per bar). */
  padiBar: [
    { voice: 'udu', pitch: 1.2, gain: 0.5 },
    { voice: 'shekereTick', when: 0.02, gain: 0.4 },
  ],
  /** Tap a spent lifeline: two low wood clicks. */
  lifelineUsed: [
    { voice: 'ekwe', pitch: 0.77, gain: 0.7 },
    { voice: 'ekwe', pitch: 0.6, when: 0.1, gain: 0.6 },
  ],
  /** Duel: you buzz in first (wood click and a rising drum). */
  duelBuzz: [
    { voice: 'ekwe', pitch: 1.4, gain: 0.8 },
    { voice: 'talkingDrum', pitch: 1.3, when: 0.02, gain: 0.6 },
  ],
  /** Duel: the CPU contestant buzzes in (lower and quieter, so it reads as "them"). */
  duelCpuBuzz: [
    { voice: 'ekwe', pitch: 0.9, gain: 0.6 },
    { voice: 'talkingDrum', pitch: 0.9, when: 0.02, gain: 0.45 },
  ],
  /** Duel: you take the lead. */
  duelLead: [
    { voice: 'agogoTing', pitch: 1.25, gain: 0.7 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.07, gain: 0.7 },
  ],
  /** Host banter bubble pops in. */
  hostIn: [
    { voice: 'ekwe', pitch: 1.1, gain: 0.5 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.05, gain: 0.4 },
  ],
  /** Results: score counts up, one tick per step. */
  scoreTick: { voice: 'agogoTing', pitch: 1.5, gain: 0.5 },
  /** Round won (celebration class, about 1.25 s): drum fill, kakaki-goje fanfare, ogene ring. */
  roundWin: [
    { voice: 'talkingDrum', pitch: 1, gain: 0.7 },
    { voice: 'talkingDrum', pitch: 1.2, when: 0.09, gain: 0.7 },
    { voice: 'talkingDrum', pitch: 1.5, when: 0.18, gain: 0.7 },
    { voice: 'fanfareShort', when: 0.3, gain: 0.7 },
    { voice: 'ogeneRing', when: 0.6, gain: 0.5 },
  ],
  /** Round not won (celebration class, gentle): falling squeeze and a low udu. */
  roundLose: [
    { voice: 'talkingDrumSqueeze', pitch: 0.85, gain: 0.55 },
    { voice: 'udu', pitch: 0.6, when: 0.3, gain: 0.5 },
  ],
  /** Daily challenge finished (celebration class): short fanfare and agogo shimmer. */
  dailyDone: [
    { voice: 'fanfareShort', gain: 0.8 },
    { voice: 'agogo', when: 0.5, gain: 0.6 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.65, gain: 0.5 },
  ],
};
