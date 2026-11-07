import { createScope } from '../lifecycle';
import { h, type Component, type UiContext } from './dom';

export interface SegmentedOption<T extends string | number> {
  value: T;
  /** already translated */
  label: string;
  /** 1..n dots under the label (never colour-only: the count carries the meaning) */
  pips?: number;
}

export interface SegmentedOptions<T extends string | number> {
  /** already translated; also the accessible name of the group */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange(v: T): void;
}

export interface Segmented<T extends string | number> extends Component {
  readonly value: T;
  set(v: T): void;
}

let uid = 0;

/**
 * Generic segmented choice built on native radio inputs (arrow keys and screen readers for free),
 * styled like the difficulty picker. For things like "number of CPU opponents".
 */
export function createSegmented<T extends string | number>(
  ctx: UiContext,
  o: SegmentedOptions<T>,
): Segmented<T> {
  const scope = createScope();
  const name = `ng-seg-${uid++}`;
  let value = o.value;
  const inputs = o.options.map((opt) => {
    const input = h('input', { type: 'radio', name, value: String(opt.value) });
    input.checked = opt.value === value;
    scope.on(input, 'change', () => {
      if (!input.checked || opt.value === value) return;
      value = opt.value;
      ctx.audio?.playSfx('select');
      o.onChange(opt.value);
    });
    const label = h('label', {}, [
      input,
      h('span', { class: 'ng-seg__opt' }, [
        h('span', { class: 'ng-seg__txt', text: opt.label }),
        opt.pips
          ? h('span', { class: 'ng-pips', style: `--n:${opt.pips}`, 'aria-hidden': 'true' })
          : null,
      ]),
    ]);
    return { input, label, value: opt.value };
  });
  const group = h(
    'div',
    { class: 'ng-seg', role: 'radiogroup', 'aria-label': o.label },
    inputs.map((i) => i.label),
  );
  const el = h('div', { class: 'ng-field' }, [
    h('span', { class: 'ng-label', text: o.label }),
    group,
  ]);
  return {
    el,
    get value() {
      return value;
    },
    set(v) {
      value = v;
      inputs.forEach((i) => (i.input.checked = i.value === v));
    },
    destroy: () => scope.destroy(),
  };
}
