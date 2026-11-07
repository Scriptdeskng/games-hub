import { createScope } from '../lifecycle';
import { h } from './dom';
import { icon } from './icons';

export interface Toast {
  dismiss(): void;
}

export interface ToastOptions {
  ms?: number;
  kind?: 'good' | 'bad';
  /** screen-reader prefix (translated), e.g. "Success" / "Warning"; the icon shape (tick vs triangle) is the visual cue */
  label?: string;
}

/** Short non-blocking message (role=status). Auto-dismisses and removes its own timer. */
export function toast(mount: HTMLElement, message: string, o: ToastOptions = {}): Toast {
  const scope = createScope();
  let host = mount.querySelector<HTMLElement>(':scope > .ng-toast-host');
  if (!host) {
    host = h('div', { class: 'ng-toast-host' });
    mount.append(host);
  }
  const el = h('div', {
    class: `ng-toast${o.kind ? ` ng-toast--${o.kind}` : ''}`,
    role: 'status',
    'aria-live': 'polite',
  });
  if (o.kind) {
    const ic = icon(o.kind === 'good' ? 'check' : 'alert');
    ic.setAttribute('class', 'ng-toast__icon');
    el.append(ic);
  }
  if (o.label) el.append(h('span', { class: 'ng-sr', text: `${o.label}: ` }));
  el.append(message);
  host.append(el);
  const dismiss = (): void => {
    scope.destroy();
    el.remove();
    if (host && !host.childElementCount) host.remove();
  };
  scope.timeout(dismiss, o.ms ?? 2200);
  return { dismiss };
}
