import type { TFn } from '@naija/core/i18n';
import { createRng } from '@naija/core/rng';
import { CONTESTANT_OF, HOST, personaById } from './ai';
import { accuracy, total, type GameState } from './rules';

/** "Name: line" from the host (Classic, Daily) or the duel contestant, seeded by the round. */
export function resultsBanter(t: TFn, s: GameState, win: boolean): string {
  const rival = s.mode === 'duel' ? personaById(CONTESTANT_OF[s.difficulty]) : HOST;
  const event = s.mode === 'duel' ? (win ? 'lose' : 'win') : win ? 'win' : 'lose';
  const keys = rival.banter[event] ?? [];
  return keys.length ? `${t(rival.nameKey)}: ${t(createRng(s.seed).pick(keys))}` : '';
}

/** The stat tiles under score and best. */
export function resultsRows(t: TFn, s: GameState): { label: string; value: string | number }[] {
  const correct = { label: t('results.correct'), value: `${s.correct}/${total(s)}` };
  if (s.mode === 'duel') {
    const rival = personaById(CONTESTANT_OF[s.difficulty]);
    return [
      {
        label: t('results.duel', { name: t(rival.nameKey) }),
        value: `${s.score} - ${s.cpu?.score ?? 0}`,
      },
      correct,
      { label: t('results.mode'), value: `${t('mode.duel')} / ${t(`difficulty.${s.difficulty}`)}` },
    ];
  }
  const level = s.mode === 'daily' ? '' : ` / ${t(`difficulty.${s.difficulty}`)}`;
  return [
    correct,
    { label: t('results.accuracy'), value: `${Math.round(accuracy(s) * 100)}%` },
    { label: t('results.streak'), value: s.bestStreak },
    { label: t('results.mode'), value: `${t(`mode.${s.mode}`)}${level}` },
  ];
}
