import type { Scope } from '../lifecycle';
import type { Rng } from '../rng';
import type { TFn } from '../i18n';
import { h } from '../ui-kit/dom';
import type { BanterEvent, Persona } from './types';

export interface BanterLine {
  persona: Persona;
  text: string;
  event: BanterEvent;
}

export interface BanterOptions {
  t: TFn;
  rng: Rng;
  /** show a bubble */
  show(line: BanterLine): void;
  /** minimum ms between two bubbles (default 2600) */
  cooldownMs?: number;
  /** per-event chance 0..1 (default 1 for start/win/lose, 0.45 otherwise) */
  chance?: Partial<Record<BanterEvent, number>>;
  /** no more than this many bubbles in a game (default 40) */
  max?: number;
  now?: () => number;
}

export interface Banter {
  /** Let `persona` react to `event`. Returns true if a bubble was shown. */
  say(persona: Persona, event: BanterEvent, o?: { force?: boolean }): boolean;
  readonly count: number;
}

const ALWAYS: readonly BanterEvent[] = ['start', 'win', 'lose'];

/** Banter trigger: seeded line choice, cooldown, probability and a per-game cap (never spammy). */
export function createBanter(o: BanterOptions): Banter {
  const cooldown = o.cooldownMs ?? 2600;
  const max = o.max ?? 40;
  const now = o.now ?? ((): number => performance.now());
  let last = -Infinity;
  let count = 0;
  return {
    say(persona, event, opts = {}) {
      const keys = persona.banter[event];
      if (!keys?.length || count >= max) return false;
      const t = now();
      if (!opts.force) {
        if (t - last < cooldown) return false;
        const p = o.chance?.[event] ?? (ALWAYS.includes(event) ? 1 : 0.45);
        if (!o.rng.chance(p)) return false;
      }
      last = t;
      count++;
      o.show({ persona, event, text: o.t(o.rng.pick(keys)) });
      return true;
    },
    get count() {
      return count;
    },
  };
}

export interface BubbleView {
  el: HTMLElement;
  show(line: BanterLine): void;
  clear(): void;
}

/**
 * Speech bubble (avatar + text, `.ng-banter`). One at a time; fades after `ms`. Transform and
 * opacity only. The container is a polite live region so screen readers hear the banter.
 */
export function createBubbleView(
  scope: Scope,
  o: { name(p: Persona): string; ms?: number } = { name: (p) => p.id },
): BubbleView {
  const el = h('div', { class: 'ng-bubble', role: 'status', 'aria-live': 'polite' });
  let off: () => void = () => undefined;
  const clear = (): void => {
    off();
    el.replaceChildren();
  };
  scope.add(clear);
  return {
    el,
    clear,
    show(line) {
      off();
      const bubble = h('div', { class: 'ng-banter' }, [
        h('img', {
          class: 'ng-banter__avatar',
          src: line.persona.avatar,
          alt: '',
          width: 32,
          height: 32,
        }),
        h('span', { class: 'ng-banter__text' }, [
          h('b', { text: `${o.name(line.persona)}: ` }),
          line.text,
        ]),
      ]);
      el.replaceChildren(bubble);
      const ms = o.ms ?? 2600;
      const offFade = scope.timeout(() => bubble.classList.add('is-out'), ms);
      const offGone = scope.timeout(() => bubble.remove(), ms + 220);
      off = () => {
        offFade();
        offGone();
      };
    },
  };
}
