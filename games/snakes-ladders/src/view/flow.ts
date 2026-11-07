import { createThinker } from '@naija/core/ai-kit';
import type { Core } from '@naija/core/boot';
import type { Scope } from '@naija/core/lifecycle';
import { createPause, type Modal } from '@naija/core/ui-kit';

export interface FlowOptions {
  core: Core;
  scope: Scope;
  /** animation and pause speed factor (1 = normal) */
  tempo: number;
  isOver(): boolean;
  onRestart(): void;
  onQuit(): void;
}

/**
 * Pacing and pause for one game's async turn flow. Everything the flow waits on goes through
 * here, so pausing freezes the game at the next gate and `kill()` stops it for good.
 */
export interface Flow {
  /** Wait `ms` (scaled by tempo), or not at all while fast-forwarding; then pass the gate. */
  sleep(ms: number): Promise<void>;
  /** Hold here while paused. Never returns after `kill()`. */
  gate(): Promise<void>;
  /** Await `p`; never continues if the game was destroyed meanwhile (no late sound or event). */
  alive<T>(p: Promise<T>): Promise<T>;
  pause(): void;
  toggle(): void;
  setFast(on: boolean): void;
  readonly modalOpen: boolean;
  readonly dead: boolean;
  kill(): void;
}

export function createFlow(o: FlowOptions): Flow {
  let dead = false;
  let paused = false;
  let fast = false;
  let modal: Modal | null = null;
  let waiters: (() => void)[] = [];
  // after kill() the flow simply stops: awaiting this never settles
  const never = new Promise<never>(() => undefined);
  const thinker = createThinker(o.scope, () => fast);

  const gate = async (): Promise<void> => {
    while (paused && !dead) await new Promise<void>((r) => waiters.push(r));
    if (dead) await never;
  };
  function resume(): void {
    modal = null;
    paused = false;
    const w = waiters;
    waiters = [];
    w.forEach((r) => r());
  }
  function pause(): void {
    if (o.isOver() || modal || dead) return;
    paused = true;
    modal = createPause(o.core, {
      mount: o.core.root,
      onResume: resume,
      onRestart: o.onRestart,
      onQuit: o.onQuit,
    });
  }
  o.scope.on(document, 'visibilitychange', () => {
    if (document.hidden) pause();
  });

  return {
    gate,
    pause,
    async sleep(ms) {
      if (ms > 0) await new Promise<void>((r) => thinker.after(Math.max(1, ms * o.tempo), r));
      await gate();
    },
    async alive(p) {
      const v = await p;
      if (dead) await never;
      return v;
    },
    toggle() {
      if (modal) {
        modal.close();
        resume();
      } else pause();
    },
    setFast: (on) => void (fast = on),
    get modalOpen() {
      return modal !== null;
    },
    get dead() {
      return dead;
    },
    kill() {
      dead = true;
      modal?.close();
      waiters.forEach((r) => r());
    },
  };
}
