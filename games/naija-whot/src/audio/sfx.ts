// Naija Whot game SFX (asset-designer; spec in docs/assets/naija-whot-brief.md section 5).
// Core voices only (ekwe, shekere, talking drum, agogo, ogene, udu), so Whot sounds like the other games.
// Register: core.audio.registerSfx({ ...coreSfx, ...whotSfx }); soft mix: softSfx({ ...coreSfx, ...whotSfx }).
// Every cue span (max of `when` + voice duration) is <= 0.3 s except `market` (crowd, 1.2 s, celebration class).
import type { SfxMap } from '@naija/core/audio';

export const whotSfx: SfxMap = {
  /** A card is played: ekwe wood slap on the table plus a shekere flick (0.25 s). */
  cardPlay: [
    { voice: 'ekwe', pitch: 0.77 },
    { voice: 'shekereShuffle', gain: 0.35, when: 0.1 },
  ],
  /** Draw from the pile: dry shekere swish, a light ekwe tap as the card lands in the hand. */
  cardDraw: [
    { voice: 'shekereShuffle', gain: 0.6 },
    { voice: 'ekwe', pitch: 1.22, when: 0.1, gain: 0.5 },
  ],
  /** One card dealt; the caller raises `pitch` by 2 percent per card. */
  deal: [
    { voice: 'ekwe', pitch: 1.4, gain: 0.5 },
    { voice: 'shekereTick', when: 0.03, gain: 0.6 },
  ],
  shuffle: { voice: 'shekere', gain: 0.8 },
  /** Slam of a special card (1, 2, 5, 8, 14): table thump = talking drum, ting = agogo. */
  slam: [
    { voice: 'talkingDrum', pitch: 0.9 },
    { voice: 'agogoTing', pitch: 1.2, when: 0.04, gain: 0.7 },
  ],
  /** 2 played: two ekwe hits as the drum falls. 5 played: three. The count is audible. */
  pickTwo: [
    { voice: 'talkingDrumDown', pitch: 1.1, gain: 0.8 },
    { voice: 'ekwe', pitch: 1.4, when: 0.12, gain: 0.7 },
    { voice: 'ekwe', pitch: 1.4, when: 0.19, gain: 0.7 },
  ],
  pickThree: [
    { voice: 'talkingDrumDown', pitch: 0.9, gain: 0.8 },
    { voice: 'ekwe', pitch: 1.4, when: 0.1, gain: 0.7 },
    { voice: 'ekwe', pitch: 1.4, when: 0.17, gain: 0.7 },
    { voice: 'ekwe', pitch: 1.4, when: 0.2, gain: 0.7 },
  ],
  /** Someone takes penalty cards; the caller plays one per card. Gentle, never mocking. */
  pickPenalty: [
    { voice: 'talkingDrumDown', pitch: 0.9, gain: 0.7 },
    { voice: 'udu', pitch: 0.6, when: 0.03, gain: 0.6 },
  ],
  /** 1 Hold On: drum rises, agogo ting says go again. */
  holdOn: [
    { voice: 'talkingDrum', pitch: 1.3 },
    { voice: 'agogoTing', pitch: 1.5, when: 0.1, gain: 0.8 },
  ],
  /** 8 Suspension: the squeezed drum stops short, a low ekwe knock. */
  suspension: [
    { voice: 'talkingDrumSqueeze', pitch: 0.8, gain: 0.8 },
    { voice: 'ekwe', pitch: 0.6, when: 0.19, gain: 0.6 },
  ],
  /** 14 General Market: crowd murmur swell with an agogo call (celebration class, 1.2 s). */
  market: [
    { voice: 'crowd', gain: 0.5 },
    { voice: 'agogo', pitch: 1.1, when: 0.02, gain: 0.8 },
    { voice: 'agogoTing', pitch: 1.6, when: 0.12, gain: 0.7 },
  ],
  /** Whot 20 played: ogene strike over a drum rise. */
  whotPlay: [{ voice: 'ogene' }, { voice: 'talkingDrum', pitch: 1.2, when: 0.0, gain: 0.7 }],
  /** The player or CPU names a shape: a talking-drum call and an ekwe confirm. */
  whotCall: [
    { voice: 'talkingDrum', pitch: 1.2, gain: 0.8 },
    { voice: 'ekwe', pitch: 1.4, when: 0.12, gain: 0.7 },
  ],
  /** A shape button is tapped in the called-shape picker. */
  shapePick: { voice: 'ekwe', pitch: 1.4, gain: 0.7 },
  /** Last card call: agogo double bell with a high ting, bright and alert. */
  lastCard: [
    { voice: 'agogo', pitch: 1.2 },
    { voice: 'agogoTing', pitch: 1.8, when: 0.1, gain: 0.7 },
  ],
  /** Semi-last (two cards): one ting, a notch lower in urgency. */
  semiLast: { voice: 'agogoTing', pitch: 1.25, gain: 0.8 },
  /** Caught without calling: two low ekwe knocks, the drum falls. */
  lastCardCaught: [
    { voice: 'ekwe', pitch: 0.6 },
    { voice: 'ekwe', pitch: 0.6, when: 0.1, gain: 0.8 },
    { voice: 'talkingDrumDown', pitch: 1.2, when: 0.04, gain: 0.5 },
  ],
  /** A CPU takes its turn. */
  cpuTurn: { voice: 'ekwe', pitch: 0.77, gain: 0.5 },
  /** The human taps a card that cannot be played. */
  illegal: [
    { voice: 'ekwe', pitch: 0.77 },
    { voice: 'ekwe', pitch: 0.6, when: 0.11, gain: 0.8 },
  ],
};
