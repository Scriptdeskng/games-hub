import { h, type Component } from './dom';

export interface HudItem {
  id: string;
  /** translated label */
  label: string;
  value?: string;
}

export interface Hud extends Component {
  /** Update a value. Only writes the DOM when the text changed (cheap per-frame calls). */
  set(id: string, value: string | number): void;
  /** Append controls (e.g. a pause button) on the right. */
  addControl(node: Node): void;
}

export function createHud(items: HudItem[]): Hud {
  const cells = new Map<string, HTMLElement>();
  const el = h('header', { class: 'ng-hud' });
  for (const it of items) {
    const v = h('span', { class: 'ng-hud__value', text: it.value ?? '0' });
    cells.set(it.id, v);
    el.append(
      h('div', { class: 'ng-hud__item' }, [
        h('span', { class: 'ng-hud__label', text: it.label }),
        v,
      ]),
    );
  }
  el.append(h('span', { class: 'ng-hud__spacer' }));
  return {
    el,
    set(id, value) {
      const c = cells.get(id);
      const s = String(value);
      if (c && c.textContent !== s) c.textContent = s;
    },
    addControl: (n) => el.append(n),
    destroy: () => undefined,
  };
}
