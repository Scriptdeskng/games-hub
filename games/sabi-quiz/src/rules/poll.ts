import type { Rng } from '@naija/core/rng';
import type { QuizQuestion } from './config';

/** Largest-remainder rounding so the four percentages add up to exactly 100. */
export function toPercents(weights: readonly number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (w / total) * 100);
  const out = exact.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  const order = exact
    .map((e, i) => ({ i, r: e - Math.floor(e) }))
    .sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    if (weights[i]! > 0) {
      out[i]!++;
      left--;
    }
  }
  return out;
}

/**
 * The "ask your padi" crowd: a simulated vote for the four options (percent, sums to 100,
 * eliminated options get 0). It leans towards the right answer but is not an oracle: with
 * probability `wrongChance` the crowd's favourite is a wrong option instead (the correct answer
 * is then usually still second). A single padi is not always right.
 */
export function padiPoll(
  q: QuizQuestion,
  eliminated: readonly number[],
  rng: Rng,
  wrongChance: number,
): number[] {
  const open = [0, 1, 2, 3].filter((i) => !eliminated.includes(i));
  const wrongOpen = open.filter((i) => i !== q.answer);
  const leadsWrong = wrongOpen.length > 0 && rng.chance(wrongChance);
  const leader = leadsWrong ? rng.pick(wrongOpen) : q.answer;
  const lead = leadsWrong ? rng.range(0.38, 0.5) : rng.range(0.5, 0.78);
  const weights = [0, 0, 0, 0];
  weights[leader] = lead;
  const rest = open.filter((i) => i !== leader);
  const shares = rest.map((i) => rng.range(0.2, 1) * (leadsWrong && i === q.answer ? 2.5 : 1));
  const sum = shares.reduce((a, b) => a + b, 0) || 1;
  rest.forEach((i, k) => (weights[i] = ((1 - lead) * shares[k]!) / sum));
  return toPercents(weights);
}
