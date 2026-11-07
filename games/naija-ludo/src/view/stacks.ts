import { squareKey } from './geometry';

/**
 * How seeds that share a cell are drawn (asset brief section 3). Pure layout: every seed gets an
 * offset in cell units and a scale; the top seed of each same-colour group carries a count badge.
 *  - one colour, 2+ seeds: the seeds fan out by (+0.08, -0.08) cell each, badge on the top one;
 *  - several colours on one (safe) square: one quadrant per colour at 0.62 scale, each with its badge.
 * A seed alone sits in the middle at full size.
 */
export interface SeedRef {
  /** unique key, e.g. 'you:2' */
  key: string;
  slot: number;
  progress: number;
}

export interface Placement {
  dx: number;
  dy: number;
  scale: number;
  /** stack size to show as a badge on this seed (0 = no badge) */
  badge: number;
}

const QUADRANT: readonly (readonly [number, number])[] = [
  [-0.22, -0.22],
  [0.22, -0.22],
  [-0.22, 0.22],
  [0.22, 0.22],
];

export function layoutStacks(seeds: readonly SeedRef[]): Map<string, Placement> {
  const out = new Map<string, Placement>();
  const cells = new Map<string, Map<number, SeedRef[]>>();
  for (const s of seeds) {
    const k = squareKey(s.slot, s.progress);
    out.set(s.key, { dx: 0, dy: 0, scale: 1, badge: 0 });
    // yards have their own pits, and the centre triangle spreads its seeds itself
    if (k === null || k.startsWith('h')) continue;
    const bySlot = cells.get(k) ?? new Map<number, SeedRef[]>();
    bySlot.set(s.slot, [...(bySlot.get(s.slot) ?? []), s]);
    cells.set(k, bySlot);
  }
  for (const bySlot of cells.values()) {
    const groups = [...bySlot.entries()].sort((a, b) => a[0] - b[0]);
    const mixed = groups.length > 1;
    groups.forEach(([, list], gi) => {
      const [qx, qy] = mixed ? (QUADRANT[gi % 4] as readonly [number, number]) : [0, 0];
      const step = mixed ? 0.05 : 0.08;
      list.forEach((s, i) => {
        out.set(s.key, {
          dx: qx + (list.length > 1 ? (i - (list.length - 1) / 2) * step : 0),
          dy: qy - (list.length > 1 ? (i - (list.length - 1) / 2) * step : 0),
          scale: mixed ? 0.62 : 1,
          badge: i === list.length - 1 && list.length > 1 ? Math.min(4, list.length) : 0,
        });
      });
    });
  }
  return out;
}
