import '../ui-kit/ui-kit.css';
import '../styles/tokens.css';
import '../styles/skin.css';
import { createScope, type Scope } from '../lifecycle';
import type { TFn } from '../i18n';

export interface LoadTask {
  /** share of the bar this task fills (default 1) */
  weight?: number;
  run(): Promise<unknown>;
}

export interface LoaderOptions {
  root: HTMLElement;
  t: TFn;
  tasks: LoadTask[];
  /** optional logo node shown above the bar */
  logo?: Node;
  /** shortest time the loader stays up, to avoid a flash (ms, default 0) */
  minMs?: number;
  /** register timers and cleanup in this scope (pass `core.scope` so `core.destroy()` removes everything) */
  scope?: Scope;
}

export interface Loader {
  /** resolves when every task finished (failed tasks are skipped, never block the game) */
  done: Promise<void>;
  /** 0..1 */
  readonly progress: number;
  destroy(): void;
}

/** Preload an image and resolve when decoded (or failed). */
export const imageTask = (url: string, weight = 1): LoadTask => ({
  weight,
  run: () =>
    new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = img.onerror = () => resolve();
      img.src = url;
    }),
});

export function runLoader(o: LoaderOptions): Loader {
  const scope = o.scope ?? createScope();
  const fill = document.createElement('div');
  fill.className = 'ng-progress__fill';
  const bar = document.createElement('div');
  bar.className = 'ng-progress';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-valuenow', '0');
  bar.append(fill);
  const label = document.createElement('p');
  label.className = 'ng-loader__label';
  label.textContent = o.t('ui.loading');
  const el = document.createElement('div');
  el.className = 'ng-loader';
  el.setAttribute('role', 'status');
  if (o.logo) el.append(o.logo);
  el.append(bar, label);
  o.root.append(el);
  scope.add(() => el.remove());

  const total = o.tasks.reduce((s, t) => s + (t.weight ?? 1), 0) || 1;
  let doneW = 0;
  let progress = 0;
  const set = (p: number): void => {
    progress = Math.min(1, p);
    fill.style.setProperty('--ng-p', progress.toFixed(3));
    bar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  };
  const started = performance.now();

  const done = (async (): Promise<void> => {
    for (const task of o.tasks) {
      try {
        await task.run();
      } catch {
        /* a missing optional asset must not block the game */
      }
      doneW += task.weight ?? 1;
      set(doneW / total);
    }
    set(1);
    const wait = Math.max(0, (o.minMs ?? 0) - (performance.now() - started));
    if (wait) await new Promise<void>((r) => scope.timeout(r, wait));
    el.classList.add('is-done');
    scope.timeout(() => el.remove(), 400);
  })();

  return {
    done,
    get progress() {
      return progress;
    },
    destroy() {
      // with a shared scope only our own element goes; the owner destroys the rest
      if (o.scope) el.remove();
      else scope.destroy();
    },
  };
}
