import { LayoutError, MAX_ROLL, type BoardLayout, type Jump } from './config';

/**
 * The ladder and snake table. To change the board, edit this data only: `loadLayout` validates
 * it when the module loads (a bad table throws, so a broken board can never ship) and the unit
 * tests re-check the shipped layout. Ladder = bus or okada lift, snake = pothole or go-slow;
 * the `id` links each entry to its caption (i18n `jump.<id>`) and artwork.
 */
export const LAYOUT_DATA = {
  size: 10,
  ladders: [
    { id: 'ladder-8', from: 8, to: 36, theme: 'okada' },
    { id: 'ladder-12', from: 12, to: 34, theme: 'brt' },
    { id: 'ladder-22', from: 22, to: 42, theme: 'keke' },
    { id: 'ladder-32', from: 32, to: 54, theme: 'brt' },
    { id: 'ladder-50', from: 50, to: 70, theme: 'okada' },
    { id: 'ladder-56', from: 56, to: 74, theme: 'brt' },
    { id: 'ladder-64', from: 64, to: 84, theme: 'okada' },
    { id: 'ladder-76', from: 76, to: 95, theme: 'bridge' },
  ],
  snakes: [
    { id: 'snake-98', from: 98, to: 78, theme: 'tollqueue' },
    { id: 'snake-92', from: 92, to: 72, theme: 'goslow' },
    { id: 'snake-88', from: 88, to: 68, theme: 'pothole' },
    { id: 'snake-80', from: 80, to: 60, theme: 'goslow' },
    { id: 'snake-62', from: 62, to: 40, theme: 'nepa' },
    { id: 'snake-58', from: 58, to: 38, theme: 'pothole' },
    { id: 'snake-52', from: 52, to: 30, theme: 'goslow' },
    { id: 'snake-44', from: 44, to: 24, theme: 'pothole' },
  ],
};

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/** Every problem with a layout; an empty list means it is valid. */
export function validateLayout(l: BoardLayout): string[] {
  const out: string[] = [];
  const n = l.size * l.size;
  if (!isInt(l.size) || l.size < 5 || l.size > 12) out.push(`size ${String(l.size)} is not 5..12`);
  const seenIds = new Set<string>();
  const starts = new Map<number, string>();
  const all: [Jump, 'ladder' | 'snake'][] = [
    ...l.ladders.map((j): [Jump, 'ladder' | 'snake'] => [j, 'ladder']),
    ...l.snakes.map((j): [Jump, 'ladder' | 'snake'] => [j, 'snake']),
  ];
  for (const [j, kind] of all) {
    const name = `${kind} "${String(j.id)}"`;
    if (j.theme !== undefined && (typeof j.theme !== 'string' || !j.theme))
      out.push(`${name}: theme must be a non-empty string`);
    if (typeof j.id !== 'string' || !j.id) out.push(`${name}: missing id`);
    else if (seenIds.has(j.id)) out.push(`${name}: duplicate id`);
    seenIds.add(j.id);
    if (!isInt(j.from) || !isInt(j.to)) {
      out.push(`${name}: from/to must be whole numbers`);
      continue;
    }
    if (j.from < 2 || j.from > n - 1) out.push(`${name}: start ${j.from} must be in 2..${n - 1}`);
    if (j.to < 1 || j.to > n) out.push(`${name}: end ${j.to} must be in 1..${n}`);
    if (kind === 'ladder' && j.to <= j.from) out.push(`${name}: a ladder must go up`);
    if (kind === 'snake' && j.to >= j.from) out.push(`${name}: a snake must go down`);
    if (Math.abs(j.to - j.from) < 3) out.push(`${name}: too short (at least 3 squares)`);
    const other = starts.get(j.from);
    if (other) out.push(`${name}: start ${j.from} is already used by ${other} (overlap)`);
    starts.set(j.from, name);
  }
  // chain avoidance: nothing may end where another ladder or snake starts
  for (const [j, kind] of all) {
    const hit = starts.get(j.to);
    if (hit) out.push(`${kind} "${j.id}" ends on ${j.to}, the start of ${hit} (chain)`);
  }
  if (out.length) return out; // reachability only makes sense for a well-formed table

  const jump = new Map(all.map(([j]) => [j.from, j.to]));
  const reach = reachability(n, jump);
  for (const [j, kind] of all) {
    if (!reach.landedOn.has(j.from)) out.push(`${kind} "${j.id}": start ${j.from} is unreachable`);
  }
  if (!reach.positions.has(n)) out.push(`square ${n} is unreachable`);
  for (const p of reach.stuck) out.push(`a player on square ${p} could never finish`);
  return out;
}

interface Reach {
  /** squares a pawn can stand on after jumps (0 = off the board) */
  positions: Set<number>;
  /** squares a die can land on, before any ladder or snake moves the pawn */
  landedOn: Set<number>;
  /** reachable positions that can never get to the last square */
  stuck: number[];
}

function reachability(n: number, jump: ReadonlyMap<number, number>): Reach {
  const positions = new Set<number>([0]);
  const landedOn = new Set<number>();
  const queue = [0];
  const edges = new Map<number, number[]>();
  while (queue.length) {
    const p = queue.pop() as number;
    const to: number[] = [];
    for (let r = 1; r <= MAX_ROLL; r++) {
      const t = p + r;
      if (t > n) continue;
      landedOn.add(t);
      const d = jump.get(t) ?? t;
      to.push(d);
      if (!positions.has(d)) {
        positions.add(d);
        queue.push(d);
      }
    }
    edges.set(p, to);
  }
  const good = new Set<number>([n]);
  for (let changed = true; changed;) {
    changed = false;
    for (const [p, to] of edges) {
      if (!good.has(p) && to.some((d) => good.has(d))) {
        good.add(p);
        changed = true;
      }
    }
  }
  return { positions, landedOn, stuck: [...positions].filter((p) => !good.has(p)) };
}

/** Parse and validate a layout from untrusted JSON. Throws `LayoutError` listing every problem. */
export function loadLayout(raw: unknown): BoardLayout {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<BoardLayout>;
  const list = (v: unknown): Jump[] =>
    Array.isArray(v)
      ? v.map((j: Partial<Jump>) => ({
          id: j?.id as string,
          from: j?.from as number,
          to: j?.to as number,
          ...(j?.theme === undefined ? {} : { theme: j.theme }),
        }))
      : [];
  const layout: BoardLayout = {
    size: r.size as number,
    ladders: list(r.ladders),
    snakes: list(r.snakes),
  };
  const problems = validateLayout(layout);
  if (problems.length) throw new LayoutError(problems);
  return layout;
}

export const DEFAULT_LAYOUT: BoardLayout = loadLayout(LAYOUT_DATA);

/** Map square -> where a pawn that lands there ends up (ladders up, snakes down). */
export function jumpMap(l: BoardLayout): Map<number, Jump & { kind: 'ladder' | 'snake' }> {
  const m = new Map<number, Jump & { kind: 'ladder' | 'snake' }>();
  for (const j of l.ladders) m.set(j.from, { ...j, kind: 'ladder' });
  for (const j of l.snakes) m.set(j.from, { ...j, kind: 'snake' });
  return m;
}
