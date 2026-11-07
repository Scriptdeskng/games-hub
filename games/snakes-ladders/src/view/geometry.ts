import { squareToCell } from '../rules/board';
import type { Jump } from '../rules/config';

/** The board art and the connector overlay share one 1000 x 1000 box: 100 units per cell. */
export const BOX = 1000;
export const CELL = 100;

export interface Pt {
  x: number;
  y: number;
}

/** Centre of a square in board units (square 1 bottom-left, y grows downward). */
export function squareCenter(square: number, size = 10): Pt {
  const { row, col } = squareToCell(Math.max(1, square), size);
  return { x: col * CELL + CELL / 2, y: (size - 1 - row) * CELL + CELL / 2 };
}

/** Cell position in whole cells from the top-left: what a pawn translates by (percent units). */
export function squareGrid(square: number, size = 10): Pt {
  const { row, col } = squareToCell(Math.max(1, square), size);
  return { x: col, y: size - 1 - row };
}

const f = (n: number): string => String(Math.round(n * 10) / 10);

/** SVG path data for a ladder: two rails and a rung every 28 units. */
export function ladderPath(a: Pt, b: Pt): { rails: string; rungs: string; length: number } {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const dx = (b.x - a.x) / length;
  const dy = (b.y - a.y) / length;
  const nx = -dy * 14;
  const ny = dx * 14;
  const rails = [1, -1]
    .map((s) => `M${f(a.x + s * nx)} ${f(a.y + s * ny)}L${f(b.x + s * nx)} ${f(b.y + s * ny)}`)
    .join('');
  const rungs: string[] = [];
  for (let t = 28; t < length - 10; t += 28) {
    const px = a.x + dx * t;
    const py = a.y + dy * t;
    rungs.push(`M${f(px + nx)} ${f(py + ny)}L${f(px - nx)} ${f(py - ny)}`);
  }
  return { rails, rungs: rungs.join(''), length };
}

/** A wavy snake from head to tail: sine of 14 units amplitude and 60 units wavelength. */
export function snakePath(head: Pt, tail: Pt): string {
  const length = Math.hypot(tail.x - head.x, tail.y - head.y);
  const dx = (tail.x - head.x) / length;
  const dy = (tail.y - head.y) / length;
  const nx = -dy;
  const ny = dx;
  const pts: string[] = [];
  for (let t = 0; t <= length; t += 8) {
    const w = Math.sin((t / 60) * Math.PI * 2) * 14 * Math.min(1, t / 30, (length - t) / 30 + 0.2);
    pts.push(`${f(head.x + dx * t + nx * w)} ${f(head.y + dy * t + ny * w)}`);
  }
  pts.push(`${f(tail.x)} ${f(tail.y)}`);
  return `M${pts.join('L')}`;
}

export interface Connector {
  jump: Jump;
  kind: 'ladder' | 'snake';
  from: Pt;
  to: Pt;
}

export function connectorsOf(
  ladders: readonly Jump[],
  snakes: readonly Jump[],
  size = 10,
): Connector[] {
  const mk = (j: Jump, kind: 'ladder' | 'snake'): Connector => ({
    jump: j,
    kind,
    from: squareCenter(j.from, size),
    to: squareCenter(j.to, size),
  });
  return [...ladders.map((j) => mk(j, 'ladder')), ...snakes.map((j) => mk(j, 'snake'))];
}
