import { ARM, HOME, LAST_TRACK, TRACK_SIZE } from './config';

/** Track square a seed of colour `slot` stands on at `progress` (0..50 only). */
export const trackIndex = (slot: number, progress: number): number =>
  (ARM * slot + progress) % TRACK_SIZE;

/** A colour's start square. */
export const startIndex = (slot: number): number => ARM * slot;

/**
 * Safe squares: every colour's start square and the star square 8 steps after it
 * (squares 0, 8, 13, 21, 26, 34, 39, 47). Nothing can be captured there.
 */
export const isStartSquare = (idx: number): boolean => idx % ARM === 0;
export const isStarSquare = (idx: number): boolean => idx % ARM === 8;
export const isSafeSquare = (idx: number): boolean => isStartSquare(idx) || isStarSquare(idx);

/** Where a progress value is: yard, shared track, or the private home column. */
export type Zone = 'yard' | 'track' | 'column' | 'home';
export function zoneOf(progress: number): Zone {
  if (progress < 0) return 'yard';
  if (progress <= LAST_TRACK) return 'track';
  return progress >= HOME ? 'home' : 'column';
}

/** Is this seed protected by where it stands (safe square, home column, yard, home)? */
export function isSeedSafe(slot: number, progress: number): boolean {
  return progress < 0 || progress > LAST_TRACK || isSafeSquare(trackIndex(slot, progress));
}

/** Clockwise distance along the track from square `a` to square `b` (0..51). */
export const trackDistance = (a: number, b: number): number =>
  (((b - a) % TRACK_SIZE) + TRACK_SIZE) % TRACK_SIZE;
