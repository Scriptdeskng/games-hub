import { createScope } from '../lifecycle';
import { button, h, type Component, type UiContext } from './dom';

export interface HowToPlayOptions {
  /** translated steps, shown as a numbered list */
  steps: string[];
  title?: string;
  /** optional illustration above the steps */
  art?: Node;
  onClose(): void;
}

export function createHowToPlay(ctx: UiContext, o: HowToPlayOptions): Component {
  const scope = createScope();
  const close = button(ctx, scope, {
    label: ctx.t('ui.gotIt'),
    block: true,
    onClick: o.onClose,
    sfx: 'back',
  });
  close.setAttribute('data-autofocus', '');
  scope.on(window, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') o.onClose();
  });
  const el = h('section', { class: 'ng-screen ng-howto', 'aria-labelledby': 'ng-howto-title' }, [
    h('h2', {
      class: 'ng-h ng-h--sm',
      id: 'ng-howto-title',
      text: o.title ?? ctx.t('ui.howToPlay'),
    }),
    o.art ?? null,
    h(
      'ol',
      { class: 'ng-howto__steps' },
      o.steps.map((s) => h('li', { class: 'ng-howto__step', text: s })),
    ),
    close,
  ]);
  return { el, destroy: () => scope.destroy() };
}
