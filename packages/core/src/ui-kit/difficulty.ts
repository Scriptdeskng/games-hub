import { createScope } from '../lifecycle';
import { h, type Component, type UiContext } from './dom';

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

export interface DifficultyPicker extends Component {
  readonly value: Difficulty;
  set(d: Difficulty): void;
}

let uid = 0;

/** Segmented control built on native radio inputs (free arrow-key and screen-reader support). */
export function createDifficultyPicker(
  ctx: UiContext,
  o: { value: Difficulty; onChange(d: Difficulty): void },
): DifficultyPicker {
  const scope = createScope();
  const name = `ng-diff-${uid++}`;
  let value = o.value;
  const inputs = DIFFICULTIES.map((d, i) => {
    const input = h('input', { type: 'radio', name, value: d });
    input.checked = d === value;
    scope.on(input, 'change', () => {
      if (!input.checked || d === value) return;
      value = d;
      ctx.audio?.playSfx('select');
      o.onChange(d);
    });
    const label = h('label', {}, [
      input,
      h('span', { class: 'ng-seg__opt' }, [
        h('span', { class: 'ng-seg__txt', text: ctx.t(`difficulty.${d}`) }),
        h('span', { class: 'ng-pips', style: `--n:${i + 1}`, 'aria-hidden': 'true' }),
      ]),
    ]);
    return { input, label };
  });
  const group = h(
    'div',
    { class: 'ng-seg', role: 'radiogroup', 'aria-label': ctx.t('ui.difficulty') },
    inputs.map((i) => i.label),
  );
  const el = h('div', { class: 'ng-field' }, [
    h('span', { class: 'ng-label', text: ctx.t('ui.difficulty') }),
    group,
  ]);
  return {
    el,
    get value() {
      return value;
    },
    set(d) {
      value = d;
      inputs.forEach((i) => (i.input.checked = i.input.value === d));
    },
    destroy: () => scope.destroy(),
  };
}
