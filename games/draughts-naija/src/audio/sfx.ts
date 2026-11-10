// Draughts Naija SFX (asset-designer; spec in docs/assets/draughts-naija-brief.md section 7).
// Core instrument voices only (ekwe, agogo, ogene, udu, shekere, talking drum, kakaki-goje fanfare) so the game sounds
// like the rest of the family. Register: core.audio.registerSfx({ ...coreSfx, ...draughtsSfx });
// soft mix: softSfx({ ...coreSfx, ...draughtsSfx }). Names do not shadow core events (tap, select, move, drop, turn, win, lose...).
// Pitch contracts for the caller:
//  - `captureHop` plays once per hop of a multi-capture; raise `pitch` by 6 percent per hop (hop 1 = 1, cap +36 percent)
//    so a chain climbs like a talking drum "speaking". Finish with `chainEnd` when the chain had 3 or more hops.
//  - `thinkTick` plays about every 600 ms while the CPU is thinking (never more than 6 in a row; very quiet).
//  - `pieceMove` is the player's move; `cpuMove` is the CPU's (a touch lower) so the player can hear who moved.
//  - `yourTurn` plays when control returns to the player after a CPU move that was not a capture (a capture plays `capture` first).
// Every cue span (max of `when` + voice duration) is <= 0.3 s except the celebration class below (<= 1.5 s).
import type { SfxMap } from '@naija/core/audio';

/** Cues allowed to run up to 1.5 s (crowning, chain finale, results). Everything else must stay <= 0.3 s. */
export const DRAUGHTS_CELEBRATION_CUES = [
  'chainEnd',
  'crown',
  'matchWin',
  'matchLose',
  'matchDraw',
] as const;
/** Cues that exist only if the feature ships. The game has no undo, so the `undo` cue was deleted; nothing is optional now. */
export const DRAUGHTS_OPTIONAL_CUES = [] as readonly string[];

export const draughtsSfx: SfxMap = {
  /** Board laid out for a new game: dry shekere shuffle and a low wood knock (pieces set down). */
  boardIn: [
    { voice: 'shekereShuffle', gain: 0.5 },
    { voice: 'ekwe', pitch: 0.77, when: 0.1, gain: 0.6 },
  ],
  /** Lift a piece: bright ekwe slit-drum click with a tiny agogo ting. */
  pieceSelect: [
    { voice: 'ekwe', pitch: 1.1, gain: 0.6 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.01, gain: 0.25 },
  ],
  /** Put the piece back (tap it again): a lower, softer wood click and a bead tick. */
  pieceDeselect: [
    { voice: 'ekwe', pitch: 0.9, gain: 0.4 },
    { voice: 'shekereTick', when: 0.02, gain: 0.3 },
  ],
  /** Player's slide: ekwe piece-move variant (x1.22) with a soft udu "set down". */
  pieceMove: [
    { voice: 'ekwe', pitch: 1.22, gain: 0.7 },
    { voice: 'udu', pitch: 1.3, when: 0.02, gain: 0.25 },
  ],
  /** CPU slide: the same shape a little lower, so the two sides sound different. */
  cpuMove: [
    { voice: 'ekwe', pitch: 1, gain: 0.6 },
    { voice: 'udu', pitch: 1.1, when: 0.02, gain: 0.22 },
  ],
  /** Single capture: wood click, agogo double bell and a high ting. */
  capture: [
    { voice: 'ekwe', pitch: 1.22, gain: 0.7 },
    { voice: 'agogo', when: 0.04, gain: 0.8 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.1, gain: 0.5 },
  ],
  /** One hop inside a multi-capture (caller raises pitch 6 percent per hop). */
  captureHop: [
    { voice: 'ekwe', pitch: 1.22, gain: 0.55 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.03, gain: 0.6 },
  ],
  /** Multi-capture of 3 or more (celebration class): talking-drum rise, agogo, ogene ring. */
  chainEnd: [
    { voice: 'talkingDrum', pitch: 1, gain: 0.6 },
    { voice: 'talkingDrum', pitch: 1.25, when: 0.08, gain: 0.6 },
    { voice: 'agogo', when: 0.16, gain: 0.8 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.24, gain: 0.55 },
    { voice: 'ogeneRing', when: 0.3, gain: 0.45 },
  ],
  /** King crowned (celebration class): ogene gong strike, a talking-drum lift and two rising agogo tings. */
  crown: [
    { voice: 'ogene', gain: 0.6 },
    { voice: 'talkingDrum', pitch: 1.25, when: 0.05, gain: 0.5 },
    { voice: 'agogoTing', pitch: 2, when: 0.14, gain: 0.5 },
    { voice: 'agogoTing', pitch: 2.5, when: 0.22, gain: 0.4 },
  ],
  /** Illegal move: low double wood knock and a soft falling drum (gentle, never mocking). */
  illegal: [
    { voice: 'ekwe', pitch: 0.77, gain: 0.6 },
    { voice: 'ekwe', pitch: 0.7, when: 0.06, gain: 0.5 },
    { voice: 'talkingDrumDown', pitch: 1.2, when: 0.03, gain: 0.3 },
  ],
  /** Mandatory capture reminder: two wood knocks and an agogo ting (attention, not error). */
  mustCapture: [
    { voice: 'ekwe', pitch: 1, gain: 0.55 },
    { voice: 'ekwe', pitch: 1, when: 0.09, gain: 0.55 },
    { voice: 'agogoTing', pitch: 1.25, when: 0.09, gain: 0.4 },
  ],
  /** A side is down to one piece: a talking-drum squeeze up and a high ting. */
  lastPiece: [
    { voice: 'talkingDrum', pitch: 1, gain: 0.5 },
    { voice: 'talkingDrum', pitch: 1.5, when: 0.05, gain: 0.5 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.12, gain: 0.5 },
  ],
  /** Control returns to the player: a talking-drum up glide (the guide's "your turn"). */
  yourTurn: { voice: 'talkingDrum', pitch: 1, gain: 0.5 },
  /** Hint: a high udu bloop and an agogo ting. */
  hint: [
    { voice: 'udu', pitch: 1.5, gain: 0.5 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.08, gain: 0.5 },
  ],
  /** CPU is thinking (very quiet, about every 600 ms): a low bead tick. */
  thinkTick: { voice: 'shekereTick', pitch: 0.9, gain: 0.3 },
  /** Board size, difficulty or persona chosen on the menu: ekwe click and a low agogo ting. */
  modePick: [
    { voice: 'ekwe', pitch: 1.1, gain: 0.6 },
    { voice: 'agogoTing', pitch: 1.25, when: 0.05, gain: 0.5 },
  ],
  /** CPU persona banter bubble pops in. */
  personaIn: [
    { voice: 'ekwe', pitch: 1.1, gain: 0.5 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.05, gain: 0.4 },
  ],
  /** Player wins (celebration class, about 1.25 s): drum fill, kakaki-goje fanfare, ogene ring. */
  matchWin: [
    { voice: 'talkingDrum', pitch: 1, gain: 0.7 },
    { voice: 'talkingDrum', pitch: 1.2, when: 0.09, gain: 0.7 },
    { voice: 'talkingDrum', pitch: 1.5, when: 0.18, gain: 0.7 },
    { voice: 'fanfareShort', when: 0.3, gain: 0.7 },
    { voice: 'ogeneRing', when: 0.6, gain: 0.5 },
  ],
  /** Player loses (celebration class, gentle): falling squeeze and a low udu. */
  matchLose: [
    { voice: 'talkingDrumSqueeze', pitch: 0.85, gain: 0.55 },
    { voice: 'udu', pitch: 0.6, when: 0.3, gain: 0.5 },
  ],
  /** Draw (celebration class): an even agogo pair at the same pitch, then a soft shekere shuffle. */
  matchDraw: [
    { voice: 'agogo', gain: 0.7 },
    { voice: 'agogo', when: 0.12, gain: 0.7 },
    { voice: 'shekereShuffle', when: 0.2, gain: 0.4 },
  ],
};
