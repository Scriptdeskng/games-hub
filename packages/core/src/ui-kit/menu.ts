import { createScope } from '../lifecycle';
import { arrowNav, button, h, type ButtonVariant, type Component, type UiContext } from './dom';

export interface MenuItem {
  id: string;
  /** already translated */
  label: string;
  variant?: ButtonVariant;
  onSelect(): void;
}

export interface MenuOptions {
  title: string;
  tagline?: string;
  items: MenuItem[];
  /** logo or art shown above the title (optional) */
  art?: Node;
  /** extra content between the title and the buttons (e.g. difficulty picker) */
  extra?: Node[];
  /** footer content (e.g. settings bar) */
  footer?: Node[];
}

export function createMenu(ctx: UiContext, o: MenuOptions): Component {
  const scope = createScope();
  const list = h('ul', { class: 'ng-menu__list' });
  o.items.forEach((it, i) => {
    const b = button(ctx, scope, {
      label: it.label,
      variant: it.variant ?? (i === 0 ? 'primary' : 'secondary'),
      block: true,
      onClick: it.onSelect,
      sfx: 'select',
      id: `menu-${it.id}`,
    });
    if (i === 0) b.setAttribute('data-autofocus', '');
    list.append(h('li', {}, [b]));
  });
  arrowNav(scope, list, 'button');
  const el = h('main', { class: 'ng-screen ng-menu' }, [
    o.art ?? null,
    h('h1', { class: 'ng-h ng-h--display', text: o.title }),
    o.tagline ? h('p', { class: 'ng-menu__tag', text: o.tagline }) : null,
    ...(o.extra ?? []),
    list,
    o.footer ? h('div', { class: 'ng-menu__footer' }, o.footer) : null,
  ]);
  return { el, destroy: () => scope.destroy() };
}
