export interface KeyActions {
  togglePause(): void;
  /** true while a modal is open: only the pause keys work */
  blocked(): boolean;
  hint(): void;
}

/** P or Escape pause (Escape inside the grid first cancels a selection and is then not seen here); H asks for a hint. */
export function handleKey(e: KeyboardEvent, a: KeyActions): void {
  if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'p' || k === 'escape') return a.togglePause();
  if (a.blocked()) return;
  if (k === 'h') a.hint();
}
