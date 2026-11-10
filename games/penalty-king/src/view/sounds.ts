import type { Core } from '@naija/core/boot';
import type { Scope } from '@naija/core/lifecycle';
import type { KickOutcome } from '../physics';

/**
 * Every cue of `penaltySfx` is played here by name (asset brief section 7). Nothing is silent.
 * Contracts from the brief: aimTick at most 8 per second; powerTick climbs 4 percent a tick up to +40 percent;
 * crowdGoal follows netIn after about 150 ms; crowdGroan follows a miss, a post or a CPU goal.
 */
export interface Sounds {
  roundStart(): void;
  runup(): void;
  strike(): void;
  dive(): void;
  aimTick(clockSeconds: number): void;
  aimLock(): void;
  powerTick(n: number): void;
  result(outcome: KickOutcome, humanKicked: boolean): void;
  sudden(): void;
  bracketAdvance(): void;
  shootoutWin(): void;
  shootoutLose(): void;
}

export function createSounds(core: Core, scope: Scope): Sounds {
  const a = core.audio;
  let lastAim = -1;
  const later = (fn: () => void, ms: number): void => void scope.timeout(fn, ms);
  return {
    roundStart: () => a.playSfx('roundStart'),
    runup: () => a.playSfx('whistleSub'),
    strike: () => a.playSfx('shotStrike'),
    dive: () => a.playSfx('dive'),
    aimTick(now) {
      if (now - lastAim < 0.125) return;
      lastAim = now;
      a.playSfx('aimTick', { key: 'aim' });
    },
    aimLock: () => a.playSfx('aimLock'),
    powerTick: (n) => a.playSfx('powerTick', { pitch: 1 + Math.min(0.4, 0.04 * n), key: 'power' }),
    result(outcome, human) {
      if (outcome === 'goal') {
        a.playSfx('netIn');
        later(() => a.playSfx(human ? 'crowdGoal' : 'crowdGroan'), 150);
      } else if (outcome === 'saved') {
        a.playSfx('saveStop');
        if (!human) later(() => a.playSfx('crowdGoal'), 150);
        else later(() => a.playSfx('crowdGroan'), 200);
      } else if (outcome === 'post') {
        a.playSfx('postHit');
        if (human) later(() => a.playSfx('crowdGroan'), 250);
      } else if (human) a.playSfx('crowdGroan');
    },
    sudden: () => a.playSfx('suddenDeath'),
    bracketAdvance: () => a.playSfx('bracketAdvance'),
    shootoutWin: () => a.playSfx('shootoutWin'),
    shootoutLose: () => a.playSfx('shootoutLose'),
  };
}
