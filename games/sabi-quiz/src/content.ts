import { validateQuizPack, type QuizPack, type ValidationResult } from '@naija/core/content';

/** Longest question and option the card and plates are designed for (asset brief section 2). */
export const MAX_QUESTION_CHARS = 140;
export const MAX_OPTION_CHARS = 48;

/**
 * The pack validator the game uses: core's schema check plus the text-length caps the layout
 * relies on. One malformed question rejects the whole pack, so a bad update never half-loads;
 * the player gets the friendly retry screen instead of a broken card.
 */
export function validateSabiPack(data: unknown): ValidationResult<QuizPack> {
  const r = validateQuizPack(data);
  if (!r.ok) return r;
  const errors: string[] = [];
  r.value.questions.forEach((q, i) => {
    if (q.q.length > MAX_QUESTION_CHARS)
      errors.push(`questions[${i}].q is over ${MAX_QUESTION_CHARS} characters`);
    q.options.forEach((o, k) => {
      if (o.length > MAX_OPTION_CHARS)
        errors.push(`questions[${i}].options[${k}] is over ${MAX_OPTION_CHARS} characters`);
    });
  });
  return errors.length ? { ok: false, errors: errors.slice(0, 25) } : r;
}
