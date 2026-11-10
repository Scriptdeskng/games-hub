import type { TeamId } from '../rules/teams';

/** Shirt colours (assets/geometry.json), used only for the plain-shape fallback when a sprite sheet fails to load. */
export const SHIRT: Readonly<Record<TeamId, string>> = {
  lanterns: '#0E7C86',
  sparks: '#E8AE32',
  drifters: '#FF7A63',
  comets: '#2C2C31',
  harriers: '#B4532A',
  embers: '#8C1D3D',
  blazers: '#C2185B',
  bells: '#3B2A78',
};

/** The three keeper skins and which rival wears which (skin tones from the brief). */
export type Skin = 'dark' | 'mid' | 'light';
export const KEEPER_OF: Readonly<Record<string, Skin>> = {
  ozavize: 'mid',
  ndako: 'light',
  hamman: 'dark',
};
/** the player's own keeper: never the same skin as the rival's, so you can tell them apart */
export const youKeeper = (rival: Skin): Skin => (rival === 'mid' ? 'dark' : 'mid');
