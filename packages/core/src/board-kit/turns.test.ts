import { describe, expect, it } from 'vitest';
import {
  advanceTurn,
  createTurns,
  currentSeat,
  humanSeat,
  isEveryNth,
  isHumanTurn,
  seatIndex,
  turnsTaken,
  turnsUntilNth,
  type TurnSetup,
} from './turns';

const setup: TurnSetup = {
  human: { id: 'you', name: 'You' },
  cpus: [
    { id: 'c1', name: 'Tari', persona: 'tari' },
    { id: 'c2', name: 'Efe', persona: 'efe' },
  ],
};

describe('turn manager', () => {
  it('seats one human first and CPUs after', () => {
    const t = createTurns(setup);
    expect(t.seats.map((s) => s.kind)).toEqual(['human', 'cpu', 'cpu']);
    expect(humanSeat(t).id).toBe('you');
    expect(isHumanTurn(t)).toBe(true);
    expect(t.seats.filter((s) => s.kind === 'human')).toHaveLength(1);
  });

  it('can start with a CPU', () => {
    const t = createTurns({ ...setup, firstSeat: 'cpu' });
    expect(currentSeat(t).id).toBe('c1');
    expect(isHumanTurn(t)).toBe(false);
  });

  it('rejects duplicate seat ids', () => {
    expect(() =>
      createTurns({ human: { id: 'x', name: 'A' }, cpus: [{ id: 'x', name: 'B' }] }),
    ).toThrow();
  });

  it('cycles in order and counts own turns', () => {
    let t = createTurns(setup);
    const order: string[] = [];
    for (let i = 0; i < 7; i++) {
      order.push(currentSeat(t).id);
      t = advanceTurn(t);
    }
    expect(order).toEqual(['you', 'c1', 'c2', 'you', 'c1', 'c2', 'you']);
    expect(turnsTaken(t, 'you')).toBe(3);
    expect(turnsTaken(t, 'c2')).toBe(2);
    expect(turnsTaken(t, 'nobody')).toBe(0);
    expect(t.turn).toBe(7);
    expect(seatIndex(t, 'c2')).toBe(2);
  });

  it('extra turns and skipped seats', () => {
    let t = createTurns(setup);
    t = advanceTurn(t, { again: true });
    expect(currentSeat(t).id).toBe('you');
    expect(turnsTaken(t, 'you')).toBe(1);
    t = advanceTurn(t, { skip: new Set(['c1']) });
    expect(currentSeat(t).id).toBe('c2');
    // everybody skipped: lands back without looping forever
    t = advanceTurn(t, { skip: new Set(['you', 'c1', 'c2']) });
    expect(t.seats).toHaveLength(3);
  });

  it('does not mutate the previous state and is serializable', () => {
    const a = createTurns(setup);
    const b = advanceTurn(a);
    expect(a.index).toBe(0);
    expect(a.taken).toEqual([0, 0, 0]);
    expect(JSON.parse(JSON.stringify(b))).toEqual(b);
  });

  it('every-nth helpers', () => {
    let t = createTurns({ human: { id: 'h', name: 'H' }, cpus: [{ id: 'c', name: 'C' }] });
    const flags: boolean[] = [];
    const left: number[] = [];
    for (let i = 0; i < 12; i++) {
      if (currentSeat(t).id === 'h') {
        flags.push(isEveryNth(t, 5));
        left.push(turnsUntilNth(t, 5));
      }
      t = advanceTurn(t);
    }
    expect(flags).toEqual([false, false, false, false, true, false]);
    expect(left).toEqual([5, 4, 3, 2, 1, 5]);
    expect(isEveryNth(t, 0)).toBe(false);
    expect(turnsUntilNth(t, 0)).toBe(0);
  });
});
