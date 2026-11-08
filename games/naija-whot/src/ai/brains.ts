import { PROFILES, withMistakes, type Brain } from '@naija/core/ai-kit';
import type { Rng } from '@naija/core/rng';
import type { Difficulty } from '@naija/core/ui-kit';
import { SHAPES, cardOf, type ShapeName } from '../rules/cards';
import {
  isExposed,
  legalActions,
  matchesTop,
  requiredCall,
  type Action,
  type CallLevel,
  type PlayContext,
} from '../rules/legal';
import type { PublicView } from '../rules/view';
import { cover, knowledge, pCanAnswer, type Knowledge } from './knowledge';
import type { Style } from './personas';
import { TRAITS, easyWeight, lastPlayedShape, weightedPick } from './styles';

/** Every decision is a function of the PUBLIC view plus the CPU's own rng. */
export type CpuBrain = Brain<PublicView, Action>;

/** How reliably a CPU of each difficulty announces "Last card" and catches others who forgot. */
export const CALL_RATES: Record<Difficulty, { announce: number; catch: number }> = {
  easy: { announce: 0.5, catch: 0.2 },
  medium: { announce: 0.9, catch: 0.65 },
  hard: { announce: 1, catch: 0.95 },
};
const STYLE_BIAS: Record<Style, { announce: number; catch: number }> = {
  balanced: { announce: 0, catch: 0 },
  cautious: { announce: 0.05, catch: -0.05 },
  aggressive: { announce: -0.05, catch: 0.05 },
  hoarder: { announce: 0, catch: 0.03 },
};
const clamp = (n: number): number => Math.max(0, Math.min(1, n));
const rate = (d: Difficulty, s: Style, k: 'announce' | 'catch'): number =>
  clamp(CALL_RATES[d][k] + (d === 'hard' ? 0 : STYLE_BIAS[s][k]));

const exposedOthers = (v: PublicView): number[] =>
  v.sizes
    .map((_, i) => i)
    .filter(
      (i) => i !== v.seat && isExposed(v.rules, v.sizes[i] as number, v.calls[i] as CallLevel),
    );

const catchChoice = (v: PublicView, rng: Rng, p: number): Action | null => {
  const t = exposedOthers(v)[0];
  return t !== undefined && rng.chance(p) ? { type: 'catch', target: t } : null;
};

/** After this play the hand owes a call: say it with probability `p`. */
function withCall(v: PublicView, a: Action, rng: Rng, p: number): Action {
  if (a.type !== 'play') return a;
  const left = v.hand.length - 1;
  if (requiredCall(v.rules, left) === 'none') return a;
  return rng.chance(p) ? { ...a, announce: true } : a;
}

const plays = (v: PublicView): Action[] => legalActions(v, v.hand);
const asPlay = (a: Action): Extract<Action, { type: 'play' }> | null =>
  a.type === 'play' ? a : null;

/** The shape I hold most of after playing `rest` (ties: first in SHAPES order). */
function bestShape(rest: readonly number[], fallback: ShapeName = 'circle'): ShapeName {
  let best = fallback;
  let n = -1;
  for (const s of SHAPES) {
    const c = rest.filter((id) => cardOf(id).shape === s).length;
    if (c > n) {
      n = c;
      best = s;
    }
  }
  return best;
}

/**
 * Easy: any legal move, picked at random but tilted by the persona style (Mama Nkechi rarely leads
 * with a 2, 5 or 14, Tari likes them, Aisha rarely plays a Whot). Forgets to call Last card.
 */
export const easyBrain = (style: Style = 'balanced'): CpuBrain => ({
  decide(v, rng) {
    const c = catchChoice(v, rng, rate('easy', style, 'catch'));
    if (c) return c;
    const acts = plays(v);
    const pick = weightedPick(
      acts,
      acts.map((a) => easyWeight(v, a, style)),
      rng,
    );
    return withCall(v, pick, rng, rate('easy', style, 'announce'));
  },
});

const followUps = (v: PublicView, id: number, call: ShapeName | undefined): number => {
  const ctx: PlayContext = {
    rules: v.rules,
    discard: [...v.discard, id],
    called: call ?? null,
    pending: null,
  };
  return v.hand.filter((x) => x !== id && matchesTop(ctx, x)).length;
};

/**
 * Medium: sensible rules of thumb. Free turns first (14, 1), 8 and the picks as attacks (more
 * when the next player is nearly out), ordinary cards that leave a follow-up, Whot only when
 * nothing else fits, and the shape it holds most.
 */
function sensible(v: PublicView, rng: Rng, style: Style): Action {
  const tr = TRAITS[style];
  const acts = plays(v);
  const cards = acts.map(asPlay).filter((a): a is NonNullable<typeof a> => a !== null);
  if (cards.length === 0) return { type: 'draw' };
  const next = (v.seat + 1) % v.seats;
  const nextLow = (v.sizes[next] as number) <= 2;
  const pick = (a: (typeof cards)[number]): number => {
    const c = cardOf(a.card);
    if (c.shape === 'whot') return -50 + (v.pending ? 40 : 0);
    const fu = followUps(v, a.card, undefined);
    if (v.pending) return 50;
    const lead = v.hand.length > tr.leadAbove ? tr.lead : 0;
    if (c.n === 14) return (v.seats > 2 ? 20 : 90) + (fu ? 5 : -30) + lead;
    if (c.n === 1) return 80 + (fu ? 5 : -40);
    if (c.n === 8) return (nextLow ? 85 : 60) + (fu ? 3 : 0) + (tr.eight > 1 ? lead : 0);
    if (c.n === 2 || c.n === 5) return (nextLow ? 88 : 45) + lead;
    return fu * 10 + c.n / 4;
  };
  let best = cards[0] as (typeof cards)[number];
  let bs = -Infinity;
  for (const a of cards) {
    const s = pick(a) + rng.next() * 0.01;
    if (s > bs) {
      bs = s;
      best = a;
    }
  }
  if (cardOf(best.card).shape === 'whot') {
    const rest = v.hand.filter((x) => x !== best.card);
    const shape = tr.callLast ? lastPlayedShape(v) : null;
    return { type: 'play', card: best.card, call: shape ?? bestShape(rest) };
  }
  if (v.pending && acts.some((a) => a.type === 'draw') && bs < 0) return { type: 'draw' };
  return { type: 'play', card: best.card };
}

/**
 * Medium's 20% slip: a random legal move, but a Whot is held back (like Hard does) while the hand
 * is bigger than the style's `whotFree` and no penalty is pending, with probability 1 - TRAITS.whot
 * (Aisha almost always, Mama Nkechi often, the others never).
 */
function slip(v: PublicView, rng: Rng, style: Style): Action {
  const all = plays(v);
  const tr = TRAITS[style];
  if (v.pending || v.hand.length <= tr.whotFree) return rng.pick(all);
  const rest = all.filter((a) => a.type !== 'play' || cardOf(a.card).shape !== 'whot');
  if (rest.length > 0 && rest.length < all.length && rng.chance(1 - tr.whot)) return rng.pick(rest);
  return rng.pick(all);
}

export const mediumBrain = (style: Style = 'balanced'): CpuBrain => ({
  decide(v, rng) {
    const c = catchChoice(v, rng, rate('medium', style, 'catch'));
    if (c) return c;
    const a = withMistakes(
      rng,
      PROFILES.medium.mistakeRate,
      () => sensible(v, rng, style),
      () => slip(v, rng, style),
    );
    return withCall(v, a, rng, rate('medium', style, 'announce'));
  },
});

// ---- Hard ----

interface Weights {
  attack: number;
  tempo: number;
  risk: number;
  /** score taken off a Whot played while the hand still has more than `TRAITS.whotFree` cards */
  hold: number;
  denyShape: number;
  /** score added to leading with a 2, 5, 14 (and 8 for the aggressive style) */
  lead: number;
  /** score added to naming the shape the other player just played */
  callLast: number;
}
const WEIGHTS: Record<Style, Weights> = {
  balanced: { attack: 1, tempo: 1, risk: 1, hold: 3, denyShape: 2.5, lead: 0, callLast: 0 },
  cautious: {
    attack: 0.75,
    tempo: 1,
    risk: 1.35,
    hold: 5,
    denyShape: 2.5,
    lead: -1,
    callLast: 0,
  },
  aggressive: {
    attack: 1.3,
    tempo: 1.1,
    risk: 0.9,
    hold: 3,
    denyShape: 2.5,
    lead: 0.6,
    callLast: 0.5,
  },
  // never plays a Whot while another card fits, until three cards or fewer are left
  hoarder: { attack: 1, tempo: 1, risk: 1, hold: 1000, denyShape: 3.2, lead: 0, callLast: 0 },
};

function pDefend(v: PublicView, k: Knowledge, seat: number, kind: 'two' | 'three'): number {
  const m =
    kind === 'two'
      ? v.rules.stackTwo
        ? (k.byNumber[2] ?? 0)
        : 0
      : v.rules.defendFive
        ? (k.byNumber[5] ?? 0)
        : 0;
  const w = v.rules.whotOnPending ? k.byShape.whot : 0;
  const u = k.unseen.length;
  const h = v.sizes[seat] as number;
  const none = (1 - Math.min(1, (m + w) / Math.max(1, u))) ** h;
  return 1 - none;
}

/** Tuned by simulation (Hard vs Easy over thousands of seeded games): see ai.test.ts. */
const T = {
  answer: 1.7,
  risk: 3,
  hi: 0.1,
  again: 2.2,
  noFu: -2.2,
  mine: 1.1,
  deny: 0.5,
  att: 1.5,
};
function scorePlay(
  v: PublicView,
  k: Knowledge,
  a: Extract<Action, { type: 'play' }>,
  w: Weights,
  style: Style,
): number {
  const c = cardOf(a.card);
  const tr = TRAITS[style];
  const rest = v.hand.filter((x) => x !== a.card);
  if (rest.length === 0) return 1000;
  const seats = v.seats;
  const next = (v.seat + 1) % seats;
  const nextSize = v.sizes[next] as number;
  const low = nextSize <= 2 ? 1.5 : 1;
  const fu = followUps(v, a.card, a.call);
  let s = 1;
  let again = false;
  if (c.shape === 'whot') {
    // held back while the hand is big (never while a penalty is pending: that is a defence)
    if (!v.pending && v.hand.length > tr.whotFree) s -= w.hold;
    if (v.pending) s += v.pending.count;
  } else if (c.n === 1) {
    again = true;
    s += T.again * w.tempo;
  } else if (c.n === 14) {
    // At a bigger table a General Market feeds everybody and the cards pile up for all: it is
    // worth much less than at a 2-seat table (where it is a clean free turn). Keeps games short.
    const feed = seats > 2 ? 0 : (seats - 1) * 0.95;
    s += feed + (v.rules.marketAgain ? (seats > 2 ? 0.8 : 2.2) * w.tempo : 0);
    again = v.rules.marketAgain;
  } else if (c.n === 8) {
    if (seats === 2) again = true;
    s += (seats === 2 ? 2 : 1.1 + (nextSize <= 2 ? 1.2 : 0)) * w.tempo;
  } else if (c.n === 2 || c.n === 5) {
    const kind = c.n === 2 ? 'two' : 'three';
    const add = (v.pending?.count ?? 0) + (c.n === 2 ? 2 : 3);
    const pd = pDefend(v, k, next, kind);
    s += T.att * w.attack * low * (add * (1 - pd) - pd * add * 0.5) * 0.8;
    if (v.pending) s += v.pending.count * 0.6;
  }
  const early = v.hand.length > tr.leadAbove;
  if (
    early &&
    !v.pending &&
    (c.n === 2 || c.n === 5 || c.n === 14 || (c.n === 8 && tr.eight > 1))
  ) {
    s += w.lead;
  }
  if (again) {
    s += fu > 0 ? 0.4 : T.noFu;
  } else {
    const top = a.call ?? c.shape;
    const answer = pCanAnswer(
      v,
      k,
      next,
      c.shape === 'whot' ? (top as ShapeName) : c.shape,
      c.shape === 'whot' ? null : c.n,
    );
    s += (1 - answer) * T.answer * low * (nextSize > 0 ? 1 : 0);
  }
  if (c.shape === 'whot') {
    const mine = rest.filter((x) => cardOf(x).shape === a.call).length;
    const oppHas = pCanAnswer(v, k, next, a.call as ShapeName, null);
    s += mine * T.mine + (1 - oppHas) * w.denyShape * T.deny;
    if (w.callLast && a.call === lastPlayedShape(v)) s += w.callLast;
  } else {
    s += (1 - cover(k, a.card)) * T.risk * w.risk + 0;
    s += c.n * T.hi;
  }
  return s;
}

/**
 * Hard: scores every legal move by card counting (unseen cards from the public pile and my own
 * hand), the chance the next player can answer, hand-size pressure and what stays in my hand,
 * keeps Whot cards for the end, and names the shape it holds most that the next player is least
 * likely to hold. It never sees another hand or the market order.
 */
export const hardBrain = (style: Style = 'balanced'): CpuBrain => ({
  decide(v, rng) {
    const c = catchChoice(v, rng, rate('hard', style, 'catch'));
    if (c) return c;
    const acts = plays(v);
    const k = knowledge(v);
    const w = WEIGHTS[style];
    let best: Action = acts[acts.length - 1] as Action;
    let bs = -Infinity;
    for (const a of acts) {
      const p = asPlay(a);
      const s =
        (p ? scorePlay(v, k, p, w, style) : v.pending ? -(v.pending.count as number) : -1) +
        rng.next() * 0.001;
      if (s > bs) {
        bs = s;
        best = a;
      }
    }
    return withCall(v, best, rng, rate('hard', style, 'announce'));
  },
});

export const brainsFor = (style: Style): Record<Difficulty, CpuBrain> => ({
  easy: easyBrain(style),
  medium: mediumBrain(style),
  hard: hardBrain(style),
});
