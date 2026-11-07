import { createScope } from '../lifecycle';
import { button, focusables, h, type ButtonVariant, type Component, type UiContext } from './dom';

export interface ModalAction {
  label: string;
  variant?: ButtonVariant;
  onClick(): void;
  /** keep the modal open after click (default: closes) */
  keepOpen?: boolean;
}

export interface ModalOptions {
  title: string;
  body?: string | Node;
  actions: ModalAction[];
  /** where to mount (default document.body) */
  mount?: HTMLElement;
  className?: string;
  /** Esc / backdrop tap closes the modal and calls this (omit to make it non-dismissible) */
  onDismiss?(): void;
}

let uid = 0;

export interface Modal extends Component {
  close(): void;
}

/** Accessible modal dialog: role=dialog, focus trap, Esc, focus restore. */
export function createModal(ctx: UiContext, o: ModalOptions): Modal {
  const scope = createScope();
  const prev = document.activeElement as HTMLElement | null;
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    scope.destroy();
    el.remove();
    prev?.focus?.({ preventScroll: true });
  };
  const bar = h('div', { class: 'ng-modal__actions' });
  o.actions.forEach((a, i) => {
    const b = button(ctx, scope, {
      label: a.label,
      variant: a.variant ?? (i === 0 ? 'primary' : 'secondary'),
      block: true,
      onClick: () => {
        if (!a.keepOpen) close();
        a.onClick();
      },
    });
    if (i === 0) b.setAttribute('data-autofocus', '');
    bar.append(b);
  });
  const titleId = `ng-modal-${uid++}`;
  const dialog = h(
    'div',
    {
      class: 'ng-modal__panel',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
      tabindex: -1,
    },
    [
      h('h2', { class: 'ng-modal__title', id: titleId, text: o.title }),
      o.body
        ? typeof o.body === 'string'
          ? h('p', { class: 'ng-modal__body', text: o.body })
          : o.body
        : null,
      bar,
    ],
  );
  const el = h('div', { class: `ng-modal ${o.className ?? ''}` }, [dialog]);
  // Next frame: the transition runs, and focus works (hidden elements cannot take focus).
  scope.raf(() => {
    el.classList.add('is-open');
    (el.querySelector<HTMLElement>('[data-autofocus]') ?? dialog).focus({ preventScroll: true });
  });
  const dismiss = (): void => {
    if (!o.onDismiss) return;
    close();
    o.onDismiss();
  };
  scope.on(el, 'pointerdown', (e: PointerEvent) => {
    if (e.target === el) dismiss();
  });
  scope.on(el, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      dismiss();
    } else if (e.key === 'Tab') {
      const f = focusables(dialog);
      if (!f.length) return;
      const first = f[0] as HTMLElement;
      const last = f[f.length - 1] as HTMLElement;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  (o.mount ?? document.body).append(el);
  return { el, close, destroy: close };
}

export interface PauseOptions {
  mount?: HTMLElement;
  onResume(): void;
  onRestart(): void;
  onQuit(): void;
}

export function createPause(ctx: UiContext, o: PauseOptions): Modal {
  return createModal(ctx, {
    title: ctx.t('ui.paused'),
    mount: o.mount,
    className: 'ng-modal--pause',
    onDismiss: o.onResume,
    actions: [
      { label: ctx.t('ui.resume'), onClick: o.onResume },
      { label: ctx.t('ui.restart'), variant: 'secondary', onClick: o.onRestart },
      { label: ctx.t('ui.quit'), variant: 'ghost', onClick: o.onQuit },
    ],
  });
}
