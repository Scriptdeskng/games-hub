import { squareToCell } from './board';
import type { BoardLayout, Jump } from './config';

type P = { x: number; y: number };
const grid = (n: number, size: number): P => {
  const { row, col } = squareToCell(n, size);
  return { x: col, y: row };
};
const side = (p: P, q: P, r: P): number =>
  Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));

/** Do the straight lines of two ladders or snakes (cell centre to cell centre) cross? */
const cross = (a: Jump, b: Jump, size: number): boolean => {
  const [p1, p2] = [grid(a.from, size), grid(a.to, size)] as [P, P];
  const [p3, p4] = [grid(b.from, size), grid(b.to, size)] as [P, P];
  return side(p1, p2, p3) * side(p1, p2, p4) < 0 && side(p3, p4, p1) * side(p3, p4, p2) < 0;
};

/**
 * Design rules for a good board (asset brief, section 3) on top of the hard validity rules in
 * layout.ts: 6 to 10 ladders and snakes, no line crossing another, no two end squares touching,
 * and ladder gain and snake loss within 10 % of each other. The game's own tests run this on the
 * shipped layout, so an edit that breaks the look or the balance is caught.
 */
export function designProblems(l: BoardLayout): string[] {
  const out: string[] = [];
  if (l.ladders.length < 6 || l.ladders.length > 10)
    out.push(`${l.ladders.length} ladders (want 6 to 10)`);
  if (l.snakes.length < 6 || l.snakes.length > 10)
    out.push(`${l.snakes.length} snakes (want 6 to 10)`);
  const all = [...l.ladders, ...l.snakes];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const [a, b] = [all[i], all[j]] as [Jump, Jump];
      if (cross(a, b, l.size)) out.push(`"${a.id}" crosses "${b.id}"`);
    }
  }
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const [a, b] = [all[i], all[j]] as [Jump, Jump];
      const [e, f] = [grid(a.to, l.size), grid(b.to, l.size)] as [P, P];
      if (Math.abs(e.x - f.x) + Math.abs(e.y - f.y) <= 1)
        out.push(`end squares of "${a.id}" and "${b.id}" touch`);
    }
  }
  const gain = l.ladders.reduce((n, j) => n + j.to - j.from, 0);
  const loss = l.snakes.reduce((n, j) => n + j.from - j.to, 0);
  if (Math.abs(gain - loss) > 0.1 * Math.max(gain, loss))
    out.push(`unbalanced: ladders gain ${gain}, snakes lose ${loss}`);
  return out;
}
