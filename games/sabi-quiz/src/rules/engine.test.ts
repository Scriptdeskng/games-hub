import { describe, expect, it } from 'vitest';
import {
  BASE_POINTS,
  COMBO_BONUS,
  PROFILES,
  accuracy,
  createGame,
  hit,
  missTap,
  oldestTarget,
  recordResult,
  sanitizeProgress,
  emptyProgress,
  stars,
  tick,
  type Difficulty,
  type GameState,
} from './index';

const run = (s: GameState, ms: number, step = 50): GameState => {
  for (let t = 0; t < ms; t += step) s = tick(s, step);
  return s;
};
/** a bot that always hits the oldest bell */
const bot = (d: Difficulty, seed: number, reactionMs = 100): GameState => {
  let s = createGame(d, seed);
  for (let i = 0; i < 2000 && s.status === 'playing'; i++) {
    s = tick(s, reactionMs);
    const id = oldestTarget(s);
    if (id !== null) s = hit(s, id);
  }
  return s;
};

describe('createGame', () => {
  it('starts playing with the profile clock and no bells', () => {
    const s = createGame('medium', 1);
    expect(s.status).toBe('playing');
    expect(s.timeLeftMs).toBe(PROFILES.medium.durationMs);
    expect(s.targets).toEqual([]);
    expect(s.score).toBe(0);
  });
  it('state is JSON-serializable and round-trips', () => {
    const s = run(createGame('hard', 5), 2000);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('tick', () => {
  it('spawns bells and respects maxTargets', () => {
    const s = run(createGame('easy', 3), 5000);
    expect(s.targets.length).toBeGreaterThan(0);
    expect(s.targets.length).toBeLessThanOrEqual(PROFILES.easy.maxTargets);
  });
  it('is deterministic for a seed and differs across seeds', () => {
    const a = run(createGame('medium', 9), 4000);
    const b = run(createGame('medium', 9), 4000);
    const c = run(createGame('medium', 10), 4000);
    expect(a).toEqual(b);
    expect(a.targets.map((t) => t.x)).not.toEqual(c.targets.map((t) => t.x));
  });
  it('keeps bell positions inside 0..1', () => {
    let s = createGame('hard', 2);
    for (let i = 0; i < 400; i++) {
      s = tick(s, 50);
      for (const t of s.targets) {
        expect(t.x).toBeGreaterThanOrEqual(0);
        expect(t.x).toBeLessThan(1);
        expect(t.y).toBeGreaterThanOrEqual(0);
        expect(t.y).toBeLessThan(1);
      }
    }
  });
  it('expired bells count as misses and reset the combo', () => {
    let s = run(createGame('easy', 4), 400);
    expect(s.targets.length).toBeGreaterThan(0);
    s = hit(s, s.targets[0]!.id);
    expect(s.combo).toBe(1);
    s = run(s, PROFILES.easy.lifetimeMs * 2, 100);
    expect(s.misses).toBeGreaterThan(0);
    expect(s.combo).toBe(0);
  });
  it('loses when time runs out below the goal', () => {
    const s = run(createGame('easy', 1), PROFILES.easy.durationMs + 100);
    expect(s.status).toBe('lost');
    expect(s.timeLeftMs).toBe(0);
    expect(s.targets).toEqual([]);
  });
  it('clamps negative or NaN dt: time never runs backwards', () => {
    const s = run(createGame('easy', 4), 1000);
    for (const bad of [-50, -1e9, NaN]) {
      const t = tick(s, bad);
      expect(t.timeLeftMs).toBe(s.timeLeftMs);
      expect(t.targets.map((x) => x.ttlMs)).toEqual(s.targets.map((x) => x.ttlMs));
    }
  });
  it('does nothing once the game is over', () => {
    const over = run(createGame('easy', 1), PROFILES.easy.durationMs + 100);
    expect(tick(over, 50)).toBe(over);
    expect(hit(over, 1)).toBe(over);
    expect(missTap(over)).toBe(over);
  });
  it('never leaves the arena empty for long', () => {
    let s = createGame('easy', 8);
    let emptyMs = 0;
    for (let i = 0; i < 300; i++) {
      s = tick(s, 50);
      emptyMs = s.targets.length ? 0 : emptyMs + 50;
      expect(emptyMs).toBeLessThanOrEqual(300);
    }
  });
});

describe('hit and miss', () => {
  const withBell = (): GameState => run(createGame('medium', 6), 400);
  it('scores base points then adds a combo bonus', () => {
    let s = withBell();
    s = hit(s, oldestTarget(s)!);
    expect(s.score).toBe(BASE_POINTS);
    s = run(s, 1500);
    s = hit(s, oldestTarget(s)!);
    expect(s.score).toBeGreaterThanOrEqual(BASE_POINTS * 2);
    expect(s.hits).toBe(2);
  });
  it('combo bonus is 2 per combo step, capped at 5 steps', () => {
    let s = withBell();
    s = { ...s, combo: 9 };
    const before = s.score;
    s = hit(s, oldestTarget(s)!);
    expect(s.score - before).toBe(BASE_POINTS + 5 * COMBO_BONUS);
    expect(s.bestCombo).toBe(10);
  });
  it('ignores a tap on a bell that already vanished', () => {
    const s = withBell();
    expect(hit(s, 999)).toBe(s);
  });
  it('a tap on empty space is a miss and breaks the combo', () => {
    let s = withBell();
    s = hit(s, oldestTarget(s)!);
    s = missTap(s);
    expect(s.misses).toBe(1);
    expect(s.combo).toBe(0);
    expect(s.bestCombo).toBe(1);
  });
  it('wins as soon as the goal is reached', () => {
    let s = withBell();
    s = { ...s, hits: PROFILES.medium.goal - 1 };
    s = hit(s, oldestTarget(s)!);
    expect(s.status).toBe('won');
  });
});

describe('oldestTarget / accuracy / stars', () => {
  it('oldestTarget picks the bell with the least life left, or null', () => {
    expect(oldestTarget(createGame('easy', 1))).toBeNull();
    const s = {
      ...createGame('easy', 1),
      targets: [
        { id: 1, x: 0, y: 0, ttlMs: 900 },
        { id: 2, x: 0, y: 0, ttlMs: 300 },
      ],
    };
    expect(oldestTarget(s)).toBe(2);
  });
  it('accuracy is 0 with no taps, else hits over taps', () => {
    expect(accuracy(createGame('easy', 1))).toBe(0);
    expect(accuracy({ ...createGame('easy', 1), hits: 3, misses: 1 })).toBe(0.75);
  });
  it('stars: 0 lost, 1 sloppy win, 2 clean slow win, 3 clean fast win', () => {
    const won = (over: Partial<GameState>): GameState => ({
      ...createGame('easy', 1),
      status: 'won',
      hits: 12,
      ...over,
    });
    expect(stars(createGame('easy', 1))).toBe(0);
    expect(stars(won({ hits: 5, misses: 10 }))).toBe(1);
    expect(stars(won({ misses: 0, timeLeftMs: 1000 }))).toBe(2);
    expect(stars(won({ misses: 0, timeLeftMs: 20000 }))).toBe(3);
  });
});

describe('difficulty profiles', () => {
  it('get strictly harder: smaller bells, shorter life, higher goal', () => {
    const { easy, medium, hard } = PROFILES;
    expect(easy.sizePx).toBeGreaterThan(medium.sizePx);
    expect(medium.sizePx).toBeGreaterThan(hard.sizePx);
    expect(easy.lifetimeMs).toBeGreaterThan(medium.lifetimeMs);
    expect(medium.lifetimeMs).toBeGreaterThan(hard.lifetimeMs);
    expect(hard.goal).toBeGreaterThan(medium.goal);
    expect(medium.goal).toBeGreaterThan(easy.goal);
  });
  it('every bell stays at least 44 px (tap target rule)', () => {
    for (const p of Object.values(PROFILES)) expect(p.sizePx).toBeGreaterThanOrEqual(44);
  });
  it('a bot with the same reaction time wins less on harder levels (challenge rises)', () => {
    const rate = (d: Difficulty, reaction: number): number => {
      let wins = 0;
      for (let seed = 1; seed <= 40; seed++) if (bot(d, seed, reaction).status === 'won') wins++;
      return wins / 40;
    };
    expect(rate('easy', 100)).toBeGreaterThanOrEqual(rate('medium', 100));
    // a slow bot beats easy but not hard: bells outlive its reaction on easy only
    expect(rate('easy', 900)).toBeGreaterThan(rate('hard', 900));
  });
  it('the fast bot clears every level (used by the e2e autoplay)', () => {
    for (const d of ['easy', 'medium', 'hard'] as const) expect(bot(d, 1).status).toBe('won');
  });
});

describe('progress', () => {
  it('sanitizeProgress repairs garbage', () => {
    expect(sanitizeProgress(null)).toEqual(emptyProgress());
    expect(sanitizeProgress('x')).toEqual(emptyProgress());
    const p = sanitizeProgress({
      best: { easy: -5, medium: 'a', hard: 40.7 },
      plays: 3,
      streak: 2,
      bestStreak: 1,
      lastDifficulty: 'nope',
    });
    expect(p.best).toEqual({ easy: 0, medium: 0, hard: 40 });
    expect(p.plays).toBe(3);
    expect(p.bestStreak).toBe(2);
    expect(p.lastDifficulty).toBe('medium');
    expect(sanitizeProgress({ lastDifficulty: 'hard' }).lastDifficulty).toBe('hard');
  });
  it('recordResult tracks best, wins and streak', () => {
    const won = { ...createGame('hard', 1), status: 'won' as const, score: 120 };
    const lost = { ...createGame('hard', 1), status: 'lost' as const, score: 50 };
    let r = recordResult(emptyProgress(), won);
    expect(r.newBest).toBe(true);
    expect(r.next).toMatchObject({
      plays: 1,
      wins: 1,
      streak: 1,
      bestStreak: 1,
      lastDifficulty: 'hard',
    });
    expect(r.next.best.hard).toBe(120);
    r = recordResult(r.next, lost);
    expect(r.newBest).toBe(false);
    expect(r.next).toMatchObject({ plays: 2, wins: 1, streak: 0, bestStreak: 1 });
    expect(r.next.best.hard).toBe(120);
  });
});
