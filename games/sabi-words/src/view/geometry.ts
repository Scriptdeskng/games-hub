import { DIRS, dirBetween, dirOf, colOf, rowOf } from '../rules';

/** Lane / trail placement in px inside the grid (asset brief section 4): first-tile centre, length, angle. */
export interface LaneGeo {
  x: number;
  y: number;
  len: number;
  a: number;
}

export function laneGeo(n: number, cell: number, from: number, to: number): LaneGeo | null {
  const dir = from === to ? 'E' : dirBetween(n, from, to);
  if (!dir) return null;
  const d = dirOf(dir);
  const steps = Math.max(
    Math.abs(rowOf(n, to) - rowOf(n, from)),
    Math.abs(colOf(n, to) - colOf(n, from)),
  );
  const diag = d.dr !== 0 && d.dc !== 0 ? Math.SQRT2 : 1;
  return {
    x: (colOf(n, from) + 0.5) * cell,
    y: (rowOf(n, from) + 0.5) * cell,
    len: steps * cell * diag,
    a: d.a,
  };
}

export const centreOf = (n: number, cell: number, i: number): { x: number; y: number } => ({
  x: (colOf(n, i) + 0.5) * cell,
  y: (rowOf(n, i) + 0.5) * cell,
});

export function applyGeo(el: HTMLElement, g: LaneGeo): void {
  el.style.setProperty('--x', String(g.x));
  el.style.setProperty('--y', String(g.y));
  el.style.setProperty('--len', String(Math.round(g.len * 100) / 100));
  el.style.setProperty('--a', String(g.a));
}

export { DIRS };
