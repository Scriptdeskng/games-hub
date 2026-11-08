import { createCpu, type CpuOpponent } from '@naija/core/ai-kit';
import { createRng } from '@naija/core/rng';
import type { Difficulty } from '@naija/core/ui-kit';
import type { Action } from '../rules/legal';
import type { PublicView } from '../rules/view';
import { brainsFor } from './brains';
import { personaById } from './personas';

export * from './brains';
export * from './personas';

export type Cpu = CpuOpponent<PublicView, Action>;

/** Who sits at the table: 1 CPU = Mama Nkechi, 2 = + Tari, 3 = + Aisha (brief section 8). */
export function pickPersonas(count: number): string[] {
  return ['mama-nkechi', 'tari', 'aisha'].slice(0, Math.max(1, Math.min(3, count)));
}

/** Every CPU owns its own seeded rng; its brain is stateless and sees only a PublicView. */
export function createOpponents(o: {
  seed: number;
  difficulty: Difficulty;
  seats: readonly { id: string; persona: string }[];
}): Cpu[] {
  return o.seats.map((seat, i) => {
    const persona = personaById(seat.persona);
    return createCpu<PublicView, Action>({
      id: seat.id,
      persona,
      difficulty: o.difficulty,
      seed: (o.seed + 1 + i * 7919) >>> 0,
      brains: brainsFor(persona.style),
    });
  });
}

export { createRng };
