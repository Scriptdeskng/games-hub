import type { Contestant } from '../ai';
import { answer, answerCpu, current, next, tick, type GameState } from '../rules';

/**
 * Test builds only (reached from `__NAIJA_TEST__` branches): play the rest of a round without
 * timers, the way a bot would. `win` answers every question right; a duel contestant then plays
 * its own plan, or (when losing) always answers right. `onScore` is called after each question.
 */
export function fastForwardRound(
  start: GameState,
  win: boolean,
  cpu: Contestant | null,
  onScore: (s: GameState) => void,
): GameState {
  let s = start;
  while (s.phase !== 'done') {
    const q = current(s);
    const choice = win ? q.answer : (q.answer + 1) % 4;
    let n = answer(tick(s, 800), choice);
    if (cpu && n.mode === 'duel' && n.phase === 'asking') {
      const p = cpu.decide({ q, limitMs: n.limitMs });
      n = tick(n, Math.max(1, p.atMs - (n.limitMs - n.timeLeftMs)));
      n = answerCpu(n, win ? p.choice : q.answer);
    }
    s = n;
    onScore(s);
    s = next(s.phase === 'asking' ? tick(s, s.timeLeftMs) : s);
  }
  return s;
}
