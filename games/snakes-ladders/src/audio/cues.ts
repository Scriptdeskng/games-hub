import type { CueStep, MusicTrack } from '@naija/core/audio';

/** Which cue plays when a pawn rides a ladder or slides down a snake of this theme. */
const LADDER: Record<string, string> = {
  brt: 'ladderBrt',
  okada: 'ladderOkada',
  keke: 'ladderKeke',
  bridge: 'ladderBridge',
};
const SNAKE: Record<string, string> = {
  pothole: 'snakePothole',
  goslow: 'snakeGoslow',
  nepa: 'snakeNepa',
  tollqueue: 'snakeToll',
};

export const jumpSfx = (kind: 'ladder' | 'snake', theme?: string): string =>
  (kind === 'ladder' ? LADDER : SNAKE)[theme ?? ''] ?? (kind === 'ladder' ? 'success' : 'fail');

const loop = (bpm: number, steps: (CueStep | null)[]): MusicTrack => ({
  kind: 'pattern',
  bpm,
  steps,
});

/** Fuji-flavoured percussion loops from synth voices (no audio file to download). The
 *  composed loops (assets/audio/music/snakes-*.mp3) replace these when a human delivers them. */
export const menuMusic = loop(112, [
  { voice: 'talkingDrum', pitch: 1, gain: 0.35 },
  null,
  { voice: 'shekere', gain: 0.3 },
  { voice: 'agogo', pitch: 1, gain: 0.22 },
  null,
  { voice: 'shekere', gain: 0.25 },
  { voice: 'ekwe', pitch: 1.2, gain: 0.4 },
  null,
  { voice: 'talkingDrum', pitch: 1.2, gain: 0.3 },
  { voice: 'shekere', gain: 0.25 },
  null,
  { voice: 'agogo', pitch: 1.5, gain: 0.22 },
  { voice: 'ekwe', pitch: 1, gain: 0.4 },
  null,
  { voice: 'shekere', gain: 0.3 },
  null,
]);

export const playMusic = loop(120, [
  { voice: 'ekwe', pitch: 1, gain: 0.4 },
  { voice: 'shekere', gain: 0.25 },
  null,
  { voice: 'agogo', pitch: 1.33, gain: 0.2 },
  { voice: 'ekwe', pitch: 1.2, gain: 0.35 },
  null,
  { voice: 'shekere', gain: 0.25 },
  { voice: 'talkingDrum', pitch: 1, gain: 0.25 },
  { voice: 'ekwe', pitch: 1, gain: 0.4 },
  { voice: 'shekere', gain: 0.25 },
  null,
  { voice: 'agogo', pitch: 1.5, gain: 0.2 },
  null,
  { voice: 'ekwe', pitch: 1.5, gain: 0.35 },
  { voice: 'shekere', gain: 0.25 },
  null,
]);
