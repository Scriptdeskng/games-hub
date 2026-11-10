import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  advanceCup,
  bracketSlots,
  createCup,
  nextOpponent,
  simulateMatch,
  type Cup,
} from './bracket';
import { TEAMS, TEAM_IDS, YOU, isTeamId, teamById, type TeamId } from './teams';

const geometry = JSON.parse(
  readFileSync(join(__dirname, '../../assets/geometry.json'), 'utf8'),
) as { teams: { id: string; name: string; short: string }[]; bracket: { order: string[] } };

describe('the eight teams', () => {
  it('match the asset geometry: ids, names, short codes and bracket order', () => {
    expect(TEAMS.map((t) => [t.id, t.name, t.short])).toEqual(
      geometry.teams.map((t) => [t.id, t.name, t.short]),
    );
    expect([...TEAM_IDS]).toEqual(geometry.bracket.order);
    expect(YOU).toBe('lanterns');
    expect(TEAMS.filter((t) => t.you)).toHaveLength(1);
  });

  it('look up by id, with a safe fallback', () => {
    expect(teamById('bells').name).toBe('Brass City Bells');
    expect(teamById('nope').id).toBe('lanterns');
    expect(isTeamId('comets')).toBe(true);
    expect(isTeamId('x')).toBe(false);
  });
});

describe('simulated CPU matches', () => {
  it('are deterministic and always produce a winner with a decisive score', () => {
    for (let seed = 1; seed < 200; seed++) {
      const a = simulateMatch(seed, 'comets', 'embers');
      expect(a).toEqual(simulateMatch(seed, 'comets', 'embers'));
      expect(a.winner).not.toBe(a.loser);
      expect([a.winner, a.loser].sort()).toEqual(['comets', 'embers']);
      expect(a.score[0]).not.toBe(a.score[1]);
    }
  });

  it('the stronger team wins more often, but not always', () => {
    let strong = 0;
    for (let seed = 1; seed <= 600; seed++)
      if (simulateMatch(seed, 'bells', 'sparks').winner === 'bells') strong++;
    expect(strong).toBeGreaterThan(330);
    expect(strong).toBeLessThan(600);
  });
});

describe('the cup', () => {
  const win = (c: Cup): Cup => advanceCup(c, true);

  it('starts at the quarter-final with the player in slot 0 against sparks', () => {
    const c = createCup(5);
    expect(c).toMatchObject({ stage: 0, over: false, champion: null, won: 0 });
    expect(c.rounds[0]).toEqual([...TEAM_IDS]);
    expect(nextOpponent(c)).toBe('sparks');
  });

  it('winning three times makes the player champion, with every other match decided', () => {
    let c = createCup(11);
    const opps: (TeamId | null)[] = [];
    for (let i = 0; i < 3; i++) {
      opps.push(nextOpponent(c));
      c = win(c);
    }
    expect(c).toMatchObject({ over: true, champion: YOU, stage: 3, won: 3 });
    expect(opps[0]).toBe('sparks');
    expect(opps[1]).toBe(c.rounds[1][1]);
    expect(opps[2]).toBe(c.rounds[2][1]);
    expect(opps.every((o) => o && o !== YOU)).toBe(true);
    expect(c.rounds[1][0]).toBe(YOU);
    expect(c.rounds[2][0]).toBe(YOU);
    expect(nextOpponent(c)).toBeNull();
    expect(advanceCup(c, false)).toBe(c); // nothing to play
  });

  it('the semi-final opponent is the winner of drifters v comets, the final one of the other half', () => {
    let c = createCup(3);
    c = win(c);
    expect(['drifters', 'comets']).toContain(c.rounds[1][1]);
    expect(['harriers', 'embers']).toContain(c.rounds[1][2]);
    expect(['blazers', 'bells']).toContain(c.rounds[1][3]);
    c = win(c);
    expect(c.rounds[2][1]).toBe(
      c.rounds[1][2] === c.rounds[2][1] ? c.rounds[1][2] : c.rounds[1][3],
    );
  });

  it('losing at each stage ends the cup, keeps the player slot, and plays the rest of the bracket', () => {
    for (let lossAt = 0; lossAt < 3; lossAt++) {
      let c = createCup(40 + lossAt);
      for (let i = 0; i < lossAt; i++) c = win(c);
      const opp = nextOpponent(c);
      c = advanceCup(c, false);
      expect(c.over).toBe(true);
      expect(c.won).toBe(lossAt);
      expect(c.champion).not.toBeNull();
      expect(c.champion).not.toBe(YOU);
      expect(c.rounds[2].every((t) => t !== null)).toBe(true);
      if (lossAt === 2) expect(c.champion).toBe(opp);
    }
  });

  it('is reproducible from its seed and never changes the cup it was given', () => {
    const c = createCup(9);
    const snapshot = JSON.stringify(c);
    const a = win(c);
    expect(JSON.stringify(c)).toBe(snapshot);
    expect(a).toEqual(win(createCup(9)));
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });

  it('different seeds give different brackets', () => {
    const sigs = new Set<string>();
    for (let seed = 1; seed < 30; seed++) sigs.add(JSON.stringify(win(createCup(seed)).rounds[1]));
    expect(sigs.size).toBeGreaterThan(3);
  });
});

describe('bracket slots (the graphic)', () => {
  const count = (slots: ReturnType<typeof bracketSlots>, state: string): number =>
    slots.filter((s) => s.state === state).length;

  it('has 15 slots: 8 + 4 + 2 + the winner well', () => {
    const s = bracketSlots(createCup(1));
    expect(s).toHaveLength(15);
    expect(s.filter((x) => x.round === 0)).toHaveLength(8);
    expect(s.filter((x) => x.round === 1)).toHaveLength(4);
    expect(s.filter((x) => x.round === 2)).toHaveLength(2);
    expect(s.filter((x) => x.round === 3)).toHaveLength(1);
  });

  it('at the start: you in slot 0 and your next opponent marked, nobody out', () => {
    const s = bracketSlots(createCup(1));
    expect(s[0]).toMatchObject({ team: YOU, state: 'you' });
    expect(s[1]).toMatchObject({ team: 'sparks', state: 'next' });
    expect(count(s, 'out')).toBe(0);
    expect(count(s, 'won')).toBe(0);
  });

  it('after a quarter-final win: four winners marked, four out, you and the next opponent in the semi-final', () => {
    const c = advanceCup(createCup(2), true);
    const s = bracketSlots(c);
    const r0 = s.filter((x) => x.round === 0);
    expect(r0.filter((x) => x.state === 'out')).toHaveLength(4);
    expect(r0.filter((x) => x.state === 'won' || x.state === 'you')).toHaveLength(4);
    expect(r0[0]!.state).toBe('you');
    const r1 = s.filter((x) => x.round === 1);
    expect(r1[0]).toMatchObject({ team: YOU, state: 'you' });
    expect(r1[1]!.state).toBe('next');
  });

  it('a knocked-out player shows out in the round they lost, and a champion fills the well', () => {
    const c = advanceCup(createCup(2), false);
    const s = bracketSlots(c);
    expect(s[0]).toMatchObject({ team: YOU, state: 'out' });
    expect(s[14]!.team).toBe(c.champion);
    expect(s[14]!.state).toBe('won');
    const champ = advanceCup(advanceCup(advanceCup(createCup(4), true), true), true);
    const t = bracketSlots(champ);
    expect(t[14]).toMatchObject({ team: YOU, state: 'you' });
    expect(count(t, 'out')).toBe(7);
  });

  it('never marks anything colour-only: every state is one of the five badge names', () => {
    for (let seed = 1; seed < 20; seed++) {
      let c = createCup(seed);
      for (const w of [true, true, false]) {
        c = advanceCup(c, w);
        for (const s of bracketSlots(c))
          expect(['', 'you', 'won', 'out', 'next']).toContain(s.state);
      }
    }
  });
});
