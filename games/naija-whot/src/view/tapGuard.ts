/**
 * Makes the human's taps idempotent. A double tap on a card is "select" then "play"; anything that
 * lands after that (a third tap, a click on whatever slid under the finger, a second tap while the
 * Whot shape picker is open) must never become a second action or a market draw.
 */
export interface TapGuard {
  /** a card tap was accepted now */
  cardTapped(): void;
  /** may a market tap draw right now (not right after a card tap)? */
  drawAllowed(): boolean;
  /** run `fn` unless one is already in flight; resolves when it ends */
  once(fn: () => Promise<void>): Promise<void>;
  readonly busy: boolean;
}

/** a market tap this soon after a card tap is a stray second tap of a double tap, not a decision */
export const DRAW_AFTER_CARD_MS = 450;

export function createTapGuard(now: () => number = () => performance.now()): TapGuard {
  let lastCard = -Infinity;
  let busy = false;
  return {
    cardTapped: () => {
      lastCard = now();
    },
    drawAllowed: () => now() - lastCard >= DRAW_AFTER_CARD_MS,
    async once(fn) {
      if (busy) return;
      busy = true;
      try {
        await fn();
      } finally {
        busy = false;
      }
    },
    get busy() {
      return busy;
    },
  };
}
