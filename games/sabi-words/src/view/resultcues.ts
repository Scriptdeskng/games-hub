import type { Core } from '@naija/core/boot';
import { createScope, type Scope } from '@naija/core/lifecycle';

/**
 * The little count-up on the results screen (asset brief section 7): a score tick, one `star` cue
 * per star as it lands (pitch 1, 1.25, 1.5) and `coinEarn` when coins were paid. Every timer lives
 * in a scope that `stop()` empties, so leaving the screen cancels what has not played yet.
 */
export interface ResultCues {
  play(o: { stars: number; coins: number }): void;
  stop(): void;
}

export function createResultCues(core: Core): ResultCues {
  let scope: Scope = createScope();
  const stop = (): void => {
    scope.destroy();
    scope = createScope();
  };
  return {
    stop,
    play({ stars, coins }) {
      stop();
      let at = 350;
      scope.timeout(() => core.audio.playSfx('scoreTick'), at);
      for (let k = 1; k <= stars; k++) {
        at += 260;
        scope.timeout(() => core.audio.playSfx('star', { pitch: 1 + 0.25 * (k - 1) }), at);
      }
      if (coins > 0) scope.timeout(() => core.audio.playSfx('coinEarn'), at + 300);
    },
  };
}
