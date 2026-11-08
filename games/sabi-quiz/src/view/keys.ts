import type { LifelineId } from '../rules';

export interface KeyActions {
  /** pause or resume (P, Escape) */
  togglePause(): void;
  /** true while a modal is open: only pause keys work */
  blocked(): boolean;
  pick(i: number): void;
  lifeline(id: LifelineId): void;
  /** L: the next lifeline that can still be used */
  nextLifeline(): void;
}

/** Map a key press to a quiz action: A-D or 1-4 answer, F/S/H lifelines, L next lifeline, P/Esc pause. */
export function handleKey(e: KeyboardEvent, a: KeyActions): void {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'p' || k === 'escape') return a.togglePause();
  if (a.blocked() || k.length !== 1) return;
  const at = 'abcd'.indexOf(k) >= 0 ? 'abcd'.indexOf(k) : '1234'.indexOf(k);
  if (at >= 0) return a.pick(at);
  const ll: Record<string, LifelineId> = { f: 'fifty', s: 'skip', h: 'padi' };
  if (ll[k]) return a.lifeline(ll[k] as LifelineId);
  if (k === 'l') a.nextLifeline();
}
