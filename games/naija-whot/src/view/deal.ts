import type { Core } from '@naija/core/boot';
import type { Scope } from '@naija/core/lifecycle';

/** The opening deal: each card of the fan flies in one after another (transform/opacity only). */
export function dealIn(o: { core: Core; scope: Scope; fan: HTMLElement; tempo: number }): void {
  const { core, scope, tempo } = o;
  o.fan.querySelectorAll('.whot-card').forEach((c, i) => {
    const el = c as HTMLElement;
    el.style.animationDelay = `${Math.round(i * 60 * tempo)}ms`;
    el.style.animationDuration = `${Math.round(320 * tempo) || 1}ms`;
    el.classList.add('is-draw');
    core.audio.playSfx('deal', { pitch: 1 + i * 0.02 });
    scope.timeout(
      () => {
        el.classList.remove('is-draw');
        el.style.animationDelay = '';
      },
      Math.round((i * 60 + 340) * tempo),
    );
  });
}
