import { createRng } from '@naija/core/rng';
import { createShootout, applyKick, type KickRecord } from './shootout';
import { TEAM_IDS, YOU, teamById, type TeamId } from './teams';
import type { Side } from './config';

/** Eight-team knockout: quarter-final (4 matches), semi-final (2), final (1). The player's slot is always 0 of every round. */
export type Stage = 0 | 1 | 2;
export const STAGE_NAMES = ['qf', 'sf', 'final'] as const;

export interface MatchResult {
  winner: TeamId;
  loser: TeamId;
  /** goals (a, b) in the order of the match's two teams */
  score: [number, number];
}

export interface Cup {
  seed: number;
  /** the stage the player plays next (3 when the cup is over) */
  stage: 0 | 1 | 2 | 3;
  /** teams in each round: 8, 4, 2 slots; null until known */
  rounds: [(TeamId | null)[], (TeamId | null)[], (TeamId | null)[]];
  champion: TeamId | null;
  /** the player lost (or won the final) */
  over: boolean;
  /** how many cup matches the player won */
  won: number;
}

export function createCup(seed: number): Cup {
  return {
    seed: seed >>> 0,
    stage: 0,
    rounds: [[...TEAM_IDS], [null, null, null, null], [null, null]],
    champion: null,
    over: false,
    won: 0,
  };
}

/** The two teams of match `m` in round `r`. */
const pair = (cup: Cup, r: Stage, m: number): [TeamId | null, TeamId | null] => [
  cup.rounds[r][m * 2] ?? null,
  cup.rounds[r][m * 2 + 1] ?? null,
];

/** The player's next opponent, or null when the cup is over or the opponent is not known yet. */
export function nextOpponent(cup: Cup): TeamId | null {
  if (cup.over || cup.stage > 2) return null;
  return cup.rounds[cup.stage as Stage][1] ?? null;
}

const SYNTH_OUTCOMES = ['goal', 'saved', 'miss', 'post'] as const;

/**
 * A CPU-versus-CPU shootout, simulated with the same shootout rules as a real one (early end,
 * sudden death) and the seeded RNG. The better team scores more often. No UI.
 */
export function simulateMatch(seed: number, a: TeamId, b: TeamId): MatchResult {
  const rng = createRng(seed);
  let s = createShootout({ seed, teams: [a, b] });
  const skill = [teamById(a).skill, teamById(b).skill];
  for (let i = 0; i < 200 && s.status === 'playing'; i++) {
    const side: Side = s.turn;
    const p = Math.min(
      0.95,
      Math.max(0.2, 0.72 + 0.35 * (skill[side]! - skill[side === 0 ? 1 : 0]!)),
    );
    const goal = rng.chance(p);
    const k: KickRecord = {
      side,
      outcome: goal ? 'goal' : SYNTH_OUTCOMES[rng.int(1, 3)]!,
      impact: goal ? 'in' : 'wide',
      zone: 'u',
      power: 3,
      curve: 0,
      dive: null,
    };
    s = applyKick(s, k);
  }
  // a pathological seed (never seen) must still produce a winner: the first kicker takes it
  const w = s.winner ?? s.first;
  return {
    winner: s.teams[w],
    loser: s.teams[w === 0 ? 1 : 0],
    score: [s.goals[0], s.goals[1]],
  };
}

const matchSeed = (cup: Cup, r: number, m: number): number =>
  (cup.seed ^ Math.imul(r + 1, 0x9e3779b1) ^ Math.imul(m + 7, 0x85ebca6b)) >>> 0;

/** Play the CPU-versus-CPU matches of round `r` (every match but the player's) and fill the next round. */
function playOthers(cup: Cup, r: Stage, playerWinner: TeamId): Cup {
  const next = cup.rounds[r + 1] ? [...(cup.rounds[r + 1] as (TeamId | null)[])] : null;
  const matches = cup.rounds[r].length / 2;
  for (let m = 0; m < matches; m++) {
    let w: TeamId;
    if (m === 0) w = playerWinner;
    else {
      const [a, b] = pair(cup, r, m) as [TeamId, TeamId];
      w = simulateMatch(matchSeed(cup, r, m), a, b).winner;
    }
    if (next) next[m] = w;
  }
  const rounds = [...cup.rounds] as Cup['rounds'];
  if (next) rounds[r + 1] = next;
  return { ...cup, rounds };
}

/**
 * Advance the cup with the result of the player's cup match: the other matches of the round are simulated and the
 * winners move on. A loss ends the cup (the rest of the bracket is still played out, so it is whole).
 */
export function advanceCup(cup: Cup, playerWon: boolean): Cup {
  if (cup.over || cup.stage > 2) return cup;
  const r = cup.stage as Stage;
  const opp = nextOpponent(cup) as TeamId;
  let c = playOthers(cup, r, playerWon ? YOU : opp);
  if (r === 2) {
    return {
      ...c,
      stage: 3,
      over: true,
      champion: playerWon ? YOU : opp,
      won: c.won + (playerWon ? 1 : 0),
    };
  }
  if (playerWon) return { ...c, won: c.won + 1, stage: (r + 1) as Stage };
  // knocked out: play the rest of the bracket so a champion exists
  c = { ...c, over: true, stage: 3 };
  for (let rr = r + 1; rr <= 2; rr++) {
    const rounds = [...c.rounds] as Cup['rounds'];
    const next = rr < 2 ? ([...rounds[rr + 1]] as (TeamId | null)[]) : null;
    for (let m = 0; m < rounds[rr as Stage].length / 2; m++) {
      const [a, b] = pair(c, rr as Stage, m) as [TeamId, TeamId];
      const w = simulateMatch(matchSeed(c, rr, m), a, b).winner;
      if (next) next[m] = w;
      else c = { ...c, champion: w };
    }
    if (next) rounds[rr + 1] = next;
    c = { ...c, rounds };
  }
  return c;
}

export type SlotState = '' | 'you' | 'won' | 'out' | 'next';
export interface BracketSlot {
  round: 0 | 1 | 2 | 3;
  index: number;
  team: TeamId | null;
  state: SlotState;
}

/** The 15 slots of the bracket graphic (8 + 4 + 2 + the winner well) with the badge each one shows. */
export function bracketSlots(cup: Cup): BracketSlot[] {
  const out: BracketSlot[] = [];
  const opp = nextOpponent(cup);
  for (let r = 0; r < 3; r++) {
    cup.rounds[r as Stage].forEach((team, index) => {
      let state: SlotState = '';
      const decided = r < cup.stage || cup.over;
      if (team && decided) {
        const advanced =
          r < 2 ? cup.rounds[(r + 1) as Stage].includes(team) : cup.champion === team;
        state = advanced ? (team === YOU ? 'you' : 'won') : 'out';
      } else if (team && r === cup.stage) {
        state = team === YOU ? 'you' : team === opp ? 'next' : '';
      }
      out.push({ round: r as 0 | 1 | 2, index, team, state });
    });
  }
  out.push({
    round: 3,
    index: 0,
    team: cup.champion,
    state: cup.champion === YOU ? 'you' : cup.champion ? 'won' : '',
  });
  return out;
}
