import { icon, type IconName } from './icons';
import type { Scope } from '../lifecycle';
import type { Settings } from '../settings';
import type { I18n, TFn } from '../i18n';
import type { AudioEngine } from '../audio/engine';

/** What every ui-kit component needs. `Core` (from boot) satisfies this. */
export interface UiContext {
  t: TFn;
  audio?: Pick<AudioEngine, 'playSfx'>;
  settings?: Settings;
  i18n?: I18n;
}

export interface Component {
  el: HTMLElement;
  destroy(): void;
}

type Attrs = Record<string, string | number | boolean | null | undefined>;

/** Minimal element builder (no framework). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string | null | undefined)[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'text') el.textContent = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined) el.append(c);
  return el;
}

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'icon';

export interface ButtonOptions {
  /** plain text (already translated) */
  label: string;
  variant?: ButtonVariant;
  /** large, full-width (menus, modals) */
  block?: boolean;
  onClick(ev: MouseEvent): void;
  /** accessible name when the visible label is an icon */
  ariaLabel?: string;
  /** sfx event played on click (default 'tap'; null for none) */
  sfx?: string | null;
  id?: string;
  /** show this icon instead of text (set ariaLabel too) */
  icon?: IconName;
}

/** Button with >= 44 px tap target (CSS), sfx, and a scope-tracked listener. */
export function button(ctx: UiContext, scope: Scope, o: ButtonOptions): HTMLButtonElement {
  const b = h('button', {
    type: 'button',
    class: `ng-btn ng-btn--${o.variant ?? 'primary'}${o.block ? ' ng-btn--lg ng-btn--block' : ''}`,
    'aria-label': o.ariaLabel,
    id: o.id,
    text: o.icon ? null : o.label,
  });
  if (o.icon) b.append(icon(o.icon));
  scope.on(b, 'click', (ev: MouseEvent) => {
    if (o.sfx !== null) ctx.audio?.playSfx(o.sfx ?? 'tap');
    o.onClick(ev);
  });
  return b;
}

const FOCUSABLE =
  'button:not([disabled]),[href],input:not([disabled]),select,[tabindex]:not([tabindex="-1"])';

export const focusables = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));

/** Focus `[data-autofocus]`, else the first focusable, else the element itself. */
export function focusInitial(el: HTMLElement): void {
  const target = el.querySelector<HTMLElement>('[data-autofocus]') ?? focusables(el)[0] ?? el;
  if (target === el && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

/** Arrow-key navigation among a list of buttons (menus, radio groups). */
export function arrowNav(
  scope: Scope,
  container: HTMLElement,
  selector: string,
  horizontal = false,
): void {
  scope.on(container, 'keydown', (e: KeyboardEvent) => {
    const prev = horizontal ? 'ArrowLeft' : 'ArrowUp';
    const next = horizontal ? 'ArrowRight' : 'ArrowDown';
    if (e.key !== prev && e.key !== next) return;
    const items = Array.from(container.querySelectorAll<HTMLElement>(selector));
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    items[(i + (e.key === next ? 1 : items.length - 1)) % items.length]?.focus();
  });
}
