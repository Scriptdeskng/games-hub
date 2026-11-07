import { type Component, focusInitial } from './dom';

export interface ScreenHost {
  /** Replace the current screen (the previous one is destroyed). Moves focus into the new one. */
  show(id: string, c: Component): void;
  readonly screenId: string;
  destroy(): void;
}

export function createScreenHost(root: HTMLElement): ScreenHost {
  let current: Component | null = null;
  let id = '';
  return {
    show(next, c) {
      current?.destroy();
      current?.el.remove();
      current = c;
      id = next;
      c.el.dataset.screen = next;
      root.replaceChildren(c.el);
      focusInitial(c.el);
    },
    get screenId() {
      return id;
    },
    destroy() {
      current?.destroy();
      current?.el.remove();
      current = null;
      id = '';
    },
  };
}
