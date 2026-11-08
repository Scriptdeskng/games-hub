import type { Flow } from '@naija/core/board-kit';
import type { PlayUi } from './table';

export interface KeyDeps {
  ui: PlayUi;
  flow: Flow;
  over(): boolean;
  /** is the game waiting for the human to act */
  waiting(): boolean;
  tapCard(id: number): void;
  draw(): void;
  last(): void;
}

/**
 * Keyboard map: 1-9 pick/play the nth card, arrows move, Enter/Space plays, D draw, L last card,
 * P/Esc pause. Nothing but the human's own play is reachable (never a CPU card).
 */
export function createKeyMap(d: KeyDeps): Record<string, (e: KeyboardEvent) => void> {
  const { ui, flow } = d;
  const live =
    (fn: (e: KeyboardEvent) => void) =>
    (e: KeyboardEvent): void => {
      if (!flow.modalOpen && !d.over() && !ui.pickerOpen) fn(e);
    };
  const step = (dir: number) =>
    live((e) => {
      if (!d.waiting()) return;
      e.preventDefault();
      const ids = ui.hand.ids;
      const at = ids.indexOf(ui.hand.selected ?? -1);
      const to = ids[(at + dir + ids.length) % ids.length];
      if (to !== undefined) {
        ui.hand.select(to);
        (ui.hand.cardEl(to) as HTMLElement | undefined)?.focus({ preventScroll: true });
      }
    });
  const primary = live((e) => {
    if ((e.target as HTMLElement | null)?.closest?.('button')) return; // native click handles it
    const sel = ui.hand.selected;
    if (!d.waiting() || sel === null) return;
    e.preventDefault();
    d.tapCard(sel);
  });
  const keys: Record<string, (e: KeyboardEvent) => void> = {
    ArrowRight: step(1),
    ArrowDown: step(1),
    ArrowLeft: step(-1),
    ArrowUp: step(-1),
    Enter: primary,
    ' ': primary,
    d: live(() => d.draw()),
    l: live(() => d.last()),
    p: () => !ui.pickerOpen && flow.toggle(),
    Escape: () => !ui.pickerOpen && flow.toggle(),
  };
  for (let n = 1; n <= 9; n++) {
    keys[String(n)] = live(() => {
      const id = ui.hand.ids[n - 1];
      if (id !== undefined) d.tapCard(id);
    });
  }
  return keys;
}
